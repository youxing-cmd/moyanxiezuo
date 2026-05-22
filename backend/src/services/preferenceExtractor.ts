// preferenceExtractor.ts — 用户偏好聚合（从 agent 行为数据中提取）

import { db } from '../db/index.js';
import { agentStepEvents, agentPlanSteps, aiArtifacts, agentRoutes, agentJobs } from '../db/schema.js';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface UserPreferences {
  skippedSteps: string[];       // 常跳过的步骤类型
  preferredArtifactTypes: string[]; // 常采纳的产物类型
  avoidedPhrases: string[];     // 避免的表达（从反馈中提取）
  preferredModels: string[];    // 常用的模型
}

/** 聚合用户最近 100 条行为数据，提取偏好 */
export async function extractUserPreferences(userId: number): Promise<UserPreferences> {
  // 1. 先获取用户最近的 job IDs
  const userJobs = await db
    .select({ id: agentJobs.id })
    .from(agentJobs)
    .where(eq(agentJobs.userId, userId))
    .orderBy(sql`${agentJobs.createdAt} desc`)
    .limit(50);

  const jobIds = userJobs.map((j) => j.id);

  // 2. 统计常跳过的步骤类型
  let skippedSteps: string[] = [];
  if (jobIds.length > 0) {
    const skipEvents = await db
      .select({
        stepId: agentStepEvents.stepId,
      })
      .from(agentStepEvents)
      .where(
        and(
          inArray(agentStepEvents.jobId, jobIds),
          eq(agentStepEvents.type, 'control'),
          sql`${agentStepEvents.payload}->>'action' = 'skip'`
        )
      )
      .limit(100);

    const stepIds = skipEvents.map((e) => e.stepId).filter((id) => id > 0);
    if (stepIds.length > 0) {
      const steps = await db
        .select({ taskType: agentPlanSteps.taskType })
        .from(agentPlanSteps)
        .where(inArray(agentPlanSteps.id, stepIds));

      const skipCounts = new Map<string, number>();
      for (const s of steps) {
        skipCounts.set(s.taskType, (skipCounts.get(s.taskType) || 0) + 1);
      }
      skippedSteps = Array.from(skipCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);
    }
  }

  // 3. 统计常采纳的产物类型（accepted artifacts）
  const artifacts = await db
    .select({ type: aiArtifacts.type })
    .from(aiArtifacts)
    .where(eq(aiArtifacts.userId, userId))
    .limit(100);

  const typeCounts = new Map<string, number>();
  for (const a of artifacts) {
    typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1);
  }
  const preferredArtifactTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  // 3. 从 agent_routes 提取用户反馈（corrected 表示用户拒绝了原路由）
  const routes = await db
    .select({ correctedModelId: agentRoutes.correctedModelId, userFeedback: agentRoutes.userFeedback })
    .from(agentRoutes)
    .where(eq(agentRoutes.userId, userId))
    .limit(50);

  const avoidedPhrases: string[] = [];
  const preferredModels: string[] = [];
  for (const r of routes) {
    if (r.correctedModelId && !preferredModels.includes(r.correctedModelId)) {
      preferredModels.push(r.correctedModelId);
    }
    if (r.userFeedback === 'rejected') {
      avoidedPhrases.push('用户拒绝了路由建议');
    }
  }

  return {
    skippedSteps,
    preferredArtifactTypes,
    avoidedPhrases,
    preferredModels: preferredModels.slice(0, 3),
  };
}

/** 将偏好格式化为 prompt 片段 */
export function formatPreferencesForPlanner(prefs: UserPreferences): string {
  const lines: string[] = [];

  if (prefs.skippedSteps.length > 0) {
    lines.push(`【用户习惯】该用户常跳过以下步骤：${prefs.skippedSteps.join('、')}，规划时除非必要否则少生成此类步骤。`);
  }

  if (prefs.preferredArtifactTypes.length > 0) {
    lines.push(`【用户偏好】该用户最常采纳的产物类型：${prefs.preferredArtifactTypes.join('、')}。`);
  }

  if (prefs.preferredModels.length > 0) {
    lines.push(`【用户偏好】该用户偏好的模型：${prefs.preferredModels.join('、')}。`);
  }

  if (prefs.avoidedPhrases.length > 0) {
    lines.push(`【注意事项】${prefs.avoidedPhrases.join('；')}。`);
  }

  return lines.join('\n');
}
