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

// ========== 今日写作台统计 ==========
async function loadDashboardStats() {
    try {
        const stats = await api('/stats');

        // === 主行动区 ===
        const heroTodayWordsEl = document.getElementById('heroTodayWords');
        if (heroTodayWordsEl) {
            const tw = stats.todayWords || 0;
            heroTodayWordsEl.textContent = `今日新增 ${tw >= 10000 ? (tw / 10000).toFixed(1) + '万' : tw} 字`;
        }
        const heroConsecutiveDaysEl = document.getElementById('heroConsecutiveDays');
        if (heroConsecutiveDaysEl) {
            heroConsecutiveDaysEl.textContent = `连续创作 ${stats.consecutiveDays || 0} 天`;
        }
        const heroTitleEl = document.getElementById('heroTitle');
        const heroDescEl = document.getElementById('heroDesc');
        const heroPrimaryBtn = document.getElementById('heroPrimaryBtn');
        const heroSecondaryBtn = document.getElementById('heroSecondaryBtn');

        if (stats.primaryWork) {
            const pw = stats.primaryWork;
            if (heroTitleEl) heroTitleEl.textContent = pw.chapterTitle && pw.chapterTitle !== '暂无章节'
                ? `《${pw.workTitle}》· ${pw.chapterTitle}`
                : `《${pw.workTitle}》`;
            if (heroDescEl) {
                const timeStr = pw.chapterUpdatedAt ? formatTimeAgo(pw.chapterUpdatedAt) : '最近';
                heroDescEl.textContent = pw.chapterTitle && pw.chapterTitle !== '暂无章节'
                    ? `上次编辑于 ${timeStr}`
                    : '开始创作第一章';
            }
            if (heroPrimaryBtn) {
                heroPrimaryBtn.textContent = '继续写作';
                heroPrimaryBtn.onclick = () => enterWriting(pw.workId);
            }
            if (heroSecondaryBtn) {
                heroSecondaryBtn.style.display = '';
                heroSecondaryBtn.onclick = () => enterWriting(pw.workId);
            }
        } else {
            if (heroTitleEl) heroTitleEl.textContent = '开始你的创作之旅';
            if (heroDescEl) heroDescEl.textContent = '创建第一部作品，迈出第一步';
            if (heroPrimaryBtn) {
                heroPrimaryBtn.textContent = '创建第一部作品';
                heroPrimaryBtn.onclick = () => showCreateWorkModal();
            }
            if (heroSecondaryBtn) heroSecondaryBtn.style.display = 'none';
        }

        // === 今日新增字数（指标卡）===
        const todayWordsEl = document.getElementById('dashTodayWords');
        if (todayWordsEl) {
            const tw = stats.todayWords || 0;
            todayWordsEl.textContent = tw >= 10000 ? (tw / 10000).toFixed(1) + '万' : tw.toString();
        }

        // === 连续写作天数（指标卡）===
        const consecutiveDaysEl = document.getElementById('dashConsecutiveDays');
        if (consecutiveDaysEl) consecutiveDaysEl.textContent = (stats.consecutiveDays || 0).toString();

        // === 作品数量 ===
        const workCountEl = document.getElementById('statWorkCount');
        if (workCountEl) workCountEl.textContent = stats.workCount || 0;

        // === 总字数 ===
        const totalWordsEl = document.getElementById('statTotalWords');
        if (totalWordsEl) {
            const words = stats.totalWords || 0;
            totalWordsEl.textContent = words >= 10000 ? (words / 10000).toFixed(1) + '万' : words.toString();
        }

        // === 近7天打卡 ===
        const weekStreakEl = document.getElementById('dashWeekStreak');
        if (weekStreakEl && stats.last7Days) {
            const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
            weekStreakEl.innerHTML = stats.last7Days.map(d => {
                const date = new Date(d.date);
                const dayLabel = weekDays[date.getDay()];
                const active = d.hasWriting;
                const bg = active ? 'rgba(34,197,94,0.12)' : 'var(--bg-tertiary)';
                const border = active ? 'var(--success)' : 'var(--border)';
                const color = active ? 'var(--success)' : 'var(--text-muted)';
                return `<div title="${d.date}${active ? ' 已写作' : ' 未写作'}" style="flex:1;height:48px;border-radius:var(--radius-sm);background:${bg};border:1px solid ${border};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;">
                    <span style="font-size:10px;color:var(--text-muted);">${dayLabel}</span>
                    <span style="font-size:13px;font-weight:600;color:${color};">${active ? '✓' : '·'}</span>
                </div>`;
            }).join('');
        }

        // === 最近编辑列表 ===
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

        // === 下一步建议 ===
        const nextActionsEl = document.getElementById('nextActionsList');
        if (nextActionsEl && stats.nextActions) {
            if (stats.nextActions.length === 0) {
                nextActionsEl.innerHTML = `
                    <div class="list-item">
                        <div class="list-content">
                            <div class="list-meta" style="color:var(--text-muted);">暂无建议</div>
                        </div>
                    </div>
                `;
            } else {
                const actionIcons = {
                    continue_writing: '✍️',
                    create_work: '📝',
                    start_today: '🚀',
                    review_chapter: '🔍',
                    adaptation: '🎬',
                };
                const actionColors = {
                    continue_writing: 'var(--accent)',
                    create_work: 'var(--success)',
                    start_today: 'var(--warning)',
                    review_chapter: 'var(--info)',
                    adaptation: 'var(--danger)',
                };
                nextActionsEl.innerHTML = stats.nextActions.map((a, idx) => {
                    const icon = actionIcons[a.type] || '💡';
                    const color = actionColors[a.type] || 'var(--accent)';
                    const isPrimary = idx === 0;
                    const btnClass = isPrimary ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
                    const onclick = a.action === 'enterWriting' && a.workId
                        ? `onclick="enterWriting(${a.workId})"`
                        : a.action === 'showCreateWorkModal'
                            ? `onclick="showCreateWorkModal()"`
                            : `onclick="showToast('功能开发中', 'warning')"`;
                    return `
                        <div class="list-item" style="cursor:default;">
                            <div class="list-icon" style="background:${color}15;color:${color};font-size:18px;">${icon}</div>
                            <div class="list-content">
                                <div class="list-title">${a.title}</div>
                                <div class="list-meta">${a.description}</div>
                            </div>
                            <button class="${btnClass}" ${onclick}>${isPrimary ? '去做' : '查看'}</button>
                        </div>
                    `;
                }).join('');
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
            if (!work) {
                showToast('加载作品失败，请检查登录状态', 'error');
                return;
            }
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


