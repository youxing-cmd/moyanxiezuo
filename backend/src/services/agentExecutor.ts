import { db } from '../db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents, aiArtifacts } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { buildWorkContextPrompt } from './contextBuilder.js';
import { callLLM } from './llm.js';
import { TOOL_PROMPTS } from '../routes/ai.js';
import { reflectStep } from './reflector.js';
import { getDefaultPresetModelId, getPresetModelById } from '../config/presetModels.js';

interface LoadedJob {
  id: number;
  userId: number;
  workId: number | null;
  query: string;
  status: string;
}

interface LoadedStep {
  id: number;
  jobId: number;
  idx: number;
  taskType: string;
  title: string;
  description: string;
  status: string;
  dependsOn: string[];
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  artifactId: number | null;
  retryCount: number;
}

async function loadJob(jobId: number): Promise<{ job: LoadedJob; steps: LoadedStep[] }> {
  const [job] = await db.select().from(agentJobs).where(eq(agentJobs.id, jobId)).limit(1);
  if (!job) throw new Error(`Job ${jobId} 不存在`);

  const steps = await db
    .select()
    .from(agentPlanSteps)
    .where(eq(agentPlanSteps.jobId, jobId))
    .orderBy(asc(agentPlanSteps.idx));

  return {
    job: {
      id: job.id,
      userId: job.userId,
      workId: job.workId,
      query: job.query,
      status: job.status,
    },
    steps: steps.map((s) => ({
      id: s.id,
      jobId: s.jobId,
      idx: s.idx,
      taskType: s.taskType,
      title: s.title,
      description: s.description,
      status: s.status,
      dependsOn: (s.dependsOn as string[]) ?? [],
      input: (s.input as Record<string, unknown>) ?? {},
      output: (s.output as Record<string, unknown>) ?? {},
      artifactId: s.artifactId,
      retryCount: s.retryCount,
    })),
  };
}

async function emitEvent(
  jobId: number,
  stepId: number | null,
  type: string,
  payload: Record<string, unknown>,
) {
  try {
    await db.insert(agentStepEvents).values({
      jobId,
      stepId: stepId ?? 0,
      type,
      payload,
    });
  } catch (err) {
    console.error('[agent-executor] emitEvent 失败:', err);
  }
}

async function checkPaused(jobId: number): Promise<boolean> {
  const [job] = await db.select({ status: agentJobs.status }).from(agentJobs).where(eq(agentJobs.id, jobId)).limit(1);
  return job?.status === 'paused';
}

function pickNextStep(steps: LoadedStep[]): LoadedStep | null {
  // done + skipped 都视为依赖已满足
  const doneIds = new Set(
    steps.filter((s) => s.status === 'done' || s.status === 'skipped').map((s) => String(s.id)),
  );

  const candidates = steps
    .filter((s) => s.status === 'pending')
    .filter((s) => {
      for (const dep of s.dependsOn) {
        if (!doneIds.has(dep)) return false;
      }
      return true;
    })
    .sort((a, b) => a.idx - b.idx);

  return candidates[0] ?? null;
}

async function updateStepStatus(
  stepId: number,
  status: string,
  updates?: { output?: Record<string, unknown>; artifactId?: number | null },
) {
  const setData: Record<string, unknown> = { status };
  if (updates?.output !== undefined) setData.output = updates.output;
  if (updates?.artifactId !== undefined) setData.artifactId = updates.artifactId;
  if (status === 'running') setData.startedAt = new Date();
  if (status === 'done' || status === 'failed' || status === 'skipped') {
    setData.finishedAt = new Date();
  }
  await db.update(agentPlanSteps).set(setData).where(eq(agentPlanSteps.id, stepId));
}

async function updateJobProgress(jobId: number, steps: LoadedStep[]) {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  await db.update(agentJobs).set({ progress, updatedAt: new Date() }).where(eq(agentJobs.id, jobId));
}

// ===== 上下文收集 =====

function collectContextFromDeps(step: LoadedStep, allSteps: LoadedStep[]): string {
  let context = '';

  // 注入反思反馈（重试时）
  const feedback = step.input?._reflectionFeedback;
  if (typeof feedback === 'string' && feedback) {
    context += `【修正要求】\n${feedback}\n\n`;
  }

  for (const depId of step.dependsOn) {
    const dep = allSteps.find((s) => String(s.id) === depId);
    if (dep && dep.output) {
      const out = dep.output as Record<string, unknown>;
      if (out.content) {
        context += `【${dep.title}】\n${out.content}\n\n`;
      }
      if (out.ideas && Array.isArray(out.ideas)) {
        context += `【${dep.title}】\n${out.ideas.map((i: unknown, idx: number) => `${idx + 1}. ${i}`).join('\n')}\n\n`;
      }
    }
  }
  return context;
}

async function callAgentLLM(system: string, user: string): Promise<string> {
  const defaultModelId = getDefaultPresetModelId();
  const model = defaultModelId ? getPresetModelById(defaultModelId) : null;
  const modelConfig = model
    ? {
        provider: model.provider,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        modelName: model.modelName,
        contextTokens: model.contextTokens,
      }
    : null;

  const res = await callLLM(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    false,
    modelConfig,
  );
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ===== Step 执行器 =====

async function runReadContext(step: LoadedStep, job: LoadedJob) {
  if (!job.workId) {
    step.output = { content: '', note: '无作品上下文（未绑定 workId）' };
    return;
  }
  const ctx = await buildWorkContextPrompt(job.workId, job.userId);
  step.output = { content: ctx ?? '', note: '已读取作品上下文' };
}

async function runCreateArtifact(step: LoadedStep, job: LoadedJob, allSteps: LoadedStep[]) {
  const input = step.input as { title?: string; content?: string; type?: string };
  const title = input.title ?? step.title ?? '未命名产物';
  const type = input.type ?? 'note';

  // 优先取 step.input.content；若为空，从依赖步骤的 output.content 自动提取
  let content = input.content ?? '';
  if (!content) {
    for (const depId of step.dependsOn) {
      const dep = allSteps.find((s) => String(s.id) === depId);
      if (dep?.output) {
        const out = dep.output as Record<string, unknown>;
        if (typeof out.content === 'string' && out.content) {
          content = out.content;
          break;
        }
      }
    }
  }

  if (!job.workId) {
    throw new Error('create_artifact 需要 workId');
  }

  const [artifact] = await db
    .insert(aiArtifacts)
    .values({
      workId: job.workId,
      userId: job.userId,
      type,
      title,
      content,
      sourceTool: 'agent_create_artifact',
      status: 'pending',
    })
    .returning();

  step.output = { artifactId: artifact.id, title, type };
  step.artifactId = artifact.id;
}

async function runGenerateIdeas(step: LoadedStep, job: LoadedJob, allSteps: LoadedStep[]) {
  const context = collectContextFromDeps(step, allSteps);
  const system = '你是网文创意生成专家。根据用户指令和已有上下文，生成 3 个差异化、有爆款潜质的题材方向。每个方向包含：标题、核心梗、爽点设计、目标读者。用中文输出。';
  const user = `${context ? '【上下文】\n' + context + '\n' : ''}【用户指令】\n${job.query}\n\n请生成 3 个题材方向。`;

  const content = await callAgentLLM(system, user);
  step.output = { content, type: 'ideas' };
}

async function runDraftOutline(step: LoadedStep, job: LoadedJob, allSteps: LoadedStep[]) {
  const context = collectContextFromDeps(step, allSteps);
  const system = TOOL_PROMPTS.outline || '你是专业网文大纲设计师。根据题材和用户需求，设计结构清晰、节奏紧凑的小说总纲。';
  const user = `${context ? '【上下文】\n' + context + '\n' : ''}【用户指令】\n${job.query}\n\n请生成小说总纲。`;

  const content = await callAgentLLM(system, user);
  step.output = { content, type: 'outline' };
}

async function runWriteChunk(step: LoadedStep, job: LoadedJob, allSteps: LoadedStep[]) {
  const context = collectContextFromDeps(step, allSteps);
  const system = TOOL_PROMPTS.continue || '你是专业中文网文作者。根据上下文续写小说正文，保持文风一致，推进冲突，每段留钩子。';
  const user = `${context ? '【上下文】\n' + context + '\n' : ''}【用户指令】\n${job.query}\n\n请续写一段小说正文，约 800-1500 字。`;

  const content = await callAgentLLM(system, user);
  step.output = { content, type: 'chunk' };
}

async function runWebResearch(step: LoadedStep, job: LoadedJob) {
  const { firecrawlSearchAndScrape } = await import('./firecrawl.js');
  const raw = step.description || job.query;

  // 提取搜索关键词：优先取《》内内容，再去掉指令性后缀
  let query = raw;
  const bookMatch = raw.match(/《([^》]+)》/);
  if (bookMatch) {
    query = `《${bookMatch[1]}》 核心爽点 风格分析 爆款元素`;
  } else {
    // 去掉常见指令后缀，保留前 20 字作为关键词
    const cleaned = raw
      .replace(/(给我|帮我|请|需要|想要)[\s\S]*$/g, '')
      .replace(/写[一篇个段章].*$/g, '')
      .trim();
    query = cleaned || raw;
  }

  const content = await firecrawlSearchAndScrape(query, 3);
  step.output = { content, type: 'research' };
}

async function runUserInput(step: LoadedStep, job: LoadedJob) {
  // user_input 不是真正"执行"，而是将 job 设为 waiting 状态等待用户介入
  step.output = {
    note: '等待用户输入',
    hint: step.description || '请提供补充信息或选择',
  };

  // 将 job 整体标记为 waiting
  await db
    .update(agentJobs)
    .set({ status: 'waiting', updatedAt: new Date() })
    .where(eq(agentJobs.id, job.id));

  await emitEvent(job.id, step.id, 'waiting_for_user', {
    title: step.title,
    description: step.description,
  });
}

async function runSelfReview(step: LoadedStep, job: LoadedJob, allSteps: LoadedStep[]) {
  const context = collectContextFromDeps(step, allSteps);
  const system = `你是资深网文编辑。请对当前写作产出进行自检，评估以下维度并给出评分（1-10）和简要建议：
1. 情节连贯性
2. 角色一致性
3. 爽点/钩子密度
4. 文风稳定性
5. 与总纲/设定的契合度

如果总体评分 ≥ 7，输出 "通过"。否则输出 "不通过" 并给出优先修改建议。`;
  const user = `${context ? '【上下文】\n' + context + '\n' : ''}【用户指令】\n${job.query}\n\n请进行自我审查。`;

  const content = await callAgentLLM(system, user);
  const passed = content.includes('通过') && !content.includes('不通过');
  step.output = { content, passed, type: 'review' };
}

async function runPolish(step: LoadedStep, job: LoadedJob, allSteps: LoadedStep[]) {
  const context = collectContextFromDeps(step, allSteps);
  const system = TOOL_PROMPTS.polish || '你是专业网文润色师。对给定文本进行润色优化：提升画面感、强化情绪张力、精简冗余表达、统一句式节奏。保持原意和情节不变。';
  const user = `${context ? '【待润色文本】\n' + context + '\n' : ''}【用户指令】\n${job.query}\n\n请润色上述文本。`;

  const content = await callAgentLLM(system, user);
  step.output = { content, type: 'polished' };
}

// ===== 主执行器 =====

export async function executeJob(jobId: number): Promise<void> {
  const { job, steps } = await loadJob(jobId);

  if (job.status !== 'running') {
    console.log(`[agent-executor] jobId=${jobId} 状态不是 running，跳过执行`);
    return;
  }

  await emitEvent(jobId, null, 'start', { query: job.query });

  while (true) {
    if (await checkPaused(jobId)) {
      console.log(`[agent-executor] jobId=${jobId} 被用户暂停`);
      await emitEvent(jobId, null, 'paused', {});
      break;
    }

    const step = pickNextStep(steps);
    if (!step) {
      // 没有待执行的 step，检查是否全部完成（failed 不算完成）
      const allDone = steps.every((s) => ['done', 'skipped'].includes(s.status));
      if (allDone) {
        await db
          .update(agentJobs)
          .set({ status: 'done', progress: 100, updatedAt: new Date(), finishedAt: new Date() })
          .where(eq(agentJobs.id, jobId));
        await emitEvent(jobId, null, 'done', {});
      } else {
        // 有 pending 步骤但因依赖阻塞（上游有 failed），标记 job 为 user_blocked，等待用户决定
        const hasFailed = steps.some((s) => s.status === 'failed');
        if (hasFailed) {
          await db
            .update(agentJobs)
            .set({ status: 'user_blocked', updatedAt: new Date(), errorMsg: '部分步骤执行失败，需要你决定如何处理' })
            .where(eq(agentJobs.id, jobId));
          await emitEvent(jobId, null, 'user_blocked', { reason: 'upstream step failed' });
        }
      }
      break;
    }

    await executeStep(step, job, steps);
    await updateJobProgress(jobId, steps);
  }
}

async function executeStep(step: LoadedStep, job: LoadedJob, steps: LoadedStep[]) {
  console.log(`[agent-executor] 执行 step ${step.id}: ${step.taskType} — ${step.title}`);

  const needsReflection = ['write_chunk', 'draft_outline', 'generate_ideas', 'create_artifact', 'polish'].includes(step.taskType);
  const maxRetries = 3;

  while (step.retryCount < maxRetries) {
    await updateStepStatus(step.id, 'running');
    step.status = 'running';
    await emitEvent(job.id, step.id, 'step_start', { taskType: step.taskType, title: step.title, attempt: step.retryCount + 1 });

    let executionError: string | null = null;

    try {
      switch (step.taskType) {
        case 'read_context':
          await runReadContext(step, job);
          break;
        case 'create_artifact':
          await runCreateArtifact(step, job, steps);
          break;
        case 'generate_ideas':
          await runGenerateIdeas(step, job, steps);
          break;
        case 'draft_outline':
          await runDraftOutline(step, job, steps);
          break;
        case 'write_chunk':
          await runWriteChunk(step, job, steps);
          break;
        case 'web_research':
          await runWebResearch(step, job);
          break;
        case 'user_input':
          await runUserInput(step, job);
          break;
        case 'self_review':
          await runSelfReview(step, job, steps);
          break;
        case 'polish':
          await runPolish(step, job, steps);
          break;
        default:
          step.output = { note: `task type ${step.taskType} 尚未实现` };
          console.log(`[agent-executor] step ${step.id} ${step.taskType} 尚未实现，跳过`);
      }
    } catch (err) {
      executionError = err instanceof Error ? err.message : String(err);
      console.error(`[agent-executor] step ${step.id} 执行失败:`, err);
    }

    if (executionError) {
      step.retryCount++;
      await db.update(agentPlanSteps).set({ retryCount: step.retryCount }).where(eq(agentPlanSteps.id, step.id));
      if (step.retryCount >= maxRetries) {
        step.output = { error: executionError };
        await updateStepStatus(step.id, 'failed', { output: step.output });
        step.status = 'failed';
        await emitEvent(job.id, step.id, 'error', { error: executionError });
        return;
      }
      continue;
    }

    // user_input 特殊处理：标记为 waiting 并提前返回，不进入反射逻辑
    if (step.taskType === 'user_input') {
      await updateStepStatus(step.id, 'waiting', { output: step.output });
      step.status = 'waiting';
      await emitEvent(job.id, step.id, 'waiting', { taskType: step.taskType, output: step.output });
      return;
    }

    // 非产出型步骤直接通过
    if (!needsReflection) {
      await updateStepStatus(step.id, 'done', { output: step.output, artifactId: step.artifactId });
      step.status = 'done';
      await emitEvent(job.id, step.id, 'step_done', { taskType: step.taskType, output: step.output });
      return;
    }

    // 产出型步骤：调用 Reflector
    const reflection = await reflectStep(step);

    if (reflection.passed) {
      await updateStepStatus(step.id, 'done', { output: step.output, artifactId: step.artifactId });
      step.status = 'done';
      await emitEvent(job.id, step.id, 'step_done', { taskType: step.taskType, output: step.output });
      return;
    }

    // 反思未通过，准备重试
    step.retryCount++;
    step.input = {
      ...step.input,
      _reflectionFeedback: `上次产出未通过反思：${reflection.reason}。建议：${reflection.suggestion}。请修正后重新生成。`,
    };
    await db.update(agentPlanSteps).set({ retryCount: step.retryCount, input: step.input }).where(eq(agentPlanSteps.id, step.id));

    console.log(`[agent-executor] step ${step.id} 反思未通过，第 ${step.retryCount} 次重试`);
    await emitEvent(job.id, step.id, 'reflection', { passed: false, reason: reflection.reason, attempt: step.retryCount });
  }

  // 超过最大重试次数
  step.status = 'failed';
  step.output = { ...step.output, error: '已达最大重试次数（3次），仍无法通过反思或执行' };
  await updateStepStatus(step.id, 'failed', { output: step.output });
  await emitEvent(job.id, step.id, 'error', { error: '已达最大重试次数' });
}
