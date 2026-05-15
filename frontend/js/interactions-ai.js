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
            ${isAdvancedMode() ? `<button class="btn btn-primary" onclick="goToPromptDebug('${tool}')">🧪 调试提示词</button>` : ''}
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
        const card = document.getElementById('aiToolResultCard');
        if (card) {
            createResultActionBar(card, {
                text: data.content || '',
                actions: ['copy', 'retry'],
                onRetry: () => retryAiTool()
            });
        }
    } catch (err) {
        if (resultLoading) resultLoading.style.display = 'none';
        if (resultContent) {
            resultContent.style.display = 'block';
            resultContent.textContent = '生成失败: ' + err.message;
        }
        const card = document.getElementById('aiToolResultCard');
        if (card) {
            createResultActionBar(card, {
                text: '生成失败: ' + err.message,
                actions: ['retry'],
                onRetry: () => retryAiTool()
            });
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
        <div id="quickToolActionBar" style="margin-top:10px;"></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
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
            const actionBarContainer = document.getElementById('quickToolActionBar');
            if (actionBarContainer) {
                const hasDiff = ['polish', 'expand', 'rewrite', 'de-ai'].includes(tool);
                createResultActionBar(actionBarContainer, {
                    text: text,
                    actions: hasDiff ? ['copy', 'replace', 'diff'] : ['copy', 'replace'],
                    originalText: sel,
                    resultSelector: '#quickToolResult',
                    onReplace: (txt, html) => {
                        const editorArea = document.getElementById('editorArea');
                        if (!editorArea) return;
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const fragment = document.createRange().createContextualFragment(html || ('<p>' + (typeof escapeHtml === 'function' ? escapeHtml(txt) : txt).replace(/\n/g, '</p><p>') + '</p>'));
                            range.insertNode(fragment);
                            selection.removeAllRanges();
                        }
                        document.querySelector('.jz-modal-overlay')?.remove();
                        showToast('已替换', 'success');
                        if (currentWorkId && currentChapterId) saveCurrentChapter(false);
                    }
                });
            }
            // 替换类工具：注入差异对比面板
            if (['polish', 'expand', 'rewrite', 'de-ai'].includes(tool)) {
                injectDiffPanel('quickToolResult', sel);
            }
            showToast(`${config.name}完成`, 'success');
        },
        (err) => {
            const el = document.getElementById('quickToolResult');
            if (el) el.textContent = '生成失败: ' + err;
            const actionBarContainer = document.getElementById('quickToolActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: '生成失败: ' + err,
                    actions: ['copy']
                });
            }
        }
    );
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

// ========== AI 工具栏按钮行为 ==========

async function handleContinueText() {
    trackAiUsage();
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const fullText = editorArea.innerText.trim();
    if (!fullText || fullText === '在左侧章节列表中选择一个章节，或创建新章节') {
        showToast('编辑器为空，无法续写', 'warning');
        return;
    }
    // 后端会根据模型上下文窗口动态截断，前端传全文
    const content = fullText;
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
            const actionBarContainer = document.getElementById('continueActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: finalContent,
                    actions: ['insert', 'copy'],
                    onInsert: (txt, html) => {
                        const editorArea = document.getElementById('editorArea');
                        if (!editorArea) return;
                        const placeholder = editorArea.querySelector('#editorPlaceholder');
                        if (placeholder) placeholder.remove();
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html || ('<p>' + (typeof escapeHtml === 'function' ? escapeHtml(txt) : txt).replace(/\n/g, '</p><p>') + '</p>');
                        while (tempDiv.firstChild) {
                            editorArea.appendChild(tempDiv.firstChild);
                        }
                        document.getElementById('continueResultFloat')?.remove();
                        showToast('已插入到正文末尾', 'success');
                        if (currentWorkId && currentChapterId) saveCurrentChapter(false);
                    }
                });
            }
        },
        (err) => {
            const el = document.getElementById('continueResultText');
            if (el) el.textContent = '续写失败: ' + err;
            const actionBarContainer = document.getElementById('continueActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: '续写失败: ' + err,
                    actions: ['copy']
                });
            }
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
        <div style="display:flex; gap:8px; padding:10px 16px; border-top:1px solid var(--border); align-items:center;">
            <div id="continueActionBar" style="display:flex; gap:8px; flex:1;"></div>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('continueResultFloat').remove()">取消</button>
        </div>
    `;
    document.body.appendChild(float);

    if (!isLoading) {
        const actionBarContainer = document.getElementById('continueActionBar');
        if (actionBarContainer) {
            createResultActionBar(actionBarContainer, {
                text: content,
                actions: ['insert', 'copy'],
                onInsert: (txt, html) => {
                    const placeholder = editorArea.querySelector('#editorPlaceholder');
                    if (placeholder) placeholder.remove();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html || ('<p>' + (typeof escapeHtml === 'function' ? escapeHtml(txt) : txt).replace(/\n/g, '</p><p>') + '</p>');
                    while (tempDiv.firstChild) {
                        editorArea.appendChild(tempDiv.firstChild);
                    }
                    float.remove();
                    showToast('已插入到正文末尾', 'success');
                    if (currentWorkId && currentChapterId) saveCurrentChapter(false);
                }
            });
        }
    }
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
            const actionBarContainer = document.getElementById('replaceActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: text,
                    actions: ['copy', 'replace', 'diff'],
                    originalText: sel,
                    resultSelector: '#replaceResultText',
                    onReplace: (txt, html) => {
                        const editorArea = document.getElementById('editorArea');
                        if (!editorArea) return;
                        const resultEl = document.getElementById('replaceResultText');
                        const resultHtml = resultEl?.innerHTML || html || '';
                        const selection = window.getSelection();
                        if (selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const fragment = document.createRange().createContextualFragment(resultHtml);
                            range.insertNode(fragment);
                            selection.removeAllRanges();
                        }
                        document.querySelector('.jz-modal-overlay')?.remove();
                        showToast('已替换选中文本', 'success');
                        if (currentWorkId && currentChapterId) saveCurrentChapter(false);
                    }
                });
            }
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
        <div id="replaceActionBar" style="margin-top:10px;"></div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">取消</button>
        </div>
    `);
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
        <div id="detectActionBar" style="margin-top:10px;"></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
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
            const actionBarContainer = document.getElementById('detectActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: text,
                    actions: ['copy', 'retry', 'like', 'dislike'],
                    onRetry: () => {
                        document.querySelector('.jz-modal-overlay')?.remove();
                        handleDetectText();
                    }
                });
            }
            showToast('AI 纠错完成', 'success');
        },
        (err) => {
            const el = document.getElementById('detectResultContent');
            if (el) el.textContent = '纠错失败: ' + err;
            const actionBarContainer = document.getElementById('detectActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: '纠错失败: ' + err,
                    actions: ['copy']
                });
            }
        }
    );
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
        <div id="deAiActionBar" style="margin-top:10px;"></div>
        <div class="form-actions" style="margin-top:16px;">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay').remove()">关闭</button>
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
            const actionBarContainer = document.getElementById('deAiActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: text,
                    actions: ['copy', 'replace', 'diff', 'retry', 'like', 'dislike'],
                    originalText: plainText,
                    resultSelector: '#deAiResultContent',
                    onReplace: (txt, html) => {
                        const editorArea = document.getElementById('editorArea');
                        if (!editorArea) return;
                        const resultEl = document.getElementById('deAiResultContent');
                        const resultHtml = resultEl?.innerHTML || html || '';
                        const sel = window.getSelection();
                        if (sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            range.deleteContents();
                            const fragment = document.createRange().createContextualFragment(resultHtml);
                            range.insertNode(fragment);
                            sel.removeAllRanges();
                        } else {
                            const titleEl = editorArea.querySelector('h1');
                            const titleHtml = titleEl ? titleEl.outerHTML : '';
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = resultHtml;
                            editorArea.innerHTML = titleHtml;
                            while (tempDiv.firstChild) {
                                editorArea.appendChild(tempDiv.firstChild);
                            }
                        }
                        document.querySelector('.jz-modal-overlay')?.remove();
                        showToast('已替换文本', 'success');
                        if (currentWorkId && currentChapterId) saveCurrentChapter(false);
                    },
                    onRetry: () => {
                        document.querySelector('.jz-modal-overlay')?.remove();
                        handleDeAiText();
                    }
                });
            }
            injectDiffPanel('deAiResultContent', plainText);
            showToast('去AI味完成', 'success');
        },
        (err) => {
            const el = document.getElementById('deAiResultContent');
            if (el) el.textContent = '失败: ' + err;
            const actionBarContainer = document.getElementById('deAiActionBar');
            if (actionBarContainer) {
                createResultActionBar(actionBarContainer, {
                    text: '失败: ' + err,
                    actions: ['copy', 'retry'],
                    onRetry: () => {
                        document.querySelector('.jz-modal-overlay')?.remove();
                        handleDeAiText();
                    }
                });
            }
        }
    );
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
                        ${!isCurrent ? `<button class="btn btn-primary btn-sm" onclick="handleModelSelectChange('${cfg.id}'); renderModelConfigs(); showToast('已切换模型：${escapeHtml(cfg.name)}', 'success');">选择当前模型</button>` : ''}
                    </div>
                </div>
                ${cfg.description ? `<div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(cfg.description)}</div>` : ''}
            </div>
        `;
    }).join('');
}

function showCreateModelConfigModal() {
    showModal('添加 AI 模型', `
        <div style="text-align:center; padding:32px 16px;">
            <div style="font-size:40px; margin-bottom:16px;">🔒</div>
            <div style="font-size:15px; color:var(--text-primary); margin-bottom:8px; font-weight:600;">模型由平台统一预置</div>
            <div style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">当前版本暂不支持自定义添加模型，平台已内置多个主流模型供选择。</div>
            <button class="btn btn-primary" onclick="this.closest('.jz-modal-overlay').remove()">知道了</button>
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
    showToast('模型由平台统一预置，不支持编辑', 'info');
}

async function saveModelConfig(id) {
    showToast('模型由平台统一预置，暂不支持自定义保存', 'info');
    document.querySelector('.jz-modal-overlay')?.remove();
}

async function deleteModelConfig(id) {
    showToast('模型由平台统一预置，不支持删除', 'info');
}

async function testModelConfig(id) {
    showToast('模型由平台统一预置，无需测试', 'info');
}

async function setDefaultModelConfig(id) {
    handleModelSelectChange(id);
    renderModelConfigs();
    showToast('已设为当前使用模型', 'success');
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
