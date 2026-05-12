import { Hono } from 'hono';
import { db } from '../db/index.js';
import { works, chapters, chapterVersions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { eq, desc, isNull, and, inArray, asc } from 'drizzle-orm';

const statsRouter = new Hono();
statsRouter.use('*', authMiddleware);

// GET /api/stats — 用户写作统计
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
      dateSet.add(new Date(c.updatedAt).toISOString().split('T')[0]);
    }
  }

  // 连续写作天数
  let consecutiveDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
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
    const ds = d.toISOString().split('T')[0];
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

  return c.json({
    workCount,
    totalWords,
    totalChapters,
    recentWorks,
    consecutiveDays,
    last7Days,
    todayWords,
  });
});

export default statsRouter;
