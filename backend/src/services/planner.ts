import { z } from 'zod';
import { callLLM, type ChatMessage } from './llm.js';
import { getPresetModelById } from '../config/presetModels.js';
import { db } from '../db/index.js';
import { agentPlanSteps } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { buildWorkContextPrompt } from './contextBuilder.js';

export interface PlanContext {
  userId: number;
  workId?: number | null;
}

export interface PlanStep {
  id: string;
  type: string;
  title: string;
  description?: string;
  dependsOn?: string[];
}

export interface PlanResult {
  title: string;
  estimatedDuration: string;
  estimatedCost: string;
  steps: PlanStep[];
}

const PLANNER_MODEL_ID = 'gemini-2.5-pro';

const VALID_TASK_TYPES = new Set([
  'read_context',
  'web_research',
  'generate_ideas',
  'user_input',
  'draft_outline',
  'write_chunk',
  'self_review',
  'polish',
  'create_artifact',
]);

const stepSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dependsOn: z.array(z.string()).optional().default([]),
  input: z.record(z.any()).optional().default({}),
});

const planSchema = z.object({
  title: z.string().min(1),
  estimatedDuration: z.string().optional().default(''),
  estimatedCost: z.string().optional().default(''),
  steps: z.array(stepSchema).min(1),
});

function buildPlannerPrompt(query: string, workContext?: string | null, preferences?: string): string {
  let prompt = `你是九章写作 Agent 的任务规划器。把用户的模糊指令拆成可执行的 task DAG。

【规则】
1. 每个 task 必须能映射到一个或多个工具/LLM call
2. 必须包含至少 1 个反思步骤（self_review）
3. 涉及"参考 xx"必须包含 web_research 步骤
4. 必须明确依赖（什么先什么后）
5. 估算总 token / 时间 / 调用次数预算

【可用 task 类型】
- read_context: 取作品已有数据
- web_research: 网络搜索/scrape（参考作品）
- generate_ideas: LLM 头脑风暴
- user_input: 等待用户选择
- draft_outline: 生成大纲
- write_chunk: 生成正文段
- self_review: 反思自检
- polish: 优化
- create_artifact: 落到工作树（必须指定 input.type）

【create_artifact 的 type 规范】
- 如果产物是小说正文/章节内容 → input.type = "chapter_draft"
- 如果产物是大纲/总纲/章纲 → input.type = "outline"
- 如果产物是审稿报告/分析报告 → input.type = "review_report"
- 如果产物是角色设定/世界观设定 → input.type = "setting"
- 如果产物是灵感/选题/素材 → input.type = "inspiration"

【输出 JSON】
{
  "title": "本次任务概述",
  "estimatedDuration": "5 分钟",
  "estimatedCost": "约 8 次 LLM 调用 + 3 次 firecrawl",
  "steps": [
    {"id": "1", "type": "read_context", "title": "读取作品上下文", "dependsOn": []},
    {"id": "2", "type": "web_research", "title": "研究参考作品", "dependsOn": []},
    {"id": "3", "type": "generate_ideas", "title": "生成题材方向", "dependsOn": ["1", "2"]},
    ...,
    {"id": "10", "type": "create_artifact", "title": "保存正文草稿", "dependsOn": ["9"], "input": {"type": "chapter_draft"}}
  ]
}`;

  if (workContext) {
    prompt += `\n\n【作品上下文】\n${workContext}\n`;
  }

  if (preferences) {
    prompt += `\n【用户偏好与习惯】\n${preferences}\n`;
  }

  prompt += `\n【用户指令】\n${query}\n\n请直接输出 JSON，不要有任何解释或 markdown 代码块。`;
  return prompt;
}

function checkDAGNoCycle(steps: PlanStep[]): boolean {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const s of steps) {
    adj.set(s.id, []);
    inDegree.set(s.id, 0);
  }

  for (const s of steps) {
    for (const dep of s.dependsOn ?? []) {
      if (!adj.has(dep)) return false; // 依赖不存在
      adj.get(dep)!.push(s.id);
      inDegree.set(s.id, (inDegree.get(s.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const u = queue.shift()!;
    visited++;
    for (const v of adj.get(u) ?? []) {
      const newDeg = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) queue.push(v);
    }
  }

  return visited === steps.length;
}

export function validatePlan(plan: unknown, query?: string): PlanResult {
  const validation = planSchema.safeParse(plan);
  if (!validation.success) {
    throw new Error(`Plan schema 校验失败: ${validation.error.message}`);
  }

  const data = validation.data;

  for (const step of data.steps) {
    if (!VALID_TASK_TYPES.has(step.type)) {
      throw new Error(`未知 task type: ${step.type}`);
    }
  }

  const stepIds = new Set(data.steps.map((s) => s.id));
  for (const step of data.steps) {
    for (const dep of step.dependsOn ?? []) {
      if (!stepIds.has(dep)) {
        throw new Error(`Step ${step.id} 的依赖 ${dep} 不存在`);
      }
    }
  }

  if (!checkDAGNoCycle(data.steps)) {
    throw new Error('Plan 中存在循环依赖');
  }

  // 业务规则约束
  const hasSelfReview = data.steps.some((s) => s.type === 'self_review');
  if (!hasSelfReview) {
    throw new Error('Plan 必须包含至少 1 个 self_review 步骤');
  }

  if (query && (/参考/.test(query) || /《[^》]+》/.test(query))) {
    const hasWebResearch = data.steps.some((s) => s.type === 'web_research');
    if (!hasWebResearch) {
      throw new Error('用户指令涉及"参考 xx"，Plan 必须包含 web_research 步骤');
    }
  }

  return {
    title: data.title,
    estimatedDuration: data.estimatedDuration,
    estimatedCost: data.estimatedCost,
    steps: data.steps,
  };
}

async function callPlannerOnce(query: string, workContext: string | null, preferences?: string): Promise<PlanResult> {
  const prompt = buildPlannerPrompt(query, workContext, preferences);

  const model = getPresetModelById(PLANNER_MODEL_ID);
  const modelConfig = model
    ? {
        provider: model.provider,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        modelName: model.modelName,
        contextTokens: model.contextTokens,
      }
    : null;

  const messages: ChatMessage[] = [
    { role: 'system', content: '你是一个专业的写作任务规划器，只输出 JSON。' },
    { role: 'user', content: prompt },
  ];

  const res = await callLLM(messages, false, modelConfig);
  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content || '';

  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/```\s*([\s\S]*?)```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Planner 输出不是合法 JSON');
  }

  return validatePlan(parsed, query);
}

export async function planJob(query: string, ctx: PlanContext): Promise<PlanResult> {
  // 1. 先尝试匹配模板
  const { matchTemplate, incrementTemplateUse } = await import('./agentTemplates.js');
  const tmpl = await matchTemplate(ctx.userId, query);
  if (tmpl?.plan) {
    console.log(`[planner] 命中模板: ${tmpl.name}`);
    await incrementTemplateUse(tmpl.id);
    const plan = tmpl.plan as Record<string, unknown>;
    return validatePlan(plan, query);
  }

  // 2. 无模板匹配，调用 LLM 生成（注入用户偏好）
  const workContext = ctx.workId ? await buildWorkContextPrompt(ctx.workId, ctx.userId) : null;
  let preferences = '';
  try {
    const { extractUserPreferences, formatPreferencesForPlanner } = await import('./preferenceExtractor.js');
    const prefs = await extractUserPreferences(ctx.userId);
    preferences = formatPreferencesForPlanner(prefs);
  } catch {
    // 偏好提取失败不阻塞主流程
  }

  try {
    return await callPlannerOnce(query, workContext, preferences || undefined);
  } catch (err) {
    console.warn('[planner] 第一次规划失败，自动重试一次:', err);
    return await callPlannerOnce(query, workContext, preferences || undefined);
  }
}

export async function savePlanToSteps(jobId: number, plan: PlanResult): Promise<void> {
  // dependsOn 统一为 planner step id（即 idx 字符串，如 "1", "2"），
  // 不映射为数据库自增 id，确保 savePlanToSteps / pickNextStep / collectContextFromDeps 口径一致
  // idx 从 1 开始，与 planner step id 保持一致（"1", "2", "3"）
  const values = plan.steps.map((step, idx) => ({
    jobId,
    idx: idx + 1,
    taskType: step.type,
    title: step.title,
    description: step.description ?? '',
    dependsOn: step.dependsOn ?? ([] as string[]),
    status: 'pending' as const,
  }));

  await db.insert(agentPlanSteps).values(values);
}
