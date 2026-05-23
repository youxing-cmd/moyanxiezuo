# 九章 L8 — Agent 主动层

> 状态：方案阶段，待确认后开发
> 前置条件：V3 Agent 工作流系统（P1-P6 + Product P0-P6）已全部完成
> 目标：Agent 从"用户输入才响应"升级为"观察状态、识别时机、主动建议"

---

## 执行前置门禁（重要）

L8 是主动 Agent 层，不应抢在“今日写作台 + 写作页 + Agent 审稿闭环”稳定之前开发。执行顺序必须是：

1. 先保证 Dashboard 到写作页、章节、Agent 审稿、作品详情之间的信息传递稳定。
2. 再完成连续创作/周目标、章节摘要/下一章建议、审稿改稿闭环、`creation_activities`。
3. 最后再启动 L8 主动建议。否则 L8 会把不稳定的页面状态放大成更多入口错误。

### 当前连通层状态（避免重复开发）

以下能力已经补入当前代码，后续不要另起一套跳转机制：

| 能力 | 当前实现 | 后续要求 |
|------|----------|----------|
| Dashboard 行动入口 | `frontend/js/interactions-works.js` 的 `runDashboardAction(action, workId, chapterId)` | 新 action 统一接入这里，不在模板里散落业务判断 |
| 进入写作页 | `enterWriting(workId, chapterId)` 已支持章节 ID | Dashboard / 建议 / 活动流跳转必须传 `chapterId`，避免误开第一章 |
| 写作页待执行动作 | `frontend/js/state.js` 的 `pendingWritingAction` | 审稿、Agent focus、后续摘要/改稿都走 pending action |
| 自动选中章节 | `frontend/js/interactions-writing.js` 会优先打开传入章节 | 不要恢复“默认永远选第一章”的逻辑 |
| Dashboard 审稿入口 | `openAgentReview(workId, chapterId)` 进入写作页后调用 `runChapterReview()` | 后续审稿闭环复用现有 `review-panel.js` |

### L8 开发前必须完成的 P0-P4

| 优先级 | 模块 | 验收标准 |
|--------|------|----------|
| P0 | Dashboard 数据契约冻结 | `/api/stats` 稳定返回 `todayWords`、`consecutiveDays`、`last7Days`、`primaryWork`、`recentWorks`、`nextActions` |
| P1 | 连续创作/周目标 | 用户能设置每日/每周目标，Dashboard 展示目标进度；无目标时有合理默认态 |
| P2 | `creation_activities` | 写作、保存、润色、审稿、采纳、灵感、导出改编包都能记录，Dashboard 可显示“今日推进了什么” |
| P3 | 章节摘要 + 下一章建议 | 复用 `chapter_summaries`，章节保存后可生成/更新摘要，并给出下一章建议 |
| P4 | 审稿改稿闭环 | 写完章节 → 审稿 → 定位问题 → 采纳/忽略 → 保存版本 → 记录 activity |

### Dashboard 与其他页面的数据契约

`/api/stats` 的 `nextActions` 必须保持以下结构：

```ts
type DashboardAction = {
  type: 'continue_writing' | 'create_work' | 'start_today' | 'review_chapter' | 'adaptation' | string;
  title: string;
  description: string;
  action: 'enterWriting' | 'openAgentReview' | 'showCreateWorkModal' | 'exportDramaPackage' | string;
  workId?: number;
  chapterId?: number;
};
```

前端 action 白名单：

| action | 落点 |
|--------|------|
| `enterWriting` | `enterWriting(workId, chapterId)` |
| `openAgentReview` | `openAgentReview(workId, chapterId)` |
| `showCreateWorkModal` | `showCreateWorkModal()` |
| `exportDramaPackage` | 后续接改编包 / Toonflow 连接器 |

任何新模块（周目标、摘要、L8 建议、Toonflow、游戏改编包）要进入 Dashboard，都必须输出 `nextActions` 兼容结构，不能直接操作 DOM 或绕过 `runDashboardAction()`。

---

## 核心设计原则

**L8 不是独立系统，是 Agent Runtime 的"主动模式"扩展。**

| 已有基础设施 | L8 如何复用 |
|------------|-----------|
| `agent_jobs` / `agent_plan_steps` | 主动建议 = 轻量 1-2 步 Agent Job |
| SSE / 轮询（`agent-job-poller.js`）| 建议推送走已有 SSE 通道，不新增 WebSocket |
| pg-boss worker（`agentWorker.ts`）| 触发器创建 job 后由现有 worker 执行 |
| `planner.ts` + `executor.ts` + `reflector.ts` | 建议内容生成走现有规划-执行-反思链路 |
| 4 层记忆 + `contextBuilder.ts` + `styleDNA.ts` | 矛盾检测、风格偏移检测直接复用 |
| `scheduler.ts` 定时任务 | 触发器扫描走现有定时任务框架 |
| `composer.js` Plan 卡片 | 建议结果以迷你 Plan 卡片形态展示 |
| `aiArtifacts` + 产物落地 | 建议采纳后走已有 artifact 创建流程 |

**不新建的东西**：WebSocket、独立 worker 进程、全新状态机服务、新 UI 组件体系。

---

## 问题本质

当前 Agent 是"问答机"：用户说话才动。作者写作时 Agent 在一边闲着。

写作场景的真实需求：
1. 作者卡文 5 分钟 → Agent 应该发现并提供方向
2. 写了 2000 字全是铺垫 → Agent 提示剧情停滞
3. 前文说主角武功全失，后文又打翻十人 → Agent 提示逻辑矛盾
4. 风格从武侠突然变言情 → Agent 提示风格偏移
5. 作者连续写 3 小时 → Agent 建议休息或复盘

**但**：不能变成骚扰。快速打字时不打扰，停下来才介入；连续忽略 3 次就闭嘴 1 小时；用户可一键关闭。

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: 编辑器事件采集 + 建议展示 + 状态控制                │
│  ├─ 输入事件节流上报（typing / idle / pause）                │
│  ├─ 字数/段落/冲突计数实时统计                               │
│  ├─ 建议气泡（非模态、可忽略、可采纳）                        │
│  └─ 设置开关：「AI 主动建议」on/off                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────┴──────────────────────────────────────┐
│  Backend: 触发器 + 轻量 Agent Job                            │
│  ├─ 触发器扫描（scheduler.ts 扩展）                          │
│  │   └─ 每 30s 扫描活跃会话 → 命中条件则创建 suggestion job   │
│  ├─ 轻量 Job（1-2 步，复用现有 executor）                    │
│  │   └─ step 1: 分析上下文 → step 2: 生成建议                 │
│  ├─ 结果通过 SSE 推送（复用 agent-jobs stream）              │
│  └─ 疲劳监测：用户忽略计数 → 暂停创建                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 数据库变更

复用 `agent_jobs` 表，新增 `triggerType` 字段区分来源。

### 1. `agent_jobs` 扩展

```sql
-- 在已有 agent_jobs 上增加两个字段
ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS trigger_type TEXT;  -- null = 用户发起, 'idle_timeout'/'plot_stagnation'/'logic_conflict'/'style_drift'
ALTER TABLE agent_jobs ADD COLUMN IF NOT EXISTS suggestion_id INTEGER;  -- 关联 agent_suggestions（用于疲劳监测）
```

### 2. 新增 `agent_suggestions` 表

```sql
CREATE TABLE agent_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id INTEGER REFERENCES works(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,         -- idle_timeout / plot_stagnation / logic_conflict / style_drift
  trigger_data JSONB NOT NULL DEFAULT '{}',  -- 触发时快照：字数、章节、idle 时长等
  job_id INTEGER REFERENCES agent_jobs(id) ON DELETE SET NULL,
  content TEXT,                       -- 建议正文
  artifact_id INTEGER REFERENCES ai_artifacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending / accepted / dismissed / ignored
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_suggestions_user ON agent_suggestions(user_id, created_at DESC);
CREATE INDEX idx_agent_suggestions_status ON agent_suggestions(status);
```

### 3. 新增 `user_proactive_settings` 表

```sql
CREATE TABLE user_proactive_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  idle_timeout_seconds INTEGER NOT NULL DEFAULT 300,    -- 默认 5 分钟
  stagnation_word_count INTEGER NOT NULL DEFAULT 2000,  -- 默认 2000 字
  fatigue_threshold INTEGER NOT NULL DEFAULT 3,         -- 连续忽略几次后暂停
  fatigue_cooldown_minutes INTEGER NOT NULL DEFAULT 60, -- 暂停多久
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 后端设计

### 新增文件

```
backend/src/
├─ services/
│  ├─ agentTriggers.ts       -- 触发条件检测引擎
│  ├─ agentSuggestionJob.ts  -- 轻量建议 Job 创建与执行
│  └─ agentFatigue.ts        -- 疲劳监测（忽略计数 + 冷却）
├─ routes/
│  ├─ agent-proactive.ts     -- 前端设置读写 + 手动触发 + 建议列表
│  └─ agent-suggestions.ts   -- 建议状态更新（接受/忽略/关闭）
└─ jobs/
   └─ proactiveScanner.ts    -- scheduler 定时扫描任务
```

### 修改文件

```
backend/src/
├─ db/schema.ts              -- 加 agent_suggestions / user_proactive_settings 表
├─ routes/agent-jobs.ts      -- GET /agent-jobs 过滤 trigger_type=null（用户发起的）
├─ services/agentExecutor.ts -- 执行 suggestion job 时跳过 self_review（轻量）
└─ index.ts                  -- 注册 proactiveScanner 定时任务
```

### 触发器引擎 `agentTriggers.ts`

```ts
export interface TriggerContext {
  userId: number;
  workId: number;
  lastTypingAt: Date;
  currentWordCount: number;
  lastConflictWordCount: number;  // 上次检测到冲突时的字数
  currentStyleDNA: string;
  recentParagraphs: string[];
}

export type TriggerType = 'idle_timeout' | 'plot_stagnation' | 'logic_conflict' | 'style_drift';

export async function checkTriggers(ctx: TriggerContext): Promise<TriggerType | null> {
  const settings = await getProactiveSettings(ctx.userId);
  if (!settings.enabled) return null;

  // 1. idle_timeout
  const idleSeconds = (Date.now() - ctx.lastTypingAt.getTime()) / 1000;
  if (idleSeconds >= settings.idle_timeout_seconds) {
    return 'idle_timeout';
  }

  // 2. plot_stagnation
  const wordsSinceConflict = ctx.currentWordCount - ctx.lastConflictWordCount;
  if (wordsSinceConflict >= settings.stagnation_word_count) {
    return 'plot_stagnation';
  }

  // 3. logic_conflict（需 LLM 判断，成本高，低频触发）
  // 4. style_drift（需对比 styleDNA，成本高，低频触发）

  return null;
}
```

**注意**：`logic_conflict` 和 `style_drift` 需要 LLM 判断，成本高，不放在每 30s 的扫描里。它们通过前端上报的「段落完成事件」触发（作者按回车分段时，后端异步检测）。

### 轻量建议 Job `agentSuggestionJob.ts`

```ts
export async function createSuggestionJob(
  userId: number,
  workId: number,
  triggerType: TriggerType,
  triggerData: object
): Promise<number> {
  // 1. 先创建 suggestion 记录（用于疲劳监测）
  const [suggestion] = await db.insert(agentSuggestions).values({
    userId, workId, triggerType, triggerData, status: 'pending'
  }).returning();

  // 2. 创建轻量 agent_job（只有 2 步：分析上下文 + 生成建议）
  const plan = buildSuggestionPlan(triggerType);
  const job = await createAgentJob({
    userId, workId,
    query: `[proactive] ${triggerType}`,
    plan,
    triggerType,
    suggestionId: suggestion.id,
  });

  // 3. 更新 suggestion 关联 job
  await db.update(agentSuggestions).set({ jobId: job.id }).where(eq(agentSuggestions.id, suggestion.id));

  return job.id;
}

function buildSuggestionPlan(triggerType: TriggerType): PlanStep[] {
  switch (triggerType) {
    case 'idle_timeout':
      return [
        { type: 'read_context', title: '读取当前上下文', dependsOn: [] },
        { type: 'generate_ideas', title: '生成续写方向', dependsOn: ['1'] },
      ];
    case 'plot_stagnation':
      return [
        { type: 'read_context', title: '读取最近段落', dependsOn: [] },
        { type: 'generate_ideas', title: '建议引入冲突或转折', dependsOn: ['1'] },
      ];
    // ...
  }
}
```

### 疲劳监测 `agentFatigue.ts`

```ts
export async function shouldSuppress(userId: number): Promise<boolean> {
  const settings = await getProactiveSettings(userId);

  // 最近 fatigue_cooldown_minutes 内被忽略/关闭的次数
  const recentIgnored = await db.select().from(agentSuggestions)
    .where(and(
      eq(agentSuggestions.userId, userId),
      or(eq(agentSuggestions.status, 'ignored'), eq(agentSuggestions.status, 'dismissed')),
      gt(agentSuggestions.createdAt, new Date(Date.now() - settings.fatigue_cooldown_minutes * 60000))
    ));

  return recentIgnored.length >= settings.fatigue_threshold;
}
```

---

## 前端设计

### 新增文件

```
frontend/js/
├─ proactive-agent.js        -- 编辑器事件采集 + SSE 建议接收 + 气泡渲染
└─ pages/
   └─ profile.js             -- 设置页加「AI 主动建议」开关
```

### 修改文件

```
frontend/js/
├─ pages/writing.js          -- 编辑器挂载 proactive-agent
├─ editor-core.js            -- 输入事件上报（typing / idle / paragraph）
└─ css/editor.css            -- 建议气泡样式
```

### 编辑器事件上报

```ts
// proactive-agent.ts
export function attachProactiveAgent(editor: HTMLElement, workId: number) {
  let lastTyping = Date.now();
  let wordCount = 0;
  let lastConflictAt = 0;

  editor.addEventListener('input', throttle(() => {
    lastTyping = Date.now();
    wordCount = countWords(editor.innerText);
    reportTyping({ workId, wordCount, timestamp: lastTyping });
  }, 1000));

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      // 段落完成，上报给后端异步检测逻辑矛盾/风格偏移
      reportParagraphComplete({ workId, paragraph: getCurrentParagraph(editor) });
    }
  });

  // 每 10s 检查一次 idle
  setInterval(() => {
    const idle = (Date.now() - lastTyping) / 1000;
    if (idle >= 60) {
      reportIdle({ workId, idleSeconds: idle });
    }
  }, 10000);
}
```

### 建议气泡 UI

```html
<div class="proactive-suggestion" data-suggestion-id="123">
  <div class="suggestion-header">
    <span class="suggestion-icon">💡</span>
    <span class="suggestion-title">剧情似乎停滞了</span>
    <button class="suggestion-close">✕</button>
  </div>
  <div class="suggestion-body">
    最近 2000 字没有新冲突或转折，读者可能失去耐心。
    建议：让主角遇到一个意外阻碍，或揭示一个隐藏信息。
  </div>
  <div class="suggestion-actions">
    <button data-action="accept">采纳建议</button>
    <button data-action="ignore">忽略</button>
  </div>
</div>
```

样式约束：
- 固定在编辑器右下角，z-index 低于弹窗、高于正文
- 动画：从右侧滑入，300ms
- 自动消失：10 秒无交互则淡出（但保留在建议历史中）
- 关闭后当前会话不再显示同类型建议

---

## API 设计

### 设置相关

```
GET    /api/ai/proactive/settings     获取当前用户的主动建议设置
PUT    /api/ai/proactive/settings     更新设置（enabled / idle_timeout / stagnation_word_count 等）
```

### 建议相关

```
GET    /api/ai/suggestions?workId=123&limit=20   获取建议历史
PUT    /api/ai/suggestions/:id/status            更新状态：{ status: 'accepted' | 'dismissed' | 'ignored' }
POST   /api/ai/proactive/trigger                 手动触发（调试用）：{ workId, triggerType }
```

### 事件上报

```
POST   /api/ai/proactive/events/typing            { workId, wordCount, timestamp }
POST   /api/ai/proactive/events/idle              { workId, idleSeconds }
POST   /api/ai/proactive/events/paragraph         { workId, paragraph }
```

---

## 触发条件矩阵

| 触发类型 | 检测方式 | 成本 | 频率 | 建议内容 |
|---------|---------|------|------|---------|
| `idle_timeout` | 前端上报 idle 事件 | 低 | 高（每 5 分钟）| 续写方向、灵感提示 |
| `plot_stagnation` | 字数统计（前端上报）| 低 | 中（每 2000 字）| 引入冲突/转折建议 |
| `logic_conflict` | 段落完成时 LLM 检测 | 高 | 低 | 指出具体矛盾点 |
| `style_drift` | 段落完成时对比 styleDNA | 高 | 低 | 指出风格偏移 |

**低成本触发**（idle_timeout / plot_stagnation）：直接创建 suggestion job，走现有 worker 执行。
**高成本触发**（logic_conflict / style_drift）：先由前端上报段落内容，后端放入队列异步检测，命中后再创建 job。

---

## 疲劳与打扰控制

```
用户连续忽略/关闭 3 次同类型建议
    ↓
暂停该类型建议 1 小时
    ↓
1 小时后恢复，如果再次被忽略，延长到 2 小时
    ↓
最多延长到 24 小时
```

用户设置：
- 全局开关：关闭则所有建议停止
- 敏感度：低 / 中 / 高（映射到不同的字数阈值和 idle 时长）
- 可关闭的类型：只接收 idle 提示，不接收剧情停滞提示

---

## 和 Dashboard 的整合

今日写作台（Dashboard）新增「AI 建议」模块：
- 显示最近 3 条建议及状态
- 点击「查看全部」进入建议历史页
- 建议历史页按 work 筛选，可批量忽略

---

## 开发阶段（4 个 commit）

```
L8-P1 基础设施
├─ commit 1.1: schema 变更（agent_suggestions / user_proactive_settings 表）+ 迁移
├─ commit 1.2: agentTriggers.ts + proactiveScanner.ts + 低成本触发器（idle / stagnation）
└─ commit 1.3: agentSuggestionJob.ts + 轻量 job 创建 + executor 跳过 self_review 逻辑

L8-P2 前端集成
├─ commit 2.1: proactive-agent.js（事件采集 + SSE 接收）+ editor-core.js 事件挂载
├─ commit 2.2: 建议气泡 UI + CSS + 采纳/忽略交互
└─ commit 2.3: profile.ts 设置面板 + 疲劳监测 UI

L8-P3 高成本触发器
├─ commit 3.1: logic_conflict 异步检测（段落完成时 LLM 检测）
├─ commit 3.2: style_drift 异步检测（对比 styleDNA）
└─ commit 3.3: 疲劳监测 agentFatigue.ts + 冷却逻辑

L8-P4 Dashboard 整合
├─ commit 4.1: Dashboard AI 建议模块
└─ commit 4.2: 建议历史页 + 批量操作
```

---

## 验收标准

| # | 验收项 | 验证方式 |
|---|-------|---------|
| 1 | 停止输入 5 分钟后，右下角出现建议气泡 | 手动测试 |
| 2 | 连续写 2000 字无冲突，出现剧情停滞建议 | 手动测试或 mock 字数上报 |
| 3 | 快速打字时不出现建议 | 手动测试 |
| 4 | 忽略 3 次后同类型建议暂停 1 小时 | 手动测试 + 数据库验证 |
| 5 | 关闭设置开关后不再收到任何建议 | 手动测试 |
| 6 | 建议内容可采纳为 artifact | 点击采纳 → 检查 `ai_artifacts` 表 |
| 7 | 后端没有新增 WebSocket、没有新增 worker 进程 | 代码审查 |
| 8 | 所有建议 job 能在 `agent_jobs` 表中追溯到 | 数据库查询 |

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 建议变骚扰 | 疲劳监测 + 全局开关 + 默认 5 分钟 idle 才触发 |
| LLM 成本增加 | logic_conflict/style_drift 低频触发；idle/stagnation 用轻量模型 |
| 前端事件上报太频繁 | typing 事件节流 1s；idle 检查每 10s；paragraph 只在回车时 |
| 建议质量差 | 走现有 reflector.ts 自检，不通过不推送 |
| 和已有 Agent Job 混淆 | trigger_type 字段区分；前端建议列表只显示 proactive 类型 |

---

## 不做的事情

- ❌ **不新建 WebSocket** — 复用 SSE
- ❌ **不新建独立 worker** — 复用 pg-boss agent worker
- ❌ **不新增状态机服务** — 状态在前端维护，后端只存配置
- ❌ **不做 MCP 协议** — L9 规划
- ❌ **不做多 Agent 协作** — L9 规划
- ❌ **不替换现有 chat 流程** — L8 是增量能力
