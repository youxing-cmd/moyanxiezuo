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
        const prev = data.previousData;
        const isCompare = !!prev;
        const panel = document.createElement('div');
        panel.className = 'review-panel-overlay';
        panel.innerHTML = `
            <div class="review-panel">
                <div class="review-panel-header">
                    <div class="review-panel-title">
                        <span>${isCompare ? '📊' : '📋'}</span>
                        <span>${isCompare ? '审稿复核对比' : '主编审稿报告'}</span>
                    </div>
                    <button class="review-panel-close" data-close>✕</button>
                </div>
                <div class="review-panel-body">
                    ${isCompare ? renderCompareBadge(prev, data) : ''}
                    ${renderScoreSection(data.score, prev?.score)}
                    ${renderIssueList(data.issues, prev?.issues)}
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

    // 问题指纹：用于匹配新旧问题
    function issueFingerprint(issue) {
        const text = (issue.title || '') + (issue.evidence || '');
        return text.slice(0, 40).trim();
    }

    function renderCompareBadge(prev, current) {
        const prevAvg = computeAvgScore(prev.score);
        const currAvg = computeAvgScore(current.score);
        const delta = currAvg - prevAvg;
        const deltaText = delta > 0 ? `+${delta}` : `${delta}`;
        const deltaColor = delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : 'var(--text-muted)';

        const prevSet = new Set((prev.issues || []).map(issueFingerprint));
        const currSet = new Set((current.issues || []).map(issueFingerprint));
        const fixed = (prev.issues || []).filter(i => !currSet.has(issueFingerprint(i))).length;
        const added = (current.issues || []).filter(i => !prevSet.has(issueFingerprint(i))).length;

        return `
            <div class="review-compare-badge">
                <span>上次评分 ${prevAvg} → 本次 ${currAvg}</span>
                <span style="color:${deltaColor};font-weight:600">${deltaText}</span>
                ${fixed > 0 ? `<span style="color:#10b981">✓ 已修复 ${fixed} 个</span>` : ''}
                ${added > 0 ? `<span style="color:#ef4444">+ 新增 ${added} 个</span>` : ''}
            </div>
        `;
    }

    function computeAvgScore(scores) {
        if (!scores) return 0;
        const entries = Object.entries(scores).filter(([k]) => AGENT_LABELS[k]);
        if (entries.length === 0) return 0;
        return Math.round(entries.reduce((sum, [, v]) => sum + (Number(v) || 0), 0) / entries.length);
    }

    function renderScoreSection(scores, prevScores) {
        if (!scores) return '';
        const entries = Object.entries(scores).filter(([k]) => AGENT_LABELS[k]);
        const avg = computeAvgScore(scores);
        const isCompare = !!prevScores;

        let scoreBars = '';
        for (const [key, value] of entries) {
            const label = AGENT_LABELS[key] || key;
            const color = AGENT_COLORS[key] || '#6366f1';
            const pct = Math.max(0, Math.min(100, Number(value) || 0));
            const prevPct = prevScores ? Math.max(0, Math.min(100, Number(prevScores[key]) || 0)) : null;
            const delta = prevPct !== null ? pct - prevPct : null;
            const deltaHtml = delta !== null
                ? ` <span style="font-size:11px;color:${delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : 'var(--text-muted)'}">${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}${Math.abs(delta)}</span>`
                : '';

            scoreBars += `
                <div class="review-score-item">
                    <div class="review-score-label">
                        <span class="review-score-dot" style="background:${color}"></span>
                        <span>${label}</span>
                    </div>
                    <div class="review-score-bar-wrap">
                        <div class="review-score-bar" style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span class="review-score-value" style="color:${color}">${pct}${deltaHtml}</span>
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

    function renderIssueList(issues, prevIssues) {
        if (!issues || issues.length === 0) {
            return `<div class="review-empty">✨ 暂未发现问题，本章状态良好</div>`;
        }

        const prevSet = new Set((prevIssues || []).map(issueFingerprint));
        const currSet = new Set(issues.map(issueFingerprint));

        // 标记每条问题的状态
        const enriched = issues.map(i => ({
            ...i,
            _status: prevSet.has(issueFingerprint(i)) ? 'existing' : 'new',
        }));

        // 已修复的问题（旧有中新无）
        const fixedIssues = (prevIssues || [])
            .filter(i => !currSet.has(issueFingerprint(i)))
            .map(i => ({ ...i, _status: 'fixed' }));

        // 合并并按优先级排序
        const all = [...enriched, ...fixedIssues].sort((a, b) => {
            const order = { fixed: 0, new: 1, high: 2, medium: 3, low: 4 };
            const aPri = order[a._status] ?? (order[a.priority] ?? 5) + 2;
            const bPri = order[b._status] ?? (order[b.priority] ?? 5) + 2;
            return aPri - bPri;
        });

        const counts = { high: 0, medium: 0, low: 0 };
        enriched.forEach(i => { if (counts[i.priority] !== undefined) counts[i.priority]++; });

        let html = `
            <div class="review-issue-header">
                <span>共 ${enriched.length} 个问题</span>
                ${counts.high > 0 ? `<span class="review-issue-count" style="background:#ef444420;color:#ef4444">严重 ${counts.high}</span>` : ''}
                ${counts.medium > 0 ? `<span class="review-issue-count" style="background:#f59e0b20;color:#f59e0b">注意 ${counts.medium}</span>` : ''}
                ${counts.low > 0 ? `<span class="review-issue-count" style="background:#3b82f620;color:#3b82f6">建议 ${counts.low}</span>` : ''}
                ${fixedIssues.length > 0 ? `<span class="review-issue-count" style="background:#10b98120;color:#10b981">已修复 ${fixedIssues.length}</span>` : ''}
            </div>
            <div class="review-issue-list">
        `;

        for (const issue of all) {
            const isFixed = issue._status === 'fixed';
            const isNew = issue._status === 'new';
            const priority = issue.priority || 'low';
            const pLabel = PRIORITY_LABELS[priority] || priority;
            const pColor = PRIORITY_COLORS[priority] || '#3b82f6';
            const agentLabel = AGENT_LABELS[issue.agent] || issue.agent || '综合';
            const agentColor = AGENT_COLORS[issue.agent] || '#6366f1';
            const issueId = `issue-${Math.random().toString(36).slice(2, 8)}`;

            const statusBadge = isFixed
                ? `<span class="review-issue-status" style="background:#10b98120;color:#10b981;border:1px solid #10b98140">✓ 已修复</span>`
                : isNew
                ? `<span class="review-issue-status" style="background:#ef444420;color:#ef4444;border:1px solid #ef444440">新增</span>`
                : '';

            html += `
                <div class="review-issue-item" data-priority="${priority}" ${isFixed ? 'data-fixed="true"' : ''} style="${isFixed ? 'opacity:0.6;' : ''}">
                    <div class="review-issue-main" data-toggle="${issueId}">
                        ${statusBadge}
                        <span class="review-issue-priority" style="background:${pColor}20;color:${pColor};border:1px solid ${pColor}40">${pLabel}</span>
                        <span class="review-issue-agent" style="background:${agentColor}15;color:${agentColor}">${agentLabel}</span>
                        <span class="review-issue-title" style="${isFixed ? 'text-decoration:line-through;' : ''}">${escapeHtml(issue.title)}</span>
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
                        ${isFixed ? '' : `
                        <div class="review-issue-actions">
                            <button class="review-issue-btn review-issue-btn-primary" data-adopt data-evidence="${escapeHtml(issue.evidence || '')}" data-suggestion="${escapeHtml(issue.suggestion || '')}">采纳建议</button>
                            <button class="review-issue-btn" data-locate data-evidence="${escapeHtml(issue.evidence || '')}">定位原文</button>
                            <button class="review-issue-btn review-issue-btn-muted" data-ignore>忽略</button>
                        </div>
                        <div class="review-issue-edit" style="display:none;" data-edit-area>
                            <textarea class="review-issue-textarea" data-edit-input placeholder="在此编辑修改内容...">${escapeHtml(issue.suggestion || '')}</textarea>
                            <div class="review-issue-edit-actions">
                                <button class="review-issue-btn review-issue-btn-primary" data-apply>应用修改</button>
                                <button class="review-issue-btn review-issue-btn-muted" data-cancel-edit>取消</button>
                            </div>
                        </div>`}
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
                const detailEl = btn.closest('.review-issue-detail');
                const editArea = detailEl?.querySelector('[data-edit-area]');
                if (editArea) {
                    editArea.style.display = 'block';
                    const input = editArea.querySelector('[data-edit-input]');
                    if (input) input.focus();
                }
            });
        });

        panel.querySelectorAll('[data-apply]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const detailEl = btn.closest('.review-issue-detail');
                const input = detailEl?.querySelector('[data-edit-input]');
                const evidence = detailEl?.closest('.review-issue-item')?.querySelector('[data-adopt]')?.dataset.evidence || '';
                const revised = input?.value?.trim() || '';
                if (!revised) {
                    showToast('修改内容不能为空', 'warning');
                    return;
                }
                panel.dispatchEvent(new CustomEvent('issue-apply', {
                    bubbles: true,
                    detail: { evidence, revised },
                }));
            });
        });

        panel.querySelectorAll('[data-cancel-edit]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const detailEl = btn.closest('.review-issue-detail');
                const editArea = detailEl?.querySelector('[data-edit-area]');
                if (editArea) editArea.style.display = 'none';
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
        if (options.onApply) {
            currentPanel.addEventListener('issue-apply', (e) => options.onApply(e.detail));
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
