import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { fetchSource } from '../services/dailyHotApi.js';
import { getWindVane } from '../services/trendsAnalysis.js';
import { getBookAnalysis, generateBookAnalysis, generateFromSeed, checkGenerationLimit } from '../services/trendsInspiration.js';
import { callLLM } from '../services/llm.js';
import { getBookRankings, hasTodayBookRankings } from '../services/bookCrawler.js';

const trendsRouter = new Hono();

const ENABLE_DYNAMIC = process.env.ENABLE_DYNAMIC_TRENDS === 'true';

/** 获取 dateKey（YYYY-MM-DD） */
function getDateKey(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// === 硬编码热门榜单数据（方案C：第一期模拟，预留接口位） ===

const PLATFORM_TITLES: Record<string, string[]> = {
  douyin: [
    '全网都在找的转职流小说','规则怪谈为什么突然火了','末世囤货文推荐','重生爽文天花板',
    '苟道修仙真的好看吗','高武进化流神作','年代文top10','悬疑灵异必看',
    '玄幻言情黑马','种田基建文推荐','国运绑定类小说','直播曝光流爽文',
    '召唤流神作盘点','系统文天花板','退婚流还能这么写','废柴逆袭经典',
    '空间法宝设定文','师徒情深小说推荐','家族纷争权谋文','无敌流爽文',
    '模拟器类小说','签到打卡流','扮猪吃虎神作','真假千金文推荐',
    '算命玄学文','穿成炮灰逆袭','带着空间穿越','军婚年代文',
    '星际种田文','诡异降临类','安全屋求生','规则类怪谈',
    '无限流推荐','末日生存指南','囤货十万吨','从杂役开始长生',
    '细胞无限进化','完美利用规则','开局SSS天赋','边陲小将称帝',
    '摆烂修仙王','带着空间嫁军人','算命大佬真千金','荒星开农场',
    '全民诡异时代','我能看到提示','高武：细胞进化','重生豪门保姆',
  ],
  weibo: [
    '今年最火的转职流','规则怪谈类小说崛起','末世囤货文为什么火','重生爽文新套路',
    '苟道流修仙推荐','高武进化流盘点','年代文爆款分析','悬疑灵异新趋势',
    '玄幻言情新黑马','种田基建文盘点','国运绑定类推荐','直播曝光流分析',
    '召唤流小说推荐','系统文新套路','退婚流创新写法','废柴逆袭新趋势',
    '空间法宝设定推荐','师徒情深文盘点','家族纷争推荐','无敌流新趋势',
    '模拟器类推荐','签到流新写法','扮猪吃虎推荐','真假千金新趋势',
    '算命玄学推荐','炮灰逆袭推荐','空间穿越推荐','军婚文推荐',
    '星际文推荐','诡异类推荐','求生类推荐','怪谈类推荐',
    '无限流推荐','末日类推荐','囤货类推荐','长生流推荐',
    '进化流推荐','规则类推荐','天赋流推荐','争霸文推荐',
    '摆烂流推荐','年代军婚推荐','玄学千金推荐','种田文推荐',
    '诡异时代推荐','提示流推荐','细胞进化推荐','豪门保姆推荐',
  ],
  toutiao: [
    '2026小说推荐：转职流','规则怪谈类小说盘点','末世囤货文top10','重生爽文排行榜',
    '苟道修仙文推荐','高武进化流推荐','年代文爆款推荐','悬疑灵异推荐',
    '玄幻言情推荐','种田基建推荐','国运绑定推荐','直播曝光推荐',
    '召唤流推荐','系统文推荐','退婚流推荐','废柴逆袭推荐',
    '空间法宝推荐','师徒情深推荐','家族纷争推荐','无敌流推荐',
    '模拟器推荐','签到流推荐','扮猪吃虎推荐','真假千金推荐',
    '算命玄学推荐','炮灰逆袭推荐','空间穿越推荐','军婚文推荐',
    '星际文推荐','诡异类推荐','求生类推荐','怪谈类推荐',
    '无限流推荐','末日类推荐','囤货类推荐','长生流推荐',
    '进化流推荐','规则类推荐','天赋流推荐','争霸文推荐',
    '摆烂流推荐','年代军婚推荐','玄学千金推荐','种田文推荐',
    '诡异时代推荐','提示流推荐','细胞进化推荐','豪门保姆推荐',
  ],
  baidu: [
    '转职流小说排行榜','规则怪谈小说推荐','末世囤货文排行榜','重生爽文排行榜',
    '苟道修仙小说推荐','高武进化流排行榜','年代文小说推荐','悬疑灵异小说推荐',
    '玄幻言情小说推荐','种田基建小说推荐','国运绑定小说推荐','直播曝光小说推荐',
    '召唤流小说推荐','系统文小说推荐','退婚流小说推荐','废柴逆袭小说推荐',
    '空间法宝小说推荐','师徒情深小说推荐','家族纷争小说推荐','无敌流小说推荐',
    '模拟器小说推荐','签到流小说推荐','扮猪吃虎小说推荐','真假千金小说推荐',
    '算命玄学小说推荐','炮灰逆袭小说推荐','空间穿越小说推荐','军婚小说推荐',
    '星际小说推荐','诡异小说推荐','求生小说推荐','怪谈小说推荐',
    '无限流小说推荐','末日小说推荐','囤货小说推荐','长生流小说推荐',
    '进化流小说推荐','规则类小说推荐','天赋流小说推荐','争霸小说推荐',
    '摆烂流小说推荐','年代军婚小说推荐','玄学千金小说推荐','种田小说推荐',
    '诡异时代小说推荐','提示流小说推荐','细胞进化小说推荐','豪门保姆小说推荐',
  ],
  bilibili: [
    '转职流小说推荐','规则怪谈类推荐','末世囤货文推荐','重生爽文推荐',
    '苟道修仙推荐','高武进化推荐','年代文推荐','悬疑灵异推荐',
    '玄幻言情推荐','种田基建推荐','国运绑定推荐','直播曝光推荐',
    '召唤流推荐','系统文推荐','退婚流推荐','废柴逆袭推荐',
    '空间法宝推荐','师徒情深推荐','家族纷争推荐','无敌流推荐',
  ],
};

// === 基于日期的确定性数据变换 ===

/** 基于种子的确定性洗牌（Fisher-Yates变体） */
function shuffleBySeed<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = Math.abs(seed) % 2147483647 || 1;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 根据 daysAgo 获取日期标签 */
function getDateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/** 根据 daysAgo 变换平台热搜数据 */
function makePlatformItems(platform: string, daysAgo: number) {
  const titles = PLATFORM_TITLES[platform] || [];
  const shuffled = shuffleBySeed(titles, daysAgo * 37 + 11);
  // 每天取不同数量的条目（30-45条），从不同偏移开始
  const count = 30 + (daysAgo * 7) % 16;
  const offset = (daysAgo * 13) % Math.max(1, shuffled.length - count);
  const sliced = shuffled.slice(offset, offset + count);
  return sliced.map((title, i) => ({
    rank: i + 1,
    title,
    heat: i < 3 ? '🔥🔥🔥' : i < 10 ? '🔥🔥' : '🔥',
    change: ((daysAgo + i) % 3 === 0) ? 'up' : ((daysAgo + i) % 3 === 1) ? 'down' : 'same',
  }));
}

/** 根据 daysAgo 和 length 变换榜单数据 */
function makeBookList(category: string, daysAgo: number, length: string = 'long') {
  // 短篇：使用 BOOK_LISTS_SHORT（≤5万字）
  const src = length === 'short' && (BOOK_LISTS_SHORT as any)[category]
    ? (BOOK_LISTS_SHORT as any)[category]
    : (BOOK_LISTS as any)[category] || [];
  const shuffled = shuffleBySeed(src, daysAgo * 53 + 7);
  // 重新生成排名和热度
  return shuffled.map((book: any, i: number) => {
    const baseReaders = parseInt((book.readers || '0').replace(/[^0-9]/g, ''));
    const variation = ((daysAgo + i) % 5 - 2) * 10; // ±20万波动
    const newReaders = Math.max(50, baseReaders + variation);
    return {
      ...book,
      rank: i + 1,
      readers: newReaders >= 10000 ? `${Math.floor(newReaders / 100) / 100}万` : `${newReaders}万`,
    };
  });
}

/** 根据 daysAgo 和 length 变换爆款灵感 */
function makeBookAnalysis(category: string, daysAgo: number, length: string = 'long') {
  const list = length === 'short' && (SHORT_BOOK_ANALYSIS as any)[category]
    ? (SHORT_BOOK_ANALYSIS as any)[category]
    : (BOOK_ANALYSIS as any)[category] || [];
  if (list.length <= 2) return list;
  const shuffled = shuffleBySeed(list, daysAgo * 19 + 3);
  // 每天展示2-3条，循环轮换
  const count = 2 + (daysAgo % 2);
  return shuffled.slice(0, count);
}

/** 根据 daysAgo 和 length 变换热门灵感 */
function makeHotInspirations(category: string, daysAgo: number, length: string = 'long') {
  const list = length === 'short' && (SHORT_HOT_INSPIRATIONS as any)[category]
    ? (SHORT_HOT_INSPIRATIONS as any)[category]
    : (HOT_INSPIRATIONS as any)[category] || [];
  const shuffled = shuffleBySeed(list, daysAgo * 23 + 5);
  return shuffled;
}

/** 根据 daysAgo 和 length 微调风向标（更换部分措辞角度） */
function makeWindVane(category: string, daysAgo: number, length: string = 'long') {
  const src = length === 'short' && (SHORT_WIND_VANES as any)[category]
    ? (SHORT_WIND_VANES as any)[category]
    : (WIND_VANES as any)[category];
  if (!src) return src;
  const base = { ...src };
  if (daysAgo === 0) return base;
  // 不同日期微调summary和suggestion，给人"每日更新"的感觉
  const angles = [
    '从读者反馈来看',
    '根据最新数据监测',
    '结合平台算法变化',
    '对比上周同期数据',
    '分析近期爆款特征',
    '综合多平台热度',
    '追踪用户搜索趋势',
  ];
  const angle = angles[daysAgo % angles.length];
  return {
    ...base,
    summary: `${angle}，${base.summary}`,
  };
}

const BOOK_LISTS = {
  maleHot: [
    { rank: 1, title: '全民转职：开局觉醒SSS级天赋', author: '风凌天下', genre: '游戏异界', readers: '985万', tags: ['转职流','爽文','升级'] },
    { rank: 2, title: '规则怪谈：我能完美利用规则', author: '夜行月', genre: '悬疑灵异', readers: '872万', tags: ['规则怪谈','智斗','悬疑'] },
    { rank: 3, title: '高武：我的细胞可以无限进化', author: '我吃西红柿', genre: '高武世界', readers: '756万', tags: ['进化流','系统','爽文'] },
    { rank: 4, title: '修仙：从杂役弟子开始长生', author: '耳根', genre: '修仙', readers: '654万', tags: ['凡人流','苟道','长生'] },
    { rank: 5, title: '末日：我在安全屋打造避难所', author: '会说话的肘子', genre: '末日', readers: '598万', tags: ['基建','囤货','生存'] },
    { rank: 6, title: '大秦：从边陲小将到千古一帝', author: '孑与2', genre: '历史架空', readers: '512万', tags: ['历史','争霸','权谋'] },
    { rank: 7, title: '诡异降临：我有一座安全屋', author: '爱潜水的乌贼', genre: '悬疑惊悚', readers: '487万', tags: ['诡异','生存','金手指'] },
    { rank: 8, title: '星际种田：我在荒星开农场', author: '远瞳', genre: '科幻种田', readers: '423万', tags: ['种田','基建','美食'] },
    { rank: 9, title: '修仙界第一摆烂王', author: '烽火戏诸侯', genre: '仙侠修真', readers: '398万', tags: ['摆烂','反差','轻松'] },
    { rank: 10, title: '国运绑定：开局召唤神级英雄', author: '唐家三少', genre: '国运', readers: '356万', tags: ['国运','召唤','爽文'] },
    { rank: 11, title: '全民模拟：我能预演万千结局', author: '蝴蝶蓝', genre: '模拟器', readers: '342万', tags: ['模拟器','预知','爽文'] },
    { rank: 12, title: '签到：在帝京打卡一千年', author: '蛇皮怪', genre: '签到流', readers: '318万', tags: ['签到','无敌','长生'] },
    { rank: 13, title: '我以读经入圣', author: '老鹰吃小鸡', genre: '文道修真', readers: '295万', tags: ['文道','圣道','儒修'] },
    { rank: 14, title: '师父，剑修真的能种田吗', author: '流浪的蛤蟆', genre: '仙侠', readers: '281万', tags: ['师徒','种田','反差'] },
    { rank: 15, title: '万族战场：我培养出无敌天骄', author: '黑山老妖', genre: '万族争霸', readers: '267万', tags: ['万族','培养','争霸'] },
    { rank: 16, title: '综武：天下第一大剑客', author: '月关', genre: '武侠综合', readers: '254万', tags: ['综武','剑客','争霸'] },
    { rank: 17, title: '我在异界做外卖小哥', author: '二目', genre: '都市玄幻', readers: '241万', tags: ['外卖','异界','搞笑'] },
    { rank: 18, title: '我有一座万界聊天群', author: '圣骑士的传说', genre: '都市玄幻', readers: '228万', tags: ['聊天群','诸天','系统'] },
    { rank: 19, title: '都市修仙：开局降妖天眼', author: '愤怒的香蕉', genre: '都市修真', readers: '215万', tags: ['都市','修仙','天眼'] },
    { rank: 20, title: '神探：在民国推理', author: '卓识', genre: '民国悬疑', readers: '203万', tags: ['神探','推理','民国'] },
    { rank: 21, title: '海贼：我是黑胡子的副船长', author: '六道沉沦', genre: '海贼衍生', readers: '191万', tags: ['海贼','衍生','反派'] },
    { rank: 22, title: '火影：开局拥有写轮眼', author: '飘逸的火', genre: '火影衍生', readers: '180万', tags: ['火影','写轮眼','衍生'] },
    { rank: 23, title: '综武：开局虚竹是我师弟', author: '梦入神机', genre: '武侠综合', readers: '169万', tags: ['综武','武侠','师承'] },
    { rank: 24, title: '民国谍战：我在敌营卧底', author: '王梓钧', genre: '谍战', readers: '158万', tags: ['谍战','卧底','民国'] },
    { rank: 25, title: '抗战：我有一个直播间', author: '兵贵神速', genre: '抗战军事', readers: '147万', tags: ['抗战','直播','系统'] },
    { rank: 26, title: '三国：我是袁绍的接班人', author: '七月新番', genre: '三国', readers: '137万', tags: ['三国','争霸','谋略'] },
    { rank: 27, title: '大唐：朕的兄长是李世民', author: '七月初一', genre: '历史穿越', readers: '127万', tags: ['大唐','皇族','穿越'] },
    { rank: 28, title: '电竞：我是过气老男人', author: '蝶恋花', genre: '电竞职业', readers: '117万', tags: ['电竞','职业','逆袭'] },
    { rank: 29, title: '直播：荒野求生十级大佬', author: '云中歌', genre: '直播', readers: '108万', tags: ['直播','求生','大佬'] },
    { rank: 30, title: '黑科技：我从二战穿越来', author: '青衫取醉', genre: '科技穿越', readers: '99万', tags: ['科技','穿越','工业'] },
  ],
  maleNew: [
    { rank: 1, title: '我在惊悚游戏里封神', author: '壶鱼辣椒', genre: '无限流', readers: '234万', tags: ['无限流','惊悚','封神'] },
    { rank: 2, title: '开局地摊卖大力', author: '弈青锋', genre: '都市异能', readers: '198万', tags: ['地摊','系统','搞笑'] },
    { rank: 3, title: '全职艺术家', author: '我最白', genre: '都市娱乐', readers: '176万', tags: ['艺术家','文娱','系统'] },
    { rank: 4, title: '这游戏也太真实了', author: '晨星LL', genre: '游戏异界', readers: '165万', tags: ['游戏','第四天灾','基建'] },
    { rank: 5, title: '神秘复苏', author: '佛前献花', genre: '悬疑灵异', readers: '154万', tags: ['复苏','诡异','悬疑'] },
    { rank: 6, title: '道诡异仙', author: '狐尾的笔', genre: '仙侠诡异', readers: '143万', tags: ['诡异','修仙','克苏鲁'] },
    { rank: 7, title: '深海余烬', author: '远瞳', genre: '科幻悬疑', readers: '132万', tags: ['深海','余烬','悬疑'] },
    { rank: 8, title: '灵境行者', author: '卖报小郎君', genre: '都市异能', readers: '121万', tags: ['灵境','异能','冒险'] },
    { rank: 9, title: '副本：新手村存活率1%', author: '晨星LL', genre: '无限副本', readers: '112万', tags: ['副本','生存','新手'] },
    { rank: 10, title: '这个深渊我熟', author: '狐尾的笔', genre: '深渊流', readers: '103万', tags: ['深渊','探索','诡异'] },
    { rank: 11, title: '全球高武：开局赠送武学秘籍', author: '老鹰吃小鸡', genre: '高武都市', readers: '95万', tags: ['高武','武学','都市'] },
    { rank: 12, title: '我有一座末日基地', author: '流浪的蛤蟆', genre: '末日基建', readers: '88万', tags: ['末日','基建','生存'] },
    { rank: 13, title: '诡秘：开局成为诡秘玩家', author: '爱潜水的乌贼', genre: '诡秘流', readers: '82万', tags: ['诡秘','玩家','克苏鲁'] },
    { rank: 14, title: '玩家请上车', author: '随风而行', genre: '无限流', readers: '77万', tags: ['无限','玩家','求生'] },
    { rank: 15, title: '副本：我成了女主', author: '月下蝶影', genre: '无限言情', readers: '72万', tags: ['副本','女主','快穿'] },
    { rank: 16, title: '怪谈协会的天选之子', author: '黑山老妖', genre: '怪谈流', readers: '67万', tags: ['怪谈','天选','诡异'] },
    { rank: 17, title: '全球诡异：我能解读规则', author: '风凌天下', genre: '诡异全球', readers: '62万', tags: ['诡异','规则','解读'] },
    { rank: 18, title: '末日基建：我有空间', author: '远瞳', genre: '末日基建', readers: '58万', tags: ['末日','空间','基建'] },
    { rank: 19, title: '这本游戏太诡异了', author: '二目', genre: '游戏诡异', readers: '54万', tags: ['游戏','诡异','解谜'] },
    { rank: 20, title: '第四天灾：玩家不能造反', author: '唐家三少', genre: '第四天灾', readers: '51万', tags: ['第四天灾','玩家','游戏'] },
    { rank: 21, title: '异界：开局NPC变玩家', author: '烽火戏诸侯', genre: 'NPC流', readers: '48万', tags: ['NPC','异界','系统'] },
    { rank: 22, title: '全息游戏：开局SSS隐藏职业', author: '我吃西红柿', genre: '全息游戏', readers: '45万', tags: ['全息','SSS','隐藏'] },
    { rank: 23, title: '灵气复苏：神宠系统', author: '月关', genre: '灵气复苏', readers: '42万', tags: ['灵气','宠物','系统'] },
    { rank: 24, title: '灵气复苏：开局觉醒万古龙象诀', author: '梦入神机', genre: '灵气复苏', readers: '39万', tags: ['灵气','龙象','觉醒'] },
    { rank: 25, title: '万古第一战神', author: '蝶恋花', genre: '战神流', readers: '36万', tags: ['战神','万古','无敌'] },
    { rank: 26, title: '异世主神：从洪荒开始', author: '七月初一', genre: '异世主神', readers: '34万', tags: ['主神','洪荒','异界'] },
    { rank: 27, title: '修仙：从凡人开始证道', author: '耳根', genre: '凡人修仙', readers: '32万', tags: ['凡人','修仙','证道'] },
    { rank: 28, title: '武道：从签到练气开始', author: '兵贵神速', genre: '武道签到', readers: '30万', tags: ['武道','签到','练气'] },
    { rank: 29, title: '重生：从1980年代开始', author: '七月新番', genre: '重生年代', readers: '28万', tags: ['重生','年代','创业'] },
    { rank: 30, title: '黑道：开局接管一座城', author: '王梓钧', genre: '黑道争霸', readers: '26万', tags: ['黑道','争霸','枭雄'] },
  ],
  femaleHot: [
    { rank: 1, title: '重生之我在豪门当保姆', author: '希行', genre: '现代言情', readers: '872万', tags: ['重生','豪门','逆袭'] },
    { rank: 2, title: '年代文：带着空间嫁军人', author: '吱吱', genre: '年代文', readers: '654万', tags: ['年代','军婚','空间'] },
    { rank: 3, title: '算命大佬穿成炮灰真千金', author: '关心则乱', genre: '现代玄学', readers: '598万', tags: ['玄学','真假千金','打脸'] },
    { rank: 4, title: '快穿：反派女配她有金手指', author: '千山茶客', genre: '快穿', readers: '487万', tags: ['快穿','反派','金手指'] },
    { rank: 5, title: '我在古代当神医', author: '凤轻', genre: '古代言情', readers: '423万', tags: ['古代','神医','言情'] },
    { rank: 6, title: '穿成年代文里的极品女配', author: '月下蝶影', genre: '年代文', readers: '398万', tags: ['年代','穿书','女配'] },
    { rank: 7, title: '玄学大佬下山后轰动全球', author: '冬天的柳叶', genre: '现代玄学', readers: '356万', tags: ['玄学','下山','轰动'] },
    { rank: 8, title: '重生八零：媳妇有点辣', author: '青铜穗', genre: '年代文', readers: '312万', tags: ['年代','重生','媳妇'] },
    { rank: 9, title: '我靠玄学算命暴富', author: '青铜穗', genre: '现代言情', readers: '295万', tags: ['玄学','暴富','打脸'] },
    { rank: 10, title: '大佬带我玩穿越', author: '吱吱', genre: '穿越', readers: '281万', tags: ['穿越','大佬','逆袭'] },
    { rank: 11, title: '重生七零：嫁给最穷的村医', author: '月下蝶影', genre: '年代文', readers: '267万', tags: ['年代','重生','村医'] },
    { rank: 12, title: '七零小军嫂的奋斗日常', author: '凤轻', genre: '年代文', readers: '254万', tags: ['年代','军嫂','奋斗'] },
    { rank: 13, title: '八零年代：我家的农场会赚钱', author: '希行', genre: '年代文', readers: '241万', tags: ['年代','农场','赚钱'] },
    { rank: 14, title: '重生：豪门继承人爱上我', author: '关心则乱', genre: '重生言情', readers: '228万', tags: ['重生','豪门','继承'] },
    { rank: 15, title: '嫁个学霸进部队', author: '千山茶客', genre: '言情', readers: '215万', tags: ['学霸','部队','军婚'] },
    { rank: 16, title: '末世囤货：我家有座空间', author: '冬天的柳叶', genre: '末世', readers: '203万', tags: ['末世','囤货','空间'] },
    { rank: 17, title: '古代美食家：我开了八大酒楼', author: '藤萝为枝', genre: '古代美食', readers: '191万', tags: ['古代','美食','酒楼'] },
    { rank: 18, title: '古代医妃：陛下她又跑了', author: '藤萝为枝', genre: '古代言情', readers: '180万', tags: ['古代','医妃','陛下'] },
    { rank: 19, title: '真千金她马甲又掉了', author: '凤轻', genre: '现代言情', readers: '169万', tags: ['真千金','马甲','打脸'] },
    { rank: 20, title: '病娇皇帝的偏执', author: '吱吱', genre: '古代言情', readers: '158万', tags: ['病娇','皇帝','偏执'] },
    { rank: 21, title: '团宠：全家读心后跪了', author: '月下蝶影', genre: '团宠', readers: '147万', tags: ['团宠','读心','全家'] },
    { rank: 22, title: '学霸娇娇又拿全A了', author: '希行', genre: '现代言情', readers: '137万', tags: ['学霸','娇娇','全A'] },
    { rank: 23, title: '综艺：我靠一本书爆红', author: '关心则乱', genre: '综艺', readers: '127万', tags: ['综艺','爆红','书'] },
    { rank: 24, title: '直播：我家祖宗都成精', author: '千山茶客', genre: '直播', readers: '117万', tags: ['直播','祖宗','成精'] },
    { rank: 25, title: '穿越七零：随身空间', author: '青铜穗', genre: '年代文', readers: '108万', tags: ['穿越','七零','空间'] },
    { rank: 26, title: '重生快穿：女配她又作妖了', author: '藤萝为枝', genre: '快穿', readers: '99万', tags: ['重生','快穿','女配'] },
    { rank: 27, title: '全家穿越：我成了团宠崽崽', author: '藤萝为枝', genre: '团宠', readers: '91万', tags: ['全家','穿越','团宠'] },
    { rank: 28, title: '末世重生：我有星际药园', author: '凤轻', genre: '末世', readers: '83万', tags: ['末世','重生','药园'] },
    { rank: 29, title: '古代庶女：嫡母又来挑事', author: '希行', genre: '古代言情', readers: '76万', tags: ['古代','庶女','嫡母'] },
    { rank: 30, title: '嫡公主她权倾天下', author: '关心则乱', genre: '古代言情', readers: '69万', tags: ['嫡公主','权倾','天下'] },
  ],
  femaleNew: [
    { rank: 1, title: '暴君爹爹的团宠小娇包', author: '月出云', genre: '古代言情', readers: '234万', tags: ['暴君','团宠','娇包'] },
    { rank: 2, title: '退婚后，司少追妻火葬场', author: '藤萝为枝', genre: '现代言情', readers: '198万', tags: ['退婚','追妻','火葬场'] },
    { rank: 3, title: '满级绿茶穿成小可怜', author: '春刀寒', genre: '古代言情', readers: '176万', tags: ['绿茶','穿书','小可怜'] },
    { rank: 4, title: '公主她总想弑兄', author: '白鹭成双', genre: '古代言情', readers: '165万', tags: ['公主','弑兄','权谋'] },
    { rank: 5, title: '我靠美颜稳住天下', author: '望三山', genre: '古代言情', readers: '154万', tags: ['美颜','天下','稳'] },
    { rank: 6, title: '穿成反派的我靠沙雕苟活', author: '马户子君', genre: '现代言情', readers: '143万', tags: ['反派','沙雕','苟活'] },
    { rank: 7, title: '太子妃她总想退货', author: '月出云', genre: '古代言情', readers: '135万', tags: ['太子妃','退货','搞笑'] },
    { rank: 8, title: '假千金她带着空间下山了', author: '春刀寒', genre: '现代玄学', readers: '128万', tags: ['假千金','空间','下山'] },
    { rank: 9, title: '锦鲤崽崽四岁半', author: '白鹭成双', genre: '萌宝', readers: '121万', tags: ['锦鲤','崽崽','萌宝'] },
    { rank: 10, title: '全家读心后我成了团宠', author: '望三山', genre: '团宠', readers: '115万', tags: ['读心','团宠','全家'] },
    { rank: 11, title: '反派她不想攻略男主', author: '马户子君', genre: '穿书', readers: '109万', tags: ['反派','攻略','男主'] },
    { rank: 12, title: '穿书：把男主追到家', author: '月出云', genre: '穿书', readers: '103万', tags: ['穿书','追男','甜宠'] },
    { rank: 13, title: '重生七零：种地养崽', author: '藤萝为枝', genre: '年代文', readers: '97万', tags: ['重生','七零','种田'] },
    { rank: 14, title: '八零小奶包：全家偏宠', author: '春刀寒', genre: '年代文', readers: '92万', tags: ['八零','奶包','偏宠'] },
    { rank: 15, title: '真千金重生后开了仙门', author: '白鹭成双', genre: '现代玄学', readers: '87万', tags: ['真千金','重生','仙门'] },
    { rank: 16, title: '病娇大佬的小可怜真甜', author: '望三山', genre: '现代言情', readers: '82万', tags: ['病娇','大佬','甜宠'] },
    { rank: 17, title: '摆烂：被读心后全家跪了', author: '马户子君', genre: '现代言情', readers: '77万', tags: ['摆烂','读心','全家'] },
    { rank: 18, title: '我在皇宫直播种田', author: '月出云', genre: '古代', readers: '72万', tags: ['皇宫','直播','种田'] },
    { rank: 19, title: '七零：我撩到军部少将', author: '藤萝为枝', genre: '年代文', readers: '68万', tags: ['七零','撩拨','军婚'] },
    { rank: 20, title: '修真：师父她是大佬', author: '春刀寒', genre: '修真', readers: '64万', tags: ['修真','师父','大佬'] },
    { rank: 21, title: '穿书反派的快穿日常', author: '白鹭成双', genre: '快穿', readers: '60万', tags: ['穿书','反派','快穿'] },
    { rank: 22, title: '团宠：被全家读心后跪了', author: '望三山', genre: '团宠', readers: '56万', tags: ['团宠','读心','全家'] },
    { rank: 23, title: '锦鲤崽崽：全家轮流抢着宠', author: '马户子君', genre: '萌宝', readers: '52万', tags: ['锦鲤','崽崽','团宠'] },
    { rank: 24, title: '真千金：算命后全家跪', author: '月出云', genre: '现代玄学', readers: '48万', tags: ['真千金','算命','玄学'] },
    { rank: 25, title: '假千金她又跑路了', author: '藤萝为枝', genre: '现代言情', readers: '44万', tags: ['假千金','跑路','甜宠'] },
    { rank: 26, title: '我靠美食爆红古代', author: '春刀寒', genre: '古代言情', readers: '40万', tags: ['美食','古代','爆红'] },
    { rank: 27, title: '重生末世：开局空间军婚', author: '白鹭成双', genre: '末世', readers: '37万', tags: ['重生','末世','军婚'] },
    { rank: 28, title: '错认豪门后我跑了', author: '望三山', genre: '现代言情', readers: '34万', tags: ['错认','豪门','跑路'] },
    { rank: 29, title: '假少爷他撩拨太可恶', author: '马户子君', genre: '现代言情', readers: '31万', tags: ['假少爷','撩拨','甜宠'] },
    { rank: 30, title: '师父她拽得发光', author: '月出云', genre: '修真', readers: '28万', tags: ['师父','拽','发光'] },
  ],
  jiuzhou: [
    { rank: 1, title: '短篇：最后一班车', author: '佚名', genre: '悬疑', wordCount: 32000, summary: '深夜末班车上，乘客一个接一个消失...' },
    { rank: 2, title: '短篇：镜中人', author: '佚名', genre: '惊悚', wordCount: 28000, summary: '每次照镜子，镜中的自己都在变老...' },
    { rank: 3, title: '短篇：时间商人', author: '佚名', genre: '科幻', wordCount: 45000, summary: '他用时间做交易，直到有一天自己的表停了...' },
    { rank: 4, title: '短篇：食梦貘', author: '佚名', genre: '奇幻', wordCount: 38000, summary: '专门吃噩梦的神兽，却爱上了一个做美梦的女孩...' },
    { rank: 5, title: '短篇：纸人', author: '佚名', genre: '民俗恐怖', wordCount: 21000, summary: '扎纸匠做的纸人，到了第七天会睁眼...' },
    { rank: 6, title: '短篇：记忆当铺', author: '佚名', genre: '科幻', wordCount: 42000, summary: '可以典当记忆的当铺，老板却从不赎回自己的...' },
    { rank: 7, title: '短篇：黄泉快递员', author: '佚名', genre: '灵异', wordCount: 35000, summary: '给阴间送快递，收件人地址总在变...' },
    { rank: 8, title: '短篇：电梯里的陌生人', author: '佚名', genre: '都市恐怖', wordCount: 24000, summary: '每天电梯里出现的陌生人，似乎只有我看得见...' },
    { rank: 9, title: '短篇：捡到一只塔罗', author: '佚名', genre: '奇幻', wordCount: 31000, summary: '捡到的塔罗牌预言了三天后的大地震...' },
    { rank: 10, title: '短篇：城市里的灯神', author: '佚名', genre: '奇幻', wordCount: 36000, summary: '路灯下遇到自称灯神的老头，但他只实现反方向的愿望...' },
    { rank: 11, title: '短篇：午夜超市', author: '佚名', genre: '悬疑', wordCount: 27000, summary: '凌晨三点的超市货架上，出现了死去之人的商品...' },
    { rank: 12, title: '短篇：守墓人手记', author: '佚名', genre: '民俗恐怖', wordCount: 33000, summary: '守墓人发现墓碑上的照片，每晚都在变...' },
    { rank: 13, title: '短篇：阴阳五行馆', author: '佚名', genre: '民俗', wordCount: 29000, summary: '老城区的五行馆，进去的人五行必缺一行...' },
    { rank: 14, title: '短篇：网购冥币事件', author: '佚名', genre: '都市怪谈', wordCount: 22000, summary: '网购的冥币快递里，夹着一张我自己的讣告...' },
    { rank: 15, title: '短篇：第七条短信', author: '佚名', genre: '悬疑', wordCount: 26000, summary: '收到第六条短信的人会在七天后死亡，我是第七条...' },
    { rank: 16, title: '短篇：图书馆的最后一本书', author: '佚名', genre: '科幻', wordCount: 34000, summary: '图书馆最后一本书，写满了还没发生的事...' },
    { rank: 17, title: '短篇：奇异房东', author: '佚名', genre: '都市怪谈', wordCount: 25000, summary: '房东只在凌晨收租，每次涨价对应一个住户的消失...' },
    { rank: 18, title: '短篇：第八小区惊魂', author: '佚名', genre: '恐怖', wordCount: 30000, summary: '小区只有七栋楼，但外卖软件上显示第八栋...' },
    { rank: 19, title: '短篇：相片里的陌生人', author: '佚名', genre: '惊悚', wordCount: 28000, summary: '全家福里多出一个不认识的人，而且每张照片都有他...' },
    { rank: 20, title: '短篇：植物寄主', author: '佚名', genre: '科幻恐怖', wordCount: 32000, summary: '植物园的新品种，开花时会长出人脸...' },
    { rank: 21, title: '短篇：监控里的影子', author: '佚名', genre: '悬疑', wordCount: 27000, summary: '监控显示深夜有人在我床边站了一整晚，但我独居...' },
    { rank: 22, title: '短篇：那只镜子的回声', author: '佚名', genre: '惊悚', wordCount: 29000, summary: '镜子里的我比现实快三秒，当我对上她的眼睛时...' },
    { rank: 23, title: '短篇：电视频道', author: '佚名', genre: '科幻', wordCount: 35000, summary: '老式电视机出现了不存在的频道，播放的是明天的我...' },
    { rank: 24, title: '短篇：水井旁的孩子', author: '佚名', genre: '民俗恐怖', wordCount: 23000, summary: '井边的孩子让我帮他找妈妈，但他的妈妈三十年前就死了...' },
    { rank: 25, title: '短篇：网购噩梦', author: '佚名', genre: '都市怪谈', wordCount: 31000, summary: '网购的商品和梦里的一模一样，而梦是预知...' },
    { rank: 26, title: '短篇：消失的舍友', author: '佚名', genre: '悬疑', wordCount: 26000, summary: '宿舍只剩三个人，但床位是四个，宿管说一直只有三人...' },
    { rank: 27, title: '短篇：午夜电台', author: '佚名', genre: '灵异', wordCount: 33000, summary: '午夜电台的点播人，都是已经去世的听众...' },
    { rank: 28, title: '短篇：废弃公寓的房间', author: '佚名', genre: '恐怖', wordCount: 28000, summary: '废弃公寓的四零四房间，每晚都亮着灯...' },
    { rank: 29, title: '短篇：末班地铁', author: '佚名', genre: '悬疑', wordCount: 30000, summary: '末班地铁多了一站，站名是我家小区，但小区十年前就拆了...' },
    { rank: 30, title: '短篇：旧照片中的女人', author: '佚名', genre: '惊悚', wordCount: 27000, summary: '二十年前的老照片里，站在我身后的女人，和我长得一样...' },
  ],
};

// 短篇书籍榜单（≤5万字）
const BOOK_LISTS_SHORT: Record<string, Array<any>> = {
  maleHot: [
    { rank: 1, title: '规则怪谈：我完美通关了', author: '夜行月', genre: '悬疑短篇', readers: '456万', tags: ['规则怪谈','智斗','短篇'] },
    { rank: 2, title: '我在惊悚副本封神', author: '壶鱼辣椒', genre: '无限短篇', readers: '398万', tags: ['无限流','副本','封神'] },
    { rank: 3, title: '诡异降临：安全屋求生', author: '爱潜水的乌贼', genre: '诡异短篇', readers: '342万', tags: ['诡异','生存','金手指'] },
    { rank: 4, title: '国运：开局召唤神级英雄', author: '唐家三少', genre: '国运短篇', readers: '287万', tags: ['国运','召唤','爽文'] },
    { rank: 5, title: '修仙：从杂役开始签到', author: '耳根', genre: '修仙短篇', readers: '234万', tags: ['签到','凡人流','长生'] },
    { rank: 6, title: '高武：我的细胞进化了', author: '我吃西红柿', genre: '高武短篇', readers: '198万', tags: ['进化流','系统','爽文'] },
    { rank: 7, title: '末日：我在安全屋囤货', author: '会说话的肘子', genre: '末日短篇', readers: '176万', tags: ['囤货','基建','生存'] },
    { rank: 8, title: '星际：我在荒星种田', author: '远瞳', genre: '科幻种田', readers: '154万', tags: ['种田','基建','美食'] },
    { rank: 9, title: '全民模拟：预演无数次', author: '蝴蝶蓝', genre: '模拟短篇', readers: '142万', tags: ['模拟','预知','短篇'] },
    { rank: 10, title: '签到：在帝京打卡一千年', author: '蛇皮怪', genre: '签到短篇', readers: '131万', tags: ['签到','无敌','短篇'] },
    { rank: 11, title: '我以读经入圣', author: '老鹰吃小鸡', genre: '文道短篇', readers: '121万', tags: ['文道','儒修','短篇'] },
    { rank: 12, title: '师父，剑修真的能种田吗', author: '流浪的蛤蟆', genre: '仙侠短篇', readers: '112万', tags: ['师徒','种田','短篇'] },
    { rank: 13, title: '万族战场：培养出无敌天骄', author: '黑山老妖', genre: '万族短篇', readers: '103万', tags: ['万族','培养','短篇'] },
    { rank: 14, title: '综武：天下第一大剑客', author: '月关', genre: '武侠短篇', readers: '95万', tags: ['综武','剑客','短篇'] },
    { rank: 15, title: '我在异界做外卖小哥', author: '二目', genre: '都市短篇', readers: '88万', tags: ['外卖','异界','短篇'] },
    { rank: 16, title: '我有一座万界聊天群', author: '圣骑士的传说', genre: '都市短篇', readers: '81万', tags: ['聊天群','诸天','短篇'] },
    { rank: 17, title: '都市修仙：开局降妖天眼', author: '愤怒的香蕉', genre: '修仙短篇', readers: '75万', tags: ['都市','修仙','短篇'] },
    { rank: 18, title: '神探：在民国推理', author: '卓识', genre: '悬疑短篇', readers: '69万', tags: ['神探','推理','短篇'] },
    { rank: 19, title: '海贼：我是黑胡子的副船长', author: '六道沉沦', genre: '海贼短篇', readers: '64万', tags: ['海贼','衍生','短篇'] },
    { rank: 20, title: '火影：开局拥有写轮眼', author: '飘逸的火', genre: '火影短篇', readers: '59万', tags: ['火影','写轮眼','短篇'] },
  ],
  maleNew: [
    { rank: 1, title: '副本：新手村存活率1%', author: '晨星LL', genre: '无限短篇', readers: '198万', tags: ['副本','生存','新手'] },
    { rank: 2, title: '诡异复苏：我驾驭了它', author: '佛前献花', genre: '诡异短篇', readers: '165万', tags: ['复苏','诡异','驾驭'] },
    { rank: 3, title: '开局地摊卖大力', author: '弈青锋', genre: '都市短篇', readers: '143万', tags: ['地摊','系统','搞笑'] },
    { rank: 4, title: '神秘复苏：民间调查员', author: '我会修空调', genre: '灵异短篇', readers: '121万', tags: ['灵异','调查','复苏'] },
    { rank: 5, title: '这游戏也太真实了', author: '晨星LL', genre: '游戏短篇', readers: '98万', tags: ['游戏','第四天灾','真实'] },
    { rank: 6, title: '这个深渊我熟', author: '狐尾的笔', genre: '深渊短篇', readers: '89万', tags: ['深渊','探索','短篇'] },
    { rank: 7, title: '全球高武：开局赠送武学秘籍', author: '老鹰吃小鸡', genre: '高武短篇', readers: '81万', tags: ['高武','武学','短篇'] },
    { rank: 8, title: '我有一座末日基地', author: '流浪的蛤蟆', genre: '末日短篇', readers: '74万', tags: ['末日','基地','短篇'] },
    { rank: 9, title: '诡秘：开局成为诡秘玩家', author: '爱潜水的乌贼', genre: '诡秘短篇', readers: '68万', tags: ['诡秘','玩家','短篇'] },
    { rank: 10, title: '玩家请上车', author: '随风而行', genre: '无限短篇', readers: '62万', tags: ['无限','玩家','短篇'] },
    { rank: 11, title: '副本：我成了女主', author: '月下蝶影', genre: '副本短篇', readers: '57万', tags: ['副本','女主','短篇'] },
    { rank: 12, title: '怪谈协会的天选之子', author: '黑山老妖', genre: '怪谈短篇', readers: '52万', tags: ['怪谈','天选','短篇'] },
    { rank: 13, title: '全球诡异：我能解读规则', author: '风凌天下', genre: '诡异短篇', readers: '48万', tags: ['诡异','规则','短篇'] },
    { rank: 14, title: '末日基建：我有空间', author: '远瞳', genre: '末日短篇', readers: '44万', tags: ['末日','空间','短篇'] },
    { rank: 15, title: '这本游戏太诡异了', author: '二目', genre: '游戏短篇', readers: '40万', tags: ['游戏','诡异','短篇'] },
    { rank: 16, title: '第四天灾：玩家不能造反', author: '唐家三少', genre: '天灾短篇', readers: '37万', tags: ['天灾','玩家','短篇'] },
    { rank: 17, title: '异界：开局NPC变玩家', author: '烽火戏诸侯', genre: 'NPC短篇', readers: '34万', tags: ['NPC','异界','短篇'] },
    { rank: 18, title: '全息游戏：开局SSS隐藏职业', author: '我吃西红柿', genre: '全息短篇', readers: '31万', tags: ['全息','SSS','短篇'] },
    { rank: 19, title: '灵气复苏：神宠系统', author: '月关', genre: '灵气短篇', readers: '28万', tags: ['灵气','宠物','短篇'] },
    { rank: 20, title: '灵气复苏：开局觉醒万古龙象诀', author: '梦入神机', genre: '灵气短篇', readers: '26万', tags: ['灵气','龙象','短篇'] },
  ],
  femaleHot: [
    { rank: 1, title: '真假千金：算命大佬归来', author: '关心则乱', genre: '玄学短篇', readers: '523万', tags: ['玄学','真假千金','打脸'] },
    { rank: 2, title: '重生八零：媳妇有点辣', author: '青铜穗', genre: '年代短篇', readers: '398万', tags: ['年代','重生','军婚'] },
    { rank: 3, title: '快穿：反派女配她有金手指', author: '千山茶客', genre: '快穿短篇', readers: '287万', tags: ['快穿','反派','金手指'] },
    { rank: 4, title: '暴君爹爹的团宠小娇包', author: '月出云', genre: '团宠短篇', readers: '234万', tags: ['团宠','萌宝','宫廷'] },
    { rank: 5, title: '穿成年代文里的极品女配', author: '月下蝶影', genre: '穿书短篇', readers: '198万', tags: ['穿书','女配','年代'] },
    { rank: 6, title: '玄学大佬下山后轰动全球', author: '冬天的柳叶', genre: '玄学短篇', readers: '165万', tags: ['玄学','下山','轰动'] },
    { rank: 7, title: '我在古代当神医', author: '凤轻', genre: '古言短篇', readers: '132万', tags: ['古代','神医','言情'] },
    { rank: 8, title: '我靠玄学算命暴富', author: '青铜穗', genre: '现代短篇', readers: '121万', tags: ['玄学','暴富','短篇'] },
    { rank: 9, title: '大佬带我玩穿越', author: '吱吱', genre: '穿越短篇', readers: '112万', tags: ['穿越','大佬','短篇'] },
    { rank: 10, title: '重生七零：嫁给最穷的村医', author: '月下蝶影', genre: '年代短篇', readers: '103万', tags: ['重生','七零','短篇'] },
    { rank: 11, title: '七零小军嫂的奋斗日常', author: '凤轻', genre: '年代短篇', readers: '95万', tags: ['年代','军嫂','短篇'] },
    { rank: 12, title: '八零年代：我家的农场会赚钱', author: '希行', genre: '年代短篇', readers: '88万', tags: ['年代','农场','短篇'] },
    { rank: 13, title: '重生：豪门继承人爱上我', author: '关心则乱', genre: '重生短篇', readers: '81万', tags: ['重生','豪门','短篇'] },
    { rank: 14, title: '嫁个学霸进部队', author: '千山茶客', genre: '言情短篇', readers: '75万', tags: ['学霸','部队','短篇'] },
    { rank: 15, title: '末世囤货：我家有座空间', author: '冬天的柳叶', genre: '末世短篇', readers: '69万', tags: ['末世','囤货','短篇'] },
    { rank: 16, title: '古代美食家：我开了八大酒楼', author: '藤萝为枝', genre: '美食短篇', readers: '64万', tags: ['古代','美食','短篇'] },
    { rank: 17, title: '古代医妃：陛下她又跑了', author: '藤萝为枝', genre: '古代短篇', readers: '59万', tags: ['古代','医妃','短篇'] },
    { rank: 18, title: '真千金她马甲又掉了', author: '凤轻', genre: '现代短篇', readers: '55万', tags: ['真千金','马甲','短篇'] },
    { rank: 19, title: '病娇皇帝的偏执', author: '吱吱', genre: '古代短篇', readers: '51万', tags: ['病娇','皇帝','短篇'] },
    { rank: 20, title: '团宠：全家读心后跪了', author: '月下蝶影', genre: '团宠短篇', readers: '47万', tags: ['团宠','读心','短篇'] },
  ],
  femaleNew: [
    { rank: 1, title: '退婚后，司少追妻火葬场', author: '藤萝为枝', genre: '追妻短篇', readers: '234万', tags: ['退婚','追妻','火葬场'] },
    { rank: 2, title: '满级绿茶穿成小可怜', author: '春刀寒', genre: '穿书短篇', readers: '198万', tags: ['绿茶','穿书','小可怜'] },
    { rank: 3, title: '公主她总想弑兄', author: '白鹭成双', genre: '权谋短篇', readers: '165万', tags: ['公主','弑兄','权谋'] },
    { rank: 4, title: '我靠美颜稳住天下', author: '望三山', genre: '宫斗短篇', readers: '143万', tags: ['美颜','天下','稳'] },
    { rank: 5, title: '穿成反派的我靠沙雕苟活', author: '马户子君', genre: '沙雕短篇', readers: '121万', tags: ['反派','沙雕','苟活'] },
    { rank: 6, title: '暴君爹爹的团宠小娇包', author: '月出云', genre: '团宠短篇', readers: '98万', tags: ['团宠','萌宝','宫廷'] },
    { rank: 7, title: '太子妃她总想退货', author: '月出云', genre: '古代短篇', readers: '90万', tags: ['太子妃','退货','短篇'] },
    { rank: 8, title: '假千金她带着空间下山了', author: '春刀寒', genre: '玄学短篇', readers: '83万', tags: ['假千金','空间','短篇'] },
    { rank: 9, title: '锦鲤崽崽四岁半', author: '白鹭成双', genre: '萌宝短篇', readers: '76万', tags: ['锦鲤','崽崽','短篇'] },
    { rank: 10, title: '全家读心后我成了团宠', author: '望三山', genre: '团宠短篇', readers: '70万', tags: ['读心','团宠','短篇'] },
    { rank: 11, title: '反派她不想攻略男主', author: '马户子君', genre: '穿书短篇', readers: '65万', tags: ['反派','攻略','短篇'] },
    { rank: 12, title: '穿书：把男主追到家', author: '月出云', genre: '穿书短篇', readers: '60万', tags: ['穿书','追男','短篇'] },
    { rank: 13, title: '重生七零：种地养崽', author: '藤萝为枝', genre: '年代短篇', readers: '56万', tags: ['重生','七零','短篇'] },
    { rank: 14, title: '八零小奶包：全家偏宠', author: '春刀寒', genre: '年代短篇', readers: '52万', tags: ['八零','奶包','短篇'] },
    { rank: 15, title: '真千金重生后开了仙门', author: '白鹭成双', genre: '玄学短篇', readers: '48万', tags: ['真千金','重生','短篇'] },
    { rank: 16, title: '病娇大佬的小可怜真甜', author: '望三山', genre: '现代短篇', readers: '44万', tags: ['病娇','大佬','短篇'] },
    { rank: 17, title: '摆烂：被读心后全家跪了', author: '马户子君', genre: '现代短篇', readers: '41万', tags: ['摆烂','读心','短篇'] },
    { rank: 18, title: '我在皇宫直播种田', author: '月出云', genre: '古代短篇', readers: '38万', tags: ['皇宫','直播','短篇'] },
    { rank: 19, title: '七零：我撩到军部少将', author: '藤萝为枝', genre: '年代短篇', readers: '35万', tags: ['七零','撩拨','短篇'] },
    { rank: 20, title: '修真：师父她是大佬', author: '春刀寒', genre: '修真短篇', readers: '32万', tags: ['修真','师父','短篇'] },
  ],
};

// 风向标数据：AI分析热门榜单给出的创作风向
const WIND_VANES: Record<string, { title: string; tags: string[]; summary: string; suggestion: string; avoid: string }> = {
  platform: {
    title: '全网热搜风向',
    tags: ['转职流', '规则怪谈', '囤货文'],
    summary: '近期全网热搜以"转职流+系统"组合最为火爆，规则怪谈类从悬疑圈向主流破圈，末世囤货文在短视频平台持续高热度。',
    suggestion: '建议关注：① 转职流+签到/模拟器组合 ② 规则怪谈+直播/曝光元素 ③ 囤货文+基建/经营双线',
    avoid: '避免：① 传统退婚流开局 ② 纯修仙无创新设定 ③ 系统过于套路化',
  },
  maleHot: {
    title: '男频热度风向标',
    tags: ['转职流', '规则怪谈', '进化流'],
    summary: '男频热度榜Top10中，游戏异界类占比40%，悬疑灵异类上升最快。读者偏好"金手指明确+升级路径清晰"的爽文结构。',
    suggestion: '创作建议：① 开局3章内必须亮出核心金手指 ② 每5章设置一个小爽点 ③ 副本/关卡设计要差异化',
    avoid: '避坑指南：① 不要慢热超过10章 ② 避免无逻辑开挂 ③ 配角不要全员降智',
  },
  maleNew: {
    title: '男频新书风向标',
    tags: ['无限流', '第四天灾', '克苏鲁'],
    summary: '新书榜呈现"无限流+副本创新"和"第四天灾+玩家视角"两大趋势。克苏鲁元素与修仙/科幻融合成为新方向。',
    suggestion: '新书机会：① 无限流+国风副本（西游、封神）② 第四天灾+经营建设 ③ 诡异修仙+克苏鲁',
    avoid: '新书雷区：① 跟风已有爆款设定无创新 ② 副本过于复杂读者看不懂 ③ 开局设定过多信息轰炸',
  },
  femaleHot: {
    title: '女频热度风向标',
    tags: ['真假千金', '年代军婚', '玄学算命'],
    summary: '女频热度榜以"打脸爽感+情感拉扯"为核心，真假千金类持续霸榜，年代文军婚题材35+读者黏性极高。',
    suggestion: '创作建议：① 真假千金类增加"马甲/多重身份"反转 ② 年代文侧重"事业线+感情线"双驱动 ③ 玄学类绑定"直播/综艺"现代场景',
    avoid: '避坑指南：① 不要圣母女主 ② 避免男主出场过晚 ③ 感情戏不要拖沓超过30章',
  },
  femaleNew: {
    title: '女频新书风向标',
    tags: ['团宠', '穿书反派', '沙雕'],
    summary: '新书榜"团宠"题材爆发式增长，穿书反派自救类创新空间大。沙雕文风在年轻读者中接受度高。',
    suggestion: '新书机会：① 团宠+全家读心术 ② 穿书反派+系统强制走剧情 ③ 沙雕+权谋/宫斗反差',
    avoid: '新书雷区：① 团宠过于无脑 ② 反派洗白缺乏逻辑 ③ 沙雕过度变成尬笑',
  },
  jiuzhou: {
    title: '九州短篇风向标',
    tags: ['民俗恐怖', '科幻概念', '悬疑反转'],
    summary: '九州短篇榜以"民俗恐怖+传统文化"和"科幻概念+情感内核"两大类为主。短篇要求开头即钩子，结尾强反转。',
    suggestion: '创作建议：① 民俗恐怖绑定真实地域传说 ② 科幻短篇以一个概念驱动 ③ 悬疑类采用"不可靠叙述者"视角',
    avoid: '避坑指南：① 不要开头铺垫过长 ② 避免反转缺乏伏笔 ③ 不要为恐怖而恐怖无内核',
  },
};

// 短篇风向标（≤5万字）
const SHORT_WIND_VANES: Record<string, { title: string; tags: string[]; summary: string; suggestion: string; avoid: string }> = {
  maleHot: {
    title: '男频短篇热度风向标',
    tags: ['规则怪谈', '无限副本', '诡异生存'],
    summary: '男频短篇以"规则怪谈+副本解密"和"诡异降临+生存建造"为主流。短篇要求3章内亮出核心设定，结尾强悬念。',
    suggestion: '创作建议：① 开局直接切入规则/副本场景 ② 每章结尾留钩子 ③ 设定要新颖但解释简洁',
    avoid: '避坑指南：① 不要铺垫超过1章 ② 避免设定过于复杂读者看不懂 ③ 不要开放式结尾无收束',
  },
  maleNew: {
    title: '男频短篇新书风向标',
    tags: ['副本创新', '诡异驾驭', '游戏真实'],
    summary: '新书短篇呈现"副本机制创新"和"诡异+建设"两大趋势。读者偏好"金手指明确+节奏极快"的短篇结构。',
    suggestion: '新书机会：① 副本+国风元素（西游副本、封神副本）② 诡异+经营建设 ③ 游戏异界+真实感',
    avoid: '新书雷区：① 跟风已有爆款设定无创新 ② 开局设定过多信息轰炸 ③ 副本规则过于复杂',
  },
  femaleHot: {
    title: '女频短篇热度风向标',
    tags: ['真假千金', '快穿打脸', '年代军婚'],
    summary: '女频短篇以"打脸爽感+快节奏"为核心，真假千金类持续霸榜，快穿单元剧在短篇中表现极佳。',
    suggestion: '创作建议：① 真假千金增加"马甲/多重身份"反转 ② 快穿每世界独立成篇 ③ 年代文侧重温馨日常',
    avoid: '避坑指南：① 不要圣母女主 ② 避免男主出场过晚 ③ 感情戏不要拖沓',
  },
  femaleNew: {
    title: '女频短篇新书风向标',
    tags: ['团宠萌宝', '穿书反派', '沙雕甜宠'],
    summary: '新书短篇"团宠+萌宝"题材爆发，穿书反派自救类创新空间大。沙雕文风在年轻读者中接受度高。',
    suggestion: '新书机会：① 团宠+全家读心术 ② 穿书反派+系统强制走剧情 ③ 沙雕+权谋反差',
    avoid: '新书雷区：① 团宠过于无脑 ② 反派洗白缺乏逻辑 ③ 沙雕过度变成尬笑',
  },
};

// 爆款灵感生成（Part2）
const BOOK_ANALYSIS: Record<string, Array<{
  title: string;
  hotSpot: string;
  goldenFinger: string;
  coreHook: string;
  character: string;
  firstChapter: string;
}>> = {
  maleHot: [
    {
      title: '全民转职：开局觉醒SSS级天赋',
      hotSpot: '转职流+天赋升级双重爽点，开局即巅峰满足读者即时爽感需求',
      goldenFinger: '开局觉醒SSS级唯一隐藏职业，每次转职都能获得神话级技能',
      coreHook: '① 废物职业逆袭成神级 ② 越级挑战秒杀高阶 ③ 隐藏副本独占资源 ④ 全球公告打脸全场',
      character: '主角：冷静理智型，表面低调实则掌控全局，善于借势。配角：势利眼同学→后期跪舔，傲慢公会会长→被打脸收服',
      firstChapter: '开局检测出F级废物职业被全校嘲笑，转职仪式当晚触发隐藏条件觉醒SSS级，全球公告震撼全场，班主任当场变脸求合作',
    },
    {
      title: '规则怪谈：我能完美利用规则',
      hotSpot: '规则怪谈+智斗爽点，读者参与感强，每章结尾悬念钩子足',
      goldenFinger: '能看穿规则中的隐藏漏洞和逻辑陷阱，将必死规则转化为有利条件',
      coreHook: '① 在死亡规则中找到生路 ② 利用规则反杀怪谈生物 ③ 副本评分SSS震惊全球 ④ 其他国家的天选者跪求攻略',
      character: '主角：高智商冷静型，擅长逻辑推理，表面冷漠内心有底线。配角：各国天选者，有傲慢型/怯懦型/合作型多种对照',
      firstChapter: '被选中进入怪谈副本，其他天选者慌乱逃窜，主角冷静分析规则漏洞，在第一条必死规则中反杀怪谈生物，全球直播震撼',
    },
    {
      title: '高武：我的细胞可以无限进化',
      hotSpot: '进化流+数据面板，升级可视化，每次进化都有新能力期待感强',
      goldenFinger: '每个细胞都能独立进化，可以吞噬异兽基因获得其能力，无上限进化',
      coreHook: '① 吞噬神兽获得神级能力 ② 细胞分裂制造分身 ③ 肉身成圣硬抗核武 ④ 进化出独一无二的形态',
      character: '主角：坚韧型，从底层崛起，有科学思维。配角：科研天才女友，军方大佬伯乐，宿敌型异族天才',
      firstChapter: '武考前一天被判定为废体无法修炼，绝望之际觉醒细胞进化系统，吞噬第一只异兽后战斗力飙升，武考一鸣惊人',
    },
  ],
  maleNew: [
    {
      title: '我在惊悚游戏里封神',
      hotSpot: '无限流+副本解密，副本设计精巧，恐怖氛围+智谋爽感并重',
      goldenFinger: '能在死亡副本中读取隐藏线索，预判BOSS行动轨迹，找到最优通关路径',
      coreHook: '① 必死副本全员存活通关 ② 与BOSS谈判反客为主 ③ 组建最强玩家团队 ④ 揭开惊悚游戏真相',
      character: '主角：理性冷静型，有心理学背景，擅长心理博弈。配角：疯批美人队友、腹黑NPC、亦敌亦友的竞争者',
      firstChapter: '新手副本存活率1%，主角凭借观察力和冷静分析发现隐藏规则，带领全队通关，获得唯一隐藏称号',
    },
    {
      title: '神秘复苏',
      hotSpot: '诡异复苏+民俗恐怖，氛围营造极致，设定严谨世界观宏大',
      goldenFinger: '体内封印了一只诡异，可以借用诡异的力量对抗其他诡异，但每次使用都会被侵蚀',
      coreHook: '① 驾驭诡异获得超能力 ② 灵异事件调查员身份 ③ 各大诡异势力博弈 ④ 寻找复苏真相拯救世界',
      character: '主角：沉稳内敛型，有牺牲精神，在人性与诡异之间挣扎。配角：神秘组织成员、民间异人、逐渐失控的伙伴',
      firstChapter: '普通人卷入诡异事件濒死之际，意外与诡异融合共生，获得超自然能力的同时面临被吞噬的风险',
    },
  ],
  femaleHot: [
    {
      title: '重生之我在豪门当保姆',
      hotSpot: '重生+豪门+逆袭，保姆身份反差感强，打脸节奏密集',
      goldenFinger: '重生后拥有前世记忆，知道所有人的秘密和把柄，掌握豪门命脉',
      coreHook: '① 保姆身份拿捏豪门众人 ② 前世仇人一个个打脸 ③ 被霸总男主另眼相看 ④ 揭开前世死亡真相',
      character: '女主：聪慧坚韧型，表面卑微实则掌控全局，有仇必报。男主：高冷霸总型，逐渐被女主吸引。反派：前世害死女主的绿茶/渣男',
      firstChapter: '重生回到被雇佣为保姆的第一天，面对前世害死自己的仇人，表面恭敬顺从，暗中开始布局复仇',
    },
    {
      title: '算命大佬穿成炮灰真千金',
      hotSpot: '玄学+真假千金，双重打脸爽感，算命设定新颖有趣',
      goldenFinger: '拥有真传玄学能力，算命看相驱邪抓鬼样样精通，能看透他人命格和因果',
      coreHook: '① 算命打脸假千金 ② 帮助豪门化解危机 ③ 直播算命全网爆红 ④ 收服各种灵异事件',
      character: '女主：洒脱随性型，实力强大但低调，嘴毒心善。男主：高冷军官/总裁型，一开始不信玄学后被折服。反派：假千金+偏心父母',
      firstChapter: '刚被接回豪门就被假千金陷害，当场展示算命能力说出家族隐秘，全家人震惊，假千金脸色大变',
    },
    {
      title: '年代文：带着空间嫁军人',
      hotSpot: '年代+军婚+空间，情怀与爽感兼具，年代细节真实感强',
      goldenFinger: '拥有种植空间，可以种出高品质农作物和药材，在物资匮乏年代如鱼得水',
      coreHook: '① 空间物资改善生活 ② 做美食/做生意发家致富 ③ 军嫂生活温馨日常 ④ 打脸看不起自己的亲戚',
      character: '女主：勤劳智慧型，独立自强，会利用空间改善生活。男主：正直军人型，宠妻护短有担当。配角：极品亲戚、军区家属院姐妹',
      firstChapter: '重生回出嫁当天，决定改变命运嫁给军人男主，利用空间准备嫁妆，让所有人刮目相看',
    },
  ],
  femaleNew: [
    {
      title: '暴君爹爹的团宠小娇包',
      hotSpot: '团宠+萌宝+宫廷，萌宝视角新颖，全家宠爱的极致甜宠',
      goldenFinger: '拥有能让暴君父亲心软的特殊能力（可爱/预知/锦鲤体质），是全皇宫的团宠',
      coreHook: '① 萌宝一句话改变朝局 ② 暴君父亲为她打破原则 ③ 皇兄们争着宠妹妹 ④ 用天真化解宫廷阴谋',
      character: '女主：天真可爱型，表面软糯实则聪明。男主（父亲）：冷酷暴君型，唯独对女儿温柔。皇兄们：各有特色的宠妹狂魔',
      firstChapter: '穿越成小公主，第一次见暴君父亲就用天真无邪化解了他的杀意，从此开启团宠生涯',
    },
    {
      title: '退婚后，司少追妻火葬场',
      hotSpot: '追妻火葬场+马甲，前期虐后期爽，情感拉扯张力足',
      goldenFinger: '被退婚后觉醒多重马甲身份（设计师/神医/黑客等），每一个身份都让前夫后悔',
      coreHook: '① 退婚后华丽变身 ② 前夫追悔莫及 ③ 新男主霸道护妻 ④ 马甲一个个揭开打脸',
      character: '女主：独立自强型，不依附男人，有实力有底气。男主（新）：腹黑霸总型，从一开始就认定女主。前夫：自大后悔型',
      firstChapter: '婚礼当天被退婚羞辱，女主冷静接受并当场展示真实实力，前夫和新男主同时震惊',
    },
  ],
  jiuzhou: [
    {
      title: '短篇：最后一班车',
      hotSpot: '都市怪谈+悬疑反转，短篇节奏快，结尾反转震撼',
      goldenFinger: '能看到死亡倒计时，必须在时间耗尽前找到生路',
      coreHook: '① 末班车上的乘客各有秘密 ② 每到一站就有人消失 ③ 发现自己是司机 ④ 真相是拯救亡灵',
      character: '主角：普通人被迫卷入超自然事件，在恐惧中逐渐觉醒。配角：末班车上的亡灵乘客，每个人都有自己的故事',
      firstChapter: '加班到深夜赶上最后一班公交，发现车上乘客举止怪异，手机显示死亡倒计时开始',
    },
    {
      title: '短篇：记忆当铺',
      hotSpot: '科幻+情感，设定新颖，每段记忆都是一个感人故事',
      goldenFinger: '经营一家可以典当记忆的当铺，可以看到客人的记忆并从中获取特殊能力',
      coreHook: '① 每个客人的记忆都是一个故事 ② 通过记忆破案/救人 ③ 发现当铺老板自己的秘密 ④ 记忆与现实的交织',
      character: '主角：神秘当铺老板，表面冷漠实则善良。客人：各有遗憾和执念的普通人',
      firstChapter: '新客人典当记忆换钱，主角进入记忆后发现一桩陈年冤案，决定帮助客人完成心愿',
    },
  ],
};

// 短篇爆款灵感（≤5万字）
const SHORT_BOOK_ANALYSIS: Record<string, Array<{
  title: string;
  hotSpot: string;
  goldenFinger: string;
  coreHook: string;
  character: string;
  firstChapter: string;
}>> = {
  maleHot: [
    {
      title: '规则怪谈：我完美通关了',
      hotSpot: '规则怪谈+副本解密，短篇节奏极快，每章一个规则场景',
      goldenFinger: '能看穿规则中的隐藏漏洞，将必死规则转化为有利条件',
      coreHook: '① 在死亡规则中找到生路 ② 利用规则反杀怪谈生物 ③ 副本评分SSS震惊全球',
      character: '主角：高智商冷静型，擅长逻辑推理。配角：各国天选者对照',
      firstChapter: '被选中进入怪谈副本，其他天选者慌乱逃窜，主角冷静分析规则漏洞，在第一条必死规则中反杀怪谈生物',
    },
    {
      title: '诡异降临：安全屋求生',
      hotSpot: '诡异+生存建造，短篇快节奏，每晚一个诡异事件',
      goldenFinger: '拥有一座可以升级的安全屋，能抵御各种诡异袭击',
      coreHook: '① 每晚抵御诡异袭击 ② 收集材料升级安全屋 ③ 探索外界寻找幸存者 ④ 揭开诡异降临真相',
      character: '主角：坚韧务实型，从底层崛起。配角：幸存者队友，各有特长',
      firstChapter: '诡异降临第一天，主角凭借预知的金手指提前建造安全屋，第一波诡异袭击中安全屋成为唯一避难所',
    },
  ],
  maleNew: [
    {
      title: '副本：新手村存活率1%',
      hotSpot: '副本创新+国风元素，短篇每副本独立成篇',
      goldenFinger: '能在副本中读取隐藏线索，预判BOSS行动轨迹',
      coreHook: '① 必死副本全员存活通关 ② 与BOSS谈判反客为主 ③ 组建最强玩家团队',
      character: '主角：理性冷静型，有心理学背景。配角：疯批美人队友、腹黑NPC',
      firstChapter: '新手副本存活率1%，主角凭借观察力和冷静分析发现隐藏规则，带领全队通关',
    },
  ],
  femaleHot: [
    {
      title: '真假千金：算命大佬归来',
      hotSpot: '玄学+真假千金，短篇快节奏，每章一个打脸场景',
      goldenFinger: '拥有真传玄学能力，算命看相驱邪抓鬼样样精通',
      coreHook: '① 算命打脸假千金 ② 帮助豪门化解危机 ③ 直播算命全网爆红 ④ 收服各种灵异事件',
      character: '女主：洒脱随性型，实力强大但低调。男主：高冷军官/总裁型',
      firstChapter: '刚被接回豪门就被假千金陷害，当场展示算命能力说出家族隐秘，全家人震惊',
    },
    {
      title: '快穿：反派女配她有金手指',
      hotSpot: '快穿+打脸，短篇每世界独立成篇，节奏极快',
      goldenFinger: '每个世界都有专属金手指，可以改变命运',
      coreHook: '① 每个世界逆袭打脸 ② 攻略不同世界男主 ③ 收集能量升级金手指 ④ 揭开快穿系统真相',
      character: '女主：聪慧坚韧型，不依附男人。男主：每个世界不同性格',
      firstChapter: '穿越成炮灰女配，面对必死结局，女主冷静分析剧情走向，利用金手指反杀',
    },
  ],
  femaleNew: [
    {
      title: '团宠萌宝：暴君爹爹为我破例',
      hotSpot: '团宠+萌宝，短篇温馨日常，每章一个萌点',
      goldenFinger: '拥有能让暴君父亲心软的特殊能力',
      coreHook: '① 萌宝一句话改变朝局 ② 暴君父亲为她打破原则 ③ 皇兄们争着宠妹妹',
      character: '女主：天真可爱型，表面软糯实则聪明。男主（父亲）：冷酷暴君型',
      firstChapter: '穿越成小公主，第一次见暴君父亲就用天真无邪化解了他的杀意',
    },
  ],
};

const HOT_INSPIRATIONS: Record<string, Array<{ word: string; trend: string; analysis: string }>> = {
  maleHot: [
    { word: '转职流', trend: '🔥🔥🔥 持续火爆', analysis: '游戏+异界双重爽点，读者黏性强' },
    { word: '规则怪谈', trend: '🔥🔥🔥 上升最快', analysis: '悬疑+智斗，适合短视频引流' },
    { word: '苟道流', trend: '🔥🔥 稳中有升', analysis: '凡人流变种，节奏慢但留存高' },
    { word: '囤货流', trend: '🔥🔥 热度平稳', analysis: '末日题材常青树，女性读者占比上升' },
  ],
  maleNew: [
    { word: '无限流', trend: '🔥🔥🔥 黑马', analysis: '副本设计创新空间大，IP改编潜力高' },
    { word: '第四天灾', trend: '🔥🔥 新兴', analysis: '游戏异界新分支，玩家视角独特' },
  ],
  femaleHot: [
    { word: '真假千金', trend: '🔥🔥🔥 顶流', analysis: '打脸爽感强，适合下沉市场' },
    { word: '年代军婚', trend: '🔥🔥 长青', analysis: '情怀+甜宠，35+女性读者主力' },
    { word: '玄学算命', trend: '🔥🔥 上升', analysis: '现代背景+传统文化，差异化明显' },
  ],
  femaleNew: [
    { word: '团宠', trend: '🔥🔥🔥 爆发', analysis: '甜宠极致化，读者情感代入强' },
    { word: '穿书反派', trend: '🔥🔥 热门', analysis: '反套路+自救，女性向创新方向' },
  ],
  jiuzhou: [
    { word: '民俗恐怖', trend: '🔥🔥🔥 小众精品', analysis: '短篇恐怖精品化，影视改编潜力高' },
    { word: '科幻短篇', trend: '🔥🔥 上升', analysis: '概念驱动，适合短视频解说传播' },
  ],
};

// 短篇热门灵感（≤5万字）
const SHORT_HOT_INSPIRATIONS: Record<string, Array<{ word: string; trend: string; analysis: string }>> = {
  maleHot: [
    { word: '规则怪谈', trend: '🔥🔥🔥 短篇顶流', analysis: '规则+副本，短篇节奏极快，适合短视频引流' },
    { word: '诡异生存', trend: '🔥🔥🔥 持续火爆', analysis: '诡异+建造，每晚一个事件，读者追更欲望强' },
    { word: '无限副本', trend: '🔥🔥 上升最快', analysis: '副本独立成篇，短篇化趋势明显' },
  ],
  maleNew: [
    { word: '副本创新', trend: '🔥🔥🔥 黑马', analysis: '国风副本+创新机制，差异化竞争' },
    { word: '诡异驾驭', trend: '🔥🔥 新兴', analysis: '与诡异共生，设定新颖' },
  ],
  femaleHot: [
    { word: '真假千金', trend: '🔥🔥🔥 短篇顶流', analysis: '打脸节奏快，短篇每章一个爽点' },
    { word: '快穿打脸', trend: '🔥🔥🔥 持续火爆', analysis: '每世界独立成篇，适合短篇化' },
    { word: '年代军婚', trend: '🔥🔥 长青', analysis: '温馨日常，短篇甜宠首选' },
  ],
  femaleNew: [
    { word: '团宠萌宝', trend: '🔥🔥🔥 爆发', analysis: '萌点密集，短篇温馨治愈' },
    { word: '沙雕甜宠', trend: '🔥🔥 热门', analysis: '轻松搞笑，年轻读者接受度高' },
  ],
};

// GET /api/trends
// Query: category (platform|maleHot|maleNew|femaleHot|femaleNew|jiuzhou)
//        platform (douyin|weibo|toutiao|baidu|bilibili) - 仅 category=platform
//        daysAgo (0-6) - 仅 category=platform，模拟日期
//        search - 模糊搜索
trendsRouter.get('/', async (c) => {
  const category = c.req.query('category') || 'maleHot';
  const platform = c.req.query('platform') || 'douyin';
  const daysAgo = parseInt(c.req.query('daysAgo') || '0', 10);
  const search = c.req.query('search') || '';
  const length = c.req.query('length') || 'long';

  let items: any[] = [];
  let hotInspirations: any[] = [];
  let windVane: any = null;
  let bookAnalysis: any[] = [];
  let meta: Record<string, string> = {};

  const useDynamic = ENABLE_DYNAMIC && daysAgo === 0;
  const dateKey = getDateKey(daysAgo);

  const now = new Date();
  const updatedAt = now.toISOString();

  if (category === 'platform') {
    // platform 始终显示（热搜天然不分长短篇）
    let fetchFailed = false;
    if (useDynamic) {
      try {
        const hotItems = await fetchSource(platform);
        // 过滤掉 title 为空的脏数据
        const validItems = hotItems.filter((item: any) => item.title && item.title.trim().length > 0);
        if (validItems.length > 0) {
          items = validItems.map((item: any, i: number) => ({
            rank: i + 1,
            title: item.title,
            url: item.url || '',
            heat: i < 3 ? '🔥🔥🔥' : i < 10 ? '🔥🔥' : '🔥',
            change: 'same',
          }));
        } else {
          fetchFailed = true;
        }
      } catch {
        fetchFailed = true;
      }
      const dynamicWindVane = await getWindVane('platform', dateKey);
      windVane = dynamicWindVane || makeWindVane('platform', daysAgo);
    } else {
      // 历史日期回退到硬编码（明确告知用户这是模拟的）
      items = makePlatformItems(platform, daysAgo);
    }
    meta = {
      platform,
      total: String(items.length),
      daysAgo: String(daysAgo),
      dateLabel: getDateLabel(daysAgo),
      length,
      source: fetchFailed
        ? `${getPlatformLabel(platform)} 热搜获取失败`
        : useDynamic
          ? `来自 ${getPlatformLabel(platform)} 热搜 API · 平台热搜不区分长短篇`
          : `模拟数据 · ${getPlatformLabel(platform)} 热搜（历史日期）`,
      updatedAt,
      isRealData: fetchFailed ? 'false' : useDynamic ? 'true' : 'false',
    };
  } else if (category === 'jiuzhou') {
    // jiuzhou 只在短篇显示
    if (length === 'short') {
      items = makeBookList(category, daysAgo);
      if (useDynamic) {
        const dynamicWindVane = await getWindVane(category, dateKey);
        if (dynamicWindVane && dynamicWindVane.tags.length > 0) {
          windVane = dynamicWindVane;
          hotInspirations = dynamicWindVane.tags.map((tag: string) => ({
            word: tag,
            trend: '🔥🔥🔥 实时热点',
            analysis: '基于今日全网热搜数据AI分析',
          }));
        } else {
          windVane = makeWindVane(category, daysAgo);
          hotInspirations = makeHotInspirations(category, daysAgo);
        }
        const dynamicAnalysis = await getBookAnalysis(category, dateKey, 3);
        if (dynamicAnalysis.length > 0) {
          bookAnalysis = dynamicAnalysis;
        } else {
          bookAnalysis = makeBookAnalysis(category, daysAgo);
        }
      } else {
        hotInspirations = makeHotInspirations(category, daysAgo);
        windVane = makeWindVane(category, daysAgo);
        bookAnalysis = makeBookAnalysis(category, daysAgo);
      }
      meta = {
        category,
        total: String(items.length),
        daysAgo: String(daysAgo),
        dateLabel: getDateLabel(daysAgo),
        length,
        source: '编辑精选 · 九州短篇榜（≤5万字）',
        updatedAt,
        isRealData: 'false',
      };
    } else {
      meta = {
        category,
        total: '0',
        daysAgo: String(daysAgo),
        dateLabel: getDateLabel(daysAgo),
        length,
        source: '九州榜单仅限短篇查看',
        updatedAt,
        isRealData: 'false',
      };
    }
  } else if (category in BOOK_LISTS || category in BOOK_LISTS_SHORT) {
    // 书籍榜单：优先用爬虫真实数据，没有则回退硬编码
    const isShort = length === 'short' && (BOOK_LISTS_SHORT as any)[category];
    let useRealBookData = false;

    if (useDynamic) {
      try {
        const hasRealData = await hasTodayBookRankings(category);
        if (hasRealData) {
          items = await getBookRankings(category, 50);
          useRealBookData = true;
        }
      } catch {
        // 爬虫数据不可用，回退硬编码
      }
    }

    if (!useRealBookData) {
      items = makeBookList(category, daysAgo, length);
    }

    if (useDynamic) {
      const dynamicWindVane = await getWindVane(category, dateKey);
      if (dynamicWindVane && dynamicWindVane.tags.length > 0) {
        windVane = dynamicWindVane;
        hotInspirations = dynamicWindVane.tags.map((tag: string) => ({
          word: tag,
          trend: '🔥🔥🔥 实时热点',
          analysis: '基于今日全网热搜数据AI分析',
        }));
      } else {
        windVane = makeWindVane(category, daysAgo, length);
        hotInspirations = makeHotInspirations(category, daysAgo, length);
      }
      const dynamicAnalysis = await getBookAnalysis(category, dateKey, 3);
      if (dynamicAnalysis.length > 0) {
        bookAnalysis = dynamicAnalysis;
      } else {
        bookAnalysis = makeBookAnalysis(category, daysAgo, length);
      }
    } else {
      hotInspirations = makeHotInspirations(category, daysAgo, length);
      windVane = makeWindVane(category, daysAgo, length);
      bookAnalysis = makeBookAnalysis(category, daysAgo, length);
    }

    const sourceLabel = useRealBookData
      ? '实时抓取 · 平台真实榜单'
      : isShort
        ? '编辑精选 · 短篇榜单（≤5万字）'
        : '编辑精选 · 长篇榜单';
    meta = {
      category,
      total: String(items.length),
      daysAgo: String(daysAgo),
      dateLabel: getDateLabel(daysAgo),
      length,
      source: sourceLabel,
      updatedAt,
      isRealData: String(useRealBookData),
    };
  }

  if (search) {
    const s = search.toLowerCase();
    items = items.filter((item: any) =>
      (item.title || '').toLowerCase().includes(s) ||
      (item.author || '').toLowerCase().includes(s) ||
      (item.genre || '').toLowerCase().includes(s)
    );
    meta.total = String(items.length);
  }

  return c.json({ items, hotInspirations, windVane, bookAnalysis, meta });
});

/** 平台名称映射 */
function getPlatformLabel(platform: string): string {
  const map: Record<string, string> = {
    douyin: '抖音',
    zhihu: '知乎',
    toutiao: '今日头条',
    baidu: '百度',
    bilibili: 'B站',
    weibo: '微博',
  };
  return map[platform] || platform;
}

// POST /api/trends/generate-inspiration — 用户触发完整灵感生成
trendsRouter.post('/generate-inspiration', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { category } = body;

  if (!category || !(category in BOOK_LISTS)) {
    return c.json({ error: '无效的 category' }, 400);
  }

  const limit = await checkGenerationLimit(category);
  if (!limit.ok) {
    return c.json({ error: `今日${category}灵感生成已达上限（${limit.limit}条）` }, 429);
  }

  try {
    const inspirations = await generateBookAnalysis(category);
    return c.json({ items: inspirations });
  } catch (err: any) {
    console.error('[trends] 灵感生成失败:', err);
    return c.json({ error: err.message || '生成失败' }, 500);
  }
});

// POST /api/trends/generate-from-seed — 单点切入
trendsRouter.post('/generate-from-seed', authMiddleware, async (c) => {
  const body = await c.req.json();
  const { category, seedType, seedValue } = body;

  if (!category || !(category in BOOK_LISTS)) {
    return c.json({ error: '无效的 category' }, 400);
  }
  if (!seedType || !seedValue) {
    return c.json({ error: '缺少 seedType 或 seedValue' }, 400);
  }

  try {
    const inspiration = await generateFromSeed(category, seedType, seedValue);
    return c.json({ item: inspiration });
  } catch (err: any) {
    console.error('[trends] 单点切入生成失败:', err);
    return c.json({ error: err.message || '生成失败' }, 500);
  }
});

// POST /api/trends/analyze-hot — AI 分析热点对小说创作的启发
trendsRouter.post('/analyze-hot', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { title, platform: hotPlatform, hot } = body;

    if (!title || typeof title !== 'string') {
      return c.json({ error: '缺少热点标题' }, 400);
    }

    const platformLabel = getPlatformLabel(hotPlatform || 'zhihu');
    const hotStr = hot ? `热度：${hot}` : '';

    const prompt = `你是九章写作平台的网文创作顾问。请根据以下全网热点，深度分析它对小说创作的启发价值。

热点标题：${title}
来源平台：${platformLabel}
${hotStr}

请从以下 5 个维度给出创作建议（每项控制在 80 字以内，语言精炼、可直接执行）：

1. 情绪洞察：这个热点反映了当下读者什么情绪需求或社会心理？
2. 题材方向：可以延伸出哪些网文题材？建议结合哪些流行元素？
3. 核心冲突：建议设置什么样的核心矛盾/冲突点？
4. 人设建议：主角和关键配角的性格设定建议。
5. 书名+钩子：给出一个吸引人的书名建议，以及强钩子式的第一章开头（50 字以内）。

注意：分析要具体、有创意，避免空泛套话。直接输出结构化建议，用 markdown 格式。`;

    const messages = [
      { role: 'system', content: '你是资深网文编辑兼创作顾问，擅长从社会热点中提炼网文创作灵感。' },
      { role: 'user', content: prompt },
    ];

    const res = await callLLM(messages, true);
    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('[trends] 热点分析失败:', err);
    return c.json({ error: err.message || '分析失败' }, 500);
  }
});

// POST /api/trends/crawl-books — 已禁用
// 番茄/七猫/晋江爬虫踩合规红线（无官方API），改为硬编码数据
trendsRouter.post('/crawl-books', async (c) => {
  return c.json({
    success: false,
    message: '书籍榜单爬虫已禁用。当前使用编辑精选硬编码数据。如需真实数据，请配置 TianAPI 等商用聚合接口。',
  }, 403);
});

export default trendsRouter;
