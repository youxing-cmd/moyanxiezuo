import { Hono } from 'hono';
import { db } from '../db/index.js';
import { userProactiveSettings, agentSuggestions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, desc, and, or, gt } from 'drizzle-orm';
import { updateSession, reportIdle, reportParagraph, getActiveSessions } from '../jobs/proactiveScanner.js';
import { shouldSuppress } from '../services/agentFatigue.js';
import { getProactiveSettings } from '../services/agentTriggers.js';

const proactiveRouter = new Hono();
proactiveRouter.use('*', authMiddleware);

// GET /api/proactive/settings
proactiveRouter.get('/settings', async (c) => {
  const userId = c.get('userId');
  const [settings] = await db.select().from(userProactiveSettings).where(eq(userProactiveSettings.userId, userId)).limit(1);
  if (settings) {
    return c.json({
      enabled: settings.enabled,
      idleTimeoutSeconds: settings.idleTimeoutSeconds,
      stagnationWordCount: settings.stagnationWordCount,
      fatigueThreshold: settings.fatigueThreshold,
      fatigueCooldownMinutes: settings.fatigueCooldownMinutes,
    });
  }
  return c.json({
    enabled: true,
    idleTimeoutSeconds: 300,
    stagnationWordCount: 2000,
    fatigueThreshold: 3,
    fatigueCooldownMinutes: 60,
  });
});

// PUT /api/proactive/settings
proactiveRouter.put('/settings', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if (typeof body.enabled === 'boolean') updateData.enabled = body.enabled;
  if (typeof body.idleTimeoutSeconds === 'number') updateData.idleTimeoutSeconds = Math.max(60, body.idleTimeoutSeconds);
  if (typeof body.stagnationWordCount === 'number') updateData.stagnationWordCount = Math.max(100, body.stagnationWordCount);
  if (typeof body.fatigueThreshold === 'number') updateData.fatigueThreshold = Math.max(1, body.fatigueThreshold);
  if (typeof body.fatigueCooldownMinutes === 'number') updateData.fatigueCooldownMinutes = Math.max(1, body.fatigueCooldownMinutes);

  const [existing] = await db.select().from(userProactiveSettings).where(eq(userProactiveSettings.userId, userId)).limit(1);
  if (existing) {
    await db.update(userProactiveSettings).set(updateData).where(eq(userProactiveSettings.userId, userId));
  } else {
    await db.insert(userProactiveSettings).values({
      userId,
      enabled: updateData.enabled ?? true,
      idleTimeoutSeconds: updateData.idleTimeoutSeconds ?? 300,
      stagnationWordCount: updateData.stagnationWordCount ?? 2000,
      fatigueThreshold: updateData.fatigueThreshold ?? 3,
      fatigueCooldownMinutes: updateData.fatigueCooldownMinutes ?? 60,
    } as any);
  }

  return c.json({ success: true });
});

// POST /api/proactive/events/typing
proactiveRouter.post('/events/typing', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { workId, chapterId, wordCount } = body;
  if (!workId) return c.json({ error: 'workId required' }, 400);

  updateSession(userId, { workId, chapterId, wordCount });
  return c.json({ success: true });
});

// POST /api/proactive/events/idle
proactiveRouter.post('/events/idle', async (c) => {
  const userId = c.get('userId');
  reportIdle(userId);
  return c.json({ success: true });
});

// POST /api/proactive/events/paragraph
proactiveRouter.post('/events/paragraph', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { wordCount, chapterId } = body;
  reportParagraph(userId, wordCount || 0, chapterId);
  return c.json({ success: true });
});

// GET /api/proactive/debug — 开发态调试（仅 ?debug=1 时前端调用）
proactiveRouter.get('/debug', async (c) => {
  const userId = c.get('userId');

  const session = getActiveSessions().get(userId);
  const settings = await getProactiveSettings(userId);
  const suppressed = await shouldSuppress(userId);

  const recentSuggestions = await db.select().from(agentSuggestions)
    .where(eq(agentSuggestions.userId, userId))
    .orderBy(desc(agentSuggestions.createdAt))
    .limit(10);

  const cooldownMs = settings.fatigueCooldownMinutes * 60000;
  const recentIgnored = await db.select().from(agentSuggestions)
    .where(and(
      eq(agentSuggestions.userId, userId),
      or(eq(agentSuggestions.status, 'ignored'), eq(agentSuggestions.status, 'dismissed')),
      gt(agentSuggestions.createdAt, new Date(Date.now() - cooldownMs))
    ));

  return c.json({
    session: session ? {
      workId: session.workId,
      chapterId: session.chapterId,
      lastTypingAt: session.lastTypingAt,
      currentWordCount: session.currentWordCount,
      lastConflictWordCount: session.lastConflictWordCount,
      idleSeconds: Math.round((Date.now() - session.lastTypingAt.getTime()) / 1000),
    } : null,
    settings: {
      enabled: settings.enabled,
      idleTimeoutSeconds: settings.idleTimeoutSeconds,
      stagnationWordCount: settings.stagnationWordCount,
      fatigueThreshold: settings.fatigueThreshold,
      fatigueCooldownMinutes: settings.fatigueCooldownMinutes,
    },
    fatigue: {
      suppressed,
      threshold: settings.fatigueThreshold,
      cooldownMinutes: settings.fatigueCooldownMinutes,
      recentIgnoredCount: recentIgnored.length,
    },
    recentSuggestions: recentSuggestions.map(s => ({
      id: s.id,
      triggerType: s.triggerType,
      status: s.status,
      content: s.content ? s.content.slice(0, 200) : null,
      createdAt: s.createdAt,
    })),
  });
});

export default proactiveRouter;
