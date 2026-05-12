import { db } from '../db/index.js';
import { trendHotData } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const DAILY_HOT_BASE_URL = process.env.DAILY_HOT_API_URL || 'http://localhost:6688';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟
const FALLBACK_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时降级兜底
const FETCH_TIMEOUT_MS = 10000;

// 精选数据源（与网文创作相关度最高）
// 注：weibo 在 DailyHotApi 当前实例上不可用（返回 HTML 错误页），已移除
export const RELEVANT_SOURCES = [
  'zhihu',      // 知乎热榜
  'douyin',     // 抖音热点
  'weread',     // 微信读书飙升榜
  'bilibili',   // B站热门
  'baidu',      // 百度热搜
] as const;

export type HotSource = (typeof RELEVANT_SOURCES)[number];

export interface HotItem {
  title: string;
  hot?: number | string;
  url?: string;
}

interface DailyHotResponse {
  code: number;
  data: HotItem[];
  updateTime?: string;
}

/** 获取单个源的热点数据，带 SQLite 缓存 */
export async function fetchSource(
  source: string,
  forceRefresh = false,
): Promise<HotItem[]> {
  // 1. 查缓存（30 分钟内）
  if (!forceRefresh) {
    const [cached] = await db
      .select()
      .from(trendHotData)
      .where(eq(trendHotData.source, source))
      .orderBy(desc(trendHotData.fetchedAt))
      .limit(1);

    if (cached && cached.fetchedAt) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return cached.rawData as HotItem[];
      }
    }
  }

  // 2. 调用 DailyHotApi
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${DAILY_HOT_BASE_URL}/${source}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`DailyHotApi ${source} HTTP ${res.status}`);
    }

    const json = (await res.json()) as DailyHotResponse;
    if (json.code !== 200) {
      throw new Error(`DailyHotApi ${source} code ${json.code}`);
    }

    // 数据清洗：标准化字段，过滤无效项
    const items = (json.data || [])
      .map((item: any) => ({
        title: item.title || item.word || item.desc || '',
        hot: item.hot || item.hotScore || '',
        url: item.url || item.mobileUrl || '',
      }))
      .filter((item: HotItem) => item.title); // 过滤掉没有 title 的

    // 3. 写入缓存
    await db.insert(trendHotData).values({
      source,
      rawData: items,
    });

    return items;
  } catch (err) {
    console.error(`[dailyHotApi] 获取 ${source} 失败:`, err);

    // 4. 降级：返回最近 24h 的缓存
    const [fallback] = await db
      .select()
      .from(trendHotData)
      .where(eq(trendHotData.source, source))
      .orderBy(desc(trendHotData.fetchedAt))
      .limit(1);

    if (fallback && fallback.fetchedAt) {
      const age = Date.now() - new Date(fallback.fetchedAt).getTime();
      if (age < FALLBACK_TTL_MS) {
        console.log(`[dailyHotApi] ${source} 使用 ${Math.round(age / 60000)} 分钟前缓存`);
        return fallback.rawData as HotItem[];
      }
    }

    return [];
  }
}

/** 获取所有相关源的热点数据 */
export async function fetchAllHotData(
  forceRefresh = false,
): Promise<Record<string, HotItem[]>> {
  const result: Record<string, HotItem[]> = {};
  for (const source of RELEVANT_SOURCES) {
    result[source] = await fetchSource(source, forceRefresh);
  }
  return result;
}

/** 获取聚合后的热搜标题列表（用于风向分析 prompt） */
export async function getAggregatedHotTitles(limitPerSource = 15): Promise<string[]> {
  const all: string[] = [];
  for (const source of RELEVANT_SOURCES) {
    const [cached] = await db
      .select()
      .from(trendHotData)
      .where(eq(trendHotData.source, source))
      .orderBy(desc(trendHotData.fetchedAt))
      .limit(1);

    if (cached) {
      const items = (cached.rawData as HotItem[]).slice(0, limitPerSource);
      all.push(...items.map((i) => i.title));
    }
  }
  return [...new Set(all)]; // 去重
}

/** 按来源分组获取热点标题（用于风向分析 prompt 的按源分组展示） */
export async function getGroupedHotTitles(limitPerSource = 15): Promise<Record<string, string[]>> {
  const grouped: Record<string, string[]> = {};
  for (const source of RELEVANT_SOURCES) {
    const [cached] = await db
      .select()
      .from(trendHotData)
      .where(eq(trendHotData.source, source))
      .orderBy(desc(trendHotData.fetchedAt))
      .limit(1);

    if (cached) {
      const items = (cached.rawData as HotItem[]).slice(0, limitPerSource);
      grouped[source] = items.map((i) => i.title);
    } else {
      grouped[source] = [];
    }
  }
  return grouped;
}
