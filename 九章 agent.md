# 九章 V3 — 写作 Agent 工作流系统

## Context

九章 V2 已具备 4 层记忆 + L3 路由 + 13 个工具的「上下文注入式 RAG」架构，但本质仍是"AI 一次性输出"。用户给"参考 xx 写一篇短篇爆款"这种模糊指令时，Agent 不会主动拆解任务、阅读资料、规划步骤、自我反思——这导致：

1. **规划缺失**：用户看不到 Agent 的思考结构，体验是黑盒
2. **执行扁平**：单轮 LLM call，没有 read→think→produce→reflect 的循环
3. **产物零散**：生成结果只在对话框流式输出，不自动落到工作树
4. **状态短暂**：关掉浏览器一切丢失，无法长周期工作
5. **外部知识断流**：「参考 xx」只能靠用户粘贴，Agent 不会主动研究

V3 的目标是把九章从「AI 写作工具」升级为「AI 写作 Agent」，达到 Cursor Composer / Devin 在写作领域的对等体验。

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
| `agent_jobs` | id, userId, workId, query, status(planning/running/paused/done/failed/aborted), planId, progress, errorMsg, createdAt, updatedAt, finishedAt | 整体任务实例 |
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

- `backend/src/services/sseWrapper.ts`：导出 `wrapSSE(upstream, eventHandlers)`，返回 ReadableStream
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

`frontend/js/interactions-core.js:1315` 的 `BACKEND_TOOLS` 集合遗漏了 4 个 artifact 工具，导致它们被错当成前端工具执行失败。本期一并修复。

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
│  │  ├─ sseWrapper.ts              P1 SSE 包装
│  │  └─ writingTools.ts            P5 写作工具实现
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
