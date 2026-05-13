    pages.workDetail = () => `
        <div class="page-section" style="max-width:760px; margin:0 auto;">
            <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:24px;">
                <div style="margin-bottom:20px;">
                    <span id="workDetailModeLabel" style="display:inline-block; padding:3px 10px; border-radius:12px; background:var(--bg-tertiary); color:var(--text-muted); font-size:11px;">新建作品</span>
                </div>
                <div class="form-group">
                    <label class="form-label">作品名称 <span style="color:var(--danger);">*</span></label>
                    <input type="text" class="form-input" id="wdTitle" maxlength="200" placeholder="给你的作品起个名字" />
                </div>
                <div class="form-group">
                    <label class="form-label">作品类型 <span style="color:var(--danger);">*</span></label>
                    <div id="wdLengthType" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdLengthType" value="long" checked /> 长篇</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdLengthType" value="short" /> 短篇</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">作品视角 <span style="color:var(--danger);">*</span></label>
                    <div id="wdPerspective" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdPerspective" value="first" /> 第一人称</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdPerspective" value="third" checked /> 第三人称</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">频道 <span style="color:var(--danger);">*</span></label>
                    <div id="wdChannel" style="display:flex; gap:10px;">
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdChannel" value="male" checked /> 男频</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdChannel" value="female" /> 女频</label>
                        <label style="display:flex; align-items:center; gap:6px; padding:6px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;"><input type="radio" name="wdChannel" value="all" /> 全频</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">标签 <span style="font-size:11px; color:var(--text-muted);">（按频道动态展示，最多选 2 个）</span></label>
                    <div id="wdTags" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">作品简介 <span style="font-size:11px; color:var(--text-muted);">（非必填）</span></label>
                    <textarea class="form-input" id="wdIntro" rows="4" maxlength="500" placeholder="一句话或一段话介绍你的作品..." style="resize:vertical;"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">作品灵感 <span style="font-size:11px; color:var(--text-muted);">（非必填）</span></label>
                    <textarea class="form-input" id="wdInspiration" rows="4" maxlength="2000" placeholder="记录你的创作灵感、核心梗、人设想法..." style="resize:vertical;"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">作品封面</label>
                    <div id="wdCoverPreview" style="width:120px; height:160px; border-radius:var(--radius-sm); background:linear-gradient(135deg, #1e3a5f, #0f2744); display:flex; align-items:center; justify-content:center; font-size:48px;">📖</div>
                    <span style="font-size:11px; color:var(--text-muted); margin-top:6px; display:inline-block;">第一期使用默认封面</span>
                </div>
                <div class="form-actions" style="margin-top:24px;">
                    <button class="btn btn-ghost" onclick="cancelWorkDetail()">取消</button>
                    <button class="btn btn-primary" onclick="saveWorkDetail()">保存</button>
                </div>
            </div>
        </div>
    `
