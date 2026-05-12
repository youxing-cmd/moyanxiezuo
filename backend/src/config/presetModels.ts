// 内置预设模型清单
// 添加/修改/删除模型只需改本文件 + 在 .env 配好对应 key，重启服务即可。
// 所有 key 必须从 process.env 读取，禁止硬编码。

export type ProviderType = 'openai-compatible' | 'anthropic';

export type PresetModel = {
  id: string;              // 唯一 ID，前后端通信用（保持稳定，改 ID 会影响用户已选模型记忆）
  name: string;            // 前端显示名
  provider: ProviderType;  // 调用协议
  baseUrl: string;         // API 网关地址（不带尾斜杠）
  apiKey: string;          // API key（仅运行时用，不传给前端）
  modelName: string;       // 上游 API 实际使用的模型名
  description?: string;    // 前端 tooltip 介绍
  isDefault?: boolean;     // 是否默认模型（最多一个）
  enabled: boolean;        // 是否可用（key 缺失自动为 false）
};

// 前端可见的模型信息（去掉 apiKey、baseUrl 等敏感字段）
export type PublicPresetModel = {
  id: string;
  name: string;
  provider: ProviderType;
  modelName: string;
  description?: string;
  isDefault?: boolean;
};

// === 配置区 ===

const WANGSU_BASE = (process.env.WANGSU_BASE_URL || '').replace(/\/$/, '');
const WANGSU_KEY = process.env.WANGSU_API_KEY || '';
const wangsuOK = !!(WANGSU_BASE && WANGSU_KEY);

const ALL_MODELS: PresetModel[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'openai-compatible',
    baseUrl: WANGSU_BASE,
    apiKey: WANGSU_KEY,
    modelName: 'claude-sonnet-4-6',
    description: '综合能力最强，适合长文创作与复杂任务',
    isDefault: true,
    enabled: wangsuOK,
  },
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    provider: 'openai-compatible',
    baseUrl: WANGSU_BASE,
    apiKey: WANGSU_KEY,
    modelName: 'gpt-5.4',
    description: 'OpenAI 旗舰模型，逻辑严谨、风格稳健',
    enabled: wangsuOK,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'openai-compatible',
    baseUrl: WANGSU_BASE,
    apiKey: WANGSU_KEY,
    modelName: 'gemini-2.5-pro',
    description: 'Google 旗舰模型，长上下文优秀',
    enabled: wangsuOK,
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    provider: 'openai-compatible',
    baseUrl: WANGSU_BASE,
    apiKey: WANGSU_KEY,
    modelName: 'gemini-3.1-pro-preview',
    description: 'Gemini 3.1 旗舰预览版，能力最强但可能不稳定',
    enabled: wangsuOK,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'openai-compatible',
    baseUrl: WANGSU_BASE,
    apiKey: WANGSU_KEY,
    modelName: 'gemini-2.5-flash',
    description: '速度快、成本低，适合短文与快速反馈',
    enabled: wangsuOK,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Preview)',
    provider: 'openai-compatible',
    baseUrl: WANGSU_BASE,
    apiKey: WANGSU_KEY,
    modelName: 'gemini-3-flash-preview',
    description: 'Gemini 3 快速版预览，速度优先',
    enabled: wangsuOK,
  },
];

// === 启动时校验：未配置 key 时打印警告 ===

if (!wangsuOK && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[presetModels] ⚠️  WANGSU_BASE_URL 或 WANGSU_API_KEY 未配置，所有内置模型将不可用。' +
      '请在 backend/.env 中填写后重启。',
  );
}

// === 对外接口 ===

// 返回所有 enabled 的预设模型（含密钥，仅服务端使用）
export function getPresetModels(): PresetModel[] {
  return ALL_MODELS.filter((m) => m.enabled);
}

// 按 ID 查找单个模型（含密钥）
export function getPresetModelById(id: string): PresetModel | null {
  const m = ALL_MODELS.find((x) => x.id === id);
  return m && m.enabled ? m : null;
}

// 返回默认模型 ID（优先 isDefault=true 且 enabled，否则第一个 enabled）
export function getDefaultPresetModelId(): string | null {
  const def = ALL_MODELS.find((m) => m.isDefault && m.enabled);
  if (def) return def.id;
  const first = ALL_MODELS.find((m) => m.enabled);
  return first ? first.id : null;
}

// 转为前端可见格式（去掉 baseUrl/apiKey）
export function toPublicModel(m: PresetModel): PublicPresetModel {
  return {
    id: m.id,
    name: m.name,
    provider: m.provider,
    modelName: m.modelName,
    description: m.description,
    isDefault: m.isDefault,
  };
}
