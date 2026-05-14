import cron from 'node-cron';
import { fetchAllHotData } from '../services/dailyHotApi.js';
import { generateWindVaneForAllCategories, hasTodayWindVane } from '../services/trendsAnalysis.js';

let isRunning = false;

export function initScheduler() {
  // 每天 9:00 和 21:00 执行跑批（热点数据 + 风向分析）
  cron.schedule('0 9,21 * * *', async () => {
    if (isRunning) {
      console.log('[scheduler] 上一次跑批尚未完成，跳过本次');
      return;
    }
    isRunning = true;
    console.log('[scheduler] 开始执行每日跑批...');
    try {
      await runDailyBatch();
      console.log('[scheduler] 每日跑批完成');
    } catch (err) {
      console.error('[scheduler] 跑批失败:', err);
    } finally {
      isRunning = false;
    }
  });

  // 服务启动时检查：如果今天还没跑过，立即执行一次
  setTimeout(() => {
    runOnStartup();
  }, 5000); // 延迟 5 秒，等数据库连接稳定

  console.log('[scheduler] 定时任务已初始化（每日 9:00 / 21:00）');
}

async function runDailyBatch() {
  // 1. 拉取最新热点数据（强制刷新）
  console.log('[scheduler] 拉取热点数据...');
  await fetchAllHotData(true);

  // 2. 生成所有 category 的风向分析
  console.log('[scheduler] 生成风向分析...');
  await generateWindVaneForAllCategories();

  // 3. 书籍平台榜单爬虫 — 已禁用（合规风险，无官方 API）
  // console.log('[scheduler] 开始抓取书籍榜单...');
  // await crawlAllBookRankings();
  // console.log('[scheduler] 书籍榜单抓取完成');
}

async function runOnStartup() {
  try {
    if (await hasTodayWindVane()) {
      console.log('[scheduler] 今日风向已生成，跳过启动时跑批');
      return;
    }

    if (isRunning) {
      console.log('[scheduler] 跑批正在进行中，跳过启动时检查');
      return;
    }

    isRunning = true;
    console.log('[scheduler] 今日尚未生成风向，启动时立即执行...');
    try {
      await runDailyBatch();
      console.log('[scheduler] 启动时跑批完成');
    } catch (err) {
      console.error('[scheduler] 启动时跑批失败:', err);
    } finally {
      isRunning = false;
    }
  } catch (err) {
    console.error('[scheduler] 启动时检查失败:', err);
  }
}
