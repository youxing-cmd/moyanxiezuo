import * as cheerio from 'cheerio';
import { chromium, type Browser, type Page } from 'playwright';
import opentype from 'opentype.js';
import fs from 'fs';
import { db } from '../db/index.js';
import { bookRankings } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// ========== 配置 ==========
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

const FETCH_TIMEOUT = 15000;
const RETRY_COUNT = 2;
const RETRY_DELAY_BASE = 2000;
const PLATFORM_DELAY_MS = 5000;
const CATEGORY_DELAY_MS = 3000;
const PLAYWRIGHT_TIMEOUT = 30000;

// 每个平台要抓取的分类配置
interface CrawlTarget {
  platform: string;
  category: string;
  url: string;
  usePlaywright: boolean;
}

const CRAWL_TARGETS: CrawlTarget[] = [
  // 番茄小说（SPA，需Playwright渲染）
  { platform: 'fanqie', category: 'aggregate', url: 'https://fanqienovel.com/rank/1_2_1141', usePlaywright: true },

  // 七猫小说（SPA/SSR混合，需Playwright）
  { platform: 'qimao', category: 'aggregate', url: 'https://www.qimao.com/paihang', usePlaywright: true },

  // 晋江文学城（传统服务端渲染，cheerio即可）
  { platform: 'jjwxc', category: 'femaleHot', url: 'http://www.jjwxc.net/topten.php?t=0', usePlaywright: false },
  { platform: 'jjwxc', category: 'femaleNew', url: 'http://www.jjwxc.net/topten.php?t=1', usePlaywright: false },
];

// ========== 数据类型 ==========
export interface RankingItem {
  platform: string;
  category: string;
  rank: number;
  title: string;
  author: string;
  heat: string;
  wordCount: string;
  status: string;
  url: string;
}

// ========== 通用工具 ==========
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 浏览器内部原始数据探测脚本 ==========
// 很多反爬网站会在 window 变量或 inline script 中保留原始 JSON 数据
function extractRawBooksFromPageScript(platform: string): BrowserBook[] {
  const books: BrowserBook[] = [];

  // 策略1：遍历所有 script 标签，找包含书籍数组的 JSON
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';
    // 寻找可能包含书籍列表的 JSON 结构
    const jsonMatches = text.match(/\{[\s\S]*?"(?:bookList|book_list|items|data|books)"[\s\S]*?\}/g);
    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const data = JSON.parse(match);
          const list = data.bookList || data.book_list || data.items || data.data || data.books;
          if (Array.isArray(list) && list.length > 0) {
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              const title = item.bookName || item.name || item.title || item.book_name || '';
              const author = item.authorName || item.author || item.writer || '';
              if (title && /^[一-龥a-zA-Z0-9·\s]{2,50}$/.test(title)) {
                books.push({
                  rank: i + 1,
                  title: String(title).slice(0, 100),
                  author: String(author).slice(0, 50),
                  heat: String(item.heat || item.readCount || item.read_count || '').slice(0, 50),
                  wordCount: String(item.wordCount || item.word_count || item.totalWord || '').slice(0, 30),
                  status: String(item.status || item.serialStatus || '').slice(0, 20),
                  url: String(item.bookUrl || item.url || item.link || '').slice(0, 200),
                });
              }
            }
            if (books.length > 0) break;
          }
        } catch {
          // 不是有效 JSON，跳过
        }
      }
    }
  }

  if (books.length > 0) return books;

  // 策略2：遍历 window 对象，查找包含书籍数据的大对象
  try {
    for (const key of Object.keys(window)) {
      try {
        const v = (window as any)[key];
        if (v && typeof v === 'object') {
          const json = JSON.stringify(v);
          if (json.length > 5000 && json.includes('book') || json.includes('书名')) {
            // 深度搜索这个对象中的数组
            function searchObject(obj: any, depth = 0): BrowserBook[] {
              if (depth > 5) return [];
              const found: BrowserBook[] = [];
              if (Array.isArray(obj) && obj.length > 5) {
                for (let i = 0; i < obj.length; i++) {
                  const item = obj[i];
                  if (item && typeof item === 'object') {
                    const title = item.bookName || item.name || item.title || item.book_name || '';
                    const author = item.authorName || item.author || item.writer || '';
                    if (title && /^[一-龥a-zA-Z0-9·\s]{2,50}$/.test(title)) {
                      found.push({
                        rank: i + 1,
                        title: String(title).slice(0, 100),
                        author: String(author).slice(0, 50),
                        heat: String(item.heat || item.readCount || '').slice(0, 50),
                        wordCount: String(item.wordCount || item.totalWord || '').slice(0, 30),
                        status: String(item.status || '').slice(0, 20),
                        url: String(item.bookUrl || item.url || '').slice(0, 200),
                      });
                    }
                  }
                }
              } else if (obj && typeof obj === 'object') {
                for (const k of Object.keys(obj)) {
                  found.push(...searchObject(obj[k], depth + 1));
                }
              }
              return found;
            }
            const found = searchObject(v);
            if (found.length > 0) {
              books.push(...found);
              break;
            }
          }
        }
      } catch {
        // 跳过不可访问的属性
      }
    }
  } catch {
    // window 遍历失败
  }

  // 策略3：查找可能包含 SSR 数据的 __NUXT__ 或 __INITIAL_STATE__
  const ssrKeys = ['__NUXT__', '__INITIAL_STATE__', '__APP__', '__DATA__', 'INITIAL_STATE'];
  for (const key of ssrKeys) {
    try {
      const v = (window as any)[key];
      if (v) {
        const json = JSON.stringify(v);
        const titleMatches = json.match(/"(?:bookName|name|title)"\s*:\s*"([^"]{2,50})"/g);
        if (titleMatches && titleMatches.length > 5) {
          // 找到了包含大量书名的 SSR 数据，尝试解析
          const parsed = typeof v === 'string' ? JSON.parse(v) : v;
          function deepSearch(obj: any): BrowserBook[] {
            const results: BrowserBook[] = [];
            if (Array.isArray(obj)) {
              for (let i = 0; i < obj.length; i++) {
                const item = obj[i];
                if (item && typeof item === 'object') {
                  const title = item.bookName || item.name || item.title || '';
                  if (title && /^[一-龥a-zA-Z0-9·\s]{2,50}$/.test(title)) {
                    results.push({
                      rank: results.length + 1,
                      title: String(title).slice(0, 100),
                      author: String(item.authorName || item.author || '').slice(0, 50),
                      heat: String(item.heat || item.readCount || '').slice(0, 50),
                      wordCount: String(item.wordCount || '').slice(0, 30),
                      status: String(item.status || '').slice(0, 20),
                      url: String(item.bookUrl || item.url || '').slice(0, 200),
                    });
                  }
                  // 继续递归搜索子数组
                  for (const k of Object.keys(item)) {
                    if (Array.isArray(item[k])) {
                      results.push(...deepSearch(item[k]));
                    }
                  }
                }
              }
            } else if (obj && typeof obj === 'object') {
              for (const k of Object.keys(obj)) {
                if (Array.isArray(obj[k])) {
                  results.push(...deepSearch(obj[k]));
                }
              }
            }
            return results;
          }
          const found = deepSearch(parsed);
          if (found.length > 0) {
            books.push(...found);
            break;
          }
        }
      }
    } catch {
      // 跳过
    }
  }

  return books;
}

// ========== 浏览器内部 DOM 提取脚本 ==========
// 在浏览器内执行，获取渲染后的 textContent（绕过字体反爬的 fallback）
interface BrowserBook {
  rank: number;
  title: string;
  author: string;
  heat: string;
  wordCount: string;
  status: string;
  url: string;
}

function extractBooksFromPageScript(platform: string): BrowserBook[] {
  const books: BrowserBook[] = [];

  // 收集候选元素：包含图片+链接的可见块级元素
  const candidates: Element[] = [];
  document.querySelectorAll('div, li, a').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60) return;

    const img = el.querySelector('img');
    const links = el.querySelectorAll('a');
    const text = (el.textContent || '').trim();

    if (img && links.length > 0 && text.length > 2 && text.length < 300) {
      candidates.push(el);
    }
  });

  // 去重：只保留最外层容器
  const outerCandidates: Element[] = [];
  for (const el of candidates) {
    let isChild = false;
    for (const other of candidates) {
      if (el !== other && other.contains(el)) {
        isChild = true;
        break;
      }
    }
    if (!isChild) outerCandidates.push(el);
  }

  // 按页面位置排序
  outerCandidates.sort((a, b) => {
    const rA = a.getBoundingClientRect();
    const rB = b.getBoundingClientRect();
    return rA.top - rB.top || rA.left - rB.left;
  });

  // 提取每本书
  outerCandidates.forEach((el, idx) => {
    const text = (el.textContent || '').trim();
    const lines = text.split(/\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    // 第一行通常是书名
    let title = lines[0] || '';
    // 过滤掉太短的（可能是标签、按钮文字）
    if (title.length < 2) title = '';

    // 找作者
    let author = '';
    for (const line of lines) {
      if (line.includes('作者') || line.includes('著')) {
        author = line.replace(/作者[：:]/, '').trim();
        break;
      }
      // 启发式：长度适中、纯中文、不是书名
      if (line.length >= 2 && line.length <= 15 && /^[一-龥·]{2,12}$/.test(line) && line !== title) {
        if (!author) author = line;
      }
    }

    // 提取其他信息
    const wordMatch = text.match(/(\d+\.?\d*[万亿]?)\s*字/);
    const statusMatch = text.match(/(连载|完结|已完结|连载中)/);
    const heatMatch = text.match(/(\d+\.?\d*[万亿]?)\s*(?:在读|人气|热度|点击)/);

    let url = (el.querySelector('a')?.getAttribute('href') || '');
    const baseUrl = platform === 'fanqie' ? 'https://fanqienovel.com' : 'https://www.qimao.com';
    url = url.startsWith('http') ? url : url ? `${baseUrl}${url}` : '';

    if (title && title.length < 60) {
      books.push({
        rank: idx + 1,
        title,
        author: author || '',
        heat: heatMatch ? heatMatch[0] : '',
        wordCount: wordMatch ? wordMatch[0] : '',
        status: statusMatch ? statusMatch[1] : '',
        url,
      });
    }
  });

  return books;
}

// ========== Playwright 爬虫 ==========
// ========== Playwright 爬虫（网络拦截版） ==========
// 通过拦截 XHR/Fetch 请求获取原始 JSON 数据，绕过字体反爬
async function crawlWithPlaywright(url: string, platform: string): Promise<RankingItem[]> {
  let browser: Browser | null = null;
  const apiResponses: Array<{ url: string; body: string }> = [];

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
      viewport: { width: 1280, height: 800 },
      locale: 'zh-CN',
    });

    const page = await context.newPage();
    page.setDefaultTimeout(PLAYWRIGHT_TIMEOUT);

    // 拦截字体文件 + XHR/Fetch 请求
    const fontBuffers: Buffer[] = [];
    await page.route('**/*', async (route) => {
      const req = route.request();
      const resourceType = req.resourceType();
      const url = req.url();

      // 拦截字体文件
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url)) {
        try {
          const response = await route.fetch();
          const buffer = await response.body();
          if (buffer && buffer.length > 1000) {
            fontBuffers.push(Buffer.from(buffer));
            console.log(`[bookCrawler] 拦截到字体文件: ${url} (${buffer.length} bytes)`);
          }
          await route.fulfill({ response });
          return;
        } catch {
          // 拦截失败，继续原始请求
        }
      }

      if (resourceType === 'xhr' || resourceType === 'fetch') {
        try {
          const response = await route.fetch();
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const body = await response.text();
            if (body.length > 200 && body.length < 500000) {
              apiResponses.push({ url: req.url(), body });
            }
          }
          await route.fulfill({ response });
          return;
        } catch {
          // 拦截失败，继续原始请求
        }
      }

      await route.continue();
    });

    console.log(`[bookCrawler][${platform}] Playwright 打开页面: ${url}`);

    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: PLAYWRIGHT_TIMEOUT,
    });

    if (!response) {
      throw new Error('页面无响应');
    }

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()}`);
    }

    // 等待页面 JS 执行完毕（SPA 需要额外时间）
    await page.waitForTimeout(5000);

    // 解析字体映射表（用于解码乱码）
    let decodeMap: Map<number, string> | null = null;
    if (fontBuffers.length > 0) {
      decodeMap = buildFontDecodeMap(fontBuffers);
      console.log('[bookCrawler][' + platform + '] font map: ' + decodeMap.size + ' chars');
    }

    // 尝试从拦截到的 API 响应中提取书籍数据
    let items = extractBooksFromApiResponses(apiResponses, platform, decodeMap);
    console.log(`[bookCrawler][${platform}] API 拦截提取到 ${items.length} 条`);

    // 如果 API 拦截未找到数据，fallback 到浏览器内原始数据探测
    if (items.length === 0) {
      const rawBooks = await page.evaluate(extractRawBooksFromPageScript, platform);
      console.log(`[bookCrawler][${platform}] 原始数据探测提取到 ${rawBooks.length} 条`);
      items = convertBrowserBooks(rawBooks, platform, decodeMap);
    }

    // 如果仍然为空，fallback 到 DOM 提取
    if (items.length === 0) {
      const rawBooks = await page.evaluate(extractBooksFromPageScript, platform);
      console.log(`[bookCrawler][${platform}] DOM 提取到 ${rawBooks.length} 条`);
      items = convertBrowserBooks(rawBooks, platform, decodeMap);
    }

    await browser.close();
    return items;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }
}


// ========== 字体解析（绕过字体反爬）==========

/** 解析字体文件，构建私有区字符 → 原始汉字 的映射表 */
function buildFontDecodeMap(fontBuffers: Buffer[]): Map<number, string> {
  const decodeMap = new Map<number, string>();

  for (let fi = 0; fi < fontBuffers.length; fi++) {
    const buffer = fontBuffers[fi];
    try {
      // 保存字体文件以便调试
      const fontPath = '/tmp/font_' + fi + '.woff2';
      fs.writeFileSync(fontPath, buffer);
      
      const font = opentype.parse(buffer);
      const numGlyphs = font.numGlyphs;
      console.log('[bookCrawler] parsing font: ' + numGlyphs + ' glyphs, saved to ' + fontPath);

      // 打印前10个字形用于调试
      for (let i = 0; i < Math.min(10, numGlyphs); i++) {
        const glyph = font.glyphs.get(i);
        if (glyph) {
          console.log('  glyph ' + i + ': name="' + glyph.name + '" unicode=0x' + (glyph.unicode || 0).toString(16));
        }
      }

      // 查找目标私有区字符
      const targetCodes = [0xe4a4, 0xe459, 0xe52a, 0xe51e, 0xe50d];
      for (const code of targetCodes) {
        try {
          const char = String.fromCharCode(code);
          const glyphIndex = font.charToGlyphIndex(char);
          console.log('  code 0x' + code.toString(16) + ' -> glyphIndex: ' + glyphIndex);
          if (glyphIndex >= 0) {
            const glyph = font.glyphs.get(glyphIndex);
            console.log('    name="' + glyph.name + '"');
          }
        } catch (e: any) {
          console.log('  code 0x' + code.toString(16) + ' error: ' + e.message);
        }
      }

      for (let i = 0; i < numGlyphs; i++) {
        try {
          const glyph = font.glyphs.get(i);
          if (!glyph) continue;

          const unicode = glyph.unicode;
          if (!unicode) continue;

          // 只处理私有区字符（U+E000 - U+F8FF）
          if (unicode < 0xE000 || unicode > 0xF8FF) continue;

          // 尝试获取字形名称（通常是原始汉字）
          let originalChar = glyph.name;

          // 如果名称不是有效汉字，尝试通过 cmap 查找
          if (!originalChar || originalChar.length !== 1 || !/[一-鿿]/.test(originalChar)) {
            originalChar = findCharByGlyphIndex(font, i);
          }

          if (originalChar && originalChar.length === 1 && /[一-鿿]/.test(originalChar)) {
            decodeMap.set(unicode, originalChar);
          }
        } catch {
          // skip
        }
      }
    } catch (err: any) {
      console.log('[bookCrawler] font parse error: ' + err.message);
    }
  }

  return decodeMap;
}

/** 通过字形索引查找对应的原始汉字 */
function findCharByGlyphIndex(font: any, glyphIndex: number): string {
  try {
    const cmap = font.tables?.cmap;
    if (!cmap) return '';

    for (const subTable of cmap.tables || []) {
      if (subTable.glyphIndexMap) {
        for (const [code, idx] of Object.entries(subTable.glyphIndexMap)) {
          if (idx === glyphIndex) {
            const char = String.fromCharCode(Number(code));
            if (/[一-鿿]/.test(char)) {
              return char;
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return '';
}

/** 使用字体映射表解码乱码字符串 */
function decodeGarbledText(text: string, decodeMap: Map<number, string> | null): string {
  if (!decodeMap || decodeMap.size === 0) return text;

  let result = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0xE000 && code <= 0xF8FF) {
      const decoded = decodeMap.get(code);
      result += decoded || char;
    } else {
      result += char;
    }
  }
  return result;
}

/** 从拦截到的 API 响应中提取书籍数据 */
function extractBooksFromApiResponses(apiResponses: Array<{ url: string; body: string }>, platform: string, decodeMap: Map<number, string> | null): RankingItem[] {
  const items: RankingItem[] = [];
  const seenTitles = new Set<string>();

  for (const { url, body } of apiResponses) {
    try {
      const data = JSON.parse(body);
      // 深度搜索书籍列表
      const books = deepFindBookList(data);

      for (let i = 0; i < books.length; i++) {
        const b = books[i];
        let title = decodeGarbledText(String(b.bookName || b.name || b.title || b.book_name || '').trim(), decodeMap);
        let author = decodeGarbledText(String(b.authorName || b.author || b.writer || '').trim(), decodeMap);

        if (!title || title.length < 2 || title.length > 50) continue;
        if (seenTitles.has(title)) continue;
        if (/^\d+$/.test(title)) continue;

        // 过滤导航元素和分类标签
        const navKeywords = ['首页', '分类', '搜索', '登录', '注册', '作家助手', '公众号', '关于我们', '帮助中心'];
        if (navKeywords.some(k => title.includes(k)) && title.length < 10) continue;

        // 番茄：过滤分类标签（如"女频悬疑"、"西方奇幻"等）
        if (platform === 'fanqie') {
          const genreTags = [
            '女频悬疑', '西方奇幻', '东方仙侠', '古风世情', '科幻末世',
            '男频衍生', '女频衍生', '民国言情', '都市高武', '悬疑灵异',
            '悬疑脑洞', '抗战谍战', '青春甜宠', '双男主', '古言脑洞',
            '战神赘婿', '游戏体育', '天灾', '第四天灾', '游戏主播',
            '神探', '天作之合', '神医', '天才', '斩神衍生',
            '惊悚游戏', '封神', '聊天群', '神奇宝贝', '诸天万界',
            '都市日常', '历史古代', '历史脑洞', '都市脑洞', '奇幻仙侠',
            '玄幻脑洞', '历史衍生', '游戏异界', '动漫衍生', '男频脑洞',
            '现言脑洞', '现言萌宝', '星光璀璨', '豪门总裁', '职场婚恋',
            '年代', '种田', '医术', '推理', '规则怪谈',
            '穿越', '重生', '系统', '快穿', '穿书',
            '马甲', '虐渣', '甜宠', '团宠', '打脸',
            '学霸', '电竞', '娱乐圈', '直播', '美食',
            '空间', '逃荒', '囤物资', '养崽', '锦鲤',
            '后妈', '大佬', '毒舌', '先婚后爱', '破镜重圆',
            '青梅竹马', '欢喜冤家', '日久生情', '暗恋', '追妻火葬场',
            '白月光', '替身', '带球跑', '离婚', '闪婚',
            '军婚', '年代文', '七零', '八零', '九零',
            '六零', '五零', '七零年代', '八零年代', '九零年代',
            '六零年代', '五零年代',
          ];
          if (genreTags.some(tag => title === tag || title.includes(tag) && title.length < tag.length + 3)) continue;
        }

        seenTitles.add(title);

        items.push({
          platform,
          category: 'maleHot',
          rank: items.length + 1,
          title: title.slice(0, 100),
          author: author.slice(0, 50),
          heat: String(b.heat || b.readCount || b.read_count || b.popularity || '').slice(0, 50),
          wordCount: String(b.wordCount || b.word_count || b.totalWord || b.word || '').slice(0, 30),
          status: String(b.status || b.serialStatus || b.state || '').slice(0, 20),
          url: String(b.bookUrl || b.url || b.link || b.book_url || '').slice(0, 200),
        });
      }
    } catch {
      // 不是有效 JSON 或解析失败，跳过
    }
  }

  return items;
}

/** 深度搜索对象中的书籍列表 */
function deepFindBookList(obj: any, depth = 0): any[] {
  if (depth > 8) return [];

  if (Array.isArray(obj) && obj.length > 3) {
    // 检查是否是书籍数组
    const firstItem = obj[0];
    if (firstItem && typeof firstItem === 'object') {
      const hasBookField = ['bookName', 'name', 'title', 'book_name', 'bookId', 'book_id']
        .some(k => firstItem[k] !== undefined);
      if (hasBookField) {
        return obj;
      }
    }
    // 递归搜索子数组
    for (const item of obj) {
      const found = deepFindBookList(item, depth + 1);
      if (found.length > 0) return found;
    }
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      // 优先搜索看起来像列表的字段
      if (/list|items|data|books|rank|result/i.test(key) && Array.isArray(obj[key]) && obj[key].length > 3) {
        const found = deepFindBookList(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
    // 如果没有优先命中的，递归所有字段
    for (const key of Object.keys(obj)) {
      if (!/list|items|data|books|rank|result/i.test(key)) {
        const found = deepFindBookList(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
  }

  return [];
}

/** 转换浏览器提取结果 */
function convertBrowserBooks(rawBooks: BrowserBook[], platform: string, decodeMap: Map<number, string> | null): RankingItem[] {
  const items: RankingItem[] = [];
  const seenTitles = new Set<string>();

  for (const b of rawBooks) {
    let title = decodeGarbledText(b.title, decodeMap);
    if (!title || title.length < 2 || title.length > 50) continue;
    if (seenTitles.has(title)) continue;
    if (/^\d+$/.test(title)) continue;

    const navKeywords = ['首页', '分类', '搜索', '登录', '注册', '作家助手', '公众号', '关于我们', '帮助中心'];
    if (navKeywords.some(k => title.includes(k)) && title.length < 10) continue;

    seenTitles.add(title);

    items.push({
      platform,
      category: 'maleHot',
      rank: items.length + 1,
      title: title.slice(0, 100),
      author: decodeGarbledText(b.author, decodeMap).slice(0, 50),
      heat: b.heat.slice(0, 50),
      wordCount: b.wordCount.slice(0, 30),
      status: b.status.slice(0, 20),
      url: b.url,
    });
  }

  return items;
}

// ========== 带重试的 HTTP 请求（用于晋江等传统站点） ==========
async function fetchWithRetry(url: string, retries = RETRY_COUNT): Promise<string> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Connection': 'keep-alive',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.text();
    } catch (err: any) {
      const isLast = i === retries;
      console.log(`[bookCrawler] 请求失败 (${i + 1}/${retries + 1}): ${url} - ${err.message}${isLast ? '，放弃重试' : ''}`);
      if (isLast) throw err;

      const delay = RETRY_DELAY_BASE * Math.pow(2, i) + Math.random() * 1000;
      await sleep(delay);
    }
  }

  throw new Error('Should not reach here');
}

// ========== 解析器 ==========

/** 番茄小说解析器（聚合页面） */
function parseFanqie(html: string, _category: string): RankingItem[] {
  const $ = cheerio.load(html);
  const items: RankingItem[] = [];

  // 调试：收集候选class
  const allClasses = new Set<string>();
  $('[class]').each((_: number, el: any) => {
    const cls = $(el).attr('class') || '';
    cls.split(/\s+/).forEach(c => { if (c) allClasses.add(c); });
  });
  const bookClasses = [...allClasses].filter(c => /book|novel|item|card|list|rank/i.test(c));
  console.log(`[bookCrawler][fanqie] 探测到候选class (${bookClasses.length}个):`, bookClasses.slice(0, 30));

  // 尝试多种选择器
  const selectors = [
    '.book-item',
    '[class*="book"][class*="item"]',
    '.rank-item',
    '.book-card',
    '.library-item',
    '.muye-rank-page .book-list .book',
    'li[data-book-id]',
    '[class*="Book"][class*="Item"]',
    '[class*="book"]',
  ];

  let $books: any = $();
  for (const sel of selectors) {
    $books = $(sel);
    if ($books.length > 0) {
      console.log(`[bookCrawler][fanqie] 选择器命中: "${sel}" => ${$books.length} 个元素`);
      break;
    }
  }

  // 如果常规选择器未命中，尝试智能探测：找包含图片+链接+文字的div/li
  if ($books.length === 0) {
    console.log(`[bookCrawler][fanqie] 常规选择器未命中，尝试智能探测...`);
    const candidates: any[] = [];
    $('div, li, a').each((_: number, el: any) => {
      const $el = $(el);
      const hasImg = $el.find('img').length > 0;
      const hasLink = $el.find('a').length > 0 || $el.is('a');
      const text = $el.text().trim();
      // 书籍卡片特征：有图片，有文字（书名通常2-20字），总文字不太长
      if (hasImg && text.length > 2 && text.length < 80) {
        candidates.push($el);
      }
    });
    if (candidates.length > 0) {
      console.log(`[bookCrawler][fanqie] 智能探测到 ${candidates.length} 个候选`);
      $books = $(candidates);
    }
  }

  $books.each((idx: number, el: any) => {
    const $el = $(el);

    // 标题：优先从子元素的链接文本或title属性获取
    let title = '';
    const $links = $el.find('a');
    $links.each((_: number, a: any) => {
      const t = $(a).text().trim() || $(a).attr('title') || '';
      if (t.length > 2 && t.length < 60 && !title) title = t;
    });
    if (!title) title = $el.find('h3, h4, .title, [class*="title"]').first().text().trim();

    // 作者：找包含"作者"、"著"等字样，或单独的短文本
    let author = '';
    $el.find('*').each((_: number, child: any) => {
      const text = $(child).text().trim();
      if (text.length >= 2 && text.length <= 20 && !author) {
        // 简单启发：如果包含常见笔名特征（不含数字和特殊符号太多）
        if (/^[^\d]{2,12}$/.test(text)) author = text;
      }
    });

    // 热度/字数/状态：从文本中提取数字+单位的模式
    const allText = $el.text();
    const heatMatch = allText.match(/(\d+\.?\d*[万亿]?)\s*(?:在读|人气|热度|点击)/);
    const heat = heatMatch ? heatMatch[0] : '';

    const wordMatch = allText.match(/(\d+\.?\d*[万亿]?)\s*字/);
    const wordCount = wordMatch ? wordMatch[0] : '';

    const statusMatch = allText.match(/(连载|完结|已完结|连载中)/);
    const status = statusMatch ? statusMatch[1] : '';

    // 链接
    const url = $el.find('a').first().attr('href') || '';
    const absoluteUrl = url.startsWith('http') ? url : url ? `https://fanqienovel.com${url}` : '';

    if (title) {
      items.push({
        platform: 'fanqie',
        category: 'maleHot',
        rank: idx + 1,
        title: title.slice(0, 100),
        author: author.slice(0, 50),
        heat: heat.slice(0, 50),
        wordCount: wordCount.slice(0, 30),
        status: status.slice(0, 20),
        url: absoluteUrl,
      });
    }
  });

  console.log(`[bookCrawler][fanqie] 解析到 ${items.length} 条`);
  return items.slice(0, 50);
}

/** 七猫小说解析器（聚合页面） */
function parseQimao(html: string, _category: string): RankingItem[] {
  const $ = cheerio.load(html);
  const items: RankingItem[] = [];

  // 调试：收集候选class
  const allClasses = new Set<string>();
  $('[class]').each((_: number, el: any) => {
    const cls = $(el).attr('class') || '';
    cls.split(/\s+/).forEach(c => { if (c) allClasses.add(c); });
  });
  const bookClasses = [...allClasses].filter(c => /book|novel|item|card|list|rank/i.test(c));
  console.log(`[bookCrawler][qimao] 探测到候选class (${bookClasses.length}个):`, bookClasses.slice(0, 30));

  const selectors = [
    '.book-item',
    '.book-list .item',
    '.rank-item',
    '.book-card',
    '[class*="book"][class*="item"]',
    '[class*="Book"][class*="Item"]',
    '[class*="rank"]',
  ];

  let $books: any = $();
  for (const sel of selectors) {
    $books = $(sel);
    if ($books.length > 0) {
      console.log(`[bookCrawler][qimao] 选择器命中: "${sel}" => ${$books.length} 个元素`);
      break;
    }
  }

  // 智能探测fallback
  if ($books.length === 0) {
    console.log(`[bookCrawler][qimao] 常规选择器未命中，尝试智能探测...`);
    const candidates: any[] = [];
    $('div, li').each((_: number, el: any) => {
      const $el = $(el);
      if ($el.find('img').length > 0 && $el.find('a').length > 0) {
        const text = $el.text().trim();
        if (text.length > 2 && text.length < 80) candidates.push($el);
      }
    });
    if (candidates.length > 0) {
      console.log(`[bookCrawler][qimao] 智能探测到 ${candidates.length} 个候选`);
      $books = $(candidates);
    }
  }

  $books.each((idx: number, el: any) => {
    const $el = $(el);

    let title = '';
    const $links = $el.find('a');
    $links.each((_: number, a: any) => {
      const t = $(a).text().trim() || $(a).attr('title') || '';
      if (t.length > 2 && t.length < 60 && !title) title = t;
    });
    if (!title) title = $el.find('h3, h4, .title, [class*="title"]').first().text().trim();

    let author = '';
    $el.find('*').each((_: number, child: any) => {
      const text = $(child).text().trim();
      if (text.length >= 2 && text.length <= 20 && !author) {
        if (/^[^\d]{2,12}$/.test(text)) author = text;
      }
    });

    const allText = $el.text();
    const heatMatch = allText.match(/(\d+\.?\d*[万亿]?)\s*(?:在读|人气|热度|点击)/);
    const heat = heatMatch ? heatMatch[0] : '';

    const wordMatch = allText.match(/(\d+\.?\d*[万亿]?)\s*字/);
    const wordCount = wordMatch ? wordMatch[0] : '';

    const statusMatch = allText.match(/(连载|完结|已完结|连载中)/);
    const status = statusMatch ? statusMatch[1] : '';

    const url = $el.find('a').first().attr('href') || '';
    const absoluteUrl = url.startsWith('http') ? url : url ? `https://www.qimao.com${url}` : '';

    if (title) {
      items.push({
        platform: 'qimao',
        category: 'maleHot',
        rank: idx + 1,
        title: title.slice(0, 100),
        author: author.slice(0, 50),
        heat: heat.slice(0, 50),
        wordCount: wordCount.slice(0, 30),
        status: status.slice(0, 20),
        url: absoluteUrl,
      });
    }
  });

  console.log(`[bookCrawler][qimao] 解析到 ${items.length} 条`);
  return items.slice(0, 50);
}

/** 晋江解析器 */
function parseJjwxc(html: string, category: string): RankingItem[] {
  const $ = cheerio.load(html);
  const items: RankingItem[] = [];

  // 晋江榜单通常是一个表格结构
  const $rows = $('table tr, .ranklist tr, [class*="list"] tr');

  if ($rows.length === 0) {
    console.log(`[bookCrawler][jjwxc][${category}] 未匹配到表格行，尝试通用结构...`);
  }

  $rows.each((idx: number, el: any) => {
    const $row = $(el);
    const $tds = $row.find('td');

    // 表格结构：排名 | 书名 | 作者 | 类型 | 字数 | 积分 | 状态
    if ($tds.length >= 3) {
      const title = $tds.eq(1).text().trim();
      const author = $tds.eq(2).text().trim();
      const genre = $tds.eq(3)?.text().trim() || '';
      const wordCount = $tds.eq(4)?.text().trim() || '';
      const heat = $tds.eq(5)?.text().trim() || '';
      const status = $tds.eq(6)?.text().trim() || '';

      const $link = $tds.eq(1).find('a');
      const url = $link.attr('href') || '';
      const absoluteUrl = url.startsWith('http') ? url : url ? `http://www.jjwxc.net${url}` : '';

      if (title && title !== '作品名') {
        items.push({
          platform: 'jjwxc',
          category,
          rank: idx,
          title: title.slice(0, 100),
          author: author.slice(0, 50),
          heat: heat.slice(0, 50),
          wordCount: wordCount.slice(0, 30),
          status: status.slice(0, 20) || genre,
          url: absoluteUrl,
        });
      }
    } else {
      // 非表格结构，尝试在整行中查找
      const title = $row.find('a').first().text().trim();
      const author = $row.find('.author, [class*="author"]').first().text().trim();
      const url = $row.find('a').first().attr('href') || '';
      const absoluteUrl = url.startsWith('http') ? url : url ? `http://www.jjwxc.net${url}` : '';

      if (title && title !== '作品名' && title.length < 100) {
        items.push({
          platform: 'jjwxc',
          category,
          rank: idx + 1,
          title: title.slice(0, 100),
          author: author.slice(0, 50),
          heat: '',
          wordCount: '',
          status: '',
          url: absoluteUrl,
        });
      }
    }
  });

  console.log(`[bookCrawler][jjwxc][${category}] 解析到 ${items.length} 条`);
  return items.slice(0, 50);
}

// ========== 调度解析器 ==========
function parseHtml(platform: string, html: string, category: string): RankingItem[] {
  switch (platform) {
    case 'fanqie':
      return parseFanqie(html, category);
    case 'qimao':
      return parseQimao(html, category);
    case 'jjwxc':
      return parseJjwxc(html, category);
    default:
      console.log(`[bookCrawler] 未知平台: ${platform}`);
      return [];
  }
}

// ========== 保存到数据库 ==========
async function saveBookRankings(items: RankingItem[]) {
  if (items.length === 0) return;

  // 按 platform + category 分组
  const groups = new Map<string, RankingItem[]>();
  for (const item of items) {
    const key = `${item.platform}:${item.category}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  for (const [key, groupItems] of groups) {
    const [platform, category] = key.split(':');

    // 删除该平台+分类的旧数据
    await db.delete(bookRankings)
      .where(and(eq(bookRankings.platform, platform), eq(bookRankings.category, category)));

    // 插入新数据
    for (const item of groupItems) {
      await db.insert(bookRankings).values({
        platform: item.platform,
        category: item.category,
        rank: item.rank,
        title: item.title,
        author: item.author,
        heat: item.heat,
        wordCount: item.wordCount,
        status: item.status,
        url: item.url,
      });
    }

    console.log(`[bookCrawler][${platform}][${category}] 已保存 ${groupItems.length} 条到数据库`);
  }
}

// ========== 主入口 ==========
export interface CrawlResult {
  platform: string;
  category: string;
  success: boolean;
  count: number;
  error?: string;
}

export async function crawlAllBookRankings(): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  let lastPlatform = '';

  const disablePlaywright = process.env.DISABLE_PLAYWRIGHT_CRAWL === 'true';

  for (const target of CRAWL_TARGETS) {
    // Render 免费版 512MB 内存跑不动 Playwright，跳过番茄/七猫
    if (disablePlaywright && target.usePlaywright) {
      console.log(`[bookCrawler] 跳过 ${target.platform}（Playwright 已禁用）`);
      continue;
    }

    // 平台间延迟
    if (lastPlatform && lastPlatform !== target.platform) {
      await sleep(PLATFORM_DELAY_MS);
    }
    // 同平台分类间延迟
    if (lastPlatform === target.platform) {
      await sleep(CATEGORY_DELAY_MS);
    }
    lastPlatform = target.platform;

    console.log(`[bookCrawler] 开始抓取: ${target.platform} / ${target.category} -> ${target.url}`);

    try {
      let items: RankingItem[];

      if (target.usePlaywright) {
        // Playwright 直接在浏览器内提取，绕过字体反爬
        items = await crawlWithPlaywright(target.url, target.platform);
      } else {
        // 晋江等传统站点：fetch HTML + cheerio 解析
        const html = await fetchWithRetry(target.url);
        items = parseHtml(target.platform, html, target.category);
      }

      if (items.length > 0) {
        await saveBookRankings(items);
        results.push({
          platform: target.platform,
          category: target.category,
          success: true,
          count: items.length,
        });
      } else {
        console.log(`[bookCrawler][${target.platform}][${target.category}] 未解析到数据，可能页面结构已变更`);
        results.push({
          platform: target.platform,
          category: target.category,
          success: false,
          count: 0,
          error: '未解析到数据，页面结构可能已变更',
        });
      }
    } catch (err: any) {
      console.error(`[bookCrawler][${target.platform}][${target.category}] 抓取失败:`, err.message);
      results.push({
        platform: target.platform,
        category: target.category,
        success: false,
        count: 0,
        error: err.message,
      });
    }
  }

  console.log(`[bookCrawler] 全部抓取完成: ${results.filter(r => r.success).length}/${results.length} 成功`);
  return results;
}

// ========== 查询接口 ==========
export async function getBookRankings(category: string, limit = 50): Promise<RankingItem[]> {
  let rows = await db.select()
    .from(bookRankings)
    .where(eq(bookRankings.category, category))
    .orderBy(bookRankings.rank)
    .limit(limit);

  // 降级：如果该分类无数据，返回聚合页面的数据（适用于番茄/七猫）
  if (rows.length === 0) {
    rows = await db.select()
      .from(bookRankings)
      .where(eq(bookRankings.category, 'maleHot'))
      .orderBy(bookRankings.rank)
      .limit(limit);
  }

  return rows.map(r => ({
    platform: r.platform,
    category: r.category,
    rank: r.rank,
    title: r.title,
    author: r.author,
    heat: r.heat,
    wordCount: r.wordCount,
    status: r.status,
    url: r.url,
  }));
}

/** 检查某分类是否有当天数据 */
export async function hasTodayBookRankings(category: string): Promise<boolean> {
  const rows = await db.select()
    .from(bookRankings)
    .where(eq(bookRankings.category, category))
    .orderBy(desc(bookRankings.fetchedAt))
    .limit(1);

  if (rows.length === 0) return false;
  const fetchedAt = rows[0].fetchedAt;
  if (!fetchedAt) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fetched = new Date(fetchedAt);
  const fetchedDay = new Date(fetched.getFullYear(), fetched.getMonth(), fetched.getDate());

  return fetchedDay.getTime() === today.getTime();
}
