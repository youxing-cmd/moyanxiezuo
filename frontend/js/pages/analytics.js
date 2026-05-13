    pages.analytics = () => `
        <div class="page-section">
            <div class="tabs">
                <button class="tab active">用户概览</button>
                <button class="tab">Token 消耗</button>
                <button class="tab">收入数据</button>
                <button class="tab">积分明细</button>
            </div>

            <div class="stat-grid" style="margin-bottom: 24px;">
                <div class="stat-card">
                    <div class="stat-icon blue">👥</div>
                    <div class="stat-value">45,832</div>
                    <div class="stat-label">平台注册用户</div>
                    <div class="stat-change positive">↑ 本月新增 3,421 人</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">⚡</div>
                    <div class="stat-value">2.8M</div>
                    <div class="stat-label">本月 Token 消耗</div>
                    <div class="stat-change positive">↑ 较上月 +23%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">💰</div>
                    <div class="stat-value">¥128,450</div>
                    <div class="stat-label">本月平台收入</div>
                    <div class="stat-change positive">↑ 较上月 +18%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">🎯</div>
                    <div class="stat-value">86.5%</div>
                    <div class="stat-label">用户留存率</div>
                    <div class="stat-change positive">↑ 较上月 +5%</div>
                </div>
            </div>

            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">👤 用户活跃度</div>
                            <div class="card-subtitle">日活/周活/月活趋势</div>
                        </div>
                    </div>
                    <div class="chart-area" style="height: 200px;">
                        <div class="chart-bar" style="height: 55%; opacity:0.9;"></div>
                        <div class="chart-bar" style="height: 60%; opacity:0.85;"></div>
                        <div class="chart-bar" style="height: 58%; opacity:0.9;"></div>
                        <div class="chart-bar" style="height: 70%; opacity:0.95;"></div>
                        <div class="chart-bar" style="height: 75%; opacity:0.9;"></div>
                        <div class="chart-bar" style="height: 82%; opacity:0.95;"></div>
                        <div class="chart-bar" style="height: 88%; opacity:1;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top:12px; padding:0 8px;">
                        <span style="font-size:11px; color:var(--text-muted);">日活: 8,234</span>
                        <span style="font-size:11px; color:var(--text-muted);">周活: 28,456</span>
                        <span style="font-size:11px; color:var(--text-muted);">月活: 45,832</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">⚡ Token 消耗分布</div>
                            <div class="card-subtitle">各功能模块 Token 使用占比</div>
                        </div>
                    </div>
                    <div style="padding: 8px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">AI 续写</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:42%; background:var(--accent);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">42%</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">工作流</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:28%; background:var(--info);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">28%</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                            <span style="font-size:13px; color:var(--text-secondary);">情节推演</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:18%; background:var(--success);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">18%</span>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0;">
                            <span style="font-size:13px; color:var(--text-secondary);">其他工具</span>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div class="progress-bar" style="width:140px;"><div class="progress-fill" style="width:12%; background:var(--warning);"></div></div>
                                <span style="font-size:13px; color:var(--text-primary); font-weight:600; width:50px; text-align:right;">12%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">💰 收入与积分明细</div>
                        <div class="card-subtitle">近30天交易记录</div>
                    </div>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>类型</th>
                                <th>描述</th>
                                <th>产品币</th>
                                <th>积分</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>2026-04-29</td>
                                <td>充值</td>
                                <td>会员续费 - 专业版年卡</td>
                                <td style="color:var(--success); font-weight:600;">+¥298</td>
                                <td>—</td>
                                <td><span class="tag" style="background:rgba(34,197,94,0.1); color:var(--success);">已完成</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-28</td>
                                <td>消耗</td>
                                <td>AI 续写 - Token 消耗</td>
                                <td>—</td>
                                <td style="color:var(--danger); font-weight:600;">-1,250</td>
                                <td><span class="tag" style="background:rgba(239,68,68,0.1); color:var(--danger);">已扣除</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-27</td>
                                <td>消耗</td>
                                <td>工作流「玄幻开篇」运行</td>
                                <td>—</td>
                                <td style="color:var(--danger); font-weight:600;">-3,800</td>
                                <td><span class="tag" style="background:rgba(239,68,68,0.1); color:var(--danger);">已扣除</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-26</td>
                                <td>奖励</td>
                                <td>每日签到奖励</td>
                                <td>—</td>
                                <td style="color:var(--success); font-weight:600;">+100</td>
                                <td><span class="tag" style="background:rgba(34,197,94,0.1); color:var(--success);">已到账</span></td>
                            </tr>
                            <tr>
                                <td>2026-04-25</td>
                                <td>充值</td>
                                <td>积分充值 - 10,000积分包</td>
                                <td style="color:var(--success); font-weight:600;">+¥68</td>
                                <td style="color:var(--success); font-weight:600;">+10,000</td>
                                <td><span class="tag" style="background:rgba(34,197,94,0.1); color:var(--success);">已完成</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `
