import { callLLM, type ModelConfig } from './llm.js';
import { db } from '../db/index.js';
import { trendWindVane } from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import { getGroupedHotTitles } from './dailyHotApi.js';

const CATEGORIES = ['platform', 'maleHot', 'maleNew', 'femaleHot', 'femaleNew', 'jiuzhou'] as const;

function getSystemModelConfig(envVar: string): ModelConfig {
  const value = process.env[envVar] || '';
  if (!value) {
    // 回退到默认配置
    return {
      provider: 'openai-compatible',
      baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: process.env.AI_API_KEY || '',
      modelName: process.env.AI_MODEL || 'gpt-4o-mini',
    };
  }

  // 完整格式：provider:baseUrl:apiKey:modelName
  if (value.includes(':')) {
    const parts = value.split(':');
    if (parts.length >= 4) {
      const [provider, baseUrl, apiKey, ...modelParts] = parts;
      return {
        provider,
        baseUrl,
        apiKey,
        modelName: modelParts.join(':'), // model name 本身可能含冒号
      };
    }
  }

  // 简单格式：只指定 model name，复用默认 baseUrl/apiKey
  return {
    provider: 'openai-compatible',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY || '',
    modelName: value,
  };
}

function extractContent(data: any): string {
  // OpenAI 兼容格式
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  // Anthropic 原生格式
  if (Array.isArray(data.content) && data.content[0]?.text) {
    return data.content[0].text;
  }
  // 兜底
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

/** 生成风向分析 prompt */
async function buildWindVanePrompt(category: string, dateKey: string): Promise<Array<{ role: string; content: string }>> {
  const grouped = await getGroupedHotTitles(15);
  const sourceLabels: Record<string, string> = {
    weibo: '微博热搜',
    zhihu: '知乎热榜',
    douyin: '抖音热点',
    weread: '微信读书飙升榜',
    bilibili: 'B站热门',
    baidu: '百度热搜',
  };

  let hotDataText = '';
  for (const [source, titles] of Object.entries(grouped)) {
    const label = sourceLabels[source] || source;
    if (titles.length > 0) {
      hotDataText += `\n【${label}】\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
    }
  }

  const systemPrompt = `你是中文网文行业资深分析师。请根据以下当天全网热点数据，分析当前网文创作风向。

【分析日期】${dateKey}
【目标赛道】${getCategoryLabel(category)}
【当日热点数据】（按来源分组）${hotDataText}

请严格输出以下 JSON，不要有任何其他文字：
{
  "title": "风向标题",
  "tags": ["标签1", "标签2", "标签3"],
  "summary": "一句话总结当前趋势与网文创作的关联",
  "suggestion": "创作建议（①②③）",
  "avoid": "避坑指南（①②③）",
  "novelGenreTrends": [{"genre": "题材名", "heat": 0.0-1.0, "reason": "为什么这个题材在当下有热度"}],
  "emotionTone": {"primary": "主要情绪", "secondary": "次要情绪", "implication": "对创作的影响"},
  "audienceFocus": ["人群标签"],
  "trendingHooks": [{"hook": "热点钩子", "windowDays": 3, "exploitAngle": "怎么蹭这个热点写小说"}]
}

约束：
1. tags 必须从热点中提炼的真实趋势词，不是泛泛而谈
2. summary 要具体到"什么题材+什么元素"在上升，拒绝空话
3. suggestion 要给出可操作的创作方向，每条建议必须基于真实热点
4. avoid 要指出当前已经过饱和或读者疲劳的套路
5. 拒绝涉政/民族/意识形态热点直接转化为剧情
6. 映射到小说题材时必须基于真实数据，禁止编造
7. 所有内容使用中文（简体）`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析 ${getCategoryLabel(category)} 的创作风向，输出严格 JSON。` },
  ];
}

/** 解析 AI 返回的 JSON */
function parseWindVaneJson(raw: string): any {
  // 尝试直接解析
  try {
    return JSON.parse(raw);
  } catch {
    // 尝试提取 ```json ... ``` 代码块
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // ignore
      }
    }
    // 尝试提取第一个 { ... }
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

/** 为单个 category 生成风向分析 */
export async function generateWindVaneForCategory(category: string): Promise<void> {
  const dateKey = getDateKey();
  const modelConfig = getSystemModelConfig('TREND_WINDVANE_MODEL');

  console.log(`[trendsAnalysis] 生成 ${category} 风向分析，模型: ${modelConfig.modelName}`);

  try {
    const messages = await buildWindVanePrompt(category, dateKey);
    const startTime = Date.now();

    const res = await callLLM(messages, false, modelConfig);
    const data = await res.json();
    const rawContent = extractContent(data);
    const parsed = parseWindVaneJson(rawContent);

    if (!parsed || !parsed.title || !parsed.summary) {
      throw new Error(`AI 返回格式异常: ${rawContent.slice(0, 200)}`);
    }

    // 写入数据库
    await db.insert(trendWindVane).values({
      category,
      dateKey,
      title: parsed.title,
      tags: parsed.tags || [],
      summary: parsed.summary,
      suggestion: parsed.suggestion || '',
      avoid: parsed.avoid || '',
      rawAnalysis: {
        novelGenreTrends: parsed.novelGenreTrends || [],
        emotionTone: parsed.emotionTone || { primary: '', secondary: '', implication: '' },
        audienceFocus: parsed.audienceFocus || [],
        trendingHooks: parsed.trendingHooks || [],
      },
      modelUsed: modelConfig.modelName,
    });

    console.log(`[trendsAnalysis] ${category} 风向分析生成完成，耗时 ${Date.now() - startTime}ms`);
  } catch (err) {
    console.error(`[trendsAnalysis] ${category} 风向分析失败:`, err);
    throw err;
  }
}

/** 为所有 category 生成风向分析 */
export async function generateWindVaneForAllCategories(): Promise<void> {
  for (const category of CATEGORIES) {
    try {
      await generateWindVaneForCategory(category);
    } catch (err) {
      console.error(`[trendsAnalysis] ${category} 失败，继续下一个:`, err);
      // 单个 category 失败不阻断其他
    }
  }
}

/** 从数据库读取风向分析 */
export async function getWindVane(category: string, dateKey: string): Promise<{ title: string; tags: string[]; summary: string; suggestion: string; avoid: string } | null> {
  const [row] = await db
    .select()
    .from(trendWindVane)
    .where(and(eq(trendWindVane.category, category), eq(trendWindVane.dateKey, dateKey)))
    .orderBy(trendWindVane.generatedAt)
    .limit(1);

  if (!row) return null;

  return {
    title: row.title,
    tags: row.tags as string[],
    summary: row.summary,
    suggestion: row.suggestion,
    avoid: row.avoid,
  };
}

/** 检查今天是否已生成过风向 */
export async function hasTodayWindVane(): Promise<boolean> {
  const today = getDateKey();
  const [row] = await db
    .select()
    .from(trendWindVane)
    .where(gte(trendWindVane.dateKey, today))
    .limit(1);
  return !!row;
}
