/**
 * 九章 Agent 端到端测试脚本
 * 测试 Planner + Executor 完整链路
 */
import 'dotenv/config';

import { planJob, savePlanToSteps } from './src/services/planner.js';
import { executeJob } from './src/services/agentExecutor.js';
import { db } from './src/db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents, users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const TEST_USER_PHONE = '__e2e_test_user__';

async function getOrCreateTestUser(): Promise<number> {
  const [existing] = await db.select().from(users).where(eq(users.phone, TEST_USER_PHONE)).limit(1);
  if (existing) return existing.id;

  const [user] = await db.insert(users).values({
    username: 'e2e-test',
    phone: TEST_USER_PHONE,
    passwordHash: 'test',
    points: 99999,
  }).returning();
  return user.id;
}

async function cleanupTestJobs(userId: number) {
  const jobs = await db.select().from(agentJobs).where(eq(agentJobs.userId, userId));
  for (const job of jobs) {
    await db.delete(agentStepEvents).where(eq(agentStepEvents.jobId, job.id));
    await db.delete(agentPlanSteps).where(eq(agentPlanSteps.jobId, job.id));
    await db.delete(agentJobs).where(eq(agentJobs.id, job.id));
  }
}

async function runE2ETest(query: string, workId: number | null = null) {
  console.log('\n========================================');
  console.log('🧪 端到端测试开始');
  console.log('Query:', query);
  console.log('========================================\n');

  const userId = await getOrCreateTestUser();
  await cleanupTestJobs(userId);

  // ===== Phase 1: Planner =====
  console.log('📋 Phase 1: Planner 生成任务 DAG...');
  const startPlan = Date.now();
  const plan = await planJob(query, { userId, workId });
  const planTime = Date.now() - startPlan;

  console.log(`\n✅ Planner 完成 (${planTime}ms)`);
  console.log(`   标题: ${plan.title}`);
  console.log(`   预计耗时: ${plan.estimatedDuration}`);
  console.log(`   预计成本: ${plan.estimatedCost}`);
  console.log(`   步骤数: ${plan.steps.length}`);

  console.log('\n📊 Plan 结构:');
  for (const step of plan.steps) {
    const deps = step.dependsOn?.length ? ` ← 依赖: ${step.dependsOn.join(', ')}` : '';
    console.log(`   [${step.id}] ${step.type}: ${step.title}${deps}`);
  }

  // 检查 plan 质量
  const hasSelfReview = plan.steps.some(s => s.type === 'self_review');
  const hasWebResearch = plan.steps.some(s => s.type === 'web_research');
  console.log(`\n🔍 Plan 质量检查:`);
  console.log(`   包含 self_review: ${hasSelfReview ? '✅' : '⚠️ 缺失'}`);
  if (query.includes('参考') || query.includes('《')) {
    console.log(`   包含 web_research: ${hasWebResearch ? '✅' : '⚠️ 缺失（指令提到参考作品）'}`);
  }

  // ===== Phase 2: 创建 Job =====
  console.log('\n📦 Phase 2: 创建 Agent Job...');
  const [job] = await db.insert(agentJobs).values({
    userId,
    workId,
    query,
    status: 'planning',
  }).returning();

  await savePlanToSteps(job.id, plan);
  console.log(`   Job ID: ${job.id}`);

  // ===== Phase 3: Executor =====
  console.log('\n⚙️  Phase 3: Executor 执行...');
  await db.update(agentJobs).set({ status: 'running' }).where(eq(agentJobs.id, job.id));

  const startExec = Date.now();
  await executeJob(job.id);
  const execTime = Date.now() - startExec;

  // ===== Phase 4: 结果统计 =====
  const [finalJob] = await db.select().from(agentJobs).where(eq(agentJobs.id, job.id)).limit(1);
  const steps = await db.select().from(agentPlanSteps).where(eq(agentPlanSteps.jobId, job.id)).orderBy(agentPlanSteps.idx);
  const events = await db.select().from(agentStepEvents).where(eq(agentStepEvents.jobId, job.id)).orderBy(agentStepEvents.id);

  console.log(`\n📈 执行结果 (${execTime}ms):`);
  console.log(`   Job 状态: ${finalJob.status}`);
  console.log(`   进度: ${finalJob.progress}%`);

  console.log('\n📋 各步骤状态:');
  for (const step of steps) {
    const icon = step.status === 'done' ? '✅' : step.status === 'failed' ? '❌' : step.status === 'skipped' ? '⏭️' : '⏳';
    const retry = step.retryCount > 0 ? ` (重试${step.retryCount}次)` : '';
    console.log(`   ${icon} [${step.taskType}] ${step.title}${retry}`);
    if (step.output && typeof step.output === 'object') {
      const out = step.output as Record<string, unknown>;
      if (out.content && typeof out.content === 'string') {
        const preview = out.content.slice(0, 120).replace(/\n/g, ' ');
        console.log(`      输出预览: ${preview}${out.content.length > 120 ? '...' : ''}`);
      }
      if (out.error && typeof out.error === 'string') {
        console.log(`      错误: ${out.error}`);
      }
    }
  }

  console.log('\n📝 事件流:');
  for (const ev of events) {
    const payload = JSON.stringify(ev.payload).slice(0, 80);
    console.log(`   [${ev.type}] ${payload}${payload.length >= 80 ? '...' : ''}`);
  }

  console.log('\n========================================');
  console.log('🎯 测试完成');
  console.log('========================================\n');

  return { job: finalJob, steps, events, planTime, execTime };
}

// ===== 主程序 =====
async function main() {
  const queries = [
    '参考《雪中悍刀行》给我写一篇3000字短篇爆款',
    '帮我给当前章节起5个吸引人的标题',
  ];

  for (const query of queries) {
    try {
      await runE2ETest(query, null);
    } catch (err) {
      console.error(`\n❌ 测试失败 [${query}]:`, err);
    }
    // 每个测试之间等 2 秒，避免 rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  process.exit(0);
}

main();
