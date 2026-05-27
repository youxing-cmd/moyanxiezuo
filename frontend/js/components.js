function showToast(message, type = 'info') {
    const existing = document.querySelector('.jz-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'jz-toast';
    const colors = {
        info: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--danger)',
        danger: 'var(--danger)'
    };
    const icons = {
        info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', danger: '❌'
    };
    toast.innerHTML = `
        <span style="margin-right: 8px;">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: var(--bg-secondary);
        color: var(--text-primary);
        padding: 12px 24px;
        border-radius: var(--radius);
        border: 1px solid ${colors[type] || colors.info};
        box-shadow: var(--shadow);
        font-size: 13px;
        font-weight: 500;
        z-index: 9999;
        display: flex;
        align-items: center;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ========== Modal 弹窗系统 ==========
function showModal(title, content) {
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
            max-width: 520px; width: 90%; max-height: 80vh; overflow-y: auto;
            box-shadow: var(--shadow); transform: scale(0.95);
            transition: transform 0.2s ease;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">${title}</span>
                <button onclick="this.closest('.jz-modal-overlay').remove()" style="
                    background: none; border: none; color: var(--text-muted);
                    cursor: pointer; font-size: 18px; padding: 4px;
                ">✕</button>
            </div>
            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    // ESC 关闭弹窗
    const onEsc = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', onEsc);
        }
    };
    document.addEventListener('keydown', onEsc);
    // 弹窗关闭时移除监听（覆盖 remove 场景）
    const origRemove = overlay.remove.bind(overlay);
    overlay.remove = () => {
        document.removeEventListener('keydown', onEsc);
        origRemove();
    };
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.jz-modal').style.transform = 'scale(1)';
    });
}

// ========== 热点 AI 分析（SSE 流式）==========

// ========== AI 结果统一操作栏 ==========
// 统一渲染 AI 工具结果底部的操作按钮（复制/插入/替换/对比/重新生成/收藏/引用/点赞/点踩）
// 用法：createResultActionBar(containerElement, { text, actions, originalText, onCopy, onInsert, onReplace, onRetry, ... })
function createResultActionBar(container, options = {}) {
    const {
        text = '',
        actions = [],
        originalText = '',
        onCopy,
        onInsert,
        onReplace,
        onRetry,
        onInspiration,
        onQuote,
        resultSelector = ''
    } = options;

    // 清除同容器内已有的 action bar（避免重复）
    const existing = container.querySelector('.jz-result-actions');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.className = 'jz-result-actions';

    const btnDefs = {
        copy: { label: '📋 复制', cls: 'jz-action-btn' },
        insert: { label: '✓ 插入正文', cls: 'jz-action-btn primary' },
        replace: { label: '✓ 替换原文', cls: 'jz-action-btn primary' },
        accept: { label: '✓ 采纳建议', cls: 'jz-action-btn primary' },
        diff: { label: '📊 差异对比', cls: 'jz-action-btn' },
        retry: { label: '🔄 重新生成', cls: 'jz-action-btn' },
        regenerate: { label: '🔄 重新生成', cls: 'jz-action-btn' },
        inspiration: { label: '⭐ 收藏', cls: 'jz-action-btn' },
        quote: { label: '💬 引用', cls: 'jz-action-btn' },
        like: { label: '👍', cls: 'jz-action-btn ghost' },
        dislike: { label: '👎', cls: 'jz-action-btn ghost' }
    };

    actions.forEach(action => {
        const def = btnDefs[action];
        if (!def) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = def.cls;
        btn.dataset.action = action;
        btn.innerHTML = '<span>' + def.label + '</span>';
        bar.appendChild(btn);
    });

    container.appendChild(bar);

    // 获取结果文本（优先从 resultSelector 指向的元素读取）
    function getResultText() {
        if (resultSelector) {
            const el = container.querySelector(resultSelector) || document.querySelector(resultSelector);
            if (el) return (el.textContent || '').trim();
        }
        return (text || '').trim();
    }

    function getResultHtml() {
        if (resultSelector) {
            const el = container.querySelector(resultSelector) || document.querySelector(resultSelector);
            if (el) return el.innerHTML || '';
        }
        return '';
    }

    // 内联复制 fallback（不依赖 interactions-core.js 的 fallbackCopy）
    function doCopy(txt) {
        if (!txt) { showToast('内容为空', 'warning'); return; }
        const write = () => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(txt).then(() => showToast('已复制', 'success')).catch(execFallback);
            } else {
                execFallback();
            }
        };
        const execFallback = () => {
            const textarea = document.createElement('textarea');
            textarea.value = txt;
            textarea.style.cssText = 'position:fixed;opacity:0;z-index:-1;';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('已复制', 'success');
            } catch {
                showToast('复制失败，请手动复制', 'danger');
            }
            document.body.removeChild(textarea);
        };
        write();
    }

    bar.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const resultText = getResultText();
            const resultHtml = getResultHtml();

            switch (action) {
                case 'copy':
                    if (onCopy) onCopy(resultText);
                    else doCopy(resultText);
                    break;
                case 'insert':
                    if (onInsert) onInsert(resultText, resultHtml);
                    else showToast('暂无可插入的编辑器', 'warning');
                    break;
                case 'replace':
                    if (onReplace) onReplace(resultText, resultHtml);
                    else {
                        const sel = window.getSelection();
                        if (sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            range.deleteContents();
                            const html = resultHtml || ('<p>' + (typeof escapeHtml === 'function' ? escapeHtml(resultText) : resultText).replace(/\n/g, '</p><p>') + '</p>');
                            const fragment = document.createRange().createContextualFragment(html);
                            range.insertNode(fragment);
                            sel.removeAllRanges();
                            showToast('已替换', 'success');
                            if (typeof currentWorkId !== 'undefined' && currentWorkId && typeof currentChapterId !== 'undefined' && currentChapterId && typeof saveCurrentChapter === 'function') {
                                saveCurrentChapter(false);
                            }
                        } else {
                            showToast('请先在编辑器中选中要替换的文本', 'warning');
                        }
                    }
                    break;
                case 'accept':
                    if (onReplace) onReplace(resultText, resultHtml);
                    else {
                        const editorArea = document.getElementById('editorArea');
                        if (editorArea) {
                            const html = resultHtml || ('<p>' + (typeof escapeHtml === 'function' ? escapeHtml(resultText) : resultText).replace(/\n/g, '</p><p>') + '</p>');
                            const fragment = document.createRange().createContextualFragment(html);
                            editorArea.appendChild(fragment);
                            showToast('已采纳到正文', 'success');
                            if (typeof currentWorkId !== 'undefined' && currentWorkId && typeof currentChapterId !== 'undefined' && currentChapterId && typeof saveCurrentChapter === 'function') {
                                saveCurrentChapter(false);
                            }
                        } else {
                            showToast('暂无可采纳的编辑器', 'warning');
                        }
                    }
                    break;
                case 'diff':
                    if (!originalText) { showToast('无原文可对比', 'warning'); return; }
                    if (typeof injectDiffPanel === 'function' && resultSelector) {
                        const id = resultSelector.replace(/^#/, '');
                        injectDiffPanel(id, originalText);
                    } else {
                        showToast('差异对比暂不可用', 'warning');
                    }
                    break;
                case 'retry':
                case 'regenerate':
                    if (onRetry) onRetry();
                    break;
                case 'inspiration':
                    if (onInspiration) onInspiration();
                    break;
                case 'quote':
                    if (onQuote) onQuote();
                    break;
                case 'like': {
                    const isLiked = btn.style.color === 'var(--success)';
                    btn.style.color = isLiked ? 'var(--text-muted)' : 'var(--success)';
                    if (!isLiked) {
                        const dislikeBtn = bar.querySelector('[data-action="dislike"]');
                        if (dislikeBtn) dislikeBtn.style.color = 'var(--text-muted)';
                    }
                    showToast(isLiked ? '已取消点赞' : '已点赞', 'success');
                    break;
                }
                case 'dislike': {
                    const isDisliked = btn.style.color === 'var(--danger)';
                    btn.style.color = isDisliked ? 'var(--text-muted)' : 'var(--danger)';
                    if (!isDisliked) {
                        const likeBtn = bar.querySelector('[data-action="like"]');
                        if (likeBtn) likeBtn.style.color = 'var(--text-muted)';
                    }
                    showToast(isDisliked ? '已取消点踩' : '已点踩', 'info');
                    break;
                }
            }
        });
    });

    return bar;
}
