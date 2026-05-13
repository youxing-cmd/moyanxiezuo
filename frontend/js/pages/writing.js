const writingViews = {
    // 封面信息
    cover: () => `
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
    `,

    // 大纲总览
    outline: () => `
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
    `,

    // 细纲管理
    outlineDetail: () => `
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
    `,

    // 角色设定
    characters: () => `
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
    `,

    // 世界观地图
    worldmap: () => `
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
    `,

    // 势力分布
    factions: () => `
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
    `,

    // 物品法宝
    items: () => `
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
    `,

    // 背景设定
    background: () => `
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
    `,

    // 章节编辑器（默认视图）
    editor: () => `
        <div style="display:flex; flex-direction:column; gap: 16px;">
            <div style="display:flex; gap: 12px;">
                <!-- 编辑器主区域 -->
                <div class="card" style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                        <span style="font-size:14px; font-weight:600; color:var(--text-primary);">当前章节：第127章 突破元婴</span>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">💾 保存</button>
                            <button class="btn btn-primary btn-sm">🤖 AI续写</button>
                        </div>
                    </div>
                    <div class="editor-toolbar">
                        <div class="editor-tool" style="font-weight:bold;">B</div>
                        <div class="editor-tool" style="font-style:italic;">I</div>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <div class="editor-tool">H1</div>
                        <div class="editor-tool">H2</div>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <div class="editor-tool">❝</div>
                        <div class="editor-tool">📋</div>
                    </div>
                    <div class="editor-area">
                        <p>林青云盘坐在洞府深处的聚灵阵中，周身灵气如潮水般涌动。</p>
                        <p>三年的闭关苦修，他终于触摸到了元婴期的门槛。丹田中的金丹已经膨胀到了极限，表面布满了细密的裂纹，仿佛下一刻就要碎裂开来。</p>
                        <p>"就是现在！"</p>
                        <p>林青云深吸一口气，运转《九天玄功》最后一层心法，将全身灵力尽数灌入金丹之中。</p>
                        <p class="editor-placeholder">—— 在此处继续你的创作，或使用 AI 续写功能获取灵感 ——</p>
                    </div>
                </div>

                <!-- AI 对话面板 -->
                <div class="card" style="width: 320px; display:flex; flex-direction:column; max-height: 520px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
                        <span style="font-size:14px; font-weight:600; color:var(--text-primary);">🤖 AI 助手</span>
                        <span style="font-size:11px; color:var(--success);"
                              onmouseover="this.style.color='var(--success)'"
                              onmouseout="this.style.color='var(--success)'">● 在线</span>
                    </div>
                    <div id="aiChatBox" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px; margin-bottom:12px;">
                        <div style="align-self:flex-start; max-width:90%; background:var(--bg-tertiary); padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border);">
                            <div style="font-size:12px; color:var(--accent); font-weight:600; margin-bottom:4px;">AI</div>
                            <div style="font-size:13px; color:var(--text-primary); line-height:1.5;">你好！我正在阅读你的《仙途漫漫》。这一章突破元婴的设定很棒，需要我帮你续写接下来的心魔试炼场景吗？</div>
                        </div>
                        <div style="align-self:flex-end; max-width:90%; background:var(--accent); padding:10px 12px; border-radius:var(--radius);">
                            <div style="font-size:12px; color:rgba(255,255,255,0.7); font-weight:600; margin-bottom:4px;">你</div>
                            <div style="font-size:13px; color:white; line-height:1.5;">帮我续写一下，大概500字，要写出心魔的恐怖和林青云的坚定</div>
                        </div>
                        <div style="align-self:flex-start; max-width:90%; background:var(--bg-tertiary); padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border);">
                            <div style="font-size:12px; color:var(--accent); font-weight:600; margin-bottom:4px;">AI</div>
                            <div style="font-size:13px; color:var(--text-primary); line-height:1.5;">好的，已为你续写：

金丹碎裂的瞬间，林青云的意识被拉入一片虚无。

黑暗中，无数张熟悉的面孔浮现——死去的师父、背叛的师兄、还有那些被他亲手斩杀的妖魔。他们的声音交织成一曲摄人心魄的挽歌："你也不过如此......"

心魔化身为林青云最恐惧的模样——一个满头白发、修为尽废的自己。

"放弃吧。"心魔轻声道，"这千年仙途，有多少人倒在元婴门前？你凭什么认为自己能例外？"

林青云闭上双眼。

"因为......"他猛然睁眼，眸中金光爆射，"我从未想过例外。我只知道，若在此处倒下，便对不起三年前那个在灵根测试中被判为废物的少年！"

他并指如剑，直刺心魔眉心。这一剑，没有灵力，只有意志。</div>
                            <div style="display:flex; gap:8px; margin-top:8px; padding-top:8px; border-top:1px solid var(--border);">
                                <button class="ai-feedback-btn" data-type="insert" style="font-size:11px; padding:4px 10px; background:var(--accent); color:white; border:none; border-radius:4px; cursor:pointer;">✓ 插入正文</button>
                                <button class="ai-feedback-btn" data-type="regenerate" style="font-size:11px; padding:4px 10px; background:var(--bg-hover); color:var(--text-secondary); border:1px solid var(--border); border-radius:4px; cursor:pointer;">🔄 重新生成</button>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; padding-top:10px; border-top:1px solid var(--border);">
                        <input type="text" id="aiChatInput" placeholder="输入你的需求..." style="flex:1; background:var(--bg-tertiary); border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px; color:var(--text-primary); font-size:13px; outline:none;">
                        <button class="btn btn-primary btn-sm" id="aiChatSend" style="padding:8px 14px;" onclick="showToast('请进入写作页面使用AI对话', 'info')">发送</button>
                    </div>
                </div>
            </div>

            <!-- 统计卡片 + 反馈区 -->
            <div style="display:flex; gap: 12px; align-items:stretch;">
                <div class="card" style="flex:1;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">本章字数</div>
                    <div style="font-size:24px; font-weight:700; color:var(--text-primary);">5,247</div>
                    <div class="progress-bar" style="margin-top:10px;">
                        <div class="progress-fill" style="width: 52%; background: var(--accent);"></div>
                    </div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">目标: 10,000字</div>
                </div>
                <div class="card" style="flex:1;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">AI 辅助次数</div>
                    <div style="font-size:24px; font-weight:700; color:var(--text-primary);">23</div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">本章共使用 23 次 AI 辅助</div>
                </div>
                <div class="card" style="flex:1;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">创作时长</div>
                    <div style="font-size:24px; font-weight:700; color:var(--text-primary);">3h 42m</div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:6px;">今日已创作 3小时42分</div>
                </div>
                <div class="card" style="width: 200px;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">本章质量反馈</div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btnLike" class="btn btn-ghost" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);" onclick="trackFeedback('like')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                            <span style="font-size:13px; color:var(--text-secondary);">12</span>
                        </button>
                        <button id="btnDislike" class="btn btn-ghost" style="flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);" onclick="trackFeedback('dislike')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                            <span style="font-size:13px; color:var(--text-secondary);">2</span>
                        </button>
                    </div>
                    <div style="font-size:11px; color:var(--text-tertiary); margin-top:8px;">点赞/点踩数据用于优化AI推荐</div>
                </div>
            </div>
        </div>
    `,

};


    pages.writing = () => `
        <div class="writing-workspace" style="display:flex; flex-direction:column; height:calc(100vh - 80px); margin:-24px -24px 0;">
            <!-- 顶部信息栏 -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 16px; background:var(--bg-secondary); border-bottom:1px solid var(--border); flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span id="writingWorkTitle" style="font-size:15px; font-weight:600; color:var(--text-primary);">加载中...</span>
                    <span id="writingWorkMeta" style="font-size:12px; color:var(--text-muted);">...</span>
                    <span id="writingWordCount" style="font-size:12px; color:var(--text-tertiary);">...</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="btn btn-ghost btn-sm" id="btnSaveChapter" onclick="saveCurrentChapter()">💾 保存</button>
                    <button class="btn btn-ghost btn-sm" onclick="exportChapter(currentWorkId, currentChapterId)">📤 导出本章</button>
                    <button class="btn btn-ghost btn-sm" onclick="exportWork(currentWorkId)">📦 导出作品</button>
                </div>
            </div>

            <!-- 三栏主体 -->
            <div style="display:flex; flex:1; overflow:hidden;">
                <!-- 左栏 -->
                <div id="writeColLeft" style="width:220px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border-right:1px solid var(--border);">
                    <!-- 左栏tab -->
                    <div style="display:flex; border-bottom:1px solid var(--border);">
                        <button class="left-tab" data-tab="info" onclick="switchLeftTab('info')" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-muted); background:transparent; border:none; cursor:pointer; border-bottom:2px solid transparent;">作品信息</button>
                        <button class="left-tab active" data-tab="body" onclick="switchLeftTab('body')" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-primary); background:transparent; border:none; cursor:pointer; border-bottom:2px solid var(--accent); font-weight:600;">正文</button>
                        <button class="left-tab" data-tab="analysis" onclick="switchLeftTab('analysis')" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-muted); background:transparent; border:none; cursor:pointer; border-bottom:2px solid transparent;">AI分析</button>
                    </div>

                    <!-- 左栏内容区 -->
                    <div id="leftPanel" style="flex:1; overflow-y:auto; padding:12px;">
                        <!-- 正文tab内容 -->
                        <div id="left-body" style="display:block;">
                            <!-- 灵感区域（作品灵感） -->
                            <div style="margin-bottom:12px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>💡 灵感</span>
                                </div>
                                <!-- 作品灵感（可拖动展开） -->
                                <div id="workInspirationPanel" style="border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;">
                                    <div style="padding:6px 10px; background:var(--bg-tertiary); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleWorkInspiration()">
                                        <span style="font-size:11px; color:var(--text-muted);">📌 作品灵感</span>
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <button style="font-size:11px; padding:2px 6px; border:none; background:transparent; color:var(--accent); cursor:pointer; border-radius:4px;" onclick="event.stopPropagation(); quoteWorkInspirationToChat()" title="引用到对话">💬 引用</button>
                                            <span id="workInspirationToggle" style="font-size:11px; color:var(--text-muted);">▶</span>
                                        </div>
                                    </div>
                                    <div id="workInspirationContent" style="padding:8px 10px; font-size:12px; color:var(--text-secondary); line-height:1.6; max-height:60px; overflow:hidden; text-overflow:ellipsis; display:none; word-break:break-all;"></div>
                                </div>
                            </div>

                            <div style="border-top:1px solid var(--border); padding-top:12px; margin-bottom:16px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📑 章节</span>
                                    <div style="display:flex; gap:4px; align-items:center;">
                                        <button class="btn btn-ghost btn-sm" id="btnChapterSort" style="padding:2px 6px; font-size:11px;" onclick="toggleChapterSort()" title="切换排序">↓</button>
                                        <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="showCreateChapterModal()">+</button>
                                    </div>
                                </div>
                                <div id="chapterList">
                                    <div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">加载中...</div>
                                </div>
                            </div>
                        </div>

                        <!-- 作品信息tab内容 -->
                        <div id="left-info" style="display:none;">
                            <!-- 作品详情 -->
                            <div id="workDetailSection" style="margin-bottom:12px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📋 作品详情</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="enterWorkDetail('edit', currentWorkId)">编辑</button>
                                </div>
                                <div id="workDetailInfo" style="font-size:12px; color:var(--text-secondary); line-height:1.6;">
                                    <div style="padding:6px 8px; color:var(--text-muted);">加载中...</div>
                                </div>
                            </div>

                            <!-- 总纲 -->
                            <div style="margin-top:16px; border-top:1px solid var(--border); padding-top:12px;">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>📖 总纲</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px; font-size:11px;" onclick="showOutlineForm()">+</button>
                                </div>
                                <div id="workOutlinesContainer">
                                    <div style="padding:6px 8px; border-radius:var(--radius-sm); font-size:12px; color:var(--text-secondary); cursor:pointer;" onclick="showOutlineForm()">暂无总纲，点击新增</div>
                                </div>
                            </div>
                        </div>

                        <!-- AI分析tab内容 -->
                        <div id="left-analysis" style="display:none;">
                            <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                <span>🤖 AI 智能分析</span>
                                <div style="display:flex; gap:4px;">
                                    <button class="btn btn-ghost btn-sm" id="btnReAnalysis" style="padding:3px 8px; font-size:11px; display:none;" onclick="generateAIAnalysis()">🔄 重新拆书</button>
                                    <button class="btn btn-primary btn-sm" id="btnAIAnalysis" style="padding:3px 8px; font-size:11px;" onclick="generateAIAnalysis()">AI拆书</button>
                                </div>
                            </div>
                            <!-- 维度标签导航 -->
                            <div id="analysisTabs" style="display:none; margin-bottom:10px; border-bottom:1px solid var(--border);">
                                <div style="display:flex; gap:2px; overflow-x:auto; padding-bottom:1px;">
                                    <button class="analysis-tab active" data-tab="all" onclick="switchAnalysisTab('all')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--accent); border-bottom:2px solid var(--accent); cursor:pointer; white-space:nowrap; font-weight:600;">全文</button>
                                    <button class="analysis-tab" data-tab="coreConflict" onclick="switchAnalysisTab('coreConflict')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">核心矛盾</button>
                                    <button class="analysis-tab" data-tab="coreEmotion" onclick="switchAnalysisTab('coreEmotion')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">核心情绪</button>
                                    <button class="analysis-tab" data-tab="characterSetting" onclick="switchAnalysisTab('characterSetting')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">人物设定</button>
                                    <button class="analysis-tab" data-tab="plotTrend" onclick="switchAnalysisTab('plotTrend')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">剧情走向</button>
                                    <button class="analysis-tab" data-tab="characterMotivation" onclick="switchAnalysisTab('characterMotivation')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">人物动机</button>
                                    <button class="analysis-tab" data-tab="plotTwist" onclick="switchAnalysisTab('plotTwist')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">反转剧情</button>
                                    <button class="analysis-tab" data-tab="cliffhanger" onclick="switchAnalysisTab('cliffhanger')" style="padding:5px 8px; font-size:11px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">卡点剧情</button>
                                </div>
                            </div>
                            <!-- 操作按钮 -->
                            <div id="analysisActions" style="margin-bottom:10px; display:flex; gap:6px; justify-content:flex-end;">
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="quoteAIAnalysisToChat()">💬 引用到对话</button>
                                <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px;" onclick="copyAIAnalysis()">📋 复制</button>
                                <button class="btn btn-primary btn-sm" style="padding:2px 8px; font-size:11px;" onclick="saveAIAnalysisToInspiration()">⭐ 收藏</button>
                            </div>
                            <div id="aiAnalysisContent" style="font-size:12px; color:var(--text-secondary); line-height:1.7;">
                                <div style="padding:12px 8px; text-align:center; color:var(--text-muted);">
                                    <div style="margin-bottom:8px;">📖</div>
                                    <div>暂无分析数据</div>
                                    <div style="font-size:11px; margin-top:4px;">点击「AI拆书」生成作品分析</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 左-中 拖拽手柄 -->
                <div class="resize-handle" data-resize="left" style="width:4px; cursor:col-resize; background:transparent; flex-shrink:0; z-index:10; position:relative;">
                    <div style="position:absolute; top:0; bottom:0; left:1px; width:2px; background:var(--border); opacity:0; transition:opacity 0.2s;"></div>
                </div>

                <!-- 中栏：编辑器 -->
                <div style="flex:1; display:flex; flex-direction:column; min-width:0; background:var(--bg-primary);">
                    <!-- AI工具栏 -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 16px; border-bottom:1px solid var(--border); flex-shrink:0;">
                        <div style="display:flex; gap:8px;">
                            <button class="ai-tool-btn active" data-action="continue" style="padding:6px 14px; border-radius:20px; border:none; background:var(--accent); color:white; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                续写正文
                            </button>
                            <button class="ai-tool-btn" data-action="continue-plot" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M2 12l5-5"/><path d="M2 12l5 5"/></svg>
                                续写情节
                            </button>
                            <button class="ai-tool-btn" data-action="replace" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                替换
                            </button>
                            <button class="ai-tool-btn" data-action="detect" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                AI纠错
                            </button>
                            <button class="ai-tool-btn" data-action="de-ai" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                去AI味
                            </button>
                        </div>
                        <div style="display:flex; gap:16px; align-items:center;">
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); cursor:pointer;">
                                <span>跨章滚动</span>
                                <input type="checkbox" id="crossChapterScroll" style="accent-color:var(--accent);" onchange="toggleCrossChapterScroll(this.checked)">
                            </label>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); cursor:pointer;">
                                <span>智能补全</span>
                                <input type="checkbox" id="smartComplete" style="accent-color:var(--accent);">
                            </label>
                        </div>
                    </div>

                    <!-- 编辑器工具栏 -->
                    <div style="display:flex; align-items:center; gap:4px; padding:6px 16px; border-bottom:1px solid var(--border); flex-shrink:0;">
                        <button class="editor-tool-btn" title="撤销 (Ctrl+Z)" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">↩</button>
                        <button class="editor-tool-btn" title="重做 (Ctrl+Y)" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">↪</button>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <button class="editor-tool-btn" title="标题" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center;">H1</button>
                        <button class="editor-tool-btn" title="粗体" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; font-weight:bold; display:flex; align-items:center; justify-content:center;">B</button>
                        <button class="editor-tool-btn" title="斜体" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; font-style:italic; display:flex; align-items:center; justify-content:center;">I</button>
                        <button class="editor-tool-btn" title="下划线" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; text-decoration:underline; display:flex; align-items:center; justify-content:center;">U</button>
                        <button class="editor-tool-btn" title="删除线" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; text-decoration:line-through; display:flex; align-items:center; justify-content:center;">S</button>
                        <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
                        <button class="editor-tool-btn" title="引用" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">❝</button>
                        <button class="editor-tool-btn" title="列表" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">☰</button>
                        <button class="editor-tool-btn" title="待办" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">☐</button>
                        <button class="editor-tool-btn" title="分隔线" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">―</button>
                        <button class="editor-tool-btn" title="时钟" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">⏱</button>
                        <button class="editor-tool-btn" id="btnOpenFindReplace" title="查找替换 (Ctrl+F)" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;" onclick="openFindReplaceDialog()">🔍</button>
                        <button class="editor-tool-btn" id="btnClearFormat" title="清除格式" style="width:28px; height:28px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">✂️</button>
                        <div style="flex:1;"></div>
                        <button class="editor-tool-btn" id="btnChapterVersions" title="历史版本" onclick="if(!currentChapterId){showToast('请先选择一个章节','warning');return;}showChapterVersions(currentChapterId);" style="padding:4px 10px; border:none; background:transparent; color:var(--text-muted); border-radius:4px; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px;">
                            <span>🕐</span><span>历史</span>
                        </button>
                        <select id="editorFontSelect" style="background:var(--bg-tertiary); border:1px solid var(--border); border-radius:4px; padding:4px 8px; color:var(--text-secondary); font-size:12px; outline:none;">
                            <option value="default">字体：默认</option>
                            <option value="Noto Serif SC, Georgia, serif">宋体</option>
                            <option value="Noto Sans SC, system-ui, sans-serif">黑体</option>
                            <option value="SimSun, STSong, serif">仿宋</option>
                            <option value="KaiTi, STKaiti, serif">楷体</option>
                        </select>
                        <select id="editorSizeSelect" style="background:var(--bg-tertiary); border:1px solid var(--border); border-radius:4px; padding:4px 8px; color:var(--text-secondary); font-size:12px; outline:none;">
                            <option value="14px">字号：小</option>
                            <option value="15px" selected>字号：标准</option>
                            <option value="17px">字号：大</option>
                            <option value="19px">字号：超大</option>
                        </select>
                    </div>

                    <!-- 编辑器内容区 -->
                    <div id="editorScrollContainer" style="flex:1; overflow-y:auto; padding:24px 48px;">
                        <div id="editorArea" contenteditable="true" style="outline:none; max-width:700px; margin:0 auto; min-height:400px; font-family:var(--font-serif); line-height:1.8; color:var(--editor-text, var(--text-primary));">
                            <h1 id="editorTitle" style="font-size:28px; font-weight:700; margin-bottom:16px;">选择一个章节开始写作</h1>
                            <p id="editorPlaceholder" style="color:var(--text-muted);">在左侧章节列表中选择一个章节，或创建新章节</p>
                        </div>
                    </div>
                </div>

                <!-- 中-右 拖拽手柄 -->
                <div class="resize-handle" data-resize="right" style="width:4px; cursor:col-resize; background:transparent; flex-shrink:0; z-index:10; position:relative;">
                    <div style="position:absolute; top:0; bottom:0; left:1px; width:2px; background:var(--border); opacity:0; transition:opacity 0.2s;"></div>
                </div>

                <!-- 右栏：AI对话 -->
                <div id="writeColRight" style="width:320px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border-left:1px solid var(--border); position:relative; z-index:100;">
                    <!-- 右栏tab -->
                    <div style="display:flex; border-bottom:1px solid var(--border);">
                        <button class="right-tab" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-muted); background:transparent; border:none; cursor:pointer; border-bottom:2px solid transparent;">灵感卡片</button>
                        <button class="right-tab active" style="flex:1; padding:10px 0; font-size:13px; color:var(--text-primary); background:transparent; border:none; cursor:pointer; border-bottom:2px solid var(--accent); font-weight:600;">AI对话</button>
                    </div>

                    <!-- AI对话内容 -->
                    <div id="aiChatDialogBody" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                        <!-- AI头像和介绍 -->
                        <div style="padding:16px; border-bottom:1px solid var(--border);">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                                <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--accent-dark)); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
                                    <svg width="20" height="20" viewBox="0 0 40 40" style="display:block;">
                                        <text x="20" y="28" font-size="22" font-family="'Noto Serif SC', serif" fill="white" text-anchor="middle" font-weight="700">九</text>
                                    </svg>
                                </div>
                                <div style="font-size:14px; font-weight:600; color:var(--text-primary);">九章</div>
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">
                                嗨！我是智能写作助手九章。今天想写什么故事？
                            </div>
                            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">内容由AI生成，仅供参考</div>
                        </div>

                        <!-- 消息列表 -->
                        <div id="aiChatMessages" class="chat-dialog-resizable" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:12px; min-height:80px;">
                            <!-- 历史消息由 JS 动态加载 -->
                        </div>

                        <!-- 输入区 -->
                        <div style="padding:12px; border-top:1px solid var(--border); flex-shrink:0;">
                            <!-- 顶行：上传文件 + @引用 -->
                            <div style="display:flex; gap:8px; margin-bottom:8px;">
                                <button style="padding:4px 10px; border:1px solid var(--border); background:var(--bg-tertiary); border-radius:4px; color:var(--text-secondary); font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                    上传文件
                                </button>
                                <button id="chatRefBtn" style="padding:4px 10px; border:1px solid var(--border); background:var(--bg-tertiary); border-radius:4px; color:var(--text-secondary); font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    @引用
                                </button>
                            </div>
                            <!-- 输入框顶部拖拽条 -->
                            <div id="chatInputResizeHandle" style="height:6px; cursor:ns-resize; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; position:relative; margin:0 -12px;" title="上下拖动调整输入框高度">
                                <div class="resize-indicator" style="width:40px; height:3px; background:var(--border); border-radius:2px; transition:background 0.2s;"></div>
                            </div>
                            <!-- 输入框 -->
                            <textarea id="aiChatInput" placeholder="输入「/」唤起工具..." style="width:100%; min-height:60px; background:var(--bg-tertiary); border:1px solid var(--border); border-radius:var(--radius); padding:10px; color:var(--text-primary); font-size:13px; resize:none; outline:none; font-family:inherit;"></textarea>
                            <!-- 底行：模型 + 工具 + 发送 -->
                            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                <!-- 模型切换 -->
                                <div id="chatModelPicker" style="position:relative; flex:1;">
                                    <button id="chatModelTrigger" style="padding:4px 10px; border-radius:16px; border:1px solid var(--border); background:var(--bg-tertiary); color:var(--text-secondary); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; transition:all 0.2s; width:100%;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                                        <span id="chatModelTriggerName">默认模型</span> <span id="chatModelArrow" style="font-size:10px; transition:transform 0.2s;">▼</span>
                                    </button>
                                    <div id="chatModelDropdown" style="position:absolute; left:0; bottom:calc(100% + 6px); min-width:180px; max-height:260px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:10px; display:none; flex-direction:column; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:9999; overflow:hidden;">
                                        <div id="chatModelDropdownList" style="padding:8px 0; overflow-y:auto; max-height:260px;"></div>
                                        <div style="padding:8px 12px; border-top:1px solid var(--border);">
                                            <button class="btn btn-ghost btn-sm" style="width:100%; font-size:11px;" onclick="switchPage('modelConfigs')">🤖 选择模型</button>
                                        </div>
                                    </div>
                                </div>
                                <!-- 隐藏的 select，仅用于数据同步 -->
                                <select id="chatToolSelect" style="display:none;">
                                    <option value="default">🛠️ 九章默认工具</option>
                                </select>
                                <!-- 工具选择器 -->
                                <div id="chatToolPicker" style="position:relative; flex:1;">
                                    <button id="chatToolTrigger" style="padding:4px 10px; border-radius:16px; border:1px solid var(--border); background:var(--bg-tertiary); color:var(--text-secondary); font-size:11px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px; transition:all 0.2s; width:100%;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
                                        <span id="chatToolTriggerName">默认工具</span> <span id="chatToolArrow" style="font-size:10px; transition:transform 0.2s;">▼</span>
                                    </button>
                                    <!-- 弹出面板：向上展开，左右双栏 -->
                                    <div id="chatToolDropdown" style="position:absolute; left:50%; transform:translateX(-50%); bottom:calc(100% + 6px); width:380px; max-height:320px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:10px; display:none; flex-direction:column; box-shadow:0 8px 24px rgba(0,0,0,0.15); z-index:9999; overflow:hidden;">
                                        <div style="padding:10px 12px; overflow-y:auto;">
                                            <div style="display:flex; gap:12px;">
                                                <!-- 左栏：我的收藏 -->
                                                <div style="flex:1; min-width:0;">
                                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                                        <span style="font-weight:600;">⭐ 我的收藏</span>
                                                        <span style="flex:1; height:1px; background:var(--border);"></span>
                                                    </div>
                                                    <div id="chatToolDropdownCustom" style="display:grid; grid-template-columns:1fr; gap:5px;"></div>
                                                </div>
                                                <!-- 右栏：官方推荐 -->
                                                <div style="flex:1.8; min-width:0;">
                                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                                        <span style="font-weight:600;">🏢 官方推荐</span>
                                                        <span style="flex:1; height:1px; background:var(--border);"></span>
                                                    </div>
                                                    <div id="chatToolDropdownOfficial" style="display:grid; grid-template-columns:1fr; gap:5px;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button class="btn btn-primary btn-sm" id="aiChatSend" style="padding:6px 16px; width:64px; flex-shrink:0;">发送</button>
                            </div>
                        </div>
                    </div>
                    <!-- 底部边框线 -->
                    <div style="height:1px; background:var(--border); flex-shrink:0;"></div>
                </div>
            </div>
        </div>
    `,

    // ========== AI 工具库 ==========
    'ai-tools': () => `
        <div class="page-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">AI 工具库</div>
                    <div style="font-size:13px; color:var(--text-muted);">官方推荐 + 我的工具，按需调用</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="showCreateAgentModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    创建工具
                </button>
            </div>

            <!-- Tab 切换 -->
            <div style="display:flex; gap:2px; border-bottom:1px solid var(--border); margin-bottom:20px;">
                <button class="tool-tab active" data-tab="official" onclick="switchToolTab('official')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid var(--accent); color:var(--accent); font-weight:600;">⭐ 官方推荐</button>
                <button class="tool-tab" data-tab="custom" onclick="switchToolTab('custom')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent; color:var(--text-muted);">🤖 我的工具</button>
                <button class="tool-tab" data-tab="prompt-debug" onclick="switchToolTab('prompt-debug')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent; color:var(--text-muted);">🧪 提示词调试</button>
            </div>

            <!-- 官方推荐 -->
            <div id="toolTabOfficial">
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">✍️ 写作辅助</div>
                    <div class="grid-4" id="toolGridWriting"></div>
                </div>
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">📖 剧情设计</div>
                    <div class="grid-4" id="toolGridPlot"></div>
                </div>
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">🔍 分析优化</div>
                    <div class="grid-4" id="toolGridAnalysis"></div>
                </div>
                <div class="tool-category" style="margin-bottom:16px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">📦 包装运营</div>
                    <div class="grid-4" id="toolGridPackage"></div>
                </div>
            </div>

            <!-- 我的工具 -->
            <div id="toolTabCustom" style="display:none;">
                <div id="customToolList" class="grid-4"></div>
                <div id="customToolEmpty" style="text-align:center; padding:60px; color:var(--text-muted); display:none;">
                    <div style="font-size:32px; margin-bottom:12px;">🤖</div>
                    <div style="font-size:15px; margin-bottom:8px;">还没有自定义工具</div>
                    <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">创建你的专属AI助手，定义独特的写作风格和能力</div>
                    <button class="btn btn-primary" onclick="showCreateAgentModal()">创建工具</button>
                </div>
            </div>

            <!-- 提示词调试 -->
            <div id="toolTabPromptDebug" style="display:none;">
                <div style="display:flex; gap:16px; height:calc(100vh - 220px); min-height:400px;">
                    <!-- 左侧：工具列表 -->
                    <div style="width:220px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden;">
                        <div style="padding:10px 12px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <select id="promptDebugSourceSelect" onchange="switchPromptDebugSource(this.value)"
                                    style="flex:1; min-width:0; font-size:12px; padding:4px 8px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); cursor:pointer; outline:none;">
                                <option value="custom">🤖 我的工具</option>
                                <option value="official">⭐ 官方推荐</option>
                            </select>
                            <button class="btn btn-ghost btn-sm" style="padding:2px 8px; font-size:11px; flex-shrink:0;" onclick="resetAllToolPrompts()" title="恢复全部默认">↺ 全部重置</button>
                        </div>
                        <div id="promptDebugToolList" style="flex:1; overflow-y:auto; padding:6px;">
                            <div style="padding:8px; text-align:center; color:var(--text-muted); font-size:12px;">加载中...</div>
                        </div>
                    </div>
                    <!-- 右侧：编辑 + 测试 -->
                    <div style="flex:1; display:flex; flex-direction:column; gap:12px; min-width:0;">
                        <!-- Prompt 编辑区 -->
                        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; min-height:0;">
                            <div style="padding:10px 14px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span id="promptDebugToolName" style="font-size:14px; font-weight:600; color:var(--text-primary);">请选择一个工具</span>
                                    <span id="promptDebugModifiedBadge" style="display:none; padding:2px 8px; border-radius:10px; background:var(--warning); color:white; font-size:11px;">已修改</span>
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <button class="btn btn-ghost btn-sm" id="btnPromptReset" style="padding:4px 10px; font-size:12px; display:none;" onclick="resetCurrentToolPrompt()">↺ 恢复默认</button>
                                    <button class="btn btn-primary btn-sm" id="btnPromptSave" style="padding:4px 10px; font-size:12px; display:none;" onclick="saveCurrentToolPrompt()">💾 保存修改</button>
                                </div>
                            </div>
                            <textarea id="promptDebugEditor" style="flex:1; padding:12px 14px; border:none; background:transparent; color:var(--text-secondary); font-size:13px; line-height:1.7; resize:none; outline:none; font-family:var(--font-sans);" placeholder="在左侧选择一个工具，查看和编辑其 system prompt..."></textarea>
                        </div>
                        <!-- 测试区 -->
                        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; min-height:0;">
                            <div style="padding:10px 14px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:14px; font-weight:600; color:var(--text-primary);">效果测试</span>
                                <button class="btn btn-primary btn-sm" id="btnPromptTest" style="padding:4px 14px; font-size:12px; display:none;" onclick="testCurrentToolPrompt()">▶ 运行测试</button>
                            </div>
                            <div style="flex:1; overflow-y:auto; padding:12px 14px;">
                                <div style="margin-bottom:10px;">
                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">测试输入</div>
                                    <textarea id="promptDebugTestInput" style="width:100%; min-height:60px; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-primary); font-size:12px; resize:vertical; outline:none; font-family:var(--font-sans);" placeholder="输入测试内容，例如一段需要润色的文字..."></textarea>
                                </div>
                                <div>
                                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">测试结果</div>
                                    <div id="promptDebugTestResult" style="min-height:60px; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm); background:var(--bg-tertiary); color:var(--text-secondary); font-size:12px; line-height:1.7; white-space:pre-wrap;">
                                        <span style="color:var(--text-muted);">点击「运行测试」查看效果</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="aiToolResult" style="margin-top:24px; display:none;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title" id="aiToolResultTitle">生成结果</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-ghost btn-sm" id="aiToolCopy">📋 复制</button>
                            <button class="btn btn-primary btn-sm" id="aiToolRetry">🔄 重新生成</button>
                        </div>
                    </div>
                    <div id="aiToolResultContent" style="padding:16px; white-space:pre-wrap; line-height:1.8; color:var(--text-secondary); font-size:14px; max-height:400px; overflow-y:auto;"></div>
                    <div id="aiToolResultLoading" style="padding:40px; text-align:center; display:none;">
                        <div style="font-size:24px; margin-bottom:8px;">⚡</div>
                        <div style="color:var(--text-muted); font-size:13px;">AI 正在处理，请稍候...</div>
                    </div>
                </div>
            </div>
        </div>
    `

