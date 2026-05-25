    pages.writing = () => `
        <div class="writing-workspace" style="display:flex; flex-direction:column; height:calc(100vh - 72px); margin:-24px -24px 0;">
            <!-- 顶部栏 -->
            <div class="writing-topbar">
                <div class="writing-topbar-left">
                    <span class="writing-topbar-logo">九章</span>
                    <span id="writingWorkTitle" class="writing-topbar-title">加载中...</span>
                    <div class="writing-topbar-sep"></div>
                    <button class="topbar-btn" onclick="focusTreeSection('review')">审稿</button>
                    <button class="topbar-btn" onclick="focusTreeSection('analysis')">拆书</button>
                    <button class="topbar-btn" onclick="focusTreeSection('characters')">人物</button>
                    <button class="topbar-btn" onclick="focusTreeSection('outline')">大纲</button>
                    <button class="topbar-btn" onclick="focusTreeSection('locations')">设定</button>
                </div>
                <div class="writing-topbar-right">
                    <button class="topbar-btn" id="btnToggleDiff" onclick="toggleDiffPreview()">差异预览</button>
                    <button class="topbar-btn-save" id="btnSaveChapter" onclick="saveCurrentChapter()">保存</button>
                </div>
            </div>

            <!-- 三栏主体 -->
            <div class="editor-three-col">
                <!-- 左栏：创作资料树 -->
                <div id="writeColLeft" class="col-left">
                    <div class="chapter-tree">
                        <div class="chapter-tree-header">
                            <span>创作工作台</span>
                            <button onclick="showCreateChapterModal()" title="新建章节">新章</button>
                        </div>
                        <div class="chapter-tree-body" id="leftPanel">

                            <!-- ========== 正文目录 ========== -->
                            <div class="tree-section-header tree-section-root" onclick="toggleTreeNode('manuscript')">
                                <span class="vol-arrow open" id="treeToggle-manuscript">▶</span>
                                <span class="tree-dot" style="background:var(--accent)"></span>
                                <span style="flex:1; font-weight:600;">正文目录</span>
                                <button class="btn btn-ghost btn-sm" style="padding:1px 6px; font-size:10px;" onclick="event.stopPropagation(); showCreateChapterModal()">新建</button>
                            </div>
                            <div class="tree-section-body" id="treeBody-manuscript">
                                <div id="chapterList">
                                    <div style="padding:8px 12px; text-align:center; color:var(--text-muted); font-size:12px;">加载中...</div>
                                </div>
                            </div>

                            <!-- ========== 作品资料 ========== -->
                            <div class="tree-section-header tree-section-root" onclick="toggleTreeNode('global')">
                                <span class="vol-arrow open" id="treeToggle-global">▶</span>
                                <span class="tree-dot" style="background:var(--accent-light)"></span>
                                <span style="flex:1; font-weight:600;">作品资料</span>
                            </div>
                            <div class="tree-section-body" id="treeBody-global" style="display:block;">

                                <!-- 大纲 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('outline')">
                                    <span class="vol-arrow" id="treeToggle-outline">▶</span>
                                    <span class="tree-icon">📋</span>
                                    <span style="flex:1">故事大纲</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); showOutlineForm()">+</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-outline" style="display:none;">
                                    <div id="globalOutlineList">
                                        <div class="tree-empty">暂无大纲</div>
                                    </div>
                                </div>

                                <!-- 角色 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('characters')">
                                    <span class="vol-arrow" id="treeToggle-characters">▶</span>
                                    <span class="tree-icon">👤</span>
                                    <span style="flex:1">人物角色</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); showCharacterForm()">+</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-characters" style="display:none;">
                                    <div id="globalCharactersList">
                                        <div class="tree-empty">暂无角色</div>
                                    </div>
                                </div>

                                <!-- 地点 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('locations')">
                                    <span class="vol-arrow" id="treeToggle-locations">▶</span>
                                    <span class="tree-icon">📍</span>
                                    <span style="flex:1">地点场景</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); showSettingForm(null, 'location')">+</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-locations" style="display:none;">
                                    <div id="globalLocationsList">
                                        <div class="tree-empty">暂无地点</div>
                                    </div>
                                </div>

                                <!-- 创作要求 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('style')">
                                    <span class="vol-arrow" id="treeToggle-style">▶</span>
                                    <span class="tree-icon">🎨</span>
                                    <span style="flex:1">文风要求</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); switchToolTab('memory');" title="查看风格 DNA 详情">详情</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-style" style="display:none;">
                                    <div id="globalStyleList">
                                        <div class="tree-empty">暂无风格分析</div>
                                    </div>
                                </div>

                                <!-- 时间线 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('timeline')">
                                    <span class="vol-arrow" id="treeToggle-timeline">▶</span>
                                    <span class="tree-icon">📅</span>
                                    <span style="flex:1">剧情时间线</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); showSettingForm(null, 'timeline')">+</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-timeline" style="display:none;">
                                    <div id="globalTimelineList">
                                        <div class="tree-empty">暂无时间线</div>
                                    </div>
                                </div>

                                <!-- 角色状态 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('state')">
                                    <span class="vol-arrow" id="treeToggle-state">▶</span>
                                    <span class="tree-icon">✅</span>
                                    <span style="flex:1">角色状态</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); showSettingForm(null, 'state')">+</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-state" style="display:none;">
                                    <div id="globalStateList">
                                        <div class="tree-empty">暂无状态</div>
                                    </div>
                                </div>

                                <!-- 分析素材 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('analysis-src')">
                                    <span class="vol-arrow" id="treeToggle-analysis-src">▶</span>
                                    <span class="tree-icon">🔍</span>
                                    <span style="flex:1">分析素材</span>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-analysis-src" style="display:none;">
                                    <div id="globalAnalysisList">
                                        <div class="tree-empty">暂无素材</div>
                                    </div>
                                </div>

                                <!-- 作品灵感 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('inspiration')">
                                    <span class="vol-arrow" id="treeToggle-inspiration">▶</span>
                                    <span class="tree-icon">💡</span>
                                    <span style="flex:1">作品灵感</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); quoteWorkInspirationToChat()">引用</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-inspiration" style="display:none;">
                                    <div id="workInspirationContent" style="padding:3px 12px 3px 24px; font-size:11px; color:var(--text-secondary); line-height:1.5; max-height:120px; overflow:hidden; word-break:break-all;">
                                        <div class="tree-empty">暂无灵感</div>
                                    </div>
                                </div>

                                <!-- 作品详情 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('info')">
                                    <span class="vol-arrow" id="treeToggle-info">▶</span>
                                    <span class="tree-icon">ℹ️</span>
                                    <span style="flex:1">作品信息</span>
                                    <button class="btn btn-ghost btn-sm" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); enterWorkDetail('edit', currentWorkId)">编辑</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-info" style="display:none;">
                                    <div id="workDetailInfo" style="padding:3px 12px 3px 24px; font-size:11px; color:var(--text-secondary); line-height:1.6;">
                                        <div style="color:var(--text-muted);">加载中...</div>
                                    </div>
                                </div>

                            </div>

                            <!-- ========== AI 文件与审稿 ========== -->
                            <div class="tree-section-header tree-section-root" onclick="toggleTreeNode('aiproduct')">
                                <span class="vol-arrow" id="treeToggle-aiproduct">▶</span>
                                <span class="tree-dot" style="background:var(--warning)"></span>
                                <span style="flex:1; font-weight:600;">AI 文件与审稿</span>
                            </div>
                            <div class="tree-section-body" id="treeBody-aiproduct" style="display:none;">

                                <!-- AI 文件 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('artifacts')">
                                    <span class="vol-arrow" id="treeToggle-artifacts">▶</span>
                                    <span class="tree-icon">📄</span>
                                    <span style="flex:1">生成文件</span>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-artifacts" style="display:none;">
                                    <div id="artifactsList">
                                        <div class="tree-empty">对话中生成的大纲、设定、分析会显示在这里</div>
                                    </div>
                                </div>

                                <!-- AI 分析 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('analysis')">
                                    <span class="vol-arrow" id="treeToggle-analysis">▶</span>
                                    <span class="tree-icon">📊</span>
                                    <span style="flex:1">拆书分析</span>
                                    <button class="btn btn-ghost btn-sm" id="btnAIAnalysis" style="padding:1px 4px; font-size:10px;" onclick="event.stopPropagation(); generateAIAnalysis()">拆书</button>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-analysis" style="display:none;">
                                    <div style="padding:4px 8px;">
                                        <div style="display:flex; gap:4px; margin-bottom:6px; justify-content:flex-end;">
                                            <button class="btn btn-ghost btn-sm" id="btnReAnalysis" style="padding:1px 6px; font-size:10px; display:none;" onclick="generateAIAnalysis()">重新拆书</button>
                                        </div>
                                        <div id="analysisTabs" style="display:none; margin-bottom:6px; border-bottom:1px solid var(--border);">
                                            <div style="display:flex; gap:2px; overflow-x:auto; padding-bottom:1px;">
                                                <button class="analysis-tab active" data-tab="all" onclick="switchAnalysisTab('all')" style="padding:4px 6px; font-size:10px; border:none; background:transparent; color:var(--accent); border-bottom:2px solid var(--accent); cursor:pointer; white-space:nowrap; font-weight:600;">全文</button>
                                                <button class="analysis-tab" data-tab="coreConflict" onclick="switchAnalysisTab('coreConflict')" style="padding:4px 6px; font-size:10px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">核心矛盾</button>
                                                <button class="analysis-tab" data-tab="coreEmotion" onclick="switchAnalysisTab('coreEmotion')" style="padding:4px 6px; font-size:10px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">核心情绪</button>
                                                <button class="analysis-tab" data-tab="characterSetting" onclick="switchAnalysisTab('characterSetting')" style="padding:4px 6px; font-size:10px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">人物设定</button>
                                                <button class="analysis-tab" data-tab="plotTrend" onclick="switchAnalysisTab('plotTrend')" style="padding:4px 6px; font-size:10px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">剧情走向</button>
                                                <button class="analysis-tab" data-tab="cliffhanger" onclick="switchAnalysisTab('cliffhanger')" style="padding:4px 6px; font-size:10px; border:none; background:transparent; color:var(--text-muted); border-bottom:2px solid transparent; cursor:pointer; white-space:nowrap;">卡点剧情</button>
                                            </div>
                                        </div>
                                        <div id="analysisActions" style="margin-bottom:6px; display:flex; gap:4px; justify-content:flex-end;">
                                            <button class="btn btn-ghost btn-sm" style="padding:1px 6px; font-size:10px;" onclick="quoteAIAnalysisToChat()">引用</button>
                                            <button class="btn btn-ghost btn-sm" style="padding:1px 6px; font-size:10px;" onclick="copyAIAnalysis()">复制</button>
                                            <button class="btn btn-primary btn-sm" style="padding:1px 6px; font-size:10px;" onclick="saveAIAnalysisToInspiration()">收藏</button>
                                        </div>
                                        <div id="aiAnalysisContent" style="font-size:11px; color:var(--text-secondary); line-height:1.6;">
                                            <div style="padding:8px; text-align:center; color:var(--text-muted); font-size:11px;">
                                                <div>暂无分析数据</div>
                                                <div style="font-size:10px; margin-top:2px;">点击「拆书」生成</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 编辑工作台 -->
                                <div class="tree-section-header tree-section-sub" onclick="toggleTreeNode('review')">
                                    <span class="vol-arrow" id="treeToggle-review">▶</span>
                                    <span class="tree-icon">📋</span>
                                    <span style="flex:1">审稿工作台</span>
                                </div>
                                <div class="tree-section-body tree-section-sub-body" id="treeBody-review" style="display:none;">
                                    <div style="padding:6px 8px;">
                                        <div style="display:flex; flex-direction:column; gap:4px;">
                                            <button class="btn btn-primary btn-sm" style="padding:4px 8px; font-size:11px; justify-content:center;" onclick="runChapterReviewFromTree()">
                                                标准六维度审稿
                                            </button>
                                            <button class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:11px; justify-content:center;" onclick="runChapterReviewFromTree('short')">
                                                短篇爆款检查
                                            </button>
                                            <button class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:11px; justify-content:center;" onclick="runChapterReviewFromTree('male')">
                                                男频爽点检查
                                            </button>
                                            <button class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:11px; justify-content:center;" onclick="runChapterReviewFromTree('female')">
                                                女频情感线检查
                                            </button>
                                        </div>
                                        <div id="reviewSummary" style="margin-top:8px; font-size:11px; color:var(--text-muted);"></div>
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>
                </div>

                <!-- 拖拽手柄 -->
                <div class="col-resizer" data-resize="left"></div>

                <!-- 中栏：编辑器 -->
                <div class="col-center">
                    <div class="editor-panel">
                        <!-- AI 工具栏（Cursor 风格：单一入口） -->
                        <div class="editor-ai-bar">
                            <div class="ai-bar-left">
                                <button class="ai-tool-btn" id="btnAiContinue" onclick="handleContinueText()">
                                    <span style="margin-right:4px;">✦</span>续写正文
                                </button>
                            </div>
                            <div class="ai-bar-right">
                                <label class="toggle-row">
                                    <span>跨章滚动</span>
                                    <input type="checkbox" id="crossChapterScroll" style="accent-color:var(--accent);" onchange="toggleCrossChapterScroll(this.checked)">
                                </label>
                                <label class="toggle-row">
                                    <span>智能补全</span>
                                    <input type="checkbox" id="smartComplete" style="accent-color:var(--accent);">
                                </label>
                            </div>
                        </div>

                        <!-- 格式工具栏 -->
                        <div class="editor-format-bar">
                            <button class="tb-btn" title="撤销" onclick="document.execCommand('undo')">↩</button>
                            <button class="tb-btn" title="重做" onclick="document.execCommand('redo')">↪</button>
                            <div class="tb-sep"></div>
                            <button class="tb-btn" style="font-weight:600;" title="粗体" onclick="document.execCommand('bold')">B</button>
                            <button class="tb-btn" style="font-style:italic;" title="斜体" onclick="document.execCommand('italic')">I</button>
                            <button class="tb-btn" style="text-decoration:underline;" title="下划线" onclick="document.execCommand('underline')">U</button>
                            <div class="tb-sep"></div>
                            <button class="tb-btn" title="引用" onclick="document.execCommand('formatBlock','','blockquote')">❝</button>
                            <button class="tb-btn" title="列表" onclick="document.execCommand('insertUnorderedList')">☰</button>
                            <div class="tb-sep"></div>
                            <button class="tb-btn" id="btnOpenFindReplace" title="查找替换" onclick="openFindReplaceDialog()">🔍</button>
                            <button class="tb-btn" id="btnClearFormat" title="清除格式" onclick="document.execCommand('removeFormat')">✂</button>
                            <div class="tb-spacer"></div>
                            <button class="tb-btn" id="btnChapterVersions" onclick="if(!currentChapterId){showToast('请先选择一个章节','warning');return;}showChapterVersions(currentChapterId);">历史</button>
                            <select id="editorFontSelect" class="format-select">
                                <option value="default">默认字体</option>
                                <option value="Noto Serif SC, Georgia, serif">宋体</option>
                                <option value="Noto Sans SC, system-ui, sans-serif">黑体</option>
                                <option value="SimSun, STSong, serif">仿宋</option>
                                <option value="KaiTi, STKaiti, serif">楷体</option>
                            </select>
                            <select id="editorSizeSelect" class="format-select">
                                <option value="14px">小</option>
                                <option value="15px" selected>标准</option>
                                <option value="17px">大</option>
                                <option value="19px">超大</option>
                            </select>
                        </div>

                        <!-- 编辑区 -->
                        <div id="editorScrollContainer" class="editor-content">
                            <div class="editor-inner">
                                <div id="editorArea" contenteditable="true">
                                    <div class="chapter-title" id="editorTitle">选择一个章节开始写作</div>
                                    <p id="editorPlaceholder" style="color:var(--text-muted); text-indent:0;">在左侧章节列表中选择一个章节，或创建新章节</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 拖拽手柄 -->
                <div class="col-resizer" data-resize="right"></div>

                <!-- 右栏：AI 对话 -->
                <div id="writeColRight" class="col-right">
                    <div class="chat-panel">
                        <!-- 顶部 -->
                        <div class="chat-topbar">
                            <div class="model-select" id="chatTopbarModelSelect" onclick="toggleChatModelDropdown()">
                                <span id="chatTopbarModelName">默认模型</span>
                                <span class="arrow">▼</span>
                            </div>
                            <div class="chat-tabs">
                                <button class="chat-tab active" data-tab="chat" onclick="switchChatTab('chat')">对话</button>
                                <button class="chat-tab" data-tab="continue" onclick="switchChatTab('continue')">续写</button>
                                <button class="chat-tab" data-tab="polish" onclick="switchChatTab('polish')">润色</button>
                                <button class="chat-tab" data-tab="check" onclick="switchChatTab('check')">审校</button>
                            </div>
                        </div>

                        <!-- 对话区 -->
                        <div id="aiChatDialogBody" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                            <div id="aiChatMessages" class="chat-messages"></div>

                            <!-- Agent 高频入口 -->
                            <div class="agent-entry-bar" id="agentEntryBar">
                                <span class="agent-entry-label">快捷任务</span>
                                <button class="agent-entry-btn" data-agent-query="帮我写一章正文，延续当前剧情" title="AI 分析上下文后自动续写一章">
                                    ✍️ 写一章
                                </button>
                                <button class="agent-entry-btn" data-action="review" title="AI 对当前章节进行全面审稿">
                                    🔍 审稿全文
                                </button>
                                <button class="agent-entry-btn" data-agent-query="参考当前热门爆款作品，给我写一篇同风格短篇" title="AI 研究爆款后模仿创作">
                                    🎯 参考爆款创作
                                </button>
                            </div>

                            <!-- 输入区 -->
                            <div class="chat-input-area">
                                <div class="chat-composer">
                                    <textarea id="aiChatInput" class="chat-composer-input" rows="3" placeholder="输入写作指令，可用 @ 引用正文、角色或大纲..."></textarea>
                                    <button class="chat-composer-send" id="aiChatSend">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    </button>
                                </div>
                                <div class="chat-composer-toolbar">
                                    <div class="chat-composer-left">
                                        <button class="composer-pill" onclick="showToast('上传功能开发中','info')">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                            上传
                                        </button>
                                        <button class="composer-pill" id="chatRefBtn">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                            @引用
                                        </button>
                                    </div>
                                    <div class="chat-composer-right">
                                        <button class="composer-pill composer-pill-mode" id="agentModeBtn" onclick="toggleAgentMode()">手动</button>
                                    </div>
                                </div>
                                <div class="chat-composer-hint">
                                    <span id="agentModeHint">复杂任务交给协作助手，预计 3-10 分钟完成</span>
                                    <span>·</span>
                                    <span>Enter 发送 · Shift+Enter 换行</span>
                                </div>
                                <div id="chatInputResizeHandle" style="display:none;"></div>
                            </div>
                        </div>
                    </div>
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
