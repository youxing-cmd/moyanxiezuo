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
        if (!work) {
            showToast('加载作品失败，请检查登录状态', 'error');
            return;
        }
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
        if (!work) {
            showToast('刷新章节列表失败，请检查登录状态', 'error');
            return;
        }
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

