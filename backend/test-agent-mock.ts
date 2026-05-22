/**
 * 九章 Agent Mock E2E 测试脚本
 * 不依赖真实 LLM/Firecrawl，跑通 planner → executor → artifact 完整链路
 * 用法：MOCK_LLM=true MOCK_FIRECRAWL=true npx tsx test-agent-mock.ts
 */
import 'dotenv/config';

import { planJob, savePlanToSteps } from './src/services/planner.js';
import { executeJob } from './src/services/agentExecutor.js';
import { db } from './src/db/index.js';
import { agentJobs, agentPlanSteps, agentStepEvents, users, aiArtifacts } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const TEST_USER_PHONE = '__mock_e2e_user__';

async function getOrCreateTestUser(): Promise<number> {
  const [existing] = await db.select().from(users).where(eq(users.phone, TEST_USER_PHONE)).limit(1);
  if (existing) return existing.id;

  const [user] = await db.insert(users).values({
    username: 'mock-e2e',
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

async function runMockE2E(query: string, workId: number | null = null) {
  console.log('\n========================================');
  console.log('🔧 Mock E2E 测试开始');
  console.log('Query:', query);
  console.log('MOCK_LLM:', process.env.MOCK_LLM);
  console.log('MOCK_FIRECRAWL:', process.env.MOCK_FIRECRAWL);
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
  console.log(`   步骤数: ${plan.steps.length}`);

  console.log('\n📊 Plan 结构:');
  for (const step of plan.steps) {
    const deps = step.dependsOn?.length ? ` ← 依赖: ${step.dependsOn.join(', ')}` : '';
    console.log(`   [${step.id}] ${step.type}: ${step.title}${deps}`);
  }

  // ===== Phase 2: 创建 Job =====
  const [job] = await db.insert(agentJobs).values({
    userId,
    workId,
    query,
    status: 'planning',
  }).returning();

  await savePlanToSteps(job.id, plan);
  console.log(`\n📦 Job 创建: ${job.id}`);

  // ===== Phase 3: Executor =====
  console.log('\n⚙️  Phase 3: Executor 执行...');
  await db.update(agentJobs).set({ status: 'running' }).where(eq(agentJobs.id, job.id));

  const startExec = Date.now();
  await executeJob(job.id);
  const execTime = Date.now() - startExec;

  // ===== Phase 4: 结果验证 =====
  const [finalJob] = await db.select().from(agentJobs).where(eq(agentJobs.id, job.id)).limit(1);
  const steps = await db.select().from(agentPlanSteps).where(eq(agentPlanSteps.jobId, job.id)).orderBy(agentPlanSteps.idx);
  const events = await db.select().from(agentStepEvents).where(eq(agentStepEvents.jobId, job.id)).orderBy(agentStepEvents.id);
  const artifacts = workId
    ? await db.select().from(aiArtifacts).where(eq(aiArtifacts.workId, workId))
    : [];

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
        console.log(`      输出: ${preview}${out.content.length > 120 ? '...' : ''}`);
      }
    }
  }

  // 验证 artifact
  if (artifacts.length > 0) {
    console.log(`\n📝 产物检查:`);
    for (const a of artifacts) {
      const hasContent = (a.content?.length || 0) > 0;
      console.log(`   ${hasContent ? '✅' : '❌'} artifact #${a.id}: ${a.title} (${a.content?.length || 0} 字)`);
    }
  }

  // 断言检查
  const checks = [
    { name: 'Plan 生成成功', pass: plan.steps.length >= 5 },
    { name: 'Job 未失败', pass: finalJob.status !== 'failed' },
    { name: '至少 3 步完成', pass: steps.filter((s) => s.status === 'done').length >= 3 },
    { name: 'web_research 有输出', pass: steps.some((s) => s.taskType === 'web_research' && (s.output as Record<string, unknown>)?.content) },
    { name: 'generate_ideas 有输出', pass: steps.some((s) => s.taskType === 'generate_ideas' && (s.output as Record<string, unknown>)?.content) },
  ];

  console.log('\n🧪 断言检查:');
  let allPass = true;
  for (const c of checks) {
    console.log(`   ${c.pass ? '✅' : '❌'} ${c.name}`);
    if (!c.pass) allPass = false;
  }

  console.log('\n========================================');
  console.log(allPass ? '🎉 Mock E2E 全部通过' : '⚠️ 部分断言未通过');
  console.log('========================================\n');

  return { job: finalJob, steps, events, artifacts, allPass, planTime, execTime };
}

async function main() {
  const isMock = process.env.MOCK_LLM === 'true' && process.env.MOCK_FIRECRAWL === 'true';
  if (!isMock) {
    console.warn('⚠️ 未启用 MOCK_LLM 和 MOCK_FIRECRAWL，将调用真实 API');
    console.warn('如需 mock 模式，请运行：MOCK_LLM=true MOCK_FIRECRAWL=true npx tsx test-agent-mock.ts');
    console.log('');
  }

  const result = await runMockE2E('参考《雪中悍刀行》给我写一篇3000字短篇爆款', null);

  process.exit(result.allPass ? 0 : 1);
}

main();
