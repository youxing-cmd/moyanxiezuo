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
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.jz-modal').style.transform = 'scale(1)';
    });
}

// ========== 热点 AI 分析（SSE 流式）==========
