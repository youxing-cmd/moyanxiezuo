import {
  getDefaultPresetModelId,
  getPresetModelById,
  type PresetModel,
} from '../config/presetModels.js';

// 模型配置类型（运行时使用，含 apiKey）
export interface ModelConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

// === Tool Use（function calling）相关类型 ===

// OpenAI 兼容的 tool 定义
export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

// AI 输出的工具调用
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

// 消息类型（兼容 tool_calls / tool 角色）
// role 用 string 而非 union，向后兼容现有 caller
export interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

function presetToModelConfig(p: PresetModel): ModelConfig {
  return {
    provider: p.provider,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    modelName: p.modelName,
  };
}

// LLM 调用错误（带类型，便于 catch 后区分处理）
export class LLMError extends Error {
  constructor(
    public type:
      | 'timeout'        // 上游响应超时
      | 'rate_limit'     // 上游 429 限流
      | 'overload'       // 本地排队超限（系统过载）
      | 'auth'           // 401/403 鉴权失败
      | 'upstream'       // 5xx 上游异常
      | 'network'        // 网络连接失败
      | 'no_config'      // 未配置 API 密钥
      | 'unknown',
    message: string,
    public status: number = 500,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// 简单信号量：限制全局 LLM 并发数
class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;
  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
  }

  release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) next();
  }

  get stats() {
    return { active: this.active, waiting: this.queue.length, max: this.max };
  }
}

// === 全局配置（可通过环境变量调整） ===

// 同时进行的 LLM 请求上限
const MAX_CONCURRENT = parseInt(process.env.AI_MAX_CONCURRENT || '10');

// 排队等待槽位的最长时间（毫秒）：超过即认为系统过载，立即拒绝
const QUEUE_TIMEOUT_MS = parseInt(process.env.AI_QUEUE_TIMEOUT_MS || '15000');

// 上游响应超时（毫秒）：流式给长一点，足够生成长文；非流式按短设置
const STREAM_TIMEOUT_MS = parseInt(process.env.AI_STREAM_TIMEOUT_MS || '120000');
const NON_STREAM_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '45000');

// 兜底：拿到 Response 后无论如何在此时间后强制释放槽位（防止 ai.ts 泄漏）
const HARD_RELEASE_TIMEOUT_MS = STREAM_TIMEOUT_MS + 30_000;

const llmSemaphore = new Semaphore(MAX_CONCURRENT);

// 暴露统计信息（可用于 /health 或调试）
export function getLLMStats() {
  return llmSemaphore.stats;
}

// 带超时的槽位获取
async function acquireSlot(): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new LLMError(
          'overload',
          `AI 服务排队超时，当前并发 ${llmSemaphore.stats.active}/${llmSemaphore.stats.max}，等待 ${llmSemaphore.stats.waiting} 个，请稍后再试`,
          503,
        ),
      );
    }, QUEUE_TIMEOUT_MS);
  });
  try {
    await Promise.race([llmSemaphore.acquire(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// 包装 Response：流读完/取消/出错时自动释放并发槽位
function wrapResponseWithRelease(res: Response, release: () => void): Response {
  let released = false;
  const safeRelease = () => {
    if (released) return;
    released = true;
    release();
  };

  // 兜底：到时间强制释放（防止调用方忘记消费 body）
  const hardTimer = setTimeout(safeRelease, HARD_RELEASE_TIMEOUT_MS);

  if (!res.body) {
    clearTimeout(hardTimer);
    safeRelease();
    return res;
  }

  const reader = res.body.getReader();
  const wrapped = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          clearTimeout(hardTimer);
          safeRelease();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        controller.error(err);
        clearTimeout(hardTimer);
        safeRelease();
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
      clearTimeout(hardTimer);
      safeRelease();
    },
  });

  return new Response(wrapped, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

// 上游 HTTP 错误分类
async function throwHttpError(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  const status = res.status;
  const snippet = text.length > 300 ? text.slice(0, 300) + '...' : text;

  if (status === 401 || status === 403) {
    throw new LLMError('auth', `AI 服务鉴权失败，请检查 API 密钥配置`, 502);
  }
  if (status === 429) {
    throw new LLMError(
      'rate_limit',
      `AI 服务繁忙（上游限流），请稍后再试`,
      429,
    );
  }
  if (status >= 500) {
    throw new LLMError(
      'upstream',
      `AI 服务异常（${status}），请稍后再试`,
      502,
    );
  }
  throw new LLMError('upstream', `AI 服务调用失败（${status}）：${snippet}`, 502);
}

// fetch 错误分类（捕获 AbortError、网络错误等）
function classifyFetchError(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  const e = err as { name?: string; cause?: { code?: string }; message?: string };
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
    return new LLMError('timeout', 'AI 响应超时，请重试或更换模型', 504);
  }
  const code = e?.cause?.code;
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT'
  ) {
    return new LLMError('network', `AI 服务连接失败（${code}）`, 502);
  }
  return new LLMError('unknown', `AI 调用异常：${e?.message || String(err)}`, 500);
}

// 从预设清单中解析模型配置
// modelId 为 string：查预设；为 number/缺失/无效：回退默认预设
// userId 参数保留以兼容旧调用，当前不使用（预设全局共享）
export function resolveModelConfig(
  _userId: number,
  modelId?: string | number | null,
): ModelConfig | null {
  // 1. 显式传 string id → 优先使用
  if (typeof modelId === 'string' && modelId) {
    const preset = getPresetModelById(modelId);
    if (preset) return presetToModelConfig(preset);
    // 找不到 → 回退默认
  }

  // 2. 没传 / 是 number / 找不到 → 默认预设
  const defaultId = getDefaultPresetModelId();
  if (!defaultId) return null;
  const def = getPresetModelById(defaultId);
  return def ? presetToModelConfig(def) : null;
}

// 调用 OpenAI 兼容格式（带 abort 信号）
async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  signal: AbortSignal,
  tools?: ChatTool[],
): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream,
    temperature: 0.7,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
    body.parallel_tool_calls = true;
  }
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) await throwHttpError(res);
  return res;
}

// 调用 Anthropic Claude（带 abort 信号）
async function callAnthropic(
  config: ModelConfig,
  messages: ChatMessage[],
  stream: boolean,
  signal: AbortSignal,
  tools?: ChatTool[],
): Promise<Response> {
  const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
  const userMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content ?? '',
    }));

  const body: Record<string, unknown> = {
    model: config.modelName,
    max_tokens: 4096,
    messages: userMessages,
    temperature: 0.7,
  };
  if (systemMsg) body.system = systemMsg;
  if (stream) body.stream = true;
  // tools: OpenAI 格式 → Anthropic 格式
  // OpenAI: { type:'function', function:{name,description,parameters} }
  // Anthropic: { name, description, input_schema }
  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const res = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) await throwHttpError(res);
  return res;
}

// 统一的 LLM 调用入口
// - 全局并发限制 + 排队超时
// - 上游响应超时（abort signal）
// - 上游错误分类
// - 流式 body 自动释放槽位
export async function callLLM(
  messages: ChatMessage[],
  stream = false,
  modelConfig?: ModelConfig | null,
  tools?: ChatTool[],
): Promise<Response> {
  // 1. 排队获取并发槽位
  await acquireSlot();

  // 2. 准备超时控制
  const timeoutMs = stream ? STREAM_TIMEOUT_MS : NON_STREAM_TIMEOUT_MS;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(timer);
    llmSemaphore.release();
  };

  try {
    let res: Response;
    if (!modelConfig) {
      const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
      const apiKey = process.env.AI_API_KEY || '';
      const model = process.env.AI_MODEL || 'gpt-4o-mini';
      if (!apiKey) {
        throw new LLMError('no_config', 'AI API 密钥未配置（请配置默认模型或在用户模型库中设置）', 500);
      }
      res = await callOpenAI(baseUrl, apiKey, model, messages, stream, ctrl.signal, tools);
    } else if (modelConfig.provider === 'anthropic') {
      res = await callAnthropic(modelConfig, messages, stream, ctrl.signal, tools);
    } else {
      res = await callOpenAI(
        modelConfig.baseUrl,
        modelConfig.apiKey,
        modelConfig.modelName,
        messages,
        stream,
        ctrl.signal,
        tools,
      );
    }

    // 3. 包装 body：消费完成（或取消）后释放槽位
    return wrapResponseWithRelease(res, release);
  } catch (err) {
    release();
    throw classifyFetchError(err);
  }
}
