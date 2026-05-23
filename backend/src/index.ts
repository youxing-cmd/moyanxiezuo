import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as Sentry from '@sentry/node';

import authRoutes from './routes/auth.js';
import worksRoutes from './routes/works.js';
import aiRoutes from './routes/ai.js';
import agentChatRoutes from './routes/ai-agent.js';
import metaRoutes from './routes/metadata.js';
import statsRoutes from './routes/stats.js';
import activitiesRoutes from './routes/activities.js';
import inspirationsRoutes from './routes/inspirations.js';
import trendsRoutes from './routes/trends.js';
import { pointsRouter } from './routes/points.js';
import modelConfigRoutes from './routes/model-configs.js';
import presetModelsRoutes from './routes/preset-models.js';
import { initScheduler } from './jobs/scheduler.js';
import { initAgentWorker } from './jobs/agentWorker.js';
import { startProactiveScanner } from './jobs/proactiveScanner.js';
import agentJobsRouter from './routes/agent-jobs.js';
import agentTemplatesRouter from './routes/agent-templates.js';
import proactiveRouter from './routes/agent-proactive.js';
import suggestionsRouter from './routes/agent-suggestions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000');

// Sentry 初始化
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'production',
  });
  console.log('✅ Sentry 已初始化');
}

const app = new Hono();

// 全局错误捕获（上报 Sentry）
app.onError((err, c) => {
  console.error('[onError]', err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  return c.json({ error: 'Internal Server Error' }, 500);
});

// 中间件
app.use(logger());
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

// API 路由
app.route('/api/auth', authRoutes);
app.route('/api/works', worksRoutes);
app.route('/api/works', metaRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/ai', agentChatRoutes);
app.route('/api/ai', agentJobsRouter);
app.route('/api/agent', agentTemplatesRouter);
app.route('/api/proactive', proactiveRouter);
app.route('/api/suggestions', suggestionsRouter);
app.route('/api/stats', statsRoutes);
app.route('/api/activities', activitiesRoutes);
app.route('/api/inspirations', inspirationsRoutes);
app.route('/api/trends', trendsRoutes);
app.route('/api/points', pointsRouter);
app.route('/api/preset-models', presetModelsRoutes);
app.route('/api/model-configs', modelConfigRoutes);

// 静态文件托管（前端）
const frontendPath = join(__dirname, '../../frontend');
app.use('/*', serveStatic({ root: frontendPath }));

// SPA fallback：所有非API请求返回index.html
app.get('*', async (c) => {
  const fs = await import('fs/promises');
  const indexPath = join(frontendPath, 'index.html');
  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    return c.html(content);
  } catch {
    return c.text('index.html not found', 404);
  }
});

// 启动 DailyHotApi（内嵌到同一进程）
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      // 临时改 NODE_ENV 阻止 dailyhot-api 自动启动
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const { default: serveHotApi } = await import('dailyhot-api');
      process.env.NODE_ENV = prevEnv;
      serveHotApi(6688);
      console.log('🔥 DailyHotApi 内嵌启动成功');
    } catch (err) {
      console.error('[DailyHotApi] 内嵌启动失败:', err);
    }
  })();
}

// 初始化定时任务（仅在非测试环境）
if (process.env.NODE_ENV !== 'test') {
  initScheduler();
  initAgentWorker().catch((err) => {
    console.error('[index] Agent Worker 初始化失败:', err);
  });
  startProactiveScanner();
}

// 未捕获异常上报 Sentry
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  // 给 Sentry 一点时间上报后再退出
  setTimeout(() => process.exit(1), 2000);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理 Promise 拒绝:', reason);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason);
  }
});

serve({
  fetch: app.fetch,
  port: PORT,
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`🚀 九章写作后端运行在 http://localhost:${info.port}`);
});
