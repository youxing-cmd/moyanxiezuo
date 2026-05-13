    pages.inspiration = () => `
        <div class="page-section" id="inspirationPage">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">灵感库</div>
                    <div style="font-size:13px; color:var(--text-muted);">收集、整理你的创作灵感，随时调取使用</div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <div class="search-box" style="width:240px; margin:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input type="text" id="inspSearchInput" placeholder="搜索灵感名称或内容..." oninput="debounceLoadInspirations()">
                    </div>
                    <button class="btn btn-ghost btn-sm" id="inspSelectionToggle" onclick="toggleInspSelectionMode()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        多选模式
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showCreateInspirationModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        新建灵感
                    </button>
                </div>
            </div>

            <div class="tabs" style="margin-bottom: 12px;" id="inspLengthTabs">
                <button class="tab active" data-length="long" onclick="switchInspirationLengthTab('long', this)">长篇</button>
                <button class="tab" data-length="short" onclick="switchInspirationLengthTab('short', this)">短篇</button>
            </div>

            <div class="tabs" style="margin-bottom: 20px;" id="inspTabs">
                <button class="tab active" data-filter="all" onclick="switchInspirationTab('all', this)">全部</button>
                <button class="tab" data-filter="ai" onclick="switchInspirationTab('ai', this)">AI 生成</button>
                <button class="tab" data-filter="trend" onclick="switchInspirationTab('trend', this)">热门榜单</button>
                <button class="tab" data-filter="custom" onclick="switchInspirationTab('custom', this)">自创</button>
                <button class="tab" data-filter="trash" onclick="switchInspirationTab('trash', this)" style="margin-left:auto; color:var(--text-muted);">回收站</button>
            </div>

            <div class="grid-3" id="inspirationList">
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>

            <div id="inspirationPagination" style="display:flex; justify-content:center; gap:6px; margin-top:20px;"></div>

            <div id="inspSelectionBar" style="display:none; position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:100; background:var(--bg-primary); border:1px solid var(--border); border-radius:12px; padding:12px 20px; box-shadow:0 4px 20px rgba(0,0,0,0.3); align-items:center; gap:16px; max-width:90%; flex-wrap:wrap;">
                <span id="inspSelectionCount" style="font-size:14px; color:var(--text-primary); white-space:nowrap;">已选择 0 个灵感</span>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" onclick="clearInspSelection()">取消选择</button>
                    <button class="btn btn-primary btn-sm" id="inspFuseBtn" onclick="fuseInspirationsWithAI()" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        AI 热梗融合
                    </button>
                </div>
            </div>
        </div>
    `
