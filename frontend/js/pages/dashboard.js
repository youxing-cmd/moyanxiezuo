    // ========== 今日写作台 ==========
    pages.dashboard = () => `
        <div class="page-section">
            <!-- 今日主行动区 -->
            <div class="hero-action" id="heroActionArea">
                <div class="hero-status">
                    <span id="heroTodayWords">今日新增 -- 字</span>
                    <span class="hero-divider">·</span>
                    <span id="heroConsecutiveDays">连续创作 -- 天</span>
                </div>
                <div class="hero-title" id="heroTitle">开始你的创作之旅</div>
                <div class="hero-desc" id="heroDesc">创建第一部作品，迈出第一步</div>
                <div class="hero-buttons">
                    <button class="btn btn-primary hero-btn" id="heroPrimaryBtn">创建第一部作品</button>
                    <button class="btn btn-ghost hero-btn-secondary" id="heroSecondaryBtn" style="display:none;">AI 帮我推进</button>
                </div>
                <div class="hero-goal" id="heroGoalArea" style="display:none; margin-top: 16px; max-width: 420px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:12px; color:var(--text-secondary);">今日目标</span>
                        <span style="font-size:12px; color:var(--text-secondary); cursor:pointer;" id="heroGoalSettingLink" onclick="showGoalSettings()">设置</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:12px; color:var(--text-muted);" id="heroGoalLabel">0 / 300 字</span>
                        <span style="font-size:12px; color:var(--success); display:none;" id="heroGoalCelebration">🎉 今日目标达成</span>
                    </div>
                    <div class="progress-bar" style="height:6px;">
                        <div class="progress-fill" id="heroGoalFill" style="width:0%; background:var(--success);"></div>
                    </div>
                </div>
            </div>

            <!-- 创作指标卡 -->
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon red">🔥</div>
                    <div class="stat-value" id="dashTodayWords">--</div>
                    <div class="stat-label">今日新增字数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">📅</div>
                    <div class="stat-value" id="dashConsecutiveDays">--</div>
                    <div class="stat-label">连续写作天数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">📚</div>
                    <div class="stat-value" id="statWorkCount">--</div>
                    <div class="stat-label">创作中作品</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">✍️</div>
                    <div class="stat-value" id="statTotalWords">--</div>
                    <div class="stat-label">累计写作字数</div>
                </div>
            </div>

            <!-- 近7天打卡 + 最近编辑 -->
            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">近7天打卡</div>
                            <div class="card-subtitle" id="weekGoalLabel">每日写作记录</div>
                        </div>
                    </div>
                    <div id="dashWeekStreak" style="display:flex; gap:6px; padding:16px 0;">
                        <div class="list-meta" style="color:var(--text-muted);">加载中...</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">最近编辑</div>
                            <div class="card-subtitle">点击继续创作</div>
                        </div>
                    </div>
                    <div id="recentWorksList">
                        <div class="list-item">
                            <div class="list-content">
                                <div class="list-meta" style="color:var(--text-muted);">加载中...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 下一步建议 -->
            <div class="card" style="margin-bottom: 24px;">
                <div class="card-header">
                    <div>
                        <div class="card-title">下一步建议</div>
                        <div class="card-subtitle">系统推荐的创作行动</div>
                    </div>
                </div>
                <div id="nextActionsList">
                    <div class="list-item">
                        <div class="list-content">
                            <div class="list-meta" style="color:var(--text-muted);">加载中...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
