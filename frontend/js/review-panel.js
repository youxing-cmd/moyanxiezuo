// review-panel.js — 审稿报告面板
// 展示 chapter-review API 返回的六维度评分和问题列表

(function() {
    'use strict';

    const AGENT_LABELS = {
        plot: '剧情',
        character: '人物',
        pacing: '节奏',
        hook: '爽点',
        continuity: '设定',
        style: '文风',
    };

    const AGENT_COLORS = {
        plot: '#6366f1',
        character: '#8b5cf6',
        pacing: '#06b6d4',
        hook: '#f59e0b',
        continuity: '#10b981',
        style: '#ec4899',
    };

    const PRIORITY_LABELS = {
        high: '严重',
        medium: '注意',
        low: '建议',
    };

    const PRIORITY_COLORS = {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#3b82f6',
    };

    let currentPanel = null;
    let currentData = null;

    function createPanel(data) {
        const panel = document.createElement('div');
        panel.className = 'review-panel-overlay';
        panel.innerHTML = `
            <div class="review-panel">
                <div class="review-panel-header">
                    <div class="review-panel-title">
                        <span>📋</span>
                        <span>主编审稿报告</span>
                    </div>
                    <button class="review-panel-close" data-close>✕</button>
                </div>
                <div class="review-panel-body">
                    ${renderScoreSection(data.score)}
                    ${renderIssueList(data.issues)}
                </div>
                <div class="review-panel-footer">
                    <button class="review-btn review-btn-secondary" data-action="close">关闭</button>
                    <button class="review-btn review-btn-primary" data-action="re-review">🔄 重新审稿</button>
                </div>
            </div>
        `;

        bindEvents(panel, data);
        return panel;
    }

    function renderScoreSection(scores) {
        if (!scores) return '';
        const entries = Object.entries(scores).filter(([k]) => AGENT_LABELS[k]);
        const avg = entries.length > 0
            ? Math.round(entries.reduce((sum, [, v]) => sum + (Number(v) || 0), 0) / entries.length)
            : 0;

        let scoreBars = '';
        for (const [key, value] of entries) {
            const label = AGENT_LABELS[key] || key;
            const color = AGENT_COLORS[key] || '#6366f1';
            const pct = Math.max(0, Math.min(100, Number(value) || 0));
            scoreBars += `
                <div class="review-score-item">
                    <div class="review-score-label">
                        <span class="review-score-dot" style="background:${color}"></span>
                        <span>${label}</span>
                    </div>
                    <div class="review-score-bar-wrap">
                        <div class="review-score-bar" style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span class="review-score-value" style="color:${color}">${pct}</span>
                </div>
            `;
        }

        return `
            <div class="review-score-section">
                <div class="review-score-avg">
                    <div class="review-score-avg-num" style="color:${avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444'}">${avg}</div>
                    <div class="review-score-avg-label">综合评分</div>
                </div>
                <div class="review-score-bars">
                    ${scoreBars}
                </div>
            </div>
        `;
    }

    function renderIssueList(issues) {
        if (!issues || issues.length === 0) {
            return `<div class="review-empty">✨ 暂未发现问题，本章状态良好</div>`;
        }

        // 按优先级排序：high > medium > low
        const sorted = [...issues].sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
        });

        const counts = { high: 0, medium: 0, low: 0 };
        sorted.forEach(i => { if (counts[i.priority] !== undefined) counts[i.priority]++; });

        let html = `
            <div class="review-issue-header">
                <span>共 ${sorted.length} 个问题</span>
                ${counts.high > 0 ? `<span class="review-issue-count" style="background:#ef444420;color:#ef4444">严重 ${counts.high}</span>` : ''}
                ${counts.medium > 0 ? `<span class="review-issue-count" style="background:#f59e0b20;color:#f59e0b">注意 ${counts.medium}</span>` : ''}
                ${counts.low > 0 ? `<span class="review-issue-count" style="background:#3b82f620;color:#3b82f6">建议 ${counts.low}</span>` : ''}
            </div>
            <div class="review-issue-list">
        `;

        for (const issue of sorted) {
            const priority = issue.priority || 'low';
            const pLabel = PRIORITY_LABELS[priority] || priority;
            const pColor = PRIORITY_COLORS[priority] || '#3b82f6';
            const agentLabel = AGENT_LABELS[issue.agent] || issue.agent || '综合';
            const agentColor = AGENT_COLORS[issue.agent] || '#6366f1';
            const issueId = `issue-${Math.random().toString(36).slice(2, 8)}`;

            html += `
                <div class="review-issue-item" data-priority="${priority}">
                    <div class="review-issue-main" data-toggle="${issueId}">
                        <span class="review-issue-priority" style="background:${pColor}20;color:${pColor};border:1px solid ${pColor}40">${pLabel}</span>
                        <span class="review-issue-agent" style="background:${agentColor}15;color:${agentColor}">${agentLabel}</span>
                        <span class="review-issue-title">${escapeHtml(issue.title)}</span>
                        <span class="review-issue-arrow">▸</span>
                    </div>
                    <div class="review-issue-detail" id="${issueId}" style="display:none">
                        <div class="review-issue-block">
                            <div class="review-issue-block-label">📍 原文证据</div>
                            <div class="review-issue-evidence">${escapeHtml(issue.evidence || '无')}</div>
                        </div>
                        <div class="review-issue-block">
                            <div class="review-issue-block-label">💡 修改建议</div>
                            <div class="review-issue-suggestion">${escapeHtml(issue.suggestion || '无')}</div>
                        </div>
                        <div class="review-issue-actions">
                            <button class="review-issue-btn review-issue-btn-primary" data-adopt data-title="${escapeHtml(issue.title)}" data-suggestion="${escapeHtml(issue.suggestion || '')}">采纳建议</button>
                            <button class="review-issue-btn" data-locate data-evidence="${escapeHtml(issue.evidence || '')}">定位原文</button>
                            <button class="review-issue-btn review-issue-btn-muted" data-ignore>忽略</button>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    function bindEvents(panel, data) {
        // 关闭
        panel.querySelector('[data-close]')?.addEventListener('click', () => close());
        panel.querySelector('[data-action="close"]')?.addEventListener('click', () => close());
        panel.addEventListener('click', (e) => {
            if (e.target === panel) close();
        });

        // 重新审稿
        const reReviewBtn = panel.querySelector('[data-action="re-review"]');
        if (reReviewBtn) {
            reReviewBtn.addEventListener('click', () => {
                panel.dispatchEvent(new CustomEvent('re-review', { bubbles: true }));
            });
        }

        // 展开/折叠问题详情
        panel.querySelectorAll('[data-toggle]').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const id = toggle.dataset.toggle;
                const detail = panel.querySelector(`#${id}`);
                if (!detail) return;
                const isHidden = detail.style.display === 'none';
                detail.style.display = isHidden ? 'block' : 'none';
                const arrow = toggle.querySelector('.review-issue-arrow');
                if (arrow) arrow.style.transform = isHidden ? 'rotate(90deg)' : '';
            });
        });

        // 问题操作按钮
        panel.querySelectorAll('[data-adopt]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const title = btn.dataset.title || '';
                const suggestion = btn.dataset.suggestion || '';
                panel.dispatchEvent(new CustomEvent('issue-adopt', {
                    bubbles: true,
                    detail: { title, suggestion },
                }));
            });
        });

        panel.querySelectorAll('[data-locate]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const evidence = btn.dataset.evidence || '';
                panel.dispatchEvent(new CustomEvent('issue-locate', {
                    bubbles: true,
                    detail: { evidence },
                }));
            });
        });

        panel.querySelectorAll('[data-ignore]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.review-issue-item');
                if (item) {
                    item.style.opacity = '0.4';
                    item.dataset.ignored = 'true';
                    btn.textContent = '已忽略';
                    btn.disabled = true;
                }
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function open(data, options = {}) {
        close();
        currentData = data;
        currentPanel = createPanel(data);

        // 绑定外部回调
        if (options.onReReview) {
            currentPanel.addEventListener('re-review', options.onReReview);
        }
        if (options.onAdopt) {
            currentPanel.addEventListener('issue-adopt', (e) => options.onAdopt(e.detail));
        }
        if (options.onLocate) {
            currentPanel.addEventListener('issue-locate', (e) => options.onLocate(e.detail));
        }

        document.body.appendChild(currentPanel);
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (currentPanel) {
            currentPanel.remove();
            currentPanel = null;
        }
        currentData = null;
        document.body.style.overflow = '';
    }

    window.jzReviewPanel = { open, close };
})();
