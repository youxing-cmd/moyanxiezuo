    pages.trends = () => `
        <div class="page-section" id="trendsPage">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; flex-wrap:wrap; gap:10px;">
                <div class="tabs" id="trendsLengthTabs" style="margin:0; flex-wrap:wrap;">
                    <button class="tab active" data-length="long" onclick="switchTrendsLength('long', this)">长篇</button>
                    <button class="tab" data-length="short" onclick="switchTrendsLength('short', this)">短篇</button>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap:wrap; gap:10px;">
                <div class="tabs" id="trendsMainTabs" style="margin:0; flex-wrap:wrap;">
                    <button class="tab active" data-cat="platform" onclick="switchTrendsTab('platform', this)">平台热搜</button>
                    <button class="tab" data-cat="maleHot" onclick="switchTrendsTab('maleHot', this)">男频热度</button>
                    <button class="tab" data-cat="maleNew" onclick="switchTrendsTab('maleNew', this)">男频新书</button>
                    <button class="tab" data-cat="femaleHot" onclick="switchTrendsTab('femaleHot', this)">女频热度</button>
                    <button class="tab" data-cat="femaleNew" onclick="switchTrendsTab('femaleNew', this)">女频新书</button>
                    <button class="tab" data-cat="jiuzhou" onclick="switchTrendsTab('jiuzhou', this)">九州榜单</button>
                </div>
                <div class="search-box" style="width:220px; margin:0;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted); flex-shrink:0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input type="text" id="trendsSearchInput" placeholder="搜索榜单..." oninput="debounceLoadTrends()">
                </div>
            </div>

            <!-- 日期选择栏：所有分类通用 -->
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:6px; padding:4px 10px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <select id="trendsDateSelect" onchange="onTrendsDateChange(this.value)" style="border:none; background:transparent; color:var(--text-secondary); font-size:13px; outline:none; cursor:pointer;">
                        <option value="0">今天</option>
                        <option value="1">昨天</option>
                        <option value="2">2天前</option>
                        <option value="3">3天前</option>
                        <option value="4">4天前</option>
                        <option value="5">5天前</option>
                        <option value="6">6天前</option>
                    </select>
                </div>
                <!-- 历史日期快捷切换 -->
                <div id="trendsHistoryDates" style="display:flex; gap:4px; flex-wrap:wrap;"></div>
                <span id="trendsCurrentDateLabel" style="font-size:12px; color:var(--text-muted); margin-left:auto;"></span>
            </div>

            <div id="trendsPlatformBar" style="display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
                <div class="tabs" style="margin:0;" id="trendsPlatformTabs">
                    <button class="tab active" data-platform="douyin" onclick="switchTrendsPlatform('douyin', this)">抖音</button>
                    <button class="tab" data-platform="weibo" onclick="switchTrendsPlatform('weibo', this)">微博</button>
                    <button class="tab" data-platform="toutiao" onclick="switchTrendsPlatform('toutiao', this)">今日头条</button>
                    <button class="tab" data-platform="baidu" onclick="switchTrendsPlatform('baidu', this)">百度</button>
                    <button class="tab" data-platform="bilibili" onclick="switchTrendsPlatform('bilibili', this)">B站</button>
                </div>
            </div>

            <div id="trendsSourceTag" style="margin-bottom:12px;"></div>

            <div id="trendsWindVane" style="margin-bottom:16px; display:none;"></div>

            <div id="trendsHotInsp" style="margin-bottom:16px; display:none;"></div>

            <div id="trendsBookAnalysis" style="margin-bottom:16px; display:none;"></div>

            <div id="trendsContent">
                <div style="text-align:center; padding:60px; color:var(--text-muted);">加载中...</div>
            </div>
        </div>
    `
