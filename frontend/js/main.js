// 启动
document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();
});

// 离开页面前检查未保存内容
window.addEventListener('beforeunload', (e) => {
    if (isContentDirty && currentWorkId && currentChapterId) {
        e.preventDefault();
        e.returnValue = '您有未保存的内容，确定要离开吗？';
        return e.returnValue;
    }
});
