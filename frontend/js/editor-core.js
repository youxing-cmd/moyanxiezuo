// 编辑器撤销栈
const MAX_UNDO_STEPS = 50;
let editorUndoStack = [];
let editorUndoIndex = -1;
let editorUndoTimer = null;
let isUndoRedoAction = false;

// === L2 Agent: 编辑器对外 API（供 AI 工具调用使用）===
// 每个方法内部按需获取 DOM，不依赖时序；方法只对 #editorArea 这一个编辑器实例操作
// 写入类方法返回 JSON 字符串（含 ok/error 字段）作为 tool result 喂给模型
window.jzEditor = {
    _lastSnapshot: null, // 最近一次写入操作前的 innerHTML 快照，用于撤销

    _getEl() {
        return document.getElementById('editorArea');
    },

    _saveSnapshot() {
        const el = this._getEl();
        if (!el) return;
        this._lastSnapshot = el.innerHTML;
    },

    // ===== 只读 =====
    getFullText() {
        const el = this._getEl();
        if (!el) return '';
        return (el.innerText || '').trim();
    },

    getSelection() {
        const el = this._getEl();
        if (!el) return '';
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return '';
        const range = sel.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) return '';
        return sel.toString();
    },

    // ===== 写入 =====
    replaceSelection(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const text = (args && typeof args.text === 'string') ? args.text : '';
        if (!text) return JSON.stringify({ ok: false, error: '替换文本为空' });

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            return JSON.stringify({ ok: false, error: '请先在编辑器中选中要替换的文字' });
        }
        const range = sel.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) {
            return JSON.stringify({ ok: false, error: '请先将选区放在编辑器中' });
        }
        if (range.collapsed) {
            return JSON.stringify({ ok: false, error: '当前没有选中文字' });
        }

        this._saveSnapshot();
        range.deleteContents();

        // 按段落拆分，每段用 <p> 包裹
        const paragraphs = text.split('\n');
        const frag = document.createDocumentFragment();
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para || ' ';
            frag.appendChild(p);
        });
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ ok: true, replaced_chars: text.length });
    },

    insertAtCursor(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const text = (args && typeof args.text === 'string') ? args.text : '';
        if (!text) return JSON.stringify({ ok: false, error: '插入文本为空' });

        this._saveSnapshot();

        // 生成 <p> HTML
        const html = text.split('\n').map(para =>
            '<p>' + (para ? escapeHtml(para) : '&nbsp;') + '</p>'
        ).join('');

        // 空编辑器：直接 innerHTML，避免 contentEditable 空状态光标问题
        const isEmpty = !el.textContent.trim() || el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>';
        if (isEmpty) {
            el.innerHTML = html;
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) {
                return JSON.stringify({ ok: false, error: '请先将光标放在编辑器中' });
            }
            const range = sel.getRangeAt(0);
            if (!el.contains(range.commonAncestorContainer)) {
                return JSON.stringify({ ok: false, error: '请先将光标放在编辑器中' });
            }
            if (!range.collapsed) range.deleteContents();
            const frag = document.createDocumentFragment();
            const temp = document.createElement('div');
            temp.innerHTML = html;
            while (temp.firstChild) frag.appendChild(temp.firstChild);
            range.insertNode(frag);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ ok: true, inserted_chars: text.length });
    },

    // ===== 在末尾追加段落 =====
    appendParagraph(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const text = (args && typeof args.text === 'string') ? args.text : '';
        if (!text) return JSON.stringify({ ok: false, error: '追加文本为空' });

        this._saveSnapshot();

        // 空编辑器清理
        if (!el.innerHTML.trim() || el.innerHTML === '<br>' || el.innerHTML === '<div><br></div>') {
            el.innerHTML = '';
        }

        // 按段落拆分，每段用 <p> 追加
        const paragraphs = text.split('\n');
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para || ' ';
            el.appendChild(p);
        });

        el.scrollTop = el.scrollHeight;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return JSON.stringify({ ok: true, appended_chars: text.length });
    },

    // ===== 查找替换（文本级别） =====
    findReplace(args) {
        const el = this._getEl();
        if (!el) return JSON.stringify({ ok: false, error: '编辑器未挂载' });
        const pattern = (args && typeof args.pattern === 'string') ? args.pattern : '';
        const replacement = (args && typeof args.replacement === 'string') ? args.replacement : '';
        if (!pattern) return JSON.stringify({ ok: false, error: '查找模式为空' });

        this._saveSnapshot();
        const replaceAll = !!(args && args.replace_all);
        const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(esc, replaceAll ? 'g' : '');
        let count = 0;

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        for (const node of nodes) {
            const text = node.textContent || '';
            if (!text.includes(pattern)) continue;
            const parent = node.parentNode;
            if (!parent) continue;
            const newText = text.replace(regex, replacement);
            if (newText === text) continue;
            const parts = text.split(pattern);
            const frag = document.createDocumentFragment();
            parts.forEach((part, i) => {
                frag.appendChild(document.createTextNode(part));
                if (i < parts.length - 1) frag.appendChild(document.createTextNode(replacement));
            });
            parent.replaceChild(frag, node);
            count++;
            if (!replaceAll) break;
        }

        return JSON.stringify({ ok: true, replaced_count: count });
    },

    // ===== 获取章节列表（只读） =====
    getChapterList() {
        const chapters = currentWorkData?.chapters || currentWorkData?.chapterList || [];
        if (!chapters.length) return JSON.stringify({ chapters: [] });
        const list = chapters.map((ch, idx) => ({
            index: idx + 1,
            title: ch.title || `第${idx + 1}章`,
            wordCount: ch.wordCount || 0,
        }));
        return JSON.stringify({ chapters: list });
    },

    // ===== 撤销最近一次写入操作 =====
    restoreLastSnapshot() {
        const el = this._getEl();
        if (!el || this._lastSnapshot === null) return false;
        el.innerHTML = this._lastSnapshot;
        this._lastSnapshot = null;
        return true;
    },
    hasUndoSnapshot() {
        return this._lastSnapshot !== null;
    },
};

// 官方工具列表（全局）
function pushEditorUndo(content) {
    if (isUndoRedoAction) return;
    // 如果内容没变，不推入
    if (editorUndoStack.length > 0 && editorUndoStack[editorUndoIndex] === content) return;
    // 截断当前索引之后的历史（重做链）
    if (editorUndoIndex < editorUndoStack.length - 1) {
        editorUndoStack = editorUndoStack.slice(0, editorUndoIndex + 1);
    }
    editorUndoStack.push(content);
    if (editorUndoStack.length > MAX_UNDO_STEPS) {
        editorUndoStack.shift();
    } else {
        editorUndoIndex++;
    }
    updateUndoRedoButtons();
}

function editorUndo() {
    if (editorUndoIndex <= 0) {
        showToast('没有可撤销的操作', 'info');
        return;
    }
    isUndoRedoAction = true;
    editorUndoIndex--;
    const content = editorUndoStack[editorUndoIndex];
    const editorArea = document.getElementById('editorArea');
    if (editorArea) {
        // 保留标题，只替换正文
        const titleEl = editorArea.querySelector('h1#editorTitle');
        const titleHtml = titleEl ? titleEl.outerHTML : '';
        editorArea.innerHTML = titleHtml + content;
    }
    updateUndoRedoButtons();
    isUndoRedoAction = false;
    showToast('已撤销', 'info');
}

function editorRedo() {
    if (editorUndoIndex >= editorUndoStack.length - 1) {
        showToast('没有可重做的操作', 'info');
        return;
    }
    isUndoRedoAction = true;
    editorUndoIndex++;
    const content = editorUndoStack[editorUndoIndex];
    const editorArea = document.getElementById('editorArea');
    if (editorArea) {
        const titleEl = editorArea.querySelector('h1#editorTitle');
        const titleHtml = titleEl ? titleEl.outerHTML : '';
        editorArea.innerHTML = titleHtml + content;
    }
    updateUndoRedoButtons();
    isUndoRedoAction = false;
    showToast('已重做', 'info');
}

function updateUndoRedoButtons() {
    const undoBtn = document.querySelector('.editor-tool-btn[title^="撤销"]');
    const redoBtn = document.querySelector('.editor-tool-btn[title^="重做"]');
    if (undoBtn) undoBtn.style.opacity = editorUndoIndex > 0 ? '1' : '0.3';
    if (redoBtn) redoBtn.style.opacity = editorUndoIndex < editorUndoStack.length - 1 ? '1' : '0.3';
}

function initEditorUndoStack() {
    editorUndoStack = [];
    editorUndoIndex = -1;
    const editorArea = document.getElementById('editorArea');
    if (editorArea) {
        const titleEl = editorArea.querySelector('h1#editorTitle');
        let content = editorArea.innerHTML;
        if (titleEl) content = content.replace(titleEl.outerHTML, '');
        pushEditorUndo(content);
    }
}

function clearEditorUndoStack() {
    editorUndoStack = [];
    editorUndoIndex = -1;
    updateUndoRedoButtons();
}

function clearEditorFormat() {
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    const sel = window.getSelection();
    if (sel.rangeCount === 0) {
        showToast('请先选中要清除格式的文本', 'warning');
        return;
    }
    document.execCommand('removeFormat');
    showToast('已清除格式', 'success');
}

