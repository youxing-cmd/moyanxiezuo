writingViews.cover = () => `
        <div class="page-section" style="max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 160px; height: 220px; background: linear-gradient(135deg, #1e3a5f, #0f2744); border-radius: var(--radius); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 64px; box-shadow: var(--shadow);">🗡️</div>
                <div style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">仙途漫漫</div>
                <div style="font-size: 14px; color: var(--text-tertiary);">玄幻 · 连载中 · 86万字</div>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">基本信息</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">作品名称</div>
                        <div style="font-size: 14px; color: var(--text-primary);">仙途漫漫</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">作者笔名</div>
                        <div style="font-size: 14px; color: var(--text-primary);">青云墨客</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">作品类型</div>
                        <div style="font-size: 14px; color: var(--text-primary);">玄幻 · 修仙</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">首发平台</div>
                        <div style="font-size: 14px; color: var(--text-primary);">起点中文网</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">创建时间</div>
                        <div style="font-size: 14px; color: var(--text-primary);">2025-03-15</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">最后更新</div>
                        <div style="font-size: 14px; color: var(--text-primary);">2026-04-29 14:32</div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">作品简介</div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.8;">
                    林青云，一个出身平凡的山村少年，意外获得上古传承，踏上修仙之路。在这个强者为尊的世界里，他凭借坚韧的意志和过人的天赋，一步步从杂役弟子成长为震慑万界的仙尊。然而，当他站在巅峰之际，却发现这一切背后隐藏着一个关乎天地存亡的巨大阴谋……
                </div>
            </div>

            <div class="card">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">标签</div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    <span class="tag active">热血</span>
                    <span class="tag active">逆袭</span>
                    <span class="tag active">修炼</span>
                    <span class="tag">系统</span>
                    <span class="tag">爽文</span>
                    <span class="tag">凡人流</span>
                </div>
            </div>
        </div>
    `

    // 大纲总览
writingViews.outline = () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">故事大纲</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">三幕结构 · 已规划至大结局</div>
                </div>
                <button class="btn btn-primary btn-sm">✏️ 编辑大纲</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div class="card" style="border-left: 3px solid var(--accent);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">第一幕：起 — 初入仙途</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        林青云在灵根测试中被判定为废灵根，沦为杂役弟子。机缘巧合下获得上古传承《九天玄功》，开始秘密修炼。在宗门大比中一鸣惊人，引起各方势力关注。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第1-50章</span>
                        <span>✅ 已完成</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--info);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--info); margin-bottom: 8px;">第二幕：承 — 宗门风云</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        林青云进入内门，卷入宗门权力斗争。发现宗门长老暗中勾结魔道，意图颠覆正道。在一次次生死历练中，林青云逐渐成长为核心弟子，并揭穿了长老的阴谋。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第51-200章</span>
                        <span>📝 连载中（当前第127章）</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--warning);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--warning); margin-bottom: 8px;">第三幕：转 — 万界征战</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        魔道全面入侵，林青云突破元婴期，带领正道联盟抵抗。在万界战场中发现上古遗迹，揭开天地大劫的真相。与宿敌莫天机展开最终对决。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第201-350章</span>
                        <span>⏳ 未开始</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--success);">
                    <div style="font-size: 13px; font-weight: 600; color: var(--success); margin-bottom: 8px;">第四幕：合 — 登临绝巅</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        林青云突破大乘期，成为一代仙尊。化解天地大劫，重建三界秩序。与苏婉清终成眷属，归隐仙山，留下无数传说。
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                        <span>📖 第351-400章</span>
                        <span>⏳ 未开始</span>
                    </div>
                </div>
            </div>
        </div>
    `

    // 细纲管理
writingViews.outlineDetail = () => `
        <div style="display: flex; height: 100%; gap: 16px; padding: 16px;">
            <!-- 左栏：章节列表 -->
            <div style="width: 220px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
                <div style="padding: 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">章节列表</span>
                    <span style="font-size: 12px; color: var(--text-muted);">共128章</span>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 8px;">
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; padding: 8px 8px 4px;">第一卷：初入仙途</div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; background: rgba(99,102,241,0.08); margin-bottom: 2px; border-left: 2px solid var(--accent);">
                            <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">第1章 灵根测试</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">3200字 · 已发布</div>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
                            <div style="font-size: 13px; color: var(--text-primary);">第2章 拜师学艺</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">4100字 · 已发布</div>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
                            <div style="font-size: 13px; color: var(--text-primary);">第3章 初窥门径</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">3800字 · 已发布</div>
                        </div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: 600; padding: 8px 8px 4px;">第二卷：宗门风云</div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; margin-bottom: 2px;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='transparent'">
                            <div style="font-size: 13px; color: var(--text-primary);">第51章 内门选拔</div>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">4500字 · 已发布</div>
                        </div>
                        <div style="padding: 8px; border-radius: 6px; cursor: pointer; background: rgba(245,158,11,0.08); margin-bottom: 2px; border-left: 2px solid var(--warning);">
                            <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">第127章 突破元婴</div>
                            <div style="font-size: 11px; color: var(--warning); margin-top: 2px;">5200字 · 草稿</div>
                        </div>
                    </div>
                </div>
                <div style="padding: 12px; border-top: 1px solid var(--border);">
                    <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="showToast('新增章节', 'success')">➕ 新增章</button>
                </div>
            </div>

            <!-- 中栏：章节细纲 -->
            <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                        <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">细纲管理</div>
                        <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">当前：第1章 灵根测试 · 3200字</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline btn-sm" onclick="showToast('细纲已保存', 'success')">💾 保存细纲</button>
                        <button class="btn btn-primary btn-sm" onclick="switchWritingView('editor')">✏️ 编辑正文</button>
                    </div>
                </div>

                <div style="flex: 1; overflow-x: auto; overflow-y: hidden; display: flex; gap: 16px; padding-bottom: 8px;">
                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">开篇：山村少年</div>
                            <div style="font-size: 11px; color: var(--text-muted);">场景：青石村 · 人物：林青云、林父</div>
                        </div>
                        <div style="flex: 1; padding: 16px; overflow-y: auto;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">【核心情节点】</div>
                            <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; padding-left: 16px; margin: 0;">
                                <li>清晨，林青云在山中采药，展现其吃苦耐劳的性格</li>
                                <li>回到家中，父亲告知灵根测试的消息，青云内心忐忑</li>
                                <li>父亲鼓励青云，无论结果如何都要坚强面对</li>
                                <li>埋下伏笔：青云随身携带的神秘玉佩发出微光</li>
                            </ul>
                        </div>
                        <div style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('AI扩写中...', 'info')">🤖 AI扩写</button>
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('进入编辑模式', 'info')">📝 编辑</button>
                        </div>
                    </div>

                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">测试：灵根觉醒</div>
                            <div style="font-size: 11px; color: var(--text-muted);">场景：测灵殿 · 人物：林青云、测灵长老</div>
                        </div>
                        <div style="flex: 1; padding: 16px; overflow-y: auto;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">【核心情节点】</div>
                            <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; padding-left: 16px; margin: 0;">
                                <li>青云到达测灵殿，与各大家族子弟形成对比</li>
                                <li>测灵石对青云毫无反应，被判定为废灵根</li>
                                <li>长老冷漠宣布结果，周围人议论纷纷</li>
                                <li>青云强忍泪水，暗中握紧玉佩，感受到一股暖流</li>
                            </ul>
                        </div>
                        <div style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('AI扩写中...', 'info')">🤖 AI扩写</button>
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('进入编辑模式', 'info')">📝 编辑</button>
                        </div>
                    </div>

                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column;">
                        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">转折：上古传承</div>
                            <div style="font-size: 11px; color: var(--text-muted);">场景：后山禁地 · 人物：林青云</div>
                        </div>
                        <div style="flex: 1; padding: 16px; overflow-y: auto;">
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-light); margin-bottom: 8px;">【核心情节点】</div>
                            <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.8; padding-left: 16px; margin: 0;">
                                <li>青云独自来到后山，玉佩突然发出强烈光芒</li>
                                <li>被传送到一处神秘洞府，遇到上古残魂</li>
                                <li>残魂认出青云体内的天灵根，传授《九天玄功》</li>
                                <li>青云获得传承，踏上修仙之路</li>
                            </ul>
                        </div>
                        <div style="padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px;">
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('AI扩写中...', 'info')">🤖 AI扩写</button>
                            <button class="btn btn-ghost btn-sm" style="flex: 1;" onclick="showToast('进入编辑模式', 'info')">📝 编辑</button>
                        </div>
                    </div>

                    <div style="width: 320px; flex-shrink: 0; background: var(--surface); border-radius: var(--radius); border: 2px dashed var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; min-height: 200px;" onclick="showToast('添加新的细纲卡片', 'info')">
                        <div style="text-align: center; color: var(--text-muted);">
                            <div style="font-size: 24px; margin-bottom: 8px;">➕</div>
                            <div style="font-size: 13px;">添加卡片</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右栏：AI 灵感工具 -->
            <div style="width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px;">
                <div style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">🤖 AI 灵感工具</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('启动工作流：生成细纲 → 扩写正文 → 润色', 'info')">
                            <span>⚡</span> 工作流
                        </button>
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('批量生成后续章节细纲', 'info')">
                            <span>📋</span> 批量生成章纲
                        </button>
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('基于当前情节生成新角色', 'info')">
                            <span>👤</span> 角色生成
                        </button>
                        <button class="btn btn-outline btn-sm" style="justify-content: flex-start; text-align: left;" onclick="showToast('重新生成故事总纲', 'info')">
                            <span>🎯</span> 生成总纲
                        </button>
                    </div>
                </div>

                <div style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">💡 当前灵感</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                        本章可以加强"废灵根"判定的戏剧性，让青云在众目睽睽之下被羞辱，为后续的逆袭营造更强的情绪张力。
                    </div>
                </div>

                <div style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 16px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">📊 本章统计</div>
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: var(--text-secondary);">
                        <div style="display: flex; justify-content: space-between;">
                            <span>预计字数</span>
                            <span style="color: var(--text-primary); font-weight: 500;">3200字</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>核心情节点</span>
                            <span style="color: var(--text-primary); font-weight: 500;">12个</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>场景数</span>
                            <span style="color: var(--text-primary); font-weight: 500;">3个</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>涉及角色</span>
                            <span style="color: var(--text-primary); font-weight: 500;">5人</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

    // 角色设定
writingViews.characters = () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">角色设定</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">共 12 个角色 · 主角团 3 人</div>
                </div>
                <button class="btn btn-primary btn-sm">➕ 新增角色</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-dark)); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">林</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">林青云</div>
                            <div style="font-size: 12px; color: var(--accent-light); margin-top: 2px;">主角</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        出身平凡山村，性格坚韧隐忍，拥有天灵根却被误判为废灵根。获得《九天玄功》后踏上修仙之路。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">坚韧</span>
                        <span class="tag">聪慧</span>
                        <span class="tag">重情义</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #ef4444, #b91c1c); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">苏</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">苏婉清</div>
                            <div style="font-size: 12px; color: var(--accent-light); margin-top: 2px;">女主</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        宗门圣女，天资聪颖，外表清冷内心温柔。与林青云在秘境中相识，共同经历生死后暗生情愫。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">清冷</span>
                        <span class="tag">善良</span>
                        <span class="tag">天赋异禀</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #15803d); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">莫</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">莫天机</div>
                            <div style="font-size: 12px; color: var(--danger); margin-top: 2px;">反派</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        魔道少主，城府极深，与林青云亦敌亦友。身世成谜，最终章揭示其与林青云的宿命渊源。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">城府深</span>
                        <span class="tag">亦正亦邪</span>
                        <span class="tag">悲剧宿命</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; font-family: var(--font-serif); flex-shrink: 0;">李</div>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">李长老</div>
                            <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 2px;">配角</div>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        宗门传功长老，表面严厉实则关心弟子。暗中调查宗门内鬼，是林青云成长路上的重要引路人。
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="tag">严厉</span>
                        <span class="tag">正义</span>
                        <span class="tag">导师</span>
                    </div>
                </div>

                <div class="card" style="cursor: pointer; border-style: dashed; border-color: var(--text-muted); display: flex; align-items: center; justify-content: center; min-height: 180px;"
                     onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--text-muted)'">
                    <div style="text-align: center; color: var(--text-muted);">
                        <div style="font-size: 28px; margin-bottom: 8px;">+</div>
                        <div style="font-size: 13px;">新增角色</div>
                    </div>
                </div>
            </div>
        </div>
    `

    // 世界观地图
writingViews.worldmap = () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">世界观地图</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">九州大陆 · 三大域 · 十二州</div>
                </div>
                <button class="btn btn-primary btn-sm">✏️ 编辑地图</button>
            </div>

            <div class="card" style="margin-bottom: 16px; min-height: 300px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(99,102,241,0.05), rgba(14,165,233,0.05));"></div>
                <div style="position: relative; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 16px;">🗺️</div>
                    <div style="font-size: 15px; color: var(--text-primary); font-weight: 600; margin-bottom: 8px;">九州大陆全景图</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">点击区域查看详细设定</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">🏔️ 东域 · 苍云山</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px;">
                        林青云的故乡，灵气稀薄但暗藏上古遗迹。山脉绵延三千里，凡人城镇散布其间。
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">出场章节：第1-20章</div>
                </div>
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">🏯 中域 · 天玄宗</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px;">
                        正道第一大宗门，坐落灵脉之上。宗门分内外两门，弟子数万，掌控中域修仙界命脉。
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">出场章节：第21-200章</div>
                </div>
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">🌑 西域 · 魔渊</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 8px;">
                        魔道大本营，终年黑雾笼罩。万魔窟、血炼池等禁地遍布，普通修士踏入九死一生。
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">出场章节：第80章起</div>
                </div>
            </div>
        </div>
    `

    // 势力分布
writingViews.factions = () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">势力分布</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">正道 · 魔道 · 中立 · 共 8 个势力</div>
                </div>
                <button class="btn btn-primary btn-sm">➕ 新增势力</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div class="card" style="border-left: 3px solid var(--accent);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">天玄宗</div>
                            <div style="font-size: 12px; color: var(--accent-light); margin-top: 2px;">正道 · 超级宗门</div>
                        </div>
                        <span class="tag active">核心阵营</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        正道第一大宗门，宗主玄天真人乃大乘期强者。掌控中域十二州，门下弟子数万，与林青云渊源颇深。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 32,000</span>
                        <span>⭐ 顶级强者 8 人</span>
                        <span>📍 中域</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--danger);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">万魔殿</div>
                            <div style="font-size: 12px; color: var(--danger); margin-top: 2px;">魔道 · 超级势力</div>
                        </div>
                        <span class="tag" style="background: rgba(239,68,68,0.1); color: var(--danger);">敌对</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        魔道至尊势力，殿主血魔老祖半步大乘。信奉弱肉强食，门下弟子虽少但个个心狠手辣。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 5,000</span>
                        <span>⭐ 顶级强者 5 人</span>
                        <span>📍 西域</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--info);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">药王谷</div>
                            <div style="font-size: 12px; color: var(--info); margin-top: 2px;">中立 · 丹道圣地</div>
                        </div>
                        <span class="tag" style="background: rgba(14,165,233,0.1); color: var(--info);">盟友</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        天下丹道正宗，谷主药王仙子以炼制九品丹药闻名。中立不介入正魔之争，但暗中支持正道。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 8,000</span>
                        <span>⭐ 顶级强者 3 人</span>
                        <span>📍 南域</span>
                    </div>
                </div>

                <div class="card" style="border-left: 3px solid var(--warning);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">剑冢</div>
                            <div style="font-size: 12px; color: var(--warning); margin-top: 2px;">中立 · 剑修圣地</div>
                        </div>
                        <span class="tag">中立</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
                        天下剑修心中的圣地，只收剑道天才。不问正魔，只认剑心。宗主剑痴已三百年未出世。
                    </div>
                    <div style="display: flex; gap: 16px; font-size: 11px; color: var(--text-muted);">
                        <span>👥 弟子 1,200</span>
                        <span>⭐ 顶级强者 4 人</span>
                        <span>📍 北域</span>
                    </div>
                </div>
            </div>
        </div>
    `

    // 物品法宝
writingViews.items = () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">物品法宝</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">武器 · 法宝 · 丹药 · 材料 · 共 36 件</div>
                </div>
                <button class="btn btn-primary btn-sm">➕ 新增物品</button>
            </div>

            <div class="tabs" style="margin-bottom: 20px;">
                <button class="tab active">全部</button>
                <button class="tab">武器</button>
                <button class="tab">法宝</button>
                <button class="tab">丹药</button>
                <button class="tab">材料</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🗡️</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">青霜剑</div>
                    <div style="font-size: 11px; color: var(--accent-light); margin-bottom: 8px;">上品灵器 · 武器</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        林青云本命法宝，剑身如秋水，寒气逼人。可释放青霜剑气，冻结方圆百丈。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">📿</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">九天玄玉</div>
                    <div style="font-size: 11px; color: var(--warning); margin-bottom: 8px;">传承至宝 · 法宝</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        《九天玄功》传承载体，内含上古大能残魂，可指导修炼、推演功法。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">💊</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">九转金丹</div>
                    <div style="font-size: 11px; color: var(--success); margin-bottom: 8px;">九品丹药 · 丹药</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        可助元婴期修士突破至化神期，成功率提升三成。药王谷镇谷之宝。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🛡️</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">玄武盾</div>
                    <div style="font-size: 11px; color: var(--info); margin-bottom: 8px;">中品灵器 · 法宝</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        防御型法宝，可抵挡化神期全力一击。表面刻有四象玄武阵纹。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🌿</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">千年灵芝</div>
                    <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 8px;">灵材 · 材料</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        生长在灵气浓郁之地的天材地宝，可炼制多种疗伤丹药。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 12px;">⚔️</div>
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">斩魔刀</div>
                    <div style="font-size: 11px; color: var(--danger); margin-bottom: 8px;">极品灵器 · 武器</div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
                        专为克制魔道而生，刀身刻有灭魔符文，对魔修伤害加成50%。
                    </div>
                </div>

                <div class="card" style="text-align: center; cursor: pointer; border-style: dashed; border-color: var(--text-muted); display: flex; align-items: center; justify-content: center; min-height: 180px;"
                     onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--text-muted)'">
                    <div style="text-align: center; color: var(--text-muted);">
                        <div style="font-size: 28px; margin-bottom: 8px;">+</div>
                        <div style="font-size: 13px;">新增物品</div>
                    </div>
                </div>
            </div>
        </div>
    `

    // 背景设定
writingViews.background = () => `
        <div class="page-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">背景设定</div>
                    <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">修炼体系 · 境界划分 · 世界观</div>
                </div>
                <button class="btn btn-primary btn-sm">✏️ 编辑设定</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">📜 修炼体系</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第一层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">炼气期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">引气入体</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第二层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">筑基期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">筑就道基</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第三层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">金丹期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">凝结金丹</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--accent-glow); border-radius: var(--radius-sm); border: 1px solid rgba(99,102,241,0.2);">
                            <span style="font-size: 12px; color: var(--accent); width: 60px;">第四层</span>
                            <span style="font-size: 13px; color: var(--accent-light); font-weight: 600;">元婴期</span>
                            <span style="font-size: 11px; color: var(--accent-light); margin-left: auto;">🎯 当前境界</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第五层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">化神期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">元神出窍</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <span style="font-size: 12px; color: var(--text-muted); width: 60px;">第六层</span>
                            <span style="font-size: 13px; color: var(--text-primary); font-weight: 500;">大乘期</span>
                            <span style="font-size: 11px; color: var(--text-tertiary); margin-left: auto;">登临绝巅</span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">🌍 世界规则</div>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">灵气复苏</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                每三千年一次灵气潮汐，潮汐期间修炼速度翻倍，也是正魔大战的导火索。
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">天道法则</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                修士不可滥杀凡人，违者降下天劫。大乘期需渡九重天劫方可飞升仙界。
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">灵根品阶</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                分为废品、下品、中品、上品、极品、天品六级。天灵根百年一遇，修炼速度是凡品十倍。
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 4px;">法宝品阶</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                                法器、灵器、法宝、灵宝、仙器五阶，每阶分下中上极四品。本命法宝可随主人成长进阶。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

