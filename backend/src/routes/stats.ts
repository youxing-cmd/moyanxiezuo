import { Hono } from 'hono';
import { db } from '../db/index.js';
import { works, chapters, chapterVersions, creationActivities, users, agentSuggestions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, desc, isNull, and, inArray, asc, gte, lt } from 'drizzle-orm';

// 返回本地时区 YYYY-MM-DD（避免 toISOString 用 UTC 日期导致时区偏差）
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const statsRouter = new Hono();
statsRouter.use('*', authMiddleware);

// GET /api/stats — 用户写作统计
// DASHBOARD CONTRACT: 此返回结构是 Dashboard 唯一可信数据源。新增字段须向后兼容，
// 删除/重命名字段需同步改前端。所有模块通过 nextActions 进入，禁止直接操作 DOM。
statsRouter.get('/', async (c) => {
  const userId = c.get('userId');

  // 作品列表（排除已删除的）
  const workList = await db.select().from(works)
    .where(and(eq(works.userId, userId), isNull(works.deletedAt)))
    .orderBy(desc(works.updatedAt));

  const workCount = workList.length;
  const totalWords = workList.reduce((sum, w) => sum + (w.wordCount || 0), 0);
  const totalChapters = workList.reduce((sum, w) => sum + (w.chapterCount || 0), 0);

  // 最近编辑的作品（前5个）
  const recentWorks = workList.slice(0, 5).map(w => ({
    id: w.id,
    title: w.title,
    genre: w.genre,
    status: w.status,
    updatedAt: w.updatedAt,
  }));

  // 章节活跃日期（用于连续天数和7天打卡）
  const workIds = workList.map(w => w.id);
  const chapterList = workIds.length > 0
    ? await db.select({ updatedAt: chapters.updatedAt })
        .from(chapters)
        .where(inArray(chapters.workId, workIds))
    : [];

  const dateSet = new Set<string>();
  for (const c of chapterList) {
    if (c.updatedAt) {
      dateSet.add(formatLocalDate(new Date(c.updatedAt)));
    }
  }

  // 连续写作天数
  let consecutiveDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);
    if (dateSet.has(ds)) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  // 过去7天打卡
  const last7Days: Array<{ date: string; hasWriting: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);
    last7Days.push({ date: ds, hasWriting: dateSet.has(ds) });
  }

  // 今日新增字数（基于 chapter_versions）
  let todayWords = 0;
  const chapterIdList = workIds.length > 0
    ? await db.select({ id: chapters.id })
        .from(chapters)
        .where(inArray(chapters.workId, workIds))
    : [];

  const chapterIds = chapterIdList.map(c => c.id);
  if (chapterIds.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allVersions = await db.select({
      chapterId: chapterVersions.chapterId,
      wordCount: chapterVersions.wordCount,
      createdAt: chapterVersions.createdAt,
    })
      .from(chapterVersions)
      .where(inArray(chapterVersions.chapterId, chapterIds))
      .orderBy(asc(chapterVersions.createdAt));

    // 按章节分组（过滤掉 createdAt 为 null 的情况）
    const byChapter: Record<number, Array<{ wordCount: number; createdAt: Date }>> = {};
    for (const v of allVersions) {
      if (!v.createdAt) continue;
      if (!byChapter[v.chapterId]) byChapter[v.chapterId] = [];
      byChapter[v.chapterId].push({ wordCount: v.wordCount, createdAt: v.createdAt });
    }

    for (const cidStr in byChapter) {
      const versions = byChapter[Number(cidStr)];
      const todayVersions = versions.filter(v => v.createdAt >= today && v.createdAt < tomorrow);
      if (todayVersions.length === 0) continue;
      const todayLast = todayVersions[todayVersions.length - 1];
      const prevVersions = versions.filter(v => v.createdAt < today);
      const prevLast = prevVersions.length > 0 ? prevVersions[prevVersions.length - 1] : null;
      todayWords += todayLast.wordCount - (prevLast?.wordCount || 0);
    }
  }

  // === primaryWork：最近编辑的作品及其最新章节 ===
  let primaryWork: {
    workId: number;
    workTitle: string;
    workEmoji: string;
    workStatus: string;
    chapterId: number;
    chapterTitle: string;
    chapterWordCount: number;
    chapterUpdatedAt: Date | null;
  } | null = null;

  if (recentWorks.length > 0) {
    const pw = recentWorks[0];
    const latestChapter = await db.select()
      .from(chapters)
      .where(eq(chapters.workId, pw.id))
      .orderBy(desc(chapters.updatedAt))
      .limit(1);

    if (latestChapter.length > 0) {
      const ch = latestChapter[0];
      primaryWork = {
        workId: pw.id,
        workTitle: pw.title,
        workEmoji: (pw as any).emoji || '📖',
        workStatus: pw.status,
        chapterId: ch.id,
        chapterTitle: ch.title,
        chapterWordCount: ch.wordCount || 0,
        chapterUpdatedAt: ch.updatedAt,
      };
    } else {
      primaryWork = {
        workId: pw.id,
        workTitle: pw.title,
        workEmoji: (pw as any).emoji || '📖',
        workStatus: pw.status,
        chapterId: 0,
        chapterTitle: '暂无章节',
        chapterWordCount: 0,
        chapterUpdatedAt: pw.updatedAt,
      };
    }
  }

  // === nextActions：规则生成的行动建议 ===
  const nextActions: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
    workId?: number;
    chapterId?: number;
  }> = [];

  if (!primaryWork) {
    nextActions.push({
      type: 'create_work',
      title: '创建第一部作品',
      description: '开启你的创作之旅',
      action: 'showCreateWorkModal',
    });
  } else {
    // 主行动：继续写作
    nextActions.push({
      type: 'continue_writing',
      title: `继续写《${primaryWork.workTitle}》`,
      description: primaryWork.chapterId
        ? `上次编辑：${primaryWork.chapterTitle}`
        : '开始创作第一章',
      action: 'enterWriting',
      workId: primaryWork.workId,
      chapterId: primaryWork.chapterId || undefined,
    });

    // 今日未写，提示开始
    if (todayWords === 0) {
      nextActions.push({
        type: 'start_today',
        title: '开始今天的创作',
        description: '哪怕只写 50 字，也是推进',
        action: 'enterWriting',
        workId: primaryWork.workId,
        chapterId: primaryWork.chapterId || undefined,
      });
    }

    // 章节字数多，建议审稿
    if (primaryWork.chapterWordCount > 4000) {
      // 查询该章节是否有 review / accept_review activity
      const chapterActivities = await db.select({ type: creationActivities.type })
        .from(creationActivities)
        .where(
          and(
            eq(creationActivities.userId, userId),
            eq(creationActivities.chapterId, primaryWork.chapterId)
          )
        )
        .orderBy(desc(creationActivities.createdAt))
        .limit(20);

      const hasReview = chapterActivities.some(a => a.type === 'review');
      const hasAccept = chapterActivities.some(a => a.type === 'accept_review');

      if (hasReview && !hasAccept) {
        nextActions.push({
          type: 're_review_chapter',
          title: '审稿后未采纳',
          description: '已审稿但未采纳建议，建议复查',
          action: 'openAgentReview',
          workId: primaryWork.workId,
          chapterId: primaryWork.chapterId || undefined,
        });
      } else {
        nextActions.push({
          type: 'review_chapter',
          title: '检查上一章节奏',
          description: `上一章 ${primaryWork.chapterWordCount} 字，建议做一次节奏检查`,
          action: 'openAgentReview',
          workId: primaryWork.workId,
          chapterId: primaryWork.chapterId || undefined,
        });
      }
    }

    // 作品章节数足够，建议改编
    if (totalChapters >= 5) {
      nextActions.push({
        type: 'adaptation',
        title: '生成短剧改编包',
        description: `当前作品已有 ${totalChapters} 章，可以尝试短剧化`,
        action: 'exportDramaPackage',
        workId: primaryWork.workId,
      });
    }
  }

  // === 用户目标 ===
  const [user] = await db.select({ dailyGoal: users.dailyGoal, weeklyGoalDays: users.weeklyGoalDays }).from(users).where(eq(users.id, userId)).limit(1);
  const dailyGoal = user?.dailyGoal || 0;
  const weeklyGoalDays = user?.weeklyGoalDays || 0;

  // === 本周有效创作天数（基于 activity）===
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 本周日

  const weekActivityList = await db.select({ createdAt: creationActivities.createdAt })
    .from(creationActivities)
    .where(
      and(
        eq(creationActivities.userId, userId),
        gte(creationActivities.createdAt, weekStart)
      )
    );

  const activeDaySet = new Set<string>();
  for (const a of weekActivityList) {
    if (a.createdAt) activeDaySet.add(a.createdAt.toISOString().split('T')[0]);
  }
  const weeklyActiveDays = activeDaySet.size;

  // === 今日创作活动 ===
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  const todayActivityList = await db.select()
    .from(creationActivities)
    .where(
      and(
        eq(creationActivities.userId, userId),
        gte(creationActivities.createdAt, today),
        lt(creationActivities.createdAt, tomorrow)
      )
    )
    .orderBy(desc(creationActivities.createdAt))
    .limit(10);

  const todayActivities = todayActivityList.map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    workId: a.workId,
    chapterId: a.chapterId,
    metadata: a.metadata,
    createdAt: a.createdAt,
  }));

  // 今日未处理的 Agent 建议
  const pendingSuggestionsList = await db.select()
    .from(agentSuggestions)
    .where(
      and(
        eq(agentSuggestions.userId, userId),
        eq(agentSuggestions.status, 'pending'),
        gte(agentSuggestions.createdAt, today)
      )
    )
    .orderBy(desc(agentSuggestions.createdAt))
    .limit(3);

  const pendingSuggestions = pendingSuggestionsList.map(s => ({
    id: s.id,
    triggerType: s.triggerType,
    content: s.content,
    workId: s.workId,
    createdAt: s.createdAt,
  }));

  return c.json({
    workCount,
    totalWords,
    totalChapters,
    recentWorks,
    consecutiveDays,
    last7Days,
    todayWords,
    primaryWork,
    nextActions,
    todayActivities,
    dailyGoal,
    weeklyGoalDays,
    weeklyActiveDays,
    pendingSuggestions,
  });
});

export default statsRouter;
