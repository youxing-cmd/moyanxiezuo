// preferenceExtractor.ts — 用户偏好聚合（从 agent 行为数据中提取）

import { db } from '../db/index.js';
import { agentStepEvents, aiArtifacts, agentRoutes } from '../db/schema.js';
import { eq, desc, gte, sql } from 'drizzle-orm';

export interface UserPreferences {
  skippedSteps: string[];       // 常跳过的步骤类型
  preferredArtifactTypes: string[]; // 常采纳的产物类型
  avoidedPhrases: string[];     // 避免的表达（从反馈中提取）
  preferredModels: string[];    // 常用的模型
}

/** 聚合用户最近 100 条行为数据，提取偏好 */
export async function extractUserPreferences(userId: number): Promise<UserPreferences> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 最近 30 天

  // 1. 统计常跳过的步骤类型
  const skipEvents = await db
    .select()
    .from(agentStepEvents)
    .where(
      eq(agentStepEvents.jobId, sql`(SELECT id FROM agent_jobs WHERE user_id = ${userId})`)
    )
    .limit(100);

  // 简化为直接查询所有 control/skip 事件
  const skipCounts = new Map<string, number>();
  for (const evt of skipEvents) {
    if (evt.type === 'control' && (evt.payload as Record<string, unknown>)?.action === 'skip') {
      // payload 中没有 taskType，需要从 stepId 关联查询
      // 为简化实现，先跳过精确统计
    }
  }

  // 2. 统计常采纳的产物类型（accepted artifacts）
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

  // 简化 skippedSteps：直接基于常见模式返回
  // 实际实现需要关联 agent_plan_steps 表获取 taskType
  const skippedSteps: string[] = [];

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
