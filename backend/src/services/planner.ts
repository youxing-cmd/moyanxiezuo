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
});

const planSchema = z.object({
  title: z.string().min(1),
  estimatedDuration: z.string().optional().default(''),
  estimatedCost: z.string().optional().default(''),
  steps: z.array(stepSchema).min(1),
});

function buildPlannerPrompt(query: string, workContext?: string | null): string {
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
- create_artifact: 落到工作树

【输出 JSON】
{
  "title": "本次任务概述",
  "estimatedDuration": "5 分钟",
  "estimatedCost": "约 8 次 LLM 调用 + 3 次 firecrawl",
  "steps": [
    {"id": "1", "type": "read_context", "title": "读取作品上下文", "dependsOn": []},
    {"id": "2", "type": "web_research", "title": "研究参考作品", "dependsOn": []},
    {"id": "3", "type": "generate_ideas", "title": "生成题材方向", "dependsOn": ["1", "2"]},
    ...
  ]
}`;

  if (workContext) {
    prompt += `\n\n【作品上下文】\n${workContext}\n`;
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

export function validatePlan(plan: unknown): PlanResult {
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

  return {
    title: data.title,
    estimatedDuration: data.estimatedDuration,
    estimatedCost: data.estimatedCost,
    steps: data.steps,
  };
}

async function callPlannerOnce(query: string, workContext: string | null): Promise<PlanResult> {
  const prompt = buildPlannerPrompt(query, workContext);

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

  return validatePlan(parsed);
}

export async function planJob(query: string, ctx: PlanContext): Promise<PlanResult> {
  const workContext = ctx.workId ? await buildWorkContextPrompt(ctx.workId, ctx.userId) : null;

  try {
    return await callPlannerOnce(query, workContext);
  } catch (err) {
    console.warn('[planner] 第一次规划失败，自动重试一次:', err);
    return await callPlannerOnce(query, workContext);
  }
}

export async function savePlanToSteps(jobId: number, plan: PlanResult): Promise<void> {
  // 1. 先插入所有步骤（dependsOn 暂时为空，避免引用尚未分配的数据库 id）
  const values = plan.steps.map((step, idx) => ({
    jobId,
    idx,
    taskType: step.type,
    title: step.title,
    description: step.description ?? '',
    dependsOn: [] as string[],
    status: 'pending' as const,
  }));

  const inserted = await db.insert(agentPlanSteps).values(values).returning();

  // 2. 建立 Planner id → 数据库 id 映射
  const idMap = new Map<string, number>();
  plan.steps.forEach((step, idx) => {
    idMap.set(step.id, inserted[idx].id);
  });

  // 3. 更新 dependsOn 为实际数据库 id
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const dbId = inserted[i].id;
    const realDependsOn = (step.dependsOn ?? [])
      .map((depId) => idMap.get(depId))
      .filter((id): id is number => id !== undefined)
      .map(String);

    if (realDependsOn.length > 0) {
      await db
        .update(agentPlanSteps)
        .set({ dependsOn: realDependsOn })
        .where(eq(agentPlanSteps.id, dbId));
    }
  }
}
