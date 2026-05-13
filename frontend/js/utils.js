// 全局工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 判断 avatar 是否为图片 URL（兼容缺少协议前缀的情况）
function resolveAvatar(val, fallback) {
    const fb = fallback || '创';
    if (val == null) return { isUrl: false, text: fb };
    const s = String(val).trim();
    if (!s) return { isUrl: false, text: fb };
    if (/^(https?:)?\/\//i.test(s)) {
        return { isUrl: true, src: s.startsWith('//') ? 'https:' + s : s };
    }
    // 不带协议但显然是 URL（含路径分隔符或域名特征）
    if (/[\/.]/.test(s) && s.length > 6 && !/^[\p{L}\p{N}\p{Emoji}]$/u.test(s)) {
        return { isUrl: true, src: 'https://' + s.replace(/^\/+/, '') };
    }
    return { isUrl: false, text: s };
}

function renderMarkdown(md) {
    if (!md) return '';
    return md
        .replace(/^### (.*$)/gim, '<h3 style="font-size:14px;font-weight:600;margin:12px 0 6px;color:var(--text-primary);">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size:15px;font-weight:600;margin:14px 0 8px;color:var(--text-primary);">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="font-size:16px;font-weight:600;margin:16px 0 10px;color:var(--text-primary);">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gim, '<li style="margin-left:16px;margin-bottom:4px;">$1</li>')
        .replace(/\n/g, '<br>');
}

// ========== AI 替换：句子级 LCS Diff ==========
function splitSentencesForDiff(text) {
    if (!text) return [];
    const out = [];
    const re = /[^。！？!?\n]+[。！？!?]?|\n/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        if (m[0]) out.push(m[0]);
    }
    return out;
}

function lcsDiffSentences(a, b) {
    const n = a.length, m = b.length;
    if (n === 0) return b.map(t => ({ type: 'add', text: t }));
    if (m === 0) return a.map(t => ({ type: 'remove', text: t }));
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const out = [];
    let i = n, j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            out.unshift({ type: 'same', text: a[i - 1] });
            i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            out.unshift({ type: 'remove', text: a[i - 1] });
            i--;
        } else {
            out.unshift({ type: 'add', text: b[j - 1] });
            j--;
        }
    }
    while (i > 0) out.unshift({ type: 'remove', text: a[--i] });
    while (j > 0) out.unshift({ type: 'add', text: b[--j] });
    return out;
}

function renderDiffHtml(originalText, newText) {
    const a = splitSentencesForDiff((originalText || '').trim());
    const b = splitSentencesForDiff((newText || '').trim());
    const tokens = lcsDiffSentences(a, b);
    const merged = [];
    for (const t of tokens) {
        const last = merged[merged.length - 1];
        if (last && last.type === t.type) last.text += t.text;
        else merged.push({ ...t });
    }
    return merged.map(t => {
        const safe = escapeHtml(t.text).replace(/\n/g, '<br>');
        if (t.type === 'same') return safe;
        if (t.type === 'remove') return `<span class="jz-diff-remove">${safe}</span>`;
        return `<span class="jz-diff-add">${safe}</span>`;
    }).join('');
}

// 在指定 result 元素后注入差异对比面板（如已存在则更新）
function injectDiffPanel(resultElId, originalText) {
    const resultEl = document.getElementById(resultElId);
    if (!resultEl) return;
    const currentText = (resultEl.textContent || '').trim();
    if (!currentText) return;
    const panelId = resultElId + '_diff';
    let panel = document.getElementById(panelId);
    if (!panel) {
        panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'jz-diff-panel';
        panel.innerHTML = `
            <div class="jz-diff-panel-title">
                <span>差异对比</span>
                <span class="jz-diff-legend"><span class="jz-diff-dot" style="background:#dc2626;"></span>原文删除</span>
                <span class="jz-diff-legend"><span class="jz-diff-dot" style="background:#16a34a;"></span>AI 新增</span>
            </div>
            <div class="jz-diff-body" style="word-break:break-word;"></div>`;
        resultEl.parentNode.insertBefore(panel, resultEl.nextSibling);
    }
    const body = panel.querySelector('.jz-diff-body');
    if (body) body.innerHTML = renderDiffHtml(originalText, currentText);
}

// ========== Markdown 转 HTML ==========
function parseMarkdownToHtml(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    // 代码块
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg-tertiary); padding:10px; border-radius:6px; overflow-x:auto; font-size:0.85em; line-height:1.5; margin:8px 0; color:#1a1a1a;"><code>$1</code></pre>');

    // 行内代码
    html = html.replace(/`([^`\n]+)`/g, '<code style="background:var(--bg-tertiary); padding:2px 5px; border-radius:3px; font-size:0.85em; color:#1a1a1a;">$1</code>');

    // 粗体
    html = html.replace(/\*\*([^\n]+?)\*\*/g, '<strong style="font-weight:700; color:#1a1a1a;">$1</strong>');

    // 斜体（避免匹配粗体）
    html = html.replace(/(?<!\*)\*([^\n\*]+?)\*(?!\*)/g, '<em style="font-style:italic; color:#1a1a1a;">$1</em>');

    // 删除线
    html = html.replace(/~~([^\n]+?)~~/g, '<del style="text-decoration:line-through; opacity:0.6; color:#1a1a1a;">$1</del>');

    // 引用
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid var(--accent); padding-left:10px; margin:8px 0; color:#1a1a1a;">$1</blockquote>');

    // 标题
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h3 style="font-size:1.2em; font-weight:700; margin:16px 0 8px; color:#1a1a1a;">$1</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h2 style="font-size:1.45em; font-weight:700; margin:20px 0 10px; color:#1a1a1a;">$1</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1 style="font-size:1.85em; font-weight:700; margin:24px 0 12px; color:#1a1a1a;">$1</h1>');

    // 分割线
    html = html.replace(/^[-\*]{3,}$/gm, '<hr style="border:none; border-top:1px solid var(--border); margin:16px 0; color:#1a1a1a;">');

    // 有序列表 - 先收集所有项目
    const olItems = [];
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, (m, n, item) => {
        olItems.push(item);
        return '___OL_ITEM___';
    });
    if (olItems.length > 0) {
        let idx = 0;
        html = html.replace(/___OL_ITEM___/g, () => '<li>' + olItems[idx++] + '</li>');
        html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ol style="padding-left:20px; margin:8px 0; color:#1a1a1a;">$&</ol>');
    }

    // 无序列表
    const ulItems = [];
    html = html.replace(/^[-\*]\s+(.+)$/gm, (m, item) => {
        ulItems.push(item);
        return '___UL_ITEM___';
    });
    if (ulItems.length > 0) {
        let idx = 0;
        html = html.replace(/___UL_ITEM___/g, () => '<li>' + ulItems[idx++] + '</li>');
        html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul style="padding-left:20px; margin:8px 0; color:#1a1a1a;">$&</ul>');
    }

    // 段落包裹
    const blocks = html.split(/\n\s*\n/);
    const wrapped = blocks.map(block => {
        block = block.trim();
        if (!block) return '';
        if (/^<(h[1-6]|pre|blockquote|ol|ul|hr|li)/.test(block)) return block;
        block = block.replace(/\n/g, '<br>');
        return '<p style="margin:0 0 10px 0; line-height:1.8; color:#1a1a1a;">' + block + '</p>';
    }).filter(Boolean);

    return wrapped.join('\n');
}

// ========== 前端错误上报工具 ==========
function reportError(err, context) {
    const info = { error: err?.message || String(err), context, url: location.href, time: new Date().toISOString() };
    console.error('[reportError]', info);
    if (typeof Sentry !== 'undefined' && window.SENTRY_DSN) {
        Sentry.withScope((scope) => {
            if (context) scope.setContext('biz', context);
            Sentry.captureException(err instanceof Error ? err : new Error(String(err)));
        });
    }
}
