# 九章 V3 — 写作 Agent 工作流系统

## Context

九章 V2 已具备 4 层记忆 + L3 路由 + 13 个工具的「上下文注入式 RAG」架构，但本质仍是"AI 一次性输出"。用户给"参考 xx 写一篇短篇爆款"这种模糊指令时，Agent 不会主动拆解任务、阅读资料、规划步骤、自我反思——这导致：

1. **规划缺失**：用户看不到 Agent 的思考结构，体验是黑盒
2. **执行扁平**：单轮 LLM call，没有 read→think→produce→reflect 的循环
3. **产物零散**：生成结果只在对话框流式输出，不自动落到工作树
4. **状态短暂**：关掉浏览器一切丢失，无法长周期工作
5. **外部知识断流**：「参考 xx」只能靠用户粘贴，Agent 不会主动研究

V3 的目标是把九章从「AI 写作工具」升级为「AI 写作 Agent」，达到 Cursor Composer / Devin 在写作领域的对等体验。

## 当前实现状态（避免重复开发）

> 本节记录当前代码已经落地的范围，以及仍需修复/补齐的部分。后续开发以本节为准，避免重复重写已有模块。

| 阶段 | 当前状态 | 已落地内容 | 不要重复做 | 仍需补齐 |
|------|----------|------------|------------|----------|
| P1 数据库与基础设施 | 🟡 基础已落地 | `agent_jobs` / `agent_plan_steps` / `agent_step_events` / `agent_plan_templates` schema 已有；`agent-jobs` 路由已接入；`pg-boss` worker 已注册；SSE 状态流已实现 | 不要重新设计 4 张表和基础 CRUD API | 补迁移文件；修 worker 状态覆盖；补严格并发/用户级任务数限制 |
| P2 Planner | 🟡 基础已落地 | `planner.ts` 已能调用 planner 模型、解析 JSON、做 Zod 校验和 DAG 无环检查 | 不要重写 planner 主入口 | 补业务规则校验：必须包含 `self_review`；参考作品任务必须包含 `web_research`；补 plan fallback |
| P3 Executor + 反思 | 🟡 基础已落地 | `agentExecutor.ts` 已支持 9 类 task；`reflector.ts` 有确定性规则 + LLM 反思；支持 `waiting` / pause / abort / skip / redo 的基础状态 | 不要重写 executor 骨架 | 修 failed 误判 done；修 `self_review` 误判；修 `create_artifact` 空内容；补 `user_blocked` 状态 |
| P4 Composer UI | 🟡 半实现 | `composer.js` / `agent-job-poller.js` 已引入；`interactions-core.js` 已有复杂任务检测和 Plan 卡片创建 | 不要另起一套 Plan 卡片组件 | 修 API_BASE/token/SSE 切换；补步骤输出展开、编辑 plan、跳过/重做、多任务列表 |
| P5 firecrawl + 新工具 | 🟡 半实现 | `firecrawl.ts` 已接 search/scrape；`tools.ts` 已注册 `web_search` / `web_research` / `generate_hook` / `tighten_pacing` / `boost_payoff` / `check_consistency` | 不要重复注册同名工具 | 前端 `BACKEND_TOOLS` 补白名单；补来源摘要、URL 过滤、credit 日志、无 key 降级策略 |
| P6 模板 + 偏好学习 | ❌ 未开始 | `agent_plan_templates` 表已存在 | 不要再新建同名表 | 补模板保存、相似任务匹配、用户偏好聚合、Planner 偏好注入 |

## 已知 Bug / 技术债（P0 已修复，commit `3de9287`）

| 问题 | 当前状态 | 影响 | 修复方式 |
|------|----------|------|----------|
| 前端 TDZ：`const API_BASE = typeof API_BASE !== 'undefined' ? API_BASE : ...` | ✅ 已修复 | `agent-job-poller.js` 加载即可能 `ReferenceError`；`composer.js` 点击操作时可能报错 | 改为 `const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api'`，避免同名 const 自引用 |
| Agent 鉴权 token key 错误 | ✅ 已修复 | app 存 `jz_token`，但 composer/poller 读 `authToken`，导致开始执行、SSE、暂停/中止 401 | 统一读 `localStorage.getItem('jz_token')`（与 state.js 一致） |
| SSE/轮询切换失效 | ✅ 已修复 | 页面隐藏/显示后订阅可能停止，后台轮询兜底不可用 | `sub.stop` 只清理资源（清除 timer 或设置 `sseAbort`），不设置 `sub.abort`；最终 unsubscribe 才 abort |
| 新后端工具未进前端 `BACKEND_TOOLS` | ✅ 已修复 | 模型调用 P5 新工具时被当成前端工具，返回“未实现” | `interactions-core.js` 补全 `web_search`/`web_research`/`generate_hook`/`tighten_pacing`/`boost_payoff`/`check_consistency` |
| Executor 把 `failed` 算作 `allDone` | ✅ 已修复 | 最后一个 step 失败时 job 可能被误标为 done | `allDone` 只接受 `done/skipped`；有 failed 则 job 进入 failed |
| Worker 无条件把 job 改成 running | ✅ 已修复 | 用户暂停/中止后，队列任务可能把状态复活 | worker 执行前重新读取 job，只允许 `planning/paused/waiting` 的任务进入 running |
| `create_artifact` 可能创建空内容 | ✅ 已修复 | Agent 完成后 artifact 没有正文/大纲内容 | 若 `step.input.content` 为空，从依赖步骤 `output.content` 自动提取 |
| `self_review` 判断误匹配 | ✅ 已修复 | “不通过”也包含“通过”，可能被误判为通过 | `content.includes('通过') && !content.includes('不通过')` |
| Planner 业务规则未强校验 | ✅ 已修复 | 计划可能缺少自检或参考研究步骤 | `validatePlan(plan, query?)` 增加 query-aware 规则：必含 `self_review`、参考作品必含 `web_research` |
| 缺少数据库迁移文件 | ✅ 已补 | 部署/回滚/多人协作不稳 | `drizzle-kit generate` 生成 `drizzle/0000_flowery_sharon_carter.sql` |

## 剩余建议优化（P1）

1. **简单任务免 user_input**：起标题/起名字等短任务，planner 应直接输出结果，不要暂停等用户选择
2. **self_review 维度按任务类型定制**：写正文评情节，起标题评吸引力，不要一套维度打天下
3. **firecrawl URL 过滤**：过滤首页、目录页等低信息密度页面
4. **Plan schema 输入设计**：step 的 input 字段目前 Planner 基本不填，需要明确 input/output/artifactSource/dependsOn 传递语义
5. **任务状态语义统一**：建议固定为 `planning / ready / running / waiting / paused / user_blocked / failed / done / aborted`

**用户决策已锁定**：
- 架构形态：**异步型**（Plan 持久化 + 后台 worker 执行 + 前端轮询/SSE 刷新）
- 外部知识：**接入 firecrawl**（网络搜索/scrape/deep-research）
- 工具能力：**新增一批写作领域专用工具**

**理想态用户体验**：

```
用户输入：参考《xx》写一篇 3000 字短篇爆款

[Plan 卡片立即出现]
□ 1. 理解参考作品          [自动 / 用户可改]
  └ search《xx》核心爽点
  └ scrape 前 3 篇深度评论
□ 2. 对齐当前作品
  └ 读总纲 + 角色 + 风格 DNA
□ 3. 创意构思
  └ 生成 3 个题材方向
  └ 等待用户选择
□ 4. 写作执行（5 子步）
□ 5. 整体优化（3 子步）
□ 6. 交付（标题/简介/落 artifact）

[开始执行] [编辑] [让 Agent 重新规划]
↓
[执行中：每步实时状态]
✓ 1.1 search 完成 → 3 篇结果
✓ 1.2 scrape 完成 → 12k 字材料
⟳ 2.1 读取风格 DNA...
□ 2.2 等待中
...

[全程可暂停/中止/插话纠正/关浏览器]
[回来继续看进度]
```

---

## 产品化目标补充：从 Agent Runtime 到写作 Agent Product

当前技术路线能做出“会规划、会执行、会反思的 Agent Runtime”。但九章的目标不是让用户看见一个任务调度器，而是让作者得到一个可信赖的“编辑搭子”：它知道什么时候轻量回答、什么时候拆任务、什么时候让用户选择、什么时候把结果落回章节/草稿/设定/灵感库。

### 体验分层

| 层级 | 适用场景 | UI 形态 | 不该做什么 |
|------|----------|---------|------------|
| 轻量 AI | 起标题、问一句、润色选中段、解释设定 | 普通聊天气泡或小浮层 | 不展示复杂 Plan，不启动长任务 |
| Agent 任务卡 | 写一章、审稿全文、参考爆款创作、章纲转正文 | 3-6 个主步骤的 Plan 卡片 | 不暴露 `web_research` / `create_artifact` 等技术名 |
| 工作流面板 | 多轮创作、需要用户选择、长时间运行、多产物并行 | 任务列表 + 当前任务详情 + 产物区 | 不把事件日志当主界面 |

### 用户可理解的步骤命名

| 技术 task type | 用户看到的文案 |
|----------------|----------------|
| `read_context` | 读取作品设定 |
| `web_research` | 研究参考作品 |
| `generate_ideas` | 生成创作方向 |
| `user_input` | 等你选择 |
| `draft_outline` | 生成大纲 |
| `write_chunk` | 写正文草稿 |
| `self_review` | 编辑自检 |
| `polish` | 优化文风 |
| `create_artifact` | 保存产物 |

### 交付闭环

Agent 完成时不能只显示“任务完成”。必须根据产物类型给出明确操作：

| 产物类型 | 默认主操作 | 次级操作 |
|----------|------------|----------|
| 正文草稿 | 采纳为新章节 | 插入当前章节 / 保存草稿 / 查看差异 |
| 大纲 | 更新总纲 | 保存为版本 / 另存为灵感 |
| 审稿报告 | 定位问题 | 逐条采纳修改 / 生成改稿方案 |
| 角色/设定 | 更新设定库 | 保存为备选 / 对比旧设定 |
| 灵感/选题 | 保存灵感库 | 扩写为作品 / 生成标题简介 |

### 产品化补充开发计划

下面这套计划是在原 P1-P6 技术分期之上补充的产品路线。执行时先完成 Product P0，再继续原技术 P6。

#### Product P0：稳定性与可信闭环（优先级最高）

目标：让用户能稳定完成一次复杂写作任务，并得到可采纳产物。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 修复 P0 bug 表中的前后端问题 | ✅ 已完成 | Agent 任务从创建到完成不报前端运行时错误；失败不会误报完成 |
| 增加 mock E2E | ✅ 已完成 | `test-agent-mock.ts` + `src/test/mocks/` 覆盖完整链路，5 断言全通过 |
| 明确任务状态机 | ✅ 已完成 | UI 和后端统一 `planning/ready/running/waiting/paused/user_blocked/failed/done/aborted` |
| 完成后出现交付动作 | ✅ 已完成 | 正文类任务完成后显示交付面板：采纳为新章节 / 保存草稿 / 复制内容 |
| 刷新恢复任务 | ✅ 已完成 | 写作页加载时自动恢复当前作品 active jobs，渲染 Plan 卡片并启动订阅 |

#### Product P1：Agent 入口策略

目标：用户知道什么时候该用 Agent，什么时候该用普通 AI。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 复杂任务识别提示 | ✅ 已完成 | detectComposerIntent 检测复杂指令；isSimpleTask 排除起标题/短润色/问答 |
| 官方高频入口 | ✅ 已完成 | 写作页 AI 对话框下方新增 agent-entry-bar：写一章 / 审稿全文 / 参考爆款创作 |
| 简单任务降级 | ✅ 已完成 | 起标题、取名字、润色这段、翻译、解释、问答等不走 Agent Plan，直接走普通 AI 聊天 |
| Agent 模式说明弱化 | ✅ 已完成 | hint 改为”复杂任务交给 Agent，预计 3-10 分钟完成”，不再展示”手动选择模型和工具” |

#### Product P2：Plan 卡片产品化

目标：Plan 像编辑工作安排，而不是工程日志。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 主步骤压缩 | ✅ 已完成 | 当前 Plan 无子步骤概念，默认展示的已是主步骤（5-11 步） |
| 步骤输出展开 | ✅ 已完成 | done/failed 步骤显示”展开”按钮，点击查看 output.content |
| 编辑计划 | ✅ 已完成 | ready 状态显示”编辑计划”，步骤标题变 input、可删除、保存调用 PUT /plan |
| 跳过/重做步骤 | ✅ 已完成 | pending/failed 显示”跳过”，done/failed/skipped 显示”重做”，前后端已接通 |
| user_input 交互化 | ✅ 已完成 | waiting 步骤下方显示交互区，解析选项显示按钮组，否则显示输入框 |

#### Product P3：产物落地与版本管理

目标：Agent 生成的内容能进入真实写作工作流。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 产物类型规范 | 已完成 | 明确 chapter_draft / outline / review_report / setting / inspiration 等类型 |
| 采纳为章节 | 已完成 | 正文产物可直接创建章节或覆盖当前章节草稿 |
| 差异对比 | 已完成 | 改稿/审稿结果支持原文 vs 建议稿对比 |
| 版本记录 | 已完成 | 采纳前自动保存 chapter version，支持回滚 |
| artifact 与作品树联动 | 已完成 | artifact 可链接到章节/总纲/角色/设定实体 |

#### Product P4：编辑工作台

目标：从“生成内容”升级成“帮用户改好内容”。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 主编审稿报告 | 待开始 | 输出剧情、人物、节奏、爽点、设定、文风六类问题 |
| 问题定位 | 待开始 | 每个问题能定位到原文片段 |
| 逐条修改建议 | 待开始 | 用户可逐条采纳、忽略、重写建议 |
| 复核流程 | 待开始 | 修改后可重新审稿，并展示问题减少情况 |
| 官方编辑方案 | 待开始 | 内置 3-5 个方案：短篇爆款、男频爽点、女频情感线、设定一致性、新手改稿 |

#### Product P5：外部研究可信化

目标：让用户相信“参考 xx”的研究不是乱编。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 来源展示 | 待开始 | 研究步骤显示来源标题、URL、抓取摘要 |
| 事实/推断区分 | 待开始 | 报告中区分“资料依据”和“创作推断” |
| Firecrawl 无 key 降级 | 待开始 | 未配置 key 时明确提示降级，不假装已联网 |
| URL 质量过滤 | 待开始 | 过滤首页、目录、广告页、低内容页 |
| 资料缓存 | 待开始 | 同一 query 短期复用搜索结果，降低 credit 消耗 |

#### Product P6：模板与偏好学习

目标：让 Agent 越用越懂用户。

| 任务 | 状态 | 验收标准 |
|------|------|----------|
| 官方 Plan 模板 | 待开始 | 内置“写一章/审稿/参考爆款/章纲转正文/标题简介包装”模板 |
| 保存为我的流程 | 待开始 | 完成 job 后可保存为个人模板 |
| 相似任务匹配 | 待开始 | 下次相似 query 优先推荐历史模板 |
| 偏好聚合 | 待开始 | 聚合用户常跳过步骤、常采纳类型、常拒绝表达 |
| Planner 注入偏好 | 待开始 | 生成 plan 时考虑用户偏好，但允许用户手动覆盖 |

### 推荐执行顺序

1. 先修 **P0 bug**，让 Agent 能稳定跑通一次完整任务
2. 做 **3 个官方高频任务**：写一章、审稿全文、参考爆款创作
3. 打通 **结果采纳**：章节、草稿、artifact、版本记录
4. 优化 **Plan UI**：少技术、多编辑语言、可展开产物
5. 做 **Firecrawl 可信研究**：来源、摘要、降级、缓存
6. 最后做 **模板和偏好学习**

---

## 架构总览

```
┌─────────────────────────────────────────────────────┐
│  Frontend (writing.js + 新 Composer UI)              │
│  ├─ Plan 卡片渲染（基于现有 step-card 升级）           │
│  ├─ 实时状态轮询（轻量长轮询，10s 间隔）              │
│  └─ 暂停/中止/插话/编辑步骤交互                       │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
   POST /plan            GET /agent-jobs/:id  ← 轮询
   POST /jobs            POST /agent-jobs/:id/control  ← 暂停/中止
   ┌────────────────────────────────────────────────┐
   │  Backend Agent Runtime                          │
   │                                                  │
   │  Planner (LLM)                                  │
   │    └─ 模糊指令 → task DAG（含依赖、预算、自检）   │
   │                                                  │
   │  Executor Worker (后台进程，setInterval 轮询)    │
   │    └─ pg FOR UPDATE SKIP LOCKED 取 pending job  │
   │    └─ 按 task DAG 顺序执行                       │
   │    └─ 每步：取数 → LLM call → 反思 → 落库         │
   │                                                  │
   │  Reflector (LLM)                                │
   │    └─ 每个产出 step 完成后自检                    │
   │    └─ 不通过 → 自动重试 / 升级到用户              │
   │                                                  │
   │  Tool Layer                                      │
   │    ├─ 现有 13 个                                 │
   │    ├─ 新增 4 个写作语义工具                       │
   │    └─ 新增 2 个 firecrawl 工具                   │
   └────────────────────────────────────────────────┘
                   │
                   ↓
   ┌────────────────────────────────────────────────┐
   │  PostgreSQL（Neon/pg）                          │
   │  新增表：                                        │
   │    ├─ agent_jobs           (整体任务)            │
   │    ├─ agent_plan_steps     (DAG 节点)           │
   │    ├─ agent_step_events    (审计日志)           │
   │    └─ agent_plan_templates (沉淀模板)            │
   │                                                  │
   │  复用：aiArtifacts / agentRoutes / 4 层记忆      │
   └────────────────────────────────────────────────┘
```

---

## 阶段划分（6 个阶段，每阶段独立可用）

```
P1 数据库与基础设施     →  存得下
P2 Planner             →  规划得出
P3 Executor + 反思     →  执行得动
P4 Plan UI             →  看得见
P5 firecrawl + 新工具  →  做得深
P6 模板 + 偏好学习     →  长得快
```

每个阶段都可单独 ship 验证。下面是各阶段的具体实施。

---

## P1：数据库与异步执行基础设施

### P1.1 新增 4 张表

| 表 | 字段 | 用途 |
|----|------|------|
| `agent_jobs` | id, userId, workId, query, status(planning/running/paused/waiting/done/failed/aborted), planId, progress, errorMsg, createdAt, updatedAt, finishedAt | 整体任务实例 |
| `agent_plan_steps` | id, jobId, parentId(支持嵌套), idx, taskType, title, description, status(pending/running/done/skipped/failed), dependsOn(JSON), input(JSON), output(JSON), artifactId(可选), reflectionResult, retryCount, startedAt, finishedAt | DAG 单个节点 |
| `agent_step_events` | id, jobId, stepId, type(start/log/tool_call/llm_call/output/reflection/error), payload(JSON), createdAt | 审计/调试事件流 |
| `agent_plan_templates` | id, userId, name, description, query, plan(JSON), useCount, createdAt | 成功 plan 沉淀为模板 |

### P1.2 后台 Worker 系统

**方案**：基于现有 `backend/src/jobs/scheduler.ts` 扩展，引入 `pg-boss`（轻量、PG 原生、零外部依赖）。

- 安装：`npm install pg-boss` （已确认 backend package.json 仅有 node-cron，无 Redis）
- 新建 `backend/src/jobs/agentWorker.ts`：
  - 启动时注册 worker：`boss.work('agent-job', { teamSize: 2 }, runAgentJob)`
  - `runAgentJob(job)` 读取 agent_jobs 当前状态，按 DAG 推进
  - 失败自动重试（pg-boss 内置），3 次失败转 user-blocked
- 改 `backend/src/index.ts` 启动时调用 `initAgentWorker()`

### P1.3 SSE 自定义事件包装层

当前 `streamResponse` 直接透传上游 SSE，无法注入 plan 进度。新建：

- `backend/src/services/sseWrapper.ts`：导出 `wrapSSE(upstream, eventHandlers)`，返回 ReadableStream（**已创建但暂未实际接入 Agent Job 流**）
- 支持自定义事件：`event: plan_update`、`event: step_start`、`event: step_done`、`event: artifact_created`
- 前端 `consumeSSEStream` 扩展回调：`onPlanUpdate / onStepUpdate / onArtifactCreated`

### P1.4 关键 API

```
POST   /api/ai/agent-jobs           创建 job（仅 planning，不立即执行）
POST   /api/ai/agent-jobs/:id/start 开始执行
POST   /api/ai/agent-jobs/:id/pause 暂停
POST   /api/ai/agent-jobs/:id/abort 中止
POST   /api/ai/agent-jobs/:id/inject 用户中途插话（注入新消息）
PUT    /api/ai/agent-jobs/:id/plan  用户编辑 plan
GET    /api/ai/agent-jobs/:id       获取整体状态（含 steps + events）
GET    /api/ai/agent-jobs/:id/stream SSE 长连接（实时进度）
GET    /api/ai/agent-jobs           列出当前用户的 active jobs（用于多 plan 并行）
```

---

## P2：Planner（任务规划器）

### P2.1 核心服务 `backend/src/services/planner.ts`

```ts
export async function planJob(query: string, ctx: PlanContext): Promise<PlanResult>
```

**输入**：用户指令 + workId（注入作品上下文）  
**输出**：task DAG（JSON）

**Prompt 设计**（强 schema 约束）：

```
你是九章写作 Agent 的任务规划器。把用户的模糊指令拆成可执行的 task DAG。

【规则】
1. 每个 task 必须能映射到一个或多个工具/LLM call
2. 必须包含至少 1 个反思步骤
3. 涉及"参考 xx"必须包含 search 步骤
4. 必须明确依赖（什么先什么后）
5. 估算总 token / 时间 / 调用次数预算

【可用 task 类型】
- read_context: 取作品已有数据
- web_research: firecrawl search/scrape（参考作品）
- generate_ideas: LLM 头脑风暴
- user_input: 等待用户选择
- draft_outline: 生成大纲
- write_chunk: 生成正文段
- self_review: 反思自检
- polish: 优化
- create_artifact: 落到工作树

【输出 JSON】
{
  "title": "本次任务概述",
  "estimatedDuration": "5 分钟",
  "estimatedCost": "约 8 次 LLM 调用 + 3 次 firecrawl",
  "steps": [
    {"id": "1", "type": "read_context", "title": "读取作品上下文", ...},
    {"id": "2", "type": "web_research", "title": "研究《xx》", "dependsOn": []},
    {"id": "3", "type": "generate_ideas", "title": "生成 3 个题材方向", "dependsOn": ["1", "2"]},
    ...
  ]
}
```

### P2.2 模型选择

- Planner 用 **gemini-2.5-pro**（长上下文、planning 强）
- 不复用 L3 路由模型（gemini-2.5-flash）：planning 需要更深推理

### P2.3 Plan 验证

- Schema 校验（Zod）
- 检查 DAG 无环
- 每个 task type 必须在已知枚举内
- 每个 dependsOn 引用必须存在

---

## P3：Executor + Reflector

### P3.1 Executor 主循环 `backend/src/services/agentExecutor.ts`

```ts
export async function executeJob(jobId: number): Promise<void> {
  const job = await loadJob(jobId);
  while (job.status === 'running') {
    const next = await pickNextStep(job);
    if (!next) { markJobDone(); break; }
    await executeStep(next, job);
    await checkPaused(jobId);  // 用户暂停立即响应
  }
}

async function executeStep(step, job) {
  emitEvent(step, 'start');
  switch (step.taskType) {
    case 'read_context':    return runReadContext(step, job);
    case 'web_research':    return runWebResearch(step, job);
    case 'generate_ideas':  return runGenerateIdeas(step, job);
    case 'user_input':      return waitForUserInput(step, job);
    case 'draft_outline':   return runDraftOutline(step, job);
    case 'write_chunk':     return runWriteChunk(step, job);
    case 'self_review':     return runSelfReview(step, job);
    case 'polish':          return runPolish(step, job);
    case 'create_artifact': return runCreateArtifact(step, job);
  }
  await runReflection(step, job);  // 每步后自检
}
```

### P3.2 Reflector `backend/src/services/reflector.ts`

每个产出型 step 完成后调用：

```ts
export async function reflectStep(step, job): Promise<ReflectionResult> {
  const rules = REFLECTION_RULES[step.taskType];
  if (!rules) return { passed: true };
  
  // 规则态检查（快）：开头钩子是否在 200 字内、字数是否达标、关键元素是否覆盖
  for (const rule of rules.deterministic) {
    if (!rule.check(step.output)) {
      return { passed: false, reason: rule.message, suggestion: rule.fix };
    }
  }
  
  // LLM 反思（慢）：风格一致性、爽点密度、参考作品契合度
  if (rules.llmCheck) {
    const result = await callLLM([
      { role: 'system', content: rules.llmCheck.prompt },
      { role: 'user', content: step.output },
    ]);
    if (!result.passed) return { ...result, suggestion };
  }
  
  return { passed: true };
}
```

**反思动作矩阵**：

| 反思结果 | 自动处理 |
|---------|---------|
| passed | 标记 done，继续下一步 |
| failed + retryCount<3 | 自动重试，把反思结果作为额外 prompt 注入 |
| failed + retryCount>=3 | 升级到 user-blocked，UI 提示「Agent 卡住了，需要你的决定」 |

### P3.3 跨步状态传递

每个 step 的 `output` 字段持久化到数据库。下一步通过 `dependsOn` 显式声明依赖，Executor 从依赖步的 output 中取数据注入下一步 prompt。

---

## P4：前端 Composer UI

### P4.1 新增 UI 组件 `frontend/js/composer.js`

挂载位置：写作页右栏（`frontend/js/pages/writing.js` 第 209 行 `#aiChatDialogBody` 内）。

**UI 状态切换**：
- 用户输入指令 → 检测「模糊创作类」（前端正则简单判断 + 后端 planner 路由）
- 命中 → 隐藏普通气泡，显示 **Composer 卡片**
- 不命中 → 走现有 chat 流程

**Composer 卡片结构**（复用并升级现有 `.step-card`）：

```html
<div class="plan-card">
  <div class="plan-header">
    📋 计划：参考《xx》写一篇 3000 字短篇爆款
    <span class="plan-budget">预计 5 分钟 · 8 次 LLM · 3 次搜索</span>
    <button>编辑计划</button>
  </div>
  <div class="plan-steps">
    <div class="plan-step done">
      ✓ 1. 读取作品上下文 <span class="step-duration">2s</span>
    </div>
    <div class="plan-step running">
      ⟳ 2. 研究《xx》<span class="step-substeps">2/3 子步</span>
      <div class="plan-substeps">
        <div class="substep done">✓ search「xx 爆款」</div>
        <div class="substep done">✓ scrape 3 篇评论</div>
        <div class="substep running">⟳ 提取爆款元素</div>
      </div>
    </div>
    <div class="plan-step pending">○ 3. 生成 3 个题材方向</div>
    ...
  </div>
  <div class="plan-footer">
    <button>暂停</button>
    <button>中止</button>
    <input placeholder="对当前进度说点什么..." />
  </div>
</div>
```

### P4.2 实时刷新机制

两种方式并存：

1. **SSE 长连接**（页面在前台时）：`GET /api/ai/agent-jobs/:id/stream`，事件驱动渲染
2. **轮询兜底**（页面切到后台或 SSE 断开）：visibility change 检测，前台 SSE / 后台 30s 轮询

封装为 `subscribeAgentJob(jobId, onUpdate)`，UI 层只 care 增量更新。

### P4.3 用户操作

| 操作 | 调用 |
|------|------|
| 暂停 | POST `/api/ai/agent-jobs/:id/pause` |
| 中止 | POST `/api/ai/agent-jobs/:id/abort` |
| 编辑计划 | PUT `/api/ai/agent-jobs/:id/plan` 带新 JSON |
| 插话纠正 | POST `/api/ai/agent-jobs/:id/inject` body 是用户消息，Executor 在下一个 step 之前注入到 prompt |
| 跳过某步 | POST `/api/ai/agent-jobs/:id/steps/:stepId/skip` |
| 重做某步 | POST `/api/ai/agent-jobs/:id/steps/:stepId/redo` |

### P4.4 多 plan 并行

写作页顶栏新增「Agent 任务」icon，点击展开列表：

```
🤖 当前 3 个任务
├─ 短篇爆款 v1     [运行中 60%]
├─ 章纲转正文      [需要你的决定]
└─ 标题策划        [已完成 ✓ 查看]
```

点击任意 task → 切换右栏到对应 plan card。

---

## P5：firecrawl 集成 + 新增写作工具

### P5.1 firecrawl 接入

**方案**：直接 HTTP（不引 SDK），新建 `backend/src/services/firecrawl.ts`：

```ts
export async function firecrawlSearch(query: string, limit = 5): Promise<SearchResult[]>
export async function firecrawlScrape(url: string): Promise<ScrapedPage>
export async function firecrawlSearchAndScrape(query: string, k = 3): Promise<ScrapedPage[]>
```

- API key 从 `~/.config/firecrawl-cli/credentials.json` 复制到 `backend/.env` 的 `FIRECRAWL_API_KEY`
- `.env.example` 同步加上
- 实现 credit 监控，每次响应记录剩余 credits 到日志

### P5.2 新增工具（注册到 `backend/src/config/tools.ts`）

**外部研究类（2 个）**：

| 工具 | 描述 | 执行 |
|------|------|------|
| `web_search` | 搜索网络资料（短摘要） | backend |
| `web_research` | 深度研究：搜索 + 抓取 + 总结 | backend |

**写作语义类（4 个）**：

| 工具 | 描述 | 执行 |
|------|------|------|
| `generate_hook` | 为段落生成或改写强钩子开头 | backend (LLM call) |
| `tighten_pacing` | 收紧叙事节奏 | backend (LLM call) |
| `boost_payoff` | 强化爽点和反转 | backend (LLM call) |
| `check_consistency` | 检查与作品总纲/角色/世界观的一致性 | backend (LLM call) |

每个工具都是一个 LLM 子任务，复用 `callLLM` + 注入相应 prompt。

### P5.3 修复前端 BACKEND_TOOLS 集合 bug

前端 `BACKEND_TOOLS` 集合遗漏了新注册的后端工具，导致它们被错当成前端工具执行失败。本期一并修复。

---

## P6：模板 + 偏好学习

### P6.1 Plan 模板沉淀

job 完成后，用户可点「保存为模板」：
- 把 plan JSON 抽象化（去掉具体作品名）
- 存入 `agent_plan_templates`
- 用户下次输入类似指令，Planner 优先匹配模板

### P6.2 偏好学习

扩展现有 `ai_corrections` 表使用方式：

- 用户改 plan、跳步、拒绝产物时，记录到 `agent_step_events`
- 周期性聚合：「该用户常跳过 self_review 步」→ Planner 下次少生成此类步
- 利用现有 `agentRoutes.userFeedback` 机制扩展到 plan-level

---

## 关键文件清单（路径相对项目根）

### 新增（约 12 个文件）

```
backend/
├─ src/
│  ├─ db/migrations/
│  │  └─ 0001_agent_jobs.sql       新表 DDL
│  ├─ services/
│  │  ├─ planner.ts                 P2 Planner
│  │  ├─ agentExecutor.ts           P3 Executor 主循环
│  │  ├─ reflector.ts               P3 自检
│  │  ├─ firecrawl.ts               P5 网络搜索
│  │  └─ sseWrapper.ts              P1 SSE 包装（已创建，暂未接入）
│  ├─ jobs/
│  │  └─ agentWorker.ts             P1 后台 worker
│  ├─ routes/
│  │  └─ agent-jobs.ts              P1 全套 API
│  └─ config/
│     └─ reflectionRules.ts         P3 反思规则

frontend/
└─ js/
   ├─ composer.js                   P4 Plan UI 组件
   └─ agent-job-poller.js           P4 实时刷新
```

### 修改

```
backend/
├─ src/db/schema.ts                 加 4 张表
├─ src/index.ts                     启动 worker
├─ src/routes/ai.ts                 注册新工具
├─ src/config/tools.ts              新增 6 个工具
├─ src/services/agentRouter.ts      意图扩展（加 plan 类）
└─ .env / .env.example              加 FIRECRAWL_API_KEY

frontend/
├─ index.html                       引入新 JS
├─ js/interactions-core.js          扩展 consumeSSEStream + 修 BACKEND_TOOLS
├─ js/pages/writing.js              右栏挂载 composer
└─ css/editor.css                   Plan card 样式
```

### 必须复用（不动）

- `backend/src/services/llm.ts` — LLM 调用层
- `backend/src/services/contextBuilder.ts` — 上下文构建（直接复用）
- `backend/src/routes/ai.ts` 的 `TOOL_PROMPTS / STYLE_PROMPTS / streamResponse`

---

## 实施顺序（推荐 commit 粒度）

每个 commit 都可独立 ship 和回滚：

```
P1 (基础设施)
├─ commit 1.1: 4 张新表 schema + db:push
├─ commit 1.2: pg-boss 接入 + agent-jobs 基础 API（仅创建/查询）
├─ commit 1.3: SSE 包装层 + 自定义事件协议

P2 (Planner)
├─ commit 2.1: planner.ts + POST /agent-jobs 创建后立即调 planner
├─ commit 2.2: plan 校验 + 错误处理

P3 (Executor)
├─ commit 3.1: agentExecutor.ts 骨架 + read_context / create_artifact 两类
├─ commit 3.2: write_chunk / draft_outline / generate_ideas
├─ commit 3.3: reflector.ts + 规则 + 重试机制
├─ commit 3.4: user_input 暂停态 + inject API
├─ commit 3.5: pause/abort/skip/redo

P4 (UI)
├─ commit 4.1: composer.js 骨架 + Plan 卡片渲染
├─ commit 4.2: 实时刷新（SSE + 轮询兜底）
├─ commit 4.3: 用户操作（暂停/中止/编辑/插话）
├─ commit 4.4: 多 plan 并行 UI

P5 (firecrawl + 写作工具)
├─ commit 5.1: firecrawl.ts + .env 配置
├─ commit 5.2: web_search / web_research 工具
├─ commit 5.3: 4 个写作语义工具
├─ commit 5.4: 修复 BACKEND_TOOLS bug

P6 (模板 + 学习)
├─ commit 6.1: agent_plan_templates 表 + 保存为模板
├─ commit 6.2: 偏好聚合 + Planner 注入用户偏好
```

总计约 20 个 commit，预计 4-6 周（按你的"不急时间"标尺）。

---

## 验证步骤

### 阶段性验证（每 commit）

```bash
cd backend && npm run typecheck
cd backend && npm run dev
cd frontend/js && node -c <修改的文件>
```

### 端到端验证（P1-P3 完成后）

```bash
# 1. 启动
cd backend && npm run dev

# 2. 浏览器 http://localhost:3000 登录进入作品
# 3. 右栏对话发送：「参考《雪中悍刀行》给我写一篇 3000 字短篇爆款」
# 4. 预期：右栏出现 Plan 卡片，显示 5-7 步规划
# 5. 点「开始执行」
# 6. 预期：步骤逐个变 running → done
# 7. 测试暂停：执行中点暂停 → 立即停止 → 点恢复 → 继续
# 8. 测试关浏览器：执行中关掉 → 30s 后重新打开 → 右栏自动恢复进度
# 9. 测试多 plan：同时发起 3 个不同指令 → 顶栏 Agent 任务列表显示 3 个
```

### Agent 完整闭环验证（P5 完成后）

输入：「参考《xx》写短篇」

预期 Agent 行为：
- ✓ search 真实网络资料 `xx 爆款 分析`
- ✓ scrape top 3 评论文章
- ✓ 提取爆款元素（钩子/节奏/反转）
- ✓ 读作品总纲 + 角色 + 风格 DNA
- ✓ 生成大纲 → 自检覆盖度
- ✓ 写正文 → check_consistency 检查
- ✓ generate_hook 强化开头
- ✓ boost_payoff 强化爽点
- ✓ 落 artifact 到工作树
- ✓ 完成时弹「采纳为新章节？」

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| pg-boss 依赖 PG 但 backend 已用 Neon，连接池可能冲突 | 复用现有 `db.client`，配置 pg-boss 用同一 connection string，maxConnections 留余量 |
| LLM 规划质量不稳定，task DAG 经常无效 | Planner 输出强 schema + Zod 校验 + 失败自动重试一次；保留人工编辑 plan 的兜底 |
| 长任务用户失去耐心 | 进度可见 + 实时产物预览（任意中间步骤都可查看输出） + 总预算预估 |
| firecrawl credit 烧光 | 每次响应记录 credits，低于 100 告警；deep-research 改为可选（不默认调） |
| Reflector 误判导致死循环 | retryCount 上限 3 + 总步骤数上限 30 + 总耗时上限 10 分钟 |
| 多 plan 并行抢资源 | pg-boss teamSize=2 限制并发 worker；用户层面同一作品最多 3 个 active job |
| 用户中途插话破坏 plan 一致性 | inject 只在 step 边界处生效，不打断进行中的 step；插话视为「补充信息」加入 context |
| 数据库表设计错误后改起来痛 | P1 阶段彻底定型，后续不再大改 schema（如果改也用 migration 而非 db:push） |

---

## 不做的事情（明确边界）

- ❌ **不重写 llm.ts** — 已稳定，禁改
- ❌ **不替换现有 chat 流程** — Composer 是新入口，旧 `/api/ai/chat` 保留
- ❌ **不接 MCP 协议** — V4 规划，本期工具仍走内部 schema
- ❌ **不引入向量数据库** — 4 层记忆已够用，向量化是后续优化
- ❌ **不做协作多人模式** — V4 规划
- ❌ **不接入第三方写作 API**（如波斯笔） — 工具自给自足

---

## 迁移策略

开发环境可用 `db:push` 快速迭代：

```bash
cd backend && npm run db:push
```

生产部署和版本控制必须使用迁移文件：

```bash
cd backend && npx drizzle-kit generate   # 生成 SQL 迁移
cd backend && npx drizzle-kit migrate    # 执行迁移
```

当前已生成 `drizzle/0000_flowery_sharon_carter.sql`，包含完整的 27 张表 DDL。

---

## E2E 验证说明

### 测试脚本

`backend/test-agent-e2e.ts` 是端到端测试入口：

```bash
cd backend && node --env-file=.env --import tsx test-agent-e2e.ts
```

**前置条件**：
- PostgreSQL 在本地运行（`DATABASE_URL` 已配置）
- `.env` 中 `WANGSU_BASE_URL` + `WANGSU_API_KEY` 已配置（用于真实 LLM 调用）
- 或 `.env` 中 `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL` 已配置（回退模型）

**测试行为**：
- 默认调用真实 LLM（gemini-2.5-pro / 默认模型）和真实 Firecrawl API
- 测试用户 phone = `__e2e_test_user__`，每次运行前自动清理该用户的旧 job
- 覆盖 Planner → Executor → 状态流转 完整链路

**Mock 模式（暂未实现）**：
- 如需不烧真实 API，可在 `callAgentLLM` / `firecrawlSearchAndScrape` 处注入 mock
- 推荐后续增加 `MOCK_LLM=true MOCK_FIRECRAWL=true` 环境变量开关

---

## 前端集成说明

### 职责边界

| 文件 | 职责 |
|------|------|
| `frontend/js/composer.js` | Plan 卡片渲染（createPlanCard / updatePlanCard）、按钮交互（开始/暂停/中止/插话） |
| `frontend/js/agent-job-poller.js` | Agent Job 实时刷新：SSE 长连接 + 轮询兜底 + visibility change 切换 |
| `frontend/js/interactions-core.js` | BACKEND_TOOLS 白名单、consumeSSEStream、工具确认对话框 |
| `frontend/js/pages/writing.js` | 写作页右栏挂载点（`#aiChatDialogBody`） |

### 约定

- **API_BASE**：统一从 `window.API_BASE` 读取（后端渲染时注入，默认 `/api`）
- **Token**：统一读 `localStorage.getItem('jz_token')`（与 `state.js` 保持一致）
- **状态枚举**：job 状态 = `planning/running/paused/waiting/done/failed/aborted`
- **灰度开关**：当前 Agent 入口通过 URL 参数 `?agent=1` 控制，后续可升级为用户级开关
