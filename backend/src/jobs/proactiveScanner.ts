import { db } from '../db/index.js';
import { agentSuggestions } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { checkTriggers, type TriggerContext } from '../services/agentTriggers.js';
import { shouldSuppress } from '../services/agentFatigue.js';
import { createSuggestionJob } from '../services/agentSuggestionJob.js';
import { checkLogicConflict, checkStyleDrift } from '../services/agentHighCostChecks.js';

// 活跃会话内存映射
const activeSessions = new Map<number, {
  workId: number;
  chapterId: number;
  lastTypingAt: Date;
  currentWordCount: number;
  lastConflictWordCount: number;
  // 各触发类型上次触发时间戳（毫秒）
  lastTriggeredAt: Record<string, number>;
}>();

// 低成本触发器冷却期：1 小时
const LOW_COST_COOLDOWN_MS = 60 * 60 * 1000;
// 高成本触发器同章节冷却期：12 小时
const HIGH_COST_CHAPTER_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function updateSession(userId: number, data: {
  workId: number;
  chapterId?: number;
  wordCount?: number;
}) {
  const existing = activeSessions.get(userId);
  activeSessions.set(userId, {
    workId: data.workId,
    chapterId: data.chapterId ?? existing?.chapterId ?? 0,
    lastTypingAt: new Date(),
    currentWordCount: data.wordCount ?? existing?.currentWordCount ?? 0,
    lastConflictWordCount: existing?.lastConflictWordCount ?? 0,
    lastTriggeredAt: existing?.lastTriggeredAt ?? {},
  });
}

export function reportIdle(userId: number) {
  // 把 lastTypingAt 回拨到 idleTimeout 之前，让 scanner 立即检测到 idle
  const session = activeSessions.get(userId);
  if (session) {
    session.lastTypingAt = new Date(0);
  }
}

// 高成本检测频率限制：userId -> lastCheckTimestamp
const highCostCheckCooldown = new Map<number, number>();
const HIGH_COST_COOLDOWN_MS = 5 * 60 * 1000; // 5 分钟

export function reportParagraph(userId: number, wordCount: number, chapterId?: number) {
  const existing = activeSessions.get(userId);
  if (existing) {
    existing.currentWordCount = wordCount;
    if (chapterId) existing.chapterId = chapterId;
  }

  // 异步触发高成本检测（不阻塞）
  runHighCostChecks(userId).catch(() => {});
}

async function runHighCostChecks(userId: number) {
  const session = activeSessions.get(userId);
  if (!session) return;
  if (!session.chapterId) {
    console.log(`[proactive] user ${userId} 无 chapterId，跳过高成本检测`);
    return;
  }

  // 频率限制
  const lastCheck = highCostCheckCooldown.get(userId) || 0;
  if (Date.now() - lastCheck < HIGH_COST_COOLDOWN_MS) return;

  // 疲劳检测
  const suppressed = await shouldSuppress(userId);
  if (suppressed) return;

  highCostCheckCooldown.set(userId, Date.now());

  // 同章节同类型 12 小时内不重复检测（数据库兜底）
  const chapterCooldown = new Date(Date.now() - HIGH_COST_CHAPTER_COOLDOWN_MS);

  // 1. 逻辑矛盾检测
  try {
    const recentConflict = await db.select().from(agentSuggestions)
      .where(and(
        eq(agentSuggestions.userId, userId),
        eq(agentSuggestions.workId, session.workId),
        eq(agentSuggestions.triggerType, 'logic_conflict'),
        gt(agentSuggestions.createdAt, chapterCooldown)
      ));
    if (recentConflict.length === 0) {
      const conflict = await checkLogicConflict(session.chapterId);
      if (conflict.hasConflict && conflict.description) {
        await createSuggestionJob(userId, session.workId, 'logic_conflict', {
          description: conflict.description,
          wordCount: session.currentWordCount,
        });
        console.log(`[proactive] logic_conflict detected for user ${userId}`);
        return; // 一次只触发一种
      }
    }
  } catch (err) {
    console.error('[proactive] logic_conflict check error:', err);
  }

  // 2. 风格偏移检测
  try {
    const recentDrift = await db.select().from(agentSuggestions)
      .where(and(
        eq(agentSuggestions.userId, userId),
        eq(agentSuggestions.workId, session.workId),
        eq(agentSuggestions.triggerType, 'style_drift'),
        gt(agentSuggestions.createdAt, chapterCooldown)
      ));
    if (recentDrift.length === 0) {
      const drift = await checkStyleDrift(session.chapterId, session.workId);
      if (drift.hasDrift && drift.description) {
        await createSuggestionJob(userId, session.workId, 'style_drift', {
          description: drift.description,
          wordCount: session.currentWordCount,
        });
        console.log(`[proactive] style_drift detected for user ${userId}`);
      }
    }
  } catch (err) {
    console.error('[proactive] style_drift check error:', err);
  }
}

export function getActiveSessions() {
  return new Map(activeSessions);
}

export async function runProactiveScan() {
  const now = Date.now();

  for (const [userId, session] of activeSessions) {
    // 清理超过 30 分钟无活动的会话
    if (now - session.lastTypingAt.getTime() > 30 * 60 * 1000) {
      activeSessions.delete(userId);
      continue;
    }

    // 疲劳检测
    const suppressed = await shouldSuppress(userId);
    if (suppressed) continue;

    const ctx: TriggerContext = {
      userId,
      workId: session.workId,
      lastTypingAt: session.lastTypingAt,
      currentWordCount: session.currentWordCount,
      lastConflictWordCount: session.lastConflictWordCount,
    };

    const trigger = await checkTriggers(ctx);
    if (!trigger) continue;

    // 同类型 1 小时内不重复触发（内存级，重启后由数据库兜底）
    const lastTriggered = session.lastTriggeredAt[trigger] || 0;
    if (now - lastTriggered < LOW_COST_COOLDOWN_MS) continue;

    // 数据库兜底：同作品同类型最近 1 小时是否有记录
    const cooldownWindow = new Date(now - LOW_COST_COOLDOWN_MS);
    const recentSameType = await db.select().from(agentSuggestions)
      .where(and(
        eq(agentSuggestions.userId, userId),
        eq(agentSuggestions.workId, session.workId),
        eq(agentSuggestions.triggerType, trigger),
        gt(agentSuggestions.createdAt, cooldownWindow)
      ));
    if (recentSameType.length > 0) continue;

    const jobId = await createSuggestionJob(userId, session.workId, trigger, {
      wordCount: session.currentWordCount,
      idleSeconds: (now - session.lastTypingAt.getTime()) / 1000,
    });
    if (jobId) {
      session.lastTriggeredAt[trigger] = now;
      // plot_stagnation 触发后重置字数基准，避免连续触发
      if (trigger === 'plot_stagnation') {
        session.lastConflictWordCount = session.currentWordCount;
      }
      console.log(`[proactive] Created suggestion job ${jobId} for user ${userId}: ${trigger}`);
    }
  }
}

export function startProactiveScanner(intervalMs = 30000) {
  setInterval(() => {
    runProactiveScan().catch((err) => {
      console.error('[proactive] Scan error:', err);
    });
  }, intervalMs);
  console.log(`[proactive] Scanner started, interval ${intervalMs}ms`);
}
