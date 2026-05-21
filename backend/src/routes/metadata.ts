import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { characters, outlines, settings } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, and, asc, desc } from 'drizzle-orm';

const metaRouter = new Hono();
metaRouter.use('*', authMiddleware);

// ===== 权限校验：用户是否拥有该作品 =====
async function checkWorkOwner(userId: number, workId: number) {
  const { works } = await import('../db/schema.js');
  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  return work && work.userId === userId;
}

// ========== 角色 ==========

const characterSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(['protagonist', 'supporting']).default('supporting'),
  content: z.string().default(''),
  sort: z.number().default(0),
});

// GET /api/works/:id/characters
metaRouter.get('/:id/characters', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const list = await db.select().from(characters)
    .where(eq(characters.workId, workId))
    .orderBy(asc(characters.sort));

  return c.json(list);
});

// POST /api/works/:id/characters
metaRouter.post('/:id/characters', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = characterSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const [result] = await db.insert(characters).values({
    workId,
    ...parsed.data,
  }).returning();

  return c.json(result);
});

// PUT /api/works/:id/characters/:cid
metaRouter.put('/:id/characters/:cid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [char] = await db.select().from(characters).where(eq(characters.id, cid)).limit(1);
  if (!char || char.workId !== workId) {
    return c.json({ error: '角色不存在' }, 404);
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.sort !== undefined) updateData.sort = body.sort;

  await db.update(characters).set(updateData).where(eq(characters.id, cid));

  const [updated] = await db.select().from(characters).where(eq(characters.id, cid)).limit(1);
  return c.json(updated);
});

// DELETE /api/works/:id/characters/:cid
metaRouter.delete('/:id/characters/:cid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [char] = await db.select().from(characters).where(eq(characters.id, cid)).limit(1);
  if (!char || char.workId !== workId) {
    return c.json({ error: '角色不存在' }, 404);
  }

  await db.delete(characters).where(eq(characters.id, cid));
  return c.json({ success: true });
});

// ========== 设定 ==========

const settingSchema = z.object({
  type: z.enum(['background', 'faction', 'location', 'thing', 'timeline', 'state']).default('background'),
  name: z.string().min(1).max(100),
  content: z.string().default(''),
  sort: z.number().default(0),
});

// GET /api/works/:id/settings
metaRouter.get('/:id/settings', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const list = await db.select().from(settings)
    .where(eq(settings.workId, workId))
    .orderBy(asc(settings.sort));

  return c.json(list);
});

// POST /api/works/:id/settings
metaRouter.post('/:id/settings', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = settingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const [result] = await db.insert(settings).values({
    workId,
    ...parsed.data,
  }).returning();

  return c.json(result);
});

// PUT /api/works/:id/settings/:sid
metaRouter.put('/:id/settings/:sid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const sid = parseInt(c.req.param('sid'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [s] = await db.select().from(settings).where(eq(settings.id, sid)).limit(1);
  if (!s || s.workId !== workId) {
    return c.json({ error: '设定不存在' }, 404);
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.type !== undefined) updateData.type = body.type;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.sort !== undefined) updateData.sort = body.sort;

  await db.update(settings).set(updateData).where(eq(settings.id, sid));

  const [updated] = await db.select().from(settings).where(eq(settings.id, sid)).limit(1);
  return c.json(updated);
});

// DELETE /api/works/:id/settings/:sid
metaRouter.delete('/:id/settings/:sid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const sid = parseInt(c.req.param('sid'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [s] = await db.select().from(settings).where(eq(settings.id, sid)).limit(1);
  if (!s || s.workId !== workId) {
    return c.json({ error: '设定不存在' }, 404);
  }

  await db.delete(settings).where(eq(settings.id, sid));
  return c.json({ success: true });
});

// ========== 总纲 ==========

const outlineSchema = z.object({
  title: z.string().min(1).max(100).default('总纲'),
  content: z.string().default(''),
});

// GET /api/works/:id/outlines
metaRouter.get('/:id/outlines', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const list = await db.select().from(outlines)
    .where(eq(outlines.workId, workId))
    .orderBy(asc(outlines.createdAt));

  return c.json(list);
});

// POST /api/works/:id/outlines
metaRouter.post('/:id/outlines', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = outlineSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const [result] = await db.insert(outlines).values({
    workId,
    ...parsed.data,
  }).returning();

  return c.json(result);
});

// PUT /api/works/:id/outlines/:oid
metaRouter.put('/:id/outlines/:oid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const oid = parseInt(c.req.param('oid'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [o] = await db.select().from(outlines).where(eq(outlines.id, oid)).limit(1);
  if (!o || o.workId !== workId) {
    return c.json({ error: '总纲不存在' }, 404);
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;

  await db.update(outlines).set(updateData).where(eq(outlines.id, oid));

  const [updated] = await db.select().from(outlines).where(eq(outlines.id, oid)).limit(1);
  return c.json(updated);
});

// DELETE /api/works/:id/outlines/:oid
metaRouter.delete('/:id/outlines/:oid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const oid = parseInt(c.req.param('oid'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [o] = await db.select().from(outlines).where(eq(outlines.id, oid)).limit(1);
  if (!o || o.workId !== workId) {
    return c.json({ error: '总纲不存在' }, 404);
  }

  await db.delete(outlines).where(eq(outlines.id, oid));
  return c.json({ success: true });
});

// ========== 草稿 ==========

const draftSchema = z.object({
  title: z.string().min(1).max(200).default('未命名草稿'),
  content: z.string().default(''),
  sourceType: z.enum(['chapter', 'outline', 'setting', 'free']).default('free'),
  sourceId: z.number().optional(),
});

// GET /api/works/:id/drafts
metaRouter.get('/:id/drafts', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const { drafts } = await import('../db/schema.js');
  const list = await db.select().from(drafts)
    .where(eq(drafts.workId, workId))
    .orderBy(desc(drafts.updatedAt));

  return c.json(list);
});

// POST /api/works/:id/drafts
metaRouter.post('/:id/drafts', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const { drafts } = await import('../db/schema.js');
  const [result] = await db.insert(drafts).values({
    workId,
    ...parsed.data,
  }).returning();

  return c.json(result);
});

// PUT /api/works/:id/drafts/:did
metaRouter.put('/:id/drafts/:did', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const did = parseInt(c.req.param('did'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const { drafts } = await import('../db/schema.js');
  const [draft] = await db.select().from(drafts).where(eq(drafts.id, did)).limit(1);
  if (!draft || draft.workId !== workId) {
    return c.json({ error: '草稿不存在' }, 404);
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;

  await db.update(drafts).set(updateData).where(eq(drafts.id, did));

  const [updated] = await db.select().from(drafts).where(eq(drafts.id, did)).limit(1);
  return c.json(updated);
});

// DELETE /api/works/:id/drafts/:did
metaRouter.delete('/:id/drafts/:did', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const did = parseInt(c.req.param('did'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const { drafts } = await import('../db/schema.js');
  const [draft] = await db.select().from(drafts).where(eq(drafts.id, did)).limit(1);
  if (!draft || draft.workId !== workId) {
    return c.json({ error: '草稿不存在' }, 404);
  }

  await db.delete(drafts).where(eq(drafts.id, did));
  return c.json({ success: true });
});

// ========== 批量排序 ==========

// PUT /api/works/:id/characters/reorder
metaRouter.put('/:id/characters/reorder', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  if (!Array.isArray(body.ids)) {
    return c.json({ error: '参数错误' }, 400);
  }

  await Promise.all(body.ids.map((id: number, index: number) =>
    db.update(characters)
      .set({ sort: index })
      .where(eq(characters.id, id))
  ));

  return c.json({ success: true });
});

// PUT /api/works/:id/settings/reorder
metaRouter.put('/:id/settings/reorder', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  if (!(await checkWorkOwner(userId, workId))) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  if (!Array.isArray(body.ids)) {
    return c.json({ error: '参数错误' }, 400);
  }

  await Promise.all(body.ids.map((id: number, index: number) =>
    db.update(settings)
      .set({ sort: index })
      .where(eq(settings.id, id))
  ));

  return c.json({ success: true });
});

export default metaRouter;
