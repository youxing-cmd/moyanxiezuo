import { db } from '../db/index.js';
import { agentSuggestions, userProactiveSettings } from '../db/schema.js';
import { eq, or, and, gt } from 'drizzle-orm';

export async function shouldSuppress(userId: number): Promise<boolean> {
  const [settings] = await db.select().from(userProactiveSettings).where(eq(userProactiveSettings.userId, userId)).limit(1);
  if (!settings) return false;

  const threshold = settings.fatigueThreshold;
  const cooldownMinutes = settings.fatigueCooldownMinutes;

  // 最近 cooldownMinutes 内被忽略/关闭的次数
  const recentIgnored = await db.select().from(agentSuggestions)
    .where(and(
      eq(agentSuggestions.userId, userId),
      or(eq(agentSuggestions.status, 'ignored'), eq(agentSuggestions.status, 'dismissed')),
      gt(agentSuggestions.createdAt, new Date(Date.now() - cooldownMinutes * 60000))
    ));

  return recentIgnored.length >= threshold;
}
