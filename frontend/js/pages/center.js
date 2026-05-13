    pages.center = () => `
        <div class="page-section">
            <div class="tabs">
                <button class="tab active">作品分析</button>
                <button class="tab">排行榜</button>
                <button class="tab">读者反馈</button>
                <button class="tab">AI 辅助建议</button>
            </div>

            <div class="grid-2" style="margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">📊 角色分析</div>
                            <div class="card-subtitle">《仙途漫漫》角色戏份与关系</div>
                        </div>
                    </div>
                    <div class="grid-3" style="margin-bottom: 20px;">
                        <div class="character-card">
                            <div class="character-avatar">林</div>
                            <div class="character-name">林青云</div>
                            <div class="character-role">主角 · 出场 89%</div>
                        </div>
                        <div class="character-card">
                            <div class="character-avatar" style="background:linear-gradient(135deg, #ef4444, #b91c1c);">苏</div>
                            <div class="character-name">苏婉清</div>
                            <div class="character-role">女主 · 出场 45%</div>
                        </div>
                        <div class="character-card">
                            <div class="character-avatar" style="background:linear-gradient(135deg, #22c55e, #15803d);">莫</div>
                            <div class="character-name">莫天机</div>
                            <div class="character-role">反派 · 出场 32%</div>
                        </div>
                    </div>
                    <div style="font-size:12px; color:var(--text-tertiary);">
                        <div style="margin-bottom:8px;"><span style="color:var(--accent);">●</span> 主角戏份充足，建议增加配角支线以丰富世界观</div>
                        <div style="margin-bottom:8px;"><span style="color:var(--warning);">●</span> 反派莫天机出场偏少，第100章后存在感下降</div>
                        <div><span style="color:var(--success);">●</span> 女主苏婉清互动场景情感描写细腻，读者反馈良好</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">📈 阅读数据分析</div>
                            <div class="card-subtitle">《都市夜行者》读者行为</div>
                        </div>
                    </div>
                    <div class="chart-area" style="height: 160px; margin-bottom: 16px;">
                        <div class="chart-bar" style="height: 30%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 45%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 55%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 70%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 65%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 80%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                        <div class="chart-bar" style="height: 85%; background: linear-gradient(180deg, var(--success), var(--info));"></div>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;">
                        <div style="text-align:center;">
                            <div style="font-size:20px; font-weight:700; color:var(--text-primary);">12.5万</div>
                            <div style="font-size:11px; color:var(--text-tertiary);">总阅读人数</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:20px; font-weight:700; color:var(--text-primary);">68%</div>
                            <div style="font-size:11px; color:var(--text-tertiary);">完读率</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:20px; font-weight:700; color:var(--text-primary);">4.8</div>
                            <div style="font-size:11px; color:var(--text-tertiary);">平均评分</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">🤖 AI 辅助建议</div>
                        <div class="card-subtitle">基于作品数据的智能优化建议</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px;">
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">⚡ 节奏优化</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">第85-92章节奏偏慢，连续多章为日常剧情。建议在第86章插入突发事件，或在第89章设置小高潮，提升读者追读欲望。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">一键生成冲突剧情</button>
                    </div>
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">👤 角色深化</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">配角"李长老"形象单薄，缺乏记忆点。建议增加一段回忆剧情，揭示其与主角父亲的过往，增强角色立体感。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">生成角色背景故事</button>
                    </div>
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">🎭 情感线建议</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">女主与主角的情感进展过快，建议在第100章前增加一次误会或分离，让情感线更具张力和可信度。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">设计情感冲突场景</button>
                    </div>
                    <div style="background:var(--bg-tertiary); border-radius:var(--radius); padding:16px; border:1px solid var(--border);">
                        <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:8px;">🏷️ 标签优化</div>
                        <div style="font-size:13px; color:var(--text-secondary); line-height:1.6;">当前标签覆盖不足，建议添加"逆袭"、"热血"、"修炼"等标签，可提高在对应分类的曝光率约 15-20%。</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:12px;">一键优化标签</button>
                    </div>
                </div>
            </div>
        </div>
    `
