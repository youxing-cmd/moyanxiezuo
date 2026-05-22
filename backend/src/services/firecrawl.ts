// firecrawl.ts — Firecrawl API 封装（搜索 + 抓取 + 深度研究）
// 改进：URL 质量过滤 / 来源结构化 / 内存缓存 / 无 key 降级

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const searchCache = new Map<string, { ts: number; data: FirecrawlSearchResult[] }>();

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description: string;
}

interface FirecrawlScrapeResult {
  url: string;
  markdown: string;
  metadata?: Record<string, unknown>;
}

export interface ResearchSource {
  title: string;
  url: string;
  excerpt: string;
}

export interface ResearchResult {
  content: string;
  sources: ResearchSource[];
  query: string;
  cached: boolean;
}

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
  };
}

/** 判断 URL 是否为低质量页面（首页、目录、搜索、广告等） */
function isLowQualityUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();

    // 排除常见目录/列表/搜索/标签页
    const badPatterns = [
      /^\/$/, // 首页
      /\/page\/\d+/, // 分页
      /\/category\//,
      /\/categories\//,
      /\/tag\//,
      /\/tags\//,
      /\/search/,
      /\/archive/,
      /\/author\//,
      /\/index\./,
      /\/list/,
      /\/catalog/,
      /\/directory/,
    ];
    if (badPatterns.some((p) => p.test(path))) return true;

    // 排除已知低质量域名后缀或子域名
    const host = u.hostname.toLowerCase();
    const badHosts = [
      'google.com',
      'baidu.com',
      'bing.com',
      'tieba.baidu.com',
      'weibo.com',
      'douyin.com',
      'bilibili.com',
    ];
    if (badHosts.some((h) => host.includes(h))) return true;

    // 知乎问题页质量低（广告/软广多），但 hostname 不含路径，需单独判断
    if (host === 'zhihu.com' && path.startsWith('/question')) return true;

    return false;
  } catch {
    return true;
  }
}

/** 内容质量初筛：标题或描述过短视为低信息密度 */
function isLowQualityResult(item: FirecrawlSearchResult): boolean {
  if (!item.title || item.title.length < 5) return true;
  if (!item.description || item.description.length < 10) return true;
  if (isLowQualityUrl(item.url)) return true;
  return false;
}

/** 搜索网络资料（返回短摘要列表） */
export async function firecrawlSearch(query: string, limit = 5): Promise<FirecrawlSearchResult[]> {
  if (!FIRECRAWL_API_KEY) {
    console.warn('[firecrawl] FIRECRAWL_API_KEY 未配置');
    return [];
  }

  // 缓存命中
  const cacheKey = `${query}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log(`[firecrawl] search cache hit "${query}" → ${cached.data.length} 条`);
    return cached.data;
  }

  try {
    const res = await fetch(`${FIRECRAWL_BASE_URL}/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, limit: limit * 2 }), // 多搜一些，过滤后保留 limit 条
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[firecrawl] search 失败:', res.status, err);
      return [];
    }

    const data = (await res.json()) as { data?: FirecrawlSearchResult[] };
    let results = (data.data || []).filter((r) => !isLowQualityResult(r));
    results = results.slice(0, limit);

    // 写入缓存
    searchCache.set(cacheKey, { ts: Date.now(), data: results });

    console.log(`[firecrawl] search "${query}" → ${results.length} 条结果（已过滤）`);
    return results;
  } catch (err) {
    console.error('[firecrawl] search 异常:', err);
    return [];
  }
}

/** 抓取单个网页（返回 markdown） */
export async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResult | null> {
  if (!FIRECRAWL_API_KEY) {
    console.warn('[firecrawl] FIRECRAWL_API_KEY 未配置');
    return null;
  }

  try {
    const res = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[firecrawl] scrape 失败:', res.status, err);
      return null;
    }

    const data = (await res.json()) as { data?: FirecrawlScrapeResult };
    const result = data.data || null;
    if (result) {
      console.log(`[firecrawl] scrape "${url}" → ${result.markdown?.length || 0} 字符`);
    }
    return result;
  } catch (err) {
    console.error('[firecrawl] scrape 异常:', err);
    return null;
  }
}

/** 深度研究：搜索 + 抓取 top k 结果 + 结构化来源 */
export async function firecrawlSearchAndScrape(query: string, k = 3): Promise<ResearchResult> {
  // Mock 模式：不调用真实 Firecrawl
  if (process.env.MOCK_FIRECRAWL === 'true') {
    const { getMockFirecrawlResearch } = await import('../test/mocks/firecrawl.js');
    return {
      content: getMockFirecrawlResearch(),
      sources: [],
      query,
      cached: false,
    };
  }

  if (!FIRECRAWL_API_KEY) {
    return {
      content: `[未配置联网搜索]\n当前未配置 FIRECRAWL_API_KEY，无法搜索 "${query}"。\n请配置后重试，或手动提供参考材料。`,
      sources: [],
      query,
      cached: false,
    };
  }

  const searchResults = await firecrawlSearch(query, k);
  if (searchResults.length === 0) {
    return {
      content: `未找到与 "${query}" 相关的网络资料。`,
      sources: [],
      query,
      cached: false,
    };
  }

  const sources: ResearchSource[] = [];
  const scraped: string[] = [];

  for (const item of searchResults.slice(0, k)) {
    const page = await firecrawlScrape(item.url);
    if (page?.markdown) {
      const excerpt = page.markdown.slice(0, 3000);
      sources.push({ title: item.title, url: item.url, excerpt: excerpt.slice(0, 500) });
      scraped.push(`【资料来源：${item.title}】\nURL：${item.url}\n\n${excerpt}\n`);
    }
  }

  return {
    content: scraped.join('\n---\n') || '抓取内容为空。',
    sources,
    query,
    cached: false,
  };
}
