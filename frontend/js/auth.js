function renderAuthForm(mode) {
    const form = document.getElementById('authForm');
    if (!form) return;
    // 清除绑定标记，确保重新绑定事件
    form.dataset.bound = '';
    if (mode === 'login') {
        form.innerHTML = `
            <div style="display:flex; margin-bottom:16px; border-bottom:1px solid var(--border);">
                <button type="button" class="login-subtab active" data-subtab="password" style="flex:1; padding:10px 8px; border:none; background:transparent; color:var(--text-primary); font-size:13px; cursor:pointer; border-bottom:2px solid var(--accent);">密码登录</button>
                <button type="button" class="login-subtab" data-subtab="code" style="flex:1; padding:10px 8px; border:none; background:transparent; color:var(--text-muted); font-size:13px; cursor:pointer; border-bottom:2px solid transparent;">验证码登录</button>
            </div>
            <div id="loginPasswordForm" style="display:block;">
                <div class="form-group">
                    <label class="form-label">手机号</label>
                    <input type="text" class="form-input" id="loginPhone" placeholder="请输入手机号" autocomplete="tel">
                </div>
                <div class="form-group">
                    <label class="form-label">密码</label>
                    <input type="password" class="form-input" id="loginPassword" placeholder="请输入密码" autocomplete="current-password">
                </div>
                <button type="button" class="btn btn-primary" id="btnLoginPassword" style="width:100%; margin-top:8px;">登录</button>
            </div>
            <div id="loginCodeForm" style="display:none;">
                <div class="form-group">
                    <label class="form-label">手机号</label>
                    <input type="text" class="form-input" id="loginCodePhone" placeholder="请输入手机号" autocomplete="tel">
                </div>
                <div class="form-group">
                    <label class="form-label">验证码</label>
                    <div style="display:flex; gap:8px;">
                        <input type="text" class="form-input" id="loginCodeInput" placeholder="请输入验证码" autocomplete="one-time-code" style="flex:1;">
                        <button type="button" class="btn btn-ghost" id="btnSendCode" style="white-space:nowrap; font-size:12px; padding:8px 12px;">获取验证码</button>
                    </div>
                </div>
                <button type="button" class="btn btn-primary" id="btnLoginCode" style="width:100%; margin-top:8px;">登录</button>
            </div>
            <div style="margin-top:16px; text-align:center;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--text-muted); font-size:12px;">
                    <div style="flex:1; height:1px; background:var(--border);"></div>
                    <span>第三方登录</span>
                    <div style="flex:1; height:1px; background:var(--border);"></div>
                </div>
                <button type="button" class="btn btn-ghost" id="btnLoginFeishu" style="width:100%; border:1px solid var(--border); color:#3370ff; font-weight:500;">
                    <span style="display:inline-flex; align-items:center; gap:6px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        飞书登录
                    </span>
                </button>
            </div>
        `;
    } else {
        form.innerHTML = `
            <div class="form-group">
                <label class="form-label">昵称</label>
                <input type="text" class="form-input" id="regUsername" placeholder="请输入昵称" autocomplete="nickname">
            </div>
            <div class="form-group">
                <label class="form-label">手机号</label>
                <input type="text" class="form-input" id="regPhone" placeholder="请输入手机号" autocomplete="tel">
            </div>
            <div class="form-group">
                <label class="form-label">密码</label>
                <input type="password" class="form-input" id="regPassword" placeholder="至少6位密码" autocomplete="new-password">
            </div>
            <button type="button" class="btn btn-primary" id="btnRegister" style="width:100%; margin-top:8px;">注册</button>
        `;
    }
    bindAuthFormEvents();
}

function switchLoginSubtab(subtab, btn) {
    document.querySelectorAll('.login-subtab').forEach(t => {
        t.classList.remove('active');
        t.style.borderBottom = '2px solid transparent';
        t.style.color = 'var(--text-muted)';
    });
    if (btn) {
        btn.classList.add('active');
        btn.style.borderBottom = '2px solid var(--accent)';
        btn.style.color = 'var(--text-primary)';
    }
    const pwForm = document.getElementById('loginPasswordForm');
    const codeForm = document.getElementById('loginCodeForm');
    if (pwForm) pwForm.style.display = subtab === 'password' ? 'block' : 'none';
    if (codeForm) codeForm.style.display = subtab === 'code' ? 'block' : 'none';
}

function bindAuthFormEvents() {
    const form = document.getElementById('authForm');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    // 事件委托：子 tab 切换
    form.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('login-subtab')) {
            const subtab = btn.dataset.subtab;
            if (subtab) switchLoginSubtab(subtab, btn);
        }
    });

    // 直接绑定各按钮（避免事件委托失效）
    const bindBtn = (id, handler) => {
        const btn = document.getElementById(id);
        if (btn && !btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handler();
            });
        }
    };
    bindBtn('btnLoginPassword', handleLogin);
    bindBtn('btnLoginCode', handleLoginByCode);
    bindBtn('btnSendCode', sendLoginCode);
    bindBtn('btnLoginFeishu', handleFeishuLogin);
    bindBtn('btnRegister', handleRegister);
}

async function handleLogin() {
    const phone = document.getElementById('loginPhone')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!phone || !password) {
        showToast('请输入手机号和密码', 'warning');
        return;
    }
    try {
        const data = await api('/auth/login', { method: 'POST', body: { username: phone, password } });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('jz_token', authToken);
        showToast('登录成功', 'success');
        updateUserInfo();
        hideAuth();
        switchPage('works');
    } catch (err) {
        showToast(err.message || '登录失败', 'danger');
    }
}

async function sendLoginCode() {
    const phone = document.getElementById('loginCodePhone')?.value.trim();
    if (!phone) {
        showToast('请输入手机号', 'warning');
        return;
    }
    const btn = document.getElementById('btnSendCode');
    if (btn.disabled) return;
    try {
        await api('/auth/send-code', { method: 'POST', body: { phone } });
        showToast('验证码已发送', 'success');
        let sec = 60;
        btn.disabled = true;
        btn.textContent = `${sec}s 后重发`;
        const timer = setInterval(() => {
            sec--;
            if (sec <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = '获取验证码';
            } else {
                btn.textContent = `${sec}s 后重发`;
            }
        }, 1000);
    } catch (err) {
        showToast(err.message || '发送失败', 'danger');
    }
}

async function handleLoginByCode() {
    const phone = document.getElementById('loginCodePhone')?.value.trim();
    const code = document.getElementById('loginCodeInput')?.value.trim();
    if (!phone || !code) {
        showToast('请输入手机号和验证码', 'warning');
        return;
    }
    try {
        const data = await api('/auth/login-by-code', { method: 'POST', body: { phone, code } });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('jz_token', authToken);
        showToast('登录成功', 'success');
        updateUserInfo();
        hideAuth();
        switchPage('works');
    } catch (err) {
        showToast(err.message || '登录失败', 'danger');
    }
}

async function handleFeishuLogin() {
    try {
        const data = await api('/auth/feishu/url');
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('飞书登录未配置', 'warning');
        }
    } catch (err) {
        showToast(err.message || '飞书登录失败', 'danger');
    }
}

async function handleRegister() {
    const username = document.getElementById('regUsername')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    if (!username || !phone || !password) {
        showToast('请填写完整信息', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('密码至少6位', 'warning');
        return;
    }
    try {
        const data = await api('/auth/register', { method: 'POST', body: { username, phone, password } });
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('jz_token', authToken);
        showToast('注册成功', 'success');
        updateUserInfo();
        hideAuth();
        switchPage('works');
    } catch (err) {
        showToast(err.message || '注册失败', 'danger');
    }
}

async function checkAuth() {
    if (!authToken) {
        currentUser = null;
        updateUserInfo();
        return false;
    }
    try {
        const user = await api('/auth/me');
        if (!user) {
            authToken = '';
            currentUser = null;
            localStorage.removeItem('jz_token');
            updateUserInfo();
            clearUserState();
            return false;
        }
        currentUser = user;
        updateUserInfo();
        return true;
    } catch {
        authToken = '';
        currentUser = null;
        localStorage.removeItem('jz_token');
        updateUserInfo();
        // token 过期/失效，清空用户相关状态和页面内容
        clearUserState();
        return false;
    }
}

function showAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
    // 总是用 JS 渲染完整表单（确保第三方登录按钮一致出现）
    renderAuthForm('login');
    // 绑定顶层 tab 切换（登录/注册）
    document.querySelectorAll('#authTabs .auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#authTabs .auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderAuthForm(tab.dataset.tab);
        });
    });
}

function hideAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
}

function clearUserState() {
    currentWorkId = null;
    currentChapterId = null;
    currentWorkData = null;
    currentChapterTitle = '';
    currentWritingView = 'editor';
    currentAnalysisData = null;
    currentAnalysisTab = 'all';
    lastSavedContent = '';
    isContentDirty = false;
    isScrollingToNextChapter = false;
    clearLocalCache();
    const contentArea = document.getElementById('contentArea');
    if (contentArea) contentArea.innerHTML = '';
    const editorArea = document.getElementById('editorArea');
    if (editorArea) editorArea.innerHTML = '';
}

function logout() {
    authToken = '';
    currentUser = null;
    localStorage.removeItem('jz_token');
    clearUserState();
    updateUserInfo();
    showToast('已退出登录', 'info');
    showAuth();
}

function handleUserCardClick() {
    if (currentUser) {
        switchPage('profile');
    } else {
        showAuth();
    }
}

// ========== 积分系统 ==========
async function handleCheckIn() {
    try {
        const res = await api('/points/check-in', { method: 'POST' });
        showToast(res.message || `签到成功 +${res.reward}积分`, 'success');
        if (currentUser) currentUser.points = res.points;
        updateUserInfo();
    } catch (err) {
        showToast(err.message || '签到失败', 'error');
    }
}

async function showPointTransactions() {
    try {
        const list = await api('/points/transactions?page=1&pageSize=20');
        if (!list || list.length === 0) {
            showModal('积分明细', '<p style="text-align:center; color:var(--text-muted); padding:20px;">暂无积分变动记录</p>');
            return;
        }
        const rows = list.map((t) => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px;"
                <span style="color:var(--text-secondary);">${escapeHtml(t.description)}</span>
                <span style="color:${t.amount > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;"
                    ${t.amount > 0 ? '+' : ''}${t.amount}
                </span>
            </div>
        `).join('');
        showModal('积分明细', `<div style="max-height:400px; overflow-y:auto;">${rows}</div>`);
    } catch (err) {
        showToast('加载失败', 'error');
    }
}

function showRedeemModal() {
    const u = currentUser || {};
    const points = u.points || 0;
    showModal('积分兑换订阅', `
        <div style="text-align:center; margin-bottom:16px;"
            <div style="font-size:14px; color:var(--text-muted);">当前积分</div>
            <div style="font-size:28px; font-weight:700; color:var(--accent);">${points}</div>
        </div>
        <div style="display:flex; gap:12px; margin-bottom:16px;">
            <div style="flex:1; padding:16px; border:1px solid var(--border); border-radius:var(--radius-md); text-align:center; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="redeemSubscription('7days')">
                <div style="font-size:20px; font-weight:700; color:var(--text-primary);">7天</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">1000积分</div>
            </div>
            <div style="flex:1; padding:16px; border:1px solid var(--border); border-radius:var(--radius-md); text-align:center; cursor:pointer; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" onclick="redeemSubscription('30days')">
                <div style="font-size:20px; font-weight:700; color:var(--text-primary);">30天</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">3000积分</div>
            </div>
        </div>
        <div style="font-size:12px; color:var(--text-muted); text-align:center;">兑换后订阅时长自动累加</div>
    `);
}

async function redeemSubscription(duration) {
    try {
        const res = await api('/points/redeem', {
            method: 'POST',
            body: { duration },
        });
        showToast(`兑换成功，订阅延长${res.duration}天`, 'success');
        if (currentUser) {
            currentUser.points = res.points;
            currentUser.subscriptionType = res.subscriptionType || currentUser.subscriptionType;
            currentUser.subscriptionExpireAt = res.subscriptionExpireAt;
        }
        updateUserInfo();
        document.querySelector('.jz-modal-overlay')?.remove();
    } catch (err) {
        showToast(err.message || '兑换失败', 'error');
    }
}

function showPointsDetail() {
    const u = currentUser || {};
    const points = u.points || 0;
    const subType = u.subscriptionType || 'none';
    const subExpire = u.subscriptionExpireAt;
    const isActive = subType !== 'none' && subExpire && new Date(subExpire) > new Date();
    const subLabel = isActive ? (subType === 'yearly' ? '年费版' : '月费版') : '免费版';
    showModal('积分与订阅', `
        <div style="text-align:center; margin-bottom:16px;"
            <div style="font-size:14px; color:var(--text-muted);">当前积分</div>
            <div style="font-size:32px; font-weight:700; color:var(--accent); margin:8px 0;">${points}</div>
            <div style="font-size:13px; color:var(--text-muted);">订阅状态：${subLabel} ${isActive ? '(' + Math.ceil((new Date(subExpire).getTime() - Date.now()) / 86400000) + '天后到期)' : ''}</div>
        </div>
        <div style="display:flex; gap:8px;"
            <button class="btn btn-primary" style="flex:1;" onclick="document.querySelector('.jz-modal-overlay')?.remove(); showRedeemModal();">积分兑换</button>
            <button class="btn btn-outline" style="flex:1;" onclick="document.querySelector('.jz-modal-overlay')?.remove(); showPointTransactions();">积分明细</button>
        </div>
    `);
}

async function spendPoints(amount, description) {
    try {
        const res = await api('/points/spend', {
            method: 'POST',
            body: { amount, description },
        });
        if (currentUser) currentUser.points = res.points;
        updateUserInfo();
        return true;
    } catch (err) {
        showToast(err.message || '积分不足', 'warning');
        return false;
    }
}

async function earnPoints(task, relatedId) {
    try {
        const res = await api('/points/earn', {
            method: 'POST',
            body: { task, relatedId },
        });
        if (currentUser) currentUser.points = res.points;
        updateUserInfo();
    } catch (err) {
        // silently fail for auto rewards
    }
}

function updateUserInfo() {
    const nameEl = document.querySelector('.user-name');
    const statusEl = document.querySelector('.user-status');
    const avatarEl = document.querySelector('.user-avatar');
    const sidebarPointsInfo = document.getElementById('sidebarPointsInfo');
    const topbarPointsBtn = document.getElementById('topbarPointsBtn');

    if (!currentUser) {
        // 未登录状态：显示游客
        if (nameEl) nameEl.textContent = '游客';
        if (statusEl) statusEl.textContent = '点击登录';
        if (avatarEl) avatarEl.textContent = '游';
        if (sidebarPointsInfo) sidebarPointsInfo.style.display = 'none';
        if (topbarPointsBtn) topbarPointsBtn.style.display = 'none';
        return;
    }

    if (nameEl) nameEl.textContent = currentUser.username || '创作者';
    if (statusEl) statusEl.textContent = currentUser.membership || '免费版';
    if (avatarEl) {
        const fallback = currentUser.username?.[0] || '创';
        const a = resolveAvatar(currentUser.avatar, fallback);
        if (a.isUrl) {
            avatarEl.innerHTML = `<img src="${escapeAttr(a.src)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentNode.textContent='${escapeAttr(fallback)}'">`;
        } else {
            avatarEl.innerHTML = '';
            avatarEl.textContent = a.text;
        }
    }

    // 更新积分显示
    const topbarPoints = document.getElementById('topbarPoints');
    const sidebarPoints = document.getElementById('sidebarPoints');
    const sidebarSubType = document.getElementById('sidebarSubType');
    const sidebarSubExpire = document.getElementById('sidebarSubExpire');

    const points = currentUser.points || 0;
    const subType = currentUser.subscriptionType || 'none';
    const subExpire = currentUser.subscriptionExpireAt;
    const isActive = subType !== 'none' && subExpire && new Date(subExpire) > new Date();
    const subLabel = isActive ? (subType === 'yearly' ? '年费版' : '月费版') : '免费版';

    if (topbarPointsBtn) topbarPointsBtn.style.display = 'inline-flex';
    if (topbarPoints) topbarPoints.textContent = `💎 ${points}`;
    if (sidebarPointsInfo) sidebarPointsInfo.style.display = 'block';
    if (sidebarPoints) sidebarPoints.textContent = String(points);
    if (sidebarSubType) sidebarSubType.textContent = subLabel;
    if (sidebarSubExpire) {
        if (isActive && subExpire) {
            const days = Math.ceil((new Date(subExpire).getTime() - Date.now()) / (86400000));
            sidebarSubExpire.textContent = `${days}天后到期`;
        } else {
            sidebarSubExpire.textContent = '';
        }
    }
}

async function saveProfile(field) {
    if (field === 'username') {
        const val = document.getElementById('editUsername')?.value.trim();
        if (!val) return;
        try {
            await api('/auth/me', { method: 'PUT', body: { username: val } });
            currentUser.username = val;
            updateUserInfo();
            showToast('昵称已更新', 'success');
            document.querySelector('.jz-modal-overlay')?.remove();
            // 重新渲染个人页面以显示新昵称
            if (document.getElementById('pageTitle')?.textContent === '个人中心') {
                switchPage('profile');
            }
        } catch (err) {
            showToast(err.message || '更新失败', 'danger');
        }
    } else if (field === 'password') {
        const oldP = document.getElementById('oldPassword')?.value;
        const newP = document.getElementById('newPassword')?.value;
        const confirmP = document.getElementById('confirmPassword')?.value;
        if (!oldP || !newP) { showToast('请填写密码', 'warning'); return; }
        if (newP !== confirmP) { showToast('两次密码不一致', 'warning'); return; }
        try {
            await api('/auth/me', { method: 'PUT', body: { oldPassword: oldP, newPassword: newP } });
            showToast('密码已修改', 'success');
            document.querySelector('.jz-modal-overlay')?.remove();
        } catch (err) {
            showToast(err.message || '修改失败', 'danger');
        }
    } else if (field === 'avatar') {
        const val = document.getElementById('editAvatar')?.value;
        if (!val) return;
        try {
            await api('/auth/me', { method: 'PUT', body: { avatar: val } });
            currentUser.avatar = val;
            updateUserInfo();
            showToast('头像已更新', 'success');
            document.querySelector('.jz-modal-overlay')?.remove();
            // 重新渲染个人页面以显示新头像
            if (document.getElementById('pageTitle')?.textContent === '个人中心') {
                switchPage('profile');
            }
        } catch (err) {
            showToast(err.message || '更新失败', 'danger');
        }
    }
}

function showAvatarPicker() {
    const emojis = ['🧑','👩','🧙','🧛','🧟','🤖','👽','🐉','🦊','🐺','🦁','🐯','🐼','🐨','🐸','🐙','🦄','🦅','🦉','🐦','🌟','🔥','⚡','❄️','🌊','🌙','☀️','🌈'];
    const grid = emojis.map(e => `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-tertiary);transition:background 0.15s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-tertiary)'" onclick="document.getElementById('editAvatar').value='${e}';saveProfile('avatar')">${e}</div>
    `).join('');
    showModal('更换头像', `<div style="margin-bottom:12px;"><input type="hidden" id="editAvatar"></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">${grid}</div>`);
}

function showChangePhoneModal() {
    const currentPhone = currentUser?.phone || '';
    showModal('修改手机号', `
        <div class="form-group">
            <label class="form-label">当前手机号</label>
            <input type="text" class="form-input" value="${currentPhone}" disabled>
        </div>
        <div class="form-group">
            <label class="form-label">新手机号</label>
            <input type="tel" class="form-input" id="changePhoneNew" maxlength="20" placeholder="请输入新手机号">
        </div>
        <div class="form-group">
            <label class="form-label">验证码</label>
            <div style="display:flex;gap:8px;">
                <input type="text" class="form-input" id="changePhoneCode" maxlength="6" placeholder="6位验证码" style="flex:1;">
                <button class="btn btn-outline" id="changePhoneSendBtn" onclick="sendChangePhoneCode()">获取验证码</button>
            </div>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="this.closest('.jz-modal-overlay')?.remove()">取消</button>
            <button class="btn btn-primary" onclick="submitChangePhone()">确认修改</button>
        </div>
    `);
}

async function sendChangePhoneCode() {
    const phone = document.getElementById('changePhoneNew')?.value.trim();
    if (!phone) { showToast('请输入新手机号', 'warning'); return; }
    const btn = document.getElementById('changePhoneSendBtn');
    if (btn?.dataset.counting === '1') return;
    try {
        await api('/auth/send-code', { method: 'POST', body: { phone } });
        showToast('验证码已发送', 'success');
        if (!btn) return;
        btn.dataset.counting = '1';
        let sec = 60;
        btn.textContent = `${sec}s`;
        btn.disabled = true;
        const timer = setInterval(() => {
            sec--;
            if (btn) btn.textContent = `${sec}s`;
            if (sec <= 0) {
                clearInterval(timer);
                if (btn) { btn.textContent = '获取验证码'; btn.disabled = false; btn.dataset.counting = '0'; }
            }
        }, 1000);
    } catch (err) {
        showToast(err.message || '发送失败', 'error');
    }
}

async function submitChangePhone() {
    const phone = document.getElementById('changePhoneNew')?.value.trim();
    const code = document.getElementById('changePhoneCode')?.value.trim();
    if (!phone || !code) { showToast('请填写完整信息', 'warning'); return; }
    try {
        const res = await api('/auth/change-phone', { method: 'POST', body: { phone, code } });
        currentUser.phone = res.phone;
        updateUserInfo();
        showToast('手机号修改成功', 'success');
        document.querySelector('.jz-modal-overlay')?.remove();
        if (document.getElementById('pageTitle')?.textContent === '个人中心') {
            switchPage('profile');
        }
    } catch (err) {
        showToast(err.message || '修改失败', 'error');
    }
}

// ========== 长篇写作子视图 ==========
