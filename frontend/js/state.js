// ===== 九章写作 - 前端应用 =====

const API_BASE = '/api';
let currentUser = null;
let authToken = localStorage.getItem('jz_token') || '';
let currentWorkId = null;
let currentChapterId = null;
let currentWorkData = null;
let currentChapterTitle = '';
let isCrossChapterScrollEnabled = false;
let isScrollingToNextChapter = false;
let isContentDirty = false;
let currentChatTool = 'continue';
let currentCustomToolId = null;
let currentModelId = null;
const savedModelId = localStorage.getItem('jz_current_model_id');
if (savedModelId) {
    // 兼容旧格式：纯数字 ID 是旧版用户自建模型，清理后回退默认
    const parsed = parseInt(savedModelId);
    if (!isNaN(parsed) && String(parsed) === savedModelId) {
        localStorage.removeItem('jz_current_model_id');
    } else {
        currentModelId = savedModelId;
    }
}
let modelConfigList = [];
// 引用高亮 span 的 id（全局，供划词和@引用共用）
let refSpanId = null;

// 划词引用存储（ID → 完整文本，全局共享）
const quoteStore = new Map();
let quoteCounter = 0;

// 编辑器撤销栈
const MAX_UNDO_STEPS = 50;
let editorUndoStack = [];
let editorUndoIndex = -1;
let editorUndoTimer = null;
let isUndoRedoAction = false;
