// 厂商配置映射（选择厂商 → 自动填充 baseUrl / provider / 默认模型名）
const PROVIDER_CONFIGS = {
    openai:      { label: 'OpenAI',      provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1',                                                    defaultModel: 'gpt-4o-mini' },
    deepseek:    { label: 'DeepSeek',    provider: 'openai-compatible', baseUrl: 'https://api.deepseek.com/v1',                                                  defaultModel: 'deepseek-chat' },
    anthropic:   { label: 'Anthropic',   provider: 'anthropic',         baseUrl: 'https://api.anthropic.com',                                                    defaultModel: 'claude-sonnet-4-20250514' },
    gemini:      { label: 'Google Gemini',provider:'openai-compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',                      defaultModel: 'gemini-2.5-flash-preview-05-20' },
    kimi:        { label: 'Kimi',        provider: 'openai-compatible', baseUrl: 'https://api.moonshot.cn/v1',                                                   defaultModel: 'kimi-k2-0905' },
    qwen:        { label: '通义千问',    provider: 'openai-compatible', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',                          defaultModel: 'qwen3-max' },
    doubao:      { label: '豆包',        provider: 'openai-compatible', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',                                    defaultModel: 'doubao-1.6-250615' },
    glm:         { label: '智谱',        provider: 'openai-compatible', baseUrl: 'https://open.bigmodel.cn/api/paas/v4',                                         defaultModel: 'glm-4.7' },
    minimax:     { label: 'MiniMax',     provider: 'openai-compatible', baseUrl: 'https://api.minimax.chat/v1',                                                defaultModel: 'MiniMax-Text-01' },
    openrouter:  { label: 'OpenRouter',  provider: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1',                                               defaultModel: 'openrouter/auto' },
    siliconflow:{ label: 'SiliconFlow', provider: 'openai-compatible', baseUrl: 'https://api.siliconflow.cn/v1',                                              defaultModel: 'deepseek-ai/DeepSeek-V3' },
    custom:      { label: '自定义',      provider: 'openai-compatible', baseUrl: '',                                                                          defaultModel: '' },
};

// 主流模型预设（快速添加）—— 按 2025 年实际版本整理
const PRESET_MODELS = [
    { group: 'OpenAI', items: [
        { name: 'GPT-5', provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-5', desc: '2025.8 发布，统一架构旗舰' },
        { name: 'GPT-4o', provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o', desc: '多模态实时主力' },
        { name: 'GPT-4o-mini', provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini', desc: '轻量低成本' },
        { name: 'o3', provider: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', modelName: 'o3', desc: '深度推理模型' },
    ]},
    { group: 'DeepSeek', items: [
        { name: 'DeepSeek-V3-0324', provider: 'openai-compatible', baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat', desc: '2025.3 通用旗舰，MIT开源' },
        { name: 'DeepSeek-R1-0528', provider: 'openai-compatible', baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-reasoner', desc: '2025.5 推理专用，AIME 87.5%' },
    ]},
    { group: 'Anthropic', items: [
        { name: 'Claude 4 Opus', provider: 'anthropic', baseUrl: 'https://api.anthropic.com', modelName: 'claude-opus-4-20250514', desc: '2025.5 最强旗舰，编码 SWE 72.7%' },
        { name: 'Claude 4 Sonnet', provider: 'anthropic', baseUrl: 'https://api.anthropic.com', modelName: 'claude-sonnet-4-20250514', desc: '2025.5 平衡主力，高性价比' },
        { name: 'Claude 3.7 Sonnet', provider: 'anthropic', baseUrl: 'https://api.anthropic.com', modelName: 'claude-3-7-sonnet-20250219', desc: '2025.2 混合推理，128K输出' },
    ]},
    { group: 'Google', items: [
        { name: 'Gemini 2.5 Pro', provider: 'openai-compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelName: 'gemini-2.5-pro-preview-06-05', desc: '2025.6 GA稳定版，编程登顶' },
        { name: 'Gemini 2.5 Flash', provider: 'openai-compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelName: 'gemini-2.5-flash-preview-05-20', desc: '2025.6 GA，可开关推理' },
        { name: 'Gemini 2.5 Flash-Lite', provider: 'openai-compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', modelName: 'gemini-2.5-flash-lite-preview-06-17', desc: '成本最低，高吞吐' },
    ]},
    { group: '月之暗面', items: [
        { name: 'Kimi K2-0905', provider: 'openai-compatible', baseUrl: 'https://api.moonshot.cn/v1', modelName: 'kimi-k2-0905', desc: '2025.9 更新，256K上下文' },
        { name: 'Kimi K2 Thinking', provider: 'openai-compatible', baseUrl: 'https://api.moonshot.cn/v1', modelName: 'kimi-k2-thinking-251104', desc: '2025.11 深度推理+工具调用' },
        { name: 'Kimi k1.5', provider: 'openai-compatible', baseUrl: 'https://api.moonshot.cn/v1', modelName: 'kimi-k1.5', desc: '2025.1 多模态思考模型' },
    ]},
    { group: 'MiniMax', items: [
        { name: 'MiniMax-Text-01', provider: 'openai-compatible', baseUrl: 'https://api.minimax.chat/v1', modelName: 'MiniMax-Text-01', desc: '海螺系列，456B/45.9B' },
    ]},
    { group: '智谱', items: [
        { name: 'GLM-4.7', provider: 'openai-compatible', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-4.7', desc: '2025.12 旗舰，SWE 73.8%' },
        { name: 'GLM-4.6', provider: 'openai-compatible', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-4.6', desc: '2025.9 开源，CodeArena第一' },
        { name: 'GLM-5.1', provider: 'openai-compatible', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', modelName: 'glm-5.1', desc: 'Agentic长程规划，8h自主' },
    ]},
    { group: '通义千问', items: [
        { name: 'Qwen3-Max', provider: 'openai-compatible', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen3-max', desc: '2025.9 阿里旗舰，262K上下文' },
        { name: 'Qwen3-Coder', provider: 'openai-compatible', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen3-coder-plus', desc: '代码专用，工具调用鲁棒' },
    ]},
    { group: '字节豆包', items: [
        { name: 'Doubao-1.6', provider: 'openai-compatible', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', modelName: 'doubao-1.6-250615', desc: '2025.6 发布，全球前列' },
        { name: 'Doubao-1.5-pro', provider: 'openai-compatible', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', modelName: 'doubao-1.5-pro-32k-250115', desc: '稀疏MoE，超越GPT-4o' },
        { name: 'Doubao-1.5-lite', provider: 'openai-compatible', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', modelName: 'doubao-1.5-lite-32k-250115', desc: '轻量高速，低成本' },
    ]},
    { group: 'OpenRouter', items: [
        { name: 'OpenRouter', provider: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1', modelName: 'openrouter/auto', desc: '模型聚合，自动路由' },
    ]},
];

// 官方工具列表（全局）
const OFFICIAL_SLASH_TOOLS = [
    { key: 'continue', name: 'AI 续写', icon: '✍️', needSelection: false, category: '写作辅助' },
    { key: 'polish', name: '文本润色', icon: '🎨', needSelection: true, category: '写作辅助' },
    { key: 'expand', name: '句子扩写', icon: '📝', needSelection: true, category: '写作辅助' },
    { key: 'rewrite', name: 'AI 改写', icon: '🔀', needSelection: true, category: '写作辅助' },
    { key: 'de-ai', name: '去AI味', icon: '✏️', needSelection: true, category: '写作辅助' },
    { key: 'scene', name: '场景描写', icon: '🏛️', needSelection: false, category: '写作辅助' },
    { key: 'dialogue', name: '对话生成', icon: '💬', needSelection: false, category: '写作辅助' },
    { key: 'character', name: '角色生成', icon: '👤', needSelection: false, category: '剧情设计' },
    { key: 'outline', name: '总纲生成', icon: '📋', needSelection: false, category: '剧情设计' },
    { key: 'chapter-outline', name: '章纲生成', icon: '📑', needSelection: false, category: '剧情设计' },
    { key: 'inspiration', name: '灵感生成', icon: '💡', needSelection: false, category: '剧情设计' },
    { key: 'conflict', name: '冲突升级', icon: '⚔️', needSelection: false, category: '剧情设计' },
    { key: 'foreshadow', name: '伏笔设计', icon: '🎭', needSelection: false, category: '剧情设计' },
    { key: 'detect', name: 'AI 纠错', icon: '🔍', needSelection: true, category: '分析优化' },
    { key: 'pacing', name: '节奏分析', icon: '🎵', needSelection: true, category: '分析优化' },
    { key: 'hook', name: '开篇优化', icon: '🪝', needSelection: true, category: '分析优化' },
    { key: 'titles', name: '标题生成', icon: '🏷️', needSelection: false, category: '包装运营' },
    { key: 'blurb', name: '简介生成', icon: '📰', needSelection: false, category: '包装运营' },
];

// 对话面板工具 → 后端独立路由映射
const CHAT_TOOL_ROUTES = {
    continue:       '/ai/continue',
    polish:         '/ai/polish',
    expand:         '/ai/expand',
    rewrite:        '/ai/rewrite',
    'de-ai':        '/ai/de-ai',
    scene:          '/ai/scene',
    dialogue:       '/ai/dialogue',
    character:      '/ai/character',
    outline:        '/ai/outline',
    'chapter-outline': '/ai/chapter-outline',
    inspiration:    '/ai/inspiration',
    conflict:       '/ai/conflict',
    foreshadow:     '/ai/foreshadow',
    detect:         '/ai/detect',
    pacing:         '/ai/pacing',
    hook:           '/ai/hook',
    titles:         '/ai/titles',
    blurb:          '/ai/blurb',
};

