import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { works, chapters, chapterVersions, chapterSummaries, workStyleDNA, drafts, characters, outlines, settings, aiConversations, aiArtifacts, aiCorrections, agentJobs, agentPlanSteps, agentStepEvents, creationActivities } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateChapterSummary } from '../services/chapterSummary.js';
import { generateAndSaveStyleDNA } from '../services/styleDNA.js';
import { awardPointsForAction } from '../routes/points.js';
import { eq, and, ilike, desc, isNull, isNotNull, inArray } from 'drizzle-orm';

const worksRouter = new Hono();

worksRouter.use('*', authMiddleware);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  genre: z.string().min(1).max(50),
  status: z.string().default('unfinished'),
  tags: z.array(z.string()).default([]),
  emoji: z.string().default('📖'),
  gradient: z.string().default('135deg, #1e3a5f, #0f2744'),
  perspective: z.enum(['first', 'third']).default('third'),
  channel: z.enum(['male', 'female', 'all']).default('male'),
  intro: z.string().default(''),
  cover: z.string().default(''),
  inspiration: z.string().default(''),
  analysis: z.string().default(''),
  lengthType: z.enum(['long', 'short']).default('long'),
  source: z.enum(['original', 'analysis', 'trend-plan', 'trend-item']).default('original'),
});

// GET /api/works
worksRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const search = c.req.query('search') || '';
  const status = c.req.query('status');
  const length = c.req.query('length');
  const source = c.req.query('source');

  const conditions = [eq(works.userId, userId)];
  if (status) conditions.push(eq(works.status, status));
  if (length && length !== 'all') conditions.push(eq(works.lengthType, length));
  if (source) conditions.push(eq(works.source, source));
  if (search) conditions.push(ilike(works.title, `%${search}%`));

  conditions.push(isNull(works.deletedAt));

  const list = await db.select().from(works)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(works.updatedAt));

  return c.json(list.map(w => ({
    id: w.id,
    title: w.title,
    genre: w.genre,
    status: w.status,
    source: w.source,
    chapters: w.chapterCount,
    words: formatWordCount(w.wordCount),
    lastUpdate: formatTime(w.updatedAt),
    tags: w.tags,
    emoji: w.emoji,
    gradient: w.gradient,
  })));
});

// POST /api/works
worksRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const [result] = await db.insert(works).values({
    userId,
    ...parsed.data,
  }).returning();

  // 自动创建第一章
  await db.insert(chapters).values({
    workId: result.id,
    title: '第一章',
    content: '',
    orderIndex: 0,
  });

  await db.update(works).set({ chapterCount: 1 }).where(eq(works.id, result.id));

  // 自动发放创建作品积分（不阻塞响应）
  awardPointsForAction(userId, 'create_work', result.id).catch(() => {});

  return c.json({
    id: result.id,
    title: result.title,
    genre: result.genre,
    status: result.status,
    chapters: 1,
    words: '0字',
    lastUpdate: '刚刚',
    tags: result.tags,
    emoji: result.emoji,
    gradient: result.gradient,
  });
});

// GET /api/works/trash — 回收站列表（必须在 /:id 之前）
worksRouter.get('/trash', async (c) => {
  const userId = c.get('userId');

  const list = await db.select().from(works)
    .where(and(eq(works.userId, userId), isNotNull(works.deletedAt)))
    .orderBy(desc(works.updatedAt));

  return c.json(list.map(w => ({
    id: w.id,
    title: w.title,
    genre: w.genre,
    status: w.status,
    words: formatWordCount(w.wordCount),
    chapters: w.chapterCount,
    deletedAt: w.deletedAt,
  })));
});

// GET /api/works/:id
worksRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, id)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const chList = await db.select().from(chapters).where(eq(chapters.workId, id)).orderBy(chapters.orderIndex);

  return c.json({
    ...work,
    words: formatWordCount(work.wordCount),
    chapterList: chList,
  });
});

// PUT /api/works/:id
worksRouter.put('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, id)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.genre !== undefined) updateData.genre = body.genre;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.emoji !== undefined) updateData.emoji = body.emoji;
  if (body.gradient !== undefined) updateData.gradient = body.gradient;
  if (body.settings !== undefined) updateData.settings = body.settings;
  if (body.perspective !== undefined) updateData.perspective = body.perspective;
  if (body.channel !== undefined) updateData.channel = body.channel;
  if (body.intro !== undefined) updateData.intro = body.intro;
  if (body.cover !== undefined) updateData.cover = body.cover;
  if (body.inspiration !== undefined) updateData.inspiration = body.inspiration;
  if (body.analysis !== undefined) updateData.analysis = body.analysis;
  if (body.lengthType !== undefined) updateData.lengthType = body.lengthType;
  if (body.source !== undefined) updateData.source = body.source;

  await db.update(works).set(updateData).where(eq(works.id, id));

  const [updated] = await db.select().from(works).where(eq(works.id, id)).limit(1);
  return c.json(updated);
});

// GET /api/works/:id/chapter-summaries — 查询章节摘要（支持关键词过滤）
worksRouter.get('/:id/chapter-summaries', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const keyword = c.req.query('keyword')?.toLowerCase();

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const chapterList = await db.select().from(chapters).where(eq(chapters.workId, workId)).orderBy(chapters.orderIndex);
  const summaries = await db.select().from(chapterSummaries).where(eq(chapterSummaries.workId, workId));

  const result = chapterList.map(ch => {
    const s = summaries.find(sum => sum.chapterId === ch.id);
    return {
      chapterId: ch.id,
      title: ch.title,
      orderIndex: ch.orderIndex,
      summary: s?.summary || '',
      keyEvents: s?.keyEvents || [],
      involvedCharacters: s?.involvedCharacters || [],
      openHooks: s?.openHooks || [],
      characterChanges: s?.characterChanges || [],
    };
  });

  if (keyword) {
    return c.json(result.filter(r =>
      r.summary.toLowerCase().includes(keyword) ||
      r.keyEvents.some(e => e.toLowerCase().includes(keyword)) ||
      r.involvedCharacters.some(c => c.name.toLowerCase().includes(keyword)) ||
      r.openHooks.some(h => h.toLowerCase().includes(keyword))
    ));
  }

  return c.json(result);
});

// GET /api/works/:id/style-dna — 获取作品风格 DNA
worksRouter.get('/:id/style-dna', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [dna] = await db.select().from(workStyleDNA).where(eq(workStyleDNA.workId, workId)).limit(1);
  if (!dna) {
    // 返回 200 + 空对象，避免浏览器 console 报 404 噪声
    return c.json({ sampleSize: 0 });
  }

  return c.json({
    avgSentenceLength: dna.avgSentenceLength,
    shortSentenceRatio: dna.shortSentenceRatio,
    longSentenceRatio: dna.longSentenceRatio,
    dialogueRatio: dna.dialogueRatio,
    avgParagraphLength: dna.avgParagraphLength,
    commonPhrases: dna.commonPhrases,
    signatureWords: dna.signatureWords,
    sampleSize: dna.sampleSize,
    updatedAt: dna.updatedAt,
  });
});

// GET /api/works/:id/dashboard — 作品成长仪表盘聚合数据
worksRouter.get('/:id/dashboard', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  // 章节列表
  const chapterList = await db.select({
    id: chapters.id,
    title: chapters.title,
    wordCount: chapters.wordCount,
    orderIndex: chapters.orderIndex,
    updatedAt: chapters.updatedAt,
  }).from(chapters).where(eq(chapters.workId, workId)).orderBy(chapters.orderIndex);

  // 风格 DNA
  const [dna] = await db.select().from(workStyleDNA).where(eq(workStyleDNA.workId, workId)).limit(1);

  // 章节摘要（最近 5 章）
  const summaryList = await db.select({
    chapterId: chapterSummaries.chapterId,
    summary: chapterSummaries.summary,
    keyEvents: chapterSummaries.keyEvents,
  }).from(chapterSummaries)
    .where(inArray(chapterSummaries.chapterId, chapterList.map(c => c.id)))
    .orderBy(desc(chapterSummaries.createdAt))
    .limit(5);

  const summaryWithTitle = summaryList.map(s => {
    const ch = chapterList.find(c => c.id === s.chapterId);
    return { ...s, title: ch?.title || '' };
  });

  // 创作活动日期（近30天）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activityList = await db.select({ createdAt: creationActivities.createdAt })
    .from(creationActivities)
    .where(
      and(
        eq(creationActivities.userId, userId),
        eq(creationActivities.workId, workId),
      )
    );

  const activityDates: string[] = [];
  const seen = new Set<string>();
  for (const a of activityList) {
    if (a.createdAt) {
      const d = new Date(a.createdAt);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!seen.has(ds)) {
        seen.add(ds);
        activityDates.push(ds);
      }
    }
  }

  // 最近保存版本（各章最近一条，汇总后取前 5）
  const chapterIds = chapterList.map(c => c.id);
  let recentVersions: Array<{ chapterTitle: string; wordCount: number; createdAt: Date | null }> = [];
  if (chapterIds.length > 0) {
    const versionList = await db.select({
      chapterId: chapterVersions.chapterId,
      wordCount: chapterVersions.wordCount,
      createdAt: chapterVersions.createdAt,
    }).from(chapterVersions)
      .where(inArray(chapterVersions.chapterId, chapterIds))
      .orderBy(desc(chapterVersions.createdAt))
      .limit(20);

    recentVersions = versionList.map(v => {
      const ch = chapterList.find(c => c.id === v.chapterId);
      return { chapterTitle: ch?.title || '', wordCount: v.wordCount, createdAt: v.createdAt };
    }).slice(0, 5);
  }

  return c.json({
    work: {
      id: work.id,
      title: work.title,
      wordCount: work.wordCount,
      chapterCount: work.chapterCount,
      genre: work.genre,
      status: work.status,
      updatedAt: work.updatedAt,
    },
    chapters: chapterList,
    styleDNA: dna ? {
      avgSentenceLength: dna.avgSentenceLength,
      shortSentenceRatio: dna.shortSentenceRatio,
      longSentenceRatio: dna.longSentenceRatio,
      dialogueRatio: dna.dialogueRatio,
      avgParagraphLength: dna.avgParagraphLength,
      commonPhrases: dna.commonPhrases,
      signatureWords: dna.signatureWords,
      sampleSize: dna.sampleSize,
      updatedAt: dna.updatedAt,
    } : null,
    chapterSummaries: summaryWithTitle,
    activityDates,
    recentVersions,
  });
});

// GET /api/works/:id/chapters/:cid/summary — 读取单个章节摘要
worksRouter.get('/:id/chapters/:cid/summary', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const chapterId = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const [summary] = await db.select().from(chapterSummaries).where(eq(chapterSummaries.chapterId, chapterId)).limit(1);

  return c.json({
    chapterId: chapter.id,
    title: chapter.title,
    summary: summary?.summary || '',
    keyEvents: summary?.keyEvents || [],
    involvedCharacters: summary?.involvedCharacters || [],
    openHooks: summary?.openHooks || [],
    characterChanges: summary?.characterChanges || [],
  });
});

// POST /api/works/:id/chapters/:cid/suggestion — 生成下一章建议
worksRouter.post('/:id/chapters/:cid/suggestion', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const chapterId = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const [summary] = await db.select().from(chapterSummaries).where(eq(chapterSummaries.chapterId, chapterId)).limit(1);
  const [dna] = await db.select().from(workStyleDNA).where(eq(workStyleDNA.workId, workId)).limit(1);

  if (!summary) {
    return c.json({ error: '暂无摘要，请先保存章节' }, 400);
  }

  // TODO: 调用 LLM 生成下一章建议
  // 当前返回基于 openHooks 的占位建议
  const suggestions = summary.openHooks?.length > 0
    ? summary.openHooks.slice(0, 3).map((hook, i) => ({
        id: i + 1,
        title: `承接钩子：${hook.slice(0, 20)}...`,
        description: hook,
      }))
    : [
        { id: 1, title: '继续推进主线', description: '基于当前章节内容，推进主线剧情发展' },
        { id: 2, title: '引入新冲突', description: '在下一章中引入新的冲突或阻碍' },
        { id: 3, title: '深化角色关系', description: '通过对话或事件深化角色之间的关系' },
      ];

  return c.json({ suggestions });
});

// DELETE /api/works/:id — 软删除
worksRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, id)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  await db.update(works)
    .set({ deletedAt: new Date() })
    .where(eq(works.id, id));

  return c.json({ success: true });
});

// POST /api/works/:id/restore — 恢复
worksRouter.post('/:id/restore', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, id)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  await db.update(works)
    .set({ deletedAt: null })
    .where(eq(works.id, id));

  return c.json({ success: true });
});

// DELETE /api/works/:id/permanent — 彻底删除
worksRouter.delete('/:id/permanent', async (c) => {
  const userId = c.get('userId');
  const id = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, id)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const chapterIds = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.workId, id));
  if (chapterIds.length > 0) {
    const cids = chapterIds.map(c => c.id);
    await db.delete(chapterVersions).where(inArray(chapterVersions.chapterId, cids));
    await db.delete(chapterSummaries).where(inArray(chapterSummaries.chapterId, cids));
    await db.delete(aiCorrections).where(inArray(aiCorrections.chapterId, cids));
  }
  await db.delete(workStyleDNA).where(eq(workStyleDNA.workId, id));
  await db.delete(aiArtifacts).where(eq(aiArtifacts.workId, id));
  await db.delete(aiCorrections).where(eq(aiCorrections.workId, id));
  const jobIds = await db.select({ id: agentJobs.id }).from(agentJobs).where(eq(agentJobs.workId, id));
  if (jobIds.length > 0) {
    const jids = jobIds.map(j => j.id);
    await db.delete(agentStepEvents).where(inArray(agentStepEvents.jobId, jids));
    await db.delete(agentPlanSteps).where(inArray(agentPlanSteps.jobId, jids));
  }
  await db.delete(agentJobs).where(eq(agentJobs.workId, id));
  await db.delete(drafts).where(eq(drafts.workId, id));
  await db.delete(characters).where(eq(characters.workId, id));
  await db.delete(outlines).where(eq(outlines.workId, id));
  await db.delete(settings).where(eq(settings.workId, id));
  await db.delete(aiConversations).where(eq(aiConversations.workId, id));
  await db.delete(chapters).where(eq(chapters.workId, id));
  await db.delete(works).where(eq(works.id, id));

  return c.json({ success: true });
});

// GET /api/works/:id/chapters
worksRouter.get('/:id/chapters', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const list = await db.select().from(chapters).where(eq(chapters.workId, workId)).orderBy(chapters.orderIndex);
  return c.json(list);
});

// POST /api/works/:id/chapters
worksRouter.post('/:id/chapters', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  const title = body.title || `第${work.chapterCount + 1}章`;
  const content = body.content || '';
  const volume = body.volume || '';

  const [maxOrder] = await db.select().from(chapters).where(eq(chapters.workId, workId)).orderBy(desc(chapters.orderIndex)).limit(1);
  const orderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;

  const wordCount = content.length || 0;
  const [result] = await db.insert(chapters).values({
    workId,
    title,
    content,
    volume,
    orderIndex,
    wordCount,
  }).returning();

  await db.update(works).set({
    chapterCount: work.chapterCount + 1,
    wordCount: work.wordCount + (content.length || 0),
    updatedAt: new Date(),
  }).where(eq(works.id, workId));

  // 记录创作活动
  await db.insert(creationActivities).values({
    userId,
    workId,
    chapterId: result.id,
    type: 'write',
    title: `创建了章节「${title}」`,
    metadata: { wordCount, addedWords: wordCount, action: 'create_chapter' },
  });

  return c.json(result);
});

// GET /api/works/:id/chapters/:cid — 获取单章详情
worksRouter.get('/:id/chapters/:cid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  return c.json(chapter);
});

// PUT /api/works/:id/chapters/reorder — 批量调整章节顺序（必须在 /:cid 之前）
worksRouter.put('/:id/chapters/reorder', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const body = await c.req.json();
  if (!Array.isArray(body.ids)) {
    return c.json({ error: '参数错误' }, 400);
  }

  // 只更新属于当前作品的章节，防止跨作品篡改排序
  const validChapters = await db.select({ id: chapters.id }).from(chapters)
    .where(and(eq(chapters.workId, workId), inArray(chapters.id, body.ids)));
  const validIdSet = new Set(validChapters.map(c => c.id));

  await Promise.all(body.ids.map((id: number, index: number) => {
    if (!validIdSet.has(id)) return Promise.resolve();
    return db.update(chapters)
      .set({ orderIndex: index })
      .where(eq(chapters.id, id));
  }));

  return c.json({ success: true });
});

// PUT /api/works/:id/chapters/:cid
worksRouter.put('/:id/chapters/:cid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const body = await c.req.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) {
    updateData.content = body.content;
    // 去除 HTML 标签后计算纯文本字数
    const plainText = body.content
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    updateData.wordCount = plainText.length || 0;
  }
  if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;
  if (body.volume !== undefined) updateData.volume = body.volume;
  if (body.outline !== undefined) updateData.outline = body.outline;

  await db.update(chapters).set(updateData).where(eq(chapters.id, cid));

  // 保存历史版本（如果有内容变更）——存旧内容，用于回滚
  if (body.content !== undefined && body.content !== chapter.content) {
    await db.insert(chapterVersions).values({
      chapterId: cid,
      content: chapter.content,
      wordCount: chapter.wordCount || 0,
      source: body.source || 'auto',
    });

    // 清理旧版本，只保留最近 20 条
    const allVersions = await db.select({ id: chapterVersions.id }).from(chapterVersions)
      .where(eq(chapterVersions.chapterId, cid))
      .orderBy(desc(chapterVersions.createdAt));

    if (allVersions.length > 20) {
      const toDelete = allVersions.slice(20);
      await Promise.all(toDelete.map(v =>
        db.delete(chapterVersions).where(eq(chapterVersions.id, v.id))
      ));
    }

    // 异步生成章节摘要（不阻塞响应）
    const summaryTitle = body.title !== undefined ? body.title : chapter.title;
    generateChapterSummary(body.content, summaryTitle)
      .then(async (summary) => {
        if (!summary) return;
        await db.delete(chapterSummaries).where(eq(chapterSummaries.chapterId, cid));
        await db.insert(chapterSummaries).values({
          chapterId: cid,
          workId,
          summary: summary.summary,
          keyEvents: summary.keyEvents,
          involvedCharacters: summary.involvedCharacters,
          openHooks: summary.openHooks,
          characterChanges: summary.characterChanges,
        });
      })
      .catch(() => {});

    // 异步更新风格 DNA（不阻塞响应）
    generateAndSaveStyleDNA(workId, userId).catch(() => {});

    // 自动发放完成章节积分（不阻塞响应）
    awardPointsForAction(userId, 'save_chapter', cid).catch(() => {});

    // 记录创作活动
    const newWordCount = (updateData.wordCount as number) || 0;
    const addedWords = Math.max(0, newWordCount - (chapter.wordCount || 0));
    await db.insert(creationActivities).values({
      userId,
      workId,
      chapterId: cid,
      type: 'write',
      title: addedWords > 0 ? `写了 ${addedWords} 字` : '保存了章节',
      metadata: {
        wordCount: newWordCount,
        addedWords,
        action: 'update_chapter',
      },
    });
  }

  // 重新计算作品字数
  const allChapters = await db.select().from(chapters).where(eq(chapters.workId, workId));
  const totalWords = allChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  await db.update(works).set({
    wordCount: totalWords,
    updatedAt: new Date(),
  }).where(eq(works.id, workId));

  const [updated] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  return c.json(updated);
});

// DELETE /api/works/:id/chapters/:cid
worksRouter.delete('/:id/chapters/:cid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  await db.delete(chapterVersions).where(eq(chapterVersions.chapterId, cid));
  await db.delete(chapterSummaries).where(eq(chapterSummaries.chapterId, cid));
  await db.delete(aiCorrections).where(eq(aiCorrections.chapterId, cid));
  await db.delete(chapters).where(eq(chapters.id, cid));

  // 重新计算
  const allChapters = await db.select().from(chapters).where(eq(chapters.workId, workId));
  const totalWords = allChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  await db.update(works).set({
    chapterCount: allChapters.length,
    wordCount: totalWords,
    updatedAt: new Date(),
  }).where(eq(works.id, workId));

  return c.json({ success: true });
});

// GET /api/works/:id/export?format=txt — 导出作品
worksRouter.get('/:id/export', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const format = c.req.query('format') || 'txt';

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const chList = await db.select().from(chapters)
    .where(eq(chapters.workId, workId))
    .orderBy(chapters.orderIndex);

  if (format === 'txt') {
    let text = `《${work.title}》\n`;
    text += `作者：${work.userId}\n`;
    text += `题材：${work.genre}\n`;
    text += `总字数：${work.wordCount || 0}\n`;
    text += `总章节：${chList.length}\n`;
    text += '\n' + '='.repeat(40) + '\n\n';

    chList.forEach(ch => {
      text += `\n${ch.title}\n`;
      text += '-'.repeat(ch.title.length * 2) + '\n\n';
      text += htmlToText(ch.content || '') + '\n\n';
    });

    const asciiTitle = work.title.replace(/[^\x00-\x7F]/g, '');
    const safeFilename = asciiTitle || 'export';
    return c.body(text, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}.txt"; filename*=UTF-8''${encodeURIComponent(work.title)}.txt`,
    });
  }

  return c.json({ error: '不支持的格式' }, 400);
});

// GET /api/works/:id/chapters/:cid/export?format=txt — 导出章节
worksRouter.get('/:id/chapters/:cid/export', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));
  const format = c.req.query('format') || 'txt';

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId || work.deletedAt) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  if (format === 'txt') {
    let text = `《${work.title}》\n`;
    text += `${chapter.title}\n`;
    text += '='.repeat(40) + '\n\n';
    text += htmlToText(chapter.content || '');

    const asciiWorkTitle = work.title.replace(/[^\x00-\x7F]/g, '');
    const asciiChapterTitle = chapter.title.replace(/[^\x00-\x7F]/g, '');
    const safeFilename = `${asciiWorkTitle || 'work'}_${asciiChapterTitle || 'chapter'}`;
    const fullFilename = `${work.title}_${chapter.title}.txt`;
    return c.body(text, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFilename}.txt"; filename*=UTF-8''${encodeURIComponent(fullFilename)}`,
    });
  }

  return c.json({ error: '不支持的格式' }, 400);
});

// --- helpers ---

function htmlToText(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '$1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '$1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '$1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatWordCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万字';
  if (n >= 1000) return (n / 1000).toFixed(1) + '千字';
  return n + '字';
}

// ========== 章节历史版本 ==========

const versionSchema = z.object({
  content: z.string().default(''),
  wordCount: z.number().default(0),
  source: z.enum(['auto', 'manual', 'local']).default('auto'),
});

// GET /api/works/:id/chapters/:cid/versions
worksRouter.get('/:id/chapters/:cid/versions', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const list = await db.select().from(chapterVersions)
    .where(eq(chapterVersions.chapterId, cid))
    .orderBy(desc(chapterVersions.createdAt));

  return c.json(list.map(v => ({
    id: v.id,
    wordCount: v.wordCount,
    source: v.source,
    createdAt: v.createdAt,
  })));
});

// POST /api/works/:id/chapters/:cid/versions — 保存新版本
worksRouter.post('/:id/chapters/:cid/versions', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const body = await c.req.json();
  const parsed = versionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误' }, 400);
  }

  const { content, wordCount, source } = parsed.data;

  // 检查是否已有相同内容且间隔小于 30 秒的版本
  const [recent] = await db.select().from(chapterVersions)
    .where(eq(chapterVersions.chapterId, cid))
    .orderBy(desc(chapterVersions.createdAt))
    .limit(1);

  if (recent && recent.content === content) {
    return c.json({ id: recent.id, skipped: true, reason: '内容未变化' });
  }

  // 创建新版本
  const [result] = await db.insert(chapterVersions)
    .values({ chapterId: cid, content, wordCount, source })
    .returning();

  // 清理旧版本，只保留最近 20 条
  const allVersions = await db.select({ id: chapterVersions.id }).from(chapterVersions)
    .where(eq(chapterVersions.chapterId, cid))
    .orderBy(desc(chapterVersions.createdAt));

  if (allVersions.length > 20) {
    const toDelete = allVersions.slice(20);
    await Promise.all(toDelete.map(v =>
      db.delete(chapterVersions).where(eq(chapterVersions.id, v.id))
    ));
  }

  return c.json({ id: result.id, created: true });
});

// GET /api/works/:id/chapters/:cid/versions/:vid
worksRouter.get('/:id/chapters/:cid/versions/:vid', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));
  const vid = parseInt(c.req.param('vid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const [version] = await db.select().from(chapterVersions).where(eq(chapterVersions.id, vid)).limit(1);
  if (!version || version.chapterId !== cid) {
    return c.json({ error: '版本不存在' }, 404);
  }

  return c.json(version);
});

// POST /api/works/:id/chapters/:cid/versions/:vid/restore
worksRouter.post('/:id/chapters/:cid/versions/:vid/restore', async (c) => {
  const userId = c.get('userId');
  const workId = parseInt(c.req.param('id'));
  const cid = parseInt(c.req.param('cid'));
  const vid = parseInt(c.req.param('vid'));

  const [work] = await db.select().from(works).where(eq(works.id, workId)).limit(1);
  if (!work || work.userId !== userId) {
    return c.json({ error: '作品不存在' }, 404);
  }

  const [chapter] = await db.select().from(chapters).where(eq(chapters.id, cid)).limit(1);
  if (!chapter || chapter.workId !== workId) {
    return c.json({ error: '章节不存在' }, 404);
  }

  const [version] = await db.select().from(chapterVersions).where(eq(chapterVersions.id, vid)).limit(1);
  if (!version || version.chapterId !== cid) {
    return c.json({ error: '版本不存在' }, 404);
  }

  // 恢复章节内容
  await db.update(chapters)
    .set({
      content: version.content,
      wordCount: version.wordCount,
      updatedAt: new Date(),
    })
    .where(eq(chapters.id, cid));

  // 重新计算作品字数
  const allChapters = await db.select().from(chapters).where(eq(chapters.workId, workId));
  const totalWords = allChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

  await db.update(works)
    .set({ wordCount: totalWords, updatedAt: new Date() })
    .where(eq(works.id, workId));

  return c.json({ success: true, wordCount: version.wordCount });
});

function formatTime(d: Date | null): string {
  if (!d) return '未知';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN');
}

// POST /api/works/import — 导入作品（txt）
const importSchema = z.object({
  title: z.string().min(1).max(15),
  chapters: z.array(z.object({
    title: z.string().min(1),
    content: z.string().default(''),
  })).min(1),
  genre: z.string().default('未分类'),
  emoji: z.string().default('📖'),
  gradient: z.string().default('135deg, #1e3a5f, #0f2744'),
});

worksRouter.post('/import', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const { title, chapters: chapterList, genre, emoji, gradient } = parsed.data;

  const [work] = await db.insert(works).values({
    userId,
    title,
    genre,
    status: 'unfinished',
    tags: [],
    emoji,
    gradient,
  }).returning();

  const wordCounts = await Promise.all(chapterList.map(async (ch, i) => {
    const wordCount = ch.content.replace(/\s/g, '').length;
    await db.insert(chapters).values({
      workId: work.id,
      title: ch.title.slice(0, 100),
      content: ch.content,
      wordCount,
      orderIndex: i,
    });
    return wordCount;
  }));
  const totalWords = wordCounts.reduce((sum, w) => sum + w, 0);

  await db.update(works).set({
    chapterCount: chapterList.length,
    wordCount: totalWords,
  }).where(eq(works.id, work.id));

  return c.json({
    id: work.id,
    title: work.title,
    chapterCount: chapterList.length,
    wordCount: totalWords,
  });
});

export default worksRouter;
