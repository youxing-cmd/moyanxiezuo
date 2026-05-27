const pages = {};

const pageTitles = {
    dashboard: '今日写作台',
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
let currentPage = null;

// ========== 初始化 ==========
async function init() {
    // 预绑定登录表单事件（硬编码表单）
    bindAuthFormEvents();

    // 初始化用户信息
    updateUserInfo();

    // 检查登录状态：未登录强制弹登录框
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        showAuth();
        // 导航点击也引导登录
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                showAuth();
            });
        });
        return;
    }

    hideAuth();

    // 绑定导航点击事件
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    // 默认进入今日写作台
    switchPage('dashboard');
}

// ========== 页面切换 ==========
async function switchPage(page) {
    if (currentPage === 'writing') {
        window.jzAgentPoller?.unsubscribeAllAgentJobs?.();
        window.__jzComposerActiveLocks?.clear?.();
    }

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
        currentPage = page;
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

// 树节点折叠/展开
function toggleTreeNode(nodeId) {
    const body = document.getElementById('treeBody-' + nodeId);
    const toggle = document.getElementById('treeToggle-' + nodeId);
    if (!body || !toggle) return;
    const isExpanded = body.style.display !== 'none';
    body.style.display = isExpanded ? 'none' : 'block';
    // 兼容两种方式：保留 textContent 切换，同时维护 .open class 用于 CSS 旋转
    if (toggle.classList) {
        toggle.classList.toggle('open', !isExpanded);
    }
}

// 顶部按钮：定位并展开左栏对应分区
function focusTreeSection(nodeId) {
    const body = document.getElementById('treeBody-' + nodeId);
    const toggle = document.getElementById('treeToggle-' + nodeId);
    if (!body || !toggle) {
        if (typeof showToast === 'function') showToast('未找到对应面板', 'warning');
        return;
    }
    // 同时展开父级 Global Information / AI 产物
    ['global', 'aiproduct', 'manuscript'].forEach(parentId => {
        const parentBody = document.getElementById('treeBody-' + parentId);
        const parentToggle = document.getElementById('treeToggle-' + parentId);
        if (parentBody && parentToggle && parentBody.contains(body)) {
            parentBody.style.display = 'block';
            if (parentToggle.classList) parentToggle.classList.add('open');
        }
    });
    body.style.display = 'block';
    if (toggle.classList) toggle.classList.add('open');
    body.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // 高亮一下（去重 timer，避免连续点击闪烁）
    const header = toggle.closest('.tree-section-header');
    if (header) {
        if (header._highlightTimer) clearTimeout(header._highlightTimer);
        header.style.background = 'var(--accent-soft, rgba(99,102,241,0.12))';
        header._highlightTimer = setTimeout(() => {
            header.style.background = '';
            header._highlightTimer = null;
        }, 1200);
    }
}

// 左栏tab切换（兼容旧代码：展开对应树节点并滚动）
function switchLeftTab(tab) {
    const body = document.getElementById('treeBody-' + tab);
    const toggle = document.getElementById('treeToggle-' + tab);
    if (body && toggle) {
        body.style.display = 'block';
        if (toggle.classList) toggle.classList.add('open');
        body.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
    const saved = localStorage.getItem('jz-theme') || 'warm';
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
    // 同步顶部栏模型选择器
    const topbarModelName = document.getElementById('topbarModelName');
    if (topbarModelName) {
        const activeCfg = modelConfigList.find(c => c.id === modelId);
        topbarModelName.textContent = activeCfg ? activeCfg.name : '默认模型';
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
