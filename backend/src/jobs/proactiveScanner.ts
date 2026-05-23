import { db } from '../db/index.js';
import { agentSuggestions } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { checkTriggers, type TriggerContext } from '../services/agentTriggers.js';
import { shouldSuppress } from '../services/agentFatigue.js';
import { createSuggestionJob } from '../services/agentSuggestionJob.js';
import { checkLogicConflict, checkStyleDrift } from '../services/agentHighCostChecks.js';

// 活跃会话内存映射：userId -> { workId, lastTypingAt, wordCount, lastConflictWordCount }
const activeSessions = new Map<number, {
  workId: number;
  lastTypingAt: Date;
  currentWordCount: number;
  lastConflictWordCount: number;
}>();

export function updateSession(userId: number, data: {
  workId: number;
  wordCount?: number;
}) {
  const existing = activeSessions.get(userId);
  activeSessions.set(userId, {
    workId: data.workId,
    lastTypingAt: new Date(),
    currentWordCount: data.wordCount ?? existing?.currentWordCount ?? 0,
    lastConflictWordCount: existing?.lastConflictWordCount ?? 0,
  });
}

export function reportIdle(userId: number) {
  // idle 事件不改变 lastTypingAt，让扫描器自然检测
}

// 高成本检测频率限制：userId -> lastCheckTimestamp
const highCostCheckCooldown = new Map<number, number>();
const HIGH_COST_COOLDOWN_MS = 5 * 60 * 1000; // 5 分钟

export function reportParagraph(userId: number, wordCount: number) {
  const existing = activeSessions.get(userId);
  if (existing) {
    existing.currentWordCount = wordCount;
  }

  // 异步触发高成本检测（不阻塞）
  runHighCostChecks(userId).catch(() => {});
}

async function runHighCostChecks(userId: number) {
  const session = activeSessions.get(userId);
  if (!session) return;

  // 频率限制
  const lastCheck = highCostCheckCooldown.get(userId) || 0;
  if (Date.now() - lastCheck < HIGH_COST_COOLDOWN_MS) return;

  // 疲劳检测
  const suppressed = await shouldSuppress(userId);
  if (suppressed) return;

  highCostCheckCooldown.set(userId, Date.now());

  // 1. 逻辑矛盾检测
  try {
    const conflict = await checkLogicConflict(session.workId);
    if (conflict.hasConflict && conflict.description) {
      await createSuggestionJob(userId, session.workId, 'logic_conflict', {
        description: conflict.description,
        wordCount: session.currentWordCount,
      });
      console.log(`[proactive] logic_conflict detected for user ${userId}`);
      return; // 一次只触发一种
    }
  } catch (err) {
    console.error('[proactive] logic_conflict check error:', err);
  }

  // 2. 风格偏移检测
  try {
    const drift = await checkStyleDrift(session.workId, session.workId);
    if (drift.hasDrift && drift.description) {
      await createSuggestionJob(userId, session.workId, 'style_drift', {
        description: drift.description,
        wordCount: session.currentWordCount,
      });
      console.log(`[proactive] style_drift detected for user ${userId}`);
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

    // 检查今日是否已触发过同类型建议
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingToday = await db.select().from(agentSuggestions)
      .where(and(
        eq(agentSuggestions.userId, userId),
        eq(agentSuggestions.workId, session.workId),
        gt(agentSuggestions.createdAt, today)
      ));

    // 今日已触发过则跳过（避免一天内多次打扰）
    if (existingToday.length > 0) continue;

    const ctx: TriggerContext = {
      userId,
      workId: session.workId,
      lastTypingAt: session.lastTypingAt,
      currentWordCount: session.currentWordCount,
      lastConflictWordCount: session.lastConflictWordCount,
    };

    const trigger = await checkTriggers(ctx);
    if (trigger) {
      const jobId = await createSuggestionJob(userId, session.workId, trigger, {
        wordCount: session.currentWordCount,
        idleSeconds: (now - session.lastTypingAt.getTime()) / 1000,
      });
      if (jobId) {
        console.log(`[proactive] Created suggestion job ${jobId} for user ${userId}: ${trigger}`);
      }
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
