/**
 * 数据回填脚本：修正章节字数、作品总字数、活动记录 addedWords
 * 运行：cd backend && npx tsx scripts/backfill-word-count.ts
 */
import { db } from '../src/db/index.js';
import { works, chapters, creationActivities } from '../src/db/schema.js';
import { eq, sql } from 'drizzle-orm';

async function backfill() {
  console.log('[backfill] 开始数据修复...');

  // 1. 根据章节正文重新计算 wordCount
  const allChapters = await db.select().from(chapters);
  let chapterUpdated = 0;
  for (const ch of allChapters) {
    const actualWordCount = (ch.content || '').length;
    if ((ch.wordCount || 0) !== actualWordCount) {
      await db.update(chapters)
        .set({ wordCount: actualWordCount })
        .where(eq(chapters.id, ch.id));
      chapterUpdated++;
    }
  }
  console.log(`[backfill] 修正 chapters.wordCount: ${chapterUpdated} 条`);

  // 2. 汇总修正 works.wordCount
  const allWorks = await db.select().from(works);
  let workUpdated = 0;
  for (const work of allWorks) {
    const workChapters = await db.select({ wordCount: chapters.wordCount })
      .from(chapters)
      .where(eq(chapters.workId, work.id));
    const totalWords = workChapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    if ((work.wordCount || 0) !== totalWords) {
      await db.update(works)
        .set({ wordCount: totalWords })
        .where(eq(works.id, work.id));
      workUpdated++;
    }
  }
  console.log(`[backfill] 修正 works.wordCount: ${workUpdated} 条`);

  // 3. 给旧 creation_activities 补 addedWords
  const allActivities = await db.select()
    .from(creationActivities)
    .where(eq(creationActivities.type, 'write'));
  let activityUpdated = 0;
  for (const a of allActivities) {
    const meta = (a.metadata || {}) as Record<string, unknown>;
    if (meta.addedWords !== undefined) continue;

    // 新建章节：addedWords = wordCount
    // 更新章节：addedWords 无法精确回溯，保守取 0（已有今日新增字数兜底）
    const action = meta.action as string | undefined;
    const wordCount = meta.wordCount as number | undefined;
    const addedWords = action === 'create_chapter' ? (wordCount || 0) : 0;

    await db.update(creationActivities)
      .set({
        metadata: { ...meta, addedWords },
      })
      .where(eq(creationActivities.id, a.id));
    activityUpdated++;
  }
  console.log(`[backfill] 补全 creation_activities.addedWords: ${activityUpdated} 条`);

  console.log('[backfill] 完成');
  process.exit(0);
}

backfill().catch((err) => {
  console.error('[backfill] 失败:', err);
  process.exit(1);
});
