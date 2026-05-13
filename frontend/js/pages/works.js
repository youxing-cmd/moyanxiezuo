    pages.works = () => `
        <div class="page-section">
            <div class="tabs" id="worksPageTabs">
                <button class="tab active" data-view="works" onclick="switchWorksView('works', this)">全部作品</button>
                <button class="tab" data-view="serial" onclick="switchWorksView('serial', this)">连载中</button>
                <button class="tab" data-view="finished" onclick="switchWorksView('finished', this)">已完结</button>
                <button class="tab" data-view="draft" onclick="switchWorksView('draft', this)">草稿箱</button>
                <button class="tab" data-view="analysis" onclick="switchWorksView('analysis', this)">拆书</button>
                <button class="tab" data-view="trash" onclick="switchWorksView('trash', this)" style="margin-left:auto; color:var(--text-muted);">回收站</button>
            </div>

            <div id="worksNormalToolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div class="search-box" style="width: 320px; margin:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input type="text" id="worksSearchInput" placeholder="搜索作品名称..." oninput="debounceSearchWorks(this.value)">
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" onclick="openImportWorkDialog()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        导入
                    </button>
                    <button class="btn btn-ghost btn-sm" style="color: var(--warning);" onclick="openBookAnalysisDialog()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="10" y1="8" x2="16" y2="8"/><line x1="10" y1="12" x2="16" y2="12"/>
                        </svg>
                        拆书
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="showCreateWorkModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        新建作品
                    </button>
                </div>
            </div>

            <div id="worksTrashToolbar" style="display:none; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <div style="font-size:14px; font-weight:600; color:var(--text-primary);">回收站</div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-ghost btn-sm" onclick="batchRestoreWorks()">↩ 恢复选中</button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="batchDeleteWorks()">🗑 彻底删除选中</button>
                    <button class="btn btn-primary btn-sm" style="background:var(--danger);" onclick="clearAllTrash()">清空回收站</button>
                </div>
            </div>

            <div class="grid-3" id="worksGrid">
                <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>
        </div>
    `
