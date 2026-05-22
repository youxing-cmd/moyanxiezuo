// composer.js — Agent Plan 卡片渲染组件
// 挂载在 #aiChatMessages 内，替代普通 AI 回复气泡

(function() {
    'use strict';

    // ===== 状态图标 =====
    const STATUS_ICONS = {
        planning: '<span style="color:var(--text-muted)">📝</span>',
        ready: '<span style="color:var(--accent)">📋</span>',
        pending: '<span style="color:var(--text-muted)">○</span>',
        running: '<span class="composer-spin" style="color:var(--accent)">⟳</span>',
        done: '<span style="color:var(--success)">✓</span>',
        failed: '<span style="color:var(--danger)">✗</span>',
        skipped: '<span style="color:var(--text-muted)">⊘</span>',
        waiting: '<span style="color:var(--warning)">⏸</span>',
        user_blocked: '<span style="color:var(--danger)">🚧</span>',
    };

    const STATUS_LABELS = {
        planning: '规划中',
        ready: '计划已生成',
        pending: '等待中',
        running: '执行中',
        done: '已完成',
        failed: '失败',
        skipped: '已跳过',
        waiting: '等待用户',
        user_blocked: '需要你决定',
    };

    // 简化 diff：按段落对比，标记新增/删除
    function simpleDiff(oldText, newText) {
        const oldParas = oldText.split(/\n{2,}|\n/);
        const newParas = newText.split(/\n{2,}|\n/);
        const oldSet = new Set(oldParas.map((p) => p.trim()).filter((p) => p));
        const newSet = new Set(newParas.map((p) => p.trim()).filter((p) => p));

        let html = '';
        for (const p of newParas) {
            const trimmed = p.trim();
            if (!trimmed) continue;
            if (oldSet.has(trimmed)) {
                html += `<div style="padding:2px 0;color:var(--text-secondary);">${escapeHtml(p)}</div>`;
            } else {
                html += `<div style="padding:2px 0;background:rgba(34,197,94,0.08);color:var(--success);">+ ${escapeHtml(p)}</div>`;
            }
        }
        for (const p of oldParas) {
            const trimmed = p.trim();
            if (!trimmed) continue;
            if (!newSet.has(trimmed)) {
                html += `<div style="padding:2px 0;background:rgba(239,68,68,0.08);color:var(--danger);text-decoration:line-through;">- ${escapeHtml(p)}</div>`;
            }
        }
        return html || '<div style="color:var(--text-muted);">无差异</div>';
    }

    // ===== 创建 Plan 卡片 =====
    // data: { id, title, estimatedDuration, estimatedCost, steps: [{ id, idx, taskType, title, status, retryCount }], status, progress }
    function createPlanCard(data, options = {}) {
        const card = document.createElement('div');
        card.className = 'plan-card';
        card.dataset.jobId = String(data.id);
        if (data.workId) card.dataset.workId = String(data.workId);

        const progressBar = renderProgressBar(data.progress || 0);

        card.innerHTML = `
            <div class="plan-header">
                <div class="plan-header-top">
                    <span class="plan-icon">📋</span>
                    <span class="plan-title">${escapeHtml(data.title || 'Agent 任务')}</span>
                    <span class="plan-status-badge" data-status="${data.status}">${STATUS_LABELS[data.status] || data.status}</span>
                </div>
                ${data.estimatedDuration || data.estimatedCost ? `
                <div class="plan-budget">
                    ${data.estimatedDuration ? `<span>⏱ ${escapeHtml(data.estimatedDuration)}</span>` : ''}
                    ${data.estimatedCost ? `<span>💰 ${escapeHtml(data.estimatedCost)}</span>` : ''}
                </div>
                ` : ''}
                ${progressBar}
            </div>
            <div class="plan-steps" data-steps-container></div>
            <div class="plan-footer">
                <div class="plan-actions">
                    ${renderActionButtons(data.status, data.id)}
                </div>
                <div class="plan-inject" style="display:none;">
                    <input type="text" class="plan-inject-input" placeholder="对当前进度说点什么..." />
                    <button class="plan-inject-btn">发送</button>
                </div>
                <div class="plan-deliver" style="display:none;" data-deliver-panel>
                    <div class="plan-deliver-preview" data-deliver-preview></div>
                    <div class="plan-deliver-actions" data-deliver-actions></div>
                </div>
            </div>
        `;

        // 渲染步骤
        const stepsContainer = card.querySelector('[data-steps-container]');
        if (data.steps && data.steps.length > 0) {
            data.steps.forEach((step) => {
                stepsContainer.appendChild(createStepRow(step));
            });
        }

        // 绑定按钮事件
        bindPlanActions(card, data.id, options);

        return card;
    }

    function renderProgressBar(progress) {
        return `
            <div class="plan-progress-bar">
                <div class="plan-progress-fill" style="width:${progress}%"></div>
            </div>
            <div class="plan-progress-text">${progress}%</div>
        `;
    }

    function renderActionButtons(status, jobId) {
        if (status === 'planning' || status === 'ready') {
            return `
                <button class="plan-btn plan-btn-primary" data-action="start">▶ 开始执行</button>
                <button class="plan-btn" data-action="edit-plan">编辑计划</button>
            `;
        }
        if (status === 'running') {
            return `
                <button class="plan-btn" data-action="pause">⏸ 暂停</button>
                <button class="plan-btn plan-btn-danger" data-action="abort">⏹ 中止</button>
                <button class="plan-btn" data-action="toggle-inject">💬 插话</button>
            `;
        }
        if (status === 'paused') {
            return `
                <button class="plan-btn plan-btn-primary" data-action="start">▶ 继续</button>
                <button class="plan-btn plan-btn-danger" data-action="abort">⏹ 中止</button>
            `;
        }
        if (status === 'waiting') {
            return `
                <button class="plan-btn plan-btn-primary" data-action="inject">💬 回复</button>
                <button class="plan-btn plan-btn-danger" data-action="abort">⏹ 中止</button>
            `;
        }
        if (status === 'user_blocked') {
            return `
                <button class="plan-btn" data-action="toggle-inject">💬 插话</button>
                <button class="plan-btn plan-btn-danger" data-action="abort">⏹ 中止</button>
            `;
        }
        if (status === 'done' || status === 'failed' || status === 'aborted') {
            return `<button class="plan-btn" data-action="dismiss">关闭</button>`;
        }
        return '';
    }

    function createStepRow(step) {
        const el = document.createElement('div');
        el.className = `plan-step plan-step--${step.status}`;
        el.dataset.stepId = String(step.id);
        el.dataset.taskType = step.taskType || '';

        const icon = STATUS_ICONS[step.status] || STATUS_ICONS.pending;
        const label = STATUS_LABELS[step.status] || step.status;

        const canSkip = ['pending', 'failed'].includes(step.status);
        const canRedo = ['done', 'failed', 'skipped'].includes(step.status);
        const canExpand = ['done', 'failed'].includes(step.status);

        el.innerHTML = `
            <div class="plan-step-main">
                <span class="plan-step-icon">${icon}</span>
                <span class="plan-step-title">${step.idx + 1}. ${escapeHtml(step.title)}</span>
                <span class="plan-step-label">${label}</span>
                ${canExpand ? `<button class="plan-step-expand" data-expand>展开</button>` : ''}
            </div>
            ${step.retryCount > 0 ? `<span class="plan-step-retry">重试 ${step.retryCount}</span>` : ''}
            <div class="plan-step-actions" style="display:none;">
                ${canSkip ? `<button class="plan-step-btn" data-skip>跳过</button>` : ''}
                ${canRedo ? `<button class="plan-step-btn" data-redo>重做</button>` : ''}
            </div>
            <div class="plan-step-output" style="display:none;" data-step-output></div>
            ${step.status === 'waiting' ? `
            <div class="plan-step-input-area" data-step-input>
                <div class="plan-step-options" data-step-options style="display:none;"></div>
                <div class="plan-step-free-input" style="display:flex; gap:6px; margin-top:6px;">
                    <input type="text" class="plan-step-input" placeholder="输入你的选择或回复..." />
                    <button class="plan-step-btn plan-step-btn-primary" data-step-submit>发送</button>
                </div>
            </div>
            ` : ''}
        `;

        // 展开/折叠
        const expandBtn = el.querySelector('[data-expand]');
        const outputEl = el.querySelector('[data-step-output]');
        if (expandBtn && outputEl) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = outputEl.style.display === 'none';
                outputEl.style.display = isHidden ? 'block' : 'none';
                expandBtn.textContent = isHidden ? '收起' : '展开';
            });
        }

        // 点击步骤主体显示/隐藏操作按钮
        const mainEl = el.querySelector('.plan-step-main');
        const actionsEl = el.querySelector('.plan-step-actions');
        if (mainEl && actionsEl) {
            mainEl.addEventListener('click', () => {
                const isHidden = actionsEl.style.display === 'none';
                actionsEl.style.display = isHidden ? 'flex' : 'none';
            });
        }

        // user_input 交互：解析选项
        const optionsEl = el.querySelector('[data-step-options]');
        const freeInputEl = el.querySelector('.plan-step-free-input');
        if (optionsEl && step.description) {
            const options = parseOptionsFromText(step.description);
            if (options.length > 0) {
                optionsEl.style.display = 'flex';
                optionsEl.innerHTML = options.map((opt) =>
                    `<button class="plan-step-option-btn" data-option="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`
                ).join('');
                if (freeInputEl) freeInputEl.style.display = 'none';
            }
        }

        return el;
    }

    function parseOptionsFromText(text) {
        // 匹配 "1. xxx 2. xxx 3. xxx" 或 "A. xxx B. xxx" 或 "选项1: xxx 选项2: xxx"
        const patterns = [
            /(?:^|\n)\s*(?:\d+[.、]|选项\d+[：:]|[一二三四五六七八九十][、.])\s*([^\n]+)/g,
            /(?:^|\n)\s*[-*]\s*([^\n]+)/g,
        ];
        const results = [];
        for (const p of patterns) {
            let m;
            while ((m = p.exec(text)) !== null) {
                const opt = m[1].trim();
                if (opt && !results.includes(opt)) results.push(opt);
            }
            if (results.length > 0) break;
        }
        return results.slice(0, 6);
    }

    function bindPlanActions(card, jobId, options) {
        const actionsEl = card.querySelector('.plan-actions');
        const injectEl = card.querySelector('.plan-inject');
        const injectInput = card.querySelector('.plan-inject-input');
        const injectBtn = card.querySelector('.plan-inject-btn');
        const deliverEl = card.querySelector('[data-deliver-panel]');

        if (!actionsEl) return;

        // 保存当前 artifact 内容，供交付按钮使用
        let currentArtifact = null;
        let currentWorkId = null;

        // 步骤级别的 skip / redo / user_input 事件委托
        const stepsContainer = card.querySelector('[data-steps-container]');
        if (stepsContainer) {
            stepsContainer.addEventListener('click', async (e) => {
                const skipBtn = e.target.closest('[data-skip]');
                const redoBtn = e.target.closest('[data-redo]');
                const optionBtn = e.target.closest('[data-option]');
                const submitBtn = e.target.closest('[data-step-submit]');
                if (!skipBtn && !redoBtn && !optionBtn && !submitBtn) return;

                const stepEl = e.target.closest('.plan-step');
                if (!stepEl) return;
                const stepId = stepEl.dataset.stepId;
                if (!stepId) return;

                if (skipBtn) {
                    skipBtn.disabled = true;
                    skipBtn.textContent = '跳过中...';
                    try {
                        await apiPost(`/ai/agent-jobs/${jobId}/steps/${stepId}/skip`);
                        showToast('已跳过该步骤', 'success');
                    } catch (err) {
                        showToast(err.message || '跳过失败', 'error');
                        skipBtn.disabled = false;
                        skipBtn.textContent = '跳过';
                    }
                    return;
                }

                if (redoBtn) {
                    redoBtn.disabled = true;
                    redoBtn.textContent = '重做中...';
                    try {
                        await apiPost(`/ai/agent-jobs/${jobId}/steps/${stepId}/redo`);
                        showToast('已重做该步骤', 'success');
                    } catch (err) {
                        showToast(err.message || '重做失败', 'error');
                        redoBtn.disabled = false;
                        redoBtn.textContent = '重做';
                    }
                    return;
                }

                // user_input 选项按钮
                if (optionBtn) {
                    const value = optionBtn.dataset.option;
                    try {
                        await apiPost(`/ai/agent-jobs/${jobId}/inject`, { message: value, stepId: Number(stepId) });
                        showToast('已提交选择', 'success');
                    } catch (err) {
                        showToast(err.message || '提交失败', 'error');
                    }
                    return;
                }

                // user_input 输入框提交
                if (submitBtn) {
                    const input = stepEl.querySelector('.plan-step-input');
                    const value = input?.value.trim();
                    if (!value) return;
                    submitBtn.disabled = true;
                    try {
                        await apiPost(`/ai/agent-jobs/${jobId}/inject`, { message: value, stepId: Number(stepId) });
                        input.value = '';
                        showToast('已提交回复', 'success');
                    } catch (err) {
                        showToast(err.message || '提交失败', 'error');
                        submitBtn.disabled = false;
                    }
                    return;
                }
            });
        }

        actionsEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;

            if (action === 'start') {
                btn.disabled = true;
                btn.textContent = '启动中...';
                try {
                    await apiPost(`/ai/agent-jobs/${jobId}/start`);
                    options.onStart?.(jobId);
                } catch (err) {
                    showToast(err.message || '启动失败', 'error');
                    btn.disabled = false;
                    btn.textContent = '▶ 开始执行';
                }
                return;
            }

            if (action === 'pause') {
                try {
                    await apiPost(`/ai/agent-jobs/${jobId}/pause`);
                    options.onPause?.(jobId);
                } catch (err) {
                    showToast(err.message || '暂停失败', 'error');
                }
                return;
            }

            if (action === 'abort') {
                if (!confirm('确定要中止该任务吗？已完成的步骤会保留。')) return;
                try {
                    await apiPost(`/ai/agent-jobs/${jobId}/abort`);
                    options.onAbort?.(jobId);
                } catch (err) {
                    showToast(err.message || '中止失败', 'error');
                }
                return;
            }

            if (action === 'toggle-inject') {
                injectEl.style.display = injectEl.style.display === 'none' ? 'flex' : 'none';
                if (injectEl.style.display !== 'none') injectInput.focus();
                return;
            }

            if (action === 'inject') {
                injectEl.style.display = 'flex';
                injectInput.focus();
                return;
            }

            if (action === 'dismiss') {
                card.remove();
                options.onDismiss?.(jobId);
                return;
            }

            if (action === 'edit-plan') {
                enterEditPlanMode(card, jobId);
                return;
            }

            // 交付动作
            if (action === 'adopt-chapter') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost(`/works/${currentWorkId}/chapters`, {
                        title: currentArtifact.title || 'Agent 生成章节',
                        content: currentArtifact.content,
                    });
                    showToast('已采纳为新章节', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'chapters', res.id);
                    }
                    options.onAdopt?.(jobId, 'chapter');
                } catch (err) {
                    showToast(err.message || '采纳失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'save-draft') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost(`/works/${currentWorkId}/drafts`, {
                        title: currentArtifact.title || 'Agent 草稿',
                        content: currentArtifact.content,
                    });
                    showToast('已保存为草稿', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'drafts', res.id);
                    }
                    options.onSaveDraft?.(jobId);
                } catch (err) {
                    showToast(err.message || '保存失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'copy-content') {
                if (!currentArtifact?.content) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                navigator.clipboard.writeText(currentArtifact.content).then(() => {
                    showToast('内容已复制到剪贴板', 'success');
                }).catch(() => {
                    showToast('复制失败，请手动复制', 'error');
                });
                return;
            }

            // ===== P3 新增交付动作 =====
            if (action === 'overwrite-chapter') {
                if (!currentArtifact?.content || !currentWorkId || !currentChapterId) {
                    showToast('没有可用的产物或当前章节', 'error');
                    return;
                }
                if (!confirm('确定要覆盖当前章节草稿吗？原内容将保存为版本。')) return;
                btn.disabled = true;
                try {
                    // 先保存版本（使用当前编辑器内容）
                    const editorContent = (typeof window.jzEditor?.getFullText === 'function')
                        ? window.jzEditor.getFullText()
                        : (document.getElementById('editorArea')?.innerText || '');
                    await apiPost(`/works/${currentWorkId}/chapters/${currentChapterId}/versions`, {
                        content: editorContent,
                        source: 'auto',
                    });
                    // 再覆盖内容
                    await apiPost(`/works/${currentWorkId}/chapters/${currentChapterId}`, {
                        title: currentArtifact.title || document.getElementById('writingChapterTitle')?.textContent || '章节',
                        content: currentArtifact.content,
                    });
                    showToast('已覆盖当前章节草稿，原内容已保存为版本', 'success');
                    if (currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'chapters', currentChapterId);
                    }
                    options.onOverwrite?.(jobId);
                } catch (err) {
                    showToast(err.message || '覆盖失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'update-outline') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost(`/metadata/${currentWorkId}/outlines`, {
                        title: currentArtifact.title || '总纲',
                        content: currentArtifact.content,
                    });
                    showToast('已更新总纲', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'outlines', res.id);
                    }
                } catch (err) {
                    showToast(err.message || '更新失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'save-version') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost(`/metadata/${currentWorkId}/outlines`, {
                        title: currentArtifact.title || '大纲版本',
                        content: currentArtifact.content,
                    });
                    showToast('已保存为新版本大纲', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'outlines', res.id);
                    }
                } catch (err) {
                    showToast(err.message || '保存失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'save-alternative') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost(`/metadata/${currentWorkId}/settings`, {
                        name: currentArtifact.title || '备选设定',
                        type: 'background',
                        content: currentArtifact.content,
                    });
                    showToast('已保存为备选设定', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'settings', res.id);
                    }
                } catch (err) {
                    showToast(err.message || '保存失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'view-report') {
                if (!currentArtifact?.content) {
                    showToast('没有可用的报告内容', 'error');
                    return;
                }
                showModal('审稿报告', `<div style="max-height:60vh;overflow:auto;line-height:1.7;font-size:13px;">${escapeHtml(currentArtifact.content).replace(/\n/g, '<br>')}</div>`);
                return;
            }

            if (action === 'update-setting') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost(`/metadata/${currentWorkId}/settings`, {
                        name: currentArtifact.title || '新设定',
                        type: 'background',
                        content: currentArtifact.content,
                    });
                    showToast('已更新设定', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'settings', res.id);
                    }
                } catch (err) {
                    showToast(err.message || '更新失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'save-inspiration') {
                if (!currentArtifact?.content) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    const res = await apiPost('/inspirations', {
                        title: currentArtifact.title || 'Agent 灵感',
                        content: currentArtifact.content,
                        source: 'agent',
                    });
                    showToast('已保存到灵感库', 'success');
                    if (res?.id && currentArtifact?.id) {
                        await linkArtifact(currentArtifact.id, 'inspirations', res.id);
                    }
                } catch (err) {
                    showToast(err.message || '保存失败', 'error');
                    btn.disabled = false;
                }
                return;
            }

            if (action === 'compare-original') {
                if (!currentArtifact?.content) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                const original = window.jzEditor?.getContent?.() || '';
                const diffHtml = simpleDiff(original, currentArtifact.content);
                showModal('差异对比', `
                    <div style="max-height:60vh;overflow:auto;font-size:13px;line-height:1.7;">
                        <div style="margin-bottom:8px;color:var(--text-muted);font-size:12px;">
                            <span style="color:var(--success)">绿色 = 新增</span> ·
                            <span style="color:var(--danger)">红色 = 删除</span>
                        </div>
                        ${diffHtml}
                    </div>
                `);
                return;
            }
        });

        // 暴露 setArtifact 供外部更新
        card._setArtifact = (artifact, workId) => {
            currentArtifact = artifact;
            currentWorkId = workId;
            const previewEl = deliverEl?.querySelector('[data-deliver-preview]');
            if (previewEl && artifact?.content) {
                const text = artifact.content.slice(0, 200).replace(/\n/g, ' ');
                previewEl.textContent = text + (artifact.content.length > 200 ? '...' : '');
            }
        };

        // 辅助：将 artifact 关联到作品树实体
        async function linkArtifact(artifactId, entityType, entityId) {
            if (!artifactId || !entityType || !entityId) return;
            try {
                await apiPost(`/ai/artifacts/${artifactId}/link`, {
                    linkedEntityType: entityType,
                    linkedEntityId: entityId,
                });
            } catch (err) {
                console.warn('[composer] artifact 关联失败:', err);
            }
        }

        // 插话发送
        const sendInject = async () => {
            const text = injectInput.value.trim();
            if (!text) return;
            try {
                await apiPost(`/ai/agent-jobs/${jobId}/inject`, { message: text });
                injectInput.value = '';
                injectEl.style.display = 'none';
                options.onInject?.(jobId, text);
            } catch (err) {
                showToast(err.message || '发送失败', 'error');
            }
        };

        injectBtn?.addEventListener('click', sendInject);
        injectInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendInject();
        });
    }

    // 进入编辑计划模式
    function enterEditPlanMode(card, jobId) {
        const stepsContainer = card.querySelector('[data-steps-container]');
        if (!stepsContainer) return;

        // 保存原始 HTML 以便取消
        card._originalStepsHTML = stepsContainer.innerHTML;

        // 给每个步骤添加删除按钮和编辑输入框
        stepsContainer.querySelectorAll('.plan-step').forEach((stepEl) => {
            const titleEl = stepEl.querySelector('.plan-step-title');
            if (!titleEl) return;
            const currentTitle = titleEl.textContent.replace(/^\d+\.\s*/, '');
            const idx = stepEl.querySelector('.plan-step-title')?.textContent?.match(/^(\d+)\./)?.[1] || '';

            titleEl.innerHTML = `
                <span class="plan-step-idx">${idx}.</span>
                <input type="text" class="plan-step-edit-input" value="${escapeHtml(currentTitle)}" />
                <button class="plan-step-delete-btn" data-delete-step title="删除此步骤">×</button>
            `;
        });

        // 替换操作按钮为保存/取消
        const actionsEl = card.querySelector('.plan-actions');
        if (actionsEl) {
            actionsEl.innerHTML = `
                <button class="plan-btn plan-btn-primary" data-action="save-plan">💾 保存计划</button>
                <button class="plan-btn" data-action="cancel-edit">取消</button>
            `;
        }

        // 绑定删除按钮
        stepsContainer.querySelectorAll('[data-delete-step]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const stepEl = btn.closest('.plan-step');
                if (stepEl) {
                    stepEl.style.opacity = '0.4';
                    stepEl.dataset.deleted = 'true';
                    btn.textContent = '已删除';
                    btn.disabled = true;
                }
            });
        });

        // 绑定保存/取消
        const newActionsEl = card.querySelector('.plan-actions');
        if (newActionsEl) {
            const handler = async (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const action = btn.dataset.action;

                if (action === 'cancel-edit') {
                    // 恢复原始步骤
                    if (card._originalStepsHTML) {
                        stepsContainer.innerHTML = card._originalStepsHTML;
                        delete card._originalStepsHTML;
                    }
                    // 恢复原始按钮
                    const statusBadge = card.querySelector('.plan-status-badge');
                    const status = statusBadge?.dataset.status || 'ready';
                    newActionsEl.innerHTML = renderActionButtons(status, jobId);
                    newActionsEl.removeEventListener('click', handler);
                    return;
                }

                if (action === 'save-plan') {
                    // 收集修改后的步骤
                    const steps = [];
                    stepsContainer.querySelectorAll('.plan-step').forEach((stepEl, idx) => {
                        if (stepEl.dataset.deleted === 'true') return;
                        const input = stepEl.querySelector('.plan-step-edit-input');
                        const title = input?.value.trim() || '';
                        const taskType = stepEl.dataset.taskType || 'read_context';
                        steps.push({
                            id: String(idx + 1),
                            type: taskType,
                            title,
                            dependsOn: [],
                        });
                    });

                    if (steps.length === 0) {
                        showToast('计划不能为空', 'error');
                        return;
                    }

                    btn.disabled = true;
                    btn.textContent = '保存中...';
                    try {
                        await apiPost(`/ai/agent-jobs/${jobId}/plan`, {
                            title: '用户编辑的计划',
                            steps,
                        });
                        showToast('计划已保存', 'success');
                        // 恢复按钮
                        const statusBadge = card.querySelector('.plan-status-badge');
                        const status = statusBadge?.dataset.status || 'ready';
                        newActionsEl.innerHTML = renderActionButtons(status, jobId);
                        newActionsEl.removeEventListener('click', handler);
                    } catch (err) {
                        showToast(err.message || '保存失败', 'error');
                        btn.disabled = false;
                        btn.textContent = '💾 保存计划';
                    }
                    return;
                }
            };
            newActionsEl.addEventListener('click', handler);
        }
    }

    // 根据 artifact 类型渲染交付按钮
    function renderDeliverActions(artifactType) {
        const type = artifactType || 'note';
        const actions = {
            chapter_draft: `
                <button class="plan-btn plan-btn-primary" data-action="adopt-chapter">📄 采纳为新章节</button>
                <button class="plan-btn" data-action="overwrite-chapter">🔄 覆盖当前草稿</button>
                <button class="plan-btn" data-action="compare-original">🔍 对比原文</button>
                <button class="plan-btn" data-action="save-draft">📝 保存草稿</button>
                <button class="plan-btn" data-action="copy-content">📋 复制内容</button>
            `,
            outline: `
                <button class="plan-btn plan-btn-primary" data-action="update-outline">📋 更新总纲</button>
                <button class="plan-btn" data-action="save-version">💾 保存为版本</button>
                <button class="plan-btn" data-action="copy-content">📋 复制内容</button>
            `,
            review_report: `
                <button class="plan-btn plan-btn-primary" data-action="view-report">📊 查看报告</button>
                <button class="plan-btn" data-action="copy-content">📋 复制内容</button>
            `,
            setting: `
                <button class="plan-btn plan-btn-primary" data-action="update-setting">⚙️ 更新设定</button>
                <button class="plan-btn" data-action="save-alternative">💾 保存为备选</button>
                <button class="plan-btn" data-action="copy-content">📋 复制内容</button>
            `,
            inspiration: `
                <button class="plan-btn plan-btn-primary" data-action="save-inspiration">💡 保存灵感</button>
                <button class="plan-btn" data-action="copy-content">📋 复制内容</button>
            `,
        };
        return actions[type] || actions.chapter_draft;
    }

    // ===== 更新 Plan 卡片（增量刷新） =====
    function updatePlanCard(card, data) {
        // 更新状态
        const badge = card.querySelector('.plan-status-badge');
        if (badge && badge.dataset.status !== data.status) {
            badge.dataset.status = data.status;
            badge.textContent = STATUS_LABELS[data.status] || data.status;
        }

        // 更新进度条
        const progressFill = card.querySelector('.plan-progress-fill');
        const progressText = card.querySelector('.plan-progress-text');
        if (progressFill) progressFill.style.width = `${data.progress || 0}%`;
        if (progressText) progressText.textContent = `${data.progress || 0}%`;

        // 更新步骤
        if (data.steps && data.steps.length > 0) {
            data.steps.forEach((step) => {
                const stepEl = card.querySelector(`[data-step-id="${step.id}"]`);
                if (stepEl) {
                    const oldStatus = stepEl.className.match(/plan-step--(\w+)/)?.[1];
                    // 状态变化时重建 DOM（保留 output 内容）
                    if (oldStatus !== step.status) {
                        const outputEl = stepEl.querySelector('[data-step-output]');
                        const existingOutput = outputEl?.innerHTML || '';
                        const newRow = createStepRow(step);
                        if (existingOutput) {
                            newRow.querySelector('[data-step-output]').innerHTML = existingOutput;
                        }
                        stepEl.replaceWith(newRow);
                    }

                    // 填充 output 内容（如果有 events 或 step.output）
                    const outputEl = card.querySelector(`[data-step-id="${step.id}"] [data-step-output]`);
                    if (outputEl && step.output?.content && !outputEl.innerHTML) {
                        let html = '';
                        // web_research 步骤展示来源
                        if (step.taskType === 'web_research' && step.output?.sources && step.output.sources.length > 0) {
                            html += `<div style="margin-bottom:8px;font-size:11px;color:var(--text-muted);">📚 参考来源</div>`;
                            for (const src of step.output.sources) {
                                html += `<div style="margin-bottom:6px;padding:6px 8px;background:var(--bg-tertiary);border-radius:var(--radius-sm);font-size:12px;">
                                    <div style="font-weight:500;color:var(--text-primary);margin-bottom:2px;">${escapeHtml(src.title)}</div>
                                    <a href="${escapeHtml(src.url)}" target="_blank" style="color:var(--accent);font-size:11px;word-break:break-all;">${escapeHtml(src.url)}</a>
                                    <div style="margin-top:4px;color:var(--text-secondary);font-size:11px;line-height:1.5;">${escapeHtml(src.excerpt).slice(0, 120)}...</div>
                                </div>`;
                            }
                            html += `<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px;">`;
                        }
                        const text = String(step.output.content).slice(0, 800).replace(/\n/g, '<br>');
                        html += text + (String(step.output.content).length > 800 ? '<br>...' : '');
                        if (step.taskType === 'web_research' && step.output?.sources && step.output.sources.length > 0) {
                            html += `</div>`;
                        }
                        outputEl.innerHTML = html;
                    }
                }
            });
        }

        // 更新操作按钮（状态变化时重建）
        const actionsEl = card.querySelector('.plan-actions');
        if (actionsEl) {
            const newButtons = renderActionButtons(data.status, data.id);
            if (actionsEl.innerHTML.trim() !== newButtons.trim()) {
                actionsEl.innerHTML = newButtons;
            }
        }

        // 交付面板：done 状态且收到 artifacts 时显示
        const deliverEl = card.querySelector('[data-deliver-panel]');
        if (deliverEl && data.status === 'done') {
            deliverEl.style.display = 'block';
            if (data.artifacts && data.artifacts.length > 0) {
                const artifact = data.artifacts[0];
                const workId = data.workId || card.dataset.workId;
                if (card._setArtifact) {
                    card._setArtifact(artifact, workId);
                }
                // 根据 artifact 类型渲染交付按钮
                const actionsEl = deliverEl.querySelector('[data-deliver-actions]');
                if (actionsEl) {
                    actionsEl.innerHTML = renderDeliverActions(artifact.type);
                }
            }
        }
    }

    // ===== 工具函数 =====
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function apiPost(path, body) {
        const baseUrl = (typeof window !== 'undefined' && window.API_BASE) || '/api';
        const token = localStorage.getItem('jz_token');
        const res = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`);
        return data;
    }

    // ===== 对外暴露 =====
    window.jzComposer = {
        createPlanCard,
        updatePlanCard,
        STATUS_ICONS,
        STATUS_LABELS,
    };
})();
