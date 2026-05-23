// L8 主动建议层：编辑器事件采集 + 建议气泡
(function() {
    let lastTyping = Date.now();
    let wordCount = 0;

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

    // 已展示过的 suggestion id（内存级，切页后重置，避免重复弹）
    const dismissedBubbleIds = new Set();

    async function checkPendingSuggestions() {
        if (!currentWorkId) return;
        try {
            const list = await api('/suggestions?limit=5');
            if (!list || !list.length) return;
            const pending = list.filter(s => s.status === 'pending' && String(s.workId) === String(currentWorkId));
            for (const s of pending) {
                if (!dismissedBubbleIds.has(s.id)) {
                    showSuggestionBubble(s);
                    dismissedBubbleIds.add(s.id);
                    break; // 一次只弹一个
                }
            }
        } catch (e) {
            // 静默失败，不影响写作
        }
    }

    window.attachProactiveAgent = function(editor) {
        if (!editor) return;

        // 清除旧 interval，避免切页后累积
        if (editor._proactiveInterval) {
            clearInterval(editor._proactiveInterval);
        }
        if (editor._suggestionPoll) {
            clearInterval(editor._suggestionPoll);
        }

        // 每次挂载重置 typing 时间，避免切页后立即误报 idle
        lastTyping = Date.now();

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
        editor._proactiveInterval = setInterval(() => {
            const idle = (Date.now() - lastTyping) / 1000;
            if (idle >= 60) {
                reportIdle();
            }
        }, 10000);

        // 每 30s 轮询一次 pending suggestions，弹出气泡
        editor._suggestionPoll = setInterval(() => {
            checkPendingSuggestions();
        }, 30000);

        // 首次挂载也立即检查一次
        checkPendingSuggestions();
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
            // 事件委托：避免 inline onclick
            bubble.addEventListener('click', handleBubbleClick);
            document.body.appendChild(bubble);
        }
        bubble.classList.remove('minimized');
        bubble.style.width = '320px';
        bubble.style.padding = '16px';
        // 存储当前数据供事件委托使用
        bubble._suggestionData = data;

        const triggerLabels = {
            idle_timeout: '💡 卡文了吗？',
            plot_stagnation: '📈 剧情停滞提示',
            logic_conflict: '⚠️ 逻辑矛盾提醒',
            style_drift: '🎨 风格偏移提醒',
        };

        const title = triggerLabels[data.triggerType] || '💡 Agent 建议';
        const content = data.content || 'Agent 为你生成了一个建议';

        bubble.innerHTML = `
            <div id="suggestionBubbleHeader" style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <span style="font-size:14px; font-weight:600; color:var(--text-primary);">${title}</span>
                <div style="display:flex; gap:4px;">
                    <button data-action="minimize" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:0 4px;" title="收起">−</button>
                    <button data-action="dismiss" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; padding:0 4px;" title="关闭">✕</button>
                </div>
            </div>
            <div id="suggestionBubbleBody" style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:12px;">${escapeHtml(content)}</div>
            <div id="suggestionBubbleActions" style="display:flex; gap:8px;">
                <button class="btn btn-primary btn-sm" data-action="accept" style="flex:1;">采纳</button>
                <button class="btn btn-ghost btn-sm" data-action="ignore" style="flex:1;">忽略</button>
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

    function handleBubbleClick(e) {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        const data = bubble?._suggestionData;
        const btn = e.target.closest('button');
        if (!btn || !data) return;
        const action = btn.dataset.action;
        if (!action) return;

        e.stopPropagation();
        switch (action) {
            case 'minimize':
                minimizeSuggestionBubble();
                break;
            case 'dismiss':
                dismissSuggestion(data.id);
                break;
            case 'accept':
                acceptSuggestion(data.id, data.content, data.workId);
                break;
            case 'ignore':
                ignoreSuggestion(data.id);
                break;
        }
    }

    window.minimizeSuggestionBubble = function() {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (!bubble) return;
        bubble.classList.add('minimized');
        bubble.style.width = '48px';
        bubble.style.padding = '12px';
        bubble.innerHTML = '<div data-action="restore" style="cursor:pointer; font-size:20px; text-align:center;" title="展开建议">💡</div>';
    };

    window.restoreSuggestionBubble = function() {
        const bubble = document.getElementById('proactiveSuggestionBubble');
        if (!bubble) return;
        bubble.classList.remove('minimized');
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
        if (input && content) {
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
