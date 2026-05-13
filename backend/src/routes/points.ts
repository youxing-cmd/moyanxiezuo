import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, pointTransactions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, desc, and } from 'drizzle-orm';

const pointsRouter = new Hono();
pointsRouter.use('*', authMiddleware);

// 订阅配置
const SUBSCRIPTION_CONFIG = {
  none: { dailyCheckIn: 10, aiLimit: 20, name: '免费版' },
  monthly: { dailyCheckIn: 50, aiLimit: Infinity, name: '月费版' },
  yearly: { dailyCheckIn: 100, aiLimit: Infinity, name: '年费版' },
};

const REDEEM_COSTS = {
  '7days': 1000,
  '30days': 3000,
};

// 检查用户订阅是否有效
function isSubscriptionActive(user: typeof users.$inferSelect): boolean {
  if (user.subscriptionType === 'none') return false;
  if (!user.subscriptionExpireAt) return false;
  return new Date(user.subscriptionExpireAt) > new Date();
}

function getUserSubscriptionConfig(user: typeof users.$inferSelect) {
  if (!isSubscriptionActive(user)) return SUBSCRIPTION_CONFIG.none;
  return SUBSCRIPTION_CONFIG[user.subscriptionType as keyof typeof SUBSCRIPTION_CONFIG] || SUBSCRIPTION_CONFIG.none;
}

// 记录积分变动
export async function recordPointTransaction(
  userId: number,
  type: 'earn' | 'spend' | 'reward',
  amount: number,
  description: string,
  relatedId?: number
) {
  await db.insert(pointTransactions).values({
    userId,
    type,
    amount,
    description,
    relatedId,
  });
}

// 增加用户积分
async function addUserPoints(userId: number, amount: number, description: string, relatedId?: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return false;

  await db.update(users)
    .set({
      points: user.points + amount,
      totalEarnedPoints: user.totalEarnedPoints + (amount > 0 ? amount : 0),
    })
    .where(eq(users.id, userId));

  await recordPointTransaction(userId, amount >= 0 ? 'earn' : 'spend', amount, description, relatedId);
  return true;
}

// GET /api/points — 获取积分和订阅状态
pointsRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  const config = getUserSubscriptionConfig(user);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 检查今日是否已签到
  const checkedInToday = user.lastCheckInAt && new Date(user.lastCheckInAt) >= today;

  return c.json({
    points: user.points,
    totalEarnedPoints: user.totalEarnedPoints,
    subscriptionType: user.subscriptionType,
    subscriptionExpireAt: user.subscriptionExpireAt,
    isSubscriptionActive: isSubscriptionActive(user),
    dailyCheckInPoints: config.dailyCheckIn,
    checkedInToday: !!checkedInToday,
    consecutiveSubmissions: user.consecutiveSubmissions,
    aiDailyLimit: config.aiLimit === Infinity ? -1 : config.aiLimit,
  });
});

// POST /api/points/check-in — 每日签到
pointsRouter.post('/check-in', async (c) => {
  const userId = c.get('userId');

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return { error: '用户不存在', status: 404 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (user.lastCheckInAt && new Date(user.lastCheckInAt) >= today) {
        return { error: '今日已签到', status: 400 };
      }

      const config = getUserSubscriptionConfig(user);
      const reward = config.dailyCheckIn;

      await tx.update(users)
        .set({
          points: user.points + reward,
          totalEarnedPoints: user.totalEarnedPoints + reward,
          lastCheckInAt: new Date(),
        })
        .where(eq(users.id, userId));

      await tx.insert(pointTransactions).values({
        userId,
        type: 'earn',
        amount: reward,
        description: '每日签到',
      });

      return { success: true, reward, points: user.points + reward };
    });

    if (result.error) {
      return c.json({ error: result.error }, result.status as any);
    }

    return c.json({
      reward: result.reward,
      points: result.points,
      message: `签到成功，获得 ${result.reward} 积分`,
    });
  } catch {
    return c.json({ error: '签到失败，请重试' }, 500);
  }
});

// POST /api/points/earn — 完成任务获得积分
const earnSchema = z.object({
  task: z.enum(['create_work', 'save_chapter', 'ai_chat']),
  relatedId: z.number().optional(),
});

pointsRouter.post('/earn', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = earnSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { task, relatedId } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  const REWARDS: Record<string, { amount: number; description: string }> = {
    create_work: { amount: 50, description: '创建作品' },
    save_chapter: { amount: 20, description: '完成章节' },
    ai_chat: { amount: 2, description: 'AI对话' },
  };

  const reward = REWARDS[task];
  if (!reward) return c.json({ error: '未知任务类型' }, 400);

  await db.update(users)
    .set({
      points: user.points + reward.amount,
      totalEarnedPoints: user.totalEarnedPoints + reward.amount,
    })
    .where(eq(users.id, userId));

  await recordPointTransaction(userId, 'earn', reward.amount, reward.description, relatedId);

  return c.json({
    amount: reward.amount,
    points: user.points + reward.amount,
    description: reward.description,
  });
});

// POST /api/points/spend — 消费积分（AI调用等）
const spendSchema = z.object({
  amount: z.number().positive(),
  description: z.string(),
  relatedId: z.number().optional(),
});

pointsRouter.post('/spend', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = spendSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { amount, description, relatedId } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  // 订阅用户不扣AI积分（但有其他限制）
  if (isSubscriptionActive(user) && description.startsWith('AI')) {
    return c.json({ success: true, points: user.points, free: true });
  }

  if (user.points < amount) {
    return c.json({ error: '积分不足', need: amount, have: user.points }, 400);
  }

  await db.update(users)
    .set({ points: user.points - amount })
    .where(eq(users.id, userId));

  await recordPointTransaction(userId, 'spend', -amount, description, relatedId);

  return c.json({
    success: true,
    points: user.points - amount,
    spent: amount,
  });
});

// GET /api/points/transactions — 积分变动明细
pointsRouter.get('/transactions', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '20');

  const list = await db.select()
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return c.json(list);
});

// POST /api/points/redeem — 积分兑换订阅时长
const redeemSchema = z.object({
  duration: z.enum(['7days', '30days']),
});

pointsRouter.post('/redeem', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: '参数错误' }, 400);

  const { duration } = parsed.data;
  const cost = REDEEM_COSTS[duration];
  const days = duration === '7days' ? 7 : 30;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  if (user.points < cost) {
    return c.json({ error: '积分不足', need: cost, have: user.points }, 400);
  }

  // 计算新的到期时间
  const now = new Date();
  const currentExpire = user.subscriptionExpireAt && new Date(user.subscriptionExpireAt) > now
    ? new Date(user.subscriptionExpireAt)
    : now;
  currentExpire.setDate(currentExpire.getDate() + days);

  await db.update(users)
    .set({
      points: user.points - cost,
      subscriptionType: user.subscriptionType === 'none' ? 'monthly' : user.subscriptionType,
      subscriptionExpireAt: currentExpire,
    })
    .where(eq(users.id, userId));

  await recordPointTransaction(userId, 'spend', -cost, `积分兑换${days}天订阅`);

  return c.json({
    success: true,
    points: user.points - cost,
    duration: days,
    subscriptionExpireAt: currentExpire,
  });
});

export { pointsRouter, isSubscriptionActive, getUserSubscriptionConfig, addUserPoints };
