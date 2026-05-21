import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents } from '../db/schema.js';
import { sendAgentJob } from '../jobs/agentWorker.js';
import { planJob, savePlanToSteps } from '../services/planner.js';

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

  if (job.status !== 'planning' && job.status !== 'paused') {
    return c.json({ error: `当前状态为 ${job.status}，无法开始` }, 400);
  }

  await db
    .update(agentJobs)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(agentJobs.id, jobId));

  await sendAgentJob(jobId);

  return c.json({ id: jobId, status: 'running' });
});

export default agentJobsRouter;
