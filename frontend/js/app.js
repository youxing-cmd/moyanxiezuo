// ===== 九章写作 - 前端应用 =====

const API_BASE = '/api';
let currentUser = null;
let authToken = localStorage.getItem('jz_token') || '';
let currentWorkId = null;
let currentChapterId = null;
let currentWorkData = null;
let currentChapterTitle = '';
let isCrossChapterScrollEnabled = false;
let isScrollingToNextChapter = false;
let isContentDirty = false;
let currentChatTool = 'continue';
let currentCustomToolId = null;
let currentModelId = null;
const savedModelId = localStorage.getItem('jz_current_model_id');
if (savedModelId) {
    // 兼容旧格式：纯数字 ID 是旧版用户自建模型，清理后回退默认
    const parsed = parseInt(savedModelId);
    if (!isNaN(parsed) && String(parsed) === savedModelId) {
        localStorage.removeItem('jz_current_model_id');
    } else {
        currentModelId = savedModelId;
    }
}
let modelConfigList = [];
// 引用高亮 span 的 id（全局，供划词和@引用共用）
let refSpanId = null;

// 划词引用存储（ID → 完整文本，全局共享）
const quoteStore = new Map();
let quoteCounter = 0;

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

// 编辑器撤销栈
const MAX_UNDO_STEPS = 50;
let editorUndoStack = [];
let editorUndoIndex = -1;
let editorUndoTimer = null;
let isUndoRedoAction = false;

// === L2 Agent: 编辑器对外 API（供 AI 工具调用使用）===
// 每个方法内部按需获取 DOM，不依赖时序；方法只对 #editorArea 这一个编辑器实例操作
// 写入类方法返回 JSON 字符串（含 ok/error 字段）作为 tool result 喂给模型
window.jzEditor = {
    _lastSnapshot: null, // 最近一次写入操作前的 innerHTML 快照，用于撤销

    _getEl() {
        return document.getElementById('editorArea');
    },

    _saveSnapshot() {
        const el = this._getEl();
        if (!el) return;
        this._lastSnapshot = el.innerHTML;
    },

    // ===== 只读 =====
    getFullText() {
        const el = this._getEl();
        if (!el) return '';
        return (el.innerText || '').trim();
    },

    getSelection() {
        const el = this._getEl();
        if (!el) return '';
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return '';
        const range = sel.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) return '';
        return sel.toString();
    },

    // ===== 写入 =====
    replaceSelection(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const text = (args && typeof args.text === 'string') ? args.text : '';
        if (!text) return JSON.stringify({ ok: false, error: '替换文本为空' });

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            return JSON.stringify({ ok: false, error: '请先在编辑器中选中要替换的文字' });
        }
        const range = sel.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) {
            return JSON.stringify({ ok: false, error: '请先将选区放在编辑器中' });
        }
        if (range.collapsed) {
            return JSON.stringify({ ok: false, error: '当前没有选中文字' });
        }

        this._saveSnapshot();
        range.deleteContents();

        // 按段落拆分，每段用 <p> 包裹
        const paragraphs = text.split('\n');
        const frag = document.createDocumentFragment();
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para || ' ';
            frag.appendChild(p);
        });
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ ok: true, replaced_chars: text.length });
    },

    insertAtCursor(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const text = (args && typeof args.text === 'string') ? args.text : '';
        if (!text) return JSON.stringify({ ok: false, error: '插入文本为空' });

        this._saveSnapshot();

        // 生成 <p> HTML
        const html = text.split('\n').map(para =>
            '<p>' + (para ? escapeHtml(para) : '&nbsp;') + '</p>'
        ).join('');

        // 空编辑器：直接 innerHTML，避免 contentEditable 空状态光标问题
        const isEmpty = !el.textContent.trim() || el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>';
        if (isEmpty) {
            el.innerHTML = html;
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) {
                return JSON.stringify({ ok: false, error: '请先将光标放在编辑器中' });
            }
            const range = sel.getRangeAt(0);
            if (!el.contains(range.commonAncestorContainer)) {
                return JSON.stringify({ ok: false, error: '请先将光标放在编辑器中' });
            }
            if (!range.collapsed) range.deleteContents();
            const frag = document.createDocumentFragment();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            while (temp.firstChild) frag.appendChild(temp.firstChild);
            range.insertNode(frag);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ ok: true, inserted_chars: text.length });
    },

    // ===== 在末尾追加段落 =====
    appendParagraph(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const text = (args && typeof args.text === 'string') ? args.text : '';
        if (!text) return JSON.stringify({ ok: false, error: '追加文本为空' });

        this._saveSnapshot();

        // 空编辑器清理
        if (!el.innerHTML.trim() || el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') {
            el.innerHTML = '';
        }

        // 按段落拆分，每段用 <p> 追加
        const paragraphs = text.split('\n');
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para || ' ';
            el.appendChild(p);
        });

        el.scrollTop = el.scrollHeight;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ ok: true, appended_chars: text.length });
    },

    // ===== 查找替换（文本级别） =====
    findReplace(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const pattern = (args && typeof args.pattern === 'string') ? args.pattern : '';
        const replacement = (args && typeof args.replacement === 'string') ? args.replacement : '';
        if (!pattern) return JSON.stringify({ ok: false, error: '查找模式为空' });

        this._saveSnapshot();
        const replaceAll = !!(args && args.replace_all);
        const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(esc, replaceAll ? 'g' : '');
        let count = 0;

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        for (const node of nodes) {
            const text = node.textContent || '';
            if (!text.includes(pattern)) continue;
            const parent = node.parentNode;
            if (!parent) continue;
            const newText = text.replace(regex, replacement);
            if (newText === text) continue;
            const parts = text.split(pattern);
            const frag = document.createDocumentFragment();
            parts.forEach((part, i) => {
                frag.appendChild(document.createTextNode(part));
                if (i < parts.length - 1) frag.appendChild(document.createTextNode(replacement));
            });
            parent.replaceChild(frag, node);
            count++;
            if (!replaceAll) break;
        }

        return JSON.stringify({ ok: true, replaced_count: count });
    },

    // ===== 获取章节列表（只读） =====
    getChapterList() {
        const chapters = currentWorkData?.chapters || currentWorkData?.chapterList || [];
        if (!chapters.length) return JSON.stringify({ chapters: [] });
        const list = chapters.map((ch, idx) => ({
            index: idx + 1,
            title: ch.title || `第${idx + 1}章`,
            wordCount: ch.wordCount || 0,
        }));
        return JSON.stringify({ chapters: list });
    },

    // ===== 撤销最近一次写入操作 =====
    restoreLastSnapshot() {
        const el = this._getEl();
        if (!el || this._lastSnapshot === null) return false;
        el.innerHTML = this._lastSnapshot;
        this._lastSnapshot = null;
        return true;
    },
    hasUndoSnapshot() {
        return this._lastSnapshot !== null;
    },
};

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

// 全局工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 判断 avatar 是否为图片 URL（兼容缺少协议前缀的情况）
function resolveAvatar(val, fallback) {
    const fb = fallback || '创';
    if (val == null) return { isUrl: false, text: fb };
    const s = String(val).trim();
    if (!s) return { isUrl: false, text: fb };
    if (/^(https?:)?\/\//i.test(s)) {
        return { isUrl: true, src: s.startsWith('//') ? 'https:' + s : s };
    }
    // 不带协议但显然是 URL（含路径分隔符或域名特征）
    if (/[\/.]/.test(s) && s.length > 6 && !/^[\p{L}\p{N}\p{Emoji}]$/u.test(s)) {
        return { isUrl: true, src: 'https://' + s.replace(/^\/+/, '') };
    }
    return { isUrl: false, text: s };
}

function renderMarkdown(md) {
    if (!md) return '';
    return md
        .replace(/^### (.*$)/gim, '<h3 style="font-size:14px;font-weight:600;margin:12px 0 6px;color:var(--text-primary);">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size:15px;font-weight:600;margin:14px 0 8px;color:var(--text-primary);">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="font-size:16px;font-weight:600;margin:16px 0 10px;color:var(--text-primary);">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gim, '<li style="margin-left:16px;margin-bottom:4px;">$1</li>')
        .replace(/\n/g, '<br>');
}

// ========== AI 替换：句子级 LCS Diff ==========
function splitSentencesForDiff(text) {
    if (!text) return [];
    const out = [];
    const re = /[^。！？!?\n]+[。！？!?]?|\n/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m[0]) out.push(m[0]);
    }
    return out;
}

function lcsDiffSentences(a, b) {
    const n = a.length, m = b.length;
    if (n === 0) return b.map(t => ({ type: 'add', text: t }));
    if (m === 0) return a.map(t => ({ type: 'remove', text: t }));
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const out = [];
    let i = n, j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            out.unshift({ type: 'same', text: a[i - 1] });
            i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            out.unshift({ type: 'remove', text: a[i - 1] });
            i--;
        } else {
            out.unshift({ type: 'add', text: b[j - 1] });
            j--;
        }
    }
    while (i > 0) out.unshift({ type: 'remove', text: a[--i] });
    while (j > 0) out.unshift({ type: 'add', text: b[--j] });
    return out;
}

function renderDiffHtml(originalText, newText) {
    const a = splitSentencesForDiff((originalText || '').trim());
    const b = splitSentencesForDiff((newText || '').trim());
    const tokens = lcsDiffSentences(a, b);
    const merged = [];
    for (const t of tokens) {
        const last = merged[merged.length - 1];
        if (last && last.type === t.type) last.text += t.text;
        else merged.push({ ...t });
    }
    return merged.map(t => {
        const safe = escapeHtml(t.text).replace(/\n/g, '<br>');
        if (t.type === 'same') return safe;
        if (t.type === 'remove') return `<span class="jz-diff-remove">${safe}</span>`;
        return `<span class="jz-diff-add">${safe}</span>`;
    }).join('');
}

// 在指定 result 元素后注入差异对比面板（如已存在则更新）
function injectDiffPanel(resultElId, originalText) {
    const resultEl = document.getElementById(resultElId);
    if (!resultEl) return;
    const currentText = (resultEl.textContent || '').trim();
    if (!currentText) return;
    const panelId = resultElId + '_diff';
    let panel = document.getElementById(panelId);
    if (!panel) {
        panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'jz-diff-panel';
        panel.innerHTML = `
            <div class="jz-diff-panel-title">
                <span>差异对比</span>
                <span class="jz-diff-legend"><span class="jz-diff-dot" style="background:#dc2626;"></span>原文删除</span>
                <span class="jz-diff-legend"><span class="jz-diff-dot" style="background:#16a34a;"></span>AI 新增</span>
            </div>
            <div class="jz-diff-body" style="word-break:break-word;"></div>`;
        resultEl.parentNode.insertBefore(panel, resultEl.nextSibling);
    }
    const body = panel.querySelector('.jz-diff-body');
    if (body) body.innerHTML = renderDiffHtml(originalText, currentText);
}

// ========== Markdown 转 HTML ==========
function parseMarkdownToHtml(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // 代码块
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg-tertiary); padding:10px; border-radius:6px; overflow-x:auto; font-size:0.85em; line-height:1.5; margin:8px 0; color:#1a1a1a;"><code>$1</code></pre>');

    // 行内代码
    html = html.replace(/`([^`\n]+)`/g, '<code style="background:var(--bg-tertiary); padding:2px 5px; border-radius:3px; font-size:0.85em; color:#1a1a1a;">$1</code>');

    // 粗体
    html = html.replace(/\*\*([^\n]+?)\*\*/g, '<strong style="font-weight:700; color:#1a1a1a;">$1</strong>');

    // 斜体（避免匹配粗体）
    html = html.replace(/(?<!\*)\*([^\n\*]+?)\*(?!\*)/g, '<em style="font-style:italic; color:#1a1a1a;">$1</em>');

    // 删除线
    html = html.replace(/~~([^\n]+?)~~/g, '<del style="text-decoration:line-through; opacity:0.6; color:#1a1a1a;">$1</del>');

    // 引用
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid var(--accent); padding-left:10px; margin:8px 0; color:#1a1a1a;">$1</blockquote>');

    // 标题
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h3 style="font-size:1.2em; font-weight:700; margin:16px 0 8px; color:#1a1a1a;">$1</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h2 style="font-size:1.45em; font-weight:700; margin:20px 0 10px; color:#1a1a1a;">$1</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1 style="font-size:1.85em; font-weight:700; margin:24px 0 12px; color:#1a1a1a;">$1</h1>');

    // 分割线
    html = html.replace(/^[-\*]{3,}$/gm, '<hr style="border:none; border-top:1px solid var(--border); margin:16px 0; color:#1a1a1a;">');

    // 有序列表 - 先收集所有项目
    const olItems = [];
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, (m, n, item) => {
        olItems.push(item);
        return '___OL_ITEM___';
    });
    if (olItems.length > 0) {
        let idx = 0;
        html = html.replace(/___OL_ITEM___/g, () => '<li>' + olItems[idx++] + '</li>');
        html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ol style="padding-left:20px; margin:8px 0; color:#1a1a1a;">$&</ol>');
    }

    // 无序列表
    const ulItems = [];
    html = html.replace(/^[-\*]\s+(.+)$/gm, (m, item) => {
        ulItems.push(item);
        return '___UL_ITEM___';
    });
    if (ulItems.length > 0) {
        let idx = 0;
        html = html.replace(/___UL_ITEM___/g, () => '<li>' + ulItems[idx++] + '</li>');
        html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul style="padding-left:20px; margin:8px 0; color:#1a1a1a;">$&</ul>');
    }

    // 段落包裹
    const blocks = html.split(/\n\s*\n/);
    const wrapped = blocks.map(block => {
        block = block.trim();
        if (!block) return '';
        if (/^<(h[1-6]|pre|blockquote|ol|ul|hr|li)/.test(block)) return block;
        block = block.replace(/\n/g, '<br>');
        return '<p style="margin:0 0 10px 0; line-height:1.8; color:#1a1a1a;">' + block + '</p>';
    }).filter(Boolean);

    return wrapped.join('\n');
}

// ========== 编辑器撤销栈 ==========
function pushEditorUndo(content) {
    if (isUndoRedoAction) return;
    // 如果内容没变，不推入
    if (editorUndoStack.length > 0 && editorUndoStack[editorUndoIndex] === content) return;
    // 截断当前索引之后的历史（重做链）
    if (editorUndoIndex < editorUndoStack.length - 1) {
        editorUndoStack = editorUndoStack.slice(0, editorUndoIndex + 1);
    }
    editorUndoStack.push(content);
    if (editorUndoStack.length > MAX_UNDO_STEPS) {
        editorUndoStack.shift();
    } else {
        editorUndoIndex++;
    }
    updateUndoRedoButtons();
}

function editorUndo() {
    if (editorUndoIndex <= 0) {
        showToast('没有可撤销的操作', 'info');
        return;
    }
    isUndoRedoAction = true;
    editorUndoIndex--;
    const content = editorUndoStack[editorUndoIndex];
    const editorArea = document.getElementById('editorArea');
    if (editorArea) {
        // 保留标题，只替换正文
        const titleEl = editorArea.querySelector('h1#editorTitle');
        const titleHtml = titleEl ? titleEl.outerHTML : '';
        editorArea.innerHTML = titleHtml + content;
    }
    updateUndoRedoButtons();
    isUndoRedoAction = false;
    showToast('已撤销', 'info');
}

function editorRedo() {
    if (editorUndoIndex >= editorUndoStack.length - 1) {
        showToast('没有可重做的操作', 'info');
        return;
    }
    isUndoRedoAction = true;
    editorUndoIndex++;
    const content = editorUndoStack[editorUndoIndex];
    const editorArea = document.getElementById('editorArea');
    if (editorArea) {
        const titleEl = editorArea.querySelector('h1#editorTitle');
        const titleHtml = titleEl ? titleEl.outerHTML : '';
        editorArea.innerHTML = titleHtml + content;
    }
    updateUndoRedoButtons();
    isUndoRedoAction = false;
    showToast('已重做', 'info');
}

function updateUndoRedoButtons() {
    const undoBtn = document.querySelector('.editor-tool-btn[title^="撤销"]');
    const redoBtn = document.querySelector('.editor-tool-btn[title^="重做"]');
    if (undoBtn) undoBtn.style.opacity = editorUndoIndex > 0 ? '1' : '0.3';
    if (redoBtn) redoBtn.style.opacity = editorUndoIndex < editorUndoStack.length - 1 ? '1' : '0.3';
}

function initEditorUndoStack() {
    editorUndoStack = [];
    editorUndoIndex = -1;
    const editorArea = document.getElementById('editorArea');
    if (editorArea) {
        const titleEl = editorArea.querySelector('h1#editorTitle');
        let content = editorArea.innerHTML;
        if (titleEl) content = content.replace(titleEl.outerHTML, '');
        pushEditorUndo(content);
    }
}

function clearEditorUndoStack() {
    editorUndoStack = [];
    editorUndoIndex = -1;
    updateUndoRedoButtons();
}

function clearEditorFormat() {
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const sel = window.getSelection();
    if (sel.rangeCount === 0) {
        showToast('请先选中要清除格式的文本', 'warning');
        return;
    }
    document.execCommand('removeFormat');
    showToast('已清除格式', 'success');
}

// ========== API 请求 ==========
async function api(path, options = {}) {
    const url = API_BASE + path;
    const opts = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            ...options.headers,
        },
        ...options,
    };
    if (opts.body && typeof opts.body === 'object') {
        opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        if (res.status === 403 && data?.code === 'INSUFFICIENT_POINTS') {
            showToast(`积分不足，当前剩余 ${data.have ?? 0} 积分，每次调用消耗 1 积分`, 'warning');
        }
        throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
}

// ========== 认证 ==========
function renderAuthForm(mode) {
    const form = document.getElementById('authForm');
    if (!form) return;
    // 清除绑定标记，确保重新绑定事件
    form.dataset.bound = '';
    if (mode === 'login') {
        form.innerHTML = `
            <div style="display:flex; margin-bottom:16px; border-bottom:1px solid var(--border);">
                <button type="button" class="login-subtab active" data-subtab="password" style="flex:1; padding:10px 8px; border:none; background:transparent; color:var(--text-primary); font-size:13px; cursor:pointer; border-bottom:2px solid var(--accent);">密码登录</button>
                <button type="button" class="login-subtab" data-subtab="code" style="flex:1; padding:10px 8px; border:none; background:transparent; color:var(--text-muted); font-size:13px; cursor:pointer; border-bottom:2px solid transparent;">验证码登录</button>
            </div>
            <div id="loginPasswordForm" style="display:block;">
                <div class="form-group">
                    <label class="form-label">手机号</label>
                    <input type="text" class="form-input" id="loginPhone" placeholder="请输入手机号" autocomplete="tel">
                </div>
                <div class="form-group">
                    <label class="form-label">密码</label>
                    <input type="password" class="form-input" id="loginPassword" placeholder="请输入密码" autocomplete="current-password">
                </div>
                <button type="button" class="btn btn-primary" id="btnLoginPassword" style="width:100%; margin-top:8px;">登录</button>
            </div>
            <div id="loginCodeForm" style="display:none;">
                <div class="form-group">
                    <label class="form-label">手机号</label>
                    <input type="text" class="form-input" id="loginCodePhone" placeholder="请输入手机号" autocomplete="tel">
                </div>
                <div class="form-group">
                    <label class="form-label">验证码</label>
                    <div style="display:flex; gap:8px;">
                        <input type="text" class="form-input" id="loginCodeInput" placeholder="请输入验证码" autocomplete="one-time-code" style="flex:1;">
                        <button type="button" class="btn btn-ghost" id="btnSendCode" style="white-space:nowrap; font-size:12px; padding:8px 12px;">获取验证码</button>
                    </div>
                </div>
                <button type="button" class="btn btn-primary" id="btnLoginCode" style="width:100%; margin-top:8px;">登录</button>
            </div>
            <div style="margin-top:16px; text-align:center;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--text-muted); font-size:12px;">
                    <div style="flex:1; height:1px; background:var(--border);"></div>
                    <span>第三方登录</span>
                    <div style="flex:1; height:1px; background:var(--border);"></div>
                </div>
                <button type="button" class="btn btn-ghost" id="btnLoginFeishu" style="width:100%; border:1px solid var(--border); color:#3370ff; font-weight:500;">
                    <span style="display:inline-flex; align-items:center; gap:6px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        飞书登录
                    </span>
                </button>
            </div>
        `;
    } else {
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label">昵称</label>
                <input type="text" class="form-input" id="regUsername" placeholder="请输入昵称" autocomplete="nickname">
            </div>
            <div class="form-group">
                <label class="form-label">手机号</label>
                <input type="text" class="form-input" id="regPhone" placeholder="请输入手机号" autocomplete="tel">
            </div>
            <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" class="form-input" id="regPassword" placeholder="至少6位密码" autocomplete="new-password">
            </div>
            <button type="button" class="btn btn-primary" id="btnRegister" style="width:100%; margin-top:8px;">注册</button>
        `;
    }
    bindAuthFormEvents();
}

function switchLoginSubtab(subtab, btn) {
    document.querySelectorAll('.login-subtab').forEach(t => {
        t.classList.remove('active');
        t.style.borderBottom = '2px solid transparent';
        t.style.color = 'var(--text-muted)';
    });
    if (btn) {
        btn.classList.add('active');
        btn.style.borderBottom = '2px solid var(--accent)';
        btn.style.color = 'var(--text-primary)';
    }
    const pwForm = document.getElementById('loginPasswordForm');
    const codeForm = document.getElementById('loginCodeForm');
    if (pwForm) pwForm.style.display = subtab === 'password' ? 'block' : 'none';
    if (codeForm) codeForm.style.display = subtab === 'code' ? 'block' : 'none';
}

function bindAuthFormEvents() {
    const form = document.getElementById('authForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    // 事件委托：子 tab 切换
    form.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('login-subtab')) {
            const subtab = btn.dataset.subtab;
            if (subtab) switchLoginSubtab(subtab, btn);
        }
    });

    // 直接绑定各按钮（避免事件委托失效）
    const bindBtn = (id, handler) => {
        const btn = document.getElementById(id);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handler();
            });
        }
    };
    bindBtn('btnLoginPassword', handleLogin);
    bindBtn('btnLoginCode', handleLoginByCode);
    bindBtn('btnSendCode', sendLoginCode);
    bindBtn('btnLoginFeishu', handleFeishuLogin);
    bindBtn('btnRegister', handleRegister);
}

async function handleLogin() {
    const phone = document.getElementById('loginPhone')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!phone || !password) {
        showToast('请输入手机号和密码', 'warning');
        return;
    }
    try {
        const data = await api('/auth/login', { method: 'POST', body: { username: phone, password } });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('jz_token', authToken);
        showToast('登录成功', 'success');
        updateUserInfo();
        hideAuth();
        switchPage('works');
    } catch (err) {
        showToast(err.message || '登录失败', 'danger');
    }
}

async function sendLoginCode() {
    const phone = document.getElementById('loginCodePhone')?.value.trim();
    if (!phone) {
        showToast('请输入手机号', 'warning');
        return;
    }
    const btn = document.getElementById('btnSendCode');
    if (btn.disabled) return;
    try {
        await api('/auth/send-code', { method: 'POST', body: { phone } });
        showToast('验证码已发送', 'success');
        let sec = 60;
        btn.disabled = true;
        btn.textContent = `${sec}s 后重发`;
        const timer = setInterval(() => {
            sec--;
            if (sec <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = '获取验证码';
            } else {
                btn.textContent = `${sec}s 后重发`;
            }
        }, 1000);
    } catch (err) {
        showToast(err.message || '发送失败', 'danger');
    }
}

async function handleLoginByCode() {
    const phone = document.getElementById('loginCodePhone')?.value.trim();
    const code = document.getElementById('loginCodeInput')?.value.trim();
    if (!phone || !code) {
        showToast('请输入手机号和验证码', 'warning');
        return;
    }
    try {
        const data = await api('/auth/login-by-code', { method: 'POST', body: { phone, code } });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('jz_token', authToken);
        showToast('登录成功', 'success');
        updateUserInfo();
        hideAuth();
        switchPage('works');
    } catch (err) {
        showToast(err.message || '登录失败', 'danger');
    }
}

async function handleFeishuLogin() {
    try {
        const data = await api('/auth/feishu/url');
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('飞书登录未配置', 'warning');
        }
    } catch (err) {
        showToast(err.message || '飞书登录失败', 'danger');
    }
}

async function handleRegister() {
    const username = document.getElementById('regUsername')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    if (!username || !phone || !password) {
        showToast('请填写完整信息', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('密码至少6位', 'warning');
        return;
    }
    try {
        const data = await api('/auth/register', { method: 'POST', body: { username, phone, password } });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('jz_token', authToken);
        showToast('注册成功', 'success');
        updateUserInfo();
        hideAuth();
        switchPage('works');
    } catch (err) {
        showToast(err.message || '注册失败', 'danger');
    }
}

async function checkAuth() {
    if (!authToken) {
        currentUser = null;
        updateUserInfo();
        return false;
    }
    try {
        const user = await api('/auth/me');
        currentUser = user;
        updateUserInfo();
        return true;
    } catch {
        authToken = '';
        currentUser = null;
        localStorage.removeItem('jz_token');
        updateUserInfo();
        // token 过期/失效，清空用户相关状态和页面内容
        clearUserState();
        return false;
    }
}

function showAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
    // 总是用 JS 渲染完整表单（确保第三方登录按钮一致出现）
    renderAuthForm('login');
    // 绑定顶层 tab 切换（登录/注册）
    document.querySelectorAll('#authTabs .auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#authTabs .auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderAuthForm(tab.dataset.tab);
        });
    });
}

function hideAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
}

function clearUserState() {
    currentWorkId = null;
    currentChapterId = null;
    currentWorkData = null;
    currentChapterTitle = '';
    currentWritingView = 'editor';
    currentAnalysisData = null;
    currentAnalysisTab = 'all';
    lastSavedContent = '';
    isContentDirty = false;
    isScrollingToNextChapter = false;
    clearLocalCache();
    const contentArea = document.getElementById('contentArea');
    if (contentArea) contentArea.innerHTML = '';
    const editorArea = document.getElementById('editorArea');
    if (editorArea) editorArea.innerHTML = '';
}

function logout() {
    authToken = '';
    currentUser = null;
    localStorage.removeItem('jz_token');
    clearUserState();
    updateUserInfo();
    showToast('已退出登录', 'info');
    showAuth();
}

function handleUserCardClick() {
    if (currentUser) {
        switchPage('profile');
    } else {
        showAuth();
    }
}

// ========== 积分系统 ==========
async function handleCheckIn() {
    try {
        const res = await api('/points/check-in', { method: 'POST' });
        showToast(res.message || `签到成功 +${res.reward}积分`, 'success');
        if (currentUser) currentUser.points = res.points;
        updateUserInfo();
    } catch (err) {
        showToast(err.message || '签到失败', 'error');
    }
}

async function showPointTransactions() {
    try {
        const list = await api('/points/transactions?page=1&pageSize=20');
        if (!list || list.length === 0) {
            showModal('积分明细', '<p style="text-align:center; color:var(--text-muted); padding:20px;">暂无积分变动记录</p>');
            return;
        }
        const rows = list.map((t) => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px;"
                <span style="color:var(--text-secondary);">${escapeHtml(t.description)}</span>
                <span style="color:${t.amount > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;"
                    ${t.amount > 0 ? '+' : ''}${t.amount}
                </span>
            </div>
        `).join('');
        showModal('积分明细', `<div style="max-height:400px; overflow-y:auto;">${rows}</div>`);
    } catch (err) {
        showToast('加载失败', 'error');
    }
}

function showRedeemModal() {
    const u = currentUser || {};
    const points = u.points || 0;
    showModal('积分兑换订阅', `
        <div style="text-align:center; margin-bottom:16px;"
            <div style="font-size:14px; color:var(--text-muted);">当前积分</div>
            <div style="font-size:28px; font-weight:700; color:var(--accent);">${points}</div>
        </div>
        <div style="display:flex; gap:12px; margin-bottom:16px;">
            <div style="flex:1; padding:16px; border:1px solid var(--border); border-radius:var(--radius-md); text-align:center; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="redeemSubscription('7days')">
                <div style="font-size:20px; font-weight:700; color:var(--text-primary);">7天</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">1000积分</div>
            </div>
            <div style="flex:1; padding:16px; border:1px solid var(--border); border-radius:var(--radius-md); text-align:center; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="redeemSubscription('30days')">
                <div style="font-size:20px; font-weight:700; color:var(--text-primary);">30天</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">3000积分</div>
            </div>
        </div>
        <div style="font-size:12px; color:var(--text-muted); text-align:center;">兑换后订阅时长自动累加</div>
    `);
}

async function redeemSubscription(duration) {
    try {
        const res = await api('/points/redeem', {
            method: 'POST',
            body: { duration },
        });
        showToast(`兑换成功，订阅延长${res.duration}天`, 'success');
        if (currentUser) {
            currentUser.points = res.points;
            currentUser.subscriptionType = res.subscriptionType || currentUser.subscriptionType;
            currentUser.subscriptionExpireAt = res.subscriptionExpireAt;
        }
        updateUserInfo();
        document.querySelector('.jz-modal-overlay')?.remove();
    } catch (err) {
        showToast(err.message || '兑换失败', 'error');
    }
}

function showPointsDetail() {
    const u = currentUser || {};
    const points = u.points || 0;
    const subType = u.subscriptionType || 'none';
    const subExpire = u.subscriptionExpireAt;
    const isActive = subType !== 'none' && subExpire && new Date(subExpire) > new Date();
    const subLabel = isActive ? (subType === 'yearly' ? '年费版' : '月费版') : '免费版';
    showModal('积分与订阅', `
        <div style="text-align:center; margin-bottom:16px;"
            <div style="font-size:14px; color:var(--text-muted);">当前积分</div>
            <div style="font-size:32px; font-weight:700; color:var(--accent); margin:8px 0;">${points}</div>
            <div style="font-size:13px; color:var(--text-muted);">订阅状态：${subLabel} ${isActive ? '(' + Math.ceil((new Date(subExpire).getTime() - Date.now()) / 86400000) + '天后到期)' : ''}</div>
        </div>
        <div style="display:flex; gap:8px;"
            <button class="btn btn-primary" style="flex:1;" onclick="document.querySelector('.jz-modal-overlay')?.remove(); showRedeemModal();">积分兑换</button>
            <button class="btn btn-outline" style="flex:1;" onclick="document.querySelector('.jz-modal-overlay')?.remove(); showPointTransactions();">积分明细</button>
        </div>
    `);
}

async function spendPoints(amount, description) {
    try {
        const res = await api('/points/spend', {
            method: 'POST',
            body: { amount, description },
        });
        if (currentUser) currentUser.points = res.points;
        updateUserInfo();
        return true;
    } catch (err) {
        showToast(err.message || '积分不足', 'warning');
        return false;
    }
}

async function earnPoints(task, relatedId) {
    try {
        const res = await api('/points/earn', {
            method: 'POST',
            body: { task, relatedId },
        });
        if (currentUser) currentUser.points = res.points;
        updateUserInfo();
    } catch (err) {
        // silently fail for auto rewards
    }
}

function updateUserInfo() {
    const nameEl = document.querySelector('.user-name');
    const statusEl = document.querySelector('.user-status');
    const avatarEl = document.querySelector('.user-avatar');
    const sidebarPointsInfo = document.getElementById('sidebarPointsInfo');
    const topbarPointsBtn = document.getElementById('topbarPointsBtn');

    if (!currentUser) {
        // 未登录状态：显示游客
        if (nameEl) nameEl.textContent = '游客';
        if (statusEl) statusEl.textContent = '点击登录';
        if (avatarEl) avatarEl.textContent = '游';
        if (sidebarPointsInfo) sidebarPointsInfo.style.display = 'none';
        if (topbarPointsBtn) topbarPointsBtn.style.display = 'none';
        return;
    }

    if (nameEl) nameEl.textContent = currentUser.username || '创作者';
    if (statusEl) statusEl.textContent = currentUser.membership || '免费版';
    if (avatarEl) {
        const fallback = currentUser.username?.[0] || '创';
        const a = resolveAvatar(currentUser.avatar, fallback);
        if (a.isUrl) {
            avatarEl.innerHTML = `<img src="${escapeAttr(a.src)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentNode.textContent='${escapeAttr(fallback)}'">`;
        } else {
            avatarEl.innerHTML = '';
            avatarEl.textContent = a.text;
        }
    }

    // 更新积分显示
    const topbarPoints = document.getElementById('topbarPoints');
    const sidebarPoints = document.getElementById('sidebarPoints');
    const sidebarSubType = document.getElementById('sidebarSubType');
    const sidebarSubExpire = document.getElementById('sidebarSubExpire');

    const points = currentUser.points || 0;
    const subType = currentUser.subscriptionType || 'none';
    const subExpire = currentUser.subscriptionExpireAt;
    const isActive = subType !== 'none' && subExpire && new Date(subExpire) > new Date();
    const subLabel = isActive ? (subType === 'yearly' ? '年费版' : '月费版') : '免费版';

    if (topbarPointsBtn) topbarPointsBtn.style.display = 'inline-flex';
    if (topbarPoints) topbarPoints.textContent = `💎 ${points}`;
    if (sidebarPointsInfo) sidebarPointsInfo.style.display = 'block';
    if (sidebarPoints) sidebarPoints.textContent = String(points);
    if (sidebarSubType) sidebarSubType.textContent = subLabel;
    if (sidebarSubExpire) {
        if (isActive && subExpire) {
            const days = Math.ceil((new Date(subExpire).getTime() - Date.now()) / (86400000));
            sidebarSubExpire.textContent = `${days}天后到期`;
        } else {
            sidebarSubExpire.textContent = '';
        }
    }
}

async function saveProfile(field) {
    if (field === 'username') {
        const val = document.getElementById('editUsername')?.value.trim();
        if (!val) return;
        try {
            await api('/auth/me', { method: 'PUT', body: { username: val } });
            currentUser.username = val;
            updateUserInfo();
            showToast('昵称已更新', 'success');
            document.querySelector('.jz-modal-overlay')?.remove();
            // 重新渲染个人页面以显示新昵称
            if (document.getElementById('pageTitle')?.textContent === '个人中心') {
                switchPage('profile');
            }
        } catch (err) {
            showToast(err.message || '更新失败', 'danger');
        }
    } else if (field === 'password') {
        const oldP = document.getElementById('oldPassword')?.value;
        const newP = document.getElementById('newPassword')?.value;
        const confirmP = document.getElementById('confirmPassword')?.value;
        if (!oldP || !newP) { showToast('请填写密码', 'warning'); return; }
        if (newP !== confirmP) { showToast('两次密码不一致', 'warning'); return; }
        try {
            await api('/auth/me', { method: 'PUT', body: { password: newP } });
            showToast('密码已修改', 'success');
            document.querySelector('.jz-modal-overlay')?.remove();
        } catch (err) {
            showToast(err.message || '修改失败', 'danger');
        }
    } else if (field === 'avatar') {
        const val = document.getElementById('editAvatar')?.value;
        if (!val) return;
        try {
            await api('/auth/me', { method: 'PUT', body: { avatar: val } });
            currentUser.avatar = val;
            updateUserInfo();
            showToast('头像已更新', 'success');
            document.querySelector('.jz-modal-overlay')?.remove();
            // 重新渲染个人页面以显示新头像
            if (document.getElementById('pageTitle')?.textContent === '个人中心') {
                switchPage('profile');
            }
        } catch (err) {
            showToast(err.message || '更新失败', 'danger');
        }
    }
}

function showAvatarPicker() {
    const emojis = ['🧑','👩','🧙','🧛','🧟','🤖','👽','🐉','🦊','🐺','🦁','🐯','🐼','🐨','🐸','🐙','🦄','🦅','🦉','🐦','🌟','🔥','⚡','❄️','🌊','🌙','☀️','🌈'];
    const grid = emojis.map(e => `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-tertiary);transition:background 0.15s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-tertiary)'" onclick="document.getElementById('editAvatar').value='${e}';saveProfile('avatar')">${e}</div>
    `).join('');
    showModal('更换头像', `<div style="margin-bottom:12px;"><input type="hidden" id="editAvatar"></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">${grid}</div>`);
}

function showChangePhoneModal() {
    const currentPhone = currentUser?.phone || '';
    showModal('修改手机号', `
        <div class="form-group">
            <label class="form-label">当前手机号</label>
            <input type="text" class="form-input" value="${currentPhone}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">新手机号</label>
            <input type="tel" class="form-input" id="changePhoneNew" maxlength="20" placeholder="请输入新手机号">
        </div>
        <div class="form-group">
            <label class="form-label">验证码</label>
            <div style="display:flex;gap:8px;">
                <input type="text" class="form-input" id="changePhoneCode" maxlength="6" placeholder="6位验证码" style="flex:1;">
                <button class="btn btn-outline" id="changePhoneSendBtn" onclick="sendChangePhoneCode()">获取验证码</button>
            </div>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay')?.remove()">取消</button>
            <button class="btn btn-primary" onclick="submitChangePhone()">确认修改</button>
        </div>
    `);
}

async function sendChangePhoneCode() {
    const phone = document.getElementById('changePhoneNew')?.value.trim();
    if (!phone) { showToast('请输入新手机号', 'warning'); return; }
    const btn = document.getElementById('changePhoneSendBtn');
    if (btn?.dataset.counting === '1') return;
    try {
        await api('/auth/send-code', { method: 'POST', body: { phone } });
        showToast('验证码已发送', 'success');
        if (!btn) return;
        btn.dataset.counting = '1';
        let sec = 60;
        btn.textContent = `${sec}s`;
        btn.disabled = true;
        const timer = setInterval(() => {
            sec--;
            if (btn) btn.textContent = `${sec}s`;
            if (sec <= 0) {
                clearInterval(timer);
                if (btn) { btn.textContent = '获取验证码'; btn.disabled = false; btn.dataset.counting = '0'; }
            }
        }, 1000);
    } catch (err) {
        showToast(err.message || '发送失败', 'error');
    }
}

async function submitChangePhone() {
    const phone = document.getElementById('changePhoneNew')?.value.trim();
    const code = document.getElementById('changePhoneCode')?.value.trim();
    if (!phone || !code) { showToast('请填写完整信息', 'warning'); return; }
    try {
        const res = await api('/auth/change-phone', { method: 'POST', body: { phone, code } });
        currentUser.phone = res.phone;
        updateUserInfo();
        showToast('手机号修改成功', 'success');
        document.querySelector('.jz-modal-overlay')?.remove();
        if (document.getElementById('pageTitle')?.textContent === '个人中心') {
            switchPage('profile');
        }
    } catch (err) {
        showToast(err.message || '修改失败', 'error');
    }
}

// ========== 长篇写作子视图 ==========
const writingViews = {
    // 封面信息
    cover: () => `
        <div class="page-section" style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 160px; height: 220px; background: linear-gradient(135deg, #1e3a5f, #0f2744); border-radius: var(--radius); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 64px; box-shadow: var(--shadow);">🗡️</div>
                <div style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">仙途漫漫</div>
                <div style="font-size: 14px; color: var(--text-tertiary);">玄幻 · 连载中 · 86万字</div>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">基本信息</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">作品名称</div>
                        <div style="font-size: 14px; color: var(--text-primary);">仙途漫漫</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">作者笔名</div>
                        <div style="font-size: 14px; color: var(--text-primary);">青云墨客</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">作品类型</div>
                        <div style="font-size: 14px; color: var(--text-primary);">玄幻 · 修仙</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">首发平台</div>
                        <div style="font-size: 14px; color: var(--text-primary);">起点中文网</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">创建时间</div>
                        <div style="font-size: 14px; color: var(--text-primary);">2025-03-15</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">最后更新</div>
                        <div style="font-size: 14px; color: var(--text-primary);">2026-04-29 14:32</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">作品简介</div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
                    林青云，一个出身平凡的山村少年，意外获得上古传承，踏上修仙之路。在这个强者为尊的世界里，他凭借坚韧的意志和过人的天赋，一步步从杂役弟子成长为震慑万界的仙尊。然而，当他站在巅峰之际，却发现这一切背后隐藏着一个关乎天地存亡的巨大阴谋……
                </div>
            </div>

            <div class="card">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">标签</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <span class="tag active">热血</span>
                    <span class="tag active">逆袭</span>
                    <span class="tag active">修炼</span>
                    <span class="tag">系统</span>
                    <span class="tag">爽文</span>
                    <span class="tag">凡人流</span>
                </div>
            </div>
        </div>
    `,

    // 大纲总览
    outline: () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">故事大纲</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">三幕结构 · 已规划至大结局</div>
                </div>
                <button class="btn btn-primary btn-sm">✏️ 编辑大纲</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div class="card" style="border-left: 3px solid var(--accent);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">第一幕：起 — 初入仙途</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        林青云在灵根测试中被判定为废灵根，沦为杂役弟子。机缘巧合下获得上古传承《九天玄功》，开始秘密修炼。在宗门大比中一鸣惊人，引起各方势力关注。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第1-50章</span>
                        <span>✅ 已完成</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--info);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--info); margin-bottom: 8px;">第二幕：承 — 宗门风云</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        林青云进入内门，卷入宗门权力斗争。发现宗门长老暗中勾结魔道，意图颠覆正道。在一次次生死历练中，林青云逐渐成长为核心弟子，并揭穿了长老的阴谋。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第51-200章</span>
                        <span>📝 连载中（当前第127章）</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--warning);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--warning); margin-bottom: 8px;">第三幕：转 — 万界征战</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        魔道全面入侵，林青云突破元婴期，带领正道联盟抵抗。在万界战场中发现上古遗迹，揭开天地大劫的真相。与宿敌莫天机展开最终对决。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第201-350章</span>
                        <span>⏳ 未开始</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--success);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--success); margin-bottom: 8px;">第四幕：合 — 登临绝巅</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        林青云突破大乘期，成为一代仙尊。化解天地大劫，重建三界秩序。与苏婉清终成眷属，归隐仙山，留下无数传说。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第351-400章</span>
                        <span>⏳ 未开始</span>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 细纲管理
    outlineDetail: () => `
        <div style="display: flex; height: 100%; gap: 16px; padding: 16px;">
            <!-- 左栏：章节列表 -->
            <div style="width: 220px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
                <div style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">章节列表</span>
                    <span style="font-size: 12px; color: var(--text-muted);">共128章</span>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 8px;">
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; padding: 8px 8px 4px;">第一卷：初入仙途</div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; background: rgba(99,102,241,0.08); margin-bottom: 2px; border-left: 2px solid var(--accent);">
                            <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">第1章 灵根测试</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">3200字 · 已发布</div>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
                            <div style="font-size: 13px; color: var(--text-primary);">第2章 拜师学艺</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">4100字 · 已发布</div>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
                            <div style="font-size: 13px; color: var(--text-primary);">第3章 初窥门径</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">3800字 · 已发布</div>
                        </div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; padding: 8px 8px 4px;">第二卷：宗门风云</div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
                            <div style="font-size: 13px; color: var(--text-primary);">第51章 内门选拔</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">4500字 · 已发布</div>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; background: rgba(245,158,11,0.08); margin-bottom: 2px; border-left: 2px solid var(--warning);">
                            <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">第127章 突破元婴</div>
                            <div style="font-size: 11px; color: var(--warning); margin-top: 2px;">5200字 · 草稿</div>
                        </div>
                    </div>
                </div>
                <div style="padding: 12px; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="showToast('新增章节', 'success')">➕ 新增章</button>
                </div>
            </div>

            <!-- 中栏：章节细纲 -->
            <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">细纲管理</div>
                        <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">当前：第1章 灵根测试 · 3200字</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline btn-sm" onclick="showToast('细纲已保存', 'success')">💾 保存细纲</button>
                        <button class="btn btn-primary btn-sm" onclick="switchWritingView('editor')">✏️ 编辑正文</button>
                    </div>
                </div>

                <div style="flex: 1; overflow-x: auto; overflow-y: hidden; display: flex; gap: 16px; padding-bottom: 8px;">
                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">开篇：山村少年</div>
                            <div style="font-size: 11px; color: var(--text-muted);">场景：青石村 · 人物：林青云、林父</div>
                        </div>
                        <div style="flex: 1; padding: 16px; overflow-y: auto;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">【核心情节点】</div>
                            <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; padding-left: 16px; margin: 0;">
                                <li>清晨，林青云在山中采药，展现其吃苦耐劳的性格</li>
                                <li>回到家中，父亲告知灵根测试的消息，青云内心忐忑</li>
                                <li>父亲鼓励青云，无论结果如何都要坚强面对</li>
                                <li>埋下伏笔：青云随身携带的神秘玉佩发出微光</li>
                            </ul>
                        </div>
                        <div style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('AI扩写中...', 'info')">🤖 AI扩写</button>
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('进入编辑模式', 'info')">📝 编辑</button>
                        </div>
                    </div>

                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">测试：灵根觉醒</div>
                            <div style="font-size: 11px; color: var(--text-muted);">场景：测灵殿 · 人物：林青云、测灵长老</div>
                        </div>
                        <div style="flex: 1; padding: 16px; overflow-y: auto;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">【核心情节点】</div>
                            <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; padding-left: 16px; margin: 0;">
                                <li>青云到达测灵殿，与各大家族子弟形成对比</li>
                                <li>测灵石对青云毫无反应，被判定为废灵根</li>
                                <li>长老冷漠宣布结果，周围人议论纷纷</li>
                                <li>青云强忍泪水，暗中握紧玉佩，感受到一股暖流</li>
                            </ul>
                        </div>
                        <div style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('AI扩写中...', 'info')">🤖 AI扩写</button>
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('进入编辑模式', 'info')">📝 编辑</button>
                        </div>
                    </div>

                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">转折：上古传承</div>
                            <div style="font-size: 11px; color: var(--text-muted);">场景：后山禁地 · 人物：林青云</div>
                        </div>
                        <div style="flex: 1; padding: 16px; overflow-y: auto;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">【核心情节点】</div>
                            <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; padding-left: 16px; margin: 0;">
                                <li>青云独自来到后山，玉佩突然发出强烈光芒</li>
                                <li>被传送到一处神秘洞府，遇到上古残魂</li>
                                <li>残魂认出青云体内的天灵根，传授《九天玄功》</li>
                                <li>青云获得传承，踏上修仙之路</li>
                            </ul>
                        </div>
                        <div style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('AI扩写中...', 'info')">🤖 AI扩写</button>
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('进入编辑模式', 'info')">📝 编辑</button>
                        </div>
                    </div>

                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 2px dashed var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; min-height: 200px;" onclick="showToast('添加新的细纲卡片', 'info')">
                        <div style="text-align: center; color: var(--text-muted);">
                            <div style="font-size: 24px; margin-bottom: 8px;">➕</div>
                            <div style="font-size: 13px;">添加卡片</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右栏：AI 灵感工具 -->
            <div style="width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
                <div style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">🤖 AI 灵感工具</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('启动工作流：生成细纲 → 扩写正文 → 润色', 'info')">
                            <span>⚡</span> 工作流
                        </button>
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('批量生成后续章节细纲', 'info')">
                            <span>📋</span> 批量生成章纲
                        </button>
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('基于当前情节生成新角色', 'info')">
                            <span>👤</span> 角色生成
                        </button>
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('重新生成故事总纲', 'info')">
                            <span>🎯</span> 生成总纲
                        </button>
                    </div>
                </div>

                <div style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">💡 当前灵感</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                        本章可以加强"废灵根"判定的戏剧性，让青云在众目睽睽之下被羞辱，为后续的逆袭营造更强的情绪张力。
                    </div>
                </div>

                <div style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">📊 本章统计</div>
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: var(--text-secondary);">
                        <div style="display: flex; justify-content: space-between;">
                            <span>预计字数</span>
                            <span style="color: var(--text-primary); font-weight: 500;">3200字</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>核心情节点</span>
                            <span style="color: var(--text-primary); font-weight: 500;">12个</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>场景数</span>
                            <span style="color: var(--text-primary); font-weight: 500;">3个</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>涉及角色</span>
                            <span style="color: var(--text-primary); font-weight: 500;">5人</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 角色设定
    characters: () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">角色设定</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">共 12 个角色 · 主角团 3 人</div>
                </div>
                <button class="btn btn-primary btn-sm">➕ 新增角色</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-dark)); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">林</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">林青云</div>
                            <div style="font-size: 12px; color: var(--accent-light); margin-top: 2px;">主角</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        出身平凡山村，性格坚韧隐忍，拥有天灵根却被误判为废灵根。获得《九天玄功》后踏上修仙之路。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">坚韧</span>
                        <span class="tag">聪慧</span>
                        <span class="tag">重情义</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #b91c1c); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">苏</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">苏婉清</div>
                            <div style="font-size: 12px; color: var(--accent-light); margin-top: 2px;">女主</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        宗门圣女，天资聪颖，外表清冷内心温柔。与林青云在秘境中相识，共同经历生死后暗生情愫。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">清冷</span>
                        <span class="tag">善良</span>
                        <span class="tag">天赋异禀</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #15803d); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">莫</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">莫天机</div>
                            <div style="font-size: 12px; color: var(--danger); margin-top: 2px;">反派</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        魔道少主，城府极深，与林青云亦敌亦友。身世成谜，最终章揭示其与林青云的宿命渊源。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">城府深</span>
                        <span class="tag">亦正亦邪</span>
                        <span class="tag">悲剧宿命</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">李</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">李长老</div>
                            <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 2px;">配角</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        宗门传功长老，表面严厉实则关心弟子。暗中调查宗门内鬼，是林青云成长路上的重要引路人。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">严厉</span>
                        <span class="tag">正义</span>
                        <span class="tag">导师</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer; border-style: dashed; border-color: var(--text-muted); display: flex; align-items: center; justify-content: center; min-height: 180px;"
                     onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--text-muted)'">
                    <div style="text-align: center; color: var(--text-muted);">
                        <div style="font-size: 28px; margin-bottom: 8px;">+</div>
                        <div style="font-size: 13px;">新增角色</div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 世界观地图
    worldmap: () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">世界观地图</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">九州大陆 · 三大域 · 十二州</div>
                </div>
                <button class="btn btn-primary btn-sm">✏️ 编辑地图</button>
            </div>

            <div class="card" style="margin-bottom: 16px; min-height: 300px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(99,102,241,0.05), rgba(14,165,233,0.05));"></div>
                <div style="position: relative; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🗺️</div>
                    <div style="font-size: 15px; color: var(--text-primary); font-weight: 600; margin-bottom: 8px;">九州大陆全景图</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">点击区域查看详细设定</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">🏔️ 东域 · 苍云山</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px;">
                        林青云的故乡，灵气稀薄但暗藏上古遗迹。山脉绵延三千里，凡人城镇散布其间。
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">出场章节：第1-20章</div>
                </div>
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">🏯 中域 · 天玄宗</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px;">
                        正道第一大宗门，坐落灵脉之上。宗门分内外两门，弟子数万，掌控中域修仙界命脉。
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">出场章节：第21-200章</div>
                </div>
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">🌑 西域 · 魔渊</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px;">
                        魔道大本营，终年黑雾笼罩。万魔窟、血炼池等禁地遍布，普通修士踏入九死一生。
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">出场章节：第80章起</div>
                </div>
            </div>
        </div>
    `,

    // 势力分布
    factions: () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">势力分布</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">正道 · 魔道 · 中立 · 共 8 个势力</div>
                </div>
                <button class="btn btn-primary btn-sm">➕ 新增势力</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div class="card" style="border-left: 3px solid var(--accent);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">天玄宗</div>
                            <div style="font-size: 12px; color: var(--accent-light); margin-top: 2px;">正道 · 超级宗门</div>
                        </div>
                        <span class="tag active">核心阵营</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        正道第一大宗门，宗主玄天真人乃大乘期强者。掌控中域十二州，门下弟子数万，与林青云渊源颇深。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 32,000</span>
                        <span>⭐ 顶级强者 8 人</span>
                        <span>📍 中域</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--danger);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">万魔殿</div>
                            <div style="font-size: 12px; color: var(--danger); margin-top: 2px;">魔道 · 超级势力</div>
                        </div>
                        <span class="tag" style="background: rgba(239,68,68,0.1); color: var(--danger);">敌对</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        魔道至尊势力，殿主血魔老祖半步大乘。信奉弱肉强食，门下弟子虽少但个个心狠手辣。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 5,000</span>
                        <span>⭐ 顶级强者 5 人</span>
                        <span>📍 西域</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--info);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">药王谷</div>
                            <div style="font-size: 12px; color: var(--info); margin-top: 2px;">中立 · 丹道圣地</div>
                        </div>
                        <span class="tag" style="background: rgba(14,165,233,0.1); color: var(--info);">盟友</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        天下丹道正宗，谷主药王仙子以炼制九品丹药闻名。中立不介入正魔之争，但暗中支持正道。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 8,000</span>
                        <span>⭐ 顶级强者 3 人</span>
                        <span>📍 南域</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--warning);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">剑冢</div>
                            <div style="font-size: 12px; color: var(--warning); margin-top: 2px;">中立 · 剑修圣地</div>
                        </div>
                        <span class="tag">中立</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        天下剑修心中的圣地，只收剑道天才。不问正魔，只认剑心。宗主剑痴已三百年未出世。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 1,200</span>
                        <span>⭐ 顶级强者 4 人</span>
                        <span>📍 北域</span>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 物品法宝
    items: () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">物品法宝</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">武器 · 法宝 · 丹药 · 材料 · 共 36 件</div>
                </div>
                <button class="btn btn-primary btn-sm">➕ 新增物品</button>
            </div>

            <div class="tabs" style="margin-bottom: 20px;">
                <button class="tab active">全部</button>
                <button class="tab">武器</button>
                <button class="tab">法宝</button>
                <button class="tab">丹药</button>
                <button class="tab">材料</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🗡️</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">青霜剑</div>
                    <div style="font-size: 11px; color: var(--accent-light); margin-bottom: 8px;">上品灵器 · 武器</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        林青云本命法宝，剑身如秋水，寒气逼人。可释放青霜剑气，冻结方圆百丈。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">📿</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">九天玄玉</div>
                    <div style="font-size: 11px; color: var(--warning); margin-bottom: 8px;">传承至宝 · 法宝</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        《九天玄功》传承载体，内含上古大能残魂，可指导修炼、推演功法。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">💊</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">九转金丹</div>
                    <div style="font-size: 11px; color: var(--success); margin-bottom: 8px;">九品丹药 · 丹药</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        可助元婴期修士突破至化神期，成功率提升三成。药王谷镇谷之宝。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🛡️</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">玄武盾</div>
                    <div style="font-size: 11px; color: var(--info); margin-bottom: 8px;">中品灵器 · 法宝</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        防御型法宝，可抵挡化神期全力一击。表面刻有四象玄武阵纹。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🌿</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">千年灵芝</div>
                    <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px;">灵材 · 材料</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        生长在灵气浓郁之地的天材地宝，可炼制多种疗伤丹药。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">⚔️</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">斩魔刀</div>
                    <div style="font-size: 11px; color: var(--danger); margin-bottom: 8px;">极品灵器 · 武器</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        专为克制魔道而生，刀身刻有灭魔符文，对魔修伤害加成50%。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer; border-style: dashed; border-color: var(--text-muted); display: flex; align-items: center; justify-content: center; min-height: 180px;"
                     onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--text-muted)'">
                    <div style="text-align: center; color: var(--text-muted);">
                        <div style="font-size: 28px; margin-bottom: 8px;">+</div>
                        <div style="font-size: 13px;">新增物品</div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 背景设定
    background: () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">背景设定</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">修炼体系 · 境界划分 · 世界观</div>
                </div>
                <button class="btn btn-primary btn-sm">✏️ 编辑设定</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">📜 修炼体系</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第一层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">炼气期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">引气入体</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第二层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">筑基期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">筑就道基</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第三层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">金丹期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">凝结金丹</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--accent-glow); border-radius: var(--radius-sm); border: 1px solid rgba(99,102,241,0.2);">
                            <span style="font-size: 12px; color: var(--accent); width: 60px;">第四层</span>
                            <span style="font-size: 13px; color: var(--accent-light); font-weight: 600;">元婴期</span>
                            <span style="font-size: 11px; color: var(--accent-light); margin-left: auto;">🎯 当前境界</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第五层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">化神期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">元神出窍</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第六层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">大乘期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">登临绝巅</span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">🌍 世界规则</div>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">灵气复苏</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                每三千年一次灵气潮汐，潮汐期间修炼速度翻倍，也是正魔大战的导火索。
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">天道法则</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                修士不可滥杀凡人，违者降下天劫。大乘期需渡九重天劫方可飞升仙界。
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">灵根品阶</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                分为废品、下品、中品、上品、极品、天品六级。天灵根百年一遇，修炼速度是凡品十倍。
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">法宝品阶</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                法器、灵器、法宝、灵宝、仙器五阶，每阶分下中上极四品。本命法宝可随主人成长进阶。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 章节编辑器（默认视图）
    editor: () => `
        <div style="display:flex; flex-direction:column; gap: 16px;">
            <div style="display:flex; gap: 12px;">
                <!-- 编辑器主区域 -->
                <div class="card" style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                        <span style="font-size:14px; font-weight:600; color:var(--text-primary);">当前章节：第127章 突破元婴</span>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">💾 保存</button>
                            <button class="btn btn-primary btn-sm">🤖 AI续写</button>
                        </div>
                    </div>
                    <div class="editor-toolbar">
                        <div class="editor-tool" style="font-weight:bold;">B</div>
                        <div class="editor-tool" style="font-style:italic;">I</div>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <div class="editor-tool">H1</div>
                        <div class="editor-tool">H2</div>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <div class="editor-tool">❝</div>
                        <div class="editor-tool">📋</div>
                    </div>
                    <div class="editor-area">
                        <p>林青云盘坐在洞府深处的聚灵阵中，周身灵气如潮水般涌动。</p>
                        <p>三年的闭关苦修，他终于触摸到了元婴期的门槛。丹田中的金丹已经膨胀到了极限，表面布满了细密的裂纹，仿佛下一刻就要碎裂开来。</p>
                        <p>"就是现在！"</p>
                        <p>林青云深吸一口气，运转《九天玄功》最后一层心法，将全身灵力尽数灌入金丹之中。</p>
                        <p class="editor-placeholder">—— 在此处继续你的创作，或使用 AI 续写功能获取灵感 ——</p>
                    </div>
                </div>

                <!-- AI 对话面板 -->
                <div class="card" style="width: 320px; display:flex; flex-direction:column; max-height: 520px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                        <span style="font-size:14px; font-weight:600; color:var(--text-primary);">🤖 AI 助手</span>
                        <span style="font-size:11px; color:var(--success);"
                              onmouseover="this.style.color='var(--success)'"
                              onmouseout="this.style.color='var(--success)'">● 在线</span>
                    </div>
                    <div id="aiChatBox" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px; margin-bottom:12px;">
                        <div style="align-self:flex-start; max-width:90%; background:var(--bg-tertiary); padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border);">
                            <div style="font-size:12px; color:var(--accent); font-weight:600; margin-bottom:4px;">AI</div>
                            <div style="font-size:13px; color:var(--text-primary); line-height:1.5;">你好！我正在阅读你的《仙途漫漫》。这一章突破元婴的设定很棒，需要我帮你续写接下来的心魔试炼场景吗？</div>
                        </div>
                        <div style="align-self:flex-end; max-width:90%; background:var(--accent); padding:10px 12px; border-radius:var(--radius);">
                            <div style="font-size:12px; color:rgba(255,255,255,0.7); font-weight:600; margin-bottom:4px;">你</div>
                            <div style="font-size:13px; color:white; line-height:1.5;">帮我续写一下，大概500字，要写出心魔的恐怖和林青云的坚定</div>
                        </div>
                        <div style="align-self:flex-start; max-width:90%; background:var(--bg-tertiary); padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border);">
                            <div style="font-size:12px; color:var(--accent); font-weight:600; margin-bottom:4px;">AI</div>
                            <div style="font-size:13px; color:var(--text-primary); line-height:1.5;">好的，已为你续写：

金丹碎裂的瞬间，林青云的意识被拉入一片虚无。

黑暗中，无数张熟悉的面孔浮现——死去的师父、背叛的师兄、还有那些被他亲手斩杀的妖魔。他们的声音交织成一曲摄人心魄的挽歌："你也不过如此......"

心魔化身为林青云最恐惧的模样——一个满头白发、修为尽废的自己。

"放弃吧。"心魔轻声道，"这千年仙途，有多少人倒在元婴门前？你凭什么认为自己能例外？"

林青云闭上双眼。

"因为......"他猛然睁眼，眸中金光爆射，"我从未想过例外。我只知道，若在此处倒下，便对不起三年前那个在灵根测试中被判为废物的少年！"

他并指如剑，直刺心魔眉心。这一剑，没有灵力，只有意志。</div>
                            <div style="display:flex; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid var(--border);">
                                <button class="ai-feedback-btn" data-type="insert" style="font-size:11px; padding:4px 10px; background:var(--accent); color:white; border:none; border-radius:4px; cursor:pointer;">✓ 插入正文</button>
                                <button class="ai-feedback-btn" data-type="regenerate" style="font-size:11px; padding:4px 10px; background:var(--bg-hover); color:var(--text-secondary); border:1px solid var(--border); border-radius:4px; cursor:pointer;">🔄 重新生成</button>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; padding-top:10px; border-top:1px solid var(--border);">
                        <input type="text" id="aiChatInput" placeholder="输入你的需求..." style="flex:1; background:var(--bg-tertiary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px; color:var(--text-primary); font-size:13px; outline:none;">
                        <button class="btn btn-primary btn-sm" id="aiChatSend" style="padding:8px 14px;" onclick="showToast('请进入写作页面使用AI对话', 'info')">发送</button>
                    </div>
                </div>
            </div>

            <!-- 统计卡片 + 反馈区 -->
            <div style="display:flex; gap: 12px; align-items:stretch;">
                <div class="card" style="flex:1;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">本章字数</div>
                    <div style="font-size:24px; font-weight:700; color:var(--text-primary);">5,247</div>
                    <div class="progress-bar" style="margin-top:10px;">
                        <div class="progress-fill" style="width: 52%; background: var(--accent);"></div>
                    </div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">目标: 10,000字</div>
                </div>
                <div class="card" style="flex:1;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">AI 辅助次数</div>
                    <div style="font-size:24px; font-weight:700; color:var(--text-primary);">23</div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">本章共使用 23 次 AI 辅助</div>
                </div>
                <div class="card" style="flex:1;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">创作时长</div>
                    <div style="font-size:24px; font-weight:700; color:var(--text-primary);">3h 42m</div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">今日已创作 3小时42分</div>
                </div>
                <div class="card" style="width: 200px;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">本章质量反馈</div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btnLike" class="btn btn-ghost" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);" onclick="trackFeedback('like')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                            <span style="font-size:13px; color:var(--text-secondary);">12</span>
                        </button>
                        <button id="btnDislike" class="btn btn-ghost" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);" onclick="trackFeedback('dislike')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                            <span style="font-size:13px; color:var(--text-secondary);">2</span>
                        </button>
                    </div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:8px;">点赞/点踩数据用于优化AI推荐</div>
                </div>
            </div>
        </div>
    `,

};

const pages = {
    // ========== 概览 ==========
    dashboard: () => `
        <div class="page-section">
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">📚</div>
                    <div class="stat-value" id="statWorkCount">--</div>
                    <div class="stat-label">创作中作品</div>
                    <div class="stat-change positive" id="statWorkChange">开始创作第一部作品</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">✍️</div>
                    <div class="stat-value" id="statTotalWords">--</div>
                    <div class="stat-label">累计写作字数</div>
                    <div class="stat-change positive">坚持就是胜利</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">🤖</div>
                    <div class="stat-value" id="statAiCount">--</div>
                    <div class="stat-label">AI 辅助次数</div>
                    <div class="stat-change positive">善用 AI 提高效率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">📑</div>
                    <div class="stat-value" id="statTotalChapters">--</div>
                    <div class="stat-label">总章节数</div>
                    <div class="stat-change positive">继续创作</div>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">创作趋势</div>
                            <div class="card-subtitle">近7日字数变化</div>
                        </div>
                        <div class="tabs" style="margin:0">
                            <button class="tab active">周</button>
                            <button class="tab">月</button>
                        </div>
                    </div>
                    <div class="chart-area">
                        <div class="chart-bar" style="height: 40%"></div>
                        <div class="chart-bar" style="height: 65%"></div>
                        <div class="chart-bar" style="height: 55%"></div>
                        <div class="chart-bar" style="height: 80%"></div>
                        <div class="chart-bar" style="height: 70%"></div>
                        <div class="chart-bar" style="height: 90%"></div>
                        <div class="chart-bar" style="height: 75%"></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">最近编辑</div>
                            <div class="card-subtitle">继续你的创作</div>
                        </div>
                    </div>
                    <div id="recentWorksList">
                        <div class="list-item">
                            <div class="list-content">
                                <div class="list-meta" style="color:var(--text-muted);">加载中...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">AI 使用统计</div>
                            <div class="card-subtitle">各功能调用次数</div>
                        </div>
                    </div>
                    <div style="padding: 8px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">AI 续写</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:75%; background:var(--accent);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">458</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">情节推演</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:60%; background:var(--info);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">312</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">角色生成</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:45%; background:var(--success);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">256</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0;">
                            <span style="font-size:13px; color:var(--text-secondary);">润色优化</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:30%; background:var(--warning);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">189</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">创作动态</div>
                            <div class="card-subtitle">最近操作记录</div>
                        </div>
                    </div>
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-time">今天 14:32</div>
                            <div class="timeline-text">使用 AI 续写完成《仙途漫漫》第127章</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">今天 11:15</div>
                            <div class="timeline-text">新建角色「林青云」到作品《仙途漫漫》</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">昨天 20:40</div>
                            <div class="timeline-text">导入 Word 文档《都市夜行者大纲》</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">昨天 16:22</div>
                            <div class="timeline-text">使用工作流「玄幻开篇」生成新书设定</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">4月27日</div>
                            <div class="timeline-text">发布《大宋提刑官》最终章，作品完结</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // ========== 我的作品 ==========
    works: () => `
        <div class="page-section">
            <div class="tabs" id="worksPageTabs">
                <button class="tab active" data-view="works" onclick="switchWorksView('works', this)">全部作品</button>
                <button class="tab" data-view="serial" onclick="switchWorksView('serial', this)">连载中</button>
                <button class="tab" data-view="finished" onclick="switchWorksView('finished', this)">已完结</button>
                <button class="tab" data-view="draft" onclick="switchWorksView('draft', this)">草稿箱</button>
                <button class="tab" data-view="analysis" onclick="switchWorksView('analysis', this)">拆书</button>
                <button class="tab" data-view="trash" onclick="switchWorksView('trash', this)" style="margin-left:auto; color:var(--text-muted);">回收站</button>
            </div>

            <div id="worksNormalToolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div class="search-box" style="width: 320px; margin:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text" id="worksSearchInput" placeholder="搜索作品名称..." oninput="debounceSearchWorks(this.value)">
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" onclick="openImportWorkDialog()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        导入
                    </button>
                    <button class="btn btn-ghost btn-sm" style="color: var(--warning);" onclick="openBookAnalysisDialog()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="10" y1="8" x2="16" y2="8"/><line x1="10" y1="12" x2="16" y2="12"/>
                        </svg>
                        拆书
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showCreateWorkModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        新建作品
                    </button>
                </div>
            </div>

            <div id="worksTrashToolbar" style="display:none; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div style="font-size:14px; font-weight:600; color:var(--text-primary);">回收站</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" onclick="batchRestoreWorks()">↩ 恢复选中</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="batchDeleteWorks()">🗑 彻底删除选中</button>
                    <button class="btn btn-primary btn-sm" style="background:var(--danger);" onclick="clearAllTrash()">清空回收站</button>
                </div>
            </div>

            <div class="grid-3" id="worksGrid">
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>
        </div>
    `,

    // ========== 长篇写作（三栏布局，参考蛙蛙写作） ==========
    writing: () => `
        <div class="writing-workspace" style="display:flex; flex-direction:column; height:calc(100vh - 80px); margin:-24px -24px 0;">
            <!-- 顶部信息栏 -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 16px; background:var(--bg-secondary); border-bottom:1px solid var(--border); flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span id="writingWorkTitle" style="font-size:15px; font-weight:600; color:var(--text-primary);">加载中...</span>
                    <span id="writingWorkMeta" style="font-size:12px; color:var(--text-muted);">...</span>
                    <span id="writingWordCount" style="font-size:12px; color:var(--text-tertiary);">...</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn btn-ghost btn-sm" id="btnSaveChapter" onclick="saveCurrentChapter()">💾 保存</button>
                    <button class="btn btn-ghost btn-sm" onclick="exportChapter(currentWorkId, currentChapterId)">📤 导出本章</button>
                    <button class="btn btn-ghost btn-sm" onclick="exportWork(currentWorkId)">📦 导出作品</button>
                </div>
            </div>

            <!-- 三栏主体 -->
            <div style="display:flex; flex:1; overflow:hidden;">
                <!-- 左栏 -->
                <div id="writeColLeft" style="width:220px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border-right:1px solid var(--border);">
                    <!-- 左栏tab -->
                    <div style="display:flex; border-bottom:1px solid var(--border);">
                        <button class="left-tab" data-tab="info" onclick="switchLeftTab('info')" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-muted); background:transparent; border:none; cursor:pointer; border-bottom:2px solid transparent;">作品信息</button>
                        <button class="left-tab active" data-tab="body" onclick="switchLeftTab('body')" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-primary); background:transparent; border:none; cursor:pointer; border-bottom:2px solid var(--accent); font-weight:600;">正文</button>
                        <button class="left-tab" data-tab="analysis" onclick="switchLeftTab('analysis')" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-muted); background:transparent; border:none; cursor:pointer; border-bottom:2px solid transparent;">AI分析</button>
                    </div>

                    <!-- 左栏内容区 -->
                    <div id="leftPanel" style="flex:1; overflow-y:auto; padding:12px;">
                        <!-- 正文tab内容 -->
                        <div id="left-body" style="display:block;">
                            <!-- 灵感区域（作品灵感） -->
                            <div style="margin-bottom:12px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>💡 灵感</span>
                                </div>
                                <!-- 作品灵感（可拖动展开） -->
                                <div id="workInspirationPanel" style="border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;">
                                    <div style="padding:6px 10px; background:var(--bg-tertiary); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleWorkInspiration()">
                                        <span style="font-size:11px; color:var(--text-muted);">📌 作品灵感</span>
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <button style="font-size:11px; padding:2px 6px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px;" onclick="event.stopPropagation(); quoteWorkInspirationToChat()" title="引用到对话">💬 引用</button>
                                            <span id="workInspirationToggle" style="font-size:11px; color:var(--text-muted);">▶</span>
                                        </div>
                                    </div>
                                    <div id="workInspirationContent" style="padding:8px 10px; font-size:12px; color:var(--text-secondary); line-height:1.6; max-height:60px; overflow:hidden; text-overflow:ellipsis; display:none; word-break:break-all;"></div>
                                </div>
                            </div>

                            <div style="border-top:1px solid var(--border); padding-top:12px; margin-bottom:16px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📑 章节</span>
                                    <div style="display:flex; gap:4px; align-items:center;">
                                        <button class="btn btn-ghost btn-sm" id="btnChapterSort" style="padding:2px 6px; font-size:11px;" onclick="toggleChapterSort()" title="切换排序">↓</button>
                                        <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="showCreateChapterModal()">+</button>
                                    </div>
                                </div>
                                <div id="chapterList">
                                    <div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">加载中...</div>
                                </div>
                            </div>
                        </div>

                        <!-- 作品信息tab内容 -->
                        <div id="left-info" style="display:none;">
                            <!-- 作品详情 -->
                            <div id="workDetailSection" style="margin-bottom:12px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📋 作品详情</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="enterWorkDetail('edit', currentWorkId)">编辑</button>
                                </div>
                                <div id="workDetailInfo" style="font-size:12px; color:var(--text-secondary); line-height:1.6;">
                                    <div style="padding:6px 8px; color:var(--text-muted);">加载中...</div>
                                </div>
                            </div>

                            <!-- 总纲 -->
                            <div style="margin-top:16px; border-top:1px solid var(--border); padding-top:12px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📖 总纲</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="showOutlineForm()">+</button>
                                </div>
                                <div id="workOutlinesContainer">
                                    <div style="padding:6px 8px; border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); cursor:pointer;" onclick="showOutlineForm()">暂无总纲，点击新增</div>
                                </div>
                            </div>
                        </div>

                        <!-- AI分析tab内容 -->
                        <div id="left-analysis" style="display:none;">
                            <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                <span>🤖 AI 智能分析</span>
                                <div style="display:flex; gap:4px;">
                                    <button class="btn btn-ghost btn-sm" id="btnReAnalysis" style="padding:3px 8px; font-size:11px; display:none;" onclick="generateAIAnalysis()">🔄 重新拆书</button>
                                    <button class="btn btn-primary btn-sm" id="btnAIAnalysis" style="padding:3px 8px; font-size:11px;" onclick="generateAIAnalysis()">AI拆书</button>
                                </div>
                            </div>
                            <!-- 维度标签导航 -->
                            <div id="analysisTabs" style="display:none; margin-bottom:10px; border-bottom:1px solid var(--border);">
                                <div style="display:flex; gap:2px; overflow-x:auto; padding-bottom:1px;">
                                    <button class="analysis-tab active" data-tab="all" onclick="switchAnalysisTab('all')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--accent); border-bottom:2px solid var(--accent); cursor:pointer; white-space:nowrap; font-weight:600;">全文</button>
                                    <button class="analysis-tab" data-tab="coreConflict" onclick="switchAnalysisTab('coreConflict')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">核心矛盾</button>
                                    <button class="analysis-tab" data-tab="coreEmotion" onclick="switchAnalysisTab('coreEmotion')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">核心情绪</button>
                                    <button class="analysis-tab" data-tab="characterSetting" onclick="switchAnalysisTab('characterSetting')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">人物设定</button>
                                    <button class="analysis-tab" data-tab="plotTrend" onclick="switchAnalysisTab('plotTrend')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">剧情走向</button>
                                    <button class="analysis-tab" data-tab="characterMotivation" onclick="switchAnalysisTab('characterMotivation')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">人物动机</button>
                                    <button class="analysis-tab" data-tab="plotTwist" onclick="switchAnalysisTab('plotTwist')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">反转剧情</button>
                                    <button class="analysis-tab" data-tab="cliffhanger" onclick="switchAnalysisTab('cliffhanger')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">卡点剧情</button>
                                </div>
                            </div>
                            <!-- 操作按钮 -->
                            <div id="analysisActions" style="margin-bottom:10px; display:flex; gap:6px; justify-content:flex-end;">
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="quoteAIAnalysisToChat()">💬 引用到对话</button>
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="copyAIAnalysis()">📋 复制</button>
                                <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="saveAIAnalysisToInspiration()">⭐ 收藏</button>
                            </div>
                            <div id="aiAnalysisContent" style="font-size:12px; color:var(--text-secondary); line-height:1.7;">
                                <div style="padding:12px 8px; text-align:center; color:var(--text-muted);">
                                    <div style="margin-bottom:8px;">📖</div>
                                    <div>暂无分析数据</div>
                                    <div style="font-size:11px; margin-top:4px;">点击「AI拆书」生成作品分析</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 左-中 拖拽手柄 -->
                <div class="resize-handle" data-resize="left" style="width:4px; cursor:col-resize; background:transparent; flex-shrink:0; z-index:10; position:relative;">
                    <div style="position:absolute; top:0; bottom:0; left:1px; width:2px; background:var(--border); opacity:0; transition:opacity 0.2s;"></div>
                </div>

                <!-- 中栏：编辑器 -->
                <div style="flex:1; display:flex; flex-direction:column; min-width:0; background:var(--bg-primary);">
                    <!-- AI工具栏 -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 16px; border-bottom:1px solid var(--border); flex-shrink:0;">
                        <div style="display:flex; gap:8px;">
                            <button class="ai-tool-btn active" data-action="continue" style="padding:6px 14px; border-radius:20px; border:none; background:var(--accent); color:white; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                续写正文
                            </button>
                            <button class="ai-tool-btn" data-action="continue-plot" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M2 12l5-5"/><path d="M2 12l5 5"/></svg>
                                续写情节
                            </button>
                            <button class="ai-tool-btn" data-action="replace" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                替换
                            </button>
                            <button class="ai-tool-btn" data-action="detect" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                AI纠错
                            </button>
                            <button class="ai-tool-btn" data-action="de-ai" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                去AI味
                            </button>
                        </div>
                        <div style="display:flex; gap:16px; align-items:center;">
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); cursor:pointer;">
                                <span>跨章滚动</span>
                                <input type="checkbox" id="crossChapterScroll" style="accent-color:var(--accent);" onchange="toggleCrossChapterScroll(this.checked)">
                            </label>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); cursor:pointer;">
                                <span>智能补全</span>
                                <input type="checkbox" id="smartComplete" style="accent-color:var(--accent);">
                            </label>
                        </div>
                    </div>

                    <!-- 编辑器工具栏 -->
                    <div style="display:flex; align-items:center; gap:4px; padding:6px 16px; border-bottom:1px solid var(--border); flex-shrink:0;">
                        <button class="editor-tool-btn" title="撤销 (Ctrl+Z)" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">↩</button>
                        <button class="editor-tool-btn" title="重做 (Ctrl+Y)" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">↪</button>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <button class="editor-tool-btn" title="标题" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center;">H1</button>
                        <button class="editor-tool-btn" title="粗体" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; font-weight:bold; display:flex; align-items:center; justify-content:center;">B</button>
                        <button class="editor-tool-btn" title="斜体" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; font-style:italic; display:flex; align-items:center; justify-content:center;">I</button>
                        <button class="editor-tool-btn" title="下划线" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; text-decoration:underline; display:flex; align-items:center; justify-content:center;">U</button>
                        <button class="editor-tool-btn" title="删除线" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; text-decoration:line-through; display:flex; align-items:center; justify-content:center;">S</button>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <button class="editor-tool-btn" title="引用" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">❝</button>
                        <button class="editor-tool-btn" title="列表" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">☰</button>
                        <button class="editor-tool-btn" title="待办" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">☐</button>
                        <button class="editor-tool-btn" title="分隔线" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">―</button>
                        <button class="editor-tool-btn" title="时钟" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">⏱</button>
                        <button class="editor-tool-btn" id="btnOpenFindReplace" title="查找替换 (Ctrl+F)" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;" onclick="openFindReplaceDialog()">🔍</button>
                        <button class="editor-tool-btn" id="btnClearFormat" title="清除格式" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">✂️</button>
                        <div style="flex:1;"></div>
                        <button class="editor-tool-btn" id="btnChapterVersions" title="历史版本" onclick="if(!currentChapterId){showToast('请先选择一个章节','warning');return;}showChapterVersions(currentChapterId);" style="padding:4px 10px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px;">
                            <span>🕐</span><span>历史</span>
                        </button>
                        <select id="editorFontSelect" style="background:var(--bg-tertiary); border:1px solid var(--border); border-radius:4px; padding:4px 8px; color:var(--text-secondary); font-size:12px; outline:none;">
                            <option value="default">字体：默认</option>
                            <option value="Noto Serif SC, Georgia, serif">宋体</option>
                            <option value="Noto Sans SC, system-ui, sans-serif">黑体</option>
                            <option value="SimSun, STSong, serif">仿宋</option>
                            <option value="KaiTi, STKaiti, serif">楷体</option>
                        </select>
                        <select id="editorSizeSelect" style="background:var(--bg-tertiary); border:1px solid var(--border); border-radius:4px; padding:4px 8px; color:var(--text-secondary); font-size:12px; outline:none;">
                            <option value="14px">字号：小</option>
                            <option value="15px" selected>字号：标准</option>
                            <option value="17px">字号：大</option>
                            <option value="19px">字号：超大</option>
                        </select>
                    </div>

                    <!-- 编辑器内容区 -->
                    <div id="editorScrollContainer" style="flex:1; overflow-y:auto; padding:24px 48px;">
                        <div id="editorArea" contenteditable="true" style="outline:none; max-width:700px; margin:0 auto; min-height:400px; font-family:var(--font-serif); line-height:1.8; color:var(--editor-text, var(--text-primary));">
                            <h1 id="editorTitle" style="font-size:28px; font-weight:700; margin-bottom:16px;">选择一个章节开始写作</h1>
                            <p id="editorPlaceholder" style="color:var(--text-muted);">在左侧章节列表中选择一个章节，或创建新章节</p>
                        </div>
                    </div>
                </div>

                <!-- 中-右 拖拽手柄 -->
                <div class="resize-handle" data-resize="right" style="width:4px; cursor:col-resize; background:transparent; flex-shrink:0; z-index:10; position:relative;">
                    <div style="position:absolute; top:0; bottom:0; left:1px; width:2px; background:var(--border); opacity:0; transition:opacity 0.2s;"></div>
                </div>

                <!-- 右栏：AI对话 -->
                <div id="writeColRight" style="width:320px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border-left:1px solid var(--border); position:relative; z-index:100;">
                    <!-- 右栏tab -->
                    <div style="display:flex; border-bottom:1px solid var(--border);">
                        <button class="right-tab" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-muted); background:transparent; border:none; cursor:pointer; border-bottom:2px solid transparent;">灵感卡片</button>
                        <button class="right-tab active" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-primary); background:transparent; border:none; cursor:pointer; border-bottom:2px solid var(--accent); font-weight:600;">AI对话</button>
                    </div>

                    <!-- AI对话内容 -->
                    <div id="aiChatDialogBody" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                        <!-- AI头像和介绍 -->
                        <div style="padding:16px; border-bottom:1px solid var(--border);">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                                <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--accent-dark)); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
                                    <svg width="20" height="20" viewBox="0 0 40 40" style="display:block;">
                                        <text x="20" y="28" font-size="22" font-family="'Noto Serif SC', serif" fill="white" text-anchor="middle" font-weight="700">九</text>
                                    </svg>
                                </div>
                                <div style="font-size:14px; font-weight:600; color:var(--text-primary);">九章</div>
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">
                                嗨！我是智能写作助手九章。今天想写什么故事？
                            </div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">内容由AI生成，仅供参考</div>
                        </div>

                        <!-- 消息列表 -->
                        <div id="aiChatMessages" class="chat-dialog-resizable" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:12px; min-height:80px;">
                            <!-- 历史消息由 JS 动态加载 -->
                        </div>

                        <!-- 输入区 -->
                        <div style="padding:12px; border-top:1px solid var(--border); flex-shrink:0;">
                            <!-- 顶行：上传文件 + @引用 -->
                            <div style="display:flex; gap:8px; margin-bottom:8px;">
                                <button style="padding:4px 10px; border:1px solid var(--border); background:var(--bg-tertiary); border-radius:4px; color:var(--text-secondary); font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                    上传文件
                                </button>
                                <button id="chatRefBtn" style="padding:4px 10px; border:1px solid var(--border); background:var(--bg-tertiary); border-radius:4px; color:var(--text-secondary); font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    @引用
                                </button>
                            </div>
                            <!-- 输入框顶部拖拽条 -->
                            <div id="chatInputResizeHandle" style="height:6px; cursor:ns-resize; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; position:relative; margin:0 -12px;" title="上下拖动调整输入框高度">
                                <div class="resize-indicator" style="width:40px; height:3px; background:var(--border); border-radius:2px; transition:background 0.2s;"></div>
                            </div>
                            <!-- 输入框 -->
                            <textarea id="aiChatInput" placeholder="输入「/」唤起工具..." style="width:100%; min-height:60px; background:var(--bg-tertiary); border:1px solid var(--border); border-radius:var(--radius); padding:10px; color:var(--text-primary); font-size:13px; resize:none; outline:none; font-family:inherit;"></textarea>
                            <!-- 底行：模型 + 工具 + 发送 -->
                            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                <!-- 模型切换 -->
                                <div id="chatModelPicker" style="position:relative; flex:1;">
                                    <button id="chatModelTrigger" style="padding:4px 10px; border-radius:16px; border:1px solid var(--border); background:var(--bg-tertiary); color:var(--text-secondary); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; transition:all 0.2s; width:100%;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                                        <span id="chatModelTriggerName">默认模型</span> <span id="chatModelArrow" style="font-size:10px; transition:transform 0.2s;">▼</span>
                                    </button>
                                    <div id="chatModelDropdown" style="position:absolute; left:0; bottom:calc(100% + 6px); min-width:180px; max-height:260px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:10px; display:none; flex-direction:column; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:9999; overflow:hidden;">
                                        <div id="chatModelDropdownList" style="padding:8px 0; overflow-y:auto; max-height:260px;"></div>
                                        <div style="padding:8px 12px; border-top:1px solid var(--border);">
                                            <button class="btn btn-ghost btn-sm" style="width:100%; font-size:11px;" onclick="switchPage('modelConfigs')">🤖 选择模型</button>
                                        </div>
                                    </div>
                                </div>
                                <!-- 隐藏的 select，仅用于数据同步 -->
                                <select id="chatToolSelect" style="display:none;">
                                    <option value="default">🛠️ 九章默认工具</option>
                                </select>
                                <!-- 工具选择器 -->
                                <div id="chatToolPicker" style="position:relative; flex:1;">
                                    <button id="chatToolTrigger" style="padding:4px 10px; border-radius:16px; border:1px solid var(--border); background:var(--bg-tertiary); color:var(--text-secondary); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; transition:all 0.2s; width:100%;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                                        <span id="chatToolTriggerName">默认工具</span> <span id="chatToolArrow" style="font-size:10px; transition:transform 0.2s;">▼</span>
                                    </button>
                                    <!-- 弹出面板：向上展开，左右双栏 -->
                                    <div id="chatToolDropdown" style="position:absolute; left:50%; transform:translateX(-50%); bottom:calc(100% + 6px); width:380px; max-height:320px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:10px; display:none; flex-direction:column; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:9999; overflow:hidden;">
                                        <div style="padding:10px 12px; overflow-y:auto;">
                                            <div style="display:flex; gap:12px;">
                                                <!-- 左栏：我的收藏 -->
                                                <div style="flex:1; min-width:0;">
                                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                                        <span style="font-weight:600;">⭐ 我的收藏</span>
                                                        <span style="flex:1; height:1px; background:var(--border);"></span>
                                                    </div>
                                                    <div id="chatToolDropdownCustom" style="display:grid; grid-template-columns:1fr; gap:5px;"></div>
                                                </div>
                                                <!-- 右栏：官方推荐 -->
                                                <div style="flex:1.8; min-width:0;">
                                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                                        <span style="font-weight:600;">🏢 官方推荐</span>
                                                        <span style="flex:1; height:1px; background:var(--border);"></span>
                                                    </div>
                                                    <div id="chatToolDropdownOfficial" style="display:grid; grid-template-columns:1fr; gap:5px;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-sm" id="aiChatSend" style="padding:6px 16px; width:64px; flex-shrink:0;">发送</button>
                            </div>
                        </div>
                    </div>
                    <!-- 底部边框线 -->
                    <div style="height:1px; background:var(--border); flex-shrink:0;"></div>
                </div>
            </div>
        </div>
    `,

    // ========== AI 工具库 ==========
    'ai-tools': () => `
        <div class="page-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">AI 工具库</div>
                    <div style="font-size:13px; color:var(--text-muted);">官方推荐 + 我的工具，按需调用</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="showCreateAgentModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    创建工具
                </button>
            </div>

            <!-- Tab 切换 -->
            <div style="display:flex; gap:2px; border-bottom:1px solid var(--border); margin-bottom:20px;">
                <button class="tool-tab active" data-tab="official" onclick="switchToolTab('official')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid var(--accent); color:var(--accent); font-weight:600;">⭐ 官方推荐</button>
                <button class="tool-tab" data-tab="custom" onclick="switchToolTab('custom')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent; color:var(--text-muted);">🤖 我的工具</button>
                <button class="tool-tab" data-tab="prompt-debug" onclick="switchToolTab('prompt-debug')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent; color:var(--text-muted);">🧪 提示词调试</button>
            </div>

            <!-- 官方推荐 -->
            <div id="toolTabOfficial">
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">✍️ 写作辅助</div>
                    <div class="grid-4" id="toolGridWriting"></div>
                </div>
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">📖 剧情设计</div>
                    <div class="grid-4" id="toolGridPlot"></div>
                </div>
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">🔍 分析优化</div>
                    <div class="grid-4" id="toolGridAnalysis"></div>
                </div>
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">📦 包装运营</div>
                    <div class="grid-4" id="toolGridPackage"></div>
                </div>
            </div>

            <!-- 我的工具 -->
            <div id="toolTabCustom" style="display:none;">
                <div id="customToolList" class="grid-4"></div>
                <div id="customToolEmpty" style="text-align:center; padding:60px; color:var(--text-muted); display:none;">
                    <div style="font-size:32px; margin-bottom:12px;">🤖</div>
                    <div style="font-size:15px; margin-bottom:8px;">还没有自定义工具</div>
                    <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">创建你的专属AI助手，定义独特的写作风格和能力</div>
                    <button class="btn btn-primary" onclick="showCreateAgentModal()">创建工具</button>
                </div>
            </div>

            <!-- 提示词调试 -->
            <div id="toolTabPromptDebug" style="display:none;">
                <div style="display:flex; gap:16px; height:calc(100vh - 220px); min-height:400px;">
                    <!-- 左侧：工具列表 -->
                    <div style="width:220px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
                        <div style="padding:10px 12px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <select id="promptDebugSourceSelect" onchange="switchPromptDebugSource(this.value)"
                                    style="flex:1; min-width:0; font-size:12px; padding:4px 8px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer; outline:none;">
                                <option value="custom">🤖 我的工具</option>
                                <option value="official">⭐ 官方推荐</option>
                            </select>
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px; flex-shrink:0;" onclick="resetAllToolPrompts()" title="恢复全部默认">↺ 全部重置</button>
                        </div>
                        <div id="promptDebugToolList" style="flex:1; overflow-y:auto; padding:6px;">
                            <div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">加载中...</div>
                        </div>
                    </div>
                    <!-- 右侧：编辑 + 测试 -->
                    <div style="flex:1; display:flex; flex-direction:column; gap:12px; min-width:0;">
                        <!-- Prompt 编辑区 -->
                        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; min-height:0;">
                            <div style="padding:10px 14px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span id="promptDebugToolName" style="font-size:14px; font-weight:600; color:var(--text-primary);">请选择一个工具</span>
                                    <span id="promptDebugModifiedBadge" style="display:none; padding:2px 8px; border-radius:10px; background:var(--warning); color:white; font-size:11px;">已修改</span>
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <button class="btn btn-ghost btn-sm" id="btnPromptReset" style="padding:4px 10px; font-size:12px; display:none;" onclick="resetCurrentToolPrompt()">↺ 恢复默认</button>
                                    <button class="btn btn-primary btn-sm" id="btnPromptSave" style="padding:4px 10px; font-size:12px; display:none;" onclick="saveCurrentToolPrompt()">💾 保存修改</button>
                                </div>
                            </div>
                            <textarea id="promptDebugEditor" style="flex:1; padding:12px 14px; border:none; background:transparent; color:var(--text-secondary); font-size:13px; line-height:1.7; resize:none; outline:none; font-family:var(--font-sans);" placeholder="在左侧选择一个工具，查看和编辑其 system prompt..."></textarea>
                        </div>
                        <!-- 测试区 -->
                        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; min-height:0;">
                            <div style="padding:10px 14px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:14px; font-weight:600; color:var(--text-primary);">效果测试</span>
                                <button class="btn btn-primary btn-sm" id="btnPromptTest" style="padding:4px 14px; font-size:12px; display:none;" onclick="testCurrentToolPrompt()">▶ 运行测试</button>
                            </div>
                            <div style="flex:1; overflow-y:auto; padding:12px 14px;">
                                <div style="margin-bottom:10px;">
                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">测试输入</div>
                                    <textarea id="promptDebugTestInput" style="width:100%; min-height:60px; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); font-size:12px; resize:vertical; outline:none; font-family:var(--font-sans);" placeholder="输入测试内容，例如一段需要润色的文字..."></textarea>
                                </div>
                                <div>
                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">测试结果</div>
                                    <div id="promptDebugTestResult" style="min-height:60px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-secondary); font-size:12px; line-height:1.7; white-space:pre-wrap;">
                                        <span style="color:var(--text-muted);">点击「运行测试」查看效果</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="aiToolResult" style="margin-top:24px; display:none;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title" id="aiToolResultTitle">生成结果</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-ghost btn-sm" id="aiToolCopy">📋 复制</button>
                            <button class="btn btn-primary btn-sm" id="aiToolRetry">🔄 重新生成</button>
                        </div>
                    </div>
                    <div id="aiToolResultContent" style="padding:16px; white-space:pre-wrap; line-height:1.8; color:var(--text-secondary); font-size:14px; max-height:400px; overflow-y:auto;"></div>
                    <div id="aiToolResultLoading" style="padding:40px; text-align:center; display:none;">
                        <div style="font-size:24px; margin-bottom:8px;">⚡</div>
                        <div style="color:var(--text-muted); font-size:13px;">AI 正在处理，请稍候...</div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // ========== 灵感库 ==========
    inspiration: () => `
        <div class="page-section" id="inspirationPage">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">灵感库</div>
                    <div style="font-size:13px; color:var(--text-muted);">收集、整理你的创作灵感，随时调取使用</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <div class="search-box" style="width:240px; margin:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" id="inspSearchInput" placeholder="搜索灵感名称或内容..." oninput="debounceLoadInspirations()">
                    </div>
                    <button class="btn btn-ghost btn-sm" id="inspSelectionToggle" onclick="toggleInspSelectionMode()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        多选模式
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showCreateInspirationModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        新建灵感
                    </button>
                </div>
            </div>

            <div class="tabs" style="margin-bottom: 12px;" id="inspLengthTabs">
                <button class="tab active" data-length="long" onclick="switchInspirationLengthTab('long', this)">长篇</button>
                <button class="tab" data-length="short" onclick="switchInspirationLengthTab('short', this)">短篇</button>
            </div>

            <div class="tabs" style="margin-bottom: 20px;" id="inspTabs">
                <button class="tab active" data-filter="all" onclick="switchInspirationTab('all', this)">全部</button>
                <button class="tab" data-filter="ai" onclick="switchInspirationTab('ai', this)">AI 生成</button>
                <button class="tab" data-filter="trend" onclick="switchInspirationTab('trend', this)">热门榜单</button>
                <button class="tab" data-filter="custom" onclick="switchInspirationTab('custom', this)">自创</button>
                <button class="tab" data-filter="trash" onclick="switchInspirationTab('trash', this)" style="margin-left:auto; color:var(--text-muted);">回收站</button>
            </div>

            <div class="grid-3" id="inspirationList">
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>

            <div id="inspirationPagination" style="display:flex; justify-content:center; gap:6px; margin-top:20px;"></div>

            <div id="inspSelectionBar" style="display:none; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:100; background:var(--bg-primary); border:1px solid var(--border); border-radius:12px; padding:12px 20px; box-shadow:0 4px 20px rgba(0,0,0,0.3); align-items:center; gap:16px; max-width:90%; flex-wrap:wrap;">
                <span id="inspSelectionCount" style="font-size:14px; color:var(--text-primary); white-space:nowrap;">已选择 0 个灵感</span>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" onclick="clearInspSelection()">取消选择</button>
                    <button class="btn btn-primary btn-sm" id="inspFuseBtn" onclick="fuseInspirationsWithAI()" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        AI 热梗融合
                    </button>
                </div>
            </div>
        </div>
    `,

    // ========== 工作流编排 ==========
    workflow: () => `
        <div class="page-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">工作流编排</div>
                    <div style="font-size:13px; color:var(--text-tertiary);">按写作顺序组合 AI 工具，一键完成复杂创作任务</div>
                </div>
                <button class="btn btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    新建工作流
                </button>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">玄幻开篇工作流</div>
                            <div class="card-subtitle">3 个节点 · 最后使用 2 天前</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">编辑</button>
                            <button class="btn btn-primary btn-sm">运行</button>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">1</div>
                        <div class="workflow-content">
                            <div class="workflow-title">世界观设定生成</div>
                            <div class="workflow-desc">输入核心创意，生成完整的世界观框架</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">2</div>
                        <div class="workflow-content">
                            <div class="workflow-title">主角人设生成</div>
                            <div class="workflow-desc">基于世界观，设计主角成长路线和性格特点</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">3</div>
                        <div class="workflow-content">
                            <div class="workflow-title">开篇三章生成</div>
                            <div class="workflow-desc">生成黄金三章，包含钩子、冲突、期待感</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">战斗场景工作流</div>
                            <div class="card-subtitle">4 个节点 · 最后使用 5 天前</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">编辑</button>
                            <button class="btn btn-primary btn-sm">运行</button>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">1</div>
                        <div class="workflow-content">
                            <div class="workflow-title">战斗起因设定</div>
                            <div class="workflow-desc">明确战斗双方、冲突原因、赌注</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">2</div>
                        <div class="workflow-content">
                            <div class="workflow-title">招式描写生成</div>
                            <div class="workflow-desc">生成华丽的招式名称和视觉效果描写</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">3</div>
                        <div class="workflow-content">
                            <div class="workflow-title">战斗节奏设计</div>
                            <div class="workflow-desc">设计战斗起伏：压制→反击→高潮</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">4</div>
                        <div class="workflow-content">
                            <div class="workflow-title">战后收获描写</div>
                            <div class="workflow-desc">描写战利品、感悟、角色成长</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">情感爆发工作流</div>
                            <div class="card-subtitle">3 个节点 · 从未使用</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">编辑</button>
                            <button class="btn btn-primary btn-sm">运行</button>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">1</div>
                        <div class="workflow-content">
                            <div class="workflow-title">情感铺垫生成</div>
                            <div class="workflow-desc">生成细腻的情感积累和暗示</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">2</div>
                        <div class="workflow-content">
                            <div class="workflow-title">冲突爆发设计</div>
                            <div class="workflow-desc">设计情感爆发的触发点和表达方式</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">3</div>
                        <div class="workflow-content">
                            <div class="workflow-title">余韵描写</div>
                            <div class="workflow-desc">描写情感爆发后的余波和角色变化</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="border-style: dashed; border-color: var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; min-height: 300px;"
                     onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--text-muted)'">
                    <div style="text-align:center; color:var(--text-muted);">
                        <div style="font-size:36px; margin-bottom:12px;">+</div>
                        <div style="font-size:15px; font-weight:500;">创建新工作流</div>
                        <div style="font-size:12px; margin-top:6px;">组合多个 AI 工具形成创作流水线</div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // ========== 热文赛道 ==========
    trends: () => `
        <div class="page-section" id="trendsPage">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; flex-wrap:wrap; gap:10px;">
                <div class="tabs" id="trendsLengthTabs" style="margin:0; flex-wrap:wrap;">
                    <button class="tab active" data-length="long" onclick="switchTrendsLength('long', this)">长篇</button>
                    <button class="tab" data-length="short" onclick="switchTrendsLength('short', this)">短篇</button>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap:wrap; gap:10px;">
                <div class="tabs" id="trendsMainTabs" style="margin:0; flex-wrap:wrap;">
                    <button class="tab active" data-cat="platform" onclick="switchTrendsTab('platform', this)">平台热搜</button>
                    <button class="tab" data-cat="maleHot" onclick="switchTrendsTab('maleHot', this)">男频热度</button>
                    <button class="tab" data-cat="maleNew" onclick="switchTrendsTab('maleNew', this)">男频新书</button>
                    <button class="tab" data-cat="femaleHot" onclick="switchTrendsTab('femaleHot', this)">女频热度</button>
                    <button class="tab" data-cat="femaleNew" onclick="switchTrendsTab('femaleNew', this)">女频新书</button>
                    <button class="tab" data-cat="jiuzhou" onclick="switchTrendsTab('jiuzhou', this)">九州榜单</button>
                </div>
                <div class="search-box" style="width:220px; margin:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" id="trendsSearchInput" placeholder="搜索榜单..." oninput="debounceLoadTrends()">
                </div>
            </div>

            <!-- 日期选择栏：所有分类通用 -->
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:6px; padding:4px 10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <select id="trendsDateSelect" onchange="onTrendsDateChange(this.value)" style="border:none; background:transparent; color:var(--text-secondary); font-size:13px; outline:none; cursor:pointer;">
                        <option value="0">今天</option>
                        <option value="1">昨天</option>
                        <option value="2">2天前</option>
                        <option value="3">3天前</option>
                        <option value="4">4天前</option>
                        <option value="5">5天前</option>
                        <option value="6">6天前</option>
                    </select>
                </div>
                <!-- 历史日期快捷切换 -->
                <div id="trendsHistoryDates" style="display:flex; gap:4px; flex-wrap:wrap;"></div>
                <span id="trendsCurrentDateLabel" style="font-size:12px; color:var(--text-muted); margin-left:auto;"></span>
            </div>

            <div id="trendsPlatformBar" style="display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
                <div class="tabs" style="margin:0;" id="trendsPlatformTabs">
                    <button class="tab active" data-platform="douyin" onclick="switchTrendsPlatform('douyin', this)">抖音</button>
                    <button class="tab" data-platform="weibo" onclick="switchTrendsPlatform('weibo', this)">微博</button>
                    <button class="tab" data-platform="toutiao" onclick="switchTrendsPlatform('toutiao', this)">今日头条</button>
                    <button class="tab" data-platform="baidu" onclick="switchTrendsPlatform('baidu', this)">百度</button>
                    <button class="tab" data-platform="bilibili" onclick="switchTrendsPlatform('bilibili', this)">B站</button>
                </div>
            </div>

            <div id="trendsSourceTag" style="margin-bottom:12px;"></div>

            <div id="trendsWindVane" style="margin-bottom:16px; display:none;"></div>

            <div id="trendsHotInsp" style="margin-bottom:16px; display:none;"></div>

            <div id="trendsBookAnalysis" style="margin-bottom:16px; display:none;"></div>

            <div id="trendsContent">
                <div style="text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>
        </div>
    `,

    // ========== 写作中心 ==========
    center: () => `
        <div class="page-section">
            <div class="tabs">
                <button class="tab active">作品分析</button>
                <button class="tab">排行榜</button>
                <button class="tab">读者反馈</button>
                <button class="tab">AI 辅助建议</button>
            </div>

            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">📊 角色分析</div>
                            <div class="card-subtitle">《仙途漫漫》角色戏份与关系</div>
                        </div>
                    </div>
                    <div class="grid-3" style="margin-bottom: 20px;">
                        <div class="character-card">
                            <div class="character-avatar">林</div>
                            <div class="character-name">林青云</div>
                            <div class="character-role">主角 · 出场 89%</div>
                        </div>
                        <div class="character-card">
                            <div class="character-avatar" style="background:linear-gradient(135deg, #ef4444, #b91c1c);">苏</div>
                            <div class="character-name">苏婉清</div>
                            <div class="character-role">女主 · 出场 45%</div>
                        </div>
                        <div class="character-card">
                            <div class="character-avatar" style="background:linear-gradient(135deg, #22c55e, #15803d);">莫</div>
                            <div class="character-name">莫天机</div>
                            <div class="character-role">反派 · 出场 32%</div>
                        </div>
                    </div>
                    <div style="font-size:12px; color:var(--text-tertiary);">
                        <div style="margin-bottom:8px;"><span style="color:var(--accent);">●</span> 主角戏份充足，建议增加配角支线以丰富世界观</div>
                        <div style="margin-bottom:8px;"><span style="color:var(--warning);">●</span> 反派莫天机出场偏少，第100章后存在感下降</div>
                        <div><span style="color:var(--success);">●</span> 女主苏婉清互动场景情感描写细腻，读者反馈良好</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">📈 阅读数据分析</div>
                            <div class="card-subtitle">《都市夜行者》读者行为</div>
                        </div>
                    </div>
                    <div class="chart-area" style="height: 160px; margin-bottom: 16px;">
                        <div class="chart-bar" style="height: 30%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 45%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 55%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 70%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 65%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 80%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 85%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
                        <div style="text-align:center;">
                            <div style="font-size:20px; font-weight:700; color:var(--text-primary);">12.5万</div>
                            <div style="font-size:11px; color:var(--text-tertiary);">总阅读人数</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:20px; font-weight:700; color:var(--text-primary);">68%</div>
                            <div style="font-size:11px; color:var(--text-tertiary);">完读率</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:20px; font-weight:700; color:var(--text-primary);">4.8</div>
                            <div style="font-size:11px; color:var(--text-tertiary);">平均评分</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">🤖 AI 辅助建议</div>
                        <div class="card-subtitle">基于作品数据的智能优化建议</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px;">
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">⚡ 节奏优化</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">第85-92章节奏偏慢，连续多章为日常剧情。建议在第86章插入突发事件，或在第89章设置小高潮，提升读者追读欲望。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">一键生成冲突剧情</button>
                    </div>
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">👤 角色深化</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">配角"李长老"形象单薄，缺乏记忆点。建议增加一段回忆剧情，揭示其与主角父亲的过往，增强角色立体感。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">生成角色背景故事</button>
                    </div>
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">🎭 情感线建议</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">女主与主角的情感进展过快，建议在第100章前增加一次误会或分离，让情感线更具张力和可信度。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">设计情感冲突场景</button>
                    </div>
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">🏷️ 标签优化</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">当前标签覆盖不足，建议添加"逆袭"、"热血"、"修炼"等标签，可提高在对应分类的曝光率约 15-20%。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">一键优化标签</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    // ========== 用户数据 ==========
    analytics: () => `
        <div class="page-section">
            <div class="tabs">
                <button class="tab active">用户概览</button>
                <button class="tab">Token 消耗</button>
                <button class="tab">收入数据</button>
                <button class="tab">积分明细</button>
            </div>

            <div class="stat-grid" style="margin-bottom: 24px;">
                <div class="stat-card">
                    <div class="stat-icon blue">👥</div>
                    <div class="stat-value">45,832</div>
                    <div class="stat-label">平台注册用户</div>
                    <div class="stat-change positive">↑ 本月新增 3,421 人</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">⚡</div>
                    <div class="stat-value">2.8M</div>
                    <div class="stat-label">本月 Token 消耗</div>
                    <div class="stat-change positive">↑ 较上月 +23%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">💰</div>
                    <div class="stat-value">¥128,450</div>
                    <div class="stat-label">本月平台收入</div>
                    <div class="stat-change positive">↑ 较上月 +18%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">🎯</div>
                    <div class="stat-value">86.5%</div>
                    <div class="stat-label">用户留存率</div>
                    <div class="stat-change positive">↑ 较上月 +5%</div>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">👤 用户活跃度</div>
                            <div class="card-subtitle">日活/周活/月活趋势</div>
                        </div>
                    </div>
                    <div class="chart-area" style="height: 200px;">
                        <div class="chart-bar" style="height: 55%; opacity:0.9;"></div>
                        <div class="chart-bar" style="height: 60%; opacity:0.85;"></div>
                        <div class="chart-bar" style="height: 58%; opacity:0.9;"></div>
                        <div class="chart-bar" style="height: 70%; opacity:0.95;"></div>
                        <div class="chart-bar" style="height: 75%; opacity:0.9;"></div>
                        <div class="chart-bar" style="height: 82%; opacity:0.95;"></div>
                        <div class="chart-bar" style="height: 88%; opacity:1;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:12px; padding:0 8px;">
                        <span style="font-size:11px; color:var(--text-muted);">日活: 8,234</span>
                        <span style="font-size:11px; color:var(--text-muted);">周活: 28,456</span>
                        <span style="font-size:11px; color:var(--text-muted);">月活: 45,832</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">⚡ Token 消耗分布</div>
                            <div class="card-subtitle">各功能模块 Token 使用占比</div>
                        </div>
                    </div>
                    <div style="padding: 8px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">AI 续写</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:42%; background:var(--accent);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">42%</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">工作流</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:28%; background:var(--info);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">28%</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">情节推演</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:18%; background:var(--success);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">18%</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0;">
                            <span style="font-size:13px; color:var(--text-secondary);">其他工具</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:12%; background:var(--warning);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">12%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">💰 收入与积分明细</div>
                        <div class="card-subtitle">近30天交易记录</div>
                    </div>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>类型</th>
                                <th>描述</th>
                                <th>产品币</th>
                                <th>积分</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>2026-04-29</td>
                                <td>充值</td>
                                <td>会员续费 - 专业版年卡</td>
                                <td style="color:var(--success); font-weight:600;">+¥298</td>
                                <td>—</td>
                                <td><span class="tag" style="background:rgba(34,197,94,0.1); color:var(--success);">已完成</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-28</td>
                                <td>消耗</td>
                                <td>AI 续写 - Token 消耗</td>
                                <td>—</td>
                                <td style="color:var(--danger); font-weight:600;">-1,250</td>
                                <td><span class="tag" style="background:rgba(239,68,68,0.1); color:var(--danger);">已扣除</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-27</td>
                                <td>消耗</td>
                                <td>工作流「玄幻开篇」运行</td>
                                <td>—</td>
                                <td style="color:var(--danger); font-weight:600;">-3,800</td>
                                <td><span class="tag" style="background:rgba(239,68,68,0.1); color:var(--danger);">已扣除</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-26</td>
                                <td>奖励</td>
                                <td>每日签到奖励</td>
                                <td>—</td>
                                <td style="color:var(--success); font-weight:600;">+100</td>
                                <td><span class="tag" style="background:rgba(34,197,94,0.1); color:var(--success);">已到账</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-25</td>
                                <td>充值</td>
                                <td>积分充值 - 10,000积分包</td>
                                <td style="color:var(--success); font-weight:600;">+¥68</td>
                                <td style="color:var(--success); font-weight:600;">+10,000</td>
                                <td><span class="tag" style="background:rgba(34,197,94,0.1); color:var(--success);">已完成</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,

    // ========== 个人中心 ==========
    profile: () => {
        const u = currentUser || {};
        const username = u.username || '用户';
        const phone = u.phone || '';
        const membership = u.membership || '免费版';
        const points = u.points || 0;
        const tokenPercent = u.tokenPercent || 100;
        const workCount = u.workCount || 0;
        const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '-';
        const phoneMask = phone ? phone.slice(0, 3) + ' **** ' + phone.slice(-4) : '';
        const fallback = username[0] || '创';
        const avatarInfo = resolveAvatar(u.avatar, fallback);
        const subType = u.subscriptionType || 'none';
        const subExpire = u.subscriptionExpireAt;
        const isActive = subType !== 'none' && subExpire && new Date(subExpire) > new Date();
        const subLabel = isActive ? (subType === 'yearly' ? '年费版' : '月费版') : membership;
        const subExpireText = isActive && subExpire
            ? Math.ceil((new Date(subExpire).getTime() - Date.now()) / 86400000) + '天后到期'
            : (subType === 'none' ? '免费版，可积分兑换' : '已过期');
        return `
        <div class="page-section" style="max-width: 720px; margin: 0 auto;">
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 20px; padding: 8px 4px;">
                    <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-dark)); display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; font-family: var(--font-serif); flex-shrink: 0; overflow: hidden;">
                        ${avatarInfo.isUrl ? `<img src="${escapeAttr(avatarInfo.src)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.textContent='${escapeAttr(fallback)}'">` : avatarInfo.text}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(username)}</div>
                        <div style="font-size: 13px; color: var(--text-tertiary);">${escapeHtml(membership)} · ${joinDate} 加入</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="showAvatarPicker()">更换头像</button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">基本信息</div>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">用户 ID</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${u.id || '-'}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${u.id || ''}'); showToast('已复制到剪贴板', 'success')">复制</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">手机号</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${phoneMask}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="showChangePhoneModal()">修改</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">昵称</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${escapeHtml(username)}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="showModal('修改昵称','<div class=\\'form-group\\'><label class=\\'form-label\\'>新昵称</label><input type=\\'text\\' class=\\'form-input\\' id=\\'editUsername\\' maxlength=\\'50\\' value=\\'${escapeHtml(username)}\\'></div><div class=\\'form-actions\\'><button class=\\'btn btn-ghost\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove()\\'>取消</button><button class=\\'btn btn-primary\\' onclick=\\'saveProfile(&quot;username&quot;)\\'>保存</button></div>')">修改</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">账户资产</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-light);" id="profilePoints">${points.toLocaleString()}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">当前积分</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--success);">${tokenPercent}%</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Token 余量</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--warning);" id="profileWorkCount">${workCount}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">创作作品</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 16px;">
                    <button class="btn btn-primary" style="flex: 1;" id="profileCheckInBtn" onclick="handleCheckIn()">每日签到</button>
                    <button class="btn btn-outline" style="flex: 1;" onclick="showPointTransactions()">积分明细</button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">写作数据</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-light);" id="profileTotalWords">-</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">累计字数</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--success);" id="profileConsecutiveDays">-</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">连续写作天数</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--warning);" id="profileTodayWords">-</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">今日新增字数</div>
                    </div>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">近7天打卡</div>
                    <div id="profileWeekStreak" style="display: flex; gap: 6px;">
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">订阅状态</div>
                <div id="profileSubscriptionCard" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 16px;">👑</div>
                        <div>
                            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);" id="profileSubName">${escapeHtml(subLabel)}</div>
                            <div style="font-size: 12px; color: var(--text-muted);" id="profileSubExpire">${escapeHtml(subExpireText)}</div>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="showRedeemModal()">积分兑换</button>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <div style="flex:1; padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm); text-align:center; border:1px solid var(--border);">
                        <div style="font-size:11px; color:var(--text-muted);">1000积分</div>
                        <div style="font-size:12px; color:var(--text-primary); font-weight:600;">兑换7天</div>
                    </div>
                    <div style="flex:1; padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm); text-align:center; border:1px solid var(--border);">
                        <div style="font-size:11px; color:var(--text-muted);">3000积分</div>
                        <div style="font-size:12px; color:var(--text-primary); font-weight:600;">兑换30天</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">设置</div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                        <span style="font-size: 13px; color: var(--text-secondary);">AI 模型管理</span>
                        <button class="btn btn-ghost btn-sm" onclick="switchPage('modelConfigs')">选择模型</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                        <span style="font-size: 13px; color: var(--text-secondary);">修改密码</span>
                        <button class="btn btn-ghost btn-sm" onclick="showModal('修改密码', '<div class=\\'form-group\\'><label class=\\'form-label\\'>原密码</label><input type=\\'password\\' class=\\'form-input\\' id=\\'oldPassword\\'></div><div class=\\'form-group\\'><label class=\\'form-label\\'>新密码</label><input type=\\'password\\' class=\\'form-input\\' id=\\'newPassword\\'></div><div class=\\'form-group\\'><label class=\\'form-label\\'>确认新密码</label><input type=\\'password\\' class=\\'form-input\\' id=\\'confirmPassword\\'></div><div class=\\'form-actions\\'><button class=\\'btn btn-ghost\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove()\\'>取消</button><button class=\\'btn btn-primary\\' onclick=\\'saveProfile(&quot;password&quot;)\\'>保存</button></div>')">修改</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                        <span style="font-size: 13px; color: var(--danger);">退出登录</span>
                        <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="showModal('退出登录', '<p>确定要退出登录吗？</p><div class=\\'form-actions\\'><button class=\\'btn btn-ghost\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove()\\'>取消</button><button class=\\'btn btn-primary\\' style=\\'background:var(--danger);\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove(); logout();\\'>确认退出</button></div>')">退出</button>
                    </div>
                </div>
            </div>
        </div>
    `
},

    // ========== 模型配置管理（只读，内置预设模型） ==========
    modelConfigs: () => `
        <div class="page-section" style="max-width: 720px; margin: 0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">AI 模型选择</div>
                    <div style="font-size:13px; color:var(--text-muted);">选择适合当前任务的模型，平台已为你预置好配置</div>
                </div>
            </div>

            <div id="modelConfigList">
                <div style="text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>
        </div>
    `,

    // ========== 作品详情页 ==========
    workDetail: () => `
        <div class="page-section" style="max-width:760px; margin:0 auto;">
            <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:24px;">
                <div style="margin-bottom:20px;">
                    <span id="workDetailModeLabel" style="display:inline-block; padding:3px 10px; border-radius:12px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">新建作品</span>
                </div>
                <div class="form-group">
                    <label class="form-label">作品名称 <span style="color:var(--danger);">*</span></label>
                    <input type="text" class="form-input" id="wdTitle" maxlength="200" placeholder="给你的作品起个名字" />
                </div>
                <div class="form-group">
                    <label class="form-label">作品类型 <span style="color:var(--danger);">*</span></label>
                    <div id="wdLengthType" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdLengthType" value="long" checked /> 长篇</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdLengthType" value="short" /> 短篇</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">作品视角 <span style="color:var(--danger);">*</span></label>
                    <div id="wdPerspective" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdPerspective" value="first" /> 第一人称</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdPerspective" value="third" checked /> 第三人称</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">频道 <span style="color:var(--danger);">*</span></label>
                    <div id="wdChannel" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdChannel" value="male" checked /> 男频</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdChannel" value="female" /> 女频</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdChannel" value="all" /> 全频</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">标签 <span style="font-size:11px; color:var(--text-muted);">（按频道动态展示，最多选 2 个）</span></label>
                    <div id="wdTags" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">作品简介 <span style="font-size:11px; color:var(--text-muted);">（非必填）</span></label>
                    <textarea class="form-input" id="wdIntro" rows="4" maxlength="500" placeholder="一句话或一段话介绍你的作品..." style="resize:vertical;"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">作品灵感 <span style="font-size:11px; color:var(--text-muted);">（非必填）</span></label>
                    <textarea class="form-input" id="wdInspiration" rows="4" maxlength="2000" placeholder="记录你的创作灵感、核心梗、人设想法..." style="resize:vertical;"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">作品封面</label>
                    <div id="wdCoverPreview" style="width:120px; height:160px; border-radius:var(--radius-sm); background:linear-gradient(135deg, #1e3a5f, #0f2744); display:flex; align-items:center; justify-content:center; font-size:48px;">📖</div>
                    <span style="font-size:11px; color:var(--text-muted); margin-top:6px; display:inline-block;">第一期使用默认封面</span>
                </div>
                <div class="form-actions" style="margin-top:24px;">
                    <button class="btn btn-ghost" onclick="cancelWorkDetail()">取消</button>
                    <button class="btn btn-primary" onclick="saveWorkDetail()">保存</button>
                </div>
            </div>
        </div>
    `
};

const pageTitles = {
    dashboard: '概览',
    works: '我的作品',
    writing: '长篇写作',
    'ai-tools': 'AI 工具库',
    workflow: '工作流编排',
    trends: '热文赛道',
    center: '写作中心',
    analytics: '用户数据',
    inspiration: '灵感库',
    profile: '个人中心',
    workDetail: '作品详情',
    modelConfigs: 'AI 模型选择'
};

// 当前写作子视图
let currentWritingView = 'editor';

// ========== 前端错误上报工具 ==========
function reportError(err, context) {
    const info = { error: err?.message || String(err), context, url: location.href, time: new Date().toISOString() };
    console.error('[reportError]', info);
    if (typeof Sentry !== 'undefined' && window.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            if (context) scope.setContext('biz', context);
            Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        });
    }
}

// ========== 初始化 ==========
async function init() {
    // 预绑定登录表单事件（硬编码表单）
    bindAuthFormEvents();

    // 初始化用户信息（游客状态）
    updateUserInfo();

    // 检查登录状态：未登录则强制显示登录层，不渲染任何页面
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        showAuth();
        return;
    }

    hideAuth();

    // 绑定导航点击事件（未登录时阻止切换）
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showAuth();
                return;
            }
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // 直接进入我的作品页
    switchPage('works');
}

// ========== 页面切换 ==========
async function switchPage(page) {
    // 更新导航激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // 更新页面标题
    document.getElementById('pageTitle').textContent = pageTitles[page] || '概览';

    // 渲染页面内容
    const contentArea = document.getElementById('contentArea');
    const renderFn = pages[page];
    if (renderFn) {
        contentArea.innerHTML = renderFn();
        bindTabs();
        await initPageInteractions(page);

        // 如果是写作页面，初始化子视图
        if (page === 'writing') {
            switchWritingView(currentWritingView);
        }
    }
}

// ========== 写作页面子视图切换 ==========
function switchWritingView(view) {
    currentWritingView = view;

    // 更新左侧菜单激活状态
    const sidebar = document.getElementById('writingSidebar');
    if (sidebar) {
        sidebar.querySelectorAll('.tree-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
    }

    // 渲染右侧内容
    const main = document.getElementById('writingMain');
    if (main && writingViews[view]) {
        main.innerHTML = writingViews[view]();
    }
}

// 左栏tab切换
function switchLeftTab(tab) {
    document.querySelectorAll('.left-tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.style.color = isActive ? 'var(--text-primary)' : 'var(--text-muted)';
        t.style.borderBottom = isActive ? '2px solid var(--accent)' : '2px solid transparent';
        t.style.fontWeight = isActive ? '600' : '400';
    });
    ['info', 'body', 'analysis'].forEach(id => {
        const el = document.getElementById('left-' + id);
        if (el) el.style.display = id === tab ? 'block' : 'none';
    });
}

// ========== Tab 切换（带过滤） ==========
function bindTabs() {
    document.querySelectorAll('.tabs').forEach(tabsContainer => {
        // 自带 onclick 的 Tab 由页面专属逻辑接管，避免同一次点击触发两套筛选。
        if (tabsContainer.querySelector('.tab[onclick]')) return;
        tabsContainer.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // 触发页面特定的过滤逻辑
                const pageTitle = document.getElementById('pageTitle').textContent;
                handleTabFilter(pageTitle, tab.textContent.trim());
            });
        });
    });
}

// ========== 主题切换 ==========
let themeMenuOpen = false;

function toggleThemeMenu() {
    themeMenuOpen = !themeMenuOpen;
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show', themeMenuOpen);
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jz-theme', theme);

    const label = document.getElementById('themeLabel');
    const icon = document.getElementById('themeIcon');
    const labels = { dark: '深色', light: '浅色', warm: '暖色' };
    if (label) label.textContent = labels[theme];

    if (icon) {
        const icons = {
            dark: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
            light: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
            warm: '<path d="M12 2c0 0-7 4-7 11s4 9 7 9 7-2 7-9-7-11-7-11z"/><circle cx="12" cy="13" r="3"/>'
        };
        icon.innerHTML = icons[theme];
    }

    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
    });

    themeMenuOpen = false;
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

function initTheme() {
    const saved = localStorage.getItem('jz-theme') || 'dark';
    setTheme(saved);
}

document.addEventListener('click', (e) => {
    if (themeMenuOpen && !e.target.closest('.theme-switcher')) {
        themeMenuOpen = false;
        const dropdown = document.getElementById('themeDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
    if (modelMenuOpen && !e.target.closest('.model-switcher')) {
        modelMenuOpen = false;
        const dropdown = document.getElementById('modelDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

// ========== 模型切换器 ==========
let modelMenuOpen = false;

function toggleModelMenu() {
    modelMenuOpen = !modelMenuOpen;
    const dropdown = document.getElementById('modelDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show', modelMenuOpen);
        if (modelMenuOpen) {
            loadTopbarModelList();
        }
    }
}

async function loadTopbarModelList() {
    const listEl = document.getElementById('topbarModelList');
    if (!listEl) return;

    try {
        const list = await api('/preset-models');
        modelConfigList = list || [];
        if (!list || list.length === 0) {
            listEl.innerHTML = '<div style="padding:12px; font-size:12px; color:var(--text-muted); text-align:center;">暂无可用模型，请联系管理员配置</div>';
            return;
        }

        // 恢复当前选中模型
        const savedId = localStorage.getItem('jz_current_model_id');
        let activeId = savedId || null;
        // 兼容旧格式：纯数字是旧版 ID，清理后回退默认
        if (activeId) {
            const parsed = parseInt(activeId);
            if (!isNaN(parsed) && String(parsed) === activeId) {
                localStorage.removeItem('jz_current_model_id');
                activeId = null;
            }
        }
        if (!activeId) {
            const defaultCfg = list.find(c => c.isDefault);
            if (defaultCfg) activeId = defaultCfg.id;
        }

        let html = '';
        for (const cfg of list) {
            const isActive = cfg.id === activeId;
            const providerIcon = cfg.provider === 'anthropic' ? '🔮' : '🤖';
            html += `<div class="model-option ${isActive ? 'active' : ''}" data-model-id="${cfg.id}" onclick="selectTopbarModel('${cfg.id}')" style="display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; font-size:12px; color:var(--text-secondary); ${isActive ? 'background:var(--accent-glow); color:var(--accent);' : ''}">
                <span class="model-option-icon">${providerIcon}</span>
                <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cfg.name)}</span>
                ${cfg.isDefault ? '<span style="font-size:10px; color:var(--text-muted);">默认</span>' : ''}
            </div>`;
        }
        listEl.innerHTML = html;
    } catch (err) {
        listEl.innerHTML = '<div style="padding:12px; font-size:12px; color:var(--text-muted); text-align:center;">加载失败</div>';
    }
}

function selectTopbarModel(modelId) {
    currentModelId = modelId;
    localStorage.setItem('jz_current_model_id', modelId);

    // 同步写作页面的模型选择器
    const chatModelTriggerName = document.getElementById('chatModelTriggerName');
    if (chatModelTriggerName) {
        const activeCfg = modelConfigList.find(c => c.id === modelId);
        chatModelTriggerName.textContent = activeCfg ? activeCfg.name : '默认模型';
    }

    // 更新下拉列表选中状态
    document.querySelectorAll('.model-option').forEach(opt => {
        const isActive = opt.dataset.modelId === modelId;
        opt.classList.toggle('active', isActive);
        opt.style.cssText = isActive
            ? 'display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; font-size:12px; background:var(--accent-glow); color:var(--accent);'
            : 'display:flex; align-items:center; gap:8px; padding:8px 12px; cursor:pointer; font-size:12px; color:var(--text-secondary);';
    });

    showToast('已切换模型', 'success');
}

// ========== Toast 提示系统 ==========
function showToast(message, type = 'info') {
    const existing = document.querySelector('.jz-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'jz-toast';
    const colors = {
        info: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--danger)',
        danger: 'var(--danger)'
    };
    const icons = {
        info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', danger: '❌'
    };
    toast.innerHTML = `
        <span style="margin-right: 8px;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: var(--radius);
        border: 1px solid ${colors[type] || colors.info};
        box-shadow: var(--shadow);
        font-size: 13px;
        font-weight: 500;
        z-index: 9999;
        display: flex;
        align-items: center;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ========== Modal 弹窗系统 ==========
function showModal(title, content) {
    const overlay = document.createElement('div');
    overlay.className = 'jz-modal-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
        z-index: 9998; opacity: 0; transition: opacity 0.2s ease;
    `;
    overlay.innerHTML = `
        <div class="jz-modal" style="
            background: var(--bg-secondary); border: 1px solid var(--border);
            border-radius: var(--radius-lg); padding: 24px;
            max-width: 520px; width: 90%; max-height: 80vh; overflow-y: auto;
            box-shadow: var(--shadow); transform: scale(0.95);
            transition: transform 0.2s ease;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">${title}</span>
                <button onclick="this.closest('.jz-modal-overlay').remove()" style="
                    background: none; border: none; color: var(--text-muted);
                    cursor: pointer; font-size: 18px; padding: 4px;
                ">✕</button>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.jz-modal').style.transform = 'scale(1)';
    });
}

// ========== 热点 AI 分析（SSE 流式）==========
async function analyzeHotTitle(title, platform, hot) {
    if (!currentUser) {
        showToast('请先登录', 'warning');
        return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'jz-modal-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
        z-index: 9998; opacity: 0; transition: opacity 0.2s ease;
    `;
    overlay.innerHTML = `
        <div class="jz-modal" style="
            background: var(--bg-secondary); border: 1px solid var(--border);
            border-radius: var(--radius-lg); padding: 24px;
            max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto;
            box-shadow: var(--shadow); transform: scale(0.95);
            transition: transform 0.2s ease;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">热点创作分析</span>
                <button onclick="this.closest('.jz-modal-overlay').remove()" style="
                    background: none; border: none; color: var(--text-muted);
                    cursor: pointer; font-size: 18px; padding: 4px;
                ">✕</button>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                <div style="padding:12px; background:var(--bg-tertiary); border-radius:var(--radius); margin-bottom:16px;">
                    <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${escapeHtml(title)}</div>
                    <div style="font-size:12px; color:var(--text-muted);">${escapeHtml(platform || '')} ${hot ? '· ' + escapeHtml(hot) : ''}</div>
                </div>
                <div id="hotAnalysisContent" style="white-space: pre-wrap;" data-title="" data-platform="" data-hot="">
                    <div id="hotAnalysisLoading" style="text-align:center; padding:24px;">
                        <div class="spinner" style="width:28px; height:28px; margin:0 auto 10px;"></div>
                        <div style="color:var(--text-muted); font-size:13px;">AI 正在分析创作灵感</div>
                        <div style="color:var(--text-muted); font-size:11px; margin-top:6px;">请稍候，逐字为您呈现...</div>
                    </div>
                </div>
                <div id="hotAnalysisActions" style="display:none; margin-top:16px; text-align:right;">
                    <button class="btn btn-primary btn-sm" onclick="saveHotAnalysisToInspiration()">⭐ 收藏到灵感库</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.jz-modal').style.transform = 'scale(1)';
    });

    const contentEl = document.getElementById('hotAnalysisContent');
    let hasReceived = false;

    await streamSSE('/api/trends/analyze-hot', { title, platform, hot },
        (fullText) => {
            if (!hasReceived && contentEl) {
                const loadingEl = document.getElementById('hotAnalysisLoading');
                if (loadingEl) loadingEl.remove();
                hasReceived = true;
            }
            if (contentEl) {
                contentEl.innerHTML = renderMarkdown(fullText);
            }
        },
        (fullText) => {
            if (!hasReceived && contentEl) {
                contentEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">分析完成</div>';
            }
            if (contentEl) {
                contentEl.dataset.fullText = fullText;
                contentEl.dataset.title = title;
                contentEl.dataset.platform = platform || '';
                contentEl.dataset.hot = hot || '';
            }
            const actionsEl = document.getElementById('hotAnalysisActions');
            if (actionsEl) actionsEl.style.display = 'block';
        },
        (err) => {
            if (contentEl) {
                contentEl.innerHTML = `<div style="color:var(--danger);">分析失败：${escapeHtml(err)}</div>`;
            }
        }
    );
}

// ========== 作品操作菜单（卡片旁下拉） ==========
function showWorkMenu(btn, workTitle, workId) {
    const card = btn.closest('.card');
    if (!card) return;

    // 关闭其他已打开的下拉菜单
    document.querySelectorAll('.work-dropdown').forEach(d => d.remove());

    const dropdown = document.createElement('div');
    dropdown.className = 'work-dropdown';
    dropdown.style.cssText = `
        position: absolute; top: 8px; right: 8px; z-index: 100;
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: var(--radius); box-shadow: var(--shadow);
        min-width: 160px; padding: 6px 0;
    `;
    dropdown.innerHTML = `
        <div style="display:flex; flex-direction:column;" onclick="event.stopPropagation();">
            <button class="work-menu-item" style="display:flex; align-items:center; gap:10px; padding:8px 14px; background:transparent; border:none; color:var(--text-primary); font-size:13px; cursor:pointer; text-align:left;"
                onclick="this.closest('.work-dropdown').remove(); enterWriting(${workId}); showToast('已进入「${workTitle}」写作工作台', 'success');">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                去写作
            </button>
            <button class="work-menu-item" style="display:flex; align-items:center; gap:10px; padding:8px 14px; background:transparent; border:none; color:var(--text-primary); font-size:13px; cursor:pointer; text-align:left;"
                onclick="this.closest('.work-dropdown').remove(); exportWork(${workId});">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
            </button>
            <button class="work-menu-item" style="display:flex; align-items:center; gap:10px; padding:8px 14px; background:transparent; border:none; color:var(--text-primary); font-size:13px; cursor:pointer; text-align:left;"
                onclick="this.closest('.work-dropdown').remove(); enterWorkDetail('edit', ${workId});">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"/></svg>
                编辑作品信息
            </button>
            <button class="work-menu-item" style="display:flex; align-items:center; gap:10px; padding:8px 14px; background:transparent; border:none; color:var(--text-primary); font-size:13px; cursor:pointer; text-align:left;"
                onclick="this.closest('.work-dropdown').remove(); showToast('交稿功能开发中', 'warning');">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                交稿
            </button>
            <div style="height:1px; background:var(--border); margin:4px 8px;"></div>
            <button class="work-menu-item" style="display:flex; align-items:center; gap:10px; padding:8px 14px; background:transparent; border:none; color:var(--danger); font-size:13px; cursor:pointer; text-align:left;"
                onclick="this.closest('.work-dropdown').remove(); softDeleteWork(${workId}, '${workTitle.replace(/'/g, "\\'")}');">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                删除
            </button>
        </div>
    `;

    // 卡片需要 relative 定位
    card.style.position = 'relative';
    card.appendChild(dropdown);

    // hover 效果
    dropdown.querySelectorAll('.work-menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-hover)');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
    });

    // 点击外部关闭
    const closeHandler = (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

// ========== 软删除 ==========
function softDeleteWork(workId, workTitle) {
    showModal('删除作品', `
        <p>确定要删除「${workTitle}」吗？</p>
        <p style="color:var(--text-muted); font-size:13px; margin-top:8px;">删除后作品会进入回收站，30天后自动清理。</p>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" style="background:var(--danger);" onclick="executeSoftDelete(${workId})">确认删除</button>
        </div>
    `);
}

async function executeSoftDelete(workId) {
    try {
        await api(`/works/${workId}`, { method: 'DELETE' });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('作品已移至回收站', 'success');
        // 刷新作品列表
        loadWorksList();
        // 如果在回收站视图也刷新
        loadTrashList();
    } catch (err) {
        showToast('删除失败: ' + err.message, 'danger');
    }
}

// ========== 导出功能 ==========
function exportWork(workId) {
    if (!workId) return;
    const token = authToken || localStorage.getItem('jz_token');
    const url = `${API_BASE}/works/${workId}/export?format=txt`;
    fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }).then(res => {
        if (!res.ok) throw new Error('导出失败');
        return res.blob();
    }).then(blob => {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        showToast('导出成功', 'success');
    }).catch(err => {
        showToast('导出失败: ' + err.message, 'danger');
    });
}

function exportChapter(workId, chapterId) {
    if (!workId || !chapterId) return;
    const token = authToken || localStorage.getItem('jz_token');
    const url = `${API_BASE}/works/${workId}/chapters/${chapterId}/export?format=txt`;
    fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }).then(res => {
        if (!res.ok) throw new Error('导出失败');
        return res.blob();
    }).then(blob => {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        showToast('章节导出成功', 'success');
    }).catch(err => {
        showToast('导出失败: ' + err.message, 'danger');
    });
}

// ========== Tab 过滤逻辑 ==========
function handleTabFilter(pageTitle, tabName) {
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    // 我的作品 - 按状态过滤
    if (pageTitle === '我的作品') {
        const cards = contentArea.querySelectorAll('.grid-3 > .card');
        cards.forEach(card => {
            if (card.querySelector('.list-badge')) {
                const badge = card.querySelector('.list-badge').textContent.trim();
                let show = false;
                if (tabName === '全部作品') show = true;
                else if (tabName === '连载中' && badge === '连载中') show = true;
                else if (tabName === '已完结' && (badge === '已完结' || badge === '已发布')) show = true;
                else if (tabName === '草稿箱' && badge === '审核中') show = true;
                card.style.display = show ? '' : 'none';
            }
        });
        showToast(`已筛选：${tabName}`, 'info');
    }

    // AI 工具库 - 按类型过滤
    if (pageTitle === 'AI 工具库') {
        const sections = contentArea.querySelectorAll('.grid-4');
        const labels = contentArea.querySelectorAll('[style*="margin-bottom: 20px;"] > span');
        if (tabName === '全部工具') {
            sections.forEach(s => s.style.display = '');
            labels.forEach(l => l.closest('div').style.display = '');
        } else if (tabName === '单段工具') {
            sections.forEach((s, i) => s.style.display = i === 0 ? '' : 'none');
            labels.forEach((l, i) => l.closest('div').style.display = i === 0 ? '' : 'none');
        } else if (tabName === '我的收藏') {
            sections.forEach(s => s.style.display = 'none');
            labels.forEach(l => l.closest('div').style.display = 'none');
            showToast('暂无收藏的工具', 'warning');
        }
    }

    // 写作中心
    if (pageTitle === '写作中心') {
        if (tabName === '作品分析') {
            contentArea.querySelectorAll('.grid-2, .grid-2 + .card').forEach(el => el.style.display = '');
        } else {
            contentArea.querySelectorAll('.grid-2, .grid-2 + .card').forEach(el => el.style.display = 'none');
            showToast(`${tabName} 功能开发中`, 'warning');
        }
    }

    // 用户数据
    if (pageTitle === '用户数据') {
        if (tabName === '用户概览') {
            contentArea.querySelectorAll('.stat-grid, .grid-2, .grid-2 + .card').forEach(el => el.style.display = '');
        } else {
            contentArea.querySelectorAll('.stat-grid, .grid-2, .grid-2 + .card').forEach(el => el.style.display = 'none');
            showToast(`${tabName} 功能开发中`, 'warning');
        }
    }
}

// ========== 页面交互初始化 ==========
async function initPageInteractions(page) {
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    // 全局：为演示页面的按钮添加点击反馈（写作页面有独立逻辑，不添加默认事件）
    if (page !== 'writing') {
        contentArea.querySelectorAll('.btn').forEach(btn => {
            if (!btn.onclick && !btn.closest('.tabs')) {
                const text = btn.textContent.trim();
                if (text.includes('新建') || text.includes('新增') || text.includes('创建')) {
                    btn.addEventListener('click', () => {
                        showModal('新建', `<p>「${text}」功能即将上线。</p><p style="margin-top:8px; color:var(--text-muted);">当前为前端演示，后端接口开发中。</p>`);
                    });
                } else if (text.includes('编辑') || text.includes('保存') || text.includes('运行')) {
                    btn.addEventListener('click', () => {
                        showToast(`${text}成功`, 'success');
                    });
                } else if (text.includes('搜索') || text.includes('导入') || text.includes('导出')) {
                    btn.addEventListener('click', () => {
                        showToast(`${text}功能开发中`, 'warning');
                    });
                } else if (text.includes('生成') || text.includes('优化') || text.includes('续写') || text.includes('AI')) {
                    btn.addEventListener('click', () => {
                        showToast('AI 正在处理，请稍候...', 'info');
                        setTimeout(() => showToast('AI 生成完成！', 'success'), 1500);
                    });
                } else if (text && !text.includes('💾') && !text.includes('🤖')) {
                    btn.addEventListener('click', () => {
                        showToast(`「${text}」功能开发中`, 'warning');
                    });
                }
            }
        });
    }

    // 全局：卡片点击打开详情（ai-tools 页面有专用逻辑，跳过）
    if (page !== 'ai-tools') {
        contentArea.querySelectorAll('.tool-card, .character-card, .list-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn')) return;
                const nameEl = card.querySelector('.tool-name, .character-name, .list-title, .rank-title');
                const name = nameEl ? nameEl.textContent.trim() : '详情';
                showModal(name, `<p>这是「${name}」的详情页面。</p><p style="margin-top:8px; color:var(--text-muted);">完整功能将在后续版本推出。</p>`);
            });
        });
    }

    // 全局：标签点击切换
    contentArea.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
        });
    });

    // 特定页面处理
    if (page === 'dashboard') {
        loadDashboardStats();
    }

    if (page === 'profile') {
        loadProfileStats();
    }

    if (page === 'works') {
        loadWorksList();
    }

    if (page === 'trash') {
        loadTrashList();
    }

    if (page === 'workDetail') {
        initWorkDetailForm();
    }

    if (page === 'inspiration') {
        document.querySelectorAll('#inspLengthTabs .tab').forEach(t => {
            t.classList.toggle('active', t.dataset.length === inspCurrentLength);
        });
        loadInspirations();
    }

    if (page === 'modelConfigs') {
        loadModelConfigs();
    }

    if (page === 'trends') {
        document.querySelectorAll('#trendsLengthTabs .tab').forEach(t => {
            t.classList.toggle('active', t.dataset.length === trendsCurrentLength);
        });
        const savedDate = localStorage.getItem('jz_trends_date');
        const dateSelect = document.getElementById('trendsDateSelect');
        if (dateSelect && savedDate) dateSelect.value = savedDate;
        renderTrendsHistoryDates();
        loadTrends();
    }

    if (page === 'writing') {
        const workspace = document.querySelector('.writing-workspace');
        if (!workspace) return;

        // 绑定跨章滚动事件（只绑定一次，通过 checkbox 状态控制是否生效）
        const scrollContainer = document.getElementById('editorScrollContainer');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleEditorScroll);
        }

        // 恢复跨章滚动 checkbox 状态
        const crossChk = document.getElementById('crossChapterScroll');
        if (crossChk) {
            const saved = localStorage.getItem('jz_cross_chapter_scroll') === '1';
            crossChk.checked = saved;
            isCrossChapterScrollEnabled = saved;
        }

        // 智能补全提示
        const smartChk = document.getElementById('smartComplete');
        if (smartChk) {
            smartChk.addEventListener('change', (e) => {
                if (e.target.checked) {
                    showToast('智能补全功能即将上线', 'info');
                    e.target.checked = false;
                }
            });
        }

        // 加载作品数据
        await loadWritingPage();

        // 加载模型选择器
        loadModelSelector();

        // 恢复字体和字号设置
        let editorArea = document.getElementById('editorArea');
        const savedFont = localStorage.getItem('jz_editor_font');
        const savedSize = localStorage.getItem('jz_editor_size');
        if (editorArea) {
            if (savedFont) {
                editorArea.style.fontFamily = savedFont === 'default' ? 'var(--font-serif)' : savedFont;
            }
            if (savedSize) {
                editorArea.style.fontSize = savedSize;
            }
        }
        const fontSelect = document.getElementById('editorFontSelect');
        const sizeSelect = document.getElementById('editorSizeSelect');
        if (fontSelect && savedFont) fontSelect.value = savedFont;
        if (sizeSelect && savedSize) sizeSelect.value = savedSize;

        // 编辑器工具栏
        workspace.querySelectorAll('.editor-tool-btn').forEach(tool => {
            tool.addEventListener('click', () => {
                if (!editorArea) return;
                editorArea.focus();
                const title = tool.title;
                switch (title) {
                    case '撤销 (Ctrl+Z)': editorUndo(); break;
                    case '重做 (Ctrl+Y)': editorRedo(); break;
                    case '标题': document.execCommand('formatBlock', false, 'H1'); break;
                    case '粗体': document.execCommand('bold'); break;
                    case '斜体': document.execCommand('italic'); break;
                    case '下划线': document.execCommand('underline'); break;
                    case '删除线': document.execCommand('strikeThrough'); break;
                    case '引用': document.execCommand('formatBlock', false, 'BLOCKQUOTE'); break;
                    case '列表': document.execCommand('insertUnorderedList'); break;
                    case '待办': document.execCommand('insertHTML', false, '<input type="checkbox" style="margin-right:6px;">'); break;
                    case '分隔线': document.execCommand('insertHTML', false, '<hr style="border:none; border-top:1px solid var(--border); margin:16px 0;">'); break;
                    case '时钟': document.execCommand('insertHTML', false, new Date().toLocaleTimeString('zh-CN')); break;
                    case '清除格式': clearEditorFormat(); break;
                    case '历史版本':
                        if (!currentChapterId) { showToast('请先选择一个章节', 'warning'); break; }
                        showChapterVersions(currentChapterId);
                        break;
                    default: showToast(`已应用格式：${title}`, 'info');
                }
            });
        });

        // 字体和字号下拉框事件绑定（变量已在上方恢复设置时声明）
        if (fontSelect) {
            fontSelect.addEventListener('change', (e) => {
                if (!editorArea) return;
                const font = e.target.value;
                localStorage.setItem('jz_editor_font', font);
                if (font === 'default') {
                    editorArea.style.fontFamily = 'var(--font-serif)';
                } else {
                    editorArea.style.fontFamily = font;
                }
                editorArea.focus();
            });
        }
        if (sizeSelect) {
            sizeSelect.addEventListener('change', (e) => {
                if (!editorArea) return;
                const size = e.target.value;
                localStorage.setItem('jz_editor_size', size);
                editorArea.style.fontSize = size;
                editorArea.focus();
            });
        }

        // 初始化编辑器 AI 浮层（选中文字后的快捷工具）
        setupEditorAiFloat();

        // 编辑器 onInput 防抖自动保存 + 撤销栈
        let inputDebounceTimer = null;
        let undoDebounceTimer = null;
        if (editorArea) {
            editorArea.addEventListener('input', () => {
                // 输入时自动移除 placeholder
                const placeholder = editorArea.querySelector('#editorPlaceholder');
                if (placeholder) placeholder.remove();

                isContentDirty = true;
                updateSaveButtonState('unsaved');
                if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
                inputDebounceTimer = setTimeout(() => {
                    if (currentWorkId && currentChapterId) {
                        saveCurrentChapter(false);
                    }
                }, 2000);
                // 撤销栈：防抖 800ms 后推入，避免每一步输入都记录
                if (undoDebounceTimer) clearTimeout(undoDebounceTimer);
                undoDebounceTimer = setTimeout(() => {
                    if (!isUndoRedoAction && editorArea) {
                        const titleEl = editorArea.querySelector('h1#editorTitle');
                        let content = editorArea.innerHTML;
                        if (titleEl) content = content.replace(titleEl.outerHTML, '');
                        pushEditorUndo(content);
                    }
                }, 800);
            });
            // 粘贴时智能处理：优先保留原格式，统一黑色字体
            editorArea.addEventListener('paste', (e) => {
                // 粘贴时自动移除 placeholder
                const placeholder = editorArea.querySelector('#editorPlaceholder');
                if (placeholder) placeholder.remove();

                e.preventDefault();
                const clipboard = e.clipboardData || window.clipboardData;
                const htmlText = clipboard.getData('text/html');
                const plainText = clipboard.getData('text/plain');
                if (!plainText) return;

                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                const range = sel.getRangeAt(0);
                range.deleteContents();

                // 策略1：剪贴板有 HTML 且包含颜色样式 → 直接插入（保留原格式）
                if (htmlText && (htmlText.includes('color:') || htmlText.includes('<strong') || htmlText.includes('<h1') || htmlText.includes('<h2') || htmlText.includes('<h3'))) {
                    // 清理 HTML：只保留基本标签和颜色样式，去除外部容器的主题变量
                    const cleanHtml = htmlText
                        .replace(/color:\s*var\(--text-primary\)/gi, 'color:#1a1a1a')
                        .replace(/color:\s*var\(--text-secondary\)/gi, 'color:#1a1a1a')
                        .replace(/color:\s*inherit/gi, 'color:#1a1a1a');
                    const fragment = document.createRange().createContextualFragment(cleanHtml);
                    range.insertNode(fragment);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return;
                }

                // 策略2：检测是否包含 markdown 标记 → 解析为 HTML
                const hasMarkdown = /^(#{1,3}\s|\*\*|\*|~~|>\s|\-\s|\d+\.\s|```)/m.test(plainText) || /`[^`]+`/.test(plainText);
                if (hasMarkdown) {
                    const html = parseMarkdownToHtml(plainText);
                    const fragment = document.createRange().createContextualFragment(html);
                    range.insertNode(fragment);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    showToast('已解析 Markdown 格式', 'success');
                    return;
                }

                // 策略3：纯文本 → 包装为黑色 span 插入
                const wrappedText = plainText.split(/\n\s*\n/).map(block => {
                    block = block.trim();
                    if (!block) return '';
                    return '<p style="margin:0 0 10px 0; line-height:1.8; color:#1a1a1a;">' + escapeHtml(block).replace(/\n/g, '<br>') + '</p>';
                }).filter(Boolean).join('');
                const fragment = document.createRange().createContextualFragment(wrappedText || '<span style="color:#1a1a1a;">' + escapeHtml(plainText).replace(/\n/g, '<br>') + '</span>');
                range.insertNode(fragment);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            });

            // 键盘快捷键：Ctrl+Z 撤销，Ctrl+Y / Ctrl+Shift+Z 重做
            editorArea.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'z' && !e.shiftKey) {
                        e.preventDefault();
                        editorUndo();
                    } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                        e.preventDefault();
                        editorRedo();
                    }
                }
            });
        }

        // AI工具栏按钮
        workspace.querySelectorAll('.ai-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // 视觉切换
                workspace.querySelectorAll('.ai-tool-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-secondary)';
                    b.style.border = '1px solid var(--border)';
                });
                btn.classList.add('active');
                btn.style.background = 'var(--accent)';
                btn.style.color = 'white';
                btn.style.border = 'none';

                // 实际行为
                const action = btn.dataset.action;
                if (action === 'continue') {
                    handleContinueText();
                } else if (action === 'continue-plot') {
                    handleContinuePlot();
                } else if (action === 'replace') {
                    handleReplaceText();
                } else if (action === 'detect') {
                    handleDetectText();
                } else if (action === 'de-ai') {
                    handleDeAiText();
                }
            });
        });

        // AI对话：消息反馈按钮（复制/重新生成/点赞/点踩）
        const bindMsgFeedback = (container) => {
            container.querySelectorAll('.msg-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    const bubble = btn.closest('.ai-msg-bubble');
                    const contentEl = bubble?.querySelector('.ai-msg-content');
                    const msgText = contentEl?.textContent?.slice(0, 50) || '';
                    if (action === 'copy') {
                        const text = contentEl?.textContent || '';
                        if (!text) {
                            showToast('内容为空，无法复制', 'warning');
                            return;
                        }
                        if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success')).catch(() => fallbackCopy(text));
                        } else {
                            fallbackCopy(text);
                        }
                        console.log('[埋点]', { event: 'ai_msg_copy', chapterId: 127, msgPreview: msgText.slice(0, 50), timestamp: new Date().toISOString() });
                    } else if (action === 'insert') {
                        const text = contentEl?.textContent || '';
                        if (!text) {
                            showToast('内容为空', 'warning');
                            return;
                        }
                        insertIntoEditor(text);
                        console.log('[埋点]', { event: 'ai_msg_insert', chapterId: 127, msgPreview: msgText.slice(0, 50), timestamp: new Date().toISOString() });
                    } else if (action === 'replace') {
                        const text = contentEl?.textContent || '';
                        if (!text) {
                            showToast('内容为空', 'warning');
                            return;
                        }
                        replaceRefText(text);
                        console.log('[埋点]', { event: 'ai_msg_replace', chapterId: 127, msgPreview: msgText.slice(0, 50), timestamp: new Date().toISOString() });
                    } else if (action === 'regenerate') {
                        if (aiChatStreaming) {
                            showToast('正在生成中，请稍候', 'warning');
                            return;
                        }
                        const msgIndex = parseInt(bubble.dataset.msgIndex);
                        if (isNaN(msgIndex) || msgIndex <= 0 || msgIndex >= aiChatHistory.length) {
                            showToast('无法重新生成', 'warning');
                            return;
                        }
                        const userMsgIndex = msgIndex - 1;
                        const userMsg = aiChatHistory[userMsgIndex];
                        if (!userMsg || userMsg.role !== 'user') {
                            showToast('历史记录异常', 'warning');
                            return;
                        }
                        showToast('正在重新生成...', 'info');
                        contentEl.textContent = '';
                        const contextMessages = aiChatHistory.slice(0, userMsgIndex + 1);
                        aiChatAbortCtrl = new AbortController();
                        setAiSendButtonStreaming(true);
                        try {
                            await regenerateMessage(contextMessages, msgIndex, contentEl, aiChatAbortCtrl.signal);
                        } finally {
                            aiChatAbortCtrl = null;
                            setAiSendButtonStreaming(false);
                        }
                        console.log('[埋点]', { event: 'ai_msg_regenerate', chapterId: 127, msgPreview: msgText.slice(0, 50), timestamp: new Date().toISOString() });
                    } else if (action === 'like') {
                        btn.style.color = btn.style.color === 'var(--success)' ? 'var(--text-muted)' : 'var(--success)';
                        showToast('已点赞', 'success');
                        console.log('[埋点]', { event: 'ai_msg_like', chapterId: 127, msgPreview: msgText.slice(0, 50), timestamp: new Date().toISOString() });
                    } else if (action === 'dislike') {
                        btn.style.color = btn.style.color === 'var(--danger)' ? 'var(--text-muted)' : 'var(--danger)';
                        showToast('已点踩', 'info');
                        console.log('[埋点]', { event: 'ai_msg_dislike', chapterId: 127, msgPreview: msgText.slice(0, 50), timestamp: new Date().toISOString() });
                    } else if (action === 'undo-tool') {
                        const ok = window.jzEditor && window.jzEditor.restoreLastSnapshot();
                        if (ok) {
                            showToast('已撤销最近一次的 AI 写入', 'success');
                        } else {
                            showToast('没有可撤销的操作', 'warning');
                        }
                        btn.style.display = 'none';
                    }
                });
            });
        };

        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('已复制到剪贴板', 'success');
            } catch {
                showToast('复制失败，请手动复制', 'danger');
            }
            document.body.removeChild(textarea);
        }

        // 将文本插入到编辑器光标位置
        function insertIntoEditor(text) {
            const editorArea = document.getElementById('editorArea');
            if (!editorArea) {
                showToast('请先进入写作页面', 'warning');
                return false;
            }
            editorArea.focus();

            // 空编辑器清理
            if (!editorArea.innerHTML.trim() || editorArea.innerHTML === '<br>' || editorArea.innerHTML === '<div><br></div>') {
                editorArea.innerHTML = '';
            }

            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                if (editorArea.contains(range.commonAncestorContainer)) {
                    if (!range.collapsed) range.deleteContents();
                    // 按段落拆分，每段用 <p> 包裹
                    const paragraphs = text.split('\n');
                    const frag = document.createDocumentFragment();
                    paragraphs.forEach(para => {
                        const p = document.createElement('p');
                        p.textContent = para || ' ';
                        frag.appendChild(p);
                    });
                    range.insertNode(frag);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    editorArea.dispatchEvent(new Event('input', { bubbles: true }));
                    showToast('已插入正文', 'success');
                    return true;
                }
            }
            showToast('请先将光标放在编辑器中', 'warning');
            return false;
        }


        // 用 AI 生成内容替换引用的原文
        function replaceRefText(text) {
            if (!refSpanId) {
                showToast('未找到引用位置，请先使用@引用功能', 'warning');
                return false;
            }
            const span = document.getElementById(refSpanId);
            if (!span) {
                showToast('引用位置已失效', 'warning');
                refSpanId = null;
                return false;
            }
            // 替换 span 内容为 AI 生成文本
            span.innerHTML = '';
            const lines = text.split('\n');
            lines.forEach((line, i) => {
                if (i > 0) span.appendChild(document.createElement('br'));
                if (line) span.appendChild(document.createTextNode(line));
            });
            // 移除高亮样式，unwrap span
            span.style.cssText = '';
            span.removeAttribute('id');
            span.removeAttribute('class');
            const parent = span.parentNode;
            if (parent) {
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            }
            refSpanId = null;
            showToast('已替换原文', 'success');
            return true;
        }
        bindMsgFeedback(workspace);

        // AI对话：发送消息
        const chatMessages = workspace.querySelector('#aiChatMessages');
        const chatInput = workspace.querySelector('#aiChatInput');
        const chatSend = workspace.querySelector('#aiChatSend');

        // AI 对话历史
        let aiChatHistory = [];

        // 估算文本token数（中文约2字=1token，英文约1词=1token）
        function estimateTokens(text) {
            if (!text) return 0;
            // 中文字符数
            const cjkCount = (text.match(/[一-鿿]/g) || []).length;
            // 英文单词数
            const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
            // 其他字符（标点、数字等）按1token/字符估算
            const otherChars = text.length - cjkCount - (text.match(/[a-zA-Z]+/g)?.join('').length || 0);
            return Math.ceil(cjkCount / 2) + enWords + Math.ceil(otherChars / 4);
        }

        // 按token限制裁剪历史消息（从最新往旧取，累计不超过maxTokens，至少保留最近1条）
        function trimHistoryByTokens(history, maxTokens = 20000) {
            if (history.length === 0) return [];
            let totalTokens = 0;
            const result = [];
            for (let i = history.length - 1; i >= 0; i--) {
                const msg = history[i];
                const msgTokens = estimateTokens(msg.content) + 10; // 10 tokens 消息结构开销
                // 至少保留最近1条消息
                if (result.length > 0 && totalTokens + msgTokens > maxTokens) break;
                totalTokens += msgTokens;
                result.unshift(msg);
            }
            return result;
        }

        // 引用高亮 span 的 id（用于替换原文时定位）

        // 加载对话历史
        async function loadChatHistory() {
            if (!currentWorkId) return;
            try {
                const list = await api(`/ai/conversations?workId=${currentWorkId}`);
                if (list && list.length > 0) {
                    aiChatHistory = list[0].messages || [];
                } else {
                    aiChatHistory = [];
                }
            } catch (err) {
                aiChatHistory = [];
            }
            renderChatHistory();
        }

        function renderChatHistory() {
            if (!chatMessages) return;
            chatMessages.innerHTML = '';

            if (aiChatHistory.length === 0) {
                // 无历史时显示欢迎提示
                chatMessages.innerHTML = `
                    <div style="text-align:center; padding:40px 20px; color:var(--text-muted);"
                         id="aiChatWelcome">
                        <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--accent-dark)); display:flex; align-items:center; justify-content:center; margin:0 auto 12px; overflow:hidden;">
                            <svg width="28" height="28" viewBox="0 0 40 40" style="display:block;">
                                <text x="20" y="28" font-size="22" font-family="'Noto Serif SC', serif" fill="white" text-anchor="middle" font-weight="700">九</text>
                            </svg>
                        </div>
                        <div style="font-size:14px; margin-bottom:8px;">我是九章，你的写作助手</div>
                        <div style="font-size:12px; line-height:1.6;">
                            可以帮你续写、润色、构思剧情<br>
                            也可以聊聊你的创作想法
                        </div>
                    </div>
                `;
                return;
            }

            aiChatHistory.forEach((msg, index) => {
                if (msg.role === 'user') {
                    chatMessages.appendChild(createUserBubble(msg.content));
                } else if (msg.role === 'assistant' && msg.content) {
                    // 跳过只有 tool_calls 没有 content 的 assistant 消息
                    chatMessages.appendChild(createAiBubble(msg.content, index));
                }
                // role === 'tool' 的消息不渲染，仅作为上下文保留
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function createUserBubble(text) {
            const el = document.createElement('div');
            el.style.cssText = 'align-self:flex-end; max-width:95%;';
            const contentHtml = formatAiParagraphs(text);
            el.innerHTML = `
                <div style="background:var(--accent); padding:10px 12px; border-radius:12px 12px 4px 12px;">
                    <div style="font-size:12px; color:rgba(255,255,255,0.7); font-weight:600; margin-bottom:4px;">你</div>
                    <div style="font-size:13px; color:white; line-height:1.6;">${contentHtml}</div>
                </div>`;
            return el;
        }

        function createAiBubble(text, msgIndex) {
            const el = document.createElement('div');
            el.className = 'ai-msg-bubble';
            el.style.cssText = 'align-self:flex-start; max-width:95%;';
            if (msgIndex !== undefined) el.dataset.msgIndex = msgIndex;
            // 历史消息直接格式化为段落；空消息（流式占位）用 textContent 占位
            const contentHtml = text ? formatAiParagraphs(text) : '<span style="color:var(--text-muted);"></span>';
            el.innerHTML = `
                <div style="background:var(--bg-tertiary); padding:10px 12px; border-radius:12px 12px 12px 4px; border:1px solid var(--border);">
                    <div style="font-size:12px; color:var(--accent); font-weight:600; margin-bottom:4px;">九章</div>
                    <div class="ai-msg-content" style="font-size:13px; color:var(--text-primary); line-height:1.6;">${contentHtml}</div>
                </div>
                <div class="msg-feedback" style="display:flex; gap:6px; margin-top:6px; padding-left:4px;">
                    <button class="msg-btn" data-action="copy" style="padding:3px 8px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:3px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制
                    </button>
                    <button class="msg-btn" data-action="insert" style="padding:3px 8px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:3px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>插入正文
                    </button>
                    <button class="msg-btn" data-action="replace" style="padding:3px 8px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:3px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>替换原文
                    </button>
                    <button class="msg-btn" data-action="regenerate" style="padding:3px 8px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:3px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>重新生成
                    </button>
                    <button class="msg-btn" data-action="like" style="padding:3px 8px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:11px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    </button>
                    <button class="msg-btn" data-action="dislike" style="padding:3px 8px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:11px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                    </button>
                </div>`;
            bindMsgFeedback(el);
            return el;
        }

        // 加载历史
        loadChatHistory();

        // 对话工具状态
        currentChatTool = 'continue';
        let currentChatStyle = 'standard';

        // 斜杠命令工具列表（全局 OFFICIAL_SLASH_TOOLS）

        function getAllSlashTools() {
            const custom = getCustomTools().map(t => ({
                key: 'custom-' + t.id,
                name: t.name,
                icon: t.icon || '🤖',
                needSelection: t.needSelection || false,
                category: '我的工具',
                isCustom: true,
                customId: t.id
            }));
            return [...OFFICIAL_SLASH_TOOLS, ...custom];
        }

        // 绑定工具选择器
        const chatToolSelect = workspace.querySelector('#chatToolSelect');
        if (chatToolSelect) {
            // 动态填充工具选项（官方 + 自定义）
            const officialOpts = OFFICIAL_SLASH_TOOLS.map(t => `<option value="${t.key}">${t.icon} ${t.name}</option>`).join('');
            const customTools = getCustomTools();
            const customOpts = customTools.length > 0
                ? `<optgroup label="我的工具">${customTools.map(t => `<option value="custom-${t.id}">${t.icon || '🤖'} ${t.name}</option>`).join('')}</optgroup>`
                : '';
            chatToolSelect.innerHTML = `<option value="default">🛠️ 九章默认工具</option>${officialOpts}${customOpts}`;
            chatToolSelect.addEventListener('change', () => {
                const val = chatToolSelect.value;
                if (val.startsWith('custom-')) {
                    currentChatTool = 'custom';
                    currentCustomToolId = val.slice(7);
                } else {
                    currentChatTool = val;
                    currentCustomToolId = null;
                }
                showToast(`已切换到：${chatToolSelect.options[chatToolSelect.selectedIndex].text}`, 'info');
                // 同步更新工具选择器触发按钮
                updateChatToolTrigger();
            });
        }

        // 初始化工具选择器（下拉面板）
        initChatToolPicker();

        // 初始化模型选择器（弹出面板）
        initChatModelPicker();

        // 绑定 @引用按钮
        const chatRefBtn = workspace.querySelector('#chatRefBtn');
        if (chatRefBtn) {
            chatRefBtn.addEventListener('click', () => {
                const editorArea = document.getElementById('editorArea');
                const selection = window.getSelection();
                const selText = selection?.toString().trim();
                if (!selText || (editorArea && !editorArea.contains(selection.anchorNode))) {
                    showToast('请先在编辑器中选中文本', 'warning');
                    return;
                }

                // 清除之前的引用高亮
                clearRefHighlight();

                // 给选中的正文内容添加置灰高亮
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    try {
                        const span = document.createElement('span');
                        span.id = 'ref-highlight-' + Date.now();
                        span.className = 'ref-highlight';
                        span.style.cssText = 'background:rgba(99,102,241,0.15); color:var(--text-muted);';
                        refSpanId = span.id;
                        range.surroundContents(span);
                        // 将光标移到高亮 span 之后，防止后续输入继承高亮样式
                        const afterRange = document.createRange();
                        afterRange.setStartAfter(span);
                        afterRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(afterRange);
                    } catch (err) {
                        // 跨元素选中时 surroundContents 会失败，fallback 不做高亮
                        console.warn('引用高亮失败（跨元素选中）', err);
                    }
                }

                // 存储完整引用，UI显示精简版
                const quoteId = `q${++quoteCounter}`;
                // 防止泄漏：超过50个引用时清理最早的
                if (quoteStore.size > 50) {
                    const firstKey = quoteStore.keys().next().value;
                    quoteStore.delete(firstKey);
                }
                quoteStore.set(quoteId, selText);
                const displayText = selText.length > 30 ? selText.slice(0, 30) + '...' : selText;
                const refText = `@引用：「${displayText}」#${quoteId}\n`;
                const input = workspace.querySelector('#aiChatInput');
                if (input) {
                    const start = input.selectionStart || 0;
                    const end = input.selectionEnd || 0;
                    const before = input.value.substring(0, start);
                    const after = input.value.substring(end);
                    input.value = before + refText + after;
                    input.focus();
                    input.selectionStart = input.selectionEnd = start + refText.length;
                }

                showToast('已引用选中文本', 'success');
            });
        }

        // AI 对话生成态：streaming + AbortController
        let aiChatStreaming = false;
        let aiChatAbortCtrl = null;
        const setAiSendButtonStreaming = (streaming) => {
            aiChatStreaming = streaming;
            if (!chatSend) return;
            if (streaming) {
                chatSend.classList.add('is-streaming');
                chatSend.innerHTML = '<span class="jz-spinner"></span><span style="margin-left:6px;">停止</span>';
                chatSend.title = '点击停止生成';
            } else {
                chatSend.classList.remove('is-streaming');
                chatSend.innerHTML = '发送';
                chatSend.title = '';
            }
        };

        // SSE 流消费器：按行缓冲跨 chunk 安全，同时累积 content / tool_calls delta
        // callbacks: { onContent(deltaText, fullContent), onToolCallDelta(index, toolCall), onFinish(reason) }
        // 返回: { content, toolCalls }
        async function consumeSSEStream(reader, callbacks = {}) {
            const decoder = new TextDecoder();
            let buffer = '';
            const acc = { content: '', toolCallsByIndex: {} };

            const flushLine = (line) => {
                const t = line.trim();
                if (!t || !t.startsWith('data:')) return;
                const data = t.slice(5).trim();
                if (data === '[DONE]') return;
                let parsed;
                try { parsed = JSON.parse(data); } catch { return; }
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) return;
                if (typeof delta.content === 'string' && delta.content) {
                    acc.content += delta.content;
                    try { callbacks.onContent?.(delta.content, acc.content); } catch {}
                }
                if (Array.isArray(delta.tool_calls)) {
                    for (const tcDelta of delta.tool_calls) {
                        const idx = (tcDelta.index ?? 0);
                        if (!acc.toolCallsByIndex[idx]) {
                            acc.toolCallsByIndex[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                        }
                        const tc = acc.toolCallsByIndex[idx];
                        if (tcDelta.id) tc.id = tcDelta.id;
                        if (tcDelta.type) tc.type = tcDelta.type;
                        if (tcDelta.function?.name) tc.function.name += tcDelta.function.name;
                        if (tcDelta.function?.arguments) tc.function.arguments += tcDelta.function.arguments;
                        try { callbacks.onToolCallDelta?.(idx, tc); } catch {}
                    }
                }
                const finish = parsed.choices?.[0]?.finish_reason;
                if (finish) { try { callbacks.onFinish?.(finish); } catch {} }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let nl;
                while ((nl = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, nl);
                    buffer = buffer.slice(nl + 1);
                    flushLine(line);
                }
            }
            if (buffer) flushLine(buffer);

            return {
                content: acc.content,
                toolCalls: Object.values(acc.toolCallsByIndex).filter((tc) => tc.id || tc.function.name),
            };
        }

        // === L2 Agent: 工具调用执行编排 ===

        // 写入类工具：执行前需要用户确认（除非已自动批准）
        const WRITE_TOOLS = new Set([
            'replace_selection',
            'insert_at_cursor',
            'append_paragraph',
            'find_and_replace',
            'goto_chapter',
        ]);

        // sessionStorage：本会话内自动批准的工具列表
        function isAutoApproved(toolName) {
            try {
                const list = JSON.parse(sessionStorage.getItem('jz_auto_approve_tools') || '[]');
                return Array.isArray(list) && list.includes(toolName);
            } catch { return false; }
        }
        function addAutoApprove(toolName) {
            try {
                const list = JSON.parse(sessionStorage.getItem('jz_auto_approve_tools') || '[]');
                const next = Array.isArray(list) ? list : [];
                if (!next.includes(toolName)) next.push(toolName);
                sessionStorage.setItem('jz_auto_approve_tools', JSON.stringify(next));
            } catch {}
        }

        // 工具调用确认对话框（基于 showModal 自定义结构）
        // 返回 Promise<{ approved: boolean, autoApprove: boolean }>
        function showToolConfirmDialog(toolName, args) {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'jz-tool-confirm-overlay';
                let argsPretty = '';
                try { argsPretty = JSON.stringify(args || {}, null, 2); } catch { argsPretty = String(args); }
                // 简单 HTML 转义，防止参数里带 < > 影响渲染
                const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[m]));
                overlay.innerHTML = `
                    <div class="jz-tool-confirm-modal">
                        <div class="jz-tool-confirm-title">AI 想调用工具：<code>${esc(toolName)}</code></div>
                        <div class="jz-tool-confirm-desc">该工具会修改你的编辑器内容，确认后才会执行。</div>
                        <pre class="jz-tool-confirm-args">${esc(argsPretty)}</pre>
                        <label class="jz-tool-confirm-auto">
                            <input type="checkbox" class="jz-tool-auto-cb"> 本会话内自动批准 <code>${esc(toolName)}</code>
                        </label>
                        <div class="jz-tool-confirm-buttons">
                            <button class="jz-tool-btn jz-tool-btn-cancel">拒绝</button>
                            <button class="jz-tool-btn jz-tool-btn-ok">允许执行</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
                const cb = overlay.querySelector('.jz-tool-auto-cb');
                const close = (approved) => {
                    const auto = !!(cb && cb.checked);
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    resolve({ approved, autoApprove: auto });
                };
                overlay.querySelector('.jz-tool-btn-cancel').addEventListener('click', () => close(false));
                overlay.querySelector('.jz-tool-btn-ok').addEventListener('click', () => close(true));
                // ESC 拒绝
                const onEsc = (e) => {
                    if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); close(false); }
                };
                document.addEventListener('keydown', onEsc);
            });
        }

        // 写入类才确认；只读类（get_*）直接放行
        async function maybeConfirmToolCall(toolName, args) {
            if (!WRITE_TOOLS.has(toolName)) return { approved: true, autoApprove: false };
            if (isAutoApproved(toolName)) return { approved: true, autoApprove: false };
            return await showToolConfirmDialog(toolName, args);
        }

        // snake_case → camelCase（get_full_text → getFullText）
        function snakeToCamel(s) {
            return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        }

        // 后端执行工具列表（需要走 POST /api/ai/tools/:name）
        const BACKEND_TOOLS = new Set(['get_characters', 'get_outline']);

        // 执行后端工具（fetch /api/ai/tools/:name）
        async function executeBackendTool(name, args) {
            try {
                const res = await fetch(`${API_BASE}/ai/tools/${name}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                    },
                    body: JSON.stringify({ args: args || {}, workId: currentWorkId }),
                });
                const data = await res.json().catch(() => ({ error: '后端响应解析失败' }));
                if (!res.ok || !data.ok) {
                    return JSON.stringify({ ok: false, error: data.error || '后端工具执行失败' });
                }
                return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
            } catch (err) {
                return JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) });
            }
        }

        // 统一工具执行入口：自动区分 frontend / backend
        async function executeToolCall(name, args) {
            if (BACKEND_TOOLS.has(name)) {
                return await executeBackendTool(name, args);
            }
            const methodName = snakeToCamel(name);
            const fn = window.jzEditor && window.jzEditor[methodName];
            if (typeof fn !== 'function') {
                return JSON.stringify({ error: `未实现的工具: ${name}` });
            }
            try {
                const result = await fn.call(window.jzEditor, args || {});
                if (typeof result === 'string') return result;
                return JSON.stringify(result ?? null);
            } catch (err) {
                return JSON.stringify({ error: err && err.message ? err.message : String(err) });
            }
        }

        // 在 AI 气泡上方/下方插入工具调用 trace（独立兄弟节点，不被流式 textContent 覆盖）
        function ensureToolTraceContainer(aiBubble) {
            if (!aiBubble) return null;
            let trace = aiBubble.querySelector('.ai-tool-trace');
            if (!trace) {
                trace = document.createElement('div');
                trace.className = 'ai-tool-trace';
                const content = aiBubble.querySelector('.ai-msg-content');
                if (content && content.parentNode) {
                    content.parentNode.insertBefore(trace, content);
                } else {
                    aiBubble.appendChild(trace);
                }
            }
            return trace;
        }
        function appendToolTraceLine(aiBubble, text) {
            const trace = ensureToolTraceContainer(aiBubble);
            if (!trace) return;
            const line = document.createElement('div');
            line.className = 'ai-tool-trace-line';
            line.textContent = text;
            trace.appendChild(line);
        }

        // 多轮工具调用循环：发起 /chat → 接 SSE → 若有 tool_calls 则执行后再轮一次，最多 maxRounds 轮
        // 返回最终 AI 文本回复；过程中实时更新 aiContentEl 和 aiBubble.tool-trace
        // 灰度：URL 加 ?agent=1 可切换到 /api/ai/agent-chat（L3 路由层，自动选择模型和工具）
        async function runChatWithTools(initialMessages, baseBody, aiContentEl, aiBubble, signal, maxRounds = 5) {
            const messages = [...initialMessages];
            let totalContent = '';

            const useAgent = new URLSearchParams(location.search).get('agent') === '1';
            const endpoint = useAgent ? `${API_BASE}/ai/agent-chat` : `${API_BASE}/ai/chat`;
            // agent 模式下后端路由决定模型和工具，前端透传 model/tools 无意义
            const filteredBody = useAgent
                ? Object.fromEntries(Object.entries(baseBody).filter(([k]) => k !== 'model' && k !== 'modelId' && k !== 'tools'))
                : baseBody;

            for (let round = 0; round < maxRounds; round++) {
                const body = { ...filteredBody, messages };
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                    },
                    body: JSON.stringify(body),
                    signal,
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: '请求失败' }));
                    throw new Error(err.error || 'AI服务异常');
                }
                const reader = res.body.getReader();
                // 当前轮的 content 累积，叠加到 totalContent 的尾部展示
                const baseShown = totalContent;
                const sseResult = await consumeSSEStream(reader, {
                    onContent: (_d, full) => {
                        if (aiContentEl) aiContentEl.textContent = baseShown + full;
                        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
                    },
                });
                totalContent += sseResult.content || '';

                // 没有 tool_calls：本次回复就是最终输出
                if (!sseResult.toolCalls || sseResult.toolCalls.length === 0) {
                    maybeShowUndoButton(aiBubble);
                    // 最终 assistant 消息也加入 messages，用于持久化
                    if (sseResult.content) {
                        messages.push({ role: 'assistant', content: sseResult.content });
                    }
                    return { content: totalContent, messages };
                }

                // 有 tool_calls：把 assistant 消息（含 tool_calls）push，然后逐个执行工具，结果回灌
                messages.push({
                    role: 'assistant',
                    content: sseResult.content || null,
                    tool_calls: sseResult.toolCalls,
                });

                for (const tc of sseResult.toolCalls) {
                    const argsPreview = (tc.function.arguments || '').slice(0, 80);
                    appendToolTraceLine(aiBubble, `🔧 调用 ${tc.function.name}(${argsPreview})`);
                    let parsedArgs = {};
                    try { parsedArgs = JSON.parse(tc.function.arguments || '{}'); } catch {}

                    // 写入类工具：用户确认（自动批准列表里的直接放行）
                    const confirmResult = await maybeConfirmToolCall(tc.function.name, parsedArgs);
                    if (!confirmResult.approved) {
                        appendToolTraceLine(aiBubble, `↳ ⛔ 用户拒绝执行`);
                        messages.push({
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: JSON.stringify({ ok: false, error: '用户拒绝执行该工具调用' }),
                        });
                        continue;
                    }
                    if (confirmResult.autoApprove) {
                        addAutoApprove(tc.function.name);
                    }

                    const result = await executeToolCall(tc.function.name, parsedArgs);
                    const resultPreview = (result || '').slice(0, 80);
                    appendToolTraceLine(aiBubble, `↳ 结果: ${resultPreview}${result.length > 80 ? '…' : ''}`);
                    messages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: result,
                    });
                }
            }

            // 超过最大轮次
            appendToolTraceLine(aiBubble, '⚠️ 工具调用次数超过上限，已停止');
            maybeShowUndoButton(aiBubble);
            return { content: totalContent, messages };
        }

        // 如果最近一次工具调用有写入快照，在 AI 气泡的 feedback 区追加一个撤销按钮
        function maybeShowUndoButton(aiBubble) {
            if (!aiBubble) return;
            if (!(window.jzEditor && window.jzEditor.hasUndoSnapshot())) return;
            const feedback = aiBubble.querySelector('.msg-feedback');
            if (!feedback) return;
            // 避免重复追加
            if (feedback.querySelector('[data-action="undo-tool"]')) return;
            const btn = document.createElement('button');
            btn.className = 'msg-btn';
            btn.dataset.action = 'undo-tool';
            btn.style.cssText = 'padding:3px 8px; border:none; background:transparent; color:var(--accent); border-radius:4px; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:3px;';
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/></svg>撤销刚才的写入`;
            feedback.appendChild(btn);
        }

        const sendAiMessage = async () => {
            // 已经在生成中：点击 = 终止流
            if (aiChatStreaming) {
                if (aiChatAbortCtrl) {
                    try { aiChatAbortCtrl.abort(); } catch {}
                }
                return;
            }

            const text = chatInput?.value.trim();
            if (!text) {
                showToast('请输入内容', 'warning');
                return;
            }
            if (!chatMessages) return;

            // 解析 @引用格式（支持从quoteStore取完整内容，兼容旧格式）
            let userContent = text;
            let refText = '';
            const refMatch = text.match(/@引用：「[^」]*」(?:#(q\d+))?/);
            if (refMatch) {
                const quoteId = refMatch[1];
                if (quoteId) {
                    refText = quoteStore.get(quoteId) || refMatch[0].match(/「([^」]*)」/)?.[1] || '';
                    quoteStore.delete(quoteId);
                } else {
                    refText = refMatch[0].match(/「([^」]*)」/)?.[1] || '';
                }
                userContent = text.replace(/@引用：「[^」]*」(?:#q\d+)?/, '').trim() + '\n\n【引用内容】\n' + refText;
            }

            // UI 显示时隐藏 #qid 标记
            const displayText = text.replace(/(@引用：「[^」]*」)#q\d+/, '$1');
            chatMessages.appendChild(createUserBubble(displayText));
            chatMessages.scrollTop = chatMessages.scrollHeight;
            chatInput.value = '';
            trackAiUsage();

            // 构建消息历史（按token累计，不超过20K tokens）
            const messages = [
                ...trimHistoryByTokens(aiChatHistory, 20000),
                { role: 'user', content: userContent }
            ];

            // 创建 AI 回复占位
            const aiBubble = createAiBubble('');
            const aiContentEl = aiBubble.querySelector('.ai-msg-content');
            chatMessages.appendChild(aiBubble);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            let fullResponse = '';
            let fullChatMessages = [];
            let aborted = false;
            aiChatAbortCtrl = new AbortController();
            setAiSendButtonStreaming(true);

            try {
                // 构建消息（如果是自定义工具，前端先注入 system prompt）
                let initialMessages = messages;
                if (currentChatTool === 'custom' && currentCustomToolId) {
                    const customTool = getCustomTools().find(t => t.id === currentCustomToolId);
                    if (customTool) {
                        initialMessages = [{ role: 'system', content: customTool.systemPrompt }, ...messages];
                    }
                }

                // 构建 baseBody（每轮 /chat 请求复用，不含 messages 字段）
                const baseBody = currentWorkId ? { workId: Number(currentWorkId) } : {};
                const isSpecializedTool = currentChatTool && currentChatTool !== 'default' && currentChatTool !== 'custom';
                if (isSpecializedTool) {
                    baseBody.tool = currentChatTool;
                }
                if (currentChatStyle && currentChatStyle !== 'standard') {
                    baseBody.style = currentChatStyle;
                }
                baseBody.modelId = getActiveModelId();

                // L2 Agent: 所有模式都启用工具白名单（含专用工具）
                // 专用工具的 system prompt 定义 AI 角色，工具只提供编辑器上下文读写能力
                baseBody.tools = [
                    'get_full_text', 'get_selection', 'get_chapter_list',
                    'replace_selection', 'insert_at_cursor', 'append_paragraph',
                    'find_and_replace', 'get_characters', 'get_outline',
                ];

                const result = await runChatWithTools(
                    initialMessages, baseBody, aiContentEl, aiBubble, aiChatAbortCtrl.signal,
                );
                fullResponse = result.content;
                fullChatMessages = result.messages;

                // 流完成后，将内容格式化为段落（与续写格式统一）
                if (aiContentEl) aiContentEl.innerHTML = formatAiParagraphs(fullResponse);

            } catch (err) {
                if (err && err.name === 'AbortError') {
                    aborted = true;
                    const stopped = (fullResponse || '') + (fullResponse ? '\n\n[已停止]' : '[已停止]');
                    if (aiContentEl) aiContentEl.innerHTML = formatAiParagraphs(stopped);
                    showToast('已停止生成', 'info');
                } else {
                    if (aiContentEl) aiContentEl.textContent = '请求失败: ' + err.message;
                }
            } finally {
                aiChatAbortCtrl = null;
                setAiSendButtonStreaming(false);
            }

            // 保存到历史（含 tool_calls 和 tool 结果，空内容不保存）
            const savedAssistant = aborted ? (fullResponse ? fullResponse + '\n\n[已停止]' : '') : fullResponse;
            if (savedAssistant) {
                // 用完整 messages 替换简单的 user+assistant，保留工具调用过程
                const historyMsgs = fullChatMessages.length > 0
                    ? fullChatMessages.filter(m => m.role !== 'system')
                    : [{ role: 'user', content: text }, { role: 'assistant', content: savedAssistant }];
                aiChatHistory.push(...historyMsgs);
                // 按token限制存储历史（保留最近100K tokens）
                aiChatHistory = trimHistoryByTokens(aiChatHistory, 100000);
            }
            if (currentWorkId) {
                api('/ai/conversations', {
                    method: 'POST',
                    body: { workId: Number(currentWorkId), messages: aiChatHistory }
                }).catch(() => {});
            }
        };

        // 重新生成消息
        async function regenerateMessage(contextMessages, msgIndex, contentEl, signal) {
            let fullResponse = '';
            try {
                const baseBody = currentWorkId ? { workId: Number(currentWorkId) } : {};
                const isSpecializedTool = currentChatTool && currentChatTool !== 'default' && currentChatTool !== 'custom';
                if (isSpecializedTool) {
                    baseBody.tool = currentChatTool;
                }
                if (currentChatStyle && currentChatStyle !== 'standard') {
                    baseBody.style = currentChatStyle;
                }
                baseBody.modelId = getActiveModelId();
                baseBody.tools = [
                    'get_full_text', 'get_selection', 'get_chapter_list',
                    'replace_selection', 'insert_at_cursor', 'append_paragraph',
                    'find_and_replace', 'get_characters', 'get_outline',
                ];

                const aiBubble = contentEl?.closest('.ai-msg-bubble') || null;
                const result = await runChatWithTools(
                    contextMessages, baseBody, contentEl, aiBubble, signal,
                );
                fullResponse = result.content;

                // 流完成后格式化段落
                if (contentEl) contentEl.innerHTML = formatAiParagraphs(fullResponse);

                // 更新历史记录：替换该位置及之后的消息为新的完整 messages
                const newMsgs = result.messages.filter(m => m.role !== 'system');
                aiChatHistory.splice(msgIndex, aiChatHistory.length - msgIndex, ...newMsgs);

                // 按token限制存储历史（保留最近100K tokens）
                aiChatHistory = trimHistoryByTokens(aiChatHistory, 100000);

                // 异步保存到后端
                if (currentWorkId) {
                    api('/ai/conversations', {
                        method: 'POST',
                        body: { workId: Number(currentWorkId), messages: aiChatHistory }
                    }).catch(() => {});
                }

            } catch (err) {
                if (err && err.name === 'AbortError') {
                    const stopped = (fullResponse || '') + (fullResponse ? '\n\n[已停止]' : '[已停止]');
                    if (contentEl) contentEl.innerHTML = formatAiParagraphs(stopped);
                    showToast('已停止重新生成', 'info');
                } else {
                    if (contentEl) contentEl.textContent = '重新生成失败: ' + err.message;
                }
            }
        }

        if (chatSend) {
            console.log('[九章 Debug] chatSend 按钮已绑定点击事件');
            chatSend.addEventListener('click', () => {
                console.log('[九章 Debug] 点击了发送按钮');
                sendAiMessage();
            });
        } else {
            console.error('[九章 Debug] 未找到 chatSend 按钮');
        }
        if (chatInput) {
            console.log('[九章 Debug] chatInput 已绑定回车事件');
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (aiChatStreaming) {
                        showToast('正在生成中，请稍候或点击停止', 'info');
                        return;
                    }
                    console.log('[九章 Debug] 按下了回车发送');
                    sendAiMessage();
                }
            });
        } else {
            console.error('[九章 Debug] 未找到 chatInput 输入框');
        }

        // 右栏滚动独立：防止滚动事件带动页面
        const rightCol = document.getElementById('writeColRight');
        if (rightCol) {
            // 确保右栏可以独立滚动
            rightCol.style.overflowY = 'auto';

            // 阻止滚动事件冒泡到页面
            rightCol.addEventListener('wheel', (e) => {
                const atTop = rightCol.scrollTop === 0;
                const atBottom = rightCol.scrollTop + rightCol.clientHeight >= rightCol.scrollHeight;
                const scrollingDown = e.deltaY > 0;
                const scrollingUp = e.deltaY < 0;

                // 只有在右栏滚动到顶部或底部时，才考虑是否阻止冒泡
                // 如果还能继续向同方向滚动，阻止冒泡
                if ((scrollingDown && !atBottom) || (scrollingUp && !atTop)) {
                    e.stopPropagation();
                }
            }, { passive: true });
        }

        // 输入框底部拖拽：调整 textarea 高度
        const resizeHandle = document.getElementById('chatInputResizeHandle');
        const aiChatInput = document.getElementById('aiChatInput');
        if (resizeHandle && aiChatInput) {
            let startY = 0;
            let startH = 0;

            resizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startH = aiChatInput.offsetHeight;
                startY = e.clientY;
                document.body.style.cursor = 'ns-resize';
                document.body.style.userSelect = 'none';
                const indicator = resizeHandle.querySelector('.resize-indicator');
                if (indicator) indicator.style.background = 'var(--accent)';
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            function onMove(e) {
                e.preventDefault();
                const dy = startY - e.clientY; // 向上拖动 dy>0，输入框变高
                const minH = 60;
                const h = Math.max(minH, startH + dy);
                aiChatInput.style.height = h + 'px';
            }

            function onUp() {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                const indicator = resizeHandle.querySelector('.resize-indicator');
                if (indicator) indicator.style.background = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }
        }

        // ========== 斜杠命令 ==========

        let SLASH_TOOLS = getAllSlashTools();
        let slashDropdown = null;
        let slashSelectedIndex = -1;
        let slashFilteredTools = [];

        function createSlashDropdown() {
            const dropdown = document.createElement('div');
            dropdown.id = 'slashDropdown';
            dropdown.style.cssText = `
                position: absolute; z-index: 1001;
                background: var(--surface); border: 1px solid var(--border);
                border-radius: var(--radius-sm); box-shadow: var(--shadow);
                max-height: 280px; overflow-y: auto; width: 200px;
                font-size: 13px; display: none;
            `;
            return dropdown;
        }

        function showSlashDropdown(input, filter = '') {
            slashFilteredTools = SLASH_TOOLS.filter(t =>
                t.name.includes(filter) || t.key.includes(filter)
            );
            if (slashFilteredTools.length === 0) {
                hideSlashDropdown();
                return;
            }

            if (!slashDropdown) {
                slashDropdown = createSlashDropdown();
                document.body.appendChild(slashDropdown);
            }

            const rect = input.getBoundingClientRect();
            slashDropdown.style.left = rect.left + 'px';
            slashDropdown.style.top = (rect.bottom + 4) + 'px';
            slashDropdown.style.display = 'block';

            slashDropdown.innerHTML = slashFilteredTools.map((t, i) => `
                <div class="slash-item" data-index="${i}" style="
                    padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;
                    ${i === 0 ? 'background: var(--bg-hover);' : ''}
                " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='${i === slashSelectedIndex ? 'var(--bg-hover)' : 'transparent'}'">
                    <span style="font-size: 14px;">${t.icon}</span>
                    <span style="color: var(--text-primary); flex: 1;">${t.name}</span>
                    ${t.needSelection ? '<span style="font-size: 11px; color: var(--text-muted);">需选中文本</span>' : ''}
                </div>
            `).join('');

            slashSelectedIndex = 0;
            updateSlashSelection();

            slashDropdown.querySelectorAll('.slash-item').forEach((item, i) => {
                item.addEventListener('click', () => selectSlashTool(i));
            });
        }

        function updateSlashSelection() {
            if (!slashDropdown) return;
            slashDropdown.querySelectorAll('.slash-item').forEach((item, i) => {
                item.style.background = i === slashSelectedIndex ? 'var(--bg-hover)' : 'transparent';
            });
        }

        function hideSlashDropdown() {
            if (slashDropdown) slashDropdown.style.display = 'none';
            slashSelectedIndex = -1;
        }

        currentCustomToolId = null;

        function selectSlashTool(index) {
            const tool = slashFilteredTools[index];
            if (!tool) return;
            hideSlashDropdown();

            if (tool.isCustom) {
                chatInput.value = `[${tool.name}] `;
                chatInput.focus();
                currentChatTool = 'custom';
                currentCustomToolId = tool.customId;
                return;
            }

            currentChatTool = tool.key;
            currentCustomToolId = null;

            if (tool.needSelection) {
                const editorArea = document.getElementById('editorArea');
                const sel = window.getSelection()?.toString().trim();
                if (!sel || (editorArea && !editorArea.contains(window.getSelection().anchorNode))) {
                    showToast(`「${tool.name}」需要先在编辑器中选中文本`, 'warning');
                    chatInput.value = '';
                    return;
                }
                chatInput.value = '';
                runAiTool(tool.key, false);
                return;
            }

            chatInput.value = `请帮我使用「${tool.name}」`;
            chatInput.focus();
        }

        if (chatInput) {
            chatInput.addEventListener('input', () => {
                const val = chatInput.value;
                if (val.startsWith('/')) {
                    const filter = val.slice(1);
                    showSlashDropdown(chatInput, filter);
                } else {
                    hideSlashDropdown();
                }
                // 根据输入内容自动匹配并切换工具
                autoMatchToolFromInput(val);
            });

            chatInput.addEventListener('keydown', (e) => {
                if (slashDropdown && slashDropdown.style.display === 'block') {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        slashSelectedIndex = (slashSelectedIndex + 1) % slashFilteredTools.length;
                        updateSlashSelection();
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        slashSelectedIndex = (slashSelectedIndex - 1 + slashFilteredTools.length) % slashFilteredTools.length;
                        updateSlashSelection();
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        selectSlashTool(slashSelectedIndex);
                    } else if (e.key === 'Escape') {
                        hideSlashDropdown();
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (slashDropdown && !slashDropdown.contains(e.target) && e.target !== chatInput) {
                    hideSlashDropdown();
                }
            });
        }

        // 细纲输入监听字数
        const outlineInputEl = workspace.querySelector('#chapterOutlineInput');
        if (outlineInputEl) {
            outlineInputEl.addEventListener('input', updateOutlineWordCount);
        }

        // 章节拖拽排序
        const chapterListEl = document.getElementById('chapterList');
        if (chapterListEl) {
            let draggedId = null;

            chapterListEl.addEventListener('dragstart', (e) => {
                const item = e.target.closest('.chapter-tree-item');
                if (!item) return;
                draggedId = parseInt(item.dataset.chapterId);
                item.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            });

            chapterListEl.addEventListener('dragend', (e) => {
                const item = e.target.closest('.chapter-tree-item');
                if (item) item.style.opacity = '';
                draggedId = null;
                document.querySelectorAll('.chapter-tree-item').forEach(el => {
                    el.style.borderBottom = '';
                });
            });

            chapterListEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.target.closest('.chapter-tree-item');
                if (!target || !draggedId) return;

                const targetId = parseInt(target.dataset.chapterId);
                if (targetId === draggedId) return;

                const rect = target.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const after = e.clientY > midY;

                document.querySelectorAll('.chapter-tree-item').forEach(el => {
                    el.style.borderBottom = '';
                });
                target.style.borderBottom = after
                    ? '2px solid var(--accent)'
                    : '';
            });

            chapterListEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                const target = e.target.closest('.chapter-tree-item');
                if (!target || !draggedId) return;

                const targetId = parseInt(target.dataset.chapterId);
                if (targetId === draggedId) return;

                const items = Array.from(chapterListEl.querySelectorAll('.chapter-tree-item'));
                const fromIndex = items.findIndex(el => parseInt(el.dataset.chapterId) === draggedId);
                const toIndex = items.findIndex(el => parseInt(el.dataset.chapterId) === targetId);

                if (fromIndex === -1 || toIndex === -1) return;

                const rect = target.getBoundingClientRect();
                const after = e.clientY > rect.top + rect.height / 2;
                const newIndex = after ? toIndex + 1 : toIndex;

                // 移动 DOM
                const draggedEl = items[fromIndex];
                if (newIndex >= items.length) {
                    chapterListEl.appendChild(draggedEl);
                } else {
                    const refEl = items[newIndex > fromIndex ? newIndex : newIndex];
                    if (refEl === draggedEl) {
                        // 不需要移动
                    } else if (newIndex > fromIndex) {
                        refEl.parentNode.insertBefore(draggedEl, refEl.nextSibling);
                    } else {
                        refEl.parentNode.insertBefore(draggedEl, refEl);
                    }
                }

                // 调用后端更新顺序
                const newOrder = Array.from(chapterListEl.querySelectorAll('.chapter-tree-item'))
                    .map(el => parseInt(el.dataset.chapterId));

                try {
                    await api(`/works/${currentWorkId}/chapters/reorder`, {
                        method: 'PUT',
                        body: { ids: newOrder }
                    });
                    showToast('排序已保存', 'success');
                } catch (err) {
                    showToast('排序保存失败', 'danger');
                }

                document.querySelectorAll('.chapter-tree-item').forEach(el => {
                    el.style.borderBottom = '';
                });
            });
        }

        // 三栏拖拽调整宽度
        const leftCol = document.getElementById('writeColLeft');

        workspace.querySelectorAll('.resize-handle').forEach(handle => {
            const line = handle.querySelector('div');
            handle.addEventListener('mouseenter', () => { if(line) line.style.opacity = '1'; });
            handle.addEventListener('mouseleave', () => { if(line) line.style.opacity = '0'; });

            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const isLeft = handle.dataset.resize === 'left';
                const targetCol = isLeft ? leftCol : rightCol;
                if (!targetCol) return;

                const startX = e.clientX;
                const startW = targetCol.offsetWidth;
                const minW = 180;
                const maxW = 500;

                const onMove = (ev) => {
                    const dx = isLeft ? ev.clientX - startX : startX - ev.clientX;
                    const newW = Math.max(minW, Math.min(maxW, startW + dx));
                    targetCol.style.width = newW + 'px';
                    targetCol.style.flexShrink = '0';
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                };

                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    }

    if (page === 'ai-tools') {
        renderToolLibrary();

        // 复制按钮
        const copyBtn = document.getElementById('aiToolCopy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const text = document.getElementById('aiToolResultContent')?.textContent;
                if (text) navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success'));
            });
        }

        // 重新生成按钮
        const retryBtn = document.getElementById('aiToolRetry');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => retryAiTool());
        }
    }

    if (page === 'inspiration') {
        // 灵感卡片操作按钮
        contentArea.querySelectorAll('.card').forEach(card => {
            const insertBtn = card.querySelector('button[title="插入到作品"]');
            const favBtn = card.querySelector('button[title="收藏"]');
            if (insertBtn) {
                insertBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showToast('已插入到当前作品草稿', 'success');
                });
            }
            if (favBtn) {
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const svg = favBtn.querySelector('svg');
                    if (svg) svg.style.fill = svg.style.fill ? '' : 'var(--accent)';
                    showToast(svg?.style.fill ? '已收藏' : '取消收藏', 'info');
                });
            }
        });
    }

    if (page === 'workflow') {
        // 工作流节点点击
        contentArea.querySelectorAll('.workflow-node').forEach(node => {
            node.addEventListener('click', () => {
                const title = node.querySelector('.workflow-title')?.textContent.trim();
                showToast(`节点「${title}」配置详情`, 'info');
            });
        });
    }

    if (page === 'trends') {
        // 热文排行点击
        contentArea.querySelectorAll('.rank-item').forEach(item => {
            item.addEventListener('click', () => {
                const title = item.querySelector('.rank-title')?.textContent.trim();
                showModal(title, `
                    <p><strong>书名：</strong>${title}</p>
                    <p style="margin-top:8px;"><strong>类型：</strong>${item.querySelector('.rank-meta')?.textContent.trim()}</p>
                    <p style="margin-top:8px;"><strong>热度：</strong>${item.querySelector('.rank-heat')?.textContent.trim()}</p>
                    <p style="margin-top:12px; color:var(--text-muted);">点击「参考设定」可将此书的标签应用到你的作品中。</p>
                    <button class="btn btn-primary" style="margin-top:12px;" onclick="showToast('设定已应用到当前作品', 'success'); this.closest('.jz-modal-overlay').remove();">参考设定</button>
                `);
            });
        });
    }

    if (page === 'center') {
        // AI辅助建议卡片
        contentArea.querySelectorAll('.card .btn-primary').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showToast('AI 正在分析并生成建议...', 'info');
                setTimeout(() => showToast('生成完成，已插入到编辑器', 'success'), 2000);
            });
        });
    }
}

// ========== 反馈埋点 ==========
function trackFeedback(type) {
    const btn = type === 'like' ? document.getElementById('btnLike') : document.getElementById('btnDislike');
    const countSpan = btn?.querySelector('span');
    if (countSpan) {
        const current = parseInt(countSpan.textContent) || 0;
        const isActive = btn.style.background === 'var(--bg-active)';
        if (isActive) {
            btn.style.background = '';
            btn.style.borderColor = 'var(--border)';
            countSpan.textContent = String(current - 1);
            showToast(`已取消${type === 'like' ? '点赞' : '点踩'}`, 'info');
        } else {
            btn.style.background = 'var(--bg-active)';
            btn.style.borderColor = type === 'like' ? 'var(--success)' : 'var(--danger)';
            countSpan.textContent = String(current + 1);
            showToast(`${type === 'like' ? '点赞' : '点踩'}已记录，感谢反馈！`, 'success');
        }
    }
    console.log('[埋点]', { event: 'chapter_feedback', type, chapterId: 127, timestamp: new Date().toISOString() });
}

// ========== 作品列表加载 ==========
let worksSearchTimer = null;

function debounceSearchWorks(keyword) {
    if (worksSearchTimer) clearTimeout(worksSearchTimer);
    worksSearchTimer = setTimeout(() => {
        reloadWorksCurrentView(keyword);
    }, 300);
}

let worksCurrentView = 'works';

function getWorksStatusForView(view) {
    const statusByView = {
        serial: 'unfinished',
        finished: 'finished',
        draft: 'reviewing',
    };
    return statusByView[view] || '';
}

function reloadWorksCurrentView(search = document.getElementById('worksSearchInput')?.value?.trim() || '') {
    if (worksCurrentView === 'trash') {
        return loadWorksTrash();
    }
    if (worksCurrentView === 'analysis') {
        return loadWorksList(search, 'analysis');
    }
    return loadWorksList(search, '', getWorksStatusForView(worksCurrentView));
}

function switchWorksView(view, btn) {
    worksCurrentView = view;
    document.querySelectorAll('#worksPageTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const normalToolbar = document.getElementById('worksNormalToolbar');
    const trashToolbar = document.getElementById('worksTrashToolbar');

    if (view === 'trash') {
        if (normalToolbar) normalToolbar.style.display = 'none';
        if (trashToolbar) trashToolbar.style.display = 'flex';
        loadWorksTrash();
    } else if (view === 'analysis') {
        if (normalToolbar) normalToolbar.style.display = 'flex';
        if (trashToolbar) trashToolbar.style.display = 'none';
        reloadWorksCurrentView();
    } else {
        if (normalToolbar) normalToolbar.style.display = 'flex';
        if (trashToolbar) trashToolbar.style.display = 'none';
        reloadWorksCurrentView();
    }
}

async function loadWorksTrash() {
    const grid = document.getElementById('worksGrid');
    if (!grid) return;
    try {
        const list = await api('/works/trash');
        if (!list || list.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                    <div style="font-size:32px; margin-bottom:12px;">🗑️</div>
                    <div style="font-size:15px;">回收站是空的</div>
                </div>
            `;
            return;
        }

        const statusMap = { unfinished: '连载中', finished: '已完结', reviewing: '审核中' };
        grid.innerHTML = list.map(w => `
            <div class="card" style="padding:0; overflow:hidden; opacity:0.7;" data-trash-id="${w.id}">
                <div style="height:140px; background: linear-gradient(${w.gradient || '135deg, #1e3a5f, #0f2744'}); display:flex; align-items:center; justify-content:center; font-size:48px;">${w.emoji || '📖'}</div>
                <div style="padding:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                        <span class="list-badge badge-draft">${statusMap[w.status] || w.status}</span>
                        <input type="checkbox" class="trash-checkbox" data-id="${w.id}" style="accent-color:var(--accent);">
                    </div>
                    <div style="font-size:16px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">${w.title}</div>
                    <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:12px;">${w.genre} · ${w.words} · ${w.chapters}章 · 删除于 ${formatTimeAgo(w.deletedAt)}</div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="restoreWork(${w.id})">↩ 恢复</button>
                        <button class="btn btn-ghost btn-sm" style="flex:1; color:var(--danger);" onclick="permanentDeleteWork(${w.id}, '${w.title.replace(/'/g, "\\'")}')">🗑 彻底删除</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--danger);">加载失败: ${err.message}</div>`;
    }
}

async function batchRestoreWorks() {
    const checked = document.querySelectorAll('.trash-checkbox:checked');
    if (checked.length === 0) { showToast('请先选中要恢复的作品', 'warning'); return; }
    const ids = Array.from(checked).map(cb => parseInt(cb.dataset.id));
    for (const id of ids) {
        try { await api(`/works/${id}/restore`, { method: 'POST' }); } catch (e) {}
    }
    showToast(`已恢复 ${ids.length} 个作品`, 'success');
    loadWorksTrash();
}

async function batchDeleteWorks() {
    const checked = document.querySelectorAll('.trash-checkbox:checked');
    if (checked.length === 0) { showToast('请先选中要删除的作品', 'warning'); return; }
    if (!confirm(`确定要彻底删除选中的 ${checked.length} 个作品吗？此操作不可恢复。`)) return;
    const ids = Array.from(checked).map(cb => parseInt(cb.dataset.id));
    for (const id of ids) {
        try { await api(`/works/${id}/permanent`, { method: 'DELETE' }); } catch (e) {}
    }
    showToast(`已彻底删除 ${ids.length} 个作品`, 'success');
    await loadWorksTrash();
    loadTrashList();
}

async function clearAllTrash() {
    try {
        const list = await api('/works/trash');
        if (!list || list.length === 0) { showToast('回收站已经是空的', 'info'); return; }
        if (!confirm(`确定要清空回收站吗？共 ${list.length} 个作品将被彻底删除，不可恢复。`)) return;
        for (const w of list) {
            try { await api(`/works/${w.id}/permanent`, { method: 'DELETE' }); } catch (e) {}
        }
        showToast('回收站已清空', 'success');
        // 根据当前所在视图刷新对应列表，避免竞态覆盖
        const isTrashView = document.getElementById('worksTrashToolbar')?.style.display === 'flex';
        if (isTrashView) {
            await loadWorksTrash();
        } else {
            await loadWorksList();
        }
        loadTrashList();
    } catch (err) {
        showToast('清空失败: ' + err.message, 'error');
    }
}

async function loadWorksList(search = '', source = '', status = '') {
    const grid = document.getElementById('worksGrid');
    if (!grid) return;
    try {
        const query = new URLSearchParams();
        if (search) query.set('search', search);
        if (source) query.set('source', source);
        if (status) query.set('status', status);
        const url = '/works' + (query.toString() ? '?' + query.toString() : '');
        const list = await api(url);
        if (!list || list.length === 0) {
            if (search) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                        <div style="font-size:32px; margin-bottom:12px;">🔍</div>
                        <div style="font-size:15px; margin-bottom:8px;">未找到「${search}」相关的作品</div>
                    </div>
                `;
            } else if (source === 'analysis') {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                        <div style="font-size:32px; margin-bottom:12px;">📖</div>
                        <div style="font-size:15px; margin-bottom:8px;">还没有拆书作品</div>
                        <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">上传文件拆书或从热文赛道收藏拆书分析</div>
                        <button class="btn btn-primary" onclick="openBookAnalysisDialog()" style="padding:10px 24px; font-size:14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom; margin-right:4px;">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            上传文件拆书
                        </button>
                    </div>
                `;
            } else if (status) {
                const emptyLabel = worksCurrentView === 'serial' ? '连载中的作品' : worksCurrentView === 'finished' ? '已完结作品' : '审核中的作品';
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                        <div style="font-size:32px; margin-bottom:12px;">📭</div>
                        <div style="font-size:15px; margin-bottom:8px;">暂无${emptyLabel}</div>
                    </div>
                `;
            } else {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                        <div style="font-size:32px; margin-bottom:12px;">📚</div>
                        <div style="font-size:15px; margin-bottom:8px;">还没有作品</div>
                        <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">开始创作你的第一部作品吧</div>
                        <button class="btn btn-primary" onclick="showCreateWorkModal()" style="padding:10px 24px; font-size:14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-bottom; margin-right:4px;">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            新建作品
                        </button>
                    </div>
                `;
            }
            return;
        }

        let html = '';
        list.forEach(w => {
            const statusMap = { unfinished: '连载中', finished: '已完结', reviewing: '审核中' };
            const isAnalysis = w.source === 'analysis';
            const badgeClass = w.status === 'finished' ? 'badge-published' : w.status === 'reviewing' ? 'badge-review' : 'badge-draft';
            const analysisBadge = isAnalysis ? `<span class="list-badge" style="background:var(--warning-soft, rgba(245,158,11,0.15)); color:var(--warning, #f59e0b); margin-right:4px;">拆书</span>` : '';
            const safeTitle = escapeHtml(w.title || '未命名作品');
            const safeGenre = escapeHtml(w.genre || '未分类');
            const safeLastUpdate = escapeHtml(w.lastUpdate || '刚刚');
            const safeWords = escapeHtml(w.words || '0字');
            const safeTitleAttr = escapeAttr(w.title || '未命名作品');
            const workTitleArg = escapeAttr(JSON.stringify(w.title || ''));
            const mainBtn = isAnalysis
                ? `<button class="btn btn-primary btn-sm" style="flex:1;" data-work-id="${w.id}" onclick="viewAnalysisWork(${w.id})">查看拆书</button>`
                : `<button class="btn btn-primary btn-sm" style="flex:1;" data-work-id="${w.id}" onclick="enterWriting(${w.id})">继续写作</button>`;
            html += `
                <div class="card work-card">
                    <div class="work-cover" style="background: linear-gradient(${w.gradient || '135deg, #1e3a5f, #0f2744'});">${w.emoji || '📖'}</div>
                    <div class="work-card-body">
                        <div class="work-card-top">
                            <div style="display:flex; align-items:center;">${analysisBadge}<span class="list-badge ${badgeClass}">${statusMap[w.status] || w.status}</span></div>
                            <span style="font-size:12px; color:var(--text-muted);">${safeGenre}</span>
                        </div>
                        <div class="work-card-title" title="${safeTitleAttr}">${safeTitle}</div>
                        <div class="work-card-meta">${isAnalysis ? '拆书分析' : `第${w.chapters || 0}章 · ${safeWords}`} · ${safeLastUpdate}</div>
                        <div class="work-card-actions-row">
                            ${mainBtn}
                            <button class="btn btn-ghost btn-sm work-menu-btn" data-work="${safeTitleAttr}" style="padding:4px 10px; font-size:16px;" onclick="event.stopPropagation(); showWorkMenu(this, ${workTitleArg}, ${w.id})">⋯</button>
                        </div>
                    </div>
                </div>
            `;
        });
        // 添加创建卡片（拆书tab不显示创建卡片）
        if (source !== 'analysis') {
            html += `
                <div class="card work-card create-work-card" onclick="showCreateWorkModal()">
                    <div class="work-cover">+</div>
                    <div class="work-card-body" style="text-align:center; justify-content:center;">
                        <div style="font-size:15px; font-weight:500; color:var(--text-secondary);">创建新作品</div>
                        <div style="font-size:12px; color:var(--text-tertiary); margin-top:4px;">开始你的新故事</div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--danger);">加载失败: ${err.message}</div>`;
    }
}

// ========== 概览页统计 ==========
async function loadDashboardStats() {
    try {
        const stats = await api('/stats');

        // 作品数量
        const workCountEl = document.getElementById('statWorkCount');
        if (workCountEl) workCountEl.textContent = stats.workCount || 0;

        // 总字数
        const totalWordsEl = document.getElementById('statTotalWords');
        if (totalWordsEl) {
            const words = stats.totalWords || 0;
            totalWordsEl.textContent = words >= 10000 ? (words / 10000).toFixed(1) + '万' : words.toString();
        }

        // 总章节数
        const totalChaptersEl = document.getElementById('statTotalChapters');
        if (totalChaptersEl) {
            totalChaptersEl.textContent = (stats.totalChapters || 0).toString();
        }

        // AI 辅助次数（本地粗略统计）
        const aiCountEl = document.getElementById('statAiCount');
        if (aiCountEl) {
            const aiCount = parseInt(localStorage.getItem('jz_ai_count') || '0');
            aiCountEl.textContent = aiCount.toString();
        }

        // 最近编辑列表
        const recentListEl = document.getElementById('recentWorksList');
        if (recentListEl && stats.recentWorks) {
            if (stats.recentWorks.length === 0) {
                recentListEl.innerHTML = `
                    <div class="list-item">
                        <div class="list-content">
                            <div class="list-meta" style="color:var(--text-muted);">暂无作品，点击「我的作品」开始创作</div>
                        </div>
                    </div>
                `;
            } else {
                const statusMap = { unfinished: '连载中', finished: '已完结', reviewing: '审核中' };
                const statusClass = { unfinished: 'badge-draft', finished: 'badge-published', reviewing: 'badge-review' };
                recentListEl.innerHTML = stats.recentWorks.map(w => `
                    <div class="list-item" style="cursor:pointer;" onclick="enterWriting(${w.id})">
                        <div class="list-icon">📖</div>
                        <div class="list-content">
                            <div class="list-title">${w.title}</div>
                            <div class="list-meta">${w.genre} · ${formatTimeAgo(w.updatedAt)}</div>
                        </div>
                        <span class="list-badge ${statusClass[w.status] || 'badge-draft'}">${statusMap[w.status] || w.status}</span>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.log('统计加载失败:', err.message);
    }
}

async function loadProfileStats() {
    try {
        const stats = await api('/stats');

        const workCountEl = document.getElementById('profileWorkCount');
        if (workCountEl) workCountEl.textContent = stats.workCount || 0;

        const totalWordsEl = document.getElementById('profileTotalWords');
        if (totalWordsEl) {
            const words = stats.totalWords || 0;
            totalWordsEl.textContent = words >= 10000 ? (words / 10000).toFixed(1) + '万' : words.toString();
        }

        const consecutiveDaysEl = document.getElementById('profileConsecutiveDays');
        if (consecutiveDaysEl) consecutiveDaysEl.textContent = stats.consecutiveDays || 0;

        const todayWordsEl = document.getElementById('profileTodayWords');
        if (todayWordsEl) {
            const tw = stats.todayWords || 0;
            todayWordsEl.textContent = tw >= 10000 ? (tw / 10000).toFixed(1) + '万' : tw.toString();
        }

        const weekStreakEl = document.getElementById('profileWeekStreak');
        if (weekStreakEl && stats.last7Days) {
            weekStreakEl.innerHTML = stats.last7Days.map(d => {
                const dateLabel = new Date(d.date).getDate() + '日';
                const activeColor = 'var(--success)';
                const inactiveColor = 'var(--bg-tertiary)';
                const borderColor = d.hasWriting ? activeColor : 'var(--border)';
                const bgColor = d.hasWriting ? 'rgba(34,197,94,0.12)' : inactiveColor;
                return `<div title="${d.date}${d.hasWriting ? ' 已写作' : ' 未写作'}" style="flex:1;height:32px;border-radius:var(--radius-sm);background:${bgColor};border:1px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-size:11px;color:${d.hasWriting ? 'var(--success)' : 'var(--text-muted)'};">${dateLabel}</div>`;
            }).join('');
        }

        // 同步更新 currentUser 缓存中的作品数
        if (currentUser && stats.workCount !== undefined) {
            currentUser.workCount = stats.workCount;
        }
    } catch (err) {
        console.log('个人统计加载失败:', err.message);
    }
}

function trackAiUsage() {
    const count = parseInt(localStorage.getItem('jz_ai_count') || '0');
    localStorage.setItem('jz_ai_count', (count + 1).toString());
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '未知时间';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return `${Math.floor(days / 30)}个月前`;
}

// ========== 回收站 ==========
async function loadTrashList() {
    const container = document.getElementById('trashList');
    const titleEl = document.getElementById('trashTitle');
    const subtitleEl = document.getElementById('trashSubtitle');
    if (!container) return;

    try {
        const list = await api('/works/trash');

        if (titleEl) titleEl.textContent = `回收站 (${list.length})`;

        if (list.length === 0) {
            container.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">
                    <div style="font-size:32px; margin-bottom:12px;">🗑️</div>
                    <div style="font-size:14px;">回收站是空的</div>
                </div>
            `;
            if (subtitleEl) subtitleEl.textContent = '没有已删除的作品';
            return;
        }

        if (subtitleEl) subtitleEl.textContent = `共 ${list.length} 个已删除的作品`;

        const statusMap = { unfinished: '连载中', finished: '已完结', reviewing: '审核中' };
        container.innerHTML = list.map(w => `
            <div class="card" style="padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">${w.title}</div>
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">${w.genre} · ${statusMap[w.status] || w.status}</div>
                    <div style="font-size:12px; color:var(--text-tertiary);">${w.words} · ${w.chapters}章 · 删除于 ${formatTimeAgo(w.deletedAt)}</div>
                </div>
                <div style="display:flex; gap:8px; margin-top:16px;">
                    <button class="btn btn-primary btn-sm" style="flex:1;" onclick="restoreWork(${w.id})">↩ 恢复</button>
                    <button class="btn btn-ghost btn-sm" style="flex:1; color:var(--danger);" onclick="permanentDeleteWork(${w.id}, '${w.title.replace(/'/g, "\\'")}')">🗑 彻底删除</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--danger);">
                加载失败: ${err.message}
            </div>
        `;
    }
}

async function restoreWork(workId) {
    if (!workId) return;
    try {
        await api(`/works/${workId}/restore`, { method: 'POST' });
        showToast('作品已恢复', 'success');
        // 根据当前视图刷新，避免 loadWorksList 覆盖回收站视图
        const isTrashView = document.getElementById('worksTrashToolbar')?.style.display === 'flex';
        if (isTrashView) {
            await loadWorksTrash();
        } else {
            await loadWorksList();
        }
        loadTrashList();
    } catch (err) {
        showToast('恢复失败: ' + err.message, 'danger');
    }
}

async function permanentDeleteWork(workId, workTitle) {
    if (!workId) return;
    showModal('彻底删除', `
        <p>确定要彻底删除「${workTitle}」吗？</p>
        <p style="color:var(--danger); font-size:13px; margin-top:8px;">此操作不可恢复，所有章节数据将被永久删除。</p>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" style="background:var(--danger);" onclick="executePermanentDelete(${workId})">确认删除</button>
        </div>
    `);
}

async function executePermanentDelete(workId) {
    try {
        await api(`/works/${workId}/permanent`, { method: 'DELETE' });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('作品已彻底删除', 'success');
        // 根据当前视图刷新，避免竞态覆盖
        const isTrashView = document.getElementById('worksTrashToolbar')?.style.display === 'flex';
        if (isTrashView) {
            await loadWorksTrash();
        } else {
            await loadWorksList();
        }
        loadTrashList();
    } catch (err) {
        showToast('删除失败: ' + err.message, 'danger');
    }
}

// 进入写作页
function enterWriting(workId) {
    currentWorkId = workId;
    currentChapterId = null;
    switchPage('writing');
}

function viewAnalysisWork(workId) {
    currentWorkId = workId;
    currentChapterId = null;
    switchPage('writing');
    // 切换到 AI 分析 tab
    setTimeout(() => {
        switchLeftTab('analysis');
    }, 300);
}

// 创建作品弹窗（保留入口，直接进作品详情页）
function showCreateWorkModal() {
    enterWorkDetail('create');
}

// 进入作品详情页（mode: 'create' | 'edit'）
async function enterWorkDetail(mode, workId = null) {
    workDetailState.mode = mode;
    workDetailState.workId = workId;
    if (mode === 'edit' && workId) {
        try {
            const work = await api(`/works/${workId}`);
            workDetailState.title = work.title || '';
            workDetailState.perspective = work.perspective || 'third';
            workDetailState.channel = work.channel || 'male';
            workDetailState.tags = Array.isArray(work.tags) ? work.tags.slice(0, 2) : [];
            workDetailState.intro = work.intro || '';
            workDetailState.cover = work.cover || '';
            workDetailState.genre = work.genre || '';
            workDetailState.inspiration = work.inspiration || '';
            workDetailState.lengthType = work.lengthType || 'long';
        } catch (err) {
            showToast('加载失败：' + err.message, 'error');
            return;
        }
    } else {
        workDetailState.title = '';
        workDetailState.perspective = 'third';
        workDetailState.channel = 'male';
        workDetailState.tags = [];
        workDetailState.intro = '';
        workDetailState.cover = '';
        workDetailState.genre = '';
        workDetailState.inspiration = '';
        workDetailState.lengthType = 'long';
    }
    switchPage('workDetail');
}

// 渲染作品详情页表单
function initWorkDetailForm() {
    const modeLabel = document.getElementById('workDetailModeLabel');
    if (modeLabel) modeLabel.textContent = workDetailState.mode === 'edit' ? '修改作品' : '新建作品';

    document.getElementById('wdTitle').value = workDetailState.title;
    document.getElementById('wdIntro').value = workDetailState.intro;
    const wdInsp = document.getElementById('wdInspiration');
    if (wdInsp) wdInsp.value = workDetailState.inspiration;

    document.querySelectorAll('input[name="wdLengthType"]').forEach(r => {
        r.checked = (r.value === workDetailState.lengthType);
        r.addEventListener('change', () => { workDetailState.lengthType = r.value; });
    });
    document.querySelectorAll('input[name="wdPerspective"]').forEach(r => {
        r.checked = (r.value === workDetailState.perspective);
        r.addEventListener('change', () => { workDetailState.perspective = r.value; });
    });
    document.querySelectorAll('input[name="wdChannel"]').forEach(r => {
        r.checked = (r.value === workDetailState.channel);
        r.addEventListener('change', () => {
            workDetailState.channel = r.value;
            workDetailState.tags = [];
            renderWorkDetailTags();
        });
    });
    document.getElementById('wdTitle').addEventListener('input', (e) => { workDetailState.title = e.target.value; });
    document.getElementById('wdIntro').addEventListener('input', (e) => { workDetailState.intro = e.target.value; });
    const wdInspEl = document.getElementById('wdInspiration');
    if (wdInspEl) wdInspEl.addEventListener('input', (e) => { workDetailState.inspiration = e.target.value; });

    renderWorkDetailTags();
}

// 频道→标签映射（按计划简化版）
const CHANNEL_TAGS = {
    male: ['玄幻', '都市', '修真', '科幻', '历史', '军事', '游戏', '体育', '灵异', '轻小说'],
    female: ['现代言情', '古代言情', '青春校园', '悬疑灵异', '玄幻言情', '科幻穿越', '女主传奇', '同人衍生'],
    all: ['现代', '古代', '悬疑', '奇幻', '推理', '轻松'],
};

function renderWorkDetailTags() {
    const container = document.getElementById('wdTags');
    if (!container) return;
    const list = CHANNEL_TAGS[workDetailState.channel] || [];
    if (workDetailState.tags.length === 0 && list.length > 0) workDetailState.tags = [list[0]];
    container.innerHTML = list.map(tag => {
        const active = workDetailState.tags.includes(tag);
        return `<span class="wd-tag" data-tag="${escapeHtml(tag)}" style="padding:5px 12px; border-radius:14px; border:1px solid ${active ? 'var(--accent)' : 'var(--border)'}; background:${active ? 'var(--accent-soft, rgba(99,102,241,0.15))' : 'transparent'}; color:${active ? 'var(--accent)' : 'var(--text-secondary)'}; font-size:12px; cursor:pointer;">${escapeHtml(tag)}</span>`;
    }).join('');
    container.querySelectorAll('.wd-tag').forEach(el => {
        el.addEventListener('click', () => {
            const tag = el.dataset.tag;
            const i = workDetailState.tags.indexOf(tag);
            if (i >= 0) {
                workDetailState.tags.splice(i, 1);
            } else {
                if (workDetailState.tags.length >= 2) {
                    showToast('最多选 2 个标签', 'warning');
                    return;
                }
                workDetailState.tags.push(tag);
            }
            renderWorkDetailTags();
        });
    });
}

// 保存作品详情
async function saveWorkDetail() {
    const title = (workDetailState.title || '').trim();
    if (!title) {
        showToast('请输入作品名称', 'warning');
        return;
    }
    const payload = {
        title,
        genre: workDetailState.tags[0] || workDetailState.genre || CHANNEL_TAGS[workDetailState.channel][0],
        perspective: workDetailState.perspective,
        channel: workDetailState.channel,
        tags: workDetailState.tags,
        intro: workDetailState.intro || '',
        cover: workDetailState.cover || '',
        inspiration: workDetailState.inspiration || '',
        lengthType: workDetailState.lengthType || 'long',
    };
    try {
        if (workDetailState.mode === 'create') {
            const result = await api('/works', { method: 'POST', body: payload });
            showToast('作品创建成功', 'success');
            currentWorkId = result.id;
            currentChapterId = null;
            switchPage('writing');
        } else {
            await api(`/works/${workDetailState.workId}`, { method: 'PUT', body: payload });
            showToast('作品已更新', 'success');
            switchPage('works');
        }
    } catch (err) {
        showToast(err.message || '保存失败', 'danger');
    }
}

function cancelWorkDetail() {
    if (workDetailState.mode === 'create') {
        switchPage('works');
    } else {
        switchPage('works');
    }
}

const workDetailState = {
    mode: 'create',
    workId: null,
    title: '',
    perspective: 'third',
    channel: 'male',
    tags: [],
    intro: '',
    cover: '',
    genre: '',
    inspiration: '',
    lengthType: 'long',
};

// 创建作品（旧实现，保留兼容）
async function handleCreateWork() {
    enterWorkDetail('create');
}


// ========== 灵感库 ==========
let inspCurrentPage = 1;
let inspCurrentFilter = 'all';
let inspCurrentLength = localStorage.getItem('jz_insp_length') || 'long';
let inspDebounceTimer = null;
let inspSelectionMode = false;
let inspSelectedIds = new Set();
let inspSelectedItems = [];

async function loadInspirations(page = 1) {
    const listEl = document.getElementById('inspirationList');
    const paginationEl = document.getElementById('inspirationPagination');
    if (!listEl) return;

    const search = document.getElementById('inspSearchInput')?.value?.trim() || '';
    listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>';
    if (paginationEl) paginationEl.innerHTML = '';

    try {
        if (inspCurrentFilter === 'trash') {
            const items = await api('/inspirations/trash');
            renderInspirations(items, true);
            return;
        }

        const query = new URLSearchParams();
        query.set('page', String(page));
        query.set('pageSize', '30');
        if (inspCurrentFilter !== 'all') query.set('source', inspCurrentFilter);
        if (inspCurrentLength && inspCurrentLength !== 'all') query.set('length', inspCurrentLength);
        if (search) query.set('search', search);

        const data = await api('/inspirations?' + query.toString());
        inspCurrentPage = page;
        renderInspirations(data.items || [], false, data.total || 0, page, data.pageSize || 30);
    } catch (err) {
        listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--danger);">加载失败：' + escapeHtml(String(err.message || err)) + '</div>';
    }
}

function debounceLoadInspirations() {
    clearTimeout(inspDebounceTimer);
    inspDebounceTimer = setTimeout(() => loadInspirations(1), 300);
}

function switchInspirationLengthTab(length, btn) {
    inspCurrentLength = length;
    localStorage.setItem('jz_insp_length', length);
    inspCurrentPage = 1;
    document.querySelectorAll('#inspLengthTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadInspirations(1);
}

function switchInspirationTab(filter, btn) {
    inspCurrentFilter = filter;
    inspCurrentPage = 1;
    document.querySelectorAll('#inspTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadInspirations(1);
}

function renderInspirations(items, isTrash, total = 0, page = 1, pageSize = 30) {
    const listEl = document.getElementById('inspirationList');
    const paginationEl = document.getElementById('inspirationPagination');
    if (!listEl) return;

    if (items.length === 0) {
        listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">' + (isTrash ? '回收站为空' : '暂无灵感，点击「新建灵感」开始收集') + '</div>';
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    const sourceLabel = { ai: 'AI 生成', trend: '热门榜单', custom: '自创' };
    const sourceBadge = { ai: 'badge-chapter', trend: 'badge-published', custom: 'badge-draft' };

    listEl.innerHTML = items.map(item => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const tagHtml = tags.map(t => '<span style="padding:2px 6px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">' + escapeHtml(t) + '</span>').join('');
        const contentLines = (item.content || '').split('\n').filter(l => l.trim()).slice(0, 5).join('\n');
        const timeText = formatTimeAgo(item.updatedAt);

        if (isTrash) {
            return `
            <div class="card inspiration-card" style="opacity:0.7;">
                <div class="inspiration-card-body">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:14px; font-weight:600; color:var(--text-primary);">${escapeHtml(item.title || '未命名')}</span>
                        <span style="font-size:12px; color:var(--text-muted);">${timeText}</span>
                    </div>
                    <div class="inspiration-card-text">${escapeHtml(contentLines)}</div>
                </div>
                <div class="inspiration-card-footer" style="justify-content:flex-end;">
                    <button class="btn btn-ghost btn-sm" style="padding:4px 10px;" onclick="restoreInspiration(${item.id})">恢复</button>
                    <button class="btn btn-ghost btn-sm" style="padding:4px 10px; color:var(--danger);" onclick="deleteInspiration(${item.id}, true)">彻底删除</button>
                </div>
            </div>`;
        }

        const isSelected = inspSelectedIds.has(item.id);
        const checkboxHtml = inspSelectionMode ? `
            <div style="position:absolute; top:12px; left:12px; z-index:2;" onclick="event.stopPropagation();">
                <input type="checkbox" class="insp-checkbox" data-id="${item.id}"
                    ${isSelected ? 'checked' : ''}
                    onchange="toggleInspSelection(${item.id}, this.checked)"
                    style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary);">
            </div>
        ` : '';
        const cardPadding = inspSelectionMode ? 'padding-left:40px;' : '';
        const cardClick = inspSelectionMode ? '' : `onclick="showEditInspirationModal(${item.id})"`;
        const cardCursor = inspSelectionMode ? 'cursor:default;' : 'cursor:pointer;';

        return `
        <div class="card inspiration-card" style="${cardCursor}" ${cardClick}>
            ${checkboxHtml}
            <div class="inspiration-card-body" style="${cardPadding}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="list-badge ${sourceBadge[item.source] || 'badge-draft'}">${sourceLabel[item.source] || '自创'}</span>
                    <span style="font-size:12px; color:var(--text-muted);">${timeText}</span>
                </div>
                <div class="inspiration-card-title">${escapeHtml(item.title || '未命名')}</div>
                <div class="inspiration-card-text">${escapeHtml(contentLines)}</div>
                ${tagHtml ? '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">' + tagHtml + '</div>' : ''}
            </div>
            <div class="inspiration-card-footer" onclick="event.stopPropagation();">
                <span style="font-size:12px; color:var(--text-muted);">来自：${sourceLabel[item.source] || '自创'}</span>
                <div class="inspiration-card-actions">
                    <button class="btn btn-ghost btn-sm" style="padding:4px 8px;" title="复制" onclick="event.stopPropagation(); copyInspirationText(${item.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-sm" style="padding:4px 8px;" title="根据灵感扩写" onclick="event.stopPropagation(); expandInspirationToWork(${item.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn btn-ghost btn-sm" style="padding:4px 8px; color:var(--danger);" title="删除" onclick="event.stopPropagation(); deleteInspiration(${item.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    // 分页
    if (paginationEl && !isTrash && total > pageSize) {
        const totalPages = Math.ceil(total / pageSize);
        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="btn ${i === page ? 'btn-primary' : 'btn-ghost'}" style="padding:4px 10px; font-size:12px; min-width:32px;" onclick="loadInspirations(${i})">${i}</button>`;
        }
        paginationEl.innerHTML = html;
    } else if (paginationEl) {
        paginationEl.innerHTML = '';
    }
}

function showCreateInspirationModal() {
    showModal('新建灵感', `
        <div class="form-group">
            <label class="form-label">灵感名称</label>
            <input type="text" class="form-input" id="newInspTitle" placeholder="起一个名字" maxlength="100">
        </div>
        <div class="form-group">
            <label class="form-label">来源</label>
            <select class="form-input" id="newInspSource">
                <option value="custom">自创</option>
                <option value="ai">AI 生成</option>
                <option value="trend">热门榜单</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">类型</label>
            <div id="newInspLengthType" style="display:flex; gap:10px;">
                <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="newInspLengthType" value="long" checked /> 长篇</label>
                <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="newInspLengthType" value="short" /> 短篇</label>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">标签 <span style="font-size:11px; color:var(--text-muted);">（最多5个，用逗号分隔）</span></label>
            <input type="text" class="form-input" id="newInspTags" placeholder="如：玄幻,逆袭,爽文" maxlength="100">
        </div>
        <div class="form-group">
            <label class="form-label">内容</label>
            <textarea class="form-input" id="newInspContent" rows="5" placeholder="写下你的灵感..." style="resize:vertical;" maxlength="2000"></textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" onclick="saveInspiration()">保存</button>
        </div>
    `);
}

async function showEditInspirationModal(id) {
    try {
        const item = await api(`/inspirations/${id}`);
        const tags = Array.isArray(item.tags) ? item.tags.join(',') : '';
        showModal('编辑灵感', `
            <div class="form-group">
                <label class="form-label">灵感名称</label>
                <input type="text" class="form-input" id="editInspTitle" value="${escapeHtml(item.title || '')}" maxlength="100">
            </div>
            <div class="form-group">
                <label class="form-label">来源</label>
                <select class="form-input" id="editInspSource">
                    <option value="custom" ${item.source === 'custom' ? 'selected' : ''}>自创</option>
                    <option value="ai" ${item.source === 'ai' ? 'selected' : ''}>AI 生成</option>
                    <option value="trend" ${item.source === 'trend' ? 'selected' : ''}>热门榜单</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">类型</label>
                <div id="editInspLengthType" style="display:flex; gap:10px;">
                    <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="editInspLengthType" value="long" ${item.lengthType === 'long' || !item.lengthType ? 'checked' : ''} /> 长篇</label>
                    <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="editInspLengthType" value="short" ${item.lengthType === 'short' ? 'checked' : ''} /> 短篇</label>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">标签</label>
                <input type="text" class="form-input" id="editInspTags" value="${escapeHtml(tags)}" maxlength="100">
            </div>
            <div class="form-group">
                <label class="form-label">内容</label>
                <textarea class="form-input" id="editInspContent" rows="5" style="resize:vertical;" maxlength="2000">${escapeHtml(item.content || '')}</textarea>
            </div>
            <div class="form-actions">
                <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
                <button class="btn btn-primary" onclick="saveInspiration(${item.id})">保存</button>
            </div>
        `);
    } catch (err) {
        showToast('加载失败：' + err.message, 'error');
    }
}

async function saveInspiration(id) {
    const isEdit = !!id;
    const title = document.getElementById(isEdit ? 'editInspTitle' : 'newInspTitle')?.value?.trim();
    const source = document.getElementById(isEdit ? 'editInspSource' : 'newInspSource')?.value || 'custom';
    const tagsRaw = document.getElementById(isEdit ? 'editInspTags' : 'newInspTags')?.value || '';
    const content = document.getElementById(isEdit ? 'editInspContent' : 'newInspContent')?.value || '';
    const lengthType = document.querySelector(`input[name="${isEdit ? 'edit' : 'new'}InspLengthType"]:checked`)?.value || 'long';

    if (!title) {
        showToast('请输入灵感名称', 'warning');
        return;
    }
    const tags = tagsRaw.split(/[,，]/).map(t => t.trim()).filter(t => t).slice(0, 5);

    try {
        if (isEdit) {
            await api(`/inspirations/${id}`, { method: 'PUT', body: { title, source, tags, content, lengthType } });
            showToast('灵感已更新', 'success');
        } else {
            await api('/inspirations', { method: 'POST', body: { title, source, tags, content, lengthType } });
            showToast('灵感已保存', 'success');
        }
        document.querySelector('.jz-modal-overlay')?.remove();
        loadInspirations(inspCurrentPage);
    } catch (err) {
        showToast('保存失败：' + err.message, 'error');
    }
}

async function deleteInspiration(id, permanent = false) {
    if (!confirm(permanent ? '彻底删除不可恢复，确定吗？' : '删除后可在回收站恢复，确定吗？')) return;
    try {
        if (permanent) {
            await api(`/inspirations/${id}/permanent`, { method: 'DELETE' });
        } else {
            await api(`/inspirations/${id}`, { method: 'DELETE' });
        }
        showToast('已删除', 'success');
        loadInspirations(inspCurrentPage);
    } catch (err) {
        showToast('删除失败：' + err.message, 'error');
    }
}

async function restoreInspiration(id) {
    try {
        await api(`/inspirations/${id}/restore`, { method: 'POST' });
        showToast('已恢复', 'success');
        loadInspirations(inspCurrentPage);
    } catch (err) {
        showToast('恢复失败：' + err.message, 'error');
    }
}

function copyInspirationText(id) {
    api(`/inspirations/${id}`).then(item => {
        const text = `${item.title}\n${item.content}`;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success')).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }).catch(err => showToast('复制失败：' + err.message, 'error'));
}

async function expandInspirationToWork(id) {
    try {
        const item = await api(`/inspirations/${id}`);
        workDetailState.mode = 'create';
        workDetailState.workId = null;
        workDetailState.title = item.title || '';
        workDetailState.perspective = 'third';
        workDetailState.channel = 'male';
        workDetailState.tags = [];
        workDetailState.intro = '';
        workDetailState.cover = '';
        workDetailState.genre = '';
        workDetailState.inspiration = item.content || '';
        workDetailState.lengthType = item.lengthType || 'long';
        switchPage('workDetail');
        showToast('已填入灵感内容，请补充作品信息', 'info');
    } catch (err) {
        showToast('加载失败：' + err.message, 'error');
    }
}

function toggleInspSelectionMode() {
    inspSelectionMode = !inspSelectionMode;
    const btn = document.getElementById('inspSelectionToggle');
    if (btn) {
        if (inspSelectionMode) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-ghost');
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> 退出选择`;
        } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-ghost');
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> 多选模式`;
            clearInspSelection();
        }
    }
    loadInspirations(inspCurrentPage);
}

function toggleInspSelection(id, checked) {
    if (checked) {
        inspSelectedIds.add(id);
    } else {
        inspSelectedIds.delete(id);
    }
    updateInspSelectionUI();
}

function updateInspSelectionUI() {
    const bar = document.getElementById('inspSelectionBar');
    const countEl = document.getElementById('inspSelectionCount');
    const fuseBtn = document.getElementById('inspFuseBtn');
    if (!bar || !countEl || !fuseBtn) return;

    if (inspSelectionMode && inspSelectedIds.size > 0) {
        bar.style.display = 'flex';
        countEl.textContent = `已选择 ${inspSelectedIds.size} 个灵感`;
        fuseBtn.disabled = inspSelectedIds.size < 2;
    } else {
        bar.style.display = 'none';
    }
}

function clearInspSelection() {
    inspSelectedIds.clear();
    inspSelectedItems = [];
    updateInspSelectionUI();
    loadInspirations(inspCurrentPage);
}

async function fuseInspirationsWithAI() {
    if (inspSelectedIds.size < 2) {
        showToast('至少选择2个灵感进行融合', 'warning');
        return;
    }
    if (inspSelectedIds.size > 5) {
        showToast('最多选择5个灵感', 'warning');
        return;
    }

    // 收集选中灵感的完整数据
    const selectedInspirations = [];
    for (const id of inspSelectedIds) {
        try {
            const item = await api(`/inspirations/${id}`);
            selectedInspirations.push({ title: item.title || '未命名', content: item.content || '' });
        } catch (err) {
            showToast(`获取灵感 #${id} 失败`, 'error');
            return;
        }
    }

    // 显示加载弹窗
    const modalContent = `
        <div style="text-align:center; padding:40px;">
            <div style="width:40px; height:40px; border:3px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:jz-spin 1s linear infinite; margin:0 auto 16px;"></div>
            <div style="font-size:16px; color:var(--text-primary); margin-bottom:8px;">AI 正在融合 ${selectedInspirations.length} 个灵感...</div>
            <div style="font-size:13px; color:var(--text-muted);">热梗融合需要一些时间，请稍候</div>
        </div>
    `;
    showModal('热梗融合中', modalContent);

    try {
        const result = await api('/ai/fuse-inspirations', {
            method: 'POST',
            body: { inspirations: selectedInspirations, modelId: getActiveModelId() }
        });
        document.querySelector('.jz-modal-overlay')?.remove();
        showFusionResultModal(result.content || '');
    } catch (err) {
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('融合失败：' + err.message, 'error');
    }
}

function showFusionResultModal(result) {
    if (!result.trim()) {
        showToast('融合结果为空', 'warning');
        return;
    }
    showModal('热梗融合结果', `
        <div style="max-height:60vh; overflow-y:auto; padding-right:8px;">
            <div style="font-size:14px; line-height:1.8; color:var(--text-primary); white-space:pre-wrap;" class="markdown-body">${escapeHtml(result).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/#{1,6}\s+(.+)/g, '<strong style="font-size:15px; display:block; margin-top:12px; margin-bottom:6px;">$1</strong>')}</div>
        </div>
        <div class="form-actions" style="margin-top:16px; border-top:1px solid var(--border); padding-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
            <button class="btn btn-primary" onclick="createWorkFromFusion(this)">以此创建作品</button>
        </div>
    `);
    // 保存融合结果到全局变量供创建作品使用
    window._lastFusionResult = result;
}

function createWorkFromFusion(btn) {
    const result = window._lastFusionResult;
    if (!result) {
        showToast('融合结果已失效', 'error');
        return;
    }

    // 从融合结果中提取标题（第一个 # 后面的内容）
    let title = '';
    const titleMatch = result.match(/#\s*融合作品标题.*?\n+([\s\S]*?)(?=\n#{1,2}\s|$)/);
    if (titleMatch) {
        // 提取第一个备选标题
        const titleLines = titleMatch[1].trim().split('\n').filter(l => l.trim());
        for (const line of titleLines) {
            const clean = line.replace(/^[-*\d.\s《》]+/, '').trim();
            if (clean && clean.length > 2 && clean.length < 50) {
                title = clean;
                break;
            }
        }
    }
    // 如果没提取到标题，使用默认
    if (!title) {
        title = '融合作品';
    }

    workDetailState.mode = 'create';
    workDetailState.workId = null;
    workDetailState.title = title;
    workDetailState.perspective = 'third';
    workDetailState.channel = 'male';
    workDetailState.tags = [];
    workDetailState.intro = '';
    workDetailState.cover = '';
    workDetailState.genre = '';
    workDetailState.inspiration = result;

    // 关闭弹窗
    btn.closest('.jz-modal-overlay')?.remove();

    // 退出选择模式并清空选择
    if (inspSelectionMode) {
        toggleInspSelectionMode();
    }

    switchPage('workDetail');
    showToast('已填入融合结果，请补充作品信息', 'info');
}


// ========== 热门榜单 ==========
let trendsCurrentCategory = 'platform';
let trendsCurrentPlatform = 'douyin';
let trendsCurrentLength = localStorage.getItem('jz_trends_length') || 'long';
let trendsDebounceTimer = null;

async function loadTrends() {
    const contentEl = document.getElementById('trendsContent');
    const hotInspEl = document.getElementById('trendsHotInsp');
    const platformBar = document.getElementById('trendsPlatformBar');
    if (!contentEl) return;

    contentEl.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>';
    if (hotInspEl) hotInspEl.style.display = 'none';
    if (platformBar) platformBar.style.display = trendsCurrentCategory === 'platform' ? 'flex' : 'none';

    const search = document.getElementById('trendsSearchInput')?.value?.trim() || '';
    const daysAgo = document.getElementById('trendsDateSelect')?.value || '0';

    // 更新日期标签显示
    updateTrendsDateLabel(parseInt(daysAgo, 10));

    try {
        const query = new URLSearchParams();
        query.set('category', trendsCurrentCategory);
        query.set('daysAgo', daysAgo);
        query.set('length', trendsCurrentLength);
        if (trendsCurrentCategory === 'platform') {
            query.set('platform', trendsCurrentPlatform);
        }
        if (search) query.set('search', search);

        const data = await api('/trends?' + query.toString());
        renderTrends(data);
    } catch (err) {
        contentEl.innerHTML = '<div style="text-align:center; padding:60px; color:var(--danger);">加载失败：' + escapeHtml(String(err.message || err)) + '</div>';
    }
}

function debounceLoadTrends() {
    clearTimeout(trendsDebounceTimer);
    trendsDebounceTimer = setTimeout(() => loadTrends(), 300);
}

/** 日期切换处理 + 记录历史 */
function onTrendsDateChange(daysAgo) {
    localStorage.setItem('jz_trends_date', daysAgo);
    // 记录到历史
    const history = JSON.parse(localStorage.getItem('jz_trends_date_history') || '[]');
    const idx = history.indexOf(daysAgo);
    if (idx > -1) history.splice(idx, 1);
    history.unshift(daysAgo);
    // 最多保留5条
    localStorage.setItem('jz_trends_date_history', JSON.stringify(history.slice(0, 5)));
    renderTrendsHistoryDates();
    loadTrends();
}

/** 渲染历史日期快捷按钮 */
function renderTrendsHistoryDates() {
    const container = document.getElementById('trendsHistoryDates');
    if (!container) return;
    const history = JSON.parse(localStorage.getItem('jz_trends_date_history') || '[]');
    const current = document.getElementById('trendsDateSelect')?.value || '0';
    const labels = { '0': '今天', '1': '昨天', '2': '2天前', '3': '3天前', '4': '4天前', '5': '5天前', '6': '6天前' };

    const items = history.filter(d => d !== current).slice(0, 4);
    if (items.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = items.map(d => {
        const label = labels[d] || `${d}天前`;
        return `<button onclick="document.getElementById('trendsDateSelect').value='${d}';onTrendsDateChange('${d}')" style="padding:3px 10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-secondary); font-size:12px; cursor:pointer; white-space:nowrap;"
            onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)';"
            onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)';"
        >${label}</button>`;
    }).join('');
}

/** 更新日期标签显示 */
function updateTrendsDateLabel(daysAgo) {
    const labelEl = document.getElementById('trendsCurrentDateLabel');
    if (!labelEl) return;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const text = daysAgo === 0 ? '今天' : daysAgo === 1 ? '昨天' : `${daysAgo}天前`;
    labelEl.textContent = `${mm}-${dd} · ${text}`;
}

function switchTrendsLength(length, btn) {
    trendsCurrentLength = length;
    localStorage.setItem('jz_trends_length', length);
    document.querySelectorAll('#trendsLengthTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadTrends();
}

function switchTrendsTab(cat, btn) {
    trendsCurrentCategory = cat;
    document.querySelectorAll('#trendsMainTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const platformBar = document.getElementById('trendsPlatformBar');
    if (platformBar) platformBar.style.display = cat === 'platform' ? 'flex' : 'none';
    loadTrends();
}

function switchTrendsPlatform(platform, btn) {
    trendsCurrentPlatform = platform;
    document.querySelectorAll('#trendsPlatformTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadTrends();
}

function renderTrends(data) {
    const contentEl = document.getElementById('trendsContent');
    const hotInspEl = document.getElementById('trendsHotInsp');
    const windVaneEl = document.getElementById('trendsWindVane');
    const bookAnalysisEl = document.getElementById('trendsBookAnalysis');
    const sourceTagEl = document.getElementById('trendsSourceTag');
    if (!contentEl) return;

    const items = data.items || [];
    const hotInspirations = data.hotInspirations || [];
    const windVane = data.windVane;
    const bookAnalysis = data.bookAnalysis || [];
    const meta = data.meta || {};

    // 渲染数据来源标签
    if (sourceTagEl) {
        const isReal = meta.isRealData === 'true';
        const sourceText = meta.source || '';
        const updatedAt = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        const bgColor = isReal ? 'rgba(34,197,94,0.1)' : 'var(--bg-tertiary)';
        const textColor = isReal ? 'var(--success)' : 'var(--text-muted)';
        const borderColor = isReal ? 'rgba(34,197,94,0.3)' : 'var(--border)';
        const dotColor = isReal ? '#22c55e' : 'var(--text-muted)';
        const dotText = isReal ? '● 真实数据' : '● 模拟数据';
        sourceTagEl.innerHTML = sourceText ? `
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:10px; background:${bgColor}; border:1px solid ${borderColor}; color:${textColor}; font-size:11px;">
                    <span style="color:${dotColor}; font-size:8px;">${dotText}</span>
                    <span>${escapeHtml(sourceText)}</span>
                    ${updatedAt ? `<span style="opacity:0.7;">· ${updatedAt}</span>` : ''}
                </span>
            </div>
        ` : '';
    }

    // 渲染风向标（平台热搜不展示，不带操作按钮）
    if (windVaneEl && windVane && trendsCurrentCategory !== 'platform') {
        windVaneEl.style.display = 'block';
        windVaneEl.innerHTML = `
            <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
                <div style="padding:12px 16px; background:var(--bg-tertiary); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:16px;">🧭</span>
                        <span style="font-size:14px; font-weight:600; color:var(--text-primary);">${escapeHtml(windVane.title)}</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${(windVane.tags || []).map((t) => `<span style="padding:2px 8px; border-radius:10px; background:var(--accent-soft, rgba(99,102,241,0.15)); color:var(--accent); font-size:11px;">${escapeHtml(t)}</span>`).join('')}
                    </div>
                </div>
                <div style="padding:14px 16px;">
                    <div style="font-size:12px; color:var(--text-secondary); line-height:1.7; margin-bottom:12px;">${escapeHtml(windVane.summary)}</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div style="padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm);">
                            <div style="font-size:11px; font-weight:600; color:var(--success); margin-bottom:4px;">✅ 创作建议</div>
                            <div style="font-size:11px; color:var(--text-secondary); line-height:1.6; white-space:pre-wrap;">${escapeHtml(windVane.suggestion)}</div>
                        </div>
                        <div style="padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm);">
                            <div style="font-size:11px; font-weight:600; color:var(--danger); margin-bottom:4px;">⚠️ 避坑指南</div>
                            <div style="font-size:11px; color:var(--text-secondary); line-height:1.6; white-space:pre-wrap;">${escapeHtml(windVane.avoid)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (windVaneEl) {
        windVaneEl.style.display = 'none';
    }

    // 渲染爆款灵感生成（平台热搜不展示）
    if (bookAnalysisEl && bookAnalysis.length > 0 && trendsCurrentCategory !== 'platform') {
        bookAnalysisEl.style.display = 'block';
        const dateLabel = data.meta?.dateLabel || '';
        const daysAgoText = data.meta?.daysAgo === '0' ? '今日' : data.meta?.daysAgo === '1' ? '昨日' : `${data.meta?.daysAgo || 0}天前`;
        bookAnalysisEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="font-size:13px; font-weight:600; color:var(--text-primary);">💡 ${daysAgoText}爆款灵感</div>
                ${dateLabel ? `<span style="font-size:11px; color:var(--text-muted); padding:2px 8px; background:var(--bg-tertiary); border-radius:10px;">${dateLabel}</span>` : ''}
            </div>
            ${bookAnalysis.map((book, idx) => {
                const fullText = `《${book.title}》拆书分析\n\n🔥 热点：${book.hotSpot}\n\n⚡ 金手指：${book.goldenFinger}\n\n🎯 核心爽点：${book.coreHook}\n\n👤 核心人设：${book.character}\n\n🪝 第一章钩子：${book.firstChapter}`;
                return `
                <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; margin-bottom:12px;" data-analysis-text="${escapeHtml(fullText)}">
                    <div style="padding:12px 16px; background:var(--bg-tertiary); display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary);">《${escapeHtml(book.title)}》</div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="copyBookAnalysis(${idx})">📋 复制</button>
                            <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="saveBookAnalysisToInspiration(${idx})">⭐ 收藏</button>
                            <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="createWorkFromBookAnalysis(${idx})">📝 创建作品</button>
                        </div>
                    </div>
                    <div style="padding:14px 16px;">
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px; font-weight:600; color:var(--accent); margin-bottom:3px;">🔥 热点</div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(book.hotSpot)}</div>
                        </div>
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px; font-weight:600; color:var(--accent); margin-bottom:3px;">⚡ 金手指</div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(book.goldenFinger)}</div>
                        </div>
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px; font-weight:600; color:var(--accent); margin-bottom:3px;">🎯 核心爽点</div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(book.coreHook)}</div>
                        </div>
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px; font-weight:600; color:var(--accent); margin-bottom:3px;">👤 核心人设</div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(book.character)}</div>
                        </div>
                        <div>
                            <div style="font-size:11px; font-weight:600; color:var(--accent); margin-bottom:3px;">🪝 第一章钩子</div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.6;">${escapeHtml(book.firstChapter)}</div>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        `;
    } else if (bookAnalysisEl) {
        bookAnalysisEl.style.display = 'none';
    }

    if (items.length === 0) {
        const isPlatform = trendsCurrentCategory === 'platform';
        const isFetchFailed = meta.isRealData === 'false' && isPlatform;
        const emptyMsg = isFetchFailed
            ? '获取失败，请稍后重试'
            : '暂无数据';
        const emptyIcon = isFetchFailed ? '⚠️' : '📭';
        contentEl.innerHTML = `<div style="text-align:center; padding:60px; color:var(--text-muted);"><div style="font-size:24px; margin-bottom:8px;">${emptyIcon}</div><div>${emptyMsg}</div></div>`;
        if (hotInspEl) hotInspEl.style.display = 'none';
        return;
    }

    // 热门灵感区（书籍榜单显示）
    if (hotInspEl && hotInspirations.length > 0 && trendsCurrentCategory !== 'platform') {
        hotInspEl.style.display = 'block';
        hotInspEl.innerHTML = `
            <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px 18px;">
                <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">热门灵感</div>
                <div style="display:flex; flex-wrap:wrap; gap:10px;">
                    ${hotInspirations.map(h => `
                        <div style="flex:1; min-width:200px; padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm);">
                            <div style="font-size:12px; font-weight:600; color:var(--accent); margin-bottom:4px;">${escapeHtml(h.word)} ${h.trend}</div>
                            <div style="font-size:11px; color:var(--text-muted); line-height:1.5;">${escapeHtml(h.analysis)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    } else if (hotInspEl) {
        hotInspEl.style.display = 'none';
    }

    // 平台热搜列表
    if (trendsCurrentCategory === 'platform') {
        contentEl.innerHTML = `
            <div class="card rank-card">
                ${items.map((item, i) => `
                    <div class="rank-item" style="padding:12px 18px; align-items:flex-start;">
                        <div class="rank-num ${i < 3 ? 'top' : 'normal'}" style="min-width:28px; margin-top:2px;">${item.rank}</div>
                        <div class="rank-info" style="flex:1; min-width:0;">
                            <div class="rank-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="color:var(--text-primary); text-decoration:none; word-break:break-all;">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                            <button class="btn btn-ghost btn-sm" onclick="analyzeHotTitle('${escapeHtml(item.title).replace(/'/g, "\\'")}', '${trendsCurrentPlatform}', '${item.heat || ''}')" style="font-size:12px; padding:2px 8px;">AI分析</button>
                            <span style="font-size:13px; color:var(--text-muted); white-space:nowrap;">${item.heat}</span>
                            ${item.change === 'up' ? '<span style="color:var(--danger); font-size:11px;">↑</span>' : item.change === 'down' ? '<span style="color:var(--success); font-size:11px;">↓</span>' : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>`;
        return;
    }

    // 九州榜单
    if (trendsCurrentCategory === 'jiuzhou') {
        contentEl.innerHTML = `
            <div class="grid-2">
                ${items.map(item => `
                    <div class="card" style="display:flex; flex-direction:column;">
                        <div style="padding:16px; flex:1;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                                <div style="font-size:15px; font-weight:600; color:var(--text-primary);">${item.rank}. ${escapeHtml(item.title)}</div>
                                <span style="font-size:11px; color:var(--text-muted); padding:2px 8px; background:var(--bg-tertiary); border-radius:12px; white-space:nowrap;">${escapeHtml(item.genre)} · ${item.wordCount}字</span>
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.6; margin-bottom:8px;">${escapeHtml(item.summary)}</div>
                            <div style="font-size:11px; color:var(--text-muted);">作者：${escapeHtml(item.author)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        return;
    }

    // 书籍榜单（男频/女频）
    contentEl.innerHTML = `
        <div class="card rank-card">
            ${items.map((item, i) => `
                <div class="rank-item" style="padding:14px 18px;">
                    <div class="rank-num ${i < 3 ? 'top' : 'normal'}" style="min-width:28px;">${item.rank}</div>
                    <div class="rank-info" style="flex:1;">
                        <div class="rank-title">${escapeHtml(item.title)}</div>
                        <div class="rank-meta">${escapeHtml(item.author)} · ${escapeHtml(item.genre)} · ${item.readers}在读</div>
                        ${(item.tags || []).length > 0 ? `<div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">${item.tags.map((t) => `<span style="padding:2px 6px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>`;
}


/** 解析 AI 返回的 markdown 分段拆书分析 */
function parseMarkdownAnalysis(text) {
    const result = {};
    const mapping = {
        '核心矛盾': 'coreConflict',
        '核心情绪': 'coreEmotion',
        '人物设定': 'characterSetting',
        '剧情走向': 'plotTrend',
        '人物动机': 'characterMotivation',
        '反转剧情': 'plotTwist',
        '卡点剧情': 'cliffhanger',
    };
    // Match 【标题】content until next 【标题】or end
    const regex = /【(.+?)】\n([\s\S]*?)(?=【|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        const key = mapping[title];
        if (key && content) {
            result[key] = content;
        }
    }
    // If no matches, try raw text as fallback
    if (Object.keys(result).length === 0 && text.trim()) {
        return { raw: text.trim() };
    }
    return result;
}

/** 修复 AI 返回的 JSON：处理未转义换行符、数组值转字符串、去掉markdown标记 */
function fixAIJSON(text) {
    // Remove markdown code block markers
    text = text.replace(/^\s*```\w*\s*/, '').replace(/\s*```\s*$/, '');
    // Extract JSON block
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    let jsonStr = m[0];

    // Fix unescaped newlines inside JSON strings using a character-level state machine
    let fixed = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < jsonStr.length; i++) {
        const ch = jsonStr[i];
        if (escaped) {
            fixed += ch;
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            fixed += ch;
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            fixed += ch;
            continue;
        }
        if (ch === '\n' && inString) {
            fixed += '\\n';
            continue;
        }
        fixed += ch;
    }
    jsonStr = fixed;

    // Try strict parse first
    try {
        const parsed = JSON.parse(jsonStr);
        // Normalize array values to strings
        const expected = ['coreConflict', 'coreEmotion', 'characterSetting', 'plotTrend', 'characterMotivation', 'plotTwist', 'cliffhanger'];
        expected.forEach(k => {
            if (Array.isArray(parsed[k])) {
                parsed[k] = parsed[k].join('\n');
            }
        });
        return parsed;
    } catch {
        // Fallback: try converting array values to strings before parsing
        let fallbackStr = jsonStr.replace(/"(\w+)":\s*\[([\s\S]*?)\]/g, function(_, key, arrContent) {
            const items = [];
            arrContent.replace(/"([^"]*)"/g, function(_, item) {
                items.push(item);
            });
            return '"' + key + '": "' + items.join('\\n').replace(/"/g, '\\"') + '"';
        });
        try {
            return JSON.parse(fallbackStr);
        } catch {
            return null;
        }
    }
}

// ========== AI拆书分析状态 ==========
let currentAnalysisData = null;
let currentAnalysisTab = 'all';

function switchAnalysisTab(tab) {
    currentAnalysisTab = tab;
    document.querySelectorAll('.analysis-tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.style.color = isActive ? 'var(--accent)' : 'var(--text-muted)';
        t.style.borderBottom = isActive ? '2px solid var(--accent)' : '2px solid transparent';
        t.style.fontWeight = isActive ? '600' : '400';
        t.classList.toggle('active', isActive);
    });
    renderAIAnalysisContent();
}

function formatAnalysisContent(text) {
    if (!text) return '';
    // 将 (1) (2) (3) 或 ① ② ③ 或 1. 2. 3. 开头的行转为列表
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        // 匹配 (1) ① 1. 等列表标记
        const listMatch = trimmed.match(/^[(（]([\d一二三四五六七八九十]+)[)）][、\.\s]*(.*)/) ||
                         trimmed.match(/^[\d一二三四五六七八九十]+[、\.\s](.*)/);
        if (listMatch) {
            if (!inList) {
                html += '<ul style="margin:4px 0 4px 16px; padding:0; list-style:none;">';
                inList = true;
            }
            html += `<li style="margin-bottom:4px; position:relative; padding-left:14px;"><span style="position:absolute; left:0; color:var(--accent);">•</span>${escapeHtml(listMatch[2] || listMatch[1])}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p style="margin:4px 0;">${escapeHtml(trimmed)}</p>`;
        }
    });
    if (inList) html += '</ul>';
    return html;
}

function extractValue(obj, key) {
    const val = obj?.[key];
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
}

function renderAIAnalysisContent() {
    const container = document.getElementById('aiAnalysisContent');
    if (!container || !currentAnalysisData) return;

    const analysis = currentAnalysisData;
    const sections = [
        { key: 'coreConflict', title: '核心矛盾', icon: '⚔️', color: '#ef4444' },
        { key: 'coreEmotion', title: '核心情绪', icon: '💭', color: '#f59e0b' },
        { key: 'characterSetting', title: '人物设定', icon: '👤', color: '#8b5cf6' },
        { key: 'plotTrend', title: '剧情走向', icon: '📈', color: '#3b82f6' },
        { key: 'characterMotivation', title: '人物动机', icon: '🔥', color: '#f97316' },
        { key: 'plotTwist', title: '反转剧情', icon: '🔄', color: '#10b981' },
        { key: 'cliffhanger', title: '卡点剧情', icon: '🪝', color: '#ec4899' },
    ];

    if (currentAnalysisTab === 'all') {
        container.innerHTML = sections.map(s => {
            const content = extractValue(analysis, s.key);
            if (!content.trim()) return '';
            return `
                <div style="margin-bottom:10px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; background:var(--bg-secondary);">
                    <div style="padding:8px 10px; background:var(--bg-tertiary); display:flex; align-items:center; gap:6px;">
                        <span style="font-size:14px;">${s.icon}</span>
                        <span style="font-weight:600; font-size:12px; color:var(--text-primary);">${s.title}</span>
                        <button class="btn btn-ghost btn-sm" style="margin-left:auto; padding:2px 8px; font-size:11px; color:var(--accent);" onclick="quoteAnalysisSectionToChat('${s.key}', '${s.title}')">💬 引用</button>
                        <span style="width:6px; height:6px; border-radius:50%; background:${s.color};"></span>
                    </div>
                    <div style="padding:10px; font-size:12px; color:var(--text-secondary); line-height:1.7;">
                        ${formatAnalysisContent(content)}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        const s = sections.find(sec => sec.key === currentAnalysisTab);
        if (!s) return;
        const content = extractValue(analysis, s.key);
        container.innerHTML = `
            <div style="border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; background:var(--bg-secondary);">
                <div style="padding:10px 12px; background:var(--bg-tertiary); display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">${s.icon}</span>
                    <span style="font-weight:600; font-size:13px; color:var(--text-primary);">${s.title}</span>
                    <button class="btn btn-ghost btn-sm" style="margin-left:auto; padding:2px 8px; font-size:11px; color:var(--accent);" onclick="quoteAnalysisSectionToChat('${s.key}', '${s.title}')">💬 引用</button>
                    <span style="width:8px; height:8px; border-radius:50%; background:${s.color};"></span>
                </div>
                <div style="padding:12px; font-size:12px; color:var(--text-secondary); line-height:1.7;">
                    ${formatAnalysisContent(content) || '<span style="color:var(--text-muted);">暂无内容</span>'}
                </div>
            </div>
        `;
    }
}

function renderAIAnalysis(analysisText) {
    const container = document.getElementById('aiAnalysisContent');
    const tabsEl = document.getElementById('analysisTabs');
    const actionsEl = document.getElementById('analysisActions');
    const btnAI = document.getElementById('btnAIAnalysis');
    const btnRe = document.getElementById('btnReAnalysis');

    if (!container) return;

    let analysis = {};
    try {
        if (analysisText && analysisText.trim()) {
            analysis = JSON.parse(analysisText);
        }
    } catch {
        analysis = { raw: analysisText };
    }

    const sections = [
        { key: 'coreConflict', title: '1. 核心矛盾', icon: '⚔️' },
        { key: 'coreEmotion', title: '2. 核心情绪', icon: '💭' },
        { key: 'characterSetting', title: '3. 人物设定', icon: '👤' },
        { key: 'plotTrend', title: '4. 剧情走向', icon: '📈' },
        { key: 'characterMotivation', title: '5. 人物动机', icon: '🔥' },
        { key: 'plotTwist', title: '6. 反转剧情', icon: '🔄' },
        { key: 'cliffhanger', title: '7. 卡点剧情', icon: '🪝' },
    ];

    const hasContent = sections.some(s => {
        const val = extractValue(analysis, s.key);
        return val && typeof val === 'string' && val.trim();
    });

    if (!hasContent) {
        currentAnalysisData = null;
        container.innerHTML = `
            <div style="padding:12px 8px; text-align:center; color:var(--text-muted);">
                <div style="margin-bottom:8px;">📖</div>
                <div>暂无分析数据</div>
                <div style="font-size:11px; margin-top:4px;">点击「AI拆书」生成作品分析</div>
            </div>
        `;
        if (tabsEl) tabsEl.style.display = 'none';
        if (actionsEl) actionsEl.style.display = 'none';
        if (btnAI) btnAI.style.display = 'inline-block';
        if (btnRe) btnRe.style.display = 'none';
        return;
    }

    currentAnalysisData = analysis;
    if (tabsEl) tabsEl.style.display = 'block';
    if (actionsEl) actionsEl.style.display = 'flex';
    if (btnAI) btnAI.style.display = 'none';
    if (btnRe) btnRe.style.display = 'inline-block';

    renderAIAnalysisContent();
}

function copyAIAnalysis() {
    if (!currentAnalysisData) { showToast('暂无分析数据可复制', 'warning'); return; }
    const sections = [
        { key: 'coreConflict', title: '核心矛盾' },
        { key: 'coreEmotion', title: '核心情绪' },
        { key: 'characterSetting', title: '人物设定' },
        { key: 'plotTrend', title: '剧情走向' },
        { key: 'characterMotivation', title: '人物动机' },
        { key: 'plotTwist', title: '反转剧情' },
        { key: 'cliffhanger', title: '卡点剧情' },
    ];
    let text = '《' + (currentWorkData?.title || '作品') + '》AI拆书分析\n\n';
    sections.forEach(s => {
        const content = extractValue(currentAnalysisData, s.key);
        if (content.trim()) {
            text += `【${s.title}】\n${content}\n\n`;
        }
    });
    navigator.clipboard.writeText(text).then(() => {
        showToast('拆书分析已复制', 'success');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('拆书分析已复制', 'success');
    });
}

async function saveAIAnalysisToInspiration() {
    if (!currentAnalysisData) { showToast('暂无分析数据可收藏', 'warning'); return; }
    const sections = [
        { key: 'coreConflict', title: '核心矛盾' },
        { key: 'coreEmotion', title: '核心情绪' },
        { key: 'characterSetting', title: '人物设定' },
        { key: 'plotTrend', title: '剧情走向' },
        { key: 'characterMotivation', title: '人物动机' },
        { key: 'plotTwist', title: '反转剧情' },
        { key: 'cliffhanger', title: '卡点剧情' },
    ];
    let content = '';
    sections.forEach(s => {
        const val = extractValue(currentAnalysisData, s.key);
        if (val.trim()) {
            content += `【${s.title}】\n${val}\n\n`;
        }
    });
    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【拆书】${currentWorkData?.title || '作品'}`,
                source: 'ai',
                tags: ['拆书', 'AI分析'],
                content: content,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

async function saveHotAnalysisToInspiration() {
    const contentEl = document.getElementById('hotAnalysisContent');
    const fullText = contentEl?.dataset.fullText || '';
    const title = contentEl?.dataset.title || '热点分析';
    const platform = contentEl?.dataset.platform || '';
    if (!fullText.trim()) { showToast('暂无内容可收藏', 'warning'); return; }

    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【热点】${title}${platform ? ' · ' + platform : ''}`,
                source: 'trend',
                tags: ['热点分析', platform].filter(Boolean),
                content: fullText,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

function quoteAIAnalysisToChat() {
    if (!currentAnalysisData) { showToast('暂无分析数据可引用', 'warning'); return; }
    const sections = [
        { key: 'goldenFinger', title: '金手指' },
        { key: 'coreHook', title: '核心看点' },
        { key: 'character', title: '核心人设' },
        { key: 'firstChapter', title: '第一章钩子' },
    ];
    let text = '';
    if (currentAnalysisTab === 'all') {
        text = '【AI拆书分析】\n\n';
        sections.forEach(s => {
            const val = extractValue(currentAnalysisData, s.key);
            if (val.trim()) {
                text += `【${s.title}】\n${val}\n\n`;
            }
        });
    } else {
        const s = sections.find(sec => sec.key === currentAnalysisTab);
        if (s) {
            text = `【${s.title}】\n${extractValue(currentAnalysisData, s.key)}`;
        }
    }
    const chatInput = document.querySelector('.writing-workspace #aiChatInput');
    if (!chatInput) {
        showToast('未找到AI对话面板，请先进入写作页面', 'warning');
        return;
    }
    const prompt = '\n\n请基于以上分析帮我写作：';
    chatInput.value = text.trim() + prompt;
    chatInput.focus();
    const pos = chatInput.value.length;
    chatInput.setSelectionRange(pos, pos);
    showToast('已引用到AI对话，请输入具体指令', 'success');
}

function quoteAnalysisSectionToChat(key, title) {
    if (!currentAnalysisData) { showToast('暂无分析数据可引用', 'warning'); return; }
    const content = extractValue(currentAnalysisData, key);
    if (!content.trim()) { showToast('该维度暂无内容', 'warning'); return; }
    const chatInput = document.querySelector('.writing-workspace #aiChatInput');
    if (!chatInput) {
        showToast('未找到AI对话面板，请先进入写作页面', 'warning');
        return;
    }
    const text = `【拆书 - ${title}】\n${content.trim()}\n\n请基于以上内容帮我写作：`;
    chatInput.value = text;
    chatInput.focus();
    chatInput.setSelectionRange(text.length, text.length);
    showToast(`已引用「${title}」到AI对话`, 'success');
}

// ========== 文件拆书（上传文件进行AI拆书分析） ==========
function openBookAnalysisDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'jz-modal-overlay';
    overlay.id = 'bookAnalysisOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = `
        <div style="width:480px; max-width:92vw; background:var(--bg-secondary); border-radius:var(--radius-md); display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:15px; font-weight:600; color:var(--text-primary);">上传文件拆书</span>
                <button onclick="document.getElementById('bookAnalysisOverlay')?.remove()" style="border:none; background:transparent; color:var(--text-muted); font-size:20px; cursor:pointer; line-height:1;">×</button>
            </div>
            <div style="padding:24px 20px; display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div id="bookAnalysisDropZone" style="width:100%; padding:32px 20px; border:2px dashed var(--border); border-radius:var(--radius-md); display:flex; flex-direction:column; align-items:center; gap:12px; cursor:pointer; transition:border-color 0.2s;"
                    onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <span style="font-size:14px; color:var(--text-secondary);">点击选择文件，或拖拽文件到此处</span>
                    <div style="display:flex; gap:6px;">
                        <span style="padding:2px 8px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">.txt</span>
                        <span style="padding:2px 8px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">.docx</span>
                        <span style="padding:2px 8px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">.doc</span>
                    </div>
                </div>
                <div style="width:100%; font-size:12px; color:var(--text-muted); line-height:1.8; text-align:left;">
                    <p>支持格式为 txt、word 格式，文件大小不超过 20M。请确保文件中章节名称独立一行，否则可能拆书失败。</p>
                </div>
                <div style="width:100%;">
                    <label class="form-label" style="font-size:12px; margin-bottom:6px; display:block;">作品类型</label>
                    <div id="bookAnalysisLengthType" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer; font-size:12px;"><input type="radio" name="bookAnalysisLengthType" value="long" checked /> 长篇</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer; font-size:12px;"><input type="radio" name="bookAnalysisLengthType" value="short" /> 短篇</label>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const dropZone = document.getElementById('bookAnalysisDropZone');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.docx,.doc';
    input.style.display = 'none';

    const processFile = async (file) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            showToast('文件大小不能超过 20MB', 'warning');
            return;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['txt', 'docx', 'doc'].includes(ext)) {
            showToast('仅支持 txt/docx/doc 格式', 'warning');
            return;
        }

        let text = '';
        try {
            if (ext === 'txt') {
                text = await file.text();
            } else {
                if (typeof mammoth === 'undefined') {
                    showToast('Word 解析库加载中，请稍后重试', 'warning');
                    return;
                }
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            }
        } catch (err) {
            showToast('文件读取失败', 'error');
            return;
        }

        overlay.remove();
        const lengthType = document.querySelector('input[name="bookAnalysisLengthType"]:checked')?.value || 'long';
        runBookAnalysis(text, file.name.replace(/\.[^.]+$/, ''), lengthType);
    };

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--border)'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    });
    input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        input.value = '';
    });
}

async function runBookAnalysis(text, fileName, lengthType = 'long') {
    if (!checkBookAnalysisModel()) return;
    const overlay = document.createElement('div');
    overlay.className = 'jz-modal-overlay';
    overlay.id = 'bookAnalysisResultOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = `
        <div style="width:640px; max-width:94vw; max-height:88vh; background:var(--bg-secondary); border-radius:var(--radius-md); display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:14px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:15px; font-weight:600; color:var(--text-primary);">📖 《${escapeHtml(fileName.slice(0, 20))}》拆书分析</span>
                <button onclick="document.getElementById('bookAnalysisResultOverlay')?.remove()" style="border:none; background:transparent; color:var(--text-muted); font-size:20px; cursor:pointer; line-height:1;">×</button>
            </div>
            <div id="bookAnalysisResultContent" style="flex:1; overflow-y:auto; padding:16px 18px; font-size:12px; color:var(--text-secondary); line-height:1.7;">
                <div style="text-align:center; padding:40px; color:var(--text-muted);">
                    <div class="spinner" style="width:24px; height:24px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 12px;"></div>
                    <div>AI 正在拆书分析中，请稍候...</div>
                </div>
            </div>
            <div style="padding:12px 18px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <button class="btn btn-primary btn-sm" style="padding:4px 12px; font-size:12px; display:none;" id="btnCreateWorkFromBook" onclick="createWorkFromBookAnalysisResult()">📝 创建作品</button>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" style="padding:4px 12px; font-size:12px; display:none;" id="btnCopyBookAnalysis" onclick="copyBookAnalysisResult()">📋 复制</button>
                    <button class="btn btn-primary btn-sm" style="padding:4px 12px; font-size:12px; display:none;" id="btnSaveBookAnalysis" onclick="saveBookAnalysisResult()">⭐ 收藏</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // 提取标题（第一行非空文本）
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const bookTitle = lines[0] || fileName;

    // 提取简介（"简介："后的内容，直到第一个章节标题）
    let intro = '';
    const introMatch = text.match(/简介[：:]\s*([\s\S]*?)(?=\n第[一二三四五六七八九十百千万零〇0-9]+章|\nChapter\s+\d+)/i);
    if (introMatch) intro = introMatch[1].trim();

    // 按章节拆分，提取前5章
    const chapterRegex = /\n(第[一二三四五六七八九十百千万零〇0-9]+章\s*[^\n]*)/gi;
    const chapterMatches = [];
    let m;
    while ((m = chapterRegex.exec(text)) !== null) {
        chapterMatches.push(m.index);
    }

    let chaptersText = '';
    const maxChapters = 5;
    const maxCharsPerChapter = 1500;
    for (let i = 0; i < Math.min(chapterMatches.length, maxChapters); i++) {
        const start = chapterMatches[i];
        const end = (i + 1 < chapterMatches.length) ? chapterMatches[i + 1] : text.length;
        const chapterBlock = text.slice(start, end).trim();
        const chapterLines = chapterBlock.split('\n');
        const chapterTitle = chapterLines[0].trim();
        const chapterBody = chapterLines.slice(1).join('\n').trim().slice(0, maxCharsPerChapter);
        chaptersText += `\n${chapterTitle}\n${chapterBody}\n`;
    }

    // 如果没能按章节拆分，fallback 到前 6000 字
    if (!chaptersText) {
        chaptersText = text.slice(0, 6000);
    }

    // 总长度限制（约 8000-10000 中文字符）
    const maxTotal = 9000;
    if (chaptersText.length > maxTotal) {
        chaptersText = chaptersText.slice(0, maxTotal);
    }

    try {
        const promptContent = `你是一位资深网文编辑，擅长拆解爆款小说的核心要素。请对以下作品从7个维度进行精细化拆书分析。

【拆书规则】
每个维度需要给出 3-5 个具体分析要点，每个要点必须有原文细节支撑，不能泛泛而谈。分析要有洞察力、有实操价值。

维度1：核心矛盾
- 故事的主要冲突类型（人物矛盾/环境矛盾/内心矛盾/势力矛盾）
- 矛盾的层级设计：表层→深层→核心矛盾分别是什么
- 矛盾如何层层递进、推动情节
- 矛盾制造的戏剧张力体现在哪些具体场景

维度2：核心情绪
- 读者主要体验到的情绪类型（爽/虐/甜/悬疑/紧张/共鸣等）
- 开篇→发展→高潮的情绪曲线设计
- 作者调动读者情感的具体手法（场景/对话/细节）
- 情绪爆发点和转折点的分布

维度3：人物设定（重点）
- 主角：身份背景、外貌、性格（至少3个鲜明特质）、核心能力/金手指、核心目标、成长弧光
- 关键配角（2-3人）：身份、外貌、性格、与主角关系、剧情功能
- 人物关系网：敌对/盟友/暧昧/师徒/亲人关系及变化
- 人物差异化：与同类作品相比的独特之处

维度4：剧情走向
- 整体脉络：起承转合四阶段分布
- 关键转折点：至少3个，分别在哪一章、发生了什么
- 高潮设计：铺垫→释放→效果
- 节奏控制：快慢交替的安排

维度5：人物动机
- 主角驱动力：表层动机（想要什么）→深层动机（真正需要/恐惧什么）
- 关键配角动机：为何做出关键选择，是否合理可信
- 动机与行为的一致性
- 不同角色动机之间的对立与冲突

维度6：反转剧情
- 重大反转：至少2-3个关键反转分别是什么
- 信息差设计：读者/角色各自知道/不知道什么
- 反转铺垫：前面埋下的伏笔和暗示
- 预期打破：如何让读者意外又合理

维度7：卡点剧情
- 章节钩子：每章结尾的悬念类型（信息/行动/情感/命运）
- 欲罢不能的技巧：让读者忍不住想看下一章的手法
- 卡点与下章衔接：悬念如何回应或升级
- 信息留白：哪些关键信息被故意 withholding

【输出格式】
严格使用以下7个标题，内容紧跟标题，可分段落自由换行。禁止输出这7个维度以外的任何内容。

【核心矛盾】
（300-400字，结合原文细节）

【核心情绪】
（300-400字，结合原文细节）

【人物设定】
（400-500字，结合原文细节，重点）

【剧情走向】
（300-400字，结合原文细节）

【人物动机】
（300-400字，结合原文细节）

【反转剧情】
（300-400字，结合原文细节）

【卡点剧情】
（300-400字，结合原文细节）

【作品信息】
作品名称：${bookTitle}
${intro ? '简介：' + intro.slice(0, 300) : ''}

【正文内容（前${Math.min(maxChapters, 5)}章）】
${chaptersText}

请严格按照上述格式和7个标题输出分析：`;

        const messages = [
            { role: 'system', content: '你是一位资深网文编辑，擅长拆解爆款小说的核心要素。请用中文输出，分析要具体、有洞察力、有实操价值。极其重要的格式约束：1）输出必须严格使用【核心矛盾】【核心情绪】【人物设定】【剧情走向】【人物动机】【反转剧情】【卡点剧情】这7个标题；2）每个标题下的内容可以分段落、自由换行；3）禁止输出这7个维度以外的任何内容。' },
            { role: 'user', content: promptContent }
        ];

        // /ai/chat 是 SSE 流式接口，需要用 fetch 直接处理
        const fetchRes = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ messages, modelId: getActiveModelId() }),
        });

        if (!fetchRes.ok) {
            const errData = await fetchRes.json().catch(() => ({ error: 'AI服务异常' }));
            throw new Error(errData.error || `HTTP ${fetchRes.status}`);
        }

        const reader = fetchRes.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        fullResponse += delta;
                    } catch {
                        // ignore parse error
                    }
                }
            }
        }

        let analysis = parseMarkdownAnalysis(fullResponse);

        window._lastBookAnalysis = { fileName, analysis };

        const resultEl = document.getElementById('bookAnalysisResultContent');
        const sections = [
            { key: 'coreConflict', title: '1. 核心矛盾', icon: '⚔️' },
            { key: 'coreEmotion', title: '2. 核心情绪', icon: '💭' },
            { key: 'characterSetting', title: '3. 人物设定', icon: '👤' },
            { key: 'plotTrend', title: '4. 剧情走向', icon: '📈' },
            { key: 'characterMotivation', title: '5. 人物动机', icon: '🔥' },
            { key: 'plotTwist', title: '6. 反转剧情', icon: '🔄' },
            { key: 'cliffhanger', title: '7. 卡点剧情', icon: '🪝' },
        ];

        if (resultEl) {
            resultEl.innerHTML = sections.map(s => {
                const val = extractValue(analysis, s.key);
                if (!val.trim()) return '';
                return `
                    <div style="margin-bottom:12px; border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;">
                        <div style="padding:8px 10px; background:var(--bg-tertiary); font-weight:600; font-size:12px; color:var(--text-primary);">
                            ${s.icon} ${s.title}
                        </div>
                        <div style="padding:8px 10px; font-size:12px; color:var(--text-secondary); line-height:1.7; white-space:pre-wrap; word-break:break-all;">
                            ${escapeHtml(val)}
                        </div>
                    </div>
                `;
            }).join('') || `<div style="text-align:center; padding:20px; color:var(--text-muted);">AI 返回了非结构化内容：</div><pre style="font-size:11px; white-space:pre-wrap; word-break:break-all;">${escapeHtml(fullResponse)}</pre>`;
        }

        const btnCopy = document.getElementById('btnCopyBookAnalysis');
        const btnSave = document.getElementById('btnSaveBookAnalysis');
        const btnCreate = document.getElementById('btnCreateWorkFromBook');
        if (btnCopy) btnCopy.style.display = 'inline-block';
        if (btnSave) btnSave.style.display = 'inline-block';
        if (btnCreate) btnCreate.style.display = 'inline-block';

    } catch (err) {
        const resultEl = document.getElementById('bookAnalysisResultContent');
        if (resultEl) {
            resultEl.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">拆书分析失败：${escapeHtml(err.message || '未知错误')}</div>`;
        }
    }
}

function copyBookAnalysisResult() {
    const data = window._lastBookAnalysis;
    if (!data) { showToast('暂无内容可复制', 'warning'); return; }
    const { fileName, analysis } = data;
    const sections = [
        { key: 'coreConflict', title: '核心矛盾' },
        { key: 'coreEmotion', title: '核心情绪' },
        { key: 'characterSetting', title: '人物设定' },
        { key: 'plotTrend', title: '剧情走向' },
        { key: 'characterMotivation', title: '人物动机' },
        { key: 'plotTwist', title: '反转剧情' },
        { key: 'cliffhanger', title: '卡点剧情' },
    ];
    let text = `《${fileName}》拆书分析\n\n`;
    sections.forEach(s => {
        const val = extractValue(analysis, s.key);
        if (val.trim()) {
            text += `【${s.title}】\n${val}\n\n`;
        }
    });
    navigator.clipboard.writeText(text).then(() => {
        showToast('拆书分析已复制', 'success');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('拆书分析已复制', 'success');
    });
}

async function saveBookAnalysisResult() {
    const data = window._lastBookAnalysis;
    if (!data) { showToast('暂无内容可收藏', 'warning'); return; }
    const { fileName, analysis } = data;
    const sections = [
        { key: 'coreConflict', title: '核心矛盾' },
        { key: 'coreEmotion', title: '核心情绪' },
        { key: 'characterSetting', title: '人物设定' },
        { key: 'plotTrend', title: '剧情走向' },
        { key: 'characterMotivation', title: '人物动机' },
        { key: 'plotTwist', title: '反转剧情' },
        { key: 'cliffhanger', title: '卡点剧情' },
    ];
    let content = '';
    sections.forEach(s => {
        const val = extractValue(analysis, s.key);
        if (val.trim()) {
            content += `【${s.title}】\n${val}\n\n`;
        }
    });
    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【拆书】${fileName}`,
                source: 'ai',
                tags: ['拆书', '文件拆书'],
                content: content,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

async function createWorkFromBookAnalysisResult() {
    const data = window._lastBookAnalysis;
    if (!data) { showToast('暂无内容可创建', 'warning'); return; }
    const { fileName, analysis } = data;

    // 关闭拆书弹窗
    document.getElementById('bookAnalysisResultOverlay')?.remove();

    // 组装拆书内容
    const sections = [
        { key: 'coreConflict', title: '核心矛盾' },
        { key: 'coreEmotion', title: '核心情绪' },
        { key: 'characterSetting', title: '人物设定' },
        { key: 'plotTrend', title: '剧情走向' },
        { key: 'characterMotivation', title: '人物动机' },
        { key: 'plotTwist', title: '反转剧情' },
        { key: 'cliffhanger', title: '卡点剧情' },
    ];
    let analysisContent = '';
    sections.forEach(s => {
        const val = extractValue(analysis, s.key);
        if (val.trim()) {
            analysisContent += `【${s.title}】\n${val}\n\n`;
        }
    });

    // 先创建拆书作品
    try {
        const result = await api('/works', {
            method: 'POST',
            body: {
                title: fileName.slice(0, 50) || '新作品',
                genre: '未分类',
                perspective: 'third',
                channel: 'male',
                tags: ['拆书'],
                intro: '',
                cover: '',
                inspiration: '',
                source: 'analysis',
            },
        });

        const newWorkId = result.id;

        // 保存拆书分析到作品
        await api(`/works/${newWorkId}`, {
            method: 'PUT',
            body: { analysis: JSON.stringify(analysis) }
        });

        // 同步到灵感库
        try {
            await api('/inspirations', {
                method: 'POST',
                body: {
                    title: `【拆书】${fileName}`,
                    source: 'ai',
                    tags: ['拆书', '文件拆书'],
                    content: analysisContent,
                },
            });
        } catch (e) {
            // 灵感库同步失败不影响主流程
            console.log('灵感库同步失败:', e);
        }

        showToast('拆书作品已创建并同步到灵感库', 'success');
        switchPage('works');
    } catch (err) {
        showToast('创建失败：' + (err.message || '未知错误'), 'error');
    }
}

async function generateAIAnalysis() {
    if (!currentWorkId) {
        showToast('请先选择一个作品', 'warning');
        return;
    }
    if (!checkBookAnalysisModel()) return;
    const container = document.getElementById('aiAnalysisContent');
    const tabsEl = document.getElementById('analysisTabs');
    const actionsEl = document.getElementById('analysisActions');
    if (tabsEl) tabsEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';
    if (container) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);"><div class="spinner" style="width:20px; height:20px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 8px;"></div>AI 正在分析中...</div>';
    }

    try {
        const work = currentWorkData || {};
        const chapters = work.chapterList || [];
        const firstChapter = chapters[0];
        let context = `作品名称：${work.title || '未命名'}\n`;
        context += `简介：${work.intro || '暂无简介'}\n`;
        if (firstChapter) {
            context += `第一章标题：${firstChapter.title}\n`;
            context += `第一章内容（前800字）：${(firstChapter.content || '').slice(0, 800)}\n`;
        }

        const promptText = `请对以下作品进行精细化拆书分析，从7个维度深入拆解。每个维度请给出3-5个具体分析要点，每个要点要有细节支撑，不要泛泛而谈：

1. 核心矛盾：
   - 故事的主要冲突是什么（人物矛盾/环境矛盾/内心矛盾/势力矛盾）
   - 矛盾的层级设计：表层矛盾→深层矛盾→核心矛盾分别是什么
   - 矛盾如何层层递进、推动情节发展
   - 矛盾制造的戏剧张力体现在哪些具体场景

2. 核心情绪：
   - 读者主要体验到的情绪类型（爽/虐/甜/悬疑/紧张/共鸣等）
   - 情绪曲线设计：开篇→发展→高潮→结局的情绪起伏
   - 作者调动读者情感的具体手法（通过什么场景/对话/细节）
   - 情绪爆发点和情绪转折点的分布

3. 人物设定（务必详细，这是重点）：
   - 主角：身份背景（职业/地位/出身）、外貌特征、性格特点（至少3个鲜明特质）、核心能力/金手指、核心目标/愿望、成长弧光（从什么状态到什么状态）
   - 关键配角（至少分析2-3人）：各自的身份、外貌、性格、与主角的关系、在剧情中的功能作用
   - 人物关系网：谁与谁是敌对/盟友/暧昧/师徒/亲人，关系如何变化发展
   - 人物差异化：与同类作品的人物相比有何独特之处

4. 剧情走向：
   - 整体故事脉络：起承转合四阶段的分布
   - 关键转折点：至少找出3个重大转折点，分别在哪一章、发生了什么
   - 高潮设计：高潮如何铺垫、如何释放、效果如何
   - 节奏控制：快慢交替的安排，哪些章节加速、哪些章节放缓

5. 人物动机：
   - 主角的核心驱动力：表层动机（想要什么）→深层动机（真正需要/恐惧什么）
   - 关键配角的动机：各自为何做出关键选择，动机是否合理可信
   - 动机与行为的一致性：人物的行动是否符合其动机设定
   - 动机冲突：不同角色的动机之间是否存在对立，如何制造戏剧冲突

6. 反转剧情：
   - 重大反转/转折：至少找出2-3个关键反转，分别是什么
   - 信息差设计：读者知道而角色不知道 / 角色知道而读者不知道的信息分别有哪些
   - 反转的铺垫：作者在前面埋下了哪些伏笔和暗示
   - 读者预期的打破方式：反转如何让读者感到意外又合理

7. 卡点剧情：
   - 章节钩子设计：每章结尾用了什么类型的悬念（信息悬念/行动悬念/情感悬念/命运悬念）
   - 欲罢不能的阅读体验：作者用了哪些技巧让读者忍不住想看下一章
   - 卡点与下章的衔接：悬念如何在下一章开头得到回应或升级
   - 信息留白技巧：哪些关键信息被故意 withholding，如何制造期待感

【输出格式要求】
请严格按照以下格式输出，每个维度用【维度名】作为标题，内容紧跟在标题后面，可以分段落、自由换行。禁止输出这7个维度以外的内容。

【核心矛盾】
（分析内容，300-400字）

【核心情绪】
（分析内容，300-400字）

【人物设定】
（分析内容，400-500字，这是重点）

【剧情走向】
（分析内容，300-400字）

【人物动机】
（分析内容，300-400字）

【反转剧情】
（分析内容，300-400字）

【卡点剧情】
（分析内容，300-400字）\n\n${context}\n\n请严格按上述格式输出：`;

        const messages = [
            { role: 'system', content: '你是一位资深网文编辑，擅长拆解爆款小说的核心要素。请用中文输出，分析要具体、有洞察力、有实操价值。极其重要的格式约束：1）输出必须严格使用【核心矛盾】【核心情绪】【人物设定】【剧情走向】【人物动机】【反转剧情】【卡点剧情】这7个标题；2）每个标题下的内容可以分段落、自由换行；3）禁止输出这7个维度以外的任何内容。' },
            { role: 'user', content: promptText }
        ];

        // 作品拆书用 fetch + SSE 直接处理（api() 函数会尝试 JSON 解析，不适合 SSE）
        const fetchRes = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ messages, workId: currentWorkId ? Number(currentWorkId) : null, modelId: 'gemini-2.5-pro' }),
        });

        if (!fetchRes.ok) {
            const errData = await fetchRes.json().catch(() => ({ error: 'AI服务异常' }));
            throw new Error(errData.error || `HTTP ${fetchRes.status}`);
        }

        const reader = fetchRes.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        fullResponse += delta;
                    } catch {
                        // ignore parse error
                    }
                }
            }
        }

        let analysis = parseMarkdownAnalysis(fullResponse);

        await api(`/works/${currentWorkId}`, {
            method: 'PUT',
            body: { analysis: JSON.stringify(analysis) }
        });

        if (currentWorkData) currentWorkData.analysis = JSON.stringify(analysis);

        renderAIAnalysis(JSON.stringify(analysis));
        showToast('AI 拆书完成', 'success');
    } catch (err) {
        showToast('AI 拆书失败：' + (err.message || '未知错误'), 'error');
        renderAIAnalysis('');
    }
}

// ========== 草稿 ==========
function renderWorkDrafts(list) {
    const panel = document.querySelector('#trendsWindVane [data-vane-text]');
    const text = panel?.dataset.vaneText || '';
    if (!text) { showToast('暂无内容可复制', 'warning'); return; }
    navigator.clipboard.writeText(text).then(() => {
        showToast('风向标内容已复制', 'success');
    }).catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('风向标内容已复制', 'success');
    });
}

async function saveWindVaneToInspiration() {
    const panel = document.querySelector('#trendsWindVane [data-vane-text]');
    const text = panel?.dataset.vaneText || '';
    if (!text) { showToast('暂无内容可收藏', 'warning'); return; }

    // 从文本中提取标题（第一行）
    const lines = text.split('\n');
    const title = lines[0]?.trim() || '风向标';
    const content = lines.slice(1).join('\n').trim() || text;

    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【风向标】${title}`,
                source: 'trend',
                tags: ['风向标'],
                content: content,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

async function createWorkFromWindVane() {
    const panel = document.querySelector('#trendsWindVane [data-vane-text]');
    const text = panel?.dataset.vaneText || '';
    if (!text) { showToast('暂无内容可创建', 'warning'); return; }

    const lines = text.split('\n');
    const title = lines[0]?.trim() || '新作品';
    const content = lines.slice(1).join('\n').trim() || text;

    // 从风向标标签推断频道
    let channel = 'male';
    const cat = trendsCurrentCategory;
    if (cat === 'femaleHot' || cat === 'femaleNew') channel = 'female';

    workDetailState.mode = 'create';
    workDetailState.workId = null;
    workDetailState.title = '';
    workDetailState.perspective = 'third';
    workDetailState.channel = channel;
    workDetailState.tags = [];
    workDetailState.intro = '';
    workDetailState.cover = '';
    workDetailState.genre = '';
    workDetailState.inspiration = content;
    switchPage('workDetail');
    showToast('已填入风向内容到作品灵感，请补充作品信息', 'info');
}

// ========== 爆款灵感生成操作 ==========
function getBookAnalysisText(idx) {
    const panels = document.querySelectorAll('#trendsBookAnalysis [data-analysis-text]');
    return panels[idx]?.dataset.analysisText || '';
}

function copyBookAnalysis(idx) {
    const text = getBookAnalysisText(idx);
    if (!text) { showToast('暂无内容可复制', 'warning'); return; }
    navigator.clipboard.writeText(text).then(() => {
        showToast('拆书内容已复制', 'success');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('拆书内容已复制', 'success');
    });
}

async function saveBookAnalysisToInspiration(idx) {
    const text = getBookAnalysisText(idx);
    if (!text) { showToast('暂无内容可收藏', 'warning'); return; }

    const lines = text.split('\n');
    const title = lines[0]?.trim() || '拆书分析';
    const content = lines.slice(1).join('\n').trim() || text;

    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【拆书】${title}`,
                source: 'trend',
                tags: ['拆书', '风向标'],
                content: content,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

async function createWorkFromBookAnalysis(idx) {
    const text = getBookAnalysisText(idx);
    if (!text) { showToast('暂无内容可创建', 'warning'); return; }

    const lines = text.split('\n');
    const title = lines[0]?.trim().replace(/^《|》$/g, '') || '拆书作品';
    const content = lines.slice(1).join('\n').trim() || text;

    let channel = 'male';
    const cat = trendsCurrentCategory;
    if (cat === 'femaleHot' || cat === 'femaleNew') channel = 'female';

    try {
        const result = await api('/works', {
            method: 'POST',
            body: {
                title: title.slice(0, 50),
                genre: '未分类',
                perspective: 'third',
                channel: channel,
                tags: ['拆书'],
                intro: '',
                cover: '',
                inspiration: content,
                source: 'analysis',
            },
        });

        // 同步到灵感库
        try {
            await api('/inspirations', {
                method: 'POST',
                body: {
                    title: `【拆书】${title}`,
                    source: 'trend',
                    tags: ['拆书', '风向标'],
                    content: content,
                },
            });
        } catch (e) {
            console.log('灵感库同步失败:', e);
        }

        showToast('拆书作品已创建并同步到灵感库', 'success');
        switchPage('works');
    } catch (err) {
        showToast('创建失败：' + (err.message || '未知错误'), 'error');
    }
}

// ========== 写作页加载 ==========
async function loadWritingPage() {
    if (!currentWorkId) {
        // 没有选中作品，尝试加载第一个
        try {
            const list = await api('/works');
            if (list && list.length > 0) {
                currentWorkId = list[0].id;
            } else {
                document.getElementById('writingWorkTitle').textContent = '无作品';
                document.getElementById('writingWorkMeta').textContent = '请先在「我的作品」中创建作品';
                document.getElementById('chapterList').innerHTML = '<div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">暂无章节</div>';
                return;
            }
        } catch (err) {
            document.getElementById('writingWorkTitle').textContent = '加载失败';
            return;
        }
    }

    try {
        const work = await api(`/works/${currentWorkId}`);
        currentWorkData = work;

        // 更新顶部信息
        const statusMap = { unfinished: '连载中', finished: '已完结', reviewing: '审核中' };
        document.getElementById('writingWorkTitle').textContent = work.title;
        document.getElementById('writingWorkMeta').textContent = `${work.genre} · ${statusMap[work.status] || work.status}`;
        document.getElementById('writingWordCount').textContent = `总字数 ${work.words || '0字'}`;

        // 渲染章节列表
        renderChapterList(work.chapterList || []);

        // 加载作品元数据（标签、角色、设定、总纲）
        loadWorkMetadata(work);

        // 自动选中第一个章节
        if (work.chapterList && work.chapterList.length > 0) {
            const first = work.chapterList[0];
            switchChapter(first.id, first.title, first.content);
        }

        // 恢复展开状态
        restoreSectionState();
    } catch (err) {
        showToast('加载作品失败: ' + err.message, 'danger');
    }
}

// ========== 作品元数据加载 ==========
async function loadWorkMetadata(work) {
    if (!work) return;

    // 渲染作品详情
    renderWorkDetailInfo(work);

    // 加载总纲
    try {
        const outlineList = await api(`/works/${currentWorkId}/outlines`);
        renderWorkOutlines(outlineList || []);
    } catch (err) {
        console.log('总纲加载失败:', err.message);
    }

    // 加载作品灵感到正文页
    renderWorkInspiration(work.inspiration || '');

    // 加载AI分析
    renderAIAnalysis(work.analysis || '');
}

// 所有标签定义
const ALL_TAGS = {
    题材: ['玄幻', '修仙', '升级流', '仙侠', '奇幻', '都市', '言情', '现实情感', '悬疑', '科幻', '武侠', '历史', '军事', '电竞', '体育', '诸天无限', '快穿', '脑洞', '宫斗', '太空歌剧'],
    情节: ['逆袭', '热血', '宗门斗争', '权谋', '重生', '穿越', '系统', '种田', '直播', '萌宝', '美食', '娱乐圈', '职场', '校园', '囤货', '规则怪谈', '先婚后爱', '追妻火葬场', '破镜重圆', '争霸'],
    情绪: ['爽', '燃', '甜宠', '虐恋', '暗恋', '复仇', '反转', '逆袭', '励志', '热血', '打脸', '治愈', '沙雕', '无CP'],
    时空: ['古代', '现代', '未来', '架空', '民国', '五零年代', '六零年代', '七零年代', '八零年代', '兽世']
};

function renderWorkDetailInfo(work) {
    const container = document.getElementById('workDetailInfo');
    if (!container) return;

    const perspectiveMap = { first: '第一人称', third: '第三人称' };
    const channelMap = { male: '男频', female: '女频', all: '全频' };
    const tags = Array.isArray(work.tags) ? work.tags : [];

    container.innerHTML = `
        <div style="padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm);"
            ${work.intro ? `<div style="margin-bottom:8px; color:var(--text-secondary);">${escapeHtml(work.intro)}</div>` : ''}
            <div style="display:flex; flex-wrap:wrap; gap:8px; font-size:11px; color:var(--text-muted);">
                <span>视角：${perspectiveMap[work.perspective] || '第三人称'}</span>
                <span>频道：${channelMap[work.channel] || '男频'}</span>
                ${tags.length > 0 ? `<span>标签：${tags.map(t => escapeHtml(t)).join('、')}</span>` : ''}
            </div>
        </div>
    `;
}

function renderWorkTags(activeTags) {
    const container = document.getElementById('workTagsContainer');
    if (!container) return;

    let html = '';
    Object.entries(ALL_TAGS).forEach(([category, tags]) => {
        html += `
            <div style="margin-bottom:12px;">
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                    <span>${category}</span>
                    <span style="font-size:10px; color:var(--text-tertiary);">${activeTags.filter(t => tags.includes(t)).length}/${tags.length}</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:4px;">
                    ${tags.map(tag => {
                        const isActive = activeTags.includes(tag);
                        return `<span class="tag ${isActive ? 'active' : ''}" data-tag="${tag}" style="font-size:11px; padding:3px 8px; cursor:pointer;" onclick="this.classList.toggle('active')">${tag}</span>`;
                    }).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function saveWorkTags() {
    if (!currentWorkId) return;

    const container = document.getElementById('workTagsContainer');
    if (!container) return;

    const activeTags = Array.from(container.querySelectorAll('.tag.active')).map(el => el.dataset.tag);

    try {
        await api(`/works/${currentWorkId}`, {
            method: 'PUT',
            body: { tags: activeTags }
        });
        showToast('标签已保存', 'success');
    } catch (err) {
        showToast('保存失败: ' + err.message, 'danger');
    }
}

function renderWorkCharacters(list) {
    const protagonists = list.filter(c => c.role === 'protagonist');
    const supporting = list.filter(c => c.role === 'supporting');

    const protContainer = document.getElementById('workProtagonists');
    const suppContainer = document.getElementById('workSupporting');

    if (protContainer) {
        if (protagonists.length === 0) {
            protContainer.innerHTML = '<div style="padding:6px 8px; font-size:12px; color:var(--text-muted);">暂无主要角色</div>';
        } else {
            protContainer.innerHTML = protagonists.map(c => `
                <div style="padding:6px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:12px; color:var(--text-secondary); margin-bottom:2px; display:flex; justify-content:space-between;" onclick="showCharacterForm(${c.id})">
                    <span>${c.name}</span>
                    <span style="font-size:11px; color:var(--text-muted);">主要角色</span>
                </div>
            `).join('');
        }
    }

    if (suppContainer) {
        if (supporting.length === 0) {
            suppContainer.innerHTML = '<div style="padding:6px 8px; font-size:12px; color:var(--text-muted);">暂无次要角色</div>';
        } else {
            suppContainer.innerHTML = supporting.map(c => `
                <div style="padding:6px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:12px; color:var(--text-secondary); margin-bottom:2px; display:flex; justify-content:space-between;" onclick="showCharacterForm(${c.id})">
                    <span>${c.name}</span>
                    <span style="font-size:11px; color:var(--text-muted);">次要角色</span>
                </div>
            `).join('');
        }
    }
}

function renderWorkSettings(list) {
    const typeMap = { background: '背景', faction: '势力', location: '地点', thing: '物品' };
    const typeIds = ['background', 'faction', 'location', 'thing'];

    typeIds.forEach(type => {
        const container = document.getElementById(`workSettings${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (!container) return;

        const items = list.filter(s => s.type === type);
        if (items.length === 0) {
            container.innerHTML = `<div style="padding:6px 8px; font-size:12px; color:var(--text-muted);">暂无${typeMap[type]}设定</div>`;
        } else {
            container.innerHTML = items.map(s => `
                <div style="padding:6px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:12px; color:var(--text-secondary); margin-bottom:2px; display:flex; justify-content:space-between;" onclick="showSettingForm(${s.id})">
                    <span>${s.name}</span>
                </div>
            `).join('');
        }
    });
}

function renderWorkOutlines(list) {
    const container = document.getElementById('workOutlinesContainer');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<div style="padding:6px 8px; border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); cursor:pointer;" onclick="showToast(\'总纲编辑在Part3实现\', \'info\')">暂无总纲，点击新增</div>';
    } else {
        container.innerHTML = list.map(o => `
            <div style="padding:6px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:12px; color:var(--text-secondary); margin-bottom:2px; display:flex; justify-content:space-between;" onclick="showOutlineForm(${o.id})">
                <span>${o.title}</span>
            </div>
        `).join('');
    }
}

// ========== 展开/折叠状态管理 ==========
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const toggle = document.getElementById(sectionId + 'Toggle');
    if (!section) return;

    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
    if (toggle) toggle.textContent = isHidden ? '⌄' : '›';

    // 保存到 localStorage
    if (currentWorkId) {
        const key = `jz_section_${currentWorkId}_${sectionId}`;
        localStorage.setItem(key, isHidden ? 'expanded' : 'collapsed');
    }
}

function restoreSectionState() {
    if (!currentWorkId) return;

    ['roleSection', 'settingSection'].forEach(sectionId => {
        const key = `jz_section_${currentWorkId}_${sectionId}`;
        const state = localStorage.getItem(key);
        if (state === 'collapsed') {
            const section = document.getElementById(sectionId);
            const toggle = document.getElementById(sectionId + 'Toggle');
            if (section) section.style.display = 'none';
            if (toggle) toggle.textContent = '›';
        }
    });
}

let chapterSortDesc = false;

function toggleChapterSort() {
    chapterSortDesc = !chapterSortDesc;
    const btn = document.getElementById('btnChapterSort');
    if (btn) btn.textContent = chapterSortDesc ? '↑' : '↓';
    if (currentWorkId) loadWritingPage();
}

function renderChapterList(chapters) {
    const container = document.getElementById('chapterList');
    if (!container) return;

    if (!chapters || chapters.length === 0) {
        container.innerHTML = '<div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">暂无章节</div>';
        return;
    }

    // 复制并排序
    const sorted = [...chapters];
    if (chapterSortDesc) {
        sorted.reverse();
    }

    // 按卷分组
    const volumes = {};
    const noVolume = [];
    sorted.forEach(ch => {
        if (ch.volume) {
            if (!volumes[ch.volume]) volumes[ch.volume] = [];
            volumes[ch.volume].push(ch);
        } else {
            noVolume.push(ch);
        }
    });

    let html = '';

    // 有卷名的章节
    Object.entries(volumes).forEach(([volumeName, volChapters]) => {
        html += `<div style="padding:6px 4px; font-size:11px; color:var(--text-muted); font-weight:600;">${volumeName}</div>`;
        volChapters.forEach(ch => {
            html += renderChapterItem(ch);
        });
    });

    // 无卷名的章节
    noVolume.forEach(ch => {
        html += renderChapterItem(ch);
    });

    container.innerHTML = html;
}

function renderChapterItem(ch) {
    const isActive = ch.id === currentChapterId;
    const activeStyle = isActive
        ? 'color:var(--accent); background:rgba(99,102,241,0.08);'
        : 'color:var(--text-secondary);';
    return `
        <div class="chapter-tree-item ${isActive ? 'active' : ''}" data-chapter-id="${ch.id}"
             draggable="true"
             style="padding:6px 8px 6px 16px; border-radius:var(--radius-sm); cursor:pointer; font-size:12px; margin-bottom:2px; display:flex; justify-content:space-between; align-items:center; ${activeStyle}"
             onclick="switchChapter(${ch.id}, '${ch.title.replace(/'/g, "\\'")}', this.dataset.content, this.dataset.outline)"
             data-content="${(ch.content || '').replace(/"/g, '&quot;').replace(/'/g, "&#39;")}"
             data-outline="${(ch.outline || '').replace(/"/g, '&quot;').replace(/'/g, "&#39;")}">
            <span style="display:flex; align-items:center; gap:6px;">
                <span style="color:var(--text-muted); cursor:grab; font-size:10px;">⋮⋮</span>
                ${ch.title}
            </span>
            <span style="display:flex; align-items:center; gap:4px;">
                <span class="chapter-word-count" style="font-size:11px; color:var(--text-muted);">${ch.wordCount || 0}字</span>
                <span style="font-size:10px; color:var(--text-muted); padding:1px 4px; border-radius:3px; cursor:pointer;"
                      onclick="event.stopPropagation(); renameChapter(${ch.id}, '${ch.title.replace(/'/g, "\\'")}')"
                      title="重命名">✏️</span>
                <span style="font-size:10px; color:var(--text-muted); padding:1px 4px; border-radius:3px; cursor:pointer;"
                      onclick="event.stopPropagation(); showChapterVersions(${ch.id})"
                      title="历史版本">🕐</span>
            </span>
        </div>
    `;
}

async function renameChapter(chapterId, currentTitle) {
    const newTitle = prompt('重命名章节', currentTitle);
    if (!newTitle || newTitle.trim() === '' || newTitle.trim() === currentTitle) return;
    try {
        await api(`/works/${currentWorkId}/chapters/${chapterId}`, {
            method: 'PUT',
            body: { title: newTitle.trim() }
        });
        showToast('重命名成功', 'success');
        // 刷新章节列表
        const res = await api(`/works/${currentWorkId}`);
        renderChapterList(res.chapterList || []);
        // 如果重命名的是当前章节，同步更新编辑器标题和 currentChapterTitle
        if (chapterId === currentChapterId) {
            currentChapterTitle = newTitle.trim();
            const editorTitle = document.getElementById('editorTitle');
            if (editorTitle) editorTitle.textContent = newTitle.trim();
        }
    } catch (err) {
        showToast('重命名失败: ' + err.message, 'danger');
    }
}

function switchChapter(chapterId, title, content, outline) {
    // 如果有未保存的内容，先保存
    if (currentChapterId && currentChapterId !== chapterId) {
        saveCurrentChapter(false);
        saveChapterOutline(false);
    }

    currentChapterId = chapterId;
    currentChapterTitle = title || '';

    // 更新章节列表高亮
    document.querySelectorAll('.chapter-tree-item[data-chapter-id]').forEach(el => {
        const isActive = parseInt(el.dataset.chapterId) === chapterId;
        el.classList.toggle('active', isActive);
        el.style.color = isActive ? 'var(--accent)' : 'var(--text-secondary)';
        el.style.background = isActive ? 'rgba(99,102,241,0.08)' : '';
    });

    // 更新编辑器内容
    const editorArea = document.getElementById('editorArea');
    const editorTitle = document.getElementById('editorTitle');
    const placeholder = document.getElementById('editorPlaceholder');

    if (editorTitle) editorTitle.textContent = title || '未命名章节';
    if (placeholder) placeholder.style.display = 'none';

    // 检查本地缓存
    const cache = loadLocalCache();
    if (cache && cache.content) {
        // 有本地缓存，优先恢复
        editorArea.innerHTML = cache.content;
        if (editorTitle) editorTitle.textContent = cache.title || title || '未命名章节';
        showToast('已恢复未保存的本地内容', 'warning');
    } else if (content) {
        // 如果内容不以h1开头，添加标题
        if (!content.trim().startsWith('<h1') && !content.trim().startsWith('<H1')) {
            editorArea.innerHTML = `<h1 style="font-size:28px; font-weight:700; margin-bottom:16px;">${title || ''}</h1><p>${content}</p>`;
        } else {
            editorArea.innerHTML = content;
        }
    } else {
        editorArea.innerHTML = `<h1 id="editorTitle" style="font-size:28px; font-weight:700; margin-bottom:16px;">${title || ''}</h1><p id="editorPlaceholder" style="color:var(--text-muted);">开始写作...</p>`;
    }

    // 重置本地缓存状态
    lastSavedContent = editorArea.innerHTML;
    setupLocalAutoSave();

    // 初始化撤销栈
    initEditorUndoStack();

    // 更新细纲编辑区
    const outlineInput = document.getElementById('chapterOutlineInput');
    const outlineCount = document.getElementById('outlineWordCount');
    if (outlineInput) {
        outlineInput.value = outline || '';
        updateOutlineWordCount();
    }

    showToast(`已切换到: ${title}`, 'info');
}

// ========== 跨章滚动 ==========
function toggleCrossChapterScroll(enabled) {
    isCrossChapterScrollEnabled = enabled;
    localStorage.setItem('jz_cross_chapter_scroll', enabled ? '1' : '0');
    showToast(enabled ? '跨章滚动已开启' : '跨章滚动已关闭', 'info');
}

function handleEditorScroll() {
    // 实时检查 checkbox 状态，确保即使变量不同步也能正确判断
    const checkbox = document.getElementById('crossChapterScroll');
    const enabled = checkbox ? checkbox.checked : isCrossChapterScrollEnabled;
    if (!enabled || isScrollingToNextChapter) return;
    const scrollContainer = document.getElementById('editorScrollContainer');
    if (!scrollContainer) return;

    const scrollBottom = scrollContainer.scrollTop + scrollContainer.clientHeight;
    const threshold = scrollContainer.scrollHeight - 100;

    if (scrollBottom >= threshold) {
        loadNextChapter();
    }
}

async function loadNextChapter() {
    if (!currentWorkId || !currentChapterId || !currentWorkData) return;

    const chapters = currentWorkData.chapters || currentWorkData.chapterList || [];
    if (chapters.length === 0) return;

    // 按orderIndex排序
    const sorted = [...chapters].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const currentIdx = sorted.findIndex(ch => ch.id === currentChapterId);
    if (currentIdx === -1 || currentIdx >= sorted.length - 1) return;

    const nextChapter = sorted[currentIdx + 1];
    isScrollingToNextChapter = true;

    // 先保存当前章节
    await saveCurrentChapter(false);

    // 加载下一章节内容
    try {
        const res = await api(`/works/${currentWorkId}/chapters`);
        const nextCh = res.find(ch => ch.id === nextChapter.id);
        if (!nextCh) {
            isScrollingToNextChapter = false;
            return;
        }

        // 切换章节
        currentChapterId = nextChapter.id;

        // 更新章节列表高亮
        document.querySelectorAll('.chapter-tree-item[data-chapter-id]').forEach(el => {
            const isActive = parseInt(el.dataset.chapterId) === currentChapterId;
            el.classList.toggle('active', isActive);
            el.style.color = isActive ? 'var(--accent)' : 'var(--text-secondary)';
            el.style.background = isActive ? 'rgba(99,102,241,0.08)' : '';
        });

        // 追加到编辑器（不替换，追加）
        const editorArea = document.getElementById('editorArea');
        if (editorArea) {
            const nextTitle = document.createElement('h1');
            nextTitle.style.cssText = 'font-size:28px; font-weight:700; margin-top:48px; margin-bottom:16px; padding-top:24px; border-top:2px solid var(--border);';
            nextTitle.textContent = nextCh.title || '未命名章节';
            editorArea.appendChild(nextTitle);

            if (nextCh.content) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = nextCh.content;
                while (tempDiv.firstChild) {
                    editorArea.appendChild(tempDiv.firstChild);
                }
            } else {
                const placeholder = document.createElement('p');
                placeholder.style.color = 'var(--text-muted)';
                placeholder.textContent = '（本章暂无内容）';
                editorArea.appendChild(placeholder);
            }

            // 滚动到新章节开始位置
            nextTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        lastSavedContent = '';
        setupLocalAutoSave();
        showToast(`已加载: ${nextCh.title || '下一章'}`, 'info');
    } catch (err) {
        showToast('加载下一章失败: ' + err.message, 'danger');
    } finally {
        isScrollingToNextChapter = false;
    }
}

function updateOutlineWordCount() {
    const input = document.getElementById('chapterOutlineInput');
    const countEl = document.getElementById('outlineWordCount');
    if (input && countEl) {
        const len = input.value.length;
        countEl.textContent = len + '字';
    }
}

// ========== 章节保存 ==========
let saveTimeout = null;
let isSaving = false;

// ========== 本地缓存 + 云端保存 ==========

let localSaveDebounceTimer = null;
let lastSavedContent = '';

function getLocalCacheKey() {
    return `jz_chapter_${currentWorkId}_${currentChapterId}`;
}

function saveLocalCache() {
    if (!currentWorkId || !currentChapterId) return;
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const content = editorArea.innerHTML;
    const title = document.getElementById('editorTitle')?.textContent || '';
    if (content === lastSavedContent) return;
    localStorage.setItem(getLocalCacheKey(), JSON.stringify({
        content,
        title,
        timestamp: Date.now()
    }));
}

function loadLocalCache() {
    if (!currentWorkId || !currentChapterId) return null;
    try {
        const data = localStorage.getItem(getLocalCacheKey());
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function clearLocalCache() {
    if (!currentWorkId || !currentChapterId) return;
    localStorage.removeItem(getLocalCacheKey());
}

// 编辑器 input 防抖保存到本地（2-3秒）
function setupLocalAutoSave() {
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    editorArea.addEventListener('input', () => {
        if (localSaveDebounceTimer) clearTimeout(localSaveDebounceTimer);
        localSaveDebounceTimer = setTimeout(() => {
            saveLocalCache();
        }, 2500);
    });
}

function updateSaveButtonState(state) {
    const btn = document.getElementById('btnSaveChapter');
    if (!btn) return;
    switch (state) {
        case 'saving':
            btn.textContent = '⏳ 保存中...';
            btn.style.color = 'var(--accent)';
            break;
        case 'saved':
            btn.textContent = '✓ 已保存';
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                if (!isContentDirty) {
                    btn.textContent = '💾 保存';
                    btn.style.color = '';
                }
            }, 2000);
            break;
        case 'unsaved':
            btn.textContent = '● 未保存';
            btn.style.color = 'var(--warning)';
            break;
        case 'error':
            btn.textContent = '✗ 保存失败';
            btn.style.color = 'var(--danger)';
            break;
        default:
            btn.textContent = '💾 保存';
            btn.style.color = '';
    }
}

async function saveCurrentChapter(showToastMsg = true, source = 'manual') {
    if (!currentWorkId || !currentChapterId || isSaving) return;

    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;

    const content = editorArea.innerHTML;
    const title = currentChapterTitle || '未命名';

    // 内容无变化则不保存
    if (content === lastSavedContent) return;

    isSaving = true;
    updateSaveButtonState('saving');
    try {
        await api(`/works/${currentWorkId}/chapters/${currentChapterId}`, {
            method: 'PUT',
            body: { title, content, source }
        });
        lastSavedContent = content;
        isContentDirty = false;
        clearLocalCache();
        if (showToastMsg) showToast('保存成功', 'success');
        updateSaveButtonState('saved');

        // 左侧章节列表不做任何同步，标题/字数仅在页面加载或手动重命名时更新
    } catch (err) {
        if (showToastMsg) showToast('保存失败: ' + err.message, 'danger');
        updateSaveButtonState('error');
        setTimeout(() => updateSaveButtonState('unsaved'), 2000);
    } finally {
        isSaving = false;
    }
}

// 自动保存（每30秒）
function setupAutoSave() {
    if (saveTimeout) clearInterval(saveTimeout);
    saveTimeout = setInterval(() => {
        if (currentWorkId && currentChapterId) {
            saveCurrentChapter(false, 'auto');
            saveChapterOutline(false);
        }
    }, 30000);
}

// ========== 细纲保存 ==========
async function saveChapterOutline(showToastMsg = true) {
    if (!currentWorkId || !currentChapterId) return;

    const outlineInput = document.getElementById('chapterOutlineInput');
    if (!outlineInput) return;

    const outline = outlineInput.value;
    const statusEl = document.getElementById('outlineSaveStatus');

    try {
        await api(`/works/${currentWorkId}/chapters/${currentChapterId}`, {
            method: 'PUT',
            body: { outline }
        });

        // 更新章节列表中的 data-outline
        const chapterEl = document.querySelector(`.chapter-tree-item[data-chapter-id="${currentChapterId}"]`);
        if (chapterEl) {
            chapterEl.dataset.outline = outline;
        }

        if (showToastMsg) {
            showToast('细纲已保存', 'success');
        }
        if (statusEl) {
            statusEl.textContent = '✓ 已保存';
            statusEl.style.color = 'var(--success)';
            setTimeout(() => {
                statusEl.textContent = '';
            }, 2000);
        }
    } catch (err) {
        if (showToastMsg) showToast('细纲保存失败: ' + err.message, 'danger');
    }
}

// ========== AI 工具调用 ==========
const TOOL_ICON_MAP = {
    continue: '✍️', polish: '🎨', expand: '📝', rewrite: '🔀', 'de-ai': '✏️',
    scene: '🏛️', dialogue: '💬', character: '👤', outline: '📋', 'chapter-outline': '📑',
    inspiration: '💡', conflict: '⚔️', foreshadow: '🎭', detect: '🔍', pacing: '🎵',
    hook: '🪝', titles: '🏷️', blurb: '📰'
};
const TOOL_COLOR_MAP = {
    continue: 'rgba(99,102,241,0.1)', polish: 'rgba(168,85,247,0.1)', expand: 'rgba(14,165,233,0.1)',
    rewrite: 'rgba(245,158,11,0.1)', 'de-ai': 'rgba(168,85,247,0.1)', scene: 'rgba(59,130,246,0.1)',
    dialogue: 'rgba(16,185,129,0.1)', character: 'rgba(34,197,94,0.1)', outline: 'rgba(99,102,241,0.1)',
    'chapter-outline': 'rgba(14,165,233,0.1)', inspiration: 'rgba(236,72,153,0.1)', conflict: 'rgba(239,68,68,0.1)',
    foreshadow: 'rgba(139,92,246,0.1)', detect: 'rgba(239,68,68,0.1)', pacing: 'rgba(245,158,11,0.1)',
    hook: 'rgba(20,184,166,0.1)', titles: 'rgba(20,184,166,0.1)', blurb: 'rgba(99,102,241,0.1)'
};

function getCustomTools() {
    try {
        return JSON.parse(localStorage.getItem('jiuzhang_custom_tools') || '[]');
    } catch { return []; }
}
function saveCustomTools(tools) {
    localStorage.setItem('jiuzhang_custom_tools', JSON.stringify(tools));
}

function switchToolTab(tab) {
    document.querySelectorAll('.tool-tab').forEach(t => {
        const active = t.dataset.tab === tab;
        t.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
        t.style.color = active ? 'var(--accent)' : 'var(--text-muted)';
        t.style.fontWeight = active ? '600' : '400';
        t.classList.toggle('active', active);
    });
    const officialEl = document.getElementById('toolTabOfficial');
    const customEl = document.getElementById('toolTabCustom');
    const debugEl = document.getElementById('toolTabPromptDebug');
    if (officialEl) officialEl.style.display = tab === 'official' ? 'block' : 'none';
    if (customEl) customEl.style.display = tab === 'custom' ? 'block' : 'none';
    if (debugEl) debugEl.style.display = tab === 'prompt-debug' ? 'block' : 'none';

    if (tab === 'prompt-debug') {
        loadPromptDebugTools();
    }
}

function renderToolLibrary() {
    const categories = { '写作辅助': 'toolGridWriting', '剧情设计': 'toolGridPlot', '分析优化': 'toolGridAnalysis', '包装运营': 'toolGridPackage' };
    Object.entries(categories).forEach(([cat, gridId]) => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        const tools = Object.entries(AI_TOOL_CONFIG).filter(([, cfg]) => cfg.category === cat);
        grid.innerHTML = tools.map(([key, cfg]) => `
            <div class="tool-card" data-tool="${key}" data-need-selection="${cfg.extra ? 'false' : (key === 'detect' || key === 'de-ai' || key === 'pacing' || key === 'hook' || key === 'polish' || key === 'expand' || key === 'rewrite' ? 'true' : 'false')}">
                <div class="tool-icon" style="background:${TOOL_COLOR_MAP[key] || 'rgba(99,102,241,0.1)'};">${TOOL_ICON_MAP[key] || '🔧'}</div>
                <div class="tool-name">${cfg.name}</div>
                <div class="tool-desc">${getToolShortDesc(key)}</div>
                <span class="tool-tag">${cat.slice(0,2)}</span>
            </div>
        `).join('');
        // 直接给官方工具卡片绑定点击事件
        grid.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', () => {
                const tool = card.dataset.tool;
                if (tool) showToolDetailModal(tool);
            });
        });
    });
    renderCustomTools();
}

function getToolShortDesc(key) {
    const descs = {
        continue: '基于上下文续写，保持人设文风',
        polish: '改善表达节奏，增强画面感',
        expand: '扩展短句为段落，补充细节',
        rewrite: '换风格叙事，保留剧情',
        'de-ai': '消除AI痕迹，更像真人',
        scene: '根据设定生成环境描写',
        dialogue: '生成符合人设的角色对话',
        character: '生成姓名外貌性格关系网',
        outline: '搭建世界观主线矛盾高潮',
        'chapter-outline': '总纲拆分为连续章节',
        inspiration: '卡文时给方向含冲突钩子',
        conflict: '升级矛盾让剧情更尖锐',
        foreshadow: '设计前后呼应的伏笔',
        detect: '逻辑文本敏感词全维度审计',
        pacing: '分析章节节奏给修改建议',
        hook: '优化开头提升留存率',
        titles: '生成多风格章节标题',
        blurb: '提炼卖点写吸引人简介'
    };
    return descs[key] || '';
}

function renderCustomTools() {
    const list = document.getElementById('customToolList');
    const empty = document.getElementById('customToolEmpty');
    const tools = getCustomTools();
    if (!list || !empty) return;
    if (tools.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    list.style.display = 'grid';
    empty.style.display = 'none';
    list.innerHTML = tools.map(t => `
        <div class="tool-card" data-tool="custom-${t.id}" data-need-selection="${t.needSelection || false}">
            <div class="tool-icon" style="background:rgba(99,102,241,0.1);">${t.icon || '🤖'}</div>
            <div class="tool-name">${escapeHtml(t.name)}</div>
            <div class="tool-desc">${escapeHtml(t.description || '自定义工具')}</div>
            <span class="tool-tag" style="background:var(--accent); color:white;">我的</span>
            <div class="custom-tool-actions" style="position:absolute; top:8px; right:8px; display:flex; gap:4px;" data-tool-id="${t.id}">
                <button class="custom-tool-edit-btn" style="padding:2px 6px; border:none; background:var(--bg-tertiary); border-radius:4px; font-size:11px; cursor:pointer; color:var(--text-muted);">编辑</button>
                <button class="custom-tool-delete-btn" style="padding:2px 6px; border:none; background:var(--bg-tertiary); border-radius:4px; font-size:11px; cursor:pointer; color:var(--danger);">删除</button>
            </div>
        </div>
    `).join('');

    // 直接给自定义工具卡片绑定点击事件（按钮 stopPropagation 会阻止卡片点击）
    list.querySelectorAll('.tool-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.custom-tool-actions')) return;
            const tool = card.dataset.tool;
            if (tool) showToolDetailModal(tool);
        });
    });

    // 用 JS 绑定编辑/删除事件（避免内联 onclick 的兼容性问题）
    list.querySelectorAll('.custom-tool-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.custom-tool-actions')?.dataset.toolId;
            if (id) editCustomTool(id);
        });
    });
    list.querySelectorAll('.custom-tool-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.custom-tool-actions')?.dataset.toolId;
            if (id) deleteCustomTool(id);
        });
    });
}

// ========== 提示词调试 ==========
let promptDebugTools = [];
let promptDebugCurrentKey = null;
let promptDebugCurrentDefault = '';
let promptDebugSource = 'custom';

async function loadPromptDebugTools() {
    const listEl = document.getElementById('promptDebugToolList');
    if (!listEl) return;

    const customItems = getCustomTools().map(t => ({
        key: 'custom-' + t.id,
        prompt: t.systemPrompt || '',
        defaultPrompt: '',
        isModified: false,
        source: 'custom',
        customId: t.id,
        name: t.name,
        icon: t.icon || '🤖',
        description: t.description || '',
    }));

    try {
        const data = await api('/ai/tool-prompts');
        const officialItems = (data.items || []).map(it => ({ ...it, source: 'official' }));
        promptDebugTools = [...customItems, ...officialItems];
        renderPromptDebugToolList();
    } catch (err) {
        promptDebugTools = customItems;
        renderPromptDebugToolList();
        if (customItems.length === 0) {
            listEl.innerHTML = `<div style="padding:8px; text-align:center; color:var(--danger); font-size:12px;">加载失败: ${escapeHtml(err.message || '')}</div>`;
        }
    }
}

function renderPromptDebugToolList() {
    const listEl = document.getElementById('promptDebugToolList');
    if (!listEl) return;

    const select = document.getElementById('promptDebugSourceSelect');
    if (select && select.value !== promptDebugSource) select.value = promptDebugSource;

    const items = promptDebugTools.filter(t =>
        promptDebugSource === 'custom' ? t.source === 'custom' : t.source !== 'custom'
    );

    const toolNames = {
        continue: 'AI 续写', polish: '文本润色', expand: '句子扩写', rewrite: 'AI 改写',
        'de-ai': '去AI味', scene: '场景描写', dialogue: '对话生成', character: '角色生成',
        outline: '总纲生成', 'chapter-outline': '章纲生成', inspiration: '灵感生成',
        conflict: '冲突升级', foreshadow: '伏笔设计', detect: 'AI 纠错',
        pacing: '节奏分析', hook: '开篇优化', titles: '标题生成', blurb: '简介生成'
    };

    const renderItem = (item) => {
        const isActive = item.key === promptDebugCurrentKey;
        const isModified = item.source !== 'custom' && item.isModified;
        const displayName = item.source === 'custom' ? (item.name || item.key) : (toolNames[item.key] || item.key);
        const icon = item.source === 'custom' ? (item.icon || '🤖') : (TOOL_ICON_MAP[item.key] || '🔧');
        return `
            <div class="prompt-debug-tool-item" data-key="${item.key}"
                 style="padding:8px 10px; margin-bottom:4px; border-radius:var(--radius-sm); cursor:pointer;
                        display:flex; align-items:center; justify-content:space-between; gap:6px;
                        background:${isActive ? 'var(--accent-soft, rgba(99,102,241,0.15))' : 'transparent'};
                        color:${isActive ? 'var(--accent)' : 'var(--text-secondary)'};
                        font-size:12px; border:1px solid ${isActive ? 'var(--accent)' : 'transparent'};"
                 onclick="selectPromptDebugTool('${item.key}')"
                 onmouseover="if(this.dataset.key!=='${promptDebugCurrentKey}'){this.style.background='var(--bg-hover)';}"
                 onmouseout="if(this.dataset.key!=='${promptDebugCurrentKey}'){this.style.background='transparent';}">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;"
                      title="${escapeHtml(displayName)}">
                    ${icon} ${escapeHtml(displayName)}
                </span>
                ${isModified ? '<span style="width:6px; height:6px; border-radius:50%; background:var(--warning); flex-shrink:0;" title="已修改"></span>' : ''}
            </div>
        `;
    };

    if (items.length === 0) {
        const emptyText = promptDebugSource === 'custom'
            ? '尚无自定义工具，去 AI 工具库创建'
            : '官方工具加载失败';
        listEl.innerHTML = `<div style="padding:16px 10px; text-align:center; color:var(--text-tertiary); font-size:12px; font-style:italic;">${emptyText}</div>`;
        return;
    }

    listEl.innerHTML = items.map(renderItem).join('');
}

function switchPromptDebugSource(source) {
    if (source !== 'custom' && source !== 'official') return;
    promptDebugSource = source;
    const select = document.getElementById('promptDebugSourceSelect');
    if (select && select.value !== source) select.value = source;

    const currentItem = promptDebugTools.find(t => t.key === promptDebugCurrentKey);
    const currentInOtherGroup = currentItem && (
        (source === 'custom' && currentItem.source !== 'custom') ||
        (source === 'official' && currentItem.source === 'custom')
    );
    if (!currentItem || currentInOtherGroup) {
        clearPromptDebugSelection();
    }

    renderPromptDebugToolList();
}

function clearPromptDebugSelection() {
    promptDebugCurrentKey = null;
    promptDebugCurrentDefault = '';
    const nameEl = document.getElementById('promptDebugToolName');
    const editor = document.getElementById('promptDebugEditor');
    const badge = document.getElementById('promptDebugModifiedBadge');
    const btnSave = document.getElementById('btnPromptSave');
    const btnReset = document.getElementById('btnPromptReset');
    const btnTest = document.getElementById('btnPromptTest');
    const resultEl = document.getElementById('promptDebugTestResult');
    if (nameEl) nameEl.textContent = '请选择一个工具';
    if (editor) {
        editor.value = '';
        editor.placeholder = '在左侧选择一个工具，查看和编辑其 system prompt...';
    }
    if (badge) badge.style.display = 'none';
    if (btnSave) btnSave.style.display = 'none';
    if (btnReset) btnReset.style.display = 'none';
    if (btnTest) btnTest.style.display = 'none';
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--text-muted);">点击「运行测试」查看效果</span>';
}

async function selectPromptDebugTool(key) {
    promptDebugCurrentKey = key;
    const item = promptDebugTools.find(t => t.key === key);
    if (!item) return;

    promptDebugCurrentDefault = item.defaultPrompt || '';

    renderPromptDebugToolList();

    const nameEl = document.getElementById('promptDebugToolName');
    const editor = document.getElementById('promptDebugEditor');
    const badge = document.getElementById('promptDebugModifiedBadge');
    const btnSave = document.getElementById('btnPromptSave');
    const btnReset = document.getElementById('btnPromptReset');
    const btnTest = document.getElementById('btnPromptTest');

    const toolNames = {
        continue: 'AI 续写', polish: '文本润色', expand: '句子扩写', rewrite: 'AI 改写',
        'de-ai': '去AI味', scene: '场景描写', dialogue: '对话生成', character: '角色生成',
        outline: '总纲生成', 'chapter-outline': '章纲生成', inspiration: '灵感生成',
        conflict: '冲突升级', foreshadow: '伏笔设计', detect: 'AI 纠错',
        pacing: '节奏分析', hook: '开篇优化', titles: '标题生成', blurb: '简介生成'
    };

    const isCustom = item.source === 'custom';
    const displayName = isCustom ? (item.name || key) : (toolNames[key] || key);

    if (nameEl) nameEl.textContent = displayName + ' · system prompt';
    if (editor) {
        editor.value = item.prompt;
        editor.placeholder = '';
    }
    if (badge) badge.style.display = (!isCustom && item.isModified) ? 'inline-block' : 'none';
    if (btnSave) btnSave.style.display = 'inline-block';
    if (btnReset) btnReset.style.display = (!isCustom && item.isModified) ? 'inline-block' : 'none';
    if (btnTest) btnTest.style.display = 'inline-block';

    const resultEl = document.getElementById('promptDebugTestResult');
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--text-muted);">点击「运行测试」查看效果</span>';
}

async function saveCurrentToolPrompt() {
    if (!promptDebugCurrentKey) return;
    const editor = document.getElementById('promptDebugEditor');
    if (!editor) return;
    const prompt = editor.value.trim();
    if (!prompt) {
        showToast('提示词不能为空', 'warning');
        return;
    }

    const item = promptDebugTools.find(t => t.key === promptDebugCurrentKey);
    if (!item) return;

    if (item.source === 'custom') {
        const tools = getCustomTools();
        const idx = tools.findIndex(t => t.id === item.customId);
        if (idx < 0) {
            showToast('自定义工具不存在或已被删除', 'danger');
            return;
        }
        tools[idx].systemPrompt = prompt;
        saveCustomTools(tools);
        item.prompt = prompt;
        showToast('提示词已保存', 'success');
        renderPromptDebugToolList();
        const customTabVisible = document.getElementById('toolTabCustom')?.style.display !== 'none';
        if (customTabVisible) renderCustomTools();
        return;
    }

    try {
        await api(`/ai/tool-prompts/${promptDebugCurrentKey}`, {
            method: 'PUT',
            body: { prompt }
        });
        showToast('提示词已保存', 'success');

        const idx = promptDebugTools.findIndex(t => t.key === promptDebugCurrentKey);
        if (idx >= 0) {
            promptDebugTools[idx].prompt = prompt;
            promptDebugTools[idx].isModified = prompt !== promptDebugTools[idx].defaultPrompt;
        }

        const badge = document.getElementById('promptDebugModifiedBadge');
        const btnReset = document.getElementById('btnPromptReset');
        const itm = promptDebugTools.find(t => t.key === promptDebugCurrentKey);
        if (badge) badge.style.display = itm?.isModified ? 'inline-block' : 'none';
        if (btnReset) btnReset.style.display = itm?.isModified ? 'inline-block' : 'none';
        renderPromptDebugToolList();
    } catch (err) {
        showToast('保存失败: ' + err.message, 'danger');
    }
}

async function resetCurrentToolPrompt() {
    if (!promptDebugCurrentKey) return;
    const item = promptDebugTools.find(t => t.key === promptDebugCurrentKey);
    if (item?.source === 'custom') {
        showToast('自定义工具没有默认提示词，可手动修改保存', 'info');
        return;
    }
    try {
        await api(`/ai/tool-prompts/${promptDebugCurrentKey}/reset`, { method: 'POST' });
        showToast('已恢复默认', 'success');

        const idx = promptDebugTools.findIndex(t => t.key === promptDebugCurrentKey);
        if (idx >= 0) {
            promptDebugTools[idx].prompt = promptDebugTools[idx].defaultPrompt;
            promptDebugTools[idx].isModified = false;
        }

        const editor = document.getElementById('promptDebugEditor');
        if (editor) editor.value = promptDebugTools[idx]?.defaultPrompt || '';

        const badge = document.getElementById('promptDebugModifiedBadge');
        const btnReset = document.getElementById('btnPromptReset');
        if (badge) badge.style.display = 'none';
        if (btnReset) btnReset.style.display = 'none';
        renderPromptDebugToolList();
    } catch (err) {
        showToast('恢复失败: ' + err.message, 'danger');
    }
}

async function resetAllToolPrompts() {
    if (!confirm('确定要恢复所有官方工具的默认提示词吗？自定义工具不受影响。')) return;
    try {
        await api('/ai/tool-prompts/reset', { method: 'POST' });
        showToast('官方提示词已恢复默认', 'success');
        promptDebugCurrentKey = null;

        const nameEl = document.getElementById('promptDebugToolName');
        const editor = document.getElementById('promptDebugEditor');
        const badge = document.getElementById('promptDebugModifiedBadge');
        const btnSave = document.getElementById('btnPromptSave');
        const btnReset = document.getElementById('btnPromptReset');
        const btnTest = document.getElementById('btnPromptTest');
        const resultEl = document.getElementById('promptDebugTestResult');

        if (nameEl) nameEl.textContent = '请选择一个工具';
        if (editor) {
            editor.value = '';
            editor.placeholder = '在左侧选择一个工具，查看和编辑其 system prompt...';
        }
        if (badge) badge.style.display = 'none';
        if (btnSave) btnSave.style.display = 'none';
        if (btnReset) btnReset.style.display = 'none';
        if (btnTest) btnTest.style.display = 'none';
        if (resultEl) resultEl.innerHTML = '<span style="color:var(--text-muted);">点击「运行测试」查看效果</span>';

        loadPromptDebugTools();
    } catch (err) {
        showToast('恢复失败: ' + err.message, 'danger');
    }
}

async function testCurrentToolPrompt() {
    if (!promptDebugCurrentKey) {
        showToast('请先选择一个工具', 'warning');
        return;
    }
    const editor = document.getElementById('promptDebugEditor');
    const inputEl = document.getElementById('promptDebugTestInput');
    const resultEl = document.getElementById('promptDebugTestResult');

    if (!editor || !inputEl || !resultEl) return;

    const prompt = editor.value.trim();
    const input = inputEl.value.trim();

    if (!prompt) {
        showToast('提示词不能为空', 'warning');
        return;
    }
    if (!input) {
        showToast('请输入测试内容', 'warning');
        return;
    }

    resultEl.innerHTML = '<div style="color:var(--text-muted);">⚡ AI 正在生成...</div>';

    try {
        const res = await fetch(`${API_BASE}/ai/tool-prompts/${promptDebugCurrentKey}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({ prompt, input, stream: true }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: '请求失败' }));
            resultEl.textContent = '测试失败: ' + (err.error || '未知错误');
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        fullText += delta;
                        resultEl.innerHTML = formatAiParagraphs(fullText);
                    } catch {
                        // ignore
                    }
                }
            }
        }

        resultEl.innerHTML = formatAiParagraphs(fullText);
        showToast('测试完成', 'success');
    } catch (err) {
        resultEl.textContent = '测试失败: ' + (err.message || '未知错误');
        showToast('测试失败', 'danger');
    }
}

// 工具详情弹窗（AI工具库页面点击卡片弹出）
async function showToolDetailModal(tool) {
    const toolNames = {
        continue: 'AI 续写', polish: '文本润色', expand: '句子扩写', rewrite: 'AI 改写',
        'de-ai': '去AI味', scene: '场景描写', dialogue: '对话生成', character: '角色生成',
        outline: '总纲生成', 'chapter-outline': '章纲生成', inspiration: '灵感生成',
        conflict: '冲突升级', foreshadow: '伏笔设计', detect: 'AI 纠错',
        pacing: '节奏分析', hook: '开篇优化', titles: '标题生成', blurb: '简介生成'
    };
    const toolDescs = {
        continue: '基于上下文续写小说内容，保持人设和文风一致',
        polish: '改善表达节奏，增强画面感，让文字更流畅',
        expand: '将短句扩展为完整段落，补充动作、环境、心理细节',
        rewrite: '在不改变剧情的前提下切换叙事风格',
        'de-ai': '消除AI痕迹，让文字读起来更像真人作者写的',
        scene: '根据场景设定生成生动、有沉浸感的环境描写',
        dialogue: '生成符合角色性格和场景需求的自然对话',
        character: '生成包含姓名、外貌、性格、关系网的角色设定卡',
        outline: '搭建完整的故事骨架：世界观、主线、矛盾、高潮',
        'chapter-outline': '将总纲拆分为连续的章节大纲',
        inspiration: '卡文时提供可写的方向，含冲突和钩子',
        conflict: '升级现有矛盾，让剧情更尖锐更有看点',
        foreshadow: '设计前后呼应的伏笔，增强故事层次感',
        detect: '全维度审计：逻辑、文本、敏感词、文风一致性',
        pacing: '分析章节节奏，给出修改建议',
        hook: '优化小说开头，提升读者留存率',
        titles: '生成多风格、吸引眼球的章节标题',
        blurb: '提炼作品卖点，写出吸引人的简介文案'
    };

    const isCustom = tool.startsWith('custom-');
    let name = toolNames[tool] || tool;
    let desc = toolDescs[tool] || '';
    let icon = TOOL_ICON_MAP[tool] || '🔧';
    let promptPreview = '加载中...';

    if (isCustom) {
        const customId = tool.slice(7);
        const custom = getCustomTools().find(t => t.id === customId);
        if (custom) {
            name = custom.name;
            desc = custom.description || '自定义工具';
            icon = custom.icon || '🤖';
            promptPreview = custom.systemPrompt || '无 system prompt';
        }
    }

    // 先显示弹窗（加载中状态）
    showModal(name, `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <div style="width:48px; height:48px; border-radius:var(--radius); background:${TOOL_COLOR_MAP[tool] || 'rgba(99,102,241,0.1)'}; display:flex; align-items:center; justify-content:center; font-size:24px;">${icon}</div>
            <div>
                <div style="font-size:15px; font-weight:600; color:var(--text-primary);">${name}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${desc}</div>
            </div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px;">当前 System Prompt</div>
            <div id="toolDetailPromptPreview" style="padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); line-height:1.6; max-height:160px; overflow-y:auto; white-space:pre-wrap;">${escapeHtml(promptPreview)}</div>
        </div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
            <button class="btn btn-primary" onclick="goToPromptDebug('${tool}')">🧪 调试提示词</button>
            <button class="btn btn-primary" onclick="this.closest('.jz-modal-overlay').remove(); runAiTool('${tool}');">▶ 直接使用</button>
        </div>
    `);

    // 异步加载官方工具的 prompt
    if (!isCustom) {
        try {
            const data = await api(`/ai/tool-prompts/${tool}`);
            const previewEl = document.querySelector('#toolDetailPromptPreview');
            if (previewEl) {
                previewEl.textContent = data.prompt || '暂无提示词';
                if (data.isModified) {
                    previewEl.style.border = '1px solid var(--warning)';
                    previewEl.insertAdjacentHTML('beforebegin', '<div style="font-size:11px; color:var(--warning); margin-bottom:4px;">⚠️ 该工具提示词已被自定义修改</div>');
                }
            }
        } catch (err) {
            const previewEl = document.querySelector('#toolDetailPromptPreview');
            if (previewEl) previewEl.textContent = '加载失败: ' + (err.message || '未知错误');
        }
    }
}

// 从工具详情弹窗跳转到提示词调试
async function goToPromptDebug(tool) {
    document.querySelector('.jz-modal-overlay')?.remove();
    switchToolTab('prompt-debug');
    await loadPromptDebugTools();
    const targetSource = tool.startsWith('custom-') ? 'custom' : 'official';
    if (promptDebugSource !== targetSource) switchPromptDebugSource(targetSource);
    selectPromptDebugTool(tool);
}

function showCreateAgentModal(editId) {
    const tools = getCustomTools();
    const existing = editId ? tools.find(t => t.id === editId) : null;
    showModal(editId ? '编辑工具' : '创建工具', `
        <div class="form-group">
            <label class="form-label">工具名称</label>
            <input type="text" class="form-input" id="agentName" placeholder="如：古风诗词助手" value="${existing ? escapeHtml(existing.name) : ''}">
        </div>
        <div class="form-group">
            <label class="form-label">图标</label>
            <input type="text" class="form-input" id="agentIcon" placeholder="如：🤖 🎭 📚" value="${existing ? escapeHtml(existing.icon) : '🤖'}" maxlength="2">
        </div>
        <div class="form-group">
            <label class="form-label">描述</label>
            <input type="text" class="form-input" id="agentDesc" placeholder="一句话说明这个工具的作用" value="${existing ? escapeHtml(existing.description || '') : ''}">
        </div>
        <div class="form-group">
            <label class="form-label">System Prompt（核心指令）</label>
            <textarea class="form-input" id="agentPrompt" rows="4" placeholder="定义这个角色和能力...>
如：你是一位专攻古风武侠的资深编辑，擅长...
" style="resize:vertical;">${existing ? escapeHtml(existing.systemPrompt || '') : ''}</textarea>
        </div>
        <div class="form-group">
            <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
                <input type="checkbox" id="agentNeedSelection" ${existing && existing.needSelection ? 'checked' : ''} style="accent-color:var(--accent);">
                <span>需要先选中文本才能调用</span>
            </label>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" id="agentSubmit">${editId ? '保存' : '创建'}</button>
        </div>
    `);
    setTimeout(() => {
        document.getElementById('agentSubmit')?.addEventListener('click', () => {
            const name = document.getElementById('agentName')?.value?.trim();
            const icon = document.getElementById('agentIcon')?.value?.trim() || '🤖';
            const description = document.getElementById('agentDesc')?.value?.trim();
            const systemPrompt = document.getElementById('agentPrompt')?.value?.trim();
            const needSelection = document.getElementById('agentNeedSelection')?.checked || false;
            if (!name) { showToast('请输入工具名称', 'warning'); return; }
            if (!systemPrompt) { showToast('请输入核心指令', 'warning'); return; }
            const allTools = getCustomTools();
            if (editId) {
                const idx = allTools.findIndex(t => t.id === editId);
                if (idx >= 0) {
                    allTools[idx] = { ...allTools[idx], name, icon, description, systemPrompt, needSelection };
                }
            } else {
                allTools.push({ id: 'agent_' + Date.now(), name, icon, description, systemPrompt, needSelection, createdAt: Date.now() });
            }
            saveCustomTools(allTools);
            document.querySelector('.jz-modal-overlay')?.remove();
            showToast(editId ? '工具已更新' : '工具创建成功', 'success');
            renderCustomTools();
            switchToolTab('custom');
        });
    }, 0);
}
function editCustomTool(id) { showCreateAgentModal(id); }
function deleteCustomTool(id) {
    const tool = getCustomTools().find(t => t.id === id);
    const name = tool ? tool.name : '这个工具';
    showModal('删除工具', `
        <p>确定要删除「${escapeHtml(name)}」吗？</p>
        <p style="color:var(--text-muted); font-size:13px; margin-top:8px;">删除后不可恢复。</p>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" style="background:var(--danger);" onclick="executeDeleteCustomTool('${id}'); this.closest('.jz-modal-overlay').remove();">确认删除</button>
        </div>
    `);
}

function executeDeleteCustomTool(id) {
    const tools = getCustomTools().filter(t => t.id !== id);
    saveCustomTools(tools);
    renderCustomTools();
    showToast('已删除', 'info');
}

const AI_TOOL_CONFIG = {
    continue:   { name: 'AI 续写',     route: '/ai/continue',   field: 'context', label: '前文内容', placeholder: '粘贴前文内容...', category: '写作辅助' },
    polish:     { name: '文本润色',   route: '/ai/polish',     field: 'text',    label: '原文', placeholder: '粘贴要润色的文本...', category: '写作辅助' },
    expand:     { name: '句子扩写',   route: '/ai/expand',     field: 'text',    label: '原文', placeholder: '粘贴要扩写的短句...', category: '写作辅助' },
    rewrite:    { name: 'AI 改写',    route: '/ai/rewrite',    field: 'text',    label: '原文', placeholder: '粘贴要改写的文本...', extra: { label: '目标风格', field: 'targetStyle', placeholder: '如：爽文风格、悬疑风格' }, category: '写作辅助' },
    'de-ai':    { name: '去AI味',     route: '/ai/de-ai',      field: 'text',    label: '原文', placeholder: '粘贴要去AI味的文本...', category: '写作辅助' },
    scene:      { name: '场景描写',   route: '/ai/scene',      field: 'scene',   label: '场景设定', placeholder: '如：雨夜古庙、星际飞船驾驶舱', extra: { label: '氛围', field: 'mood', placeholder: '如：阴森、浪漫、紧张' }, category: '写作辅助' },
    dialogue:   { name: '对话生成',   route: '/ai/dialogue',   field: 'characters', label: '角色设定', placeholder: '如：高冷剑修 vs 活泼医女', extra: { label: '场景背景', field: 'context', placeholder: '如：争夺灵草时的对峙' }, category: '写作辅助' },
    character:  { name: '角色生成',   route: '/ai/character',  field: 'role',    label: '角色定位', placeholder: '如：冷酷师尊、废柴逆袭主角', category: '剧情设计' },
    outline:    { name: '总纲生成',   route: '/ai/outline',    field: 'theme',   label: '主题', placeholder: '如：穿越者在修仙界开网吧', category: '剧情设计' },
    'chapter-outline': { name: '章纲生成', route: '/ai/chapter-outline', field: 'outline', label: '总纲', placeholder: '粘贴总纲内容...', extra: { label: '章节数', field: 'count', placeholder: '10' }, category: '剧情设计' },
    inspiration:{ name: '灵感生成',   route: '/ai/inspiration', field: 'problem', label: '卡文问题', placeholder: '如：主角该用什么方式逆袭？', category: '剧情设计' },
    conflict:   { name: '冲突升级',   route: '/ai/conflict',   field: 'context', label: '当前剧情', placeholder: '粘贴当前剧情梗概...', extra: { label: '升级强度', field: 'level', placeholder: '如：中等、剧烈' }, category: '剧情设计' },
    foreshadow: { name: '伏笔设计',   route: '/ai/foreshadow', field: 'context', label: '当前剧情', placeholder: '粘贴当前剧情...', extra: { label: '目标事件', field: 'target', placeholder: '如：主角后期发现自己是皇子' }, category: '剧情设计' },
    detect:     { name: 'AI 纠错',    route: '/ai/detect',     field: 'text',    label: '原文', placeholder: '粘贴要检测的文本...', category: '分析优化' },
    pacing:     { name: '节奏分析',   route: '/ai/pacing',     field: 'text',    label: '章节内容', placeholder: '粘贴要分析的章节内容...', category: '分析优化' },
    hook:       { name: '开篇优化',   route: '/ai/hook',       field: 'opening', label: '当前开篇', placeholder: '粘贴小说开头...', extra: { label: '题材', field: 'genre', placeholder: '如：玄幻、都市' }, category: '分析优化' },
    titles:     { name: '标题生成',   route: '/ai/titles',     field: 'content', label: '章节内容', placeholder: '粘贴章节内容摘要...', category: '包装运营' },
    blurb:      { name: '简介生成',   route: '/ai/blurb',      field: 'outline', label: '作品梗概', placeholder: '粘贴故事梗概...', extra: { label: '题材', field: 'genre', placeholder: '如：玄幻、悬疑' }, category: '包装运营' }
};

let lastAiTool = null;
let lastAiParams = null;

async function runAiTool(tool, needSelection = false) {
    let config = AI_TOOL_CONFIG[tool];
    let customTool = null;

    // 自定义工具
    if (!config && tool.startsWith('custom-')) {
        const customId = tool.slice(7);
        customTool = getCustomTools().find(t => t.id === customId);
        if (customTool) {
            config = {
                name: customTool.name,
                field: 'input',
                label: '输入内容',
                placeholder: '请输入需要处理的内容...'
            };
        }
    }

    if (!config) return;

    // 如果当前在写作页且有选中文本，自动填充
    let prefill = '';
    if (needSelection) {
        const sel = window.getSelection()?.toString().trim();
        if (sel) prefill = sel;
    }

    showModal(config.name, `
        ${prefill ? `<div style="margin-bottom:12px; padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:12px; color:var(--text-muted);">已自动填入编辑器中选中的文字 (${prefill.length}字)</div>` : ''}
        <div class="form-group">
            <label class="form-label">${config.label}</label>
            <textarea class="form-input" id="aiToolInput" rows="4" placeholder="${config.placeholder}">${prefill}</textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" id="aiToolSubmit">生成</button>
        </div>
    `);

    setTimeout(() => {
        document.getElementById('aiToolSubmit')?.addEventListener('click', async () => {
            const inputVal = document.getElementById('aiToolInput')?.value?.trim();
            if (!inputVal) {
                showToast('请输入内容', 'warning');
                return;
            }
            lastAiTool = tool;
            lastAiParams = { input: inputVal };
            document.querySelector('.jz-modal-overlay')?.remove();
            await executeAiTool(tool, { input: inputVal }, customTool);
        });
    }, 0);
}

async function executeAiTool(tool, body, customTool = null) {
    trackAiUsage();

    const resultArea = document.getElementById('aiToolResult');
    const resultTitle = document.getElementById('aiToolResultTitle');
    const resultContent = document.getElementById('aiToolResultContent');
    const resultLoading = document.getElementById('aiToolResultLoading');

    const toolName = customTool ? customTool.name : (AI_TOOL_CONFIG[tool]?.name || tool);

    if (resultArea) resultArea.style.display = 'block';
    if (resultTitle) resultTitle.textContent = toolName + ' - 生成结果';
    if (resultContent) resultContent.style.display = 'none';
    if (resultLoading) resultLoading.style.display = 'block';

    try {
        let data;
        if (customTool) {
            // 自定义工具走 chat 接口
            data = await api('/ai/chat', {
                method: 'POST',
                body: {
                    messages: [
                        { role: 'system', content: customTool.systemPrompt },
                        { role: 'user', content: body.input || '' }
                    ],
                    modelId: getActiveModelId()
                }
            });
            data = { content: data.content || '无结果' };
        } else {
            const config = AI_TOOL_CONFIG[tool];
            if (!config) throw new Error('工具配置不存在');
            data = await api(config.route, { method: 'POST', body: { ...body, modelId: getActiveModelId() } });
        }
        if (resultLoading) resultLoading.style.display = 'none';
        if (resultContent) {
            resultContent.style.display = 'block';
            resultContent.textContent = data.content || '无结果';
        }
    } catch (err) {
        if (resultLoading) resultLoading.style.display = 'none';
        if (resultContent) {
            resultContent.style.display = 'block';
            resultContent.textContent = '生成失败: ' + err.message;
        }
    }
}

// 重新生成
function retryAiTool() {
    if (lastAiTool && lastAiParams) {
        if (lastAiTool.startsWith('custom-')) {
            const customId = lastAiTool.slice(7);
            const customTool = getCustomTools().find(t => t.id === customId);
            executeAiTool(lastAiTool, lastAiParams, customTool);
        } else {
            executeAiTool(lastAiTool, lastAiParams);
        }
    }
}

// 通用 SSE 流式读取
async function streamSSE(url, body, onDelta, onDone, onError) {
    let fullText = '';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: '请求失败' }));
            onError?.(err.error || 'AI服务异常');
            return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content || '';
                        fullText += delta;
                        onDelta?.(fullText);
                    } catch {
                        // 忽略解析错误
                    }
                }
            }
        }
        onDone?.(fullText);
    } catch (err) {
        onError?.(err.message || '请求失败');
    }
}

// ========== 编辑器选中文字 AI 浮层 ==========
function setupEditorAiFloat() {
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;

    // 监听选区变化
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        let float = document.getElementById('editorAiFloat');

        if (!text || text.length < 2) {
            if (float) float.remove();
            return;
        }

        // 确保选区在编辑器内
        if (!editorArea.contains(sel.anchorNode)) {
            if (float) float.remove();
            return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        if (!float) {
            float = document.createElement('div');
            float.id = 'editorAiFloat';
            float.style.cssText = `
                position: fixed; z-index: 1000; display: flex; gap: 4px;
                padding: 4px 8px; background: #fff; border: 1px solid var(--border);
                border-radius: var(--radius-sm); box-shadow: var(--shadow);
                font-size: 12px; white-space: nowrap;
            `;
            document.body.appendChild(float);
        }

        float.innerHTML = `
            <button style="padding:3px 8px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px; font-size:11px;" onclick="quickRunAiTool('polish')">润色</button>
            <button style="padding:3px 8px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px; font-size:11px;" onclick="quickRunAiTool('expand')">扩写</button>
            <button style="padding:3px 8px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px; font-size:11px;" onclick="quickRunAiTool('rewrite')">改写</button>
            <button style="padding:3px 8px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px; font-size:11px;" onclick="sendSelectionToChat()">💬 对话</button>
            <button style="padding:3px 8px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px; font-size:11px;" onclick="quickRunAiTool('detect')">纠错</button>
            <button style="padding:3px 8px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px; font-size:11px;" onclick="quickRunAiTool('de-ai')">去AI味</button>
        `;

        float.style.left = (rect.left + rect.width / 2 - float.offsetWidth / 2) + 'px';
        float.style.top = (rect.top - float.offsetHeight - 8) + 'px';
    });

    // 点击其他地方隐藏浮层
    document.addEventListener('mousedown', (e) => {
        const float = document.getElementById('editorAiFloat');
        if (float && !float.contains(e.target)) {
            float.remove();
        }
    });
}

// 从编辑器选区快速调用 AI 工具（直接生成，不弹输入框）
async function quickRunAiTool(tool) {
    const sel = window.getSelection()?.toString().trim();
    if (!sel) {
        showToast('请先选中文字', 'warning');
        return;
    }
    const config = AI_TOOL_CONFIG[tool];
    if (!config) return;

    trackAiUsage();
    showToast(`${config.name}中...`, 'info');

    // 隐藏编辑器浮层
    document.getElementById('editorAiFloat')?.remove();

    // 先展示空弹窗（加载状态）
    showModal(config.name, `
        <div style="margin-bottom:8px;"><span style="font-size:12px; color:var(--text-muted);">原文（${sel.length}字）</span></div>
        <div style="padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); line-height:1.5; max-height:80px; overflow-y:auto; margin-bottom:12px;">${escapeHtml(sel)}</div>
        <div id="quickToolResult" style="min-height:60px; max-height:300px; overflow-y:auto; line-height:1.8; color:var(--text-secondary); font-size:13px; white-space:pre-wrap;"><div style="color:var(--text-muted);">⚡ AI 正在生成...</div></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
            <button class="btn btn-primary" id="btnQuickToolCopy">📋 复制</button>
            <button class="btn btn-primary" id="btnQuickToolReplace" style="display:none;">✓ 替换原文</button>
        </div>
    `);

    const body = { [config.field]: sel };
    await streamSSE(`${API_BASE}${config.route}`, { ...body, stream: true, modelId: getActiveModelId() },
        (text) => {
            const el = document.getElementById('quickToolResult');
            if (el) el.innerHTML = formatAiParagraphs(text);
        },
        (text) => {
            const el = document.getElementById('quickToolResult');
            if (el) el.innerHTML = formatAiParagraphs(text);
            // 显示替换按钮
            const replaceBtn = document.getElementById('btnQuickToolReplace');
            if (replaceBtn) replaceBtn.style.display = 'inline-block';
            // 替换类工具：注入差异对比面板
            if (['polish', 'expand', 'rewrite', 'de-ai'].includes(tool)) {
                injectDiffPanel('quickToolResult', sel);
            }
            showToast(`${config.name}完成`, 'success');
        },
        (err) => {
            const el = document.getElementById('quickToolResult');
            if (el) el.textContent = '生成失败: ' + err;
        }
    );

    // 绑定复制按钮
    setTimeout(() => {
        document.getElementById('btnQuickToolCopy')?.addEventListener('click', () => {
            const text = document.getElementById('quickToolResult')?.textContent || '';
            if (!text) { showToast('内容为空', 'warning'); return; }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success')).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
        });
        document.getElementById('btnQuickToolReplace')?.addEventListener('click', () => {
            const editorArea = document.getElementById('editorArea');
            if (!editorArea) return;
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const html = document.getElementById('quickToolResult')?.innerHTML || '';
                range.deleteContents();
                const fragment = document.createRange().createContextualFragment(html);
                range.insertNode(fragment);
                selection.removeAllRanges();
            }
            document.querySelector('.jz-modal-overlay')?.remove();
            showToast('已替换', 'success');
            if (currentWorkId && currentChapterId) saveCurrentChapter(false);
        });
    }, 0);
}

// 清除引用高亮（全局函数，供划词和@引用共用）
function clearRefHighlight() {
    if (refSpanId) {
        const span = document.getElementById(refSpanId);
        if (span) {
            const parent = span.parentNode;
            if (parent) {
                while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
            }
        }
        refSpanId = null;
    }
    document.querySelectorAll('.ref-highlight').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
            while (el.firstChild) {
                parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
        }
    });
}

// 将编辑器选中文字发送到 AI 对话输入框
function sendSelectionToChat() {
    const selText = window.getSelection()?.toString().trim();
    if (!selText) {
        showToast('请先选中文字', 'warning');
        return;
    }

    // 清除之前的引用高亮
    clearRefHighlight();

    // 给选中的正文内容添加置灰高亮
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        try {
            const span = document.createElement('span');
            span.id = 'ref-highlight-' + Date.now();
            span.className = 'ref-highlight';
            span.style.cssText = 'background:rgba(99,102,241,0.15); color:var(--text-muted);';
            refSpanId = span.id;
            range.surroundContents(span);
            // 将光标移到高亮 span 之后，防止后续输入继承高亮样式
            const afterRange = document.createRange();
            afterRange.setStartAfter(span);
            afterRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(afterRange);
        } catch (err) {
            console.warn('引用高亮失败（跨元素选中）', err);
        }
    }

    const chatInput = document.querySelector('.writing-workspace #aiChatInput');
    if (!chatInput) {
        showToast('请先打开 AI 对话面板', 'warning');
        return;
    }

    // 存储完整引用，UI显示精简版
    const quoteId = `q${++quoteCounter}`;
    // 防止泄漏：超过50个引用时清理最早的
    if (quoteStore.size > 50) {
        const firstKey = quoteStore.keys().next().value;
        quoteStore.delete(firstKey);
    }
    quoteStore.set(quoteId, selText);
    const displayText = selText.length > 30 ? selText.slice(0, 30) + '...' : selText;
    const refText = `@引用：「${displayText}」#${quoteId}\n`;
    const start = chatInput.selectionStart || 0;
    const end = chatInput.selectionEnd || 0;
    const before = chatInput.value.substring(0, start);
    const after = chatInput.value.substring(end);
    chatInput.value = before + refText + after;
    chatInput.focus();
    chatInput.selectionStart = chatInput.selectionEnd = start + refText.length;
    showToast('已发送到对话输入框', 'success');
    document.getElementById('editorAiFloat')?.remove();
}

// ========== 章节历史版本 ==========
async function showChapterVersions(chapterId) {
    if (!currentWorkId || !chapterId) return;
    try {
        const list = await api(`/works/${currentWorkId}/chapters/${chapterId}/versions`);
        if (!list || list.length === 0) {
            showToast('暂无历史版本', 'info');
            return;
        }

        const sourceLabels = { auto: '⚡ 自动保存', manual: '✋ 手动保存', local: '💾 本地缓存' };
        showModal('历史版本', `
            <div style="max-height:360px; overflow-y:auto;"
            >
                ${list.map((v, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); ${i === 0 ? 'background:rgba(99,102,241,0.05);' : ''}"
                    >
                        <div style="flex:1;"
                        >
                            <div style="font-size:12px; color:var(--text-primary); font-weight:500;"
                            >${sourceLabels[v.source] || v.source} · ${v.wordCount || 0}字</div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;"
                            >${formatTimeAgo(v.createdAt)}</div>
                        </div>
                        <div style="display:flex; gap:6px;"
                        >
                            <button class="btn btn-ghost btn-sm" onclick="previewChapterVersion(${chapterId}, ${v.id})"
                            >👁 预览</button>
                            <button class="btn btn-primary btn-sm" onclick="restoreChapterVersion(${chapterId}, ${v.id})"
                            >↩ 恢复</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `);
    } catch (err) {
        showToast('加载历史版本失败: ' + err.message, 'danger');
    }
}

async function previewChapterVersion(chapterId, versionId) {
    try {
        const v = await api(`/works/${currentWorkId}/chapters/${chapterId}/versions/${versionId}`);
        showModal('版本预览', `
            <div style="max-height:400px; overflow-y:auto; line-height:1.8; color:var(--text-secondary); font-size:13px; padding:8px 0;"
            >${formatAiParagraphs(v.content || '无内容')}</div>
            <div class="form-actions" style="margin-top:16px;"
            >
                <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()"
                >关闭</button>
                <button class="btn btn-primary" onclick="restoreChapterVersion(${chapterId}, ${versionId})"
                >↩ 恢复此版本</button>
            </div>
        `);
    } catch (err) {
        showToast('预览失败: ' + err.message, 'danger');
    }
}

async function restoreChapterVersion(chapterId, versionId) {
    try {
        await api(`/works/${currentWorkId}/chapters/${chapterId}/versions/${versionId}/restore`, { method: 'POST' });
        showToast('已恢复到该版本', 'success');
        document.querySelector('.jz-modal-overlay')?.remove();
        // 刷新当前章节内容
        const chapter = await api(`/works/${currentWorkId}/chapters/${chapterId}`);
        switchChapter(chapterId, chapter.title, chapter.content, chapter.outline);
    } catch (err) {
        showToast('恢复失败: ' + err.message, 'danger');
    }
}

// ========== AI 工具栏按钮行为 ==========

async function handleContinueText() {
    trackAiUsage();
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const content = editorArea.innerText.trim();
    if (!content || content === '在左侧章节列表中选择一个章节，或创建新章节') {
        showToast('编辑器为空，无法续写', 'warning');
        return;
    }
    showToast('AI 正在续写...', 'info');

    let finalContent = '';
    insertContinueResult('', '续写正文', (text) => {
        finalContent = text;
        const el = document.getElementById('continueResultText');
        if (el) el.innerHTML = formatAiParagraphs(text);
    }, () => {
        showToast('续写完成', 'success');
    });

    await streamSSE(`${API_BASE}/ai/continue`, { context: content, stream: true, modelId: getActiveModelId() },
        (text) => {
            const el = document.getElementById('continueResultText');
            if (el) el.innerHTML = formatAiParagraphs(text);
        },
        (text) => {
            finalContent = text;
            const el = document.getElementById('continueResultText');
            if (el) el.innerHTML = formatAiParagraphs(text);
            showToast('续写完成', 'success');
        },
        (err) => {
            const el = document.getElementById('continueResultText');
            if (el) el.textContent = '续写失败: ' + err;
        }
    );
}

async function handleContinuePlot() {
    trackAiUsage();
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const content = editorArea.innerText.trim();
    if (!content || content === '在左侧章节列表中选择一个章节，或创建新章节') {
        showToast('编辑器为空，无法续写情节', 'warning');
        return;
    }
    showToast('AI 正在推演情节...', 'info');

    // 先显示空弹窗（加载状态）
    showModal('情节推演', `
        <div id="plotResultContent" style="max-height:400px; overflow-y:auto; line-height:1.8; color:var(--text-secondary); font-size:14px; padding:8px 0;"><div style="color:var(--text-muted);">⚡ AI 正在推演，请稍候...</div></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
            <button class="btn btn-primary" onclick="copyPlotResult()" id="btnCopyPlot">📋 复制</button>
        </div>
    `);

    await streamSSE(`${API_BASE}/ai/continue`, { context: content, style: 'plot', stream: true, modelId: getActiveModelId() },
        (text) => {
            const el = document.getElementById('plotResultContent');
            if (el) el.innerHTML = formatAiParagraphs(text);
        },
        (text) => {
            const el = document.getElementById('plotResultContent');
            if (el) el.innerHTML = formatAiParagraphs(text);
            showToast('情节推演完成', 'success');
        },
        (err) => {
            const el = document.getElementById('plotResultContent');
            if (el) el.textContent = '推演失败: ' + err;
        }
    );
}

function insertContinueResult(content, title, onUpdate, onDone) {
    // 移除已有的续写浮层
    document.getElementById('continueResultFloat')?.remove();

    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;

    const float = document.createElement('div');
    float.id = 'continueResultFloat';
    float.style.cssText = `
        position: fixed; z-index: 999; bottom: 24px; left: 50%; transform: translateX(-50%);
        width: 600px; max-width: 90vw; max-height: 300px;
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: var(--radius); box-shadow: var(--shadow);
        display: flex; flex-direction: column;
    `;
    const isLoading = !content;
    float.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid var(--border);">
            <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${title} 结果</span>
            <button onclick="document.getElementById('continueResultFloat').remove()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;">✕</button>
        </div>
        <div id="continueResultText" style="padding:12px 16px; overflow-y:auto; flex:1; line-height:1.8; color:var(--text-secondary); font-size:13px;">${isLoading ? '<div style="color:var(--text-muted); font-size:13px;">⚡ AI 正在生成，请稍候...</div>' : formatAiParagraphs(content)}</div>
        <div style="display:flex; gap:8px; padding:10px 16px; border-top:1px solid var(--border);">
            <button class="btn btn-primary btn-sm" id="btnInsertContinue" style="flex:1;">✓ 插入到末尾</button>
            <button class="btn btn-ghost btn-sm" id="btnCopyContinue">📋 复制</button>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('continueResultFloat').remove()">取消</button>
        </div>
    `;
    document.body.appendChild(float);

    document.getElementById('btnCopyContinue')?.addEventListener('click', () => {
        const text = document.getElementById('continueResultText')?.textContent || '';
        if (!text) { showToast('内容为空', 'warning'); return; }
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success')).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    });

    document.getElementById('btnInsertContinue')?.addEventListener('click', () => {
        const el = document.getElementById('continueResultText');
        const html = el?.innerHTML || '';
        // 移除 placeholder
        const placeholder = editorArea.querySelector('#editorPlaceholder');
        if (placeholder) placeholder.remove();
        // 插入渲染后的 HTML（保留 Markdown 格式）
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        while (tempDiv.firstChild) {
            editorArea.appendChild(tempDiv.firstChild);
        }
        float.remove();
        showToast('已插入到正文末尾', 'success');
        // 自动保存
        if (currentWorkId && currentChapterId) {
            saveCurrentChapter(false);
        }
    });
}

async function handleReplaceText() {
    trackAiUsage();
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const sel = window.getSelection()?.toString().trim();
    if (!sel || !editorArea.contains(window.getSelection().anchorNode)) {
        showToast('请先在编辑器中选中文本', 'warning');
        return;
    }
    showToast('AI 正在改写...', 'info');

    // 先显示空弹窗（加载状态）
    showReplaceModal(sel, '', true);

    await streamSSE(`${API_BASE}/ai/rewrite`, { text: sel, stream: true, modelId: getActiveModelId() },
        (text) => {
            const el = document.getElementById('replaceResultText');
            if (el) el.innerHTML = formatAiParagraphs(text);
        },
        (text) => {
            const el = document.getElementById('replaceResultText');
            if (el) el.innerHTML = formatAiParagraphs(text);
            injectDiffPanel('replaceResultText', sel);
            showToast('改写完成', 'success');
        },
        (err) => {
            const el = document.getElementById('replaceResultText');
            if (el) el.textContent = '改写失败: ' + err;
        }
    );
}

function showReplaceModal(original, rewritten, isLoading) {
    const resultHtml = isLoading || !rewritten
        ? '<div style="color:var(--text-muted);">⚡ AI 正在改写，请稍候...</div>'
        : formatAiParagraphs(rewritten);
    showModal('替换文本', `
        <div style="margin-bottom:12px;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">原文</div>
            <div style="padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:13px; color:var(--text-secondary); line-height:1.6; max-height:120px; overflow-y:auto;">${escapeHtml(original)}</div>
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">改写结果</div>
            <div id="replaceResultText" style="padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:13px; color:var(--text-secondary); line-height:1.6; max-height:200px; overflow-y:auto;">${resultHtml}</div>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" id="btnCopyReplace">📋 复制</button>
            <button class="btn btn-primary" id="btnApplyReplace">✓ 应用替换</button>
        </div>
    `);

    setTimeout(() => {
        document.getElementById('btnCopyReplace')?.addEventListener('click', () => {
            const text = document.getElementById('replaceResultText')?.textContent || '';
            if (!text) { showToast('内容为空', 'warning'); return; }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success')).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
        });
    }, 0);

    setTimeout(() => {
        document.getElementById('btnApplyReplace')?.addEventListener('click', () => {
            const editorArea = document.getElementById('editorArea');
            if (!editorArea) return;
            const resultEl = document.getElementById('replaceResultText');
            const html = resultEl?.innerHTML || '';
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const fragment = document.createRange().createContextualFragment(html);
                range.insertNode(fragment);
                sel.removeAllRanges();
            }
            document.querySelector('.jz-modal-overlay')?.remove();
            showToast('已替换选中文本', 'success');
            if (currentWorkId && currentChapterId) {
                saveCurrentChapter(false);
            }
        });
    }, 0);
}

async function handleDetectText() {
    trackAiUsage();
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const sel = window.getSelection()?.toString().trim();
    const text = sel || editorArea.innerText.trim();
    if (!text || text === '在左侧章节列表中选择一个章节，或创建新章节') {
        showToast('编辑器为空，无法检测', 'warning');
        return;
    }
    // 字数校验：去除HTML标签后计算纯文本
    const plainText = text.replace(/<[^>]+>/g, '').trim();
    if (plainText.length < 100) {
        showToast(`内容大于100字才可使用AI纠错功能（当前${plainText.length}字）`, 'warning');
        return;
    }
    showToast('AI 正在全维度审计...', 'info');

    // 隐藏编辑器浮层
    document.getElementById('editorAiFloat')?.remove();

    // SSE 流式弹窗
    showModal('AI 纠错（全维度深度审计）', `
        <div style="margin-bottom:8px;"><span style="font-size:12px; color:var(--text-muted);">原文（${plainText.length}字）</span></div>
        <div style="padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); line-height:1.5; max-height:80px; overflow-y:auto; margin-bottom:12px;">${escapeHtml(plainText.slice(0, 200))}${plainText.length > 200 ? '...' : ''}</div>
        <div id="detectResultContent" style="min-height:60px; max-height:400px; overflow-y:auto; line-height:1.8; color:var(--text-secondary); font-size:13px; white-space:pre-wrap;"><div style="color:var(--text-muted);">⚡ AI 正在审计...</div></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
            <button class="btn btn-ghost" id="btnDetectRegen" title="重新生成">🔄 重新生成</button>
            <button class="btn btn-ghost" id="btnDetectLike" title="赞" data-active="0">👍</button>
            <button class="btn btn-ghost" id="btnDetectDislike" title="踩" data-active="0">👎</button>
            <button class="btn btn-primary" id="btnDetectCopy">📋 复制</button>
        </div>
    `);

    await streamSSE(`${API_BASE}/ai/detect`, { text: plainText, stream: true, modelId: getActiveModelId() },
        (text) => {
            const el = document.getElementById('detectResultContent');
            if (el) el.innerHTML = formatAiParagraphs(text);
        },
        (text) => {
            const el = document.getElementById('detectResultContent');
            if (el) el.innerHTML = formatAiParagraphs(text);
            showToast('AI 纠错完成', 'success');
        },
        (err) => {
            const el = document.getElementById('detectResultContent');
            if (el) el.textContent = '纠错失败: ' + err;
        }
    );

    // 绑定按钮（复制 / 重新生成 / 点赞 / 点踩）
    setTimeout(() => {
        document.getElementById('btnDetectCopy')?.addEventListener('click', () => {
            const text = document.getElementById('detectResultContent')?.textContent || '';
            if (!text) { showToast('内容为空', 'warning'); return; }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success')).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
            console.log('[埋点]', { event: 'ai_detect_copy', timestamp: new Date().toISOString() });
        });
        document.getElementById('btnDetectRegen')?.addEventListener('click', () => {
            document.querySelector('.jz-modal-overlay')?.remove();
            handleDetectText();
            console.log('[埋点]', { event: 'ai_detect_regenerate', timestamp: new Date().toISOString() });
        });
        document.getElementById('btnDetectLike')?.addEventListener('click', (e) => {
            toggleFeedbackBtn(e.currentTarget, 'btnDetectDislike');
            console.log('[埋点]', { event: 'ai_detect_like', active: e.currentTarget.dataset.active === '1', timestamp: new Date().toISOString() });
        });
        document.getElementById('btnDetectDislike')?.addEventListener('click', (e) => {
            toggleFeedbackBtn(e.currentTarget, 'btnDetectLike');
            console.log('[埋点]', { event: 'ai_detect_dislike', active: e.currentTarget.dataset.active === '1', timestamp: new Date().toISOString() });
        });
    }, 0);
}

// 点赞/点踩按钮互斥切换
function toggleFeedbackBtn(btn, otherBtnId) {
    const active = btn.dataset.active === '1';
    btn.dataset.active = active ? '0' : '1';
    btn.style.background = active ? '' : 'var(--accent-soft, rgba(99,102,241,0.15))';
    btn.style.color = active ? '' : 'var(--accent)';
    if (otherBtnId && !active) {
        const other = document.getElementById(otherBtnId);
        if (other) {
            other.dataset.active = '0';
            other.style.background = '';
            other.style.color = '';
        }
    }
    showToast(active ? '已取消反馈' : '感谢反馈', 'info');
}

async function handleDeAiText() {
    trackAiUsage();
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const sel = window.getSelection()?.toString().trim();
    const text = sel || editorArea.innerText.trim();
    if (!text || text === '在左侧章节列表中选择一个章节，或创建新章节') {
        showToast('编辑器为空', 'warning');
        return;
    }
    const plainText = text.replace(/<[^>]+>/g, '').trim();
    showToast('正在去除AI味...', 'info');

    // 隐藏编辑器浮层
    document.getElementById('editorAiFloat')?.remove();

    // SSE 流式弹窗
    showModal('去AI味', `
        <div style="margin-bottom:8px;"><span style="font-size:12px; color:var(--text-muted);">原文（${plainText.length}字）</span></div>
        <div style="padding:8px; background:var(--bg-tertiary); border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); line-height:1.5; max-height:80px; overflow-y:auto; margin-bottom:12px;">${escapeHtml(plainText.slice(0, 200))}${plainText.length > 200 ? '...' : ''}</div>
        <div id="deAiResultContent" style="min-height:60px; max-height:400px; overflow-y:auto; line-height:1.8; color:var(--text-secondary); font-size:13px; white-space:pre-wrap;"><div style="color:var(--text-muted);">⚡ AI 正在重写...</div></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
            <button class="btn btn-ghost" id="btnDeAiRegen" title="重新生成">🔄 重新生成</button>
            <button class="btn btn-ghost" id="btnDeAiLike" title="赞" data-active="0">👍</button>
            <button class="btn btn-ghost" id="btnDeAiDislike" title="踩" data-active="0">👎</button>
            <button class="btn btn-primary" id="btnDeAiCopy">📋 复制</button>
            <button class="btn btn-primary" id="btnDeAiReplace" style="display:none;">✓ 替换原文</button>
        </div>
    `);

    await streamSSE(`${API_BASE}/ai/de-ai`, { text: plainText, stream: true, modelId: getActiveModelId() },
        (text) => {
            const el = document.getElementById('deAiResultContent');
            if (el) el.innerHTML = formatAiParagraphs(text);
        },
        (text) => {
            const el = document.getElementById('deAiResultContent');
            if (el) el.innerHTML = formatAiParagraphs(text);
            const replaceBtn = document.getElementById('btnDeAiReplace');
            if (replaceBtn) replaceBtn.style.display = 'inline-block';
            injectDiffPanel('deAiResultContent', plainText);
            showToast('去AI味完成', 'success');
        },
        (err) => {
            const el = document.getElementById('deAiResultContent');
            if (el) el.textContent = '失败: ' + err;
        }
    );

    // 绑定按钮（复制 / 替换 / 重新生成 / 点赞 / 点踩）
    setTimeout(() => {
        document.getElementById('btnDeAiCopy')?.addEventListener('click', () => {
            const text = document.getElementById('deAiResultContent')?.textContent || '';
            if (!text) { showToast('内容为空', 'warning'); return; }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showToast('已复制', 'success')).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
            console.log('[埋点]', { event: 'ai_de_ai_copy', timestamp: new Date().toISOString() });
        });
        document.getElementById('btnDeAiReplace')?.addEventListener('click', () => {
            const editorArea = document.getElementById('editorArea');
            if (!editorArea) return;
            const resultEl = document.getElementById('deAiResultContent');
            const html = resultEl?.innerHTML || '';
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const fragment = document.createRange().createContextualFragment(html);
                range.insertNode(fragment);
                sel.removeAllRanges();
            } else {
                // 没有选区，替换编辑器全部内容
                const titleEl = editorArea.querySelector('h1');
                const titleHtml = titleEl ? titleEl.outerHTML : '';
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                editorArea.innerHTML = titleHtml;
                while (tempDiv.firstChild) {
                    editorArea.appendChild(tempDiv.firstChild);
                }
            }
            document.querySelector('.jz-modal-overlay')?.remove();
            showToast('已替换文本', 'success');
            if (currentWorkId && currentChapterId) {
                saveCurrentChapter(false);
            }
        });
        document.getElementById('btnDeAiRegen')?.addEventListener('click', () => {
            document.querySelector('.jz-modal-overlay')?.remove();
            handleDeAiText();
            console.log('[埋点]', { event: 'ai_de_ai_regenerate', timestamp: new Date().toISOString() });
        });
        document.getElementById('btnDeAiLike')?.addEventListener('click', (e) => {
            toggleFeedbackBtn(e.currentTarget, 'btnDeAiDislike');
            console.log('[埋点]', { event: 'ai_de_ai_like', active: e.currentTarget.dataset.active === '1', timestamp: new Date().toISOString() });
        });
        document.getElementById('btnDeAiDislike')?.addEventListener('click', (e) => {
            toggleFeedbackBtn(e.currentTarget, 'btnDeAiLike');
            console.log('[埋点]', { event: 'ai_de_ai_dislike', active: e.currentTarget.dataset.active === '1', timestamp: new Date().toISOString() });
        });
    }, 0);
}

function formatAiParagraphs(text) {
    return parseMarkdownToHtml(text);
}

function copyPlotResult() {
    const text = document.getElementById('plotResultContent')?.textContent || '';
    if (!text) { showToast('内容为空', 'warning'); return; }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => showToast('已复制到剪贴板', 'success')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}


// ========== 查找替换 ==========
const findReplaceState = {
    matches: [],
    currentIdx: -1,
};

function openFindReplaceDialog() {
    const editorArea = document.getElementById('editorArea');
    if (!editorArea || editorArea.dataset.empty === '1' && !editorArea.innerText.trim()) {
        showToast('请先打开一个章节', 'warning');
        return;
    }
    if (document.getElementById('findReplacePanel')) {
        document.getElementById('frFindInput')?.focus();
        return;
    }
    const panel = document.createElement('div');
    panel.id = 'findReplacePanel';
    panel.style.cssText = 'position:fixed; top:80px; right:24px; width:320px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); box-shadow:0 8px 24px rgba(0,0,0,0.18); z-index:9999; padding:12px;';
    panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <span style="font-size:13px; font-weight:600; color:var(--text-primary);">查找替换</span>
            <button onclick="closeFindReplaceDialog()" style="border:none; background:transparent; color:var(--text-muted); font-size:16px; cursor:pointer; padding:2px 6px; border-radius:4px;" title="关闭 (Esc)">×</button>
        </div>
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:8px;">
            <input id="frFindInput" type="text" placeholder="查找..." style="flex:1; padding:6px 8px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); font-size:12px; outline:none;" />
            <span id="frCounter" style="font-size:11px; color:var(--text-muted); min-width:42px; text-align:right;">0/0</span>
        </div>
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:8px;">
            <input id="frReplaceInput" type="text" placeholder="替换为..." style="flex:1; padding:6px 8px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); font-size:12px; outline:none;" />
        </div>
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px; font-size:12px; color:var(--text-secondary);">
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input id="frCaseSensitive" type="checkbox" style="accent-color:var(--accent);" /> 区分大小写
            </label>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input id="frRegex" type="checkbox" style="accent-color:var(--accent);" /> 正则
            </label>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="findReplaceNavigate(-1)" class="btn btn-ghost" style="font-size:12px; padding:4px 10px;" title="上一个">↑</button>
            <button onclick="findReplaceNavigate(1)" class="btn btn-ghost" style="font-size:12px; padding:4px 10px;" title="下一个">↓</button>
            <button onclick="findReplaceCurrent()" class="btn btn-ghost" style="font-size:12px; padding:4px 10px;">替换</button>
            <button onclick="findReplaceAll()" class="btn btn-primary" style="font-size:12px; padding:4px 10px;">全部替换</button>
        </div>
    `;
    document.body.appendChild(panel);

    const findInput = document.getElementById('frFindInput');
    const replaceInput = document.getElementById('frReplaceInput');
    const caseChk = document.getElementById('frCaseSensitive');
    const regexChk = document.getElementById('frRegex');
    findInput.focus();
    findInput.addEventListener('input', findReplaceUpdate);
    caseChk.addEventListener('change', findReplaceUpdate);
    regexChk.addEventListener('change', findReplaceUpdate);
    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            findReplaceNavigate(e.shiftKey ? -1 : 1);
        } else if (e.key === 'Escape') {
            closeFindReplaceDialog();
        }
    });
    replaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            findReplaceCurrent();
        } else if (e.key === 'Escape') {
            closeFindReplaceDialog();
        }
    });
}

function closeFindReplaceDialog() {
    document.getElementById('findReplacePanel')?.remove();
    findReplaceState.matches = [];
    findReplaceState.currentIdx = -1;
}

function findReplaceUpdate() {
    const findInput = document.getElementById('frFindInput');
    const counter = document.getElementById('frCounter');
    const editorArea = document.getElementById('editorArea');
    if (!findInput || !counter || !editorArea) return;
    const query = findInput.value;
    findReplaceState.matches = [];
    findReplaceState.currentIdx = -1;
    if (!query) {
        counter.textContent = '0/0';
        return;
    }
    const caseSensitive = document.getElementById('frCaseSensitive')?.checked;
    const useRegex = document.getElementById('frRegex')?.checked;
    let regex;
    try {
        if (useRegex) {
            regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
        } else {
            const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(esc, caseSensitive ? 'g' : 'gi');
        }
    } catch (e) {
        counter.textContent = '正则错误';
        return;
    }
    const walker = document.createTreeWalker(editorArea, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
        const data = node.data;
        regex.lastIndex = 0;
        let m;
        while ((m = regex.exec(data)) !== null) {
            findReplaceState.matches.push({ node, start: m.index, length: m[0].length });
            if (m[0].length === 0) regex.lastIndex++;
        }
    }
    counter.textContent = findReplaceState.matches.length === 0 ? '0/0' : `1/${findReplaceState.matches.length}`;
    if (findReplaceState.matches.length > 0) {
        findReplaceState.currentIdx = 0;
        findReplaceFocusCurrent();
    }
}

function findReplaceNavigate(dir) {
    const matches = findReplaceState.matches;
    if (matches.length === 0) return;
    let idx = findReplaceState.currentIdx + dir;
    if (idx < 0) idx = matches.length - 1;
    if (idx >= matches.length) idx = 0;
    findReplaceState.currentIdx = idx;
    document.getElementById('frCounter').textContent = `${idx + 1}/${matches.length}`;
    findReplaceFocusCurrent();
}

function findReplaceFocusCurrent() {
    const m = findReplaceState.matches[findReplaceState.currentIdx];
    if (!m || !m.node || !m.node.parentNode) return;
    const range = document.createRange();
    try {
        range.setStart(m.node, m.start);
        range.setEnd(m.node, m.start + m.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        const rect = range.getBoundingClientRect();
        const editorArea = document.getElementById('editorArea');
        if (editorArea && rect) {
            const editorRect = editorArea.getBoundingClientRect();
            if (rect.top < editorRect.top + 50 || rect.bottom > editorRect.bottom - 50) {
                m.node.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }
    } catch (e) {}
}

function findReplaceCurrent() {
    const replaceInput = document.getElementById('frReplaceInput');
    if (!replaceInput) return;
    const m = findReplaceState.matches[findReplaceState.currentIdx];
    if (!m) return;
    const replaceText = replaceInput.value;
    const data = m.node.data;
    m.node.data = data.slice(0, m.start) + replaceText + data.slice(m.start + m.length);
    findReplaceUpdate();
    if (currentWorkId && currentChapterId) saveCurrentChapter(false);
}

function findReplaceAll() {
    const findInput = document.getElementById('frFindInput');
    const replaceInput = document.getElementById('frReplaceInput');
    const editorArea = document.getElementById('editorArea');
    if (!findInput || !replaceInput || !editorArea) return;
    const query = findInput.value;
    if (!query) return;
    const caseSensitive = document.getElementById('frCaseSensitive')?.checked;
    const useRegex = document.getElementById('frRegex')?.checked;
    let regex;
    try {
        if (useRegex) {
            regex = new RegExp(query, caseSensitive ? 'g' : 'gi');
        } else {
            const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(esc, caseSensitive ? 'g' : 'gi');
        }
    } catch (e) {
        showToast('正则错误', 'error');
        return;
    }
    const replaceText = replaceInput.value;
    const walker = document.createTreeWalker(editorArea, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    let count = 0;
    nodes.forEach(node => {
        const newData = node.data.replace(regex, (match) => {
            count++;
            return replaceText;
        });
        if (newData !== node.data) node.data = newData;
    });
    showToast(`已替换 ${count} 处`, 'success');
    findReplaceUpdate();
    if (count > 0 && currentWorkId && currentChapterId) saveCurrentChapter(false);
}


// ========== 导入作品（txt / word） ==========
const importState = {
    fileName: '',
    chapters: [],
    activeIdx: 0,
};

function openImportWorkDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'jz-modal-overlay';
    overlay.id = 'importWorkOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = `
        <div style="width:480px; max-width:92vw; background:var(--bg-secondary); border-radius:var(--radius-md); display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:15px; font-weight:600; color:var(--text-primary);">导入作品</span>
                <button onclick="document.getElementById('importWorkOverlay')?.remove()" style="border:none; background:transparent; color:var(--text-muted); font-size:20px; cursor:pointer; line-height:1;">×</button>
            </div>
            <div style="padding:24px 20px; display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div id="importDropZone" style="width:100%; padding:32px 20px; border:2px dashed var(--border); border-radius:var(--radius-md); display:flex; flex-direction:column; align-items:center; gap:12px; cursor:pointer; transition:border-color 0.2s;"
                    onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted);">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span style="font-size:14px; color:var(--text-secondary);">点击选择文件，或拖拽文件到此处</span>
                    <div style="display:flex; gap:6px;">
                        <span style="padding:2px 8px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">.txt</span>
                        <span style="padding:2px 8px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">.docx</span>
                        <span style="padding:2px 8px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">.doc</span>
                    </div>
                </div>
                <div style="width:100%; font-size:12px; color:var(--text-muted); line-height:1.8; text-align:left;">
                    <p>支持格式为 txt、word 格式，且文档名称会作为作品名称显示，最多显示为 15 个字，文件大小不超过 20M，请确保文件中章节名称独立一行，否则可能导出失败</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const dropZone = document.getElementById('importDropZone');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.docx,.doc';
    input.style.display = 'none';

    const processFile = async (file) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            showToast('文件大小不能超过 20MB', 'warning');
            return;
        }
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['txt', 'docx', 'doc'].includes(ext)) {
            showToast('仅支持 txt/docx/doc 格式', 'warning');
            return;
        }

        let text = '';
        try {
            if (ext === 'txt') {
                text = await file.text();
            } else {
                if (typeof mammoth === 'undefined') {
                    showToast('Word 解析库加载中，请稍后重试', 'warning');
                    return;
                }
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            }
        } catch (err) {
            showToast('文件读取失败', 'error');
            return;
        }

        const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 15);
        importState.fileName = baseName;
        importState.chapters = splitChaptersFromText(text);
        importState.activeIdx = 0;
        if (importState.chapters.length === 0) {
            importState.chapters = [{ title: baseName || '正文', content: text.trim() }];
        }
        overlay.remove();
        showImportPreviewModal();
    };

    dropZone.addEventListener('click', () => input.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--border)'; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border)';
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    });
    input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        input.value = '';
    });
}

function splitChaptersFromText(text) {
    const lines = text.split(/\r?\n/);
    const chapterRegex = /^\s*(第\s*[一二三四五六七八九十百千万零〇0-9]+\s*[章卷回节集]\s*[\s:：·\.\-]?\s*.*|[Cc]hapter\s+\d+\s*[\s:：·\.\-]?\s*.*|[0-9]+\s*[、\.]\s*\S.*|序\s*[章曲言]?\s*.*|楔\s*子\s*.*|尾\s*声\s*.*|后\s*记\s*.*)$/;
    const result = [];
    let current = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line && line.length <= 50 && chapterRegex.test(line)) {
            if (current) result.push(current);
            current = { title: line, content: '' };
        } else {
            if (!current) {
                current = { title: '正文', content: '' };
            }
            current.content += rawLine + '\n';
        }
    }
    if (current) result.push(current);
    return result.map(c => ({ title: c.title.slice(0, 100), content: c.content.trim() })).filter(c => c.title || c.content);
}

function showImportPreviewModal() {
    const overlay = document.createElement('div');
    overlay.className = 'jz-modal-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998; display:flex; align-items:center; justify-content:center;';
    overlay.innerHTML = `
        <div style="width:880px; max-width:96vw; max-height:88vh; background:var(--bg-secondary); border-radius:var(--radius-md); display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:14px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="font-size:14px; font-weight:600; color:var(--text-primary);">导入作品预览</span>
                    <input id="importTitleInput" type="text" maxlength="15" placeholder="作品名（≤15字）" value="${escapeHtml(importState.fileName)}" style="padding:5px 10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); font-size:12px; width:200px; outline:none;" />
                </div>
                <button onclick="this.closest('.jz-modal-overlay').remove()" style="border:none; background:transparent; color:var(--text-muted); font-size:18px; cursor:pointer;">×</button>
            </div>
            <div style="flex:1; min-height:0; display:flex;">
                <div style="width:240px; border-right:1px solid var(--border); display:flex; flex-direction:column; flex-shrink:0;">
                    <div style="padding:8px 12px; font-size:12px; color:var(--text-muted); border-bottom:1px solid var(--border);">章节列表（<span id="importChapterCount">${importState.chapters.length}</span>）</div>
                    <div id="importChapterList" style="flex:1; overflow-y:auto; padding:6px;"></div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
                    <input id="importChapterTitleEdit" type="text" placeholder="章节标题" style="padding:8px 14px; border:none; border-bottom:1px solid var(--border); background:transparent; color:var(--text-primary); font-size:14px; font-weight:600; outline:none;" />
                    <textarea id="importChapterContentEdit" style="flex:1; min-height:300px; padding:14px; border:none; background:transparent; color:var(--text-secondary); font-size:13px; line-height:1.7; resize:none; outline:none; font-family:var(--font-serif);"></textarea>
                </div>
            </div>
            <div style="padding:12px 18px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <span id="importHint" style="font-size:12px; color:var(--text-muted);">点击章节查看/编辑；点击 × 删除</span>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
                    <button class="btn btn-primary" onclick="submitImportWork()">确认导入</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    renderImportChapterList();
    selectImportChapter(0);

    document.getElementById('importChapterTitleEdit').addEventListener('input', (e) => {
        if (importState.chapters[importState.activeIdx]) {
            importState.chapters[importState.activeIdx].title = e.target.value.slice(0, 100);
            renderImportChapterList();
        }
    });
    document.getElementById('importChapterContentEdit').addEventListener('input', (e) => {
        if (importState.chapters[importState.activeIdx]) {
            importState.chapters[importState.activeIdx].content = e.target.value;
        }
    });
}

function renderImportChapterList() {
    const list = document.getElementById('importChapterList');
    const counter = document.getElementById('importChapterCount');
    if (!list) return;
    list.innerHTML = importState.chapters.map((ch, idx) => `
        <div class="import-ch-item" data-idx="${idx}" style="padding:8px 10px; margin-bottom:4px; border-radius:var(--radius-sm); cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:8px; background:${idx === importState.activeIdx ? 'var(--accent-soft, rgba(99,102,241,0.15))' : 'transparent'}; color:${idx === importState.activeIdx ? 'var(--accent)' : 'var(--text-secondary)'}; font-size:12px;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${escapeHtml(ch.title || '(无标题)')}</span>
            <button data-idx="${idx}" style="border:none; background:transparent; color:var(--text-muted); cursor:pointer; padding:0 4px; font-size:14px;" title="删除">×</button>
        </div>
    `).join('');
    if (counter) counter.textContent = String(importState.chapters.length);
    list.querySelectorAll('.import-ch-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                e.stopPropagation();
                deleteImportChapter(parseInt(el.dataset.idx));
            } else {
                selectImportChapter(parseInt(el.dataset.idx));
            }
        });
    });
}

function selectImportChapter(idx) {
    if (idx < 0 || idx >= importState.chapters.length) return;
    importState.activeIdx = idx;
    const ch = importState.chapters[idx];
    document.getElementById('importChapterTitleEdit').value = ch.title || '';
    document.getElementById('importChapterContentEdit').value = ch.content || '';
    renderImportChapterList();
}

function deleteImportChapter(idx) {
    if (importState.chapters.length === 1) {
        showToast('至少保留一章', 'warning');
        return;
    }
    importState.chapters.splice(idx, 1);
    if (importState.activeIdx >= importState.chapters.length) {
        importState.activeIdx = importState.chapters.length - 1;
    }
    selectImportChapter(importState.activeIdx);
}

async function submitImportWork() {
    const titleInput = document.getElementById('importTitleInput');
    const title = (titleInput?.value || '').trim().slice(0, 15);
    if (!title) {
        showToast('请填写作品名称', 'warning');
        return;
    }
    if (importState.chapters.length === 0) {
        showToast('至少保留一章', 'warning');
        return;
    }
    showToast('正在导入...', 'info');
    try {
        const res = await api('/works/import', {
            method: 'POST',
            body: JSON.stringify({
                title,
                chapters: importState.chapters.map(ch => ({
                    title: (ch.title || '正文').slice(0, 100),
                    content: ch.content || '',
                })),
            }),
        });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast(`导入成功：${res.chapterCount} 章 / ${res.wordCount} 字`, 'success');
        if (typeof loadWorksList === 'function') loadWorksList();
    } catch (err) {
        showToast('导入失败：' + (err?.message || '未知错误'), 'error');
    }
}


// ========== 快捷键 ==========
document.addEventListener('keydown', (e) => {
    // Ctrl+S 保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentWorkId && currentChapterId) {
            saveCurrentChapter(true);
        }
    }
    // Ctrl+F 查找替换
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const editorArea = document.getElementById('editorArea');
        if (editorArea && document.querySelector('.writing-workspace')) {
            e.preventDefault();
            openFindReplaceDialog();
        }
    }
});

// ========== 章节表单 ==========
function showCreateChapterModal() {
    showModal('新增章节', `
        <div class="form-group">
            <label class="form-label">章节标题</label>
            <input type="text" class="form-input" id="newChapterTitle" placeholder="如：第一章" value="">
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            <button class="btn btn-primary" onclick="handleCreateChapter()">创建</button>
        </div>
    `);
}

async function handleCreateChapter() {
    const title = document.getElementById('newChapterTitle')?.value?.trim();
    if (!title) {
        showToast('请输入章节标题', 'warning');
        return;
    }
    try {
        await api(`/works/${currentWorkId}/chapters`, {
            method: 'POST',
            body: { title, content: '' }
        });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('章节创建成功', 'success');
        // 刷新章节列表
        const work = await api(`/works/${currentWorkId}`);
        renderChapterList(work.chapterList || []);
    } catch (err) {
        showToast(err.message || '创建失败', 'danger');
    }
}

// ========== 角色表单 ==========
async function showCharacterForm(characterId) {
    let char = { name: '', role: 'supporting', content: '' };
    if (characterId) {
        try {
            const list = await api(`/works/${currentWorkId}/characters`);
            char = list.find(c => c.id === characterId) || char;
        } catch (err) {
            showToast('加载角色失败', 'danger');
            return;
        }
    }

    const isEdit = !!characterId;
    showModal(isEdit ? '编辑角色' : '新增角色', `
        <div class="form-group">
            <label class="form-label">角色名称</label>
            <input type="text" class="form-input" id="charName" value="${char.name}" placeholder="角色名称">
        </div>
        <div class="form-group">
            <label class="form-label">角色类型</label>
            <select class="form-input" id="charRole">
                <option value="protagonist" ${char.role === 'protagonist' ? 'selected' : ''}>主要角色</option>
                <option value="supporting" ${char.role === 'supporting' ? 'selected' : ''}>次要角色</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">角色设定</label>
            <textarea class="form-input" id="charContent" rows="4" placeholder="外貌、性格、背景、小传、台词等">${char.content}</textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            ${isEdit ? `<button class="btn btn-danger" style="background:var(--danger);" onclick="handleDeleteCharacter(${characterId})">删除</button>` : ''}
            <button class="btn btn-primary" onclick="handleSaveCharacter(${characterId || 'null'})">${isEdit ? '保存' : '创建'}</button>
        </div>
    `);
}

async function handleSaveCharacter(characterId) {
    const name = document.getElementById('charName')?.value?.trim();
    const role = document.getElementById('charRole')?.value;
    const content = document.getElementById('charContent')?.value || '';

    if (!name) {
        showToast('请输入角色名称', 'warning');
        return;
    }

    try {
        if (characterId) {
            await api(`/works/${currentWorkId}/characters/${characterId}`, {
                method: 'PUT',
                body: { name, role, content }
            });
        } else {
            await api(`/works/${currentWorkId}/characters`, {
                method: 'POST',
                body: { name, role, content }
            });
        }
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast(characterId ? '角色已保存' : '角色已创建', 'success');
        // 刷新列表
        const list = await api(`/works/${currentWorkId}/characters`);
        renderWorkCharacters(list);
    } catch (err) {
        showToast(err.message || '保存失败', 'danger');
    }
}

async function handleDeleteCharacter(characterId) {
    if (!confirm('确定要删除这个角色吗？')) return;
    try {
        await api(`/works/${currentWorkId}/characters/${characterId}`, { method: 'DELETE' });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('角色已删除', 'success');
        const list = await api(`/works/${currentWorkId}/characters`);
        renderWorkCharacters(list);
    } catch (err) {
        showToast(err.message || '删除失败', 'danger');
    }
}

// ========== 设定表单 ==========
async function showSettingForm(settingId) {
    let s = { name: '', type: 'background', content: '' };
    if (settingId) {
        try {
            const list = await api(`/works/${currentWorkId}/settings`);
            s = list.find(item => item.id === settingId) || s;
        } catch (err) {
            showToast('加载设定失败', 'danger');
            return;
        }
    }

    const isEdit = !!settingId;
    showModal(isEdit ? '编辑设定' : '新增设定', `
        <div class="form-group">
            <label class="form-label">设定名称</label>
            <input type="text" class="form-input" id="settingName" value="${s.name}" placeholder="设定名称">
        </div>
        <div class="form-group">
            <label class="form-label">设定类型</label>
            <select class="form-input" id="settingType">
                <option value="background" ${s.type === 'background' ? 'selected' : ''}>背景</option>
                <option value="faction" ${s.type === 'faction' ? 'selected' : ''}>势力</option>
                <option value="location" ${s.type === 'location' ? 'selected' : ''}>地点</option>
                <option value="thing" ${s.type === 'thing' ? 'selected' : ''}>物品</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">设定内容</label>
            <textarea class="form-input" id="settingContent" rows="4" placeholder="详细描述...">${s.content}</textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            ${isEdit ? `<button class="btn btn-danger" style="background:var(--danger);" onclick="handleDeleteSetting(${settingId})">删除</button>` : ''}
            <button class="btn btn-primary" onclick="handleSaveSetting(${settingId || 'null'})">${isEdit ? '保存' : '创建'}</button>
        </div>
    `);
}

async function handleSaveSetting(settingId) {
    const name = document.getElementById('settingName')?.value?.trim();
    const type = document.getElementById('settingType')?.value;
    const content = document.getElementById('settingContent')?.value || '';

    if (!name) {
        showToast('请输入设定名称', 'warning');
        return;
    }

    try {
        if (settingId) {
            await api(`/works/${currentWorkId}/settings/${settingId}`, {
                method: 'PUT',
                body: { name, type, content }
            });
        } else {
            await api(`/works/${currentWorkId}/settings`, {
                method: 'POST',
                body: { name, type, content }
            });
        }
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast(settingId ? '设定已保存' : '设定已创建', 'success');
        const list = await api(`/works/${currentWorkId}/settings`);
        renderWorkSettings(list);
    } catch (err) {
        showToast(err.message || '保存失败', 'danger');
    }
}

async function handleDeleteSetting(settingId) {
    if (!confirm('确定要删除这个设定吗？')) return;
    try {
        await api(`/works/${currentWorkId}/settings/${settingId}`, { method: 'DELETE' });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('设定已删除', 'success');
        const list = await api(`/works/${currentWorkId}/settings`);
        renderWorkSettings(list);
    } catch (err) {
        showToast(err.message || '删除失败', 'danger');
    }
}

// ========== 总纲表单 ==========
async function showOutlineForm(outlineId) {
    let o = { title: '总纲', content: '' };
    if (outlineId) {
        try {
            const list = await api(`/works/${currentWorkId}/outlines`);
            o = list.find(item => item.id === outlineId) || o;
        } catch (err) {
            showToast('加载总纲失败', 'danger');
            return;
        }
    }

    const isEdit = !!outlineId;
    showModal(isEdit ? '编辑总纲' : '新增总纲', `
        <div class="form-group">
            <label class="form-label">总纲标题</label>
            <input type="text" class="form-input" id="outlineTitle" value="${o.title}" placeholder="总纲标题">
        </div>
        <div class="form-group">
            <label class="form-label">总纲内容</label>
            <textarea class="form-input" id="outlineContent" rows="8" placeholder="故事主线、世界观、阶段目标、高潮、结局...">${o.content}</textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            ${isEdit ? `<button class="btn btn-danger" style="background:var(--danger);" onclick="handleDeleteOutline(${outlineId})">删除</button>` : ''}
            <button class="btn btn-primary" onclick="handleSaveOutline(${outlineId || 'null'})">${isEdit ? '保存' : '创建'}</button>
        </div>
    `);
}

async function handleSaveOutline(outlineId) {
    const title = document.getElementById('outlineTitle')?.value?.trim();
    const content = document.getElementById('outlineContent')?.value || '';

    if (!title) {
        showToast('请输入总纲标题', 'warning');
        return;
    }

    try {
        if (outlineId) {
            await api(`/works/${currentWorkId}/outlines/${outlineId}`, {
                method: 'PUT',
                body: { title, content }
            });
        } else {
            await api(`/works/${currentWorkId}/outlines`, {
                method: 'POST',
                body: { title, content }
            });
        }
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast(outlineId ? '总纲已保存' : '总纲已创建', 'success');
        const list = await api(`/works/${currentWorkId}/outlines`);
        renderWorkOutlines(list);
    } catch (err) {
        showToast(err.message || '保存失败', 'danger');
    }
}

async function handleDeleteOutline(outlineId) {
    if (!confirm('确定要删除这个总纲吗？')) return;
    try {
        await api(`/works/${currentWorkId}/outlines/${outlineId}`, { method: 'DELETE' });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('总纲已删除', 'success');
        const list = await api(`/works/${currentWorkId}/outlines`);
        renderWorkOutlines(list);
    } catch (err) {
        showToast(err.message || '删除失败', 'danger');
    }
}

// ========== 作品灵感（正文页展示） ==========
function renderWorkInspiration(text) {
    const contentEl = document.getElementById('workInspirationContent');
    if (!contentEl) return;
    if (!text || !text.trim()) {
        contentEl.innerHTML = '<span style="color:var(--text-muted); font-size:11px;">暂无作品灵感，可在作品详情中编辑</span>';
        return;
    }
    // 将换行转为 <br>
    contentEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
}

function toggleWorkInspiration() {
    const contentEl = document.getElementById('workInspirationContent');
    const toggleEl = document.getElementById('workInspirationToggle');
    if (!contentEl || !toggleEl) return;
    const isHidden = contentEl.style.display === 'none';
    contentEl.style.display = isHidden ? 'block' : 'none';
    toggleEl.textContent = isHidden ? '▼' : '▶';
    if (isHidden) {
        contentEl.style.maxHeight = '200px';
        contentEl.style.overflowY = 'auto';
    } else {
        contentEl.style.maxHeight = '60px';
        contentEl.style.overflow = 'hidden';
    }
}

function quoteWorkInspirationToChat() {
    const text = currentWorkData?.inspiration || '';
    if (!text.trim()) {
        showToast('暂无作品灵感可引用', 'warning');
        return;
    }
    const chatInput = document.querySelector('.writing-workspace #aiChatInput');
    if (!chatInput) {
        showToast('未找到AI对话面板', 'warning');
        return;
    }
    chatInput.value = '【作品灵感】\n' + text.trim() + '\n\n请基于以上灵感帮我写作：';
    chatInput.focus();
    const pos = chatInput.value.length;
    chatInput.setSelectionRange(pos, pos);
    showToast('已引用到AI对话，请输入具体指令', 'success');
}

// ========== 草稿 ==========
function renderWorkDrafts(list) {
    const container = document.getElementById('draftList');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">暂无草稿</div>`;
        return;
    }

    container.innerHTML = list.map(d => `
        <div style="padding:6px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:12px; color:var(--text-secondary); margin-bottom:2px; border:1px dashed var(--border);"
             onclick="showDraftForm(${d.id})">
            <div style="font-weight:500;">${d.title}</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${d.content.slice(0, 30)}${d.content.length > 30 ? '...' : ''}</div>
        </div>
    `).join('');
}

async function showDraftForm(draftId) {
    let d = { title: '', content: '' };
    if (draftId) {
        try {
            const list = await api(`/works/${currentWorkId}/drafts`);
            d = list.find(item => item.id === draftId) || d;
        } catch (err) {
            showToast('加载草稿失败', 'danger');
            return;
        }
    }

    const isEdit = !!draftId;
    showModal(isEdit ? '编辑草稿' : '新增草稿', `
        <div class="form-group">
            <label class="form-label">标题</label>
            <input type="text" class="form-input" id="draftTitle" value="${d.title}" placeholder="草稿标题">
        </div>
        <div class="form-group">
            <label class="form-label">内容</label>
            <textarea class="form-input" id="draftContent" rows="6" placeholder="草稿内容...">${d.content}</textarea>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
            ${isEdit ? `<button class="btn btn-danger" style="background:var(--danger);" onclick="handleDeleteDraft(${draftId})">删除</button>` : ''}
            <button class="btn btn-primary" onclick="handleSaveDraft(${draftId || 'null'})">${isEdit ? '保存' : '创建'}</button>
        </div>
    `);
}

async function handleSaveDraft(draftId) {
    const title = document.getElementById('draftTitle')?.value?.trim();
    const content = document.getElementById('draftContent')?.value || '';

    if (!title) {
        showToast('请输入标题', 'warning');
        return;
    }

    try {
        if (draftId) {
            await api(`/works/${currentWorkId}/drafts/${draftId}`, {
                method: 'PUT',
                body: { title, content }
            });
        } else {
            await api(`/works/${currentWorkId}/drafts`, {
                method: 'POST',
                body: { title, content }
            });
        }
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast(draftId ? '草稿已保存' : '草稿已创建', 'success');
        const list = await api(`/works/${currentWorkId}/drafts`);
        renderWorkDrafts(list);
    } catch (err) {
        showToast(err.message || '保存失败', 'danger');
    }
}

async function handleDeleteDraft(draftId) {
    if (!confirm('确定要删除这个草稿吗？')) return;
    try {
        await api(`/works/${currentWorkId}/drafts/${draftId}`, { method: 'DELETE' });
        document.querySelector('.jz-modal-overlay')?.remove();
        showToast('草稿已删除', 'success');
        const list = await api(`/works/${currentWorkId}/drafts`);
        renderWorkDrafts(list);
    } catch (err) {
        showToast(err.message || '删除失败', 'danger');
    }
}

// ========== AI 对话工具选择器（下拉面板）==========

// 官方推荐工具（在对话中快捷展示）
const OFFICIAL_CHAT_RECOMMENDATIONS = [
    { key: 'continue', name: '续写', icon: '✍️' },
    { key: 'polish', name: '润色', icon: '🎨' },
    { key: 'character', name: '角色', icon: '👤' },
    { key: 'detect', name: '纠错', icon: '🔍' },
    { key: 'de-ai', name: '去AI味', icon: '✏️' },
];

let chatToolDropdownOpen = false;

function initChatToolPicker() {
    const trigger = document.getElementById('chatToolTrigger');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChatToolDropdown();
    });

    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
        if (chatToolDropdownOpen && !e.target.closest('#chatToolPicker')) {
            closeChatToolDropdown();
        }
    });

    renderChatToolDropdown();
    updateChatToolTrigger();
}

function initChatModelPicker() {
    const trigger = document.getElementById('chatModelTrigger');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChatModelDropdown();
    });
    document.addEventListener('click', (e) => {
        if (chatModelDropdownOpen && !e.target.closest('#chatModelPicker')) {
            closeChatModelDropdown();
        }
    });
}

function toggleChatToolDropdown() {
    const dropdown = document.getElementById('chatToolDropdown');
    const arrow = document.getElementById('chatToolArrow');
    if (!dropdown) return;

    chatToolDropdownOpen = !chatToolDropdownOpen;
    dropdown.style.display = chatToolDropdownOpen ? 'flex' : 'none';
    if (arrow) arrow.style.transform = chatToolDropdownOpen ? 'rotate(180deg)' : '';

    if (chatToolDropdownOpen) {
        renderChatToolDropdown();
    }
}

function closeChatToolDropdown() {
    const dropdown = document.getElementById('chatToolDropdown');
    const arrow = document.getElementById('chatToolArrow');
    chatToolDropdownOpen = false;
    if (dropdown) dropdown.style.display = 'none';
    if (arrow) arrow.style.transform = '';
}

function renderChatToolDropdown() {
    const customContainer = document.getElementById('chatToolDropdownCustom');
    const officialContainer = document.getElementById('chatToolDropdownOfficial');
    if (!customContainer || !officialContainer) return;

    // 我的工具
    const customTools = getCustomTools();
    if (customTools.length === 0) {
        customContainer.innerHTML = `
            <div style="grid-column:1 / -1; padding:10px; color:var(--text-muted); font-size:12px; text-align:center; border-radius:8px; border:1px dashed var(--border); cursor:pointer;"
                 onclick="switchPage('ai-tools'); closeChatToolDropdown();"
                 onmouseover="this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'"
                 onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-muted)'">
                暂无工具，点击去创建 →
            </div>`;
    } else {
        customContainer.innerHTML = customTools.map(t => {
            const key = 'custom-' + t.id;
            const isActive = currentChatTool === 'custom' && currentCustomToolId === t.id;
            return makeDropdownItem(key, t.icon || '🤖', t.name, isActive);
        }).join('');
    }

    // 官方推荐（全部官方工具）
    const activeKey = currentChatTool === 'custom' && currentCustomToolId
        ? 'custom-' + currentCustomToolId
        : currentChatTool;

    officialContainer.innerHTML = OFFICIAL_SLASH_TOOLS.map(t => {
        const isActive = t.key === activeKey;
        return makeDropdownItem(t.key, t.icon, t.name, isActive);
    }).join('');

    // 绑定点击（选择后关闭面板）
    customContainer.querySelectorAll('.dropdown-tool-item').forEach(el => {
        el.addEventListener('click', () => {
            selectChatTool(el.dataset.tool);
            closeChatToolDropdown();
        });
    });
    officialContainer.querySelectorAll('.dropdown-tool-item').forEach(el => {
        el.addEventListener('click', () => {
            selectChatTool(el.dataset.tool);
            closeChatToolDropdown();
        });
    });
}

function makeDropdownItem(toolKey, icon, name, isActive) {
    return `
        <div class="dropdown-tool-item" data-tool="${toolKey}"
             style="padding:6px 4px; border-radius:8px; border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};
                    background:${isActive ? 'var(--accent)' : 'var(--bg-secondary)'};
                    color:${isActive ? 'white' : 'var(--text-secondary)'};
                    font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;
                    transition:all 0.15s; user-select:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; box-shadow:0 1px 2px rgba(0,0,0,0.06);"
             onmouseover="this.style.borderColor='var(--accent)'; this.style.background='var(--accent)'; this.style.color='white'; this.style.boxShadow='0 2px 6px rgba(0,0,0,0.12)';"
             onmouseout="this.style.borderColor='${isActive ? 'var(--accent)' : 'var(--border)'}'; this.style.background='${isActive ? 'var(--accent)' : 'var(--bg-secondary)'}'; this.style.color='${isActive ? 'white' : 'var(--text-secondary)'}'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.06)';"
             onmousedown="this.style.transform='scale(0.96)'"
             onmouseup="this.style.transform='scale(1)'"
             onclick="event.stopPropagation();"
        >
            <span>${icon}</span><span>${name}</span>
            ${isActive ? '<span style="font-size:10px; margin-left:2px;">✓</span>' : ''}
        </div>`;
}

function selectChatTool(toolKey) {
    if (toolKey.startsWith('custom-')) {
        currentChatTool = 'custom';
        currentCustomToolId = toolKey.slice(7);
    } else {
        currentChatTool = toolKey;
        currentCustomToolId = null;
    }

    // 同步下拉框
    const chatToolSelect = document.getElementById('chatToolSelect');
    if (chatToolSelect) chatToolSelect.value = toolKey;

    updateChatToolTrigger();

    const name = getChatToolDisplayName(toolKey);
    showToast('已选择：' + name, 'info');
}

// ========== 工具关键词映射（用于输入自动匹配）==========
const TOOL_KEYWORDS = {
    'continue': ['续写', '接着写', '往下写', '后面', '接下来', '延续', '接续', '接下去', '写下去', '后续'],
    'polish': ['润色', '优化', '改写好', '写得更好', '文笔', '表达', '修饰', '打磨', '精炼', '提升', '美化'],
    'expand': ['扩写', '扩展', '详细写', '写详细', '丰富', '充实', '展开', '详尽', '细化', '加长', '多写点'],
    'rewrite': ['改写', '重写', '换个写法', '换风格', '改写成', '用另一种', '换个方式', '变个说法', '换一种'],
    'de-ai': ['去AI味', '去ai味', '去ai', '自然化', '人味', '不像AI', 'AI味'],
    'scene': ['场景', '环境', '描写', '氛围', '画面', '场景描写'],
    'dialogue': ['对话', '台词', '说话', '交谈', '对白'],
    'character': ['角色', '人物', '人设', '角色设定', '创建角色', '生成人物', '角色档案', '人物介绍', '角色背景'],
    'outline': ['大纲', '提纲', '框架', '结构', '故事线', '剧情', '纲要', '总纲', '目录', '整体结构', '主线'],
    'chapter-outline': ['章纲', '章节', '本章', '这章', '章节目录', '单章', '章节大纲', '分章', '章回'],
    'inspiration': ['灵感', '创意', '想法', '点子', '脑洞', '题材', '故事灵感', '创意灵感', '想个故事', '编个剧情', '想不出'],
    'conflict': ['冲突', '矛盾', '升级', '激化', '对抗', '斗争', '冲突升级'],
    'foreshadow': ['伏笔', '铺垫', '暗示', '前后呼应', '草蛇灰线', '埋设'],
    'detect': ['检测', '纠错', '审稿', '检查', '看看这段', '帮我看看', '评价', '点评', '审校', '哪里不好', '问题', '错误'],
    'pacing': ['节奏', '快慢', '紧凑', '拖沓', '节奏分析', ' pacing'],
    'hook': ['开篇', '开头', '引入', '钩子', '吸引', '开篇优化', '前三章'],
    'titles': ['标题', '书名', '章节名', '起名', '取名', '命名', '书名推荐', '标题推荐', '叫什么好', '怎么起名'],
    'blurb': ['简介', '文案', '推荐语', '简介生成', '推荐'],
};

let semanticMatchTimer = null;

/** 调用后端AI语义匹配 */
async function callSemanticToolMatch(text) {
    try {
        const result = await api('/ai/tool-match', {
            method: 'POST',
            body: { text, modelId: getActiveModelId() },
        });
        if (result.tool && result.tool !== 'default' && result.confidence >= 0.6) {
            if (currentChatTool !== result.tool) {
                currentChatTool = result.tool;
                updateChatToolTrigger();
                console.log('[九章 语义推荐] AI匹配:', result.tool, '置信度:', result.confidence.toFixed(2));
            }
        }
    } catch (err) {
        console.log('[九章 语义推荐] 调用失败:', err.message);
    }
}

/** 根据输入自动匹配工具（关键词快速匹配 + AI语义兜底） */
function autoMatchToolFromInput(input) {
    const text = input.trim();
    if (!text) return;

    let bestTool = null;
    let bestScore = 0;

    for (const [toolKey, keywords] of Object.entries(TOOL_KEYWORDS)) {
        for (const keyword of keywords) {
            const score = scoreKeywordMatch(text, keyword);
            if (score > bestScore) {
                bestScore = score;
                bestTool = toolKey;
            }
        }
    }

    // 分数 >= 0.7：关键词高置信匹配，直接切换（零延迟）
    if (bestTool && bestScore >= 0.7) {
        if (currentChatTool !== bestTool) {
            currentChatTool = bestTool;
            updateChatToolTrigger();
            console.log('[九章 工具推荐] 关键词匹配:', bestTool, '分数:', bestScore.toFixed(2));
        }
        // 取消可能挂起的语义匹配
        if (semanticMatchTimer) {
            clearTimeout(semanticMatchTimer);
            semanticMatchTimer = null;
        }
        return;
    }

    // 分数 < 0.5 且输入有一定长度：触发AI语义匹配（debounce 500ms）
    if (bestScore < 0.5 && text.length >= 4) {
        if (semanticMatchTimer) clearTimeout(semanticMatchTimer);
        semanticMatchTimer = setTimeout(() => {
            callSemanticToolMatch(text);
        }, 500);
    } else {
        // 0.5 <= bestScore < 0.7：不切换也不触发AI，等用户表达更明确
        if (semanticMatchTimer) {
            clearTimeout(semanticMatchTimer);
            semanticMatchTimer = null;
        }
    }
}

/** 计算关键词匹配分数 */
function scoreKeywordMatch(input, keyword) {
    const s1 = input.toLowerCase();
    const s2 = keyword.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.startsWith(s2)) return 0.95;
    if (s1.includes(s2)) {
        return s1.endsWith(s2) ? 0.9 : 0.85;
    }
    if (s2.includes(s1)) {
        return 0.7 * (s1.length / s2.length);
    }

    // 字符重叠度
    const chars1 = s1.split('');
    const chars2 = s2.split('');
    let matches = 0;
    for (const c of chars1) {
        if (chars2.includes(c)) matches++;
    }
    return (matches / Math.max(s1.length, s2.length)) * 0.5;
}

function updateChatToolTrigger() {
    const triggerName = document.getElementById('chatToolTriggerName');
    if (!triggerName) return;

    const activeKey = currentChatTool === 'custom' && currentCustomToolId
        ? 'custom-' + currentCustomToolId
        : currentChatTool;

    if (!activeKey || activeKey === 'default') {
        triggerName.textContent = '默认工具';
    } else {
        triggerName.textContent = getChatToolDisplayName(activeKey);
    }
}

function getChatToolDisplayName(toolKey) {
    if (toolKey.startsWith('custom-')) {
        const tool = getCustomTools().find(t => t.id === toolKey.slice(7));
        return tool ? (tool.icon || '🤖') + ' ' + tool.name : '自定义工具';
    }
    const rec = OFFICIAL_CHAT_RECOMMENDATIONS.find(t => t.key === toolKey);
    if (rec) return rec.icon + ' ' + rec.name;
    const official = OFFICIAL_SLASH_TOOLS.find(t => t.key === toolKey);
    return official ? official.icon + ' ' + official.name : toolKey;
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();
});

// ========== 模型配置管理 ==========

async function loadModelConfigs() {
    try {
        const list = await api('/preset-models');
        modelConfigList = list || [];
        renderModelConfigs();
    } catch (err) {
        const el = document.getElementById('modelConfigList');
        if (el) el.innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger);">加载失败：' + escapeHtml(err.message) + '</div>';
    }
}

function renderModelConfigs() {
    const el = document.getElementById('modelConfigList');
    if (!el) return;

    if (modelConfigList.length === 0) {
        el.innerHTML = `
            <div class="card" style="text-align:center; padding:60px;">
                <div style="font-size:48px; margin-bottom:16px;">🤖</div>
                <div style="font-size:16px; color:var(--text-primary); margin-bottom:8px;">暂无可用模型</div>
                <div style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">请联系管理员配置 AI 模型</div>
            </div>
        `;
        return;
    }

    el.innerHTML = modelConfigList.map(cfg => {
        const isCurrent = cfg.id === currentModelId;
        return `
            <div class="card" style="margin-bottom:12px; padding:16px; ${isCurrent ? 'border-color:var(--accent); background:var(--accent-glow);' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                        <div style="font-size:16px; font-weight:600; color:var(--text-primary);">${escapeHtml(cfg.name)}</div>
                        ${cfg.isDefault ? '<span style="padding:2px 8px; border-radius:10px; background:var(--success); color:#fff; font-size:11px;">推荐</span>' : ''}
                        ${isCurrent ? '<span style="padding:2px 8px; border-radius:10px; background:var(--accent); color:#fff; font-size:11px;">当前使用</span>' : ''}
                        <span style="padding:2px 8px; border-radius:10px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">${escapeHtml(cfg.modelName)}</span>
                    </div>
                    <div>
                        ${!isCurrent ? `<button class="btn btn-primary btn-sm" onclick="selectTopbarModel('${cfg.id}')">选择当前模型</button>` : ''}
                    </div>
                </div>
                ${cfg.description ? `<div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(cfg.description)}</div>` : ''}
            </div>
        `;
    }).join('');
}

function showCreateModelConfigModal() {
    const providerOptions = Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) =>
        `<option value="${key}">${escapeHtml(cfg.label)}</option>`
    ).join('');

    showModal('添加 AI 模型', `
        <div style="max-height:70vh; overflow-y:auto; padding-right:4px;">
            <div class="form-group">
                <label class="form-label">模型名称 <span style="font-size:11px; color:var(--text-muted);">（自定义，如"我的GPT-4o"）</span></label>
                <input type="text" class="form-input" id="newModelName" placeholder="给模型起个名字" maxlength="50">
            </div>
            <div class="form-group">
                <label class="form-label">厂商 <span style="font-size:11px; color:var(--text-muted);">（选择后自动填充接口地址和推荐模型）</span></label>
                <select class="form-input" id="newModelProviderKey" onchange="onModelProviderChange('new')">
                    <option value="">-- 选择厂商 --</option>
                    ${providerOptions}
                </select>
            </div>
            <!-- 隐藏的 provider 字段（openai-compatible / anthropic） -->
            <input type="hidden" id="newModelProvider" value="openai-compatible">
            <div class="form-group">
                <label class="form-label">接口地址 <span style="font-size:11px; color:var(--text-muted);">（选完厂商已自动填入官方地址，用代理才需改）</span></label>
                <input type="text" class="form-input" id="newModelBaseUrl" placeholder="https://api.xxx.com/v1" onblur="sanitizeBaseUrl('new')">
                <div id="newModelBaseUrlHint" style="font-size:11px; color:var(--danger); margin-top:4px; display:none;"></div>
            </div>
            <div class="form-group">
                <label class="form-label">API Key</label>
                <input type="password" class="form-input" id="newModelApiKey" placeholder="sk-...">
            </div>
            <div class="form-group">
                <label class="form-label">模型标识 <span style="font-size:11px; color:var(--text-muted);">（选择厂商后自动推荐，可直接修改）</span></label>
                <input type="text" class="form-input" id="newModelModelName" placeholder="gpt-4o-mini">
            </div>
            <div class="form-actions">
                <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
                <button class="btn btn-primary" onclick="saveModelConfig()">保存</button>
            </div>
        </div>
    `);
}

function sanitizeBaseUrl(prefix) {
    const input = document.getElementById(prefix + 'ModelBaseUrl');
    const hint = document.getElementById(prefix + 'ModelBaseUrlHint');
    if (!input) return;

    let val = input.value.trim();
    if (!val) return;

    // 如果用户粘贴了 curl 命令，提取其中的 URL
    const curlMatch = val.match(/curl\s+['"]?([^\s'"]+)['"]?/i);
    if (curlMatch) {
        val = curlMatch[1];
        input.value = val;
        if (hint) {
            hint.textContent = '已自动从 curl 命令中提取 URL，请确认是否正确';
            hint.style.color = 'var(--warning)';
            hint.style.display = 'block';
        }
        return;
    }

    // 清理末尾多余的 /chat/completions
    if (val.includes('/chat/completions')) {
        val = val.split('/chat/completions')[0];
        input.value = val;
    }

    // 校验：必须以 http:// 或 https:// 开头
    if (!val.match(/^https?:\/\/.+/i)) {
        if (hint) {
            hint.textContent = '接口地址需要以 http:// 或 https:// 开头';
            hint.style.color = 'var(--danger)';
            hint.style.display = 'block';
        }
        return;
    }

    if (hint) hint.style.display = 'none';
}

function onModelProviderChange(prefix) {
    const key = document.getElementById(prefix + 'ModelProviderKey')?.value;
    const cfg = PROVIDER_CONFIGS[key];
    if (!cfg) return;

    const baseUrlEl = document.getElementById(prefix + 'ModelBaseUrl');
    const providerEl = document.getElementById(prefix + 'ModelProvider');
    const inputEl = document.getElementById(prefix + 'ModelModelName');

    if (baseUrlEl) baseUrlEl.value = cfg.baseUrl;
    if (providerEl) providerEl.value = cfg.provider;
    if (inputEl) inputEl.value = cfg.defaultModel;
}

function applyPresetModel(name, provider, baseUrl, modelName) {
    const nameEl = document.getElementById('newModelName');
    const baseUrlEl = document.getElementById('newModelBaseUrl');
    const modelNameEl = document.getElementById('newModelModelName');
    const providerEl = document.getElementById('newModelProvider');
    if (nameEl) nameEl.value = name;
    if (baseUrlEl) baseUrlEl.value = baseUrl;
    if (modelNameEl) modelNameEl.value = modelName;
    if (providerEl) providerEl.value = provider;
    // 尝试匹配厂商
    const matched = Object.entries(PROVIDER_CONFIGS).find(([_, cfg]) => cfg.baseUrl === baseUrl);
    if (matched) {
        const keyEl = document.getElementById('newModelProviderKey');
        if (keyEl) keyEl.value = matched[0];
        onModelProviderChange('new');
    }
    showToast('已填充：' + name + '，请填写 API Key', 'success');
}

async function showEditModelConfigModal(id) {
    try {
        const list = await api('/model-configs');
        const cfg = list.find(c => c.id === id);
        if (!cfg) return showToast('配置不存在', 'error');

        // 尝试匹配厂商
        let matchedKey = '';
        for (const [key, pcfg] of Object.entries(PROVIDER_CONFIGS)) {
            if (pcfg.provider === cfg.provider && (pcfg.baseUrl === cfg.baseUrl || cfg.baseUrl.includes(pcfg.baseUrl.replace('https://','').split('/')[0]))) {
                matchedKey = key;
                break;
            }
        }

        const providerOptions = Object.entries(PROVIDER_CONFIGS).map(([key, pcfg]) =>
            `<option value="${key}" ${key === matchedKey ? 'selected' : ''}>${escapeHtml(pcfg.label)}</option>`
        ).join('');

        showModal('编辑 AI 模型', `
            <div class="form-group">
                <label class="form-label">模型名称 <span style="font-size:11px; color:var(--text-muted);">（自定义）</span></label>
                <input type="text" class="form-input" id="editModelName" value="${escapeHtml(cfg.name)}" maxlength="50">
            </div>
            <div class="form-group">
                <label class="form-label">厂商</label>
                <select class="form-input" id="editModelProviderKey" onchange="onModelProviderChange('edit')">
                    <option value="">-- 选择厂商 --</option>
                    ${providerOptions}
                </select>
            </div>
            <input type="hidden" id="editModelProvider" value="${escapeHtml(cfg.provider)}">
            <div class="form-group">
                <label class="form-label">接口地址 <span style="font-size:11px; color:var(--text-muted);">（官方地址已自动填入，用代理才需改）</span></label>
                <input type="text" class="form-input" id="editModelBaseUrl" value="${escapeHtml(cfg.baseUrl)}" onblur="sanitizeBaseUrl('edit')">
                <div id="editModelBaseUrlHint" style="font-size:11px; color:var(--danger); margin-top:4px; display:none;"></div>
            </div>
            <div class="form-group">
                <label class="form-label">API Key <span style="font-size:11px; color:var(--text-muted);">（留空则保持不变）</span></label>
                <input type="password" class="form-input" id="editModelApiKey" placeholder="******">
            </div>
            <div class="form-group">
                <label class="form-label">模型标识 <span style="font-size:11px; color:var(--text-muted);">（选择厂商后自动推荐，可直接修改）</span></label>
                <input type="text" class="form-input" id="editModelModelName" value="${escapeHtml(cfg.modelName)}">
            </div>
            <div class="form-actions">
                <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
                <button class="btn btn-primary" onclick="saveModelConfig(${cfg.id})">保存</button>
            </div>
        `);
    } catch (err) {
        showToast('加载失败：' + err.message, 'error');
    }
}

async function saveModelConfig(id) {
    const isEdit = !!id;
    const prefix = isEdit ? 'edit' : 'new';
    const name = document.getElementById(prefix + 'ModelName')?.value?.trim();
    const provider = document.getElementById(prefix + 'ModelProvider')?.value || 'openai-compatible';
    const baseUrl = document.getElementById(prefix + 'ModelBaseUrl')?.value?.trim();
    const apiKey = document.getElementById(prefix + 'ModelApiKey')?.value?.trim();
    const modelName = document.getElementById(prefix + 'ModelModelName')?.value?.trim();

    if (!name) { showToast('请输入模型名称', 'warning'); return; }
    if (!baseUrl) { showToast('请输入接口地址', 'warning'); return; }
    if (!isEdit && !apiKey) { showToast('请输入 API Key', 'warning'); return; }
    if (!modelName) { showToast('请输入模型标识', 'warning'); return; }

    try {
        const body = { name, provider, baseUrl, apiKey, modelName };
        if (isEdit) {
            // 编辑时如果 apiKey 为空则不传
            if (!apiKey) delete body.apiKey;
            await api(`/model-configs/${id}`, { method: 'PUT', body });
            showToast('模型已更新', 'success');
        } else {
            await api('/model-configs', { method: 'POST', body });
            showToast('模型已添加', 'success');
        }
        document.querySelector('.jz-modal-overlay')?.remove();
        loadModelConfigs();
    } catch (err) {
        showToast('保存失败：' + err.message, 'error');
    }
}

async function deleteModelConfig(id) {
    if (!confirm('确定要删除这个模型配置吗？')) return;
    try {
        await api(`/model-configs/${id}`, { method: 'DELETE' });
        showToast('已删除', 'success');
        if (currentModelId === id) {
            currentModelId = null;
            localStorage.removeItem('jz_current_model_id');
        }
        loadModelConfigs();
    } catch (err) {
        showToast('删除失败：' + err.message, 'error');
    }
}

async function testModelConfig(id) {
    showToast('正在测试连接...', 'info');
    try {
        const result = await api(`/model-configs/${id}/test`, { method: 'POST' });
        showToast(result.message || '连接成功', 'success');
    } catch (err) {
        showToast('连接失败：' + err.message, 'error');
    }
}

async function setDefaultModelConfig(id) {
    try {
        await api(`/model-configs/${id}/set-default`, { method: 'POST' });
        showToast('已设为默认模型', 'success');
        loadModelConfigs();
    } catch (err) {
        showToast('设置失败：' + err.message, 'error');
    }
}

// 获取当前要使用的 modelId（用于 AI 调用）
function getActiveModelId() {
    return currentModelId;
}

/** 获取当前模型名称 */
function getCurrentModelName() {
    const cfg = modelConfigList.find(c => c.id === currentModelId);
    return cfg?.modelName || '';
}

/** 检查当前模型是否适合拆书（输出长度充足） */
function isModelSuitableForBookAnalysis() {
    const modelName = getCurrentModelName().toLowerCase();
    // 实测输出不完整、不推荐用于拆书的模型
    const unsuitable = [
        'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite',
        'gemini-3-flash-preview', 'gemini-3.1-pro-preview',
        'moonshot-v1-8k', 'qwen-turbo',
    ];
    return !unsuitable.some(name => modelName.includes(name));
}

/** 拆书前模型能力检查 */
function checkBookAnalysisModel() {
    if (isModelSuitableForBookAnalysis()) return true;
    const modelName = getCurrentModelName() || '当前模型';
    return confirm(
        `当前模型「${modelName}」的输出长度有限，拆书分析可能不完整（部分维度会被截断）。\n\n` +
        `建议更换为 gemini-2.5-pro、gpt-4o 或 claude-opus-4-5 等输出长度更充足的模型。\n\n` +
        `是否继续拆书？`
    );
}

// 加载并渲染写作页面的模型选择器（弹出面板形式）
async function loadModelSelector() {
    const listEl = document.getElementById('chatModelDropdownList');
    const triggerName = document.getElementById('chatModelTriggerName');
    if (!listEl) return;

    try {
        const list = await api('/preset-models');
        modelConfigList = list || [];

        // 恢复选中值
        const savedId = localStorage.getItem('jz_current_model_id');
        if (savedId && list.find(c => c.id === savedId)) {
            currentModelId = savedId;
        } else {
            const defaultCfg = list.find(c => c.isDefault);
            if (defaultCfg) {
                currentModelId = defaultCfg.id;
            } else {
                currentModelId = null;
            }
        }

        // 更新按钮名称
        const activeCfg = list.find(c => c.id === currentModelId);
        if (triggerName) {
            triggerName.textContent = activeCfg ? activeCfg.name : '默认模型';
        }

        // 构建弹出面板列表
        if (modelConfigList.length === 0) {
            listEl.innerHTML = `<div style="padding:12px; text-align:center; font-size:12px; color:var(--text-muted);">暂无可用模型</div>`;
            return;
        }
        let html = '';
        for (const cfg of modelConfigList) {
            const isActive = cfg.id === currentModelId;
            html += `<div class="chat-model-item" data-value="${cfg.id}" style="padding:8px 12px; cursor:pointer; font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; ${isActive ? 'background:var(--accent-soft, rgba(99,102,241,0.15)); color:var(--accent);' : ''}">
                <span>🤖</span><span>${escapeHtml(cfg.name)}${cfg.isDefault ? ' <span style="font-size:10px; color:var(--text-muted);">(推荐)</span>' : ''}</span>
            </div>`;
        }
        listEl.innerHTML = html;

        // 绑定点击事件
        listEl.querySelectorAll('.chat-model-item').forEach(item => {
            item.addEventListener('click', () => {
                const value = item.dataset.value;
                handleModelSelectChange(value);
                closeChatModelDropdown();
                loadModelSelector(); // 重新渲染以更新选中态
            });
        });
    } catch (err) {
        console.error('加载模型列表失败:', err);
        listEl.innerHTML = '<div style="padding:8px 12px; font-size:12px; color:var(--text-muted);">加载失败</div>';
    }
}

let chatModelDropdownOpen = false;
function toggleChatModelDropdown() {
    const dropdown = document.getElementById('chatModelDropdown');
    const arrow = document.getElementById('chatModelArrow');
    if (!dropdown) return;
    chatModelDropdownOpen = !chatModelDropdownOpen;
    dropdown.style.display = chatModelDropdownOpen ? 'flex' : 'none';
    if (arrow) arrow.style.transform = chatModelDropdownOpen ? 'rotate(180deg)' : '';
    if (chatModelDropdownOpen) {
        loadModelSelector();
    }
}
function closeChatModelDropdown() {
    const dropdown = document.getElementById('chatModelDropdown');
    const arrow = document.getElementById('chatModelArrow');
    if (dropdown) dropdown.style.display = 'none';
    if (arrow) arrow.style.transform = '';
    chatModelDropdownOpen = false;
}

// 渲染模型选择下拉框
function renderModelSelector(containerId, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (modelConfigList.length === 0) {
        container.innerHTML = `
            <select class="form-input" style="font-size:12px; padding:4px 8px; min-width:120px;">
                <option>使用环境变量配置</option>
            </select>
        `;
        return;
    }

    const defaultCfg = modelConfigList.find(c => c.isDefault);
    const activeId = currentModelId || (defaultCfg ? defaultCfg.id : modelConfigList[0]?.id);

    let html = `<select class="form-input" id="modelSelector" style="font-size:12px; padding:4px 8px; min-width:140px;"
        onchange="handleModelSelectChange(this.value)">
    `;
    // 环境变量回退选项
    html += `<option value="">使用环境变量配置</option>`;
    for (const cfg of modelConfigList) {
        const selected = cfg.id === activeId ? 'selected' : '';
        const label = cfg.isDefault ? `${cfg.name}（默认）` : cfg.name;
        html += `<option value="${cfg.id}" ${selected}>${escapeHtml(label)}</option>`;
    }
    html += '</select>';
    container.innerHTML = html;
}

function handleModelSelectChange(value) {
    currentModelId = value || null;
    if (currentModelId) {
        localStorage.setItem('jz_current_model_id', String(currentModelId));
    } else {
        localStorage.removeItem('jz_current_model_id');
    }
}

// 离开页面前检查未保存内容
window.addEventListener('beforeunload', (e) => {
    if (isContentDirty && currentWorkId && currentChapterId) {
        e.preventDefault();
        e.returnValue = '您有未保存的内容，确定要离开吗？';
        return e.returnValue;
    }
});
