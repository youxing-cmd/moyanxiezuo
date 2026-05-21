import { db } from '../db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents, aiArtifacts } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { buildWorkContextPrompt } from './contextBuilder.js';
import { callLLM } from './llm.js';
import { TOOL_PROMPTS } from '../routes/ai.js';

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
  const doneIds = new Set(steps.filter((s) => s.status === 'done').map((s) => String(s.id)));

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
  const res = await callLLM([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], false);
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

async function runCreateArtifact(step: LoadedStep, job: LoadedJob) {
  const input = step.input as { title?: string; content?: string; type?: string };
  const title = input.title ?? step.title ?? '未命名产物';
  const content = input.content ?? '';
  const type = input.type ?? 'note';

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
      // 没有待执行的 step，检查是否全部完成
      const allDone = steps.every((s) => ['done', 'skipped', 'failed'].includes(s.status));
      if (allDone) {
        await db
          .update(agentJobs)
          .set({ status: 'done', progress: 100, updatedAt: new Date(), finishedAt: new Date() })
          .where(eq(agentJobs.id, jobId));
        await emitEvent(jobId, null, 'done', {});
      }
      break;
    }

    await executeStep(step, job, steps);
    await updateJobProgress(jobId, steps);
  }
}

async function executeStep(step: LoadedStep, job: LoadedJob, steps: LoadedStep[]) {
  console.log(`[agent-executor] 执行 step ${step.id}: ${step.taskType} — ${step.title}`);

  await updateStepStatus(step.id, 'running');
  step.status = 'running';
  await emitEvent(job.id, step.id, 'step_start', { taskType: step.taskType, title: step.title });

  try {
    switch (step.taskType) {
      case 'read_context':
        await runReadContext(step, job);
        break;
      case 'create_artifact':
        await runCreateArtifact(step, job);
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
      default:
        // 其他类型暂不支持，标记为 skipped
        step.output = { note: `task type ${step.taskType} 尚未实现` };
        console.log(`[agent-executor] step ${step.id} ${step.taskType} 尚未实现，跳过`);
    }

    await updateStepStatus(step.id, 'done', { output: step.output, artifactId: step.artifactId });
    step.status = 'done';
    await emitEvent(job.id, step.id, 'step_done', { taskType: step.taskType, output: step.output });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[agent-executor] step ${step.id} 执行失败:`, err);

    step.output = { error: errorMsg };
    await updateStepStatus(step.id, 'failed', { output: step.output });
    step.status = 'failed';
    await emitEvent(job.id, step.id, 'error', { error: errorMsg });
  }
}
