import { Hono } from 'hono';
import { db } from '../db/index.js';
import { agentSuggestions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, desc, and } from 'drizzle-orm';

const suggestionsRouter = new Hono();
suggestionsRouter.use('*', authMiddleware);

// GET /api/suggestions?limit=20
suggestionsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(50, parseInt(c.req.query('limit') || '20'));
  const workId = c.req.query('workId');

  let query;
  if (workId) {
    query = db.select().from(agentSuggestions).where(
      and(
        eq(agentSuggestions.userId, userId),
        eq(agentSuggestions.workId, parseInt(workId))
      )
    );
  } else {
    query = db.select().from(agentSuggestions).where(eq(agentSuggestions.userId, userId));
  }

  const list = await query.orderBy(desc(agentSuggestions.createdAt)).limit(limit);

  return c.json(list.map(s => ({
    id: s.id,
    workId: s.workId,
    triggerType: s.triggerType,
    triggerData: s.triggerData,
    content: s.content,
    status: s.status,
    createdAt: s.createdAt,
  })));
});

// PUT /api/suggestions/:id/status
suggestionsRouter.put('/:id/status', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { status } = body;

  if (!['accepted', 'dismissed', 'ignored'].includes(status)) {
    return c.json({ error: 'status must be accepted/dismissed/ignored' }, 400);
  }

  const [suggestion] = await db.select().from(agentSuggestions).where(eq(agentSuggestions.id, id)).limit(1);
  if (!suggestion || suggestion.userId !== userId) {
    return c.json({ error: '建议不存在' }, 404);
  }

  await db.update(agentSuggestions).set({ status }).where(eq(agentSuggestions.id, id));
  return c.json({ success: true });
});

export default suggestionsRouter;
