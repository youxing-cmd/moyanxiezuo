// @deprecated 已迁移到 backend/src/config/presetModels.ts + routes/preset-models.ts
// 本路由已从 index.ts 取消注册，仅保留代码作历史参考；
// 旧的 model_configs 表数据保留但不再被读写。
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { modelConfigs } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const modelConfigRouter = new Hono();
modelConfigRouter.use('*', authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(50),
  provider: z.enum(['openai-compatible', 'anthropic']),
  baseUrl: z.string().min(1),
  apiKey: z.string().min(1),
  modelName: z.string().min(1),
});

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  provider: z.enum(['openai-compatible', 'anthropic']).optional(),
  baseUrl: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
});

// GET /api/model-configs — 列表
modelConfigRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const list = await db.select().from(modelConfigs)
    .where(eq(modelConfigs.userId, userId));
  return c.json(list.map(item => ({
    ...item,
    apiKey: maskApiKey(item.apiKey),
  })));
});

// GET /api/model-configs/default — 获取默认配置
modelConfigRouter.get('/default', async (c) => {
  const userId = c.get('userId');
  const [config] = await db.select().from(modelConfigs)
    .where(and(eq(modelConfigs.userId, userId), eq(modelConfigs.isDefault, true)))
    .limit(1);
  if (!config) return c.json(null);
  return c.json({ ...config, apiKey: maskApiKey(config.apiKey) });
});

// POST /api/model-configs — 创建
modelConfigRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误：' + parsed.error.message }, 400);

  const data = parsed.data;
  const existing = await db.select().from(modelConfigs).where(eq(modelConfigs.userId, userId));
  const isFirst = existing.length === 0;

  const [result] = await db.insert(modelConfigs).values({
    userId,
    name: data.name,
    provider: data.provider,
    baseUrl: data.baseUrl.replace(/\/$/, ''),
    apiKey: data.apiKey,
    modelName: data.modelName,
    isDefault: isFirst,
  }).returning();

  return c.json({ ...result, apiKey: maskApiKey(result.apiKey) });
});

// PUT /api/model-configs/:id — 更新
modelConfigRouter.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: '参数错误' }, 400);

  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const [existing] = await db.select().from(modelConfigs)
    .where(and(eq(modelConfigs.id, id), eq(modelConfigs.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: '配置不存在' }, 404);

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.provider !== undefined) updates.provider = body.provider;
  if (body.baseUrl !== undefined) updates.baseUrl = body.baseUrl.replace(/\/$/, '');
  if (body.apiKey !== undefined) updates.apiKey = body.apiKey;
  if (body.modelName !== undefined) updates.modelName = body.modelName;
  updates.updatedAt = new Date();

  const [result] = await db.update(modelConfigs)
    .set(updates)
    .where(eq(modelConfigs.id, id))
    .returning();

  return c.json({ ...result, apiKey: maskApiKey(result.apiKey) });
});

// DELETE /api/model-configs/:id — 删除
modelConfigRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: '参数错误' }, 400);

  const [existing] = await db.select().from(modelConfigs)
    .where(and(eq(modelConfigs.id, id), eq(modelConfigs.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: '配置不存在' }, 404);

  await db.delete(modelConfigs).where(eq(modelConfigs.id, id));

  // 如果删除的是默认配置，把第一个设为默认
  if (existing.isDefault) {
    const [first] = await db.select().from(modelConfigs).where(eq(modelConfigs.userId, userId)).limit(1);
    if (first) {
      await db.update(modelConfigs).set({ isDefault: true }).where(eq(modelConfigs.id, first.id));
    }
  }

  return c.json({ success: true });
});

// POST /api/model-configs/:id/set-default — 设为默认
modelConfigRouter.post('/:id/set-default', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: '参数错误' }, 400);

  const [existing] = await db.select().from(modelConfigs)
    .where(and(eq(modelConfigs.id, id), eq(modelConfigs.userId, userId)))
    .limit(1);
  if (!existing) return c.json({ error: '配置不存在' }, 404);

  // 取消当前默认
  await db.update(modelConfigs)
    .set({ isDefault: false })
    .where(and(eq(modelConfigs.userId, userId), eq(modelConfigs.isDefault, true)));

  // 设为默认
  await db.update(modelConfigs)
    .set({ isDefault: true })
    .where(eq(modelConfigs.id, id));

  return c.json({ success: true });
});

// POST /api/model-configs/:id/test — 测试连接
modelConfigRouter.post('/:id/test', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: '参数错误' }, 400);

  const [config] = await db.select().from(modelConfigs)
    .where(and(eq(modelConfigs.id, id), eq(modelConfigs.userId, userId)))
    .limit(1);
  if (!config) return c.json({ error: '配置不存在' }, 404);

  try {
    if (config.provider === 'anthropic') {
      const res = await fetch(`${config.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.modelName,
          max_tokens: 10,
          messages: [{ role: 'user', content: '你好' }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `连接失败: ${err}` }, 500);
      }
    } else {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `连接失败: ${err}` }, 500);
      }
    }
    return c.json({ success: true, message: '连接成功' });
  } catch (err: any) {
    return c.json({ error: err.message || '连接测试失败' }, 500);
  }
});

function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return key;
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export default modelConfigRouter;
