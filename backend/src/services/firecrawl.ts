// firecrawl.ts — Firecrawl API 封装（搜索 + 抓取 + 深度研究）

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

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

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
  };
}

/** 搜索网络资料（返回短摘要列表） */
export async function firecrawlSearch(query: string, limit = 5): Promise<FirecrawlSearchResult[]> {
  if (!FIRECRAWL_API_KEY) {
    console.warn('[firecrawl] FIRECRAWL_API_KEY 未配置，返回空结果');
    return [];
  }

  try {
    const res = await fetch(`${FIRECRAWL_BASE_URL}/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, limit }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[firecrawl] search 失败:', res.status, err);
      return [];
    }

    const data = (await res.json()) as { data?: FirecrawlSearchResult[] };
    const results = data.data || [];
    console.log(`[firecrawl] search "${query}" → ${results.length} 条结果`);
    return results;
  } catch (err) {
    console.error('[firecrawl] search 异常:', err);
    return [];
  }
}

/** 抓取单个网页（返回 markdown） */
export async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResult | null> {
  if (!FIRECRAWL_API_KEY) {
    console.warn('[firecrawl] FIRECRAWL_API_KEY 未配置，返回空');
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

/** 深度研究：搜索 + 抓取 top k 结果 + LLM 总结 */
export async function firecrawlSearchAndScrape(query: string, k = 3): Promise<string> {
  if (!FIRECRAWL_API_KEY) {
    console.warn('[firecrawl] FIRECRAWL_API_KEY 未配置');
    return `[firecrawl 未配置] 无法搜索 "${query}"`;
  }

  const searchResults = await firecrawlSearch(query, k);
  if (searchResults.length === 0) {
    return `未找到与 "${query}" 相关的网络资料。`;
  }

  const scraped: string[] = [];
  for (const item of searchResults.slice(0, k)) {
    const page = await firecrawlScrape(item.url);
    if (page?.markdown) {
      const excerpt = page.markdown.slice(0, 3000);
      scraped.push(`【${item.title}】\n来源：${item.url}\n${excerpt}\n`);
    }
  }

  return scraped.join('\n---\n') || '抓取内容为空。';
}
