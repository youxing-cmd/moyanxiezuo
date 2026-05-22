import { Hono } from 'hono';
import { db } from '../db/index.js';
import { creationActivities } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, desc, and, gte, lt } from 'drizzle-orm';

const activitiesRouter = new Hono();
activitiesRouter.use('*', authMiddleware);

// POST /api/activities — 记录创作活动（前端埋点用）
activitiesRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const { workId, chapterId, type, title, metadata } = body;
  if (!type || !title) {
    return c.json({ error: 'type 和 title 必填' }, 400);
  }

  const [result] = await db.insert(creationActivities).values({
    userId,
    workId: workId || null,
    chapterId: chapterId || null,
    type,
    title,
    metadata: metadata || {},
  }).returning();

  return c.json({ id: result.id });
});

// GET /api/activities — 获取活动列表
activitiesRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(50, parseInt(c.req.query('limit') || '20'));
  const date = c.req.query('date');

  let query = db.select().from(creationActivities).where(eq(creationActivities.userId, userId));

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = db.select().from(creationActivities).where(
      and(
        eq(creationActivities.userId, userId),
        gte(creationActivities.createdAt, start),
        lt(creationActivities.createdAt, end)
      )
    );
  }

  const list = await query.orderBy(desc(creationActivities.createdAt)).limit(limit);

  return c.json(list.map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    workId: a.workId,
    chapterId: a.chapterId,
    metadata: a.metadata,
    createdAt: a.createdAt,
  })));
});

export default activitiesRouter;
