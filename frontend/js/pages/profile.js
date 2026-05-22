    pages.profile = () => {
        const u = currentUser || {};
        const username = u.username || '用户';
        const phone = u.phone || '';
        const membership = u.membership || '免费版';
        const points = u.points || 0;
        const tokenPercent = u.tokenPercent || 100;
        const workCount = u.workCount || 0;
        const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '-';
        const phoneMask = phone ? phone.slice(0, 3) + ' **** ' + phone.slice(-4) : '';
        const fallback = username[0] || '创';
        const avatarInfo = resolveAvatar(u.avatar, fallback);
        const subType = u.subscriptionType || 'none';
        const subExpire = u.subscriptionExpireAt;
        const isActive = subType !== 'none' && subExpire && new Date(subExpire) > new Date();
        const subLabel = isActive ? (subType === 'yearly' ? '年费版' : '月费版') : membership;
        const subExpireText = isActive && subExpire
            ? Math.ceil((new Date(subExpire).getTime() - Date.now()) / 86400000) + '天后到期'
            : (subType === 'none' ? '免费版，可积分兑换' : '已过期');
        return `
        <div class="page-section" style="max-width: 720px; margin: 0 auto;">
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 20px; padding: 8px 4px;">
                    <div style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-dark)); display: flex; align-items: center; justify-content: center; font-size: 28px; color: white; font-family: var(--font-serif); flex-shrink: 0; overflow: hidden;">
                        ${avatarInfo.isUrl ? `<img src="${escapeAttr(avatarInfo.src)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.textContent='${escapeAttr(fallback)}'">` : avatarInfo.text}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${escapeHtml(username)}</div>
                        <div style="font-size: 13px; color: var(--text-tertiary);">${escapeHtml(membership)} · ${joinDate} 加入</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="showAvatarPicker()">更换头像</button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">基本信息</div>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">用户 ID</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${u.id || '-'}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${u.id || ''}'); showToast('已复制到剪贴板', 'success')">复制</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">手机号</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${phoneMask}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="showChangePhoneModal()">修改</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">昵称</div>
                            <div style="font-size: 14px; color: var(--text-primary);">${escapeHtml(username)}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="showModal('修改昵称','<div class=\\'form-group\\'><label class=\\'form-label\\'>新昵称</label><input type=\\'text\\' class=\\'form-input\\' id=\\'editUsername\\' maxlength=\\'50\\' value=\\'${escapeHtml(username)}\\'></div><div class=\\'form-actions\\'><button class=\\'btn btn-ghost\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove()\\'>取消</button><button class=\\'btn btn-primary\\' onclick=\\'saveProfile(&quot;username&quot;)\\'>保存</button></div>')">修改</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">账户资产</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-light);" id="profilePoints">${points.toLocaleString()}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">当前积分</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--success);">${tokenPercent}%</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Token 余量</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--warning);" id="profileWorkCount">${workCount}</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">创作作品</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 16px;">
                    <button class="btn btn-primary" style="flex: 1;" id="profileCheckInBtn" onclick="handleCheckIn()">每日签到</button>
                    <button class="btn btn-outline" style="flex: 1;" onclick="showPointTransactions()">积分明细</button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">写作数据</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--accent-light);" id="profileTotalWords">-</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">累计字数</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--success);" id="profileConsecutiveDays">-</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">连续写作天数</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                        <div style="font-size: 24px; font-weight: 700; color: var(--warning);" id="profileTodayWords">-</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">今日新增字数</div>
                    </div>
                </div>
                <div style="margin-bottom: 8px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">近7天打卡</div>
                    <div id="profileWeekStreak" style="display: flex; gap: 6px;">
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                        <div style="flex:1; height:32px; border-radius:var(--radius-sm); background:var(--bg-tertiary); border:1px solid var(--border);"></div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">创作目标</div>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">每日目标字数（0 = 不设置）</div>
                        <input type="number" class="form-input" id="profileDailyGoal" value="${u.dailyGoal || 0}" min="0" placeholder="例如 3000" style="width: 100%;">
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">每周有效创作天数（0 = 不设置）</div>
                        <input type="number" class="form-input" id="profileWeeklyGoalDays" value="${u.weeklyGoalDays || 0}" min="0" max="7" placeholder="例如 5" style="width: 100%;">
                    </div>
                    <button class="btn btn-primary" onclick="saveWritingGoals()">保存目标</button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 20px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">订阅状态</div>
                <div id="profileSubscriptionCard" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-tertiary); border-radius: var(--radius); border: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 16px;">👑</div>
                        <div>
                            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);" id="profileSubName">${escapeHtml(subLabel)}</div>
                            <div style="font-size: 12px; color: var(--text-muted);" id="profileSubExpire">${escapeHtml(subExpireText)}</div>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="showRedeemModal()">积分兑换</button>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <div style="flex:1; padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm); text-align:center; border:1px solid var(--border);">
                        <div style="font-size:11px; color:var(--text-muted);">1000积分</div>
                        <div style="font-size:12px; color:var(--text-primary); font-weight:600;">兑换7天</div>
                    </div>
                    <div style="flex:1; padding:10px; background:var(--bg-tertiary); border-radius:var(--radius-sm); text-align:center; border:1px solid var(--border);">
                        <div style="font-size:11px; color:var(--text-muted);">3000积分</div>
                        <div style="font-size:12px; color:var(--text-primary); font-weight:600;">兑换30天</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">设置</div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                        <div>
                            <div style="font-size: 13px; color: var(--text-secondary);">高级模式</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">显示模型选择、工具选择、提示词调试等高级功能</div>
                        </div>
                        <label style="position: relative; display: inline-block; width: 40px; height: 22px; cursor: pointer; flex-shrink: 0;">
                            <input type="checkbox" id="advancedModeToggle" style="opacity: 0; width: 0; height: 0;" ${isAdvancedMode() ? 'checked' : ''} onchange="setAdvancedMode(this.checked); showToast(this.checked ? '高级模式已开启' : '高级模式已关闭', 'success');">
                            <span style="position: absolute; inset: 0; background: ${isAdvancedMode() ? 'var(--accent)' : 'var(--border)'}; border-radius: 22px; transition: 0.2s;"></span>
                            <span style="position: absolute; top: 2px; left: ${isAdvancedMode() ? '20px' : '2px'}; width: 18px; height: 18px; background: white; border-radius: 50%; transition: 0.2s;"></span>
                        </label>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                        <span style="font-size: 13px; color: var(--text-secondary);">AI 模型管理</span>
                        <button class="btn btn-ghost btn-sm" onclick="switchPage('modelConfigs')">选择模型</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                        <span style="font-size: 13px; color: var(--text-secondary);">修改密码</span>
                        <button class="btn btn-ghost btn-sm" onclick="showModal('修改密码', '<div class=\\'form-group\\'><label class=\\'form-label\\'>原密码</label><input type=\\'password\\' class=\\'form-input\\' id=\\'oldPassword\\'></div><div class=\\'form-group\\'><label class=\\'form-label\\'>新密码</label><input type=\\'password\\' class=\\'form-input\\' id=\\'newPassword\\'></div><div class=\\'form-group\\'><label class=\\'form-label\\'>确认新密码</label><input type=\\'password\\' class=\\'form-input\\' id=\\'confirmPassword\\'></div><div class=\\'form-actions\\'><button class=\\'btn btn-ghost\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove()\\'>取消</button><button class=\\'btn btn-primary\\' onclick=\\'saveProfile(&quot;password&quot;)\\'>保存</button></div>')">修改</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                        <span style="font-size: 13px; color: var(--danger);">退出登录</span>
                        <button class="btn btn-ghost btn-sm" style="color: var(--danger);" onclick="showModal('退出登录', '<p>确定要退出登录吗？</p><div class=\\'form-actions\\'><button class=\\'btn btn-ghost\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove()\\'>取消</button><button class=\\'btn btn-primary\\' style=\\'background:var(--danger);\\' onclick=\\'this.closest(&quot;.jz-modal-overlay&quot;).remove(); logout();\\'>确认退出</button></div>')">退出</button>
                    </div>
                </div>
            </div>
        </div>
    `
}
