const writingViews = {
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
                    <!-- 左栏内容区：工作树 -->
                    <div id="leftPanel" style="flex:1; overflow-y:auto; padding:8px;">
                        <!-- 作品信息节点 -->
                        <div class="tree-header" onclick="toggleTreeNode('info')">
                            <span class="tree-toggle" id="treeToggle-info">▼</span>
                            <span>📚 作品信息</span>
                        </div>
                        <div class="tree-body" id="treeBody-info">
                            <div id="left-info">
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
                        </div>

                        <!-- 正文节点 -->
                        <div class="tree-header" onclick="toggleTreeNode('body')">
                            <span class="tree-toggle" id="treeToggle-body">▼</span>
                            <span>📑 正文</span>
                        </div>
                        <div class="tree-body" id="treeBody-body">
                            <div id="left-body">
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
                        </div>

                        <!-- AI 文件节点 -->
                        <div class="tree-header" onclick="toggleTreeNode('artifacts')">
                            <span class="tree-toggle" id="treeToggle-artifacts">▼</span>
                            <span>✨ AI 文件</span>
                        </div>
                        <div class="tree-body" id="treeBody-artifacts">
                            <div id="left-artifacts">
                                <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>✨ AI 生成文件</span>
                                    <span id="artifactsCount" style="font-size:11px; color:var(--text-muted); display:none;"></span>
                                </div>
                                <div id="artifactsList">
                                    <div style="padding:6px 8px; border-radius:var(--radius-sm); font-size:12px; color:var(--text-muted);">AI 对话中生成的内容会显示在这里</div>
                                </div>
                            </div>
                        </div>

                        <!-- AI分析节点 -->
                        <div class="tree-header" onclick="toggleTreeNode('analysis')">
                            <span class="tree-toggle" id="treeToggle-analysis">▼</span>
                            <span>🤖 AI分析</span>
                        </div>
                        <div class="tree-body" id="treeBody-analysis">
                            <div id="left-analysis">
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
                            <button class="ai-tool-btn" id="btnWorkMemory" onclick="switchToolTab('memory');" style="padding:6px 14px; border-radius:20px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                <span>🧠</span>
                                记忆
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
                            <!-- AI 模式切换 -->
                            <div id="agentModeBar" style="display:flex; align-items:center; justify-content:space-between; margin-top:6px;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="font-size:11px; color:var(--text-muted);">AI 模式</span>
                                    <button id="agentModeBtn" onclick="toggleAgentMode()" style="padding:2px 10px; border-radius:10px; border:1px solid var(--border); background:var(--bg-tertiary); color:var(--text-secondary); font-size:11px; cursor:pointer; transition:all 0.2s;">手动</button>
                                </div>
                                <span id="agentModeHint" style="font-size:11px; color:var(--text-muted);">手动选择模型和工具</span>
                            </div>
                            <!-- 底行：模型 + 工具 + 发送 -->
                            <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                                <!-- 模型切换（高级能力） -->
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
                                <!-- 工具选择器（高级能力） -->
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
    pages['ai-tools'] = () => `
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
                <button class="tool-tab" data-tab="memory" onclick="switchToolTab('memory')" style="padding:8px 16px; font-size:13px; border:none; background:transparent; cursor:pointer; border-bottom:2px solid transparent; color:var(--text-muted);">🧠 记忆</button>
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

            <!-- 作品记忆 -->
            <div id="toolTabMemory" style="display:none;">
                <div id="memoryDnaSection" style="margin-bottom:20px;">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">🧬 风格 DNA</div>
                    <div id="memoryDnaContent" style="font-size:12px; color:var(--text-secondary); line-height:1.6;">加载中...</div>
                </div>
                <div id="memorySummariesSection">
                    <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-bottom:10px;">📚 章节摘要与未回收钩子</div>
                    <div id="memorySummariesContent" style="max-height:400px; overflow-y:auto;">加载中...</div>
                </div>
            </div>

            <div id="aiToolResult" style="margin-top:24px; display:none;">
                <div class="card" id="aiToolResultCard">
                    <div class="card-header">
                        <div>
                            <div class="card-title" id="aiToolResultTitle">生成结果</div>
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

