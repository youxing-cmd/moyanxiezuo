import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, gt } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents } from '../db/schema.js';
import { sendAgentJob } from '../jobs/agentWorker.js';
import { planJob, savePlanToSteps, validatePlan } from '../services/planner.js';

const agentJobsRouter = new Hono();

agentJobsRouter.use('*', authMiddleware);

// POST /api/ai/agent-jobs — 创建 job（仅 planning，不立即执行）
const createJobSchema = z.object({
  query: z.string().min(1),
  workId: z.number().nullable().optional(),
});

agentJobsRouter.post('/agent-jobs', async (c) => {
  const body = await c.req.json();
  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', details: parsed.error.flatten() }, 400);
  }

  const userId = c.get('userId');
  const { query, workId } = parsed.data;

  const [job] = await db
    .insert(agentJobs)
    .values({
      userId,
      workId: workId ?? null,
      query,
      status: 'planning',
    })
    .returning();

  // 立即调用 Planner 生成 task DAG
  try {
    const plan = await planJob(query, { userId, workId: workId ?? null });
    await savePlanToSteps(job.id, plan);

    // 规划成功，更新 job 状态为 planning（已有 plan）
    await db
      .update(agentJobs)
      .set({
        status: 'planning',
        updatedAt: new Date(),
        errorMsg: '',
      })
      .where(eq(agentJobs.id, job.id));

    return c.json({ id: job.id, status: job.status, query: job.query, planTitle: plan.title }, 201);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[agent-jobs] Planner 失败 jobId=${job.id}:`, err);

    await db
      .update(agentJobs)
      .set({
        status: 'failed',
        errorMsg,
        updatedAt: new Date(),
        finishedAt: new Date(),
      })
      .where(eq(agentJobs.id, job.id));

    return c.json({ id: job.id, status: 'failed', query: job.query, error: errorMsg }, 201);
  }
});

// GET /api/ai/agent-jobs/:id — 获取整体状态（含 steps + events）
agentJobsRouter.get('/agent-jobs/:id', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  const steps = await db
    .select()
    .from(agentPlanSteps)
    .where(eq(agentPlanSteps.jobId, jobId))
    .orderBy(agentPlanSteps.idx);

  const events = await db
    .select()
    .from(agentStepEvents)
    .where(eq(agentStepEvents.jobId, jobId))
    .orderBy(desc(agentStepEvents.createdAt))
    .limit(100);

  return c.json({ job, steps, events });
});

// GET /api/ai/agent-jobs — 列出当前用户的 active jobs
agentJobsRouter.get('/agent-jobs', async (c) => {
  const userId = c.get('userId');

  const jobs = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.userId, userId))
    .orderBy(desc(agentJobs.createdAt));

  return c.json({ jobs });
});

// PUT /api/ai/agent-jobs/:id/plan — 用户编辑 plan（删除旧 steps，重建新 steps）
agentJobsRouter.put('/agent-jobs/:id/plan', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  if (job.status === 'running') {
    return c.json({ error: '任务执行中，请先暂停再编辑 plan' }, 400);
  }

  const body = await c.req.json();

  try {
    const plan = validatePlan(body);

    // 删除旧 steps
    await db.delete(agentPlanSteps).where(eq(agentPlanSteps.jobId, jobId));

    // 插入新 steps
    await savePlanToSteps(jobId, plan);

    await db
      .update(agentJobs)
      .set({ status: 'planning', errorMsg: '', updatedAt: new Date(), finishedAt: null })
      .where(eq(agentJobs.id, jobId));

    return c.json({ id: jobId, status: 'planning', planTitle: plan.title });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return c.json({ error: 'Plan 校验失败', details: errorMsg }, 400);
  }
});

// POST /api/ai/agent-jobs/:id/start — 开始执行（提前放到 1.2，worker 需要被触发）
agentJobsRouter.post('/agent-jobs/:id/start', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  if (['done', 'failed', 'aborted'].includes(job.status)) {
    return c.json({ error: `当前状态为 ${job.status}，无法开始` }, 400);
  }

  await db
    .update(agentJobs)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  await sendAgentJob(jobId);

  return c.json({ id: jobId, status: 'running' });
});

// POST /api/ai/agent-jobs/:id/pause — 暂停
agentJobsRouter.post('/agent-jobs/:id/pause', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  if (job.status !== 'running') {
    return c.json({ error: `当前状态为 ${job.status}，无法暂停` }, 400);
  }

  await db
    .update(agentJobs)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  await db.insert(agentStepEvents).values({
    jobId,
    stepId: 0,
    type: 'control',
    payload: { action: 'pause' },
  });

  return c.json({ id: jobId, status: 'paused' });
});

// POST /api/ai/agent-jobs/:id/abort — 中止
agentJobsRouter.post('/agent-jobs/:id/abort', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  if (['done', 'failed', 'aborted'].includes(job.status)) {
    return c.json({ error: `当前状态为 ${job.status}，无法中止` }, 400);
  }

  await db
    .update(agentJobs)
    .set({ status: 'aborted', updatedAt: new Date(), finishedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  // 将 pending / running 的 step 标记为 skipped
  await db
    .update(agentPlanSteps)
    .set({ status: 'skipped', finishedAt: new Date() })
    .where(and(eq(agentPlanSteps.jobId, jobId), eq(agentPlanSteps.status, 'pending')));

  await db
    .update(agentPlanSteps)
    .set({ status: 'failed', finishedAt: new Date() })
    .where(and(eq(agentPlanSteps.jobId, jobId), eq(agentPlanSteps.status, 'running')));

  await db.insert(agentStepEvents).values({
    jobId,
    stepId: 0,
    type: 'control',
    payload: { action: 'abort' },
  });

  return c.json({ id: jobId, status: 'aborted' });
});

// POST /api/ai/agent-jobs/:id/inject — 用户插话（注入补充信息）
const injectSchema = z.object({
  message: z.string().min(1),
  stepId: z.number().optional(),
});

agentJobsRouter.post('/agent-jobs/:id/inject', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = injectSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', details: parsed.error.flatten() }, 400);
  }

  const { message, stepId } = parsed.data;

  // 记录注入事件
  await db.insert(agentStepEvents).values({
    jobId,
    stepId: stepId ?? 0,
    type: 'inject',
    payload: { message },
  });

  // 如果 job 处于 waiting 状态（等待 user_input），把 waiting 的 step 标记为 done，然后恢复运行
  if (job.status === 'waiting') {
    // 找到当前 waiting 的 user_input step，标记为 done 并保存用户输入
    const waitingSteps = await db
      .select()
      .from(agentPlanSteps)
      .where(and(eq(agentPlanSteps.jobId, jobId), eq(agentPlanSteps.status, 'waiting')))
      .limit(1);

    if (waitingSteps.length > 0) {
      const ws = waitingSteps[0];
      await db
        .update(agentPlanSteps)
        .set({
          status: 'done',
          output: { ...ws.output, userMessage: message },
          finishedAt: new Date(),
        })
        .where(eq(agentPlanSteps.id, ws.id));
    }

    await db
      .update(agentJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(agentJobs.id, jobId));

    await sendAgentJob(jobId);
  }

  return c.json({ id: jobId, injected: true });
});

// POST /api/ai/agent-jobs/:id/steps/:stepId/skip — 跳过某步
agentJobsRouter.post('/agent-jobs/:id/steps/:stepId/skip', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  const stepId = parseInt(c.req.param('stepId'), 10);
  if (Number.isNaN(jobId) || Number.isNaN(stepId)) {
    return c.json({ error: '无效的 ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  const [step] = await db
    .select()
    .from(agentPlanSteps)
    .where(and(eq(agentPlanSteps.id, stepId), eq(agentPlanSteps.jobId, jobId)))
    .limit(1);

  if (!step) {
    return c.json({ error: '步骤不存在' }, 404);
  }

  if (!['pending', 'failed'].includes(step.status)) {
    return c.json({ error: `当前步骤状态为 ${step.status}，无法跳过` }, 400);
  }

  await db
    .update(agentPlanSteps)
    .set({ status: 'skipped', finishedAt: new Date() })
    .where(eq(agentPlanSteps.id, stepId));

  await db.insert(agentStepEvents).values({
    jobId,
    stepId,
    type: 'control',
    payload: { action: 'skip' },
  });

  // 重新触发 worker 推进后续步骤（即使 job 是 running，worker 可能已结束当前轮询）
  if (!['done', 'failed', 'aborted'].includes(job.status)) {
    await db
      .update(agentJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(agentJobs.id, jobId));
    await sendAgentJob(jobId);
  }

  return c.json({ id: jobId, stepId, status: 'skipped' });
});

// POST /api/ai/agent-jobs/:id/steps/:stepId/redo — 重做某步
agentJobsRouter.post('/agent-jobs/:id/steps/:stepId/redo', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  const stepId = parseInt(c.req.param('stepId'), 10);
  if (Number.isNaN(jobId) || Number.isNaN(stepId)) {
    return c.json({ error: '无效的 ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  const [step] = await db
    .select()
    .from(agentPlanSteps)
    .where(and(eq(agentPlanSteps.id, stepId), eq(agentPlanSteps.jobId, jobId)))
    .limit(1);

  if (!step) {
    return c.json({ error: '步骤不存在' }, 404);
  }

  if (!['done', 'failed', 'skipped'].includes(step.status)) {
    return c.json({ error: `当前步骤状态为 ${step.status}，无法重做` }, 400);
  }

  await db
    .update(agentPlanSteps)
    .set({
      status: 'pending',
      output: {},
      artifactId: null,
      retryCount: 0,
      startedAt: null,
      finishedAt: null,
    })
    .where(eq(agentPlanSteps.id, stepId));

  await db.insert(agentStepEvents).values({
    jobId,
    stepId,
    type: 'control',
    payload: { action: 'redo' },
  });

  // 重新触发 worker
  if (!['done', 'failed', 'aborted'].includes(job.status)) {
    await db
      .update(agentJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(agentJobs.id, jobId));
    await sendAgentJob(jobId);
  }

  return c.json({ id: jobId, stepId, status: 'pending' });
});

// GET /api/ai/agent-jobs/:id/stream — SSE 实时进度推送
agentJobsRouter.get('/agent-jobs/:id/stream', async (c) => {
  const userId = c.get('userId');
  const jobId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(jobId)) {
    return c.json({ error: '无效的 job ID' }, 400);
  }

  const [job] = await db
    .select()
    .from(agentJobs)
    .where(and(eq(agentJobs.id, jobId), eq(agentJobs.userId, userId)))
    .limit(1);

  if (!job) {
    return c.json({ error: '任务不存在' }, 404);
  }

  const encoder = new TextEncoder();
  let lastEventId = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      send('connected', { jobId, status: job.status });

      // 轮询循环（每 2 秒）
      const interval = setInterval(async () => {
        try {
          const [currentJob] = await db
            .select()
            .from(agentJobs)
            .where(eq(agentJobs.id, jobId))
            .limit(1);

          // 增量事件：只推送 id > lastEventId 的新事件
          const newEvents = await db
            .select()
            .from(agentStepEvents)
            .where(and(eq(agentStepEvents.jobId, jobId), gt(agentStepEvents.id, lastEventId)))
            .orderBy(agentStepEvents.id)
            .limit(50);

          if (newEvents.length > 0) {
            lastEventId = newEvents[newEvents.length - 1].id;
          }

          const steps = await db
            .select()
            .from(agentPlanSteps)
            .where(eq(agentPlanSteps.jobId, jobId))
            .orderBy(agentPlanSteps.idx);

          send('job_update', {
            status: currentJob.status,
            progress: currentJob.progress,
            errorMsg: currentJob.errorMsg,
            steps: steps.map((s) => ({
              id: s.id,
              idx: s.idx,
              taskType: s.taskType,
              title: s.title,
              status: s.status,
              retryCount: s.retryCount,
            })),
            events: newEvents.map((e) => ({
              id: e.id,
              type: e.type,
              stepId: e.stepId,
              payload: e.payload,
              createdAt: e.createdAt,
            })),
          });

          if (['done', 'failed', 'aborted'].includes(currentJob.status)) {
            send('done', {});
            clearInterval(interval);
            controller.close();
          }
        } catch (err) {
          console.error('[agent-jobs stream] 轮询错误:', err);
        }
      }, 2000);

      // 客户端断开时清理
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

export default agentJobsRouter;
