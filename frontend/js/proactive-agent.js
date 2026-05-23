// L8 主动建议层：编辑器事件采集 + 建议气泡
(function() {
    let lastTyping = Date.now();
    let wordCount = 0;
    let attached = false;

    function throttle(fn, ms) {
        let last = 0;
        return function(...args) {
            const now = Date.now();
            if (now - last >= ms) {
                last = now;
                fn.apply(this, args);
            }
        };
    }

    function reportTyping() {
        if (!currentWorkId || !currentChapterId) return;
        api('/proactive/events/typing', {
            method: 'POST',
            body: { workId: currentWorkId, chapterId: currentChapterId, wordCount }
        }).catch(() => {});
    }

    function reportIdle() {
        if (!currentWorkId || !currentChapterId) return;
        api('/proactive/events/idle', { method: 'POST' }).catch(() => {});
    }

    function reportParagraph() {
        if (!currentWorkId || !currentChapterId) return;
        api('/proactive/events/paragraph', {
            method: 'POST',
            body: { wordCount, chapterId: currentChapterId }
        }).catch(() => {});
    }

    window.attachProactiveAgent = function(editor) {
        if (attached || !editor) return;
        attached = true;

        editor.addEventListener('input', throttle(() => {
            lastTyping = Date.now();
            wordCount = countWords(editor.innerText);
            reportTyping();
        }, 2000));

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                wordCount = countWords(editor.innerText);
                reportParagraph();
            }
        });

        // 每 10s 检查一次 idle
        setInterval(() => {
            const idle = (Date.now() - lastTyping) / 1000;
            if (idle >= 60) {
                reportIdle();
            }
        }, 10000);
    };

    function countWords(text) {
        if (!text) return 0;
        return text.replace(/\s/g, '').length;
    }

    // 建议气泡展示
    window.showSuggestionBubble = function(data) {
        let bubble = document.getElementById('proactiveSuggestionBubble');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = 'proactiveSuggestionBubble';
            bubble.style.cssText = 'position:fixed; bottom:20px; right:20px; width:320px; max-width:90vw; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius); padding:16px; z-index:1000; box-shadow:0 8px 24px rgba(0,0,0,0.2); animation:slideIn 0.3s ease; transition:all 0.3s ease;';
            document.body.appendChild(bubble);
        }
        bubble.classList.remove('minimized');
        bubble.style.width = '320px';
        bubble.style.padding = '16px';

        const triggerLabels = {
            idle_timeout: '💡 卡文了吗？',
            plot_stagnation: '📈 剧情停滞提示',
            logic_conflict: '⚠️ 逻辑矛盾提醒',
            style_drift: '🎨 风格偏移提醒',
        };

        const title = triggerLabels[data.triggerType] || '💡 Agent 建议';
        const content = data.content || 'Agent 为你生成了一个建议';

        const safeContent = escapeHtml(content).replace(/'/g, "\\'");

        bubble.innerHTML = `
            <div id="suggestionBubbleHeader" style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <span style="font-size:14px; font-weight:600; color:var(--text-primary);">${title}</span>
                <div style="display:flex; gap:4px;">
                    <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:0 4px;" onclick="minimizeSuggestionBubble()" title="收起">−</button>
                    <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:0 4px;" onclick="dismissSuggestion(${data.id || 0})" title="关闭">✕</button>
                </div>
            </div>
            <div id="suggestionBubbleBody" style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:12px;">${escapeHtml(content)}</div>
            <div id="suggestionBubbleActions" style="display:flex; gap:8px;">
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="acceptSuggestion(${data.id || 0}, '${safeContent}')">采纳</button>
                <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="ignoreSuggestion(${data.id || 0})">忽略</button>
            </div>
        `;

        // 15 秒后自动最小化（不是关闭）
        clearTimeout(bubble._autoMinimizeTimer);
        bubble._autoMinimizeTimer = setTimeout(() => {
            if (bubble && !bubble.classList.contains('minimized')) {
                minimizeSuggestionBubble();
            }
        }, 15000);
    };

    window.minimizeSuggestionBubble = function() {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (!bubble) return;
        bubble.classList.add('minimized');
        bubble.style.width = '48px';
        bubble.style.padding = '12px';
        bubble.innerHTML = `<div style="cursor:pointer; font-size:20px; text-align:center;" onclick="restoreSuggestionBubble()" title="展开建议">💡</div>`;
    };

    window.restoreSuggestionBubble = function() {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (!bubble) return;
        bubble.classList.remove('minimized');
        // 重新触发 showSuggestionBubble 需要原始数据，这里简单关闭让用户去 Dashboard 查看
        bubble.remove();
        showToast('建议已收起，可在 Dashboard 查看', 'info');
    };

    window.dismissSuggestion = function(id) {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (bubble) bubble.remove();
        if (id) {
            api(`/suggestions/${id}/status`, { method: 'PUT', body: { status: 'dismissed' } }).catch(() => {});
        }
    };

    window.acceptSuggestion = function(id, content, workId) {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (bubble) bubble.remove();
        if (id) {
            api(`/suggestions/${id}/status`, { method: 'PUT', body: { status: 'accepted' } }).catch(() => {});
        }
        // 将建议内容填入 AI 输入框
        const input = document.getElementById('aiChatInput');
        if (input) {
            input.value = content;
            input.focus();
        }
        // 如果有 workId，跳转到写作页
        if (workId) {
            enterWriting(workId);
        }
    };

    window.ignoreSuggestion = function(id) {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (bubble) bubble.remove();
        if (id) {
            api(`/suggestions/${id}/status`, { method: 'PUT', body: { status: 'ignored' } }).catch(() => {});
        }
    };
})();
