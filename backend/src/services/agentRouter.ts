// L3 Agent 路由层
// 用户 query 进入后，先调用小模型（gemini-2.5-flash）做意图分析，
// 输出 JSON 决策（目标大模型 + 启用的工具子集），再用决策结果调真正的执行模型。
// 路由失败时降级为默认模型 + 全工具集，不阻塞用户请求。

import {
  callLLM,
  type ChatMessage,
  type ModelConfig,
  LLMError,
} from './llm.js';
import {
  getPresetModels,
  getDefaultPresetModelId,
  getPresetModelById,
  type PresetModel,
} from '../config/presetModels.js';
import { listRegisteredTools } from '../config/tools.js';

// 路由模型 ID（小模型，便宜快速）
const ROUTER_MODEL_ID = 'gemini-2.5-flash';

export interface RouteDecision {
  intent: string;              // 意图分类：continue/polish/analyze/chat/other 等
  targetModelId: string;       // 目标大模型 ID（必须在预设清单内）
  enabledTools: string[];      // 启用的工具 name 数组（必须在注册表内）
  confidence: number;          // 路由置信度 0-1
  fallback: boolean;           // true 表示用了降级策略
  rawResponse?: string;        // 调试用：原始 LLM 响应
}

export interface RouteContext {
  userId: number;
  workId?: number | null;
}

/** 内部：构造路由 prompt */
function buildRouterPrompt(userQuery: string): string {
  const models = getPresetModels();
  const modelList = models
    .map((m) => `- ${m.id}: ${m.description || m.name}`)
    .join('\n');

  const tools = listRegisteredTools();
  const toolList = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n');

  return `你是九章写作平台的智能路由器。根据用户的请求，从下面的清单中选择最合适的模型和工具。

【可用模型】
${modelList}

【可用工具】
${toolList}

【用户请求】
"""${userQuery}"""

【输出要求】
返回纯 JSON，无 markdown 围栏，无解释，无任何其他文字。格式：
{
  "intent": "continue|polish|expand|rewrite|analyze|chat|other",
  "targetModelId": "<上面清单中的模型 id>",
  "enabledTools": ["<工具 name>", ...],
  "confidence": 0.0到1.0之间的数字
}

规则：
1. 纯对话/咨询/不涉及编辑器内容 → enabledTools 为 []
2. 涉及"这段/选中/这句" → 必须包含 get_selection 和 replace_selection
3. 涉及"全文/整体/通篇" → 必须包含 get_full_text
4. 涉及"角色/人物" → 包含 get_characters
5. 涉及"总纲/大纲" → 包含 get_outline
6. 长文创作（续写/扩写/改写） → 用 claude-sonnet-4-6
7. 长上下文分析 → 用 gemini-2.5-pro
8. 短任务（标题/简介/问候/简短回复） → 用 gemini-2.5-flash
9. 逻辑/纠错/规划类 → 用 gpt-5.4
10. 不确定时 targetModelId 用 ${getDefaultPresetModelId() || 'claude-sonnet-4-6'}`;
}

/** 内部：宽松 JSON 解析（沿用 tool-match 模式：去围栏 + 正则兜底） */
function parseRouterJson(content: string): {
  intent?: unknown;
  targetModelId?: unknown;
  enabledTools?: unknown;
  confidence?: unknown;
} {
  const clean = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    // 正则兜底：逐字段提取
    const result: Record<string, unknown> = {};
    const intentMatch = clean.match(/"intent"\s*:\s*"([^"]+)"/);
    if (intentMatch) result.intent = intentMatch[1];
    const modelMatch = clean.match(/"targetModelId"\s*:\s*"([^"]+)"/);
    if (modelMatch) result.targetModelId = modelMatch[1];
    const confMatch = clean.match(/"confidence"\s*:\s*([\d.]+)/);
    if (confMatch) result.confidence = parseFloat(confMatch[1]);
    const toolsMatch = clean.match(/"enabledTools"\s*:\s*\[([^\]]*)\]/);
    if (toolsMatch) {
      result.enabledTools = Array.from(toolsMatch[1].matchAll(/"([^"]+)"/g)).map(
        (m) => m[1],
      );
    }
    return result;
  }
}

/** 构造降级决策（路由失败时使用） */
function buildFallbackDecision(intent = 'other', rawResponse = ''): RouteDecision {
  const defaultModelId = getDefaultPresetModelId() || 'claude-sonnet-4-6';
  const allToolNames = listRegisteredTools().map((t) => t.name);
  return {
    intent,
    targetModelId: defaultModelId,
    enabledTools: allToolNames,
    confidence: 0,
    fallback: true,
    rawResponse,
  };
}

/**
 * 主入口：分析用户意图，返回路由决策。
 * 任何失败（gemini 调用失败/JSON 解析失败/校验失败）都降级到默认模型 + 全工具集。
 */
export async function routeAgentRequest(
  messages: ChatMessage[],
  _ctx: RouteContext,
): Promise<RouteDecision> {
  // 1. 取最后一条 user message 作为 query
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const userQuery = (lastUserMsg?.content || '').trim();
  if (!userQuery) {
    return buildFallbackDecision('empty', 'no user message');
  }

  // 2. 取路由模型配置
  const routerModel: PresetModel | null = getPresetModelById(ROUTER_MODEL_ID);
  if (!routerModel) {
    console.warn(`[agentRouter] 路由模型 ${ROUTER_MODEL_ID} 不可用，降级`);
    return buildFallbackDecision('no_router_model');
  }
  const routerConfig: ModelConfig = {
    provider: routerModel.provider,
    baseUrl: routerModel.baseUrl,
    apiKey: routerModel.apiKey,
    modelName: routerModel.modelName,
  };

  // 3. 调用路由模型（非流式）
  let content = '';
  try {
    const res = await callLLM(
      [{ role: 'user', content: buildRouterPrompt(userQuery) }],
      false,
      routerConfig,
    );
    const data = await res.json();
    content = data.choices?.[0]?.message?.content || '';
  } catch (err: unknown) {
    const msg = err instanceof LLMError ? err.message : err instanceof Error ? err.message : String(err);
    console.warn(`[agentRouter] 路由模型调用失败: ${msg}，降级`);
    return buildFallbackDecision('router_call_failed', msg);
  }

  if (!content) {
    return buildFallbackDecision('empty_response', content);
  }

  // 4. 解析 JSON
  const parsed = parseRouterJson(content);
  const intent = typeof parsed.intent === 'string' ? parsed.intent : 'other';
  const targetModelId =
    typeof parsed.targetModelId === 'string' ? parsed.targetModelId : '';
  const confidence =
    typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;
  const enabledTools = Array.isArray(parsed.enabledTools)
    ? parsed.enabledTools.filter((t): t is string => typeof t === 'string')
    : [];

  // 5. 校验：targetModelId 必须在预设清单内
  const validModel = getPresetModelById(targetModelId);
  if (!validModel) {
    console.warn(
      `[agentRouter] 模型 "${targetModelId}" 不在预设清单内，降级`,
    );
    return buildFallbackDecision(intent, content);
  }

  // 6. 校验：enabledTools 必须在注册表内（非法剔除）
  const validToolNames = new Set(listRegisteredTools().map((t) => t.name));
  const filteredTools = enabledTools.filter((t) => validToolNames.has(t));

  return {
    intent,
    targetModelId,
    enabledTools: filteredTools,
    confidence,
    fallback: false,
    rawResponse: content,
  };
}
