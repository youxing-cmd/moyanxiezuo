// L3 Agent 路由端点 POST /api/ai/agent-chat
// 流程：JWT 鉴权 → 积分扣减 → 路由层（小模型决策）→ 执行层（大模型 + 工具子集，流式 SSE）
// 路由过程对前端透明，路由失败降级到默认模型 + 全工具集

import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { users, pointTransactions } from '../db/schema.js';
import { callLLM, resolveModelConfig, type ChatMessage } from '../services/llm.js';
import { getEnabledTools } from '../config/tools.js';
import { routeAgentRequest } from '../services/agentRouter.js';
import {
  buildWorkContextPrompt,
  TOOL_PROMPTS,
  STYLE_PROMPTS,
} from './ai.js';

const agentChatRouter = new Hono();

agentChatRouter.use('*', authMiddleware);

// 积分扣减中间件（与 ai.ts 中保持一致：每次 POST 扣 1 分）
agentChatRouter.use('*', async (c, next) => {
  if (c.req.method !== 'POST') return await next();

  const userId = c.get('userId');
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return c.json({ error: '用户不存在' }, 404);
  if (user.points < 1) {
    return c.json(
      { error: '积分不足', need: 1, have: user.points, code: 'INSUFFICIENT_POINTS' },
      403,
    );
  }

  await db.update(users).set({ points: user.points - 1 }).where(eq(users.id, userId));
  await db.insert(pointTransactions).values({
    userId,
    type: 'spend',
    amount: -1,
    description: 'AI Agent 调用',
  });

  await next();
});

// 消息 schema（兼容工具调用相关字段，与 /api/ai/chat 一致）
const chatMessageSchema = z.object({
  role: z.string(),
  content: z.union([z.string(), z.null()]).optional(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

const agentChatSchema = z.object({
  messages: z.array(chatMessageSchema),
  workId: z.number().nullable().optional(),
  // tool/style 透传：用户主动选择的优先级高于路由
  tool: z.enum([
    'continue', 'polish', 'expand', 'rewrite', 'de-ai', 'character', 'outline',
    'chapter-outline', 'inspiration', 'titles', 'detect', 'scene', 'dialogue',
    'conflict', 'foreshadow', 'pacing', 'hook', 'blurb',
  ]).optional(),
  style: z.enum(['creative', 'standard', 'plot']).optional(),
});

agentChatRouter.post('/agent-chat', async (c) => {
  const body = await c.req.json();
  const parsed = agentChatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: '参数错误: ' + parsed.error.message }, 400);
  }

  const userId = c.get('userId');
  const { messages, workId, tool, style } = parsed.data;

  // 1. 路由：调小模型分析意图
  const decision = await routeAgentRequest(
    messages.map((m) => ({
      role: m.role,
      content: m.content ?? null,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
      name: m.name,
    })),
    { userId, workId: workId ?? null },
  );

  // 路由决策只写日志，不写入 SSE body（确保对前端透明）
  console.log(
    `[agent-chat] route: intent=${decision.intent}, model=${decision.targetModelId}, tools=[${decision.enabledTools.join(',')}], confidence=${decision.confidence.toFixed(2)}${decision.fallback ? ', fallback=true' : ''}`,
  );

  // 2. 构建最终消息列表（注入 system prompt，顺序与 /chat 一致）
  let finalMessages: ChatMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content ?? null,
    tool_calls: m.tool_calls,
    tool_call_id: m.tool_call_id,
    name: m.name,
  }));

  // 2.1 注入作品上下文（最优先）
  if (workId) {
    const workContext = await buildWorkContextPrompt(workId, userId);
    if (workContext) {
      finalMessages = [{ role: 'system', content: workContext }, ...finalMessages];
    }
  }

  // 2.2 注入 tool prompt（用户主动指定的工具模式）
  if (tool && TOOL_PROMPTS[tool]) {
    finalMessages = [{ role: 'system', content: TOOL_PROMPTS[tool] }, ...finalMessages];
  }

  // 2.3 追加 style prompt
  if (style && STYLE_PROMPTS[style]) {
    finalMessages = [...finalMessages, { role: 'system', content: STYLE_PROMPTS[style] }];
  }

  // 3. 用路由决策的模型和工具调用大模型
  const modelConfig = resolveModelConfig(userId, decision.targetModelId);
  const tools = getEnabledTools(decision.enabledTools);

  try {
    const res = await callLLM(
      finalMessages,
      true,
      modelConfig,
      tools.length > 0 ? tools : undefined,
    );

    return new Response(res.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        // 路由决策放在 header 里方便后端日志和前端调试（如有需要）
        'X-Agent-Route': encodeURIComponent(JSON.stringify({
          intent: decision.intent,
          model: decision.targetModelId,
          tools: decision.enabledTools,
          confidence: decision.confidence,
          fallback: decision.fallback,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg || 'Agent 调用失败' }, 500);
  }
});

export default agentChatRouter;
