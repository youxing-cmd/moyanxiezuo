import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { signToken } from '../middleware/auth.js';
import { eq, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { getFeishuAuthUrl, getFeishuUserByCode } from '../services/feishu.js';

const auth = new Hono();

const registerSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const sendCodeSchema = z.object({
  phone: z.string().min(1).max(20),
});

const loginByCodeSchema = z.object({
  phone: z.string().min(1).max(20),
  code: z.string().min(4).max(6),
});

// 内存验证码缓存 { phone: { code, expiresAt } }
const codeCache = new Map<string, { code: string; expiresAt: number }>();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function clearExpiredCodes() {
  const now = Date.now();
  for (const [phone, entry] of codeCache.entries()) {
    if (entry.expiresAt < now) codeCache.delete(phone);
  }
}

// POST /api/auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const { username, password, phone } = parsed.data;

  // 检查手机号是否已注册
  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    return c.json({ error: '该手机号已注册' }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await db.insert(users).values({
    username,
    phone,
    passwordHash,
  }).returning();

  const token = await signToken({ userId: result.id, username: result.username });

  return c.json({
    token,
    user: {
      id: result.id,
      username: result.username,
      phone: result.phone,
      avatar: result.avatar,
      membership: result.membership,
      points: result.points,
      tokenPercent: result.tokenPercent,
      workCount: result.workCount,
      subscriptionType: result.subscriptionType,
      subscriptionExpireAt: result.subscriptionExpireAt,
      createdAt: result.createdAt,
    },
  });
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const { username, password } = parsed.data;

  // username 实际上是手机号
  const [user] = await db.select().from(users).where(eq(users.phone, username)).limit(1);
  if (!user) {
    return c.json({ error: '用户不存在' }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: '密码错误' }, 401);
  }

  const token = await signToken({ userId: user.id, username: user.username });

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      phone: user.phone,
      avatar: user.avatar,
      membership: user.membership,
      points: user.points,
      tokenPercent: user.tokenPercent,
      workCount: user.workCount,
      subscriptionType: user.subscriptionType,
      subscriptionExpireAt: user.subscriptionExpireAt,
      createdAt: user.createdAt,
    },
  });
});

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    return c.json({ error: '用户不存在' }, 404);
  }

  return c.json({
    id: user.id,
    username: user.username,
    phone: user.phone,
    avatar: user.avatar,
    membership: user.membership,
    points: user.points,
    tokenPercent: user.tokenPercent,
    workCount: user.workCount,
    subscriptionType: user.subscriptionType,
    subscriptionExpireAt: user.subscriptionExpireAt,
    dailyGoal: user.dailyGoal,
    weeklyGoalDays: user.weeklyGoalDays,
    createdAt: user.createdAt,
  });
});

// PUT /api/auth/me/goals — 更新创作目标
auth.put('/me/goals', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const dailyGoal = typeof body.dailyGoal === 'number' ? Math.max(0, body.dailyGoal) : undefined;
  const weeklyGoalDays = typeof body.weeklyGoalDays === 'number' ? Math.max(0, Math.min(7, body.weeklyGoalDays)) : undefined;

  const updateData: Record<string, number> = {};
  if (dailyGoal !== undefined) updateData.dailyGoal = dailyGoal;
  if (weeklyGoalDays !== undefined) updateData.weeklyGoalDays = weeklyGoalDays;

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: '参数错误' }, 400);
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));
  return c.json({ success: true });
});

// POST /api/auth/send-code — 发送验证码
auth.post('/send-code', async (c) => {
  const body = await c.req.json();
  const parsed = sendCodeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '手机号格式错误' }, 400);

  const { phone } = parsed.data;
  clearExpiredCodes();

  // 开发环境 mock：固定 123456
  const code = process.env.NODE_ENV === 'production' ? generateCode() : '123456';
  codeCache.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  // TODO: 生产环境对接短信平台
  console.log(`[验证码] ${phone}: ${code}`);

  return c.json({ success: true, message: '验证码已发送' });
});

// POST /api/auth/login-by-code — 验证码登录/注册
auth.post('/login-by-code', async (c) => {
  const body = await c.req.json();
  const parsed = loginByCodeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { phone, code } = parsed.data;
  clearExpiredCodes();

  const cached = codeCache.get(phone);
  if (!cached || cached.code !== code) {
    return c.json({ error: '验证码错误或已过期' }, 400);
  }

  codeCache.delete(phone);

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  if (!user) {
    // 自动注册
    const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(2), 10);
    const [result] = await db.insert(users).values({
      username: phone,
      phone,
      passwordHash,
    }).returning();
    user = result;
  }

  const token = await signToken({ userId: user.id, username: user.username });

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      phone: user.phone,
      membership: user.membership,
      points: user.points,
      tokenPercent: user.tokenPercent,
      workCount: user.workCount,
      subscriptionType: user.subscriptionType,
      subscriptionExpireAt: user.subscriptionExpireAt,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  });
});

// PUT /api/auth/me
auth.put('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const updateData: Record<string, unknown> = {};
  if (body.username !== undefined) updateData.username = body.username;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.avatar !== undefined) updateData.avatar = body.avatar;

  if (body.newPassword) {
    if (!body.oldPassword) {
      return c.json({ error: '请提供旧密码' }, 400);
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }
    const valid = await bcrypt.compare(body.oldPassword, user.passwordHash);
    if (!valid) {
      return c.json({ error: '旧密码错误' }, 401);
    }
    updateData.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return c.json({
    id: user!.id,
    username: user!.username,
    phone: user!.phone,
    membership: user!.membership,
    points: user!.points,
    tokenPercent: user!.tokenPercent,
    workCount: user!.workCount,
    subscriptionType: user!.subscriptionType,
    subscriptionExpireAt: user!.subscriptionExpireAt,
  });
});

const changePhoneSchema = z.object({
  phone: z.string().min(1).max(20),
  code: z.string().min(4).max(6),
});

// POST /api/auth/change-phone — 修改绑定手机号
auth.post('/change-phone', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = changePhoneSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const { phone, code } = parsed.data;
  clearExpiredCodes();

  const cached = codeCache.get(phone);
  if (!cached || cached.code !== code) {
    return c.json({ error: '验证码错误或已过期' }, 400);
  }

  // 检查新手机号是否已被其他用户占用
  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing && existing.id !== userId) {
    return c.json({ error: '该手机号已被其他账号绑定' }, 409);
  }

  codeCache.delete(phone);

  await db.update(users).set({ phone }).where(eq(users.id, userId));

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return c.json({
    id: user!.id,
    username: user!.username,
    phone: user!.phone,
    avatar: user!.avatar,
    membership: user!.membership,
    points: user!.points,
    tokenPercent: user!.tokenPercent,
    workCount: user!.workCount,
    subscriptionType: user!.subscriptionType,
    subscriptionExpireAt: user!.subscriptionExpireAt,
    createdAt: user!.createdAt,
  });
});

// GET /api/auth/feishu/url — 获取飞书授权 URL
auth.get('/feishu/url', (c) => {
  try {
    const url = getFeishuAuthUrl();
    return c.json({ url });
  } catch (err: any) {
    return c.json({ error: err.message || '飞书登录未配置' }, 500);
  }
});

// GET /api/auth/feishu/callback — 飞书回调
auth.get('/feishu/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: '缺少授权码' }, 400);
  }

  try {
    const feishuUser = await getFeishuUserByCode(code);
    const unionId = feishuUser.union_id;

    // 1. 查找是否已绑定
    let [user] = await db.select().from(users).where(eq(users.feishuUnionId, unionId)).limit(1);

    // 2. 如果没绑定，尝试用手机号关联
    if (!user && feishuUser.mobile) {
      const [existing] = await db.select().from(users).where(eq(users.phone, feishuUser.mobile)).limit(1);
      if (existing) {
        // 关联到已有账号
        await db.update(users).set({ feishuUnionId: unionId }).where(eq(users.id, existing.id));
        user = { ...existing, feishuUnionId: unionId };
      }
    }

    // 3. 如果还没找到，自动注册新账号
    if (!user) {
      const phone = feishuUser.mobile || `feishu_${unionId.slice(-12)}`;
      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(2), 10);
      const [created] = await db.insert(users).values({
        username: feishuUser.name || '飞书用户',
        phone,
        passwordHash,
        avatar: feishuUser.avatar_url || null,
        feishuUnionId: unionId,
      }).returning();
      user = created;
    }

    const token = await signToken({ userId: user.id, username: user.username });

    // 返回 HTML，自动写入 token 并跳回首页
    return c.html(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>登录中...</title></head>
<body>
<script>
try {
  localStorage.setItem('jz_token', '${token}');
  window.location.replace('/');
} catch (e) {
  document.body.innerHTML = '<p style="text-align:center;margin-top:40px">登录成功，请<a href="/">点击返回首页</a></p>';
}
<\/script>
</body>
</html>`);
  } catch (err: any) {
    console.error('[feishu callback]', err);
    return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<p style="text-align:center;margin-top:40px;color:#c0392b">登录失败：${err.message || '未知错误'}<br><a href="/">返回首页</a></p>
</body></html>`, 500);
  }
});

export default auth;
