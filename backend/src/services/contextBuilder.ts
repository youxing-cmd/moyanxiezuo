// ContextBuilder — 按任务类型组装作品上下文
// 职责：查库 → 拼接 prompt → 返回结构化上下文
// 不处理：模型选择、积分扣减、流式响应、上下文截断（由调用方按模型预算执行）

import { db } from '../db/index.js';
import { works, chapters, outlines, characters, chapterSummaries, workStyleDNA } from '../db/schema.js';
import { eq, and, desc, lt } from 'drizzle-orm';
import { formatStyleDNAPrompt } from './styleDNA.js';

export type TaskType = 'chat' | 'continue' | 'polish' | 'outline' | 'chapter_review' | 'character_check';

export interface BuildContextOptions {
  userId: number;
  workId: number;
  chapterId?: number;
  taskType: TaskType;
  selectedText?: string;   // 润色/改写时传入的选中文字
  currentText?: string;    // 续写时传入的当前章内容
  extra?: Record<string, unknown>;
}

export interface ContextResult {
  systemContext: string;   // 作品设定约束（system message 用）
  userContext?: string;    // 任务特定的 user prompt 补充
  usedTables: string[];    // 追踪调试
}

// ========== 内部：基础作品上下文（所有任务共用） ==========
async function buildBaseContext(workId: number, userId: number): Promise<string> {
  const [work] = await db.select().from(works)
    .where(and(eq(works.id, workId), eq(works.userId, userId)))
    .limit(1);
  if (!work) return '';

  const [outline] = await db.select().from(outlines).where(eq(outlines.workId, workId)).limit(1);
  const chars = await db.select().from(characters).where(eq(characters.workId, workId));

  const channelMap: Record<string, string> = {
    male: '男频（侧重热血升级、权谋冒险、力量成长；主角以男性视角展开，情感线服务主线）',
    female: '女频（侧重情感细腻、人物关系、内心成长；主角以女性视角展开，情感与事业并重）',
  };

  const perspectiveMap: Record<string, string> = {
    first: '第一人称（严格使用"我"叙述，禁止切换为第三人称）',
    third: '第三人称（严格使用"他/她"叙述，禁止切换为第一人称）',
  };

  let prompt = `【作品设定约束】以下设定必须严格遵守，AI生成内容不得与之冲突。\n\n`;
  prompt += `- 作品名称：《${work.title}》\n`;
  prompt += `- 频道：${channelMap[work.channel] || work.channel}\n`;
  prompt += `- 叙事视角：${perspectiveMap[work.perspective] || work.perspective}\n`;
  prompt += `- 题材：${work.genre || '未指定'}\n`;

  if (work.tags && Array.isArray(work.tags) && work.tags.length > 0) {
    prompt += `- 标签：${work.tags.join('、')}\n`;
  }

  if (outline?.content) {
    const outlineText = outline.content.length > 800 ? outline.content.slice(0, 800) + '...' : outline.content;
    prompt += `\n【总纲概要】\n${outlineText}\n`;
  }

  if (chars.length > 0) {
    prompt += `\n【角色设定】\n`;
    for (const c of chars.slice(0, 8)) {
      const roleLabel = c.role === 'protagonist' ? '主角' : c.role === 'antagonist' ? '反派' : '角色';
      const contentPreview = c.content.length > 100 ? c.content.slice(0, 100) + '...' : c.content;
      prompt += `- ${roleLabel}「${c.name}」：${contentPreview}\n`;
    }
  }

  prompt += `\n【核心约束】\n`;
  prompt += `1. 语言硬性要求：无论用户输入什么语言，所有输出必须使用中文（简体），禁止出现任何英文单词、日文、韩文或其他语言。角色名、地名、功法名等专有名词也必须用中文。\n`;
  prompt += `2. 人称锁定：严格保持当前叙事视角，禁止中途切换人称。\n`;
  prompt += `3. 频道风格：${work.channel === 'female' ? '女频侧重情感张力和人物关系，避免过度暴力或粗鄙描写。' : '男频侧重冲突升级和打脸爽感，避免过度甜腻或家长里短。'}\n`;
  if (outline?.content) {
    prompt += `4. 总纲遵循：所有生成内容必须与总纲剧情走向一致，不偏离主线设定，不创造与总纲矛盾的剧情。\n`;
  }
  if (chars.length > 0) {
    prompt += `5. 角色一致性：已有角色的行为必须符合其性格设定，不创造与设定冲突的新属性，不出现男女性别错乱。\n`;
  }
  prompt += `6. 世界观一致：不新增未在总纲或设定中铺垫的世界规则。\n`;

  // 注入风格 DNA（如果已提取）
  const [dna] = await db.select().from(workStyleDNA).where(eq(workStyleDNA.workId, workId)).limit(1);
  if (dna && dna.sampleSize > 0) {
    prompt += formatStyleDNAPrompt({
      avgSentenceLength: dna.avgSentenceLength ?? 0,
      shortSentenceRatio: dna.shortSentenceRatio ?? 0,
      longSentenceRatio: dna.longSentenceRatio ?? 0,
      dialogueRatio: dna.dialogueRatio ?? 0,
      avgParagraphLength: dna.avgParagraphLength ?? 0,
      commonPhrases: dna.commonPhrases ?? [],
      signatureWords: dna.signatureWords ?? [],
      pacingPattern: dna.pacingPattern ?? [],
      sampleSize: dna.sampleSize,
    });
  }

  return prompt;
}

// ========== 续写上下文 ==========
async function buildContinueContext(
  workId: number,
  chapterId: number,
  currentText: string,
  userId: number,
): Promise<{ systemContext: string; userContext: string }> {
  const systemContext = await buildBaseContext(workId, userId);

  let userContext = '';
  const [currentChapter] = await db.select().from(chapters)
    .where(and(eq(chapters.id, chapterId), eq(chapters.workId, workId)))
    .limit(1);

  if (currentChapter) {
    const prevChapter = await db.select().from(chapters)
      .where(and(eq(chapters.workId, workId), lt(chapters.orderIndex, currentChapter.orderIndex)))
      .orderBy(desc(chapters.orderIndex))
      .limit(1);
    if (prevChapter.length > 0) {
      const prevTail = prevChapter[0].content ? prevChapter[0].content.slice(-2000) : '';
      if (prevTail) {
        userContext += `=== 上一章结尾 ===\n${prevTail}\n\n`;
      }
    }

    // L2：取最近 3 章摘要，提供近期叙事脉络
    const recentSummaries = await db.select({
      title: chapters.title,
      summary: chapterSummaries.summary,
      keyEvents: chapterSummaries.keyEvents,
      openHooks: chapterSummaries.openHooks,
    }).from(chapterSummaries)
      .innerJoin(chapters, eq(chapters.id, chapterSummaries.chapterId))
      .where(and(
        eq(chapters.workId, workId),
        lt(chapters.orderIndex, currentChapter.orderIndex),
      ))
      .orderBy(desc(chapters.orderIndex))
      .limit(3);

    if (recentSummaries.length > 0) {
      userContext += `=== 近期章节脉络 ===\n`;
      for (const s of recentSummaries.reverse()) {
        userContext += `【${s.title || '未命名'}】${s.summary}\n`;
        if (s.keyEvents?.length) userContext += `  关键事件：${s.keyEvents.join('、')}\n`;
        if (s.openHooks?.length) userContext += `  未回收钩子：${s.openHooks.join('、')}\n`;
      }
      userContext += `\n`;
    }
  }

  userContext += `=== 当前章节 ===\n${currentText}`;

  return { systemContext, userContext };
}

// ========== 统一入口 ==========
export async function buildContext(options: BuildContextOptions): Promise<ContextResult> {
  const { userId, workId, chapterId, taskType, selectedText, currentText } = options;

  const usedTables: string[] = ['works'];
  const systemContext = await buildBaseContext(workId, userId);
  if (systemContext) usedTables.push('outlines', 'characters');

  let userContext: string | undefined;

  switch (taskType) {
    case 'continue': {
      if (chapterId && currentText) {
        const ctx = await buildContinueContext(workId, chapterId, currentText, userId);
        userContext = ctx.userContext;
        usedTables.push('chapters');
      }
      break;
    }
    case 'chapter_review': {
      if (chapterId && currentText) {
        userContext = `=== 当前章节 ===\n${currentText}`;
        usedTables.push('chapters');
      }
      break;
    }
    case 'polish':
    case 'chat':
    case 'outline':
    case 'character_check':
    default:
      // 基础上下文即可；polish 等后续按需扩展
      break;
  }

  return { systemContext, userContext, usedTables };
}

// ========== 兼容旧接口（逐步迁移） ==========
export async function buildWorkContextPrompt(workId: number, userId: number): Promise<string | null> {
  const ctx = await buildBaseContext(workId, userId);
  return ctx || null;
}
