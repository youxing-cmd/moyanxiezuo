import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { inspirations } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, and, ilike, or, desc, isNull, isNotNull } from 'drizzle-orm';

const inspirationsRouter = new Hono();

inspirationsRouter.use('*', authMiddleware);

const upsertSchema = z.object({
  title: z.string().min(1).max(100),
  source: z.enum(['ai', 'trend', 'custom']).default('custom'),
  tags: z.array(z.string()).max(5).default([]),
  content: z.string().default(''),
  lengthType: z.enum(['long', 'short']).optional(),
});

// GET /api/inspirations/trash — 回收站（必须在 /:id 之前）
inspirationsRouter.get('/trash', async (c) => {
  const userId = c.get('userId');
  const list = await db.select().from(inspirations)
    .where(and(eq(inspirations.userId, userId), isNotNull(inspirations.deletedAt)))
    .orderBy(desc(inspirations.deletedAt));
  return c.json(list);
});

// GET /api/inspirations — 列表（source 过滤 + search + 分页）
inspirationsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const source = c.req.query('source');
  const search = c.req.query('search') || '';
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = Math.min(parseInt(c.req.query('pageSize') || '30'), 100);
  const length = c.req.query('length');

  const conditions = [eq(inspirations.userId, userId), isNull(inspirations.deletedAt)];
  if (source && source !== 'all') conditions.push(eq(inspirations.source, source));
  if (length && length !== 'all') {
    conditions.push(
      or(eq(inspirations.lengthType, length), isNull(inspirations.lengthType))!,
    );
  }
  if (search) {
    conditions.push(
      or(
        ilike(inspirations.title, `%${search}%`),
        ilike(inspirations.content, `%${search}%`),
      )!,
    );
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);
  const all = await db.select().from(inspirations).where(where).orderBy(desc(inspirations.updatedAt));
  const total = all.length;
  const offset = (page - 1) * pageSize;
  const items = all.slice(offset, offset + pageSize);
  return c.json({ items, total, page, pageSize });
});

// POST /api/inspirations
inspirationsRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误: ' + parsed.error.message }, 400);

  const [result] = await db.insert(inspirations).values({
    userId,
    ...parsed.data,
  }).returning();
  return c.json(result);
});

// GET /api/inspirations/:id
inspirationsRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  const [item] = await db.select().from(inspirations).where(eq(inspirations.id, id)).limit(1);
  if (!item || item.userId !== userId) return c.json({ error: '灵感不存在' }, 404);
  return c.json(item);
});

// PUT /api/inspirations/:id
inspirationsRouter.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  const [item] = await db.select().from(inspirations).where(eq(inspirations.id, id)).limit(1);
  if (!item || item.userId !== userId) return c.json({ error: '灵感不存在' }, 404);

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.source !== undefined) updateData.source = body.source;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.lengthType !== undefined) updateData.lengthType = body.lengthType;

  await db.update(inspirations).set(updateData).where(eq(inspirations.id, id));
  const [updated] = await db.select().from(inspirations).where(eq(inspirations.id, id)).limit(1);
  return c.json(updated);
});

// DELETE /api/inspirations/:id — 软删除
inspirationsRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  const [item] = await db.select().from(inspirations).where(eq(inspirations.id, id)).limit(1);
  if (!item || item.userId !== userId) return c.json({ error: '灵感不存在' }, 404);

  await db.update(inspirations).set({ deletedAt: new Date() }).where(eq(inspirations.id, id));
  return c.json({ success: true });
});

// POST /api/inspirations/:id/restore — 恢复
inspirationsRouter.post('/:id/restore', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  const [item] = await db.select().from(inspirations).where(eq(inspirations.id, id)).limit(1);
  if (!item || item.userId !== userId) return c.json({ error: '灵感不存在' }, 404);

  await db.update(inspirations).set({ deletedAt: null }).where(eq(inspirations.id, id));
  return c.json({ success: true });
});

// DELETE /api/inspirations/:id/permanent — 彻底删除
inspirationsRouter.delete('/:id/permanent', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  const [item] = await db.select().from(inspirations).where(eq(inspirations.id, id)).limit(1);
  if (!item || item.userId !== userId) return c.json({ error: '灵感不存在' }, 404);

  await db.delete(inspirations).where(eq(inspirations.id, id));
  return c.json({ success: true });
});

// DELETE /api/inspirations/trash/clear — 清空回收站
inspirationsRouter.delete('/trash/clear', async (c) => {
  const userId = c.get('userId');
  await db.delete(inspirations)
    .where(and(eq(inspirations.userId, userId), isNotNull(inspirations.deletedAt)));
  return c.json({ success: true });
});

export default inspirationsRouter;
