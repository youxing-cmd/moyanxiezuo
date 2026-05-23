import { db } from '../db/index.js';
import { userProactiveSettings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface TriggerContext {
  userId: number;
  workId: number;
  lastTypingAt: Date;
  currentWordCount: number;
  lastConflictWordCount: number;
}

export type TriggerType = 'idle_timeout' | 'plot_stagnation' | 'logic_conflict' | 'style_drift';

export async function getProactiveSettings(userId: number) {
  const [settings] = await db.select().from(userProactiveSettings).where(eq(userProactiveSettings.userId, userId)).limit(1);
  if (settings) return settings;
  // 返回默认值
  return {
    userId,
    enabled: true,
    idleTimeoutSeconds: 300,
    stagnationWordCount: 2000,
    fatigueThreshold: 3,
    fatigueCooldownMinutes: 60,
    updatedAt: new Date(),
  };
}

export async function checkTriggers(ctx: TriggerContext): Promise<TriggerType | null> {
  const settings = await getProactiveSettings(ctx.userId);
  if (!settings.enabled) return null;

  // 1. idle_timeout
  const idleSeconds = (Date.now() - ctx.lastTypingAt.getTime()) / 1000;
  if (idleSeconds >= settings.idleTimeoutSeconds) {
    return 'idle_timeout';
  }

  // 2. plot_stagnation
  const wordsSinceConflict = ctx.currentWordCount - ctx.lastConflictWordCount;
  if (wordsSinceConflict >= settings.stagnationWordCount) {
    return 'plot_stagnation';
  }

  return null;
}
