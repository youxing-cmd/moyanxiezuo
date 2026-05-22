import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { listUserTemplates, saveUserTemplate, deleteUserTemplate, matchTemplate } from '../services/agentTemplates.js';

const router = new Hono();
router.use('*', authMiddleware);

// GET /api/agent/templates — 列出用户模板 + 官方模板
router.get('/templates', async (c) => {
  const userId = c.get('userId');
  const userTemplates = await listUserTemplates(userId);

  const official = [
    { id: -1, name: '写一章正文', description: '读取作品上下文 → 生成章纲 → 写正文 → 自检 → 保存产物', queryPattern: '写一章|续写|写正文|写内容' },
    { id: -2, name: '审稿检查', description: '读取作品上下文 → 六维度自检 → 生成审稿报告', queryPattern: '审稿|检查|看看|评价|点评' },
    { id: -3, name: '参考爆款创作', description: '研究参考作品 → 生成创作方向 → 用户选择 → 写作 → 自检', queryPattern: '参考|模仿|爆款|仿写|借鉴' },
    { id: -4, name: '章纲转正文', description: '读取作品上下文 → 写正文 → 自检 → 保存产物', queryPattern: '章纲|大纲|转正文|扩写' },
    { id: -5, name: '标题简介包装', description: '读取作品上下文 → 生成标题/简介方案 → 用户选择 → 保存产物', queryPattern: '标题|简介|包装|起名|取名' },
  ];

  return c.json({ official, user: userTemplates });
});

// POST /api/agent/templates/match — 根据 query 匹配最佳模板
const matchSchema = z.object({ query: z.string().min(1) });

router.post('/templates/match', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', details: parsed.error.flatten() }, 400);
  }

  const tmpl = await matchTemplate(userId, parsed.data.query);
  if (!tmpl) {
    return c.json({ matched: false });
  }

  return c.json({
    matched: true,
    template: {
      id: tmpl.id,
      name: tmpl.name,
      description: tmpl.description,
      plan: tmpl.plan,
    },
  });
});

// POST /api/agent/templates — 保存用户自定义模板
const saveSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  queryPattern: z.string().min(1).max(500),
  plan: z.record(z.unknown()),
});

router.post('/templates', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误', details: parsed.error.flatten() }, 400);
  }

  const { name, description, queryPattern, plan } = parsed.data;
  const tmpl = await saveUserTemplate(userId, name, description, queryPattern, plan);
  return c.json(tmpl, 201);
});

// DELETE /api/agent/templates/:id — 删除用户模板
router.delete('/templates/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(id)) {
    return c.json({ error: '无效 ID' }, 400);
  }

  await deleteUserTemplate(userId, id);
  return c.json({ ok: true });
});

export default router;
