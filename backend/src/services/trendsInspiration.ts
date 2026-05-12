import { callLLM, type ModelConfig } from './llm.js';
import { db } from '../db/index.js';
import { trendWindVane, trendBookAnalysis } from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import { getAggregatedHotTitles } from './dailyHotApi.js';

const DAILY_LIMIT = 6;

function getSystemModelConfig(envVar: string): ModelConfig {
  const value = process.env[envVar] || '';
  if (!value) {
    return {
      provider: 'openai-compatible',
      baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.AI_API_KEY || '',
      modelName: process.env.AI_MODEL || 'gpt-4o-mini',
    };
  }

  if (value.includes(':')) {
    const parts = value.split(':');
    if (parts.length >= 4) {
      const [provider, baseUrl, apiKey, ...modelParts] = parts;
      return {
        provider,
        baseUrl,
        apiKey,
        modelName: modelParts.join(':'),
      };
    }
  }

  return {
    provider: 'openai-compatible',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || '',
    modelName: value,
  };
}

function extractContent(data: any): string {
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (Array.isArray(data.content) && data.content[0]?.text) {
    return data.content[0].text;
  }
  return String(data || '');
}

function getDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    platform: '全网热搜',
    maleHot: '男频热度榜',
    maleNew: '男频新书榜',
    femaleHot: '女频热度榜',
    femaleNew: '女频新书榜',
    jiuzhou: '九州短篇',
  };
  return map[category] || category;
}

function parseJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // ignore
      }
    }
    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch {
        // ignore
      }
    }
  }
  return null;
}

/** 获取当日已生成的灵感标题（用于去重） */
async function getExistingTitles(category: string, dateKey: string): Promise<string[]> {
  const rows = await db
    .select({ title: trendBookAnalysis.title })
    .from(trendBookAnalysis)
    .where(
      and(
        eq(trendBookAnalysis.category, category),
        eq(trendBookAnalysis.dateKey, dateKey),
        eq(trendBookAnalysis.seedId, 'auto'),
      ),
    );
  return rows.map((r) => r.title);
}

/** 检查当日是否已达生成上限 */
export async function checkGenerationLimit(category: string): Promise<{ ok: boolean; current: number; limit: number }> {
  const dateKey = getDateKey();
  const rows = await db
    .select()
    .from(trendBookAnalysis)
    .where(
      and(
        eq(trendBookAnalysis.category, category),
        eq(trendBookAnalysis.dateKey, dateKey),
        eq(trendBookAnalysis.seedId, 'auto'),
      ),
    );
  return { ok: rows.length < DAILY_LIMIT, current: rows.length, limit: DAILY_LIMIT };
}

/** 获取当日风向（直接从数据库查询，避免循环引用） */
async function getTodayWindVane(category: string): Promise<{ title: string; summary: string; tags: string[] } | null> {
  const dateKey = getDateKey();
  const [row] = await db
    .select()
    .from(trendWindVane)
    .where(and(eq(trendWindVane.category, category), eq(trendWindVane.dateKey, dateKey)))
    .limit(1);

  if (!row) return null;
  return {
    title: row.title,
    summary: row.summary,
    tags: row.tags as string[],
  };
}

/** 构建完整生成的 prompt */
function buildInspirationPrompt(
  category: string,
  windVane: { title: string; summary: string; tags: string[] },
  hotTitles: string[],
  existingTitles: string[],
): Array<{ role: string; content: string }> {
  const dateKey = getDateKey();
  const existingHint = existingTitles.length > 0
    ? `\n【已生成书名（请勿重复）】\n${existingTitles.map((t) => `- ${t}`).join('\n')}`
    : '';

  const systemPrompt = `你是顶级网文策划。请根据以下风向分析和热点数据，生成 2 个爆款小说灵感。

【日期】${dateKey}
【赛道】${getCategoryLabel(category)}
【风向标题】${windVane.title}
【风向总结】${windVane.summary}
【趋势标签】${windVane.tags.join('、')}
【相关热点】
${hotTitles.slice(0, 30).map((t, i) => `${i + 1}. ${t}`).join('\n')}${existingHint}

请严格输出以下 JSON，不要有任何其他文字：
{
  "inspirations": [
    {
      "title": "小说书名",
      "hotSpot": "热点关联：这个创意蹭了哪个热点，为什么能火（50字内）",
      "goldenFinger": "金手指设定：主角的独特能力或优势，要具体、有记忆点（50字内）",
      "coreHook": "核心爽点：①...②...③...④...（每个15字内，有递进关系）",
      "character": "人设：主角性格+关键配角关系，必须有矛盾性（80字内）",
      "firstChapter": "第一章钩子：具体场景+冲突+悬念，让读者必须看第二章（100字内）",
      "outline": "三幕剧大纲：起承转合，200字内"
    }
  ]
}

约束：
1. 每个灵感必须明确关联至少 1 个真实热点，说明关联逻辑
2. 书名有平台爆款感，带冒号或逗号增强信息密度，禁止出现真实人名
3. 金手指要具体，避免"系统""签到"等过于泛化的词
4. 爽点设计必须有递进关系，不是简单并列
5. 人设必须有矛盾性，避免脸谱化
6. 第一章必须直接从冲突切入，拒绝铺垫和背景介绍
7. 所有内容使用中文（简体）`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请为 ${getCategoryLabel(category)} 生成 2 个爆款小说灵感，输出严格 JSON。` },
  ];
}

/** 构建单点切入的 prompt */
function buildSeedPrompt(
  category: string,
  seedType: string,
  seedValue: string,
  windVane: { title: string; summary: string; tags: string[] },
): Array<{ role: string; content: string }> {
  const seedLabels: Record<string, string> = {
    hook: '开篇钩子',
    goldenFinger: '金手指',
    character: '人设',
    coreHook: '核心爽点',
    hotSpot: '热点关联',
  };

  const systemPrompt = `你是顶级网文策划。用户已经选定了一个核心种子，请围绕这个种子反向构建完整故事骨架。

【赛道】${getCategoryLabel(category)}
【风向】${windVane.title} — ${windVane.summary}
【用户选定的种子】${seedLabels[seedType] || seedType} = ${seedValue}

请严格输出以下 JSON，不要有任何其他文字：
{
  "title": "小说书名",
  "hotSpot": "热点关联（50字内）",
  "goldenFinger": "金手指设定（50字内）。注意：如果种子本身就是金手指，请深化其限制条件和副作用；如果不是，请设计与种子互为因果的金手指",
  "coreHook": "核心爽点：①...②...③...④...（必须围绕种子的限制展开）",
  "character": "人设（80字内）：必须有'配得上这个种子'的特质，性格要有矛盾性",
  "firstChapter": "第一章钩子（100字内）：必须突出种子的核心特征或限制条件，直接冲突切入",
  "outline": "三幕剧大纲（200字内）"
}

约束：
1. 种子必须成为故事的核心驱动力，不能弱化或偏离
2. 如果种子是开篇钩子，金手指必须在第一章就呼应这个钩子
3. 如果种子是金手指，必须在第一章就亮出核心限制条件
4. 如果种子是人设，金手指必须匹配这个人设的特质
5. 反转设计必须围绕种子的限制或特质展开
6. 所有内容使用中文（简体）`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请围绕"${seedLabels[seedType] || seedType}: ${seedValue}"生成完整故事骨架，输出严格 JSON。` },
  ];
}

/** 解析灵感 JSON */
function parseInspirations(raw: string): Array<{
  title: string;
  hotSpot: string;
  goldenFinger: string;
  coreHook: string;
  character: string;
  firstChapter: string;
  outline: string;
}> {
  const parsed = parseJson(raw);
  if (!parsed || !Array.isArray(parsed.inspirations)) {
    throw new Error('AI 返回格式异常');
  }
  return parsed.inspirations.map((insp: any) => ({
    title: insp.title || '未命名',
    hotSpot: insp.hotSpot || '',
    goldenFinger: insp.goldenFinger || '',
    coreHook: insp.coreHook || '',
    character: insp.character || '',
    firstChapter: insp.firstChapter || '',
    outline: insp.outline || '',
  }));
}

/** 模式 A：完整生成（存库） */
export async function generateBookAnalysis(category: string): Promise<
  Array<{
    title: string;
    hotSpot: string;
    goldenFinger: string;
    coreHook: string;
    character: string;
    firstChapter: string;
    outline: string;
  }>
> {
  const dateKey = getDateKey();
  const limit = await checkGenerationLimit(category);
  if (!limit.ok) {
    throw new Error(`今日${getCategoryLabel(category)}灵感生成已达上限（${limit.limit}条）`);
  }

  const windVane = await getTodayWindVane(category);
  if (!windVane) {
    throw new Error('今日风向尚未生成，请稍后重试');
  }

  const hotTitles = await getAggregatedHotTitles(15);
  const existingTitles = await getExistingTitles(category, dateKey);
  const modelConfig = getSystemModelConfig('TREND_INSPIRATION_MODEL');

  console.log(`[trendsInspiration] 生成 ${category} 灵感，模型: ${modelConfig.modelName}`);

  const messages = buildInspirationPrompt(category, windVane, hotTitles, existingTitles);
  const startTime = Date.now();

  const res = await callLLM(messages, false, modelConfig);
  const data = await res.json();
  const rawContent = extractContent(data);
  const inspirations = parseInspirations(rawContent);

  // 写入数据库
  for (const insp of inspirations) {
    await db.insert(trendBookAnalysis).values({
      category,
      dateKey,
      seedId: 'auto',
      title: insp.title,
      hotSpot: insp.hotSpot,
      goldenFinger: insp.goldenFinger,
      coreHook: insp.coreHook,
      character: insp.character,
      firstChapter: insp.firstChapter,
      outline: insp.outline,
      modelUsed: modelConfig.modelName,
    });
  }

  console.log(`[trendsInspiration] ${category} 灵感生成完成，${inspirations.length} 条，耗时 ${Date.now() - startTime}ms`);
  return inspirations;
}

/** 模式 B：单点切入（不存库） */
export async function generateFromSeed(
  category: string,
  seedType: string,
  seedValue: string,
): Promise<{
  title: string;
  hotSpot: string;
  goldenFinger: string;
  coreHook: string;
  character: string;
  firstChapter: string;
  outline: string;
}> {
  const windVane = await getTodayWindVane(category);
  if (!windVane) {
    throw new Error('今日风向尚未生成，请稍后重试');
  }

  const modelConfig = getSystemModelConfig('TREND_INSPIRATION_MODEL');

  console.log(`[trendsInspiration] ${category} 单点切入: ${seedType}`);

  const messages = buildSeedPrompt(category, seedType, seedValue, windVane);
  const startTime = Date.now();

  const res = await callLLM(messages, false, modelConfig);
  const data = await res.json();
  const rawContent = extractContent(data);
  const parsed = parseJson(rawContent);

  if (!parsed || !parsed.title) {
    throw new Error(`AI 返回格式异常: ${rawContent.slice(0, 200)}`);
  }

  console.log(`[trendsInspiration] 单点切入完成，耗时 ${Date.now() - startTime}ms`);

  return {
    title: parsed.title || '未命名',
    hotSpot: parsed.hotSpot || '',
    goldenFinger: parsed.goldenFinger || '',
    coreHook: parsed.coreHook || '',
    character: parsed.character || '',
    firstChapter: parsed.firstChapter || '',
    outline: parsed.outline || '',
  };
}

/** 从数据库读取灵感 */
export async function getBookAnalysis(
  category: string,
  dateKey: string,
  limit = 3,
): Promise<Array<{
  title: string;
  hotSpot: string;
  goldenFinger: string;
  coreHook: string;
  character: string;
  firstChapter: string;
}>> {
  const rows = await db
    .select()
    .from(trendBookAnalysis)
    .where(
      and(
        eq(trendBookAnalysis.category, category),
        eq(trendBookAnalysis.dateKey, dateKey),
        eq(trendBookAnalysis.seedId, 'auto'),
      ),
    )
    .limit(limit);

  return rows.map((r) => ({
    title: r.title,
    hotSpot: r.hotSpot,
    goldenFinger: r.goldenFinger,
    coreHook: r.coreHook,
    character: r.character,
    firstChapter: r.firstChapter,
  }));
}
