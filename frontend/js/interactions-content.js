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
            const result = await api('/inspirations', { method: 'POST', body: { title, source, tags, content, lengthType } });
            showToast('灵感已保存', 'success');
            api('/activities', {
                method: 'POST',
                body: { type: 'inspiration', title: `保存灵感「${title}」`, metadata: { inspirationId: result?.id } }
            }).catch(() => {});
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
                const safeTitle = escapeHtml(book.title).replace(/'/g, "\\'");
                return `
                <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; margin-bottom:12px;" data-analysis-text="${escapeHtml(fullText)}">
                    <div style="padding:12px 16px; background:var(--bg-tertiary); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary);">《${escapeHtml(book.title)}》</div>
                        <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="analyzeHotTitle('${safeTitle}', '', '')">🔍 拆解</button>
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="generateCreationPlan('analysis', '${safeTitle}', '', '${trendsCurrentCategory}', getBookAnalysisText(${idx}))">💡 生成创作方案</button>
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="saveTrendsItemToInspiration('analysis', '${safeTitle}', '', '${trendsCurrentCategory}', getBookAnalysisText(${idx}))">⭐ 收藏</button>
                            <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="createWorkFromTrendsItem('analysis', '${safeTitle}', '', '${trendsCurrentCategory}', getBookAnalysisText(${idx}))">📝 创建作品</button>
                            <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="bringTrendsItemIntoCurrentWork('analysis', '${safeTitle}', '', '${trendsCurrentCategory}', getBookAnalysisText(${idx}))">📥 带入当前作品</button>
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
                ${items.map((item, i) => {
                    const safeTitle = escapeHtml(item.title).replace(/'/g, "\\'");
                    return `
                    <div class="rank-item" style="padding:12px 18px; align-items:flex-start;">
                        <div class="rank-num ${i < 3 ? 'top' : 'normal'}" style="min-width:28px; margin-top:2px;">${item.rank}</div>
                        <div class="rank-info" style="flex:1; min-width:0;">
                            <div class="rank-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="color:var(--text-primary); text-decoration:none; word-break:break-all;">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}
                            </div>
                            <div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="analyzeHotTitle('${safeTitle}', '${trendsCurrentPlatform}', '${item.heat || ''}')">🔍 拆解</button>
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="generateCreationPlan('hot', '${safeTitle}', '${trendsCurrentPlatform}', '${trendsCurrentCategory}', '')">💡 生成创作方案</button>
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="saveTrendsItemToInspiration('hot', '${safeTitle}', '${trendsCurrentPlatform}', '${trendsCurrentCategory}', '')">⭐ 收藏</button>
                                <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="createWorkFromTrendsItem('hot', '${safeTitle}', '${trendsCurrentPlatform}', '${trendsCurrentCategory}', '')">📝 创建作品</button>
                                <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="bringTrendsItemIntoCurrentWork('hot', '${safeTitle}', '${trendsCurrentPlatform}', '${trendsCurrentCategory}', '')">📥 带入当前作品</button>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                            <span style="font-size:13px; color:var(--text-muted); white-space:nowrap;">${item.heat}</span>
                            ${item.change === 'up' ? '<span style="color:var(--danger); font-size:11px;">↑</span>' : item.change === 'down' ? '<span style="color:var(--success); font-size:11px;">↓</span>' : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}
                        </div>
                    </div>
                    `;
                }).join('')}
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
            ${items.map((item, i) => {
                const safeTitle = escapeHtml(item.title).replace(/'/g, "\\'");
                const context = `${escapeHtml(item.author)} · ${escapeHtml(item.genre)} · ${item.readers}在读${(item.tags || []).length > 0 ? ' · 标签：' + item.tags.join(',') : ''}`;
                const safeContext = escapeHtml(context).replace(/'/g, "\\'");
                return `
                <div class="rank-item" style="padding:14px 18px;">
                    <div class="rank-num ${i < 3 ? 'top' : 'normal'}" style="min-width:28px;">${item.rank}</div>
                    <div class="rank-info" style="flex:1;">
                        <div class="rank-title">${escapeHtml(item.title)}</div>
                        <div class="rank-meta">${escapeHtml(item.author)} · ${escapeHtml(item.genre)} · ${item.readers}在读</div>
                        ${(item.tags || []).length > 0 ? `<div style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">${item.tags.map((t) => `<span style="padding:2px 6px; border-radius:4px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
                        <div style="display:flex; gap:4px; margin-top:8px; flex-wrap:wrap;">
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="analyzeHotTitle('${safeTitle}', '', '')">🔍 拆解</button>
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="generateCreationPlan('book', '${safeTitle}', '', '${trendsCurrentCategory}', '${safeContext}')">💡 生成创作方案</button>
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="saveTrendsItemToInspiration('book', '${safeTitle}', '', '${trendsCurrentCategory}', '${safeContext}')">⭐ 收藏</button>
                            <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="createWorkFromTrendsItem('book', '${safeTitle}', '', '${trendsCurrentCategory}', '${safeContext}')">📝 创建作品</button>
                            <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="bringTrendsItemIntoCurrentWork('book', '${safeTitle}', '', '${trendsCurrentCategory}', '${safeContext}')">📥 带入当前作品</button>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
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

// ========== 热点/榜单/拆书 → 创作转化 ==========

/** 生成创作方案：调用后端 LLM，输出结构化原创方案 */
async function generateCreationPlan(source, title, platform, category, context) {
    if (!currentUser) { showToast('请先登录', 'warning'); return; }

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
            max-width: 680px; width: 90%; max-height: 85vh; overflow-y: auto;
            box-shadow: var(--shadow); transform: scale(0.95);
            transition: transform 0.2s ease;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">💡 创作方案：${escapeHtml(title)}</span>
                <button onclick="this.closest('.jz-modal-overlay').remove()" style="
                    background: none; border: none; color: var(--text-muted);
                    cursor: pointer; font-size: 18px; padding: 4px;
                ">✕</button>
            </div>
            <div id="creationPlanContent" style="font-size: 13px; color: var(--text-secondary); line-height: 1.7;">
                <div id="creationPlanLoading" style="text-align:center; padding:32px;">
                    <div class="spinner" style="width:28px; height:28px; margin:0 auto 10px;"></div>
                    <div style="color:var(--text-muted); font-size:13px;">AI 正在生成原创创作方案</div>
                    <div style="color:var(--text-muted); font-size:11px; margin-top:6px;">预计 10-30 秒，请稍候...</div>
                </div>
            </div>
            <div id="creationPlanActions" style="display:none; margin-top:16px; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
                <button class="btn btn-ghost btn-sm" onclick="saveCurrentPlanToInspiration()">⭐ 收藏到灵感库</button>
                <button class="btn btn-primary btn-sm" onclick="createWorkFromCurrentPlan()">📝 创建作品</button>
                <button class="btn btn-primary btn-sm" onclick="bringCurrentPlanIntoWork()">📥 带入当前作品</button>
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

    const contentEl = document.getElementById('creationPlanContent');
    let hasReceived = false;
    let fullText = '';
    let parsedPlan = null;

    await streamSSE('/api/trends/generate-plan', { source, title, platform, category, context },
        (text) => {
            if (!hasReceived && contentEl) {
                const loadingEl = document.getElementById('creationPlanLoading');
                if (loadingEl) loadingEl.remove();
                hasReceived = true;
            }
            fullText = text;
            // 尝试解析 JSON，如果失败则展示原始文本
            const plan = tryParsePlanJSON(text);
            parsedPlan = plan || parsedPlan;
            if (contentEl) {
                if (plan) {
                    contentEl.innerHTML = renderPlanHTML(plan);
                } else {
                    contentEl.innerHTML = `<div style="white-space:pre-wrap; color:var(--text-secondary); font-size:12px; line-height:1.7;">${escapeHtml(text)}</div>`;
                }
            }
        },
        (text) => {
            fullText = text;
            const plan = tryParsePlanJSON(text);
            parsedPlan = plan || parsedPlan;
            if (contentEl) {
                if (plan) {
                    contentEl.innerHTML = renderPlanHTML(plan);
                } else {
                    contentEl.innerHTML = `<div style="white-space:pre-wrap; color:var(--text-secondary); font-size:12px; line-height:1.7;">${escapeHtml(text)}</div>`;
                }
            }
            const actionsEl = document.getElementById('creationPlanActions');
            if (actionsEl) actionsEl.style.display = 'flex';
            // 将当前方案挂载到全局，供按钮调用
            window._currentCreationPlan = parsedPlan || { raw: fullText, title };
        },
        (err) => {
            if (contentEl) {
                contentEl.innerHTML = `<div style="color:var(--danger);">生成失败：${escapeHtml(err)}</div>`;
            }
        }
    );
}

/** 尝试从 LLM 输出中解析创作方案 JSON */
function tryParsePlanJSON(text) {
    try {
        // 去掉 markdown 代码块标记
        let clean = text.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
        const parsed = JSON.parse(clean);
        if (parsed.coreSellingPoint || parsed.targetReader || parsed.characterRelations) {
            return parsed;
        }
    } catch {
        // 尝试提取 JSON 对象
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                const parsed = JSON.parse(match[0]);
                if (parsed.coreSellingPoint || parsed.targetReader || parsed.characterRelations) {
                    return parsed;
                }
            } catch {
                // ignore
            }
        }
    }
    return null;
}

/** 渲染创作方案为 HTML */
function renderPlanHTML(plan) {
    const sections = [
        { key: 'coreSellingPoint', label: '🎯 核心卖点', desc: '一句话概括为什么这个故事能火' },
        { key: 'targetReader', label: '👥 目标读者', desc: '性别、年龄、阅读偏好、痛点' },
        { key: 'characterRelations', label: '👤 人设关系', desc: '主角性格 + 关键配角关系网 + 矛盾性' },
        { key: 'openingHook', label: '🪝 开篇钩子', desc: '第一章具体场景 + 冲突 + 悬念' },
        { key: 'pacingBeats', label: '⚡ 爽点节奏', desc: '递进式的爽点设计' },
        { key: 'directionShort', label: '📄 短篇方向', desc: '3-5万字的结构建议' },
        { key: 'directionLong', label: '📚 长篇方向', desc: '百万字级别的世界观与主线规划' },
    ];
    return sections.map(s => {
        const val = plan[s.key];
        if (!val) return '';
        return `
            <div style="margin-bottom:14px; padding:12px; background:var(--bg-tertiary); border-radius:var(--radius-sm); border:1px solid var(--border);">
                <div style="font-size:12px; font-weight:600; color:var(--accent); margin-bottom:4px;">${escapeHtml(s.label)}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px;">${escapeHtml(s.desc)}</div>
                <div style="font-size:13px; color:var(--text-secondary); line-height:1.7; white-space:pre-wrap;">${escapeHtml(val)}</div>
            </div>
        `;
    }).join('');
}

/** 收藏当前方案到灵感库 */
async function saveCurrentPlanToInspiration() {
    const plan = window._currentCreationPlan;
    if (!plan) { showToast('暂无方案可收藏', 'warning'); return; }

    const title = plan.title || '创作方案';
    let content = '';
    if (plan.raw) {
        content = plan.raw;
    } else {
        content = [
            '🎯 核心卖点：' + (plan.coreSellingPoint || ''),
            '👥 目标读者：' + (plan.targetReader || ''),
            '👤 人设关系：' + (plan.characterRelations || ''),
            '🪝 开篇钩子：' + (plan.openingHook || ''),
            '⚡ 爽点节奏：' + (plan.pacingBeats || ''),
            '📄 短篇方向：' + (plan.directionShort || ''),
            '📚 长篇方向：' + (plan.directionLong || ''),
        ].filter(Boolean).join('\n\n');
    }

    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【创作方案】${title}`,
                source: 'trend',
                tags: ['创作方案', '热文转化'],
                content: content,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

/** 从当前方案创建作品 */
async function createWorkFromCurrentPlan() {
    const plan = window._currentCreationPlan;
    if (!plan) { showToast('暂无方案可创建', 'warning'); return; }

    const title = (plan.title || '创作方案作品').replace(/^《|》$/g, '');
    let content = '';
    if (plan.raw) {
        content = plan.raw;
    } else {
        content = [
            '🎯 核心卖点：' + (plan.coreSellingPoint || ''),
            '👥 目标读者：' + (plan.targetReader || ''),
            '👤 人设关系：' + (plan.characterRelations || ''),
            '🪝 开篇钩子：' + (plan.openingHook || ''),
            '⚡ 爽点节奏：' + (plan.pacingBeats || ''),
            '📄 短篇方向：' + (plan.directionShort || ''),
            '📚 长篇方向：' + (plan.directionLong || ''),
        ].filter(Boolean).join('\n\n');
    }

    let channel = 'male';
    const cat = trendsCurrentCategory;
    if (cat === 'femaleHot' || cat === 'femaleNew') channel = 'female';

    try {
        await api('/works', {
            method: 'POST',
            body: {
                title: title.slice(0, 50) || '新作品',
                genre: '未分类',
                perspective: 'third',
                channel: channel,
                tags: ['热文转化'],
                intro: '',
                cover: '',
                inspiration: content,
                source: 'trend-plan',
            },
        });
        showToast('作品已创建', 'success');
        switchPage('works');
    } catch (err) {
        showToast('创建失败：' + (err.message || '未知错误'), 'error');
    }
}

/** 将当前方案带入当前作品 */
async function bringCurrentPlanIntoWork() {
    const plan = window._currentCreationPlan;
    if (!plan) { showToast('暂无方案可带入', 'warning'); return; }

    if (!currentWorkId) {
        showToast('请先进入写作台选择一个作品', 'warning');
        return;
    }

    let content = '';
    if (plan.raw) {
        content = plan.raw;
    } else {
        content = [
            '🎯 核心卖点：' + (plan.coreSellingPoint || ''),
            '👥 目标读者：' + (plan.targetReader || ''),
            '👤 人设关系：' + (plan.characterRelations || ''),
            '🪝 开篇钩子：' + (plan.openingHook || ''),
            '⚡ 爽点节奏：' + (plan.pacingBeats || ''),
            '📄 短篇方向：' + (plan.directionShort || ''),
            '📚 长篇方向：' + (plan.directionLong || ''),
        ].filter(Boolean).join('\n\n');
    }

    try {
        // 先获取当前作品信息
        const work = await api(`/works/${currentWorkId}`);
        const existingInspiration = work.inspiration || '';
        const newInspiration = existingInspiration
            ? existingInspiration + '\n\n---\n\n【热文创作方案】\n' + content
            : '【热文创作方案】\n' + content;

        await api(`/works/${currentWorkId}`, {
            method: 'PUT',
            body: {
                inspiration: newInspiration,
            },
        });
        showToast('已带入当前作品，可在写作台「作品灵感」中查看', 'success');
    } catch (err) {
        showToast('带入失败：' + (err.message || '未知错误'), 'error');
    }
}

/** 通用：保存热点/榜单/拆书项到灵感库 */
async function saveTrendsItemToInspiration(source, title, platform, category, context) {
    if (!currentUser) { showToast('请先登录', 'warning'); return; }

    let content = '';
    if (context) {
        content = context;
    } else {
        content = `来源：${source === 'hot' ? '平台热搜' : source === 'book' ? '书籍榜单' : '拆书分析'}\n标题：${title}`;
        if (platform) content += `\n平台：${platform}`;
        if (category) content += `\n赛道：${category}`;
    }

    try {
        await api('/inspirations', {
            method: 'POST',
            body: {
                title: `【${source === 'hot' ? '热搜' : source === 'book' ? '榜单' : '拆书'}】${title}`,
                source: 'trend',
                tags: [source === 'hot' ? '热搜' : source === 'book' ? '榜单' : '拆书', '热文赛道'],
                content: content,
            },
        });
        showToast('已收藏到灵感库', 'success');
    } catch (err) {
        showToast('收藏失败：' + (err.message || '未知错误'), 'error');
    }
}

/** 通用：从热点/榜单/拆书项创建作品 */
async function createWorkFromTrendsItem(source, title, platform, category, context) {
    if (!currentUser) { showToast('请先登录', 'warning'); return; }

    let content = '';
    if (context) {
        content = context;
    } else {
        content = `来源：${source === 'hot' ? '平台热搜' : source === 'book' ? '书籍榜单' : '拆书分析'}\n标题：${title}`;
        if (platform) content += `\n平台：${platform}`;
        if (category) content += `\n赛道：${category}`;
    }

    let channel = 'male';
    if (category === 'femaleHot' || category === 'femaleNew') channel = 'female';

    try {
        await api('/works', {
            method: 'POST',
            body: {
                title: title.slice(0, 50) || '新作品',
                genre: '未分类',
                perspective: 'third',
                channel: channel,
                tags: ['热文转化'],
                intro: '',
                cover: '',
                inspiration: content,
                source: 'trend-item',
            },
        });
        showToast('作品已创建', 'success');
        switchPage('works');
    } catch (err) {
        showToast('创建失败：' + (err.message || '未知错误'), 'error');
    }
}

/** 通用：将热点/榜单/拆书项带入当前作品 */
async function bringTrendsItemIntoCurrentWork(source, title, platform, category, context) {
    if (!currentUser) { showToast('请先登录', 'warning'); return; }
    if (!currentWorkId) {
        showToast('请先进入写作台选择一个作品', 'warning');
        return;
    }

    let content = '';
    if (context) {
        content = context;
    } else {
        content = `来源：${source === 'hot' ? '平台热搜' : source === 'book' ? '书籍榜单' : '拆书分析'}\n标题：${title}`;
        if (platform) content += `\n平台：${platform}`;
        if (category) content += `\n赛道：${category}`;
    }

    try {
        const work = await api(`/works/${currentWorkId}`);
        const existingInspiration = work.inspiration || '';
        const label = source === 'hot' ? '热搜素材' : source === 'book' ? '榜单素材' : '拆书素材';
        const newInspiration = existingInspiration
            ? existingInspiration + '\n\n---\n\n【' + label + '】\n' + content
            : '【' + label + '】\n' + content;

        await api(`/works/${currentWorkId}`, {
            method: 'PUT',
            body: {
                inspiration: newInspiration,
            },
        });
        showToast('已带入当前作品，可在写作台「作品灵感」中查看', 'success');
    } catch (err) {
        showToast('带入失败：' + (err.message || '未知错误'), 'error');
    }
}


