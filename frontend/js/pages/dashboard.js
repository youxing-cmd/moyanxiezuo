    // ========== 概览 ==========
    pages.dashboard = () => `
        <div class="page-section">
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">📚</div>
                    <div class="stat-value" id="statWorkCount">--</div>
                    <div class="stat-label">创作中作品</div>
                    <div class="stat-change positive" id="statWorkChange">开始创作第一部作品</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">✍️</div>
                    <div class="stat-value" id="statTotalWords">--</div>
                    <div class="stat-label">累计写作字数</div>
                    <div class="stat-change positive">坚持就是胜利</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">🤖</div>
                    <div class="stat-value" id="statAiCount">--</div>
                    <div class="stat-label">AI 辅助次数</div>
                    <div class="stat-change positive">善用 AI 提高效率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">📑</div>
                    <div class="stat-value" id="statTotalChapters">--</div>
                    <div class="stat-label">总章节数</div>
                    <div class="stat-change positive">继续创作</div>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">创作趋势</div>
                            <div class="card-subtitle">近7日字数变化</div>
                        </div>
                        <div class="tabs" style="margin:0">
                            <button class="tab active">周</button>
                            <button class="tab">月</button>
                        </div>
                    </div>
                    <div class="chart-area">
                        <div class="chart-bar" style="height: 40%"></div>
                        <div class="chart-bar" style="height: 65%"></div>
                        <div class="chart-bar" style="height: 55%"></div>
                        <div class="chart-bar" style="height: 80%"></div>
                        <div class="chart-bar" style="height: 70%"></div>
                        <div class="chart-bar" style="height: 90%"></div>
                        <div class="chart-bar" style="height: 75%"></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">最近编辑</div>
                            <div class="card-subtitle">继续你的创作</div>
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

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">AI 使用统计</div>
                            <div class="card-subtitle">各功能调用次数</div>
                        </div>
                    </div>
                    <div style="padding: 8px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">AI 续写</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:75%; background:var(--accent);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">458</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">情节推演</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:60%; background:var(--info);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">312</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">角色生成</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:45%; background:var(--success);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">256</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0;">
                            <span style="font-size:13px; color:var(--text-secondary);">润色优化</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:30%; background:var(--warning);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600;">189</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">创作动态</div>
                            <div class="card-subtitle">最近操作记录</div>
                        </div>
                    </div>
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-time">今天 14:32</div>
                            <div class="timeline-text">使用 AI 续写完成《仙途漫漫》第127章</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">今天 11:15</div>
                            <div class="timeline-text">新建角色「林青云」到作品《仙途漫漫》</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">昨天 20:40</div>
                            <div class="timeline-text">导入 Word 文档《都市夜行者大纲》</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">昨天 16:22</div>
                            <div class="timeline-text">使用工作流「玄幻开篇」生成新书设定</div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-time">4月27日</div>
                            <div class="timeline-text">发布《大宋提刑官》最终章，作品完结</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
