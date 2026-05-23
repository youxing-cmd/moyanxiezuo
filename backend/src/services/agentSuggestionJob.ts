import { db } from '../db/index.js';
import { agentJobs, agentSuggestions, agentPlanSteps } from '../db/schema.js';
import type { TriggerType } from './agentTriggers.js';
import { sendAgentJob } from '../jobs/agentWorker.js';
import { eq } from 'drizzle-orm';

export async function createSuggestionJob(
  userId: number,
  workId: number,
  triggerType: TriggerType,
  triggerData: Record<string, unknown>
): Promise<number | null> {
  // 1. 创建 suggestion 记录
  const [suggestion] = await db.insert(agentSuggestions).values({
    userId,
    workId,
    triggerType,
    triggerData,
    status: 'pending',
  }).returning();

  // 2. 创建轻量 agent_job（2 步：分析上下文 + 生成建议）
  const planSteps = buildSuggestionPlan(triggerType);
  const [job] = await db.insert(agentJobs).values({
    userId,
    workId,
    query: `[proactive] ${triggerType}`,
    status: 'planning',
    triggerType,
    suggestionId: suggestion.id,
  }).returning();

  // 3. 创建 plan steps
  for (const step of planSteps) {
    await db.insert(agentPlanSteps).values({
      jobId: job.id,
      idx: step.idx,
      taskType: step.taskType,
      title: step.title,
      description: step.description,
      status: 'pending',
      dependsOn: step.dependsOn,
    });
  }

  // 4. 更新 suggestion 关联 job
  await db.update(agentSuggestions).set({ jobId: job.id }).where(eq(agentSuggestions.id, suggestion.id));

  // 5. 推入 worker 队列
  try {
    await sendAgentJob(job.id);
  } catch (err) {
    console.error('[suggestion-job] 推入 worker 队列失败:', err);
  }

  return job.id;
}

function buildSuggestionPlan(triggerType: TriggerType) {
  switch (triggerType) {
    case 'idle_timeout':
      return [
        { idx: 1, taskType: 'read_context', title: '读取当前上下文', description: '读取作品已有数据', dependsOn: [] },
        { idx: 2, taskType: 'generate_ideas', title: '生成续写方向', description: '基于上下文生成续写建议', dependsOn: ['1'] },
      ];
    case 'plot_stagnation':
      return [
        { idx: 1, taskType: 'read_context', title: '读取最近段落', description: '分析最近写作内容', dependsOn: [] },
        { idx: 2, taskType: 'generate_ideas', title: '建议引入冲突或转折', description: '基于内容生成冲突建议', dependsOn: ['1'] },
      ];
    case 'logic_conflict':
      return [
        { idx: 1, taskType: 'read_context', title: '检查逻辑一致性', description: '对比前文检测矛盾', dependsOn: [] },
        { idx: 2, taskType: 'generate_ideas', title: '指出矛盾并建议', description: '生成修改建议', dependsOn: ['1'] },
      ];
    case 'style_drift':
      return [
        { idx: 1, taskType: 'read_context', title: '对比风格 DNA', description: '检测风格偏移', dependsOn: [] },
        { idx: 2, taskType: 'generate_ideas', title: '风格调整建议', description: '生成风格回归建议', dependsOn: ['1'] },
      ];
    default:
      return [
        { idx: 1, taskType: 'read_context', title: '读取上下文', description: '', dependsOn: [] },
        { idx: 2, taskType: 'generate_ideas', title: '生成建议', description: '', dependsOn: ['1'] },
      ];
  }
}
