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
                    <div class="plan-deliver-actions">
                        <button class="plan-btn plan-btn-primary" data-action="adopt-chapter">📄 采纳为新章节</button>
                        <button class="plan-btn" data-action="save-draft">📝 保存草稿</button>
                        <button class="plan-btn" data-action="copy-content">📋 复制内容</button>
                    </div>
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
            return `<button class="plan-btn plan-btn-primary" data-action="start">▶ 开始执行</button>`;
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

        const icon = STATUS_ICONS[step.status] || STATUS_ICONS.pending;
        const label = STATUS_LABELS[step.status] || step.status;

        el.innerHTML = `
            <div class="plan-step-main">
                <span class="plan-step-icon">${icon}</span>
                <span class="plan-step-title">${step.idx + 1}. ${escapeHtml(step.title)}</span>
                <span class="plan-step-label">${label}</span>
            </div>
            ${step.retryCount > 0 ? `<span class="plan-step-retry">重试 ${step.retryCount}</span>` : ''}
        `;

        return el;
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

            // 交付动作
            if (action === 'adopt-chapter') {
                if (!currentArtifact?.content || !currentWorkId) {
                    showToast('没有可用的产物内容', 'error');
                    return;
                }
                btn.disabled = true;
                try {
                    await apiPost(`/works/${currentWorkId}/chapters`, {
                        title: currentArtifact.title || 'Agent 生成章节',
                        content: currentArtifact.content,
                    });
                    showToast('已采纳为新章节', 'success');
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
                    await apiPost(`/works/${currentWorkId}/drafts`, {
                        title: currentArtifact.title || 'Agent 草稿',
                        content: currentArtifact.content,
                    });
                    showToast('已保存为草稿', 'success');
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
                    // 仅当状态变化时更新 DOM
                    if (!stepEl.classList.contains(`plan-step--${step.status}`)) {
                        stepEl.className = `plan-step plan-step--${step.status}`;
                        const icon = stepEl.querySelector('.plan-step-icon');
                        const label = stepEl.querySelector('.plan-step-label');
                        if (icon) icon.innerHTML = STATUS_ICONS[step.status] || STATUS_ICONS.pending;
                        if (label) label.textContent = STATUS_LABELS[step.status] || step.status;
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
