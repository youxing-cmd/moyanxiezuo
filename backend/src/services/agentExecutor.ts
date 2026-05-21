import { db } from '../db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents, aiArtifacts } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { buildWorkContextPrompt } from './contextBuilder.js';

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

    await executeStep(step, job);
    await updateJobProgress(jobId, steps);
  }
}

async function executeStep(step: LoadedStep, job: LoadedJob) {
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
