import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';
import { db } from '../db/index.js';
import { agentJobs } from '../db/schema.js';
import { eq } from 'drizzle-orm';

let boss: PgBoss | null = null;

export async function initAgentWorker() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('[agent-worker] DATABASE_URL 未设置，跳过初始化');
    return;
  }

  boss = new PgBoss({
    connectionString,
    max: 2,
    application_name: 'jiuzhang-agent-worker',
  });

  boss.on('error', (err: Error) => {
    console.error('[agent-worker] pg-boss 错误:', err);
  });

  await boss.start();

  await boss.work('agent-job', { batchSize: 1 }, async (jobs: Job<{ jobId: number }>[]) => {
    const job = jobs[0];
    if (!job) return;
    const { jobId } = job.data;
    console.log(`[agent-worker] 收到任务 jobId=${jobId}`);

    try {
      // 更新任务状态为 running
      await db
        .update(agentJobs)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(agentJobs.id, jobId));

      // TODO(P3): 接入 Executor 主循环，按 DAG 推进
      console.log(`[agent-worker] jobId=${jobId} 状态已更新为 running，Executor 待接入`);

      // 模拟完成（P3 前占位）
      await db
        .update(agentJobs)
        .set({ status: 'done', progress: 100, updatedAt: new Date(), finishedAt: new Date() })
        .where(eq(agentJobs.id, jobId));

      console.log(`[agent-worker] jobId=${jobId} 执行完成`);
    } catch (err) {
      console.error(`[agent-worker] jobId=${jobId} 执行失败:`, err);

      const errorMsg = err instanceof Error ? err.message : String(err);
      await db
        .update(agentJobs)
        .set({ status: 'failed', errorMsg, updatedAt: new Date(), finishedAt: new Date() })
        .where(eq(agentJobs.id, jobId));

      // pg-boss 内置重试；这里抛出让 pg-boss 决定是否重试
      throw err;
    }
  });

  console.log('[agent-worker] pg-boss worker 已注册（batchSize=1）');
}

export async function sendAgentJob(jobId: number) {
  if (!boss) {
    throw new Error('agent-worker 未初始化');
  }
  await boss.send('agent-job', { jobId });
}
