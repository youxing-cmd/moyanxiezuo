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

        // 高级模式：控制模型选择器、工具选择器的显示
        const chatModelPicker = document.getElementById('chatModelPicker');
        if (chatModelPicker) chatModelPicker.style.display = isAdvancedMode() ? '' : 'none';
        const chatToolPicker = document.getElementById('chatToolPicker');
        if (chatToolPicker) chatToolPicker.style.display = isAdvancedMode() ? '' : 'none';

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
            // 1. 强制清除所有引用高亮
            clearRefHighlight();
            editorArea.querySelectorAll('.ref-highlight').forEach(el => {
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) parent.insertBefore(el.firstChild, el);
                    parent.removeChild(el);
                }
            });
            refSpanId = null;

            // 2. 保存撤销状态
            const titleEl = editorArea.querySelector('h1#editorTitle');
            const rawHtml = editorArea.innerHTML;
            const saveContent = titleEl ? rawHtml.replace(titleEl.outerHTML, '') : rawHtml;
            pushEditorUndo(saveContent);

            // 3. 定位光标
            editorArea.focus();

            // 空编辑器清理
            if (!editorArea.innerHTML.trim() || editorArea.innerHTML === '<br>' || editorArea.innerHTML === '<div><br></div>') {
                editorArea.innerHTML = '';
            }

            const sel = window.getSelection();
            if (!sel.rangeCount) {
                showToast('请先将光标放在编辑器中', 'warning');
                return false;
            }
            const range = sel.getRangeAt(0);

            // 如果光标在 h1/blockquote/pre 等块级元素内部，移到该元素之后
            let node = range.commonAncestorContainer;
            while (node && node !== editorArea) {
                if (node.nodeType === 1 && /^H[1-6]|BLOCKQUOTE|PRE$/.test(node.tagName)) {
                    const afterRange = document.createRange();
                    afterRange.setStartAfter(node);
                    afterRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(afterRange);
                    break;
                }
                node = node.parentNode;
            }

            // 4. 插入文本
            const freshRange = sel.getRangeAt(0);
            if (editorArea.contains(freshRange.commonAncestorContainer)) {
                if (!freshRange.collapsed) freshRange.deleteContents();
                const paragraphs = text.split('\n');
                const frag = document.createDocumentFragment();
                paragraphs.forEach(para => {
                    const p = document.createElement('p');
                    p.textContent = para || ' ';
                    frag.appendChild(p);
                });
                freshRange.insertNode(frag);
                freshRange.collapse(false);
                sel.removeAllRanges();
                sel.addRange(freshRange);
                editorArea.dispatchEvent(new Event('input', { bubbles: true }));
                showToast('已插入正文', 'success');
                return true;
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
                <div class="msg-feedback" style="margin-top:6px; padding-left:4px;"></div>`;
            // 使用统一结果操作栏
            const feedbackEl = el.querySelector('.msg-feedback');
            if (feedbackEl) {
                createResultActionBar(feedbackEl, {
                    text: text || '',
                    actions: ['copy', 'insert', 'replace', 'retry', 'like', 'dislike'],
                    onCopy: () => {
                        const contentEl = el.querySelector('.ai-msg-content');
                        const txt = contentEl?.textContent || '';
                        if (!txt) { showToast('内容为空', 'warning'); return; }
                        if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(txt).then(() => showToast('已复制', 'success')).catch(() => fallbackCopy(txt));
                        } else {
                            fallbackCopy(txt);
                        }
                    },
                    onInsert: () => {
                        const contentEl = el.querySelector('.ai-msg-content');
                        const txt = contentEl?.textContent || '';
                        if (!txt) { showToast('内容为空', 'warning'); return; }
                        insertIntoEditor(txt);
                    },
                    onReplace: () => {
                        const contentEl = el.querySelector('.ai-msg-content');
                        const txt = contentEl?.textContent || '';
                        if (!txt) { showToast('内容为空', 'warning'); return; }
                        replaceRefText(txt);
                    },
                    onRetry: () => {
                        if (aiChatStreaming) {
                            showToast('正在生成中，请稍候', 'warning');
                            return;
                        }
                        const idx = parseInt(el.dataset.msgIndex);
                        if (isNaN(idx) || idx <= 0 || idx >= aiChatHistory.length) {
                            showToast('无法重新生成', 'warning');
                            return;
                        }
                        const userMsgIndex = idx - 1;
                        const userMsg = aiChatHistory[userMsgIndex];
                        if (!userMsg || userMsg.role !== 'user') {
                            showToast('历史记录异常', 'warning');
                            return;
                        }
                        showToast('正在重新生成...', 'info');
                        const contentEl = el.querySelector('.ai-msg-content');
                        if (contentEl) contentEl.textContent = '';
                        const contextMessages = aiChatHistory.slice(0, userMsgIndex + 1);
                        aiChatAbortCtrl = new AbortController();
                        setAiSendButtonStreaming(true);
                        regenerateMessage(contextMessages, idx, contentEl, aiChatAbortCtrl.signal).finally(() => {
                            aiChatAbortCtrl = null;
                            setAiSendButtonStreaming(false);
                        });
                    }
                });
            }
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
                const routeId = res.headers.get('X-Route-Id') || res.headers.get('x-route-id');
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
                    maybeShowRouteFeedback(aiBubble, routeId);
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

        // 在 AI 消息底部显示路由决策反馈（仅 agent 模式有 routeId）
        function maybeShowRouteFeedback(aiBubble, routeId) {
            if (!aiBubble || !routeId) return;
            // 清除旧的反馈栏（重新生成时）
            const old = aiBubble.querySelector('[data-route-feedback]');
            if (old) old.remove();

            const wrap = document.createElement('div');
            wrap.dataset.routeFeedback = '1';
            wrap.style.cssText = 'margin-top:6px; padding-top:4px; border-top:1px solid var(--border); font-size:11px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; flex-wrap:wrap;';
            wrap.innerHTML = `
                <span>模型选得对吗？</span>
                <button data-action="route-good" style="background:none;border:none;cursor:pointer;font-size:13px;opacity:0.55;" title="满意">👍</button>
                <button data-action="route-bad" style="background:none;border:none;cursor:pointer;font-size:13px;opacity:0.55;" title="不满意">👎</button>
            `;

            wrap.querySelector('[data-action="route-good"]').addEventListener('click', async () => {
                await submitRouteFeedback(Number(routeId), 'good');
                wrap.innerHTML = '<span style="color:var(--success);">感谢反馈 ✓</span>';
            });
            wrap.querySelector('[data-action="route-bad"]').addEventListener('click', () => {
                wrap.innerHTML = `
                    <span>哪不对？</span>
                    <button data-action="bad-model" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--accent);text-decoration:underline;padding:0;">模型</button>
                    <button data-action="bad-tools" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--accent);text-decoration:underline;padding:0;">工具</button>
                `;
                wrap.querySelector('[data-action="bad-model"]').addEventListener('click', async () => {
                    await submitRouteFeedback(Number(routeId), 'wrong_model');
                    wrap.innerHTML = '<span style="color:var(--accent);">已记录 ✓</span>';
                });
                wrap.querySelector('[data-action="bad-tools"]').addEventListener('click', async () => {
                    await submitRouteFeedback(Number(routeId), 'wrong_tools');
                    wrap.innerHTML = '<span style="color:var(--accent);">已记录 ✓</span>';
                });
            });

            const feedback = aiBubble.querySelector('.msg-feedback');
            if (feedback) {
                feedback.parentNode.insertBefore(wrap, feedback.nextSibling);
            } else {
                aiBubble.appendChild(wrap);
            }
        }

        async function submitRouteFeedback(routeId, feedback) {
            try {
                await api('/ai/route-feedback', {
                    method: 'POST',
                    body: { routeId, feedback },
                });
            } catch (err) {
                console.warn('[route-feedback] 提交失败:', err);
            }
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
        // 高级模式：控制提示词调试 Tab 的显示
        const promptDebugTab = document.querySelector('.tool-tab[data-tab="prompt-debug"]');
        if (promptDebugTab) promptDebugTab.style.display = isAdvancedMode() ? '' : 'none';
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

