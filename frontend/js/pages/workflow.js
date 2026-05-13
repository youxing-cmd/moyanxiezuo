    pages.workflow = () => `
        <div class="page-section">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
                <div>
                    <div style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">工作流编排</div>
                    <div style="font-size:13px; color:var(--text-tertiary);">按写作顺序组合 AI 工具，一键完成复杂创作任务</div>
                </div>
                <button class="btn btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    新建工作流
                </button>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">玄幻开篇工作流</div>
                            <div class="card-subtitle">3 个节点 · 最后使用 2 天前</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">编辑</button>
                            <button class="btn btn-primary btn-sm">运行</button>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">1</div>
                        <div class="workflow-content">
                            <div class="workflow-title">世界观设定生成</div>
                            <div class="workflow-desc">输入核心创意，生成完整的世界观框架</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">2</div>
                        <div class="workflow-content">
                            <div class="workflow-title">主角人设生成</div>
                            <div class="workflow-desc">基于世界观，设计主角成长路线和性格特点</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">3</div>
                        <div class="workflow-content">
                            <div class="workflow-title">开篇三章生成</div>
                            <div class="workflow-desc">生成黄金三章，包含钩子、冲突、期待感</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">战斗场景工作流</div>
                            <div class="card-subtitle">4 个节点 · 最后使用 5 天前</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">编辑</button>
                            <button class="btn btn-primary btn-sm">运行</button>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">1</div>
                        <div class="workflow-content">
                            <div class="workflow-title">战斗起因设定</div>
                            <div class="workflow-desc">明确战斗双方、冲突原因、赌注</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">2</div>
                        <div class="workflow-content">
                            <div class="workflow-title">招式描写生成</div>
                            <div class="workflow-desc">生成华丽的招式名称和视觉效果描写</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">3</div>
                        <div class="workflow-content">
                            <div class="workflow-title">战斗节奏设计</div>
                            <div class="workflow-desc">设计战斗起伏：压制→反击→高潮</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">4</div>
                        <div class="workflow-content">
                            <div class="workflow-title">战后收获描写</div>
                            <div class="workflow-desc">描写战利品、感悟、角色成长</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">情感爆发工作流</div>
                            <div class="card-subtitle">3 个节点 · 从未使用</div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-ghost btn-sm">编辑</button>
                            <button class="btn btn-primary btn-sm">运行</button>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">1</div>
                        <div class="workflow-content">
                            <div class="workflow-title">情感铺垫生成</div>
                            <div class="workflow-desc">生成细腻的情感积累和暗示</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">2</div>
                        <div class="workflow-content">
                            <div class="workflow-title">冲突爆发设计</div>
                            <div class="workflow-desc">设计情感爆发的触发点和表达方式</div>
                        </div>
                    </div>
                    <div class="workflow-node">
                        <div class="workflow-num">3</div>
                        <div class="workflow-content">
                            <div class="workflow-title">余韵描写</div>
                            <div class="workflow-desc">描写情感爆发后的余波和角色变化</div>
                        </div>
                    </div>
                </div>

                <div class="card" style="border-style: dashed; border-color: var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; min-height: 300px;"
                     onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--text-muted)'">
                    <div style="text-align:center; color:var(--text-muted);">
                        <div style="font-size:36px; margin-bottom:12px;">+</div>
                        <div style="font-size:15px; font-weight:500;">创建新工作流</div>
                        <div style="font-size:12px; margin-top:6px;">组合多个 AI 工具形成创作流水线</div>
                    </div>
                </div>
            </div>
        </div>
    `
