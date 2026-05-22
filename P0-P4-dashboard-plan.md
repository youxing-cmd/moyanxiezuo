# 九章 P0-P4：今日写作台稳定化计划

> 状态：已确认
> 目标：把 Dashboard 做成稳定的创作入口，L8 之前的数据基础和事件源
> 执行顺序：P0a → P2 → P0b → P1 → P3 → P4

---

## 执行顺序

```
P0a 契约冻结 → P2 活动记录 → P0b Dashboard 接活动流 → P1 目标系统 → P3 摘要建议 → P4 审稿闭环
```

**为什么 P0a 先于 P2**：先用极小成本把 `/api/stats`、`nextActions`、`runDashboardAction()` 的结构冻结下来，避免做完 activities 后又改 dashboard 契约。

**为什么 P2 先于 P1/P3/P4**：`creation_activities` 是所有模块的共同数据源——Dashboard 的"今天推进了什么"、目标的"有效创作天数"、审稿闭环的"验收证据"、L8 主动建议的事件源，全部依赖它。

---

## 现状速查（不要重复开发）

| 模块 | 已有 | 缺口 |
|------|------|------|
| P0a Dashboard 契约 | `/api/stats` 返回结构完整；`runDashboardAction` 统一入口已通；`enterWriting(workId, chapterId)` 已支持 | 需要文档化约束、做一次验证 |
| P2 活动记录 | 完全缺失 | 无表、无埋点、无展示 |
| P0b Dashboard 活动流 | 缺失 | 需要接入 P2 的数据 |
| P1 连续创作/目标 | `consecutiveDays` + `todayWords` 已有 | `users` 表无目标字段；目标基于 activity 判定 |
| P3 章节摘要+建议 | `chapter_summaries` 表已有；保存时**已自动异步调用** `generateChapterSummary` | 下一章建议未实现；未展示 |
| P4 审稿闭环 | `openAgentReview` → `pendingWritingAction` → `runChapterReview()` 链路已通 | 未记录 activity；结果未反馈 Dashboard |

---

## P0a：Dashboard 契约冻结

### 目标

不大改功能，只确认契约稳定。后续任何新模块（周目标、摘要、L8、短剧改编）都必须遵守这套入口，不允许绕过。

### 冻结内容

1. **`/api/stats` 返回结构**

```ts
{
  workCount: number;
  totalWords: number;
  totalChapters: number;
  recentWorks: Array<{ id, title, genre, status, updatedAt }>;
  consecutiveDays: number;
  last7Days: Array<{ date: string, hasWriting: boolean }>;
  todayWords: number;
  primaryWork: {
    workId, workTitle, workEmoji, workStatus,
    chapterId, chapterTitle, chapterWordCount, chapterUpdatedAt
  } | null;
  nextActions: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
    workId?: number;
    chapterId?: number;
  }>;
  // P0b 后增加：todayActivities, todayProgress
}
```

2. **前端 action 白名单（`runDashboardAction`）**

| action | 落点 | 参数 |
|--------|------|------|
| `enterWriting` | `enterWriting(workId, chapterId)` | workId, chapterId |
| `openAgentReview` | `openAgentReview(workId, chapterId)` | workId, chapterId |
| `showCreateWorkModal` | `showCreateWorkModal()` | 无 |
| `exportDramaPackage` | 后续接改编包 | workId |

3. **写作页跳转必须传 `chapterId`**

`enterWriting(workId, chapterId)` 已支持，禁止恢复"默认永远选第一章"的逻辑。

4. **写作页 `pendingWritingAction` 机制**

```ts
type PendingWritingAction =
  | { type: 'review' }
  | { type: 'agent_focus' }
  | { type: 'view_summary' }      // P3 新增
  | { type: 'continue_outline' }; // 后续扩展
```

### 验证

- [ ] `/api/stats` 字段无报错
- [ ] Dashboard 每个按钮都走 `runDashboardAction()`
- [ ] 点击「继续写作」进入的是上次编辑的章节，不是第一章
- [ ] 点击「检查节奏」进入写作页后自动打开审稿面板

### commit

```
commit p0a: 文档化 Dashboard 契约约束（注释 + CLAUDE.md 更新）
commit p0a-verify: 跑通 4 个验证 case
```

---

## P2：creation_activities（活动记录层）

### 目标

记录用户在九章的所有创作活动。它是后续所有模块的共同数据源——Dashboard、目标、闭环、L8 全部依赖它。

### 核心设计原则

1. **activity 只记录事实，不承载复杂业务状态**
2. **允许重复，但不刷屏**：保存章节按 5 分钟合并
3. **类型要够细**，让 Dashboard 能区分"写了"和"改了"

### 活动类型

```ts
type ActivityType =
  | 'write'              // 编辑器输入（前端节流上报）
  | 'save_chapter'       // 保存章节（合并窗口 5 分钟）
  | 'create_chapter'     // 新建章节
  | 'polish'             // AI 润色/改稿
  | 'review'             // 完成审稿
  | 'accept_review'      // 采纳审稿建议
  | 'outline'            // 生成大纲
  | 'summary'            // 生成章节摘要
  | 'inspiration'        // 保存灵感
  | 'agent_task'         // 完成 Agent 任务
  | 'export_adaptation'  // 导出改编包
  | 'goal_complete';     // 达成目标（系统触发）
```

### 数据库

```sql
CREATE TABLE creation_activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id INTEGER REFERENCES works(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',           -- 用户可读标题："保存第 3 章"、"完成审稿"
  description TEXT NOT NULL DEFAULT '',     -- 详情："新增 1,234 字"、"发现 5 个问题"
  metadata JSONB NOT NULL DEFAULT '{}',     -- 结构化数据：{ wordCount, delta, issuesFound, issuesAdopted }
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creation_activities_user ON creation_activities(user_id, created_at DESC);
CREATE INDEX idx_creation_activities_user_type ON creation_activities(user_id, activity_type, created_at DESC);
```

### schema.ts 新增

```ts
export const creationActivities = pgTable('creation_activities', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  workId: integer('work_id'),
  chapterId: integer('chapter_id'),
  activityType: text('activity_type').notNull(),
  title: text('title').notNull().default(''),
  description: text('description').notNull().default(''),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});
```

### 后端新增

```
backend/src/
├─ services/
│  └─ activityLogger.ts     -- 核心封装
└─ routes/
   └─ activities.ts         -- GET /api/activities?limit=20&date=YYYY-MM-DD
```

`activityLogger.ts` 核心接口：

```ts
export async function logActivity(params: {
  userId: number;
  workId?: number;
  chapterId?: number;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void>

// 5 分钟合并窗口：同一用户+同一类型+同一章节，只保留最新一条
export async function logActivityWithDedup(params: {
  userId: number;
  workId?: number;
  chapterId?: number;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  dedupWindowMinutes?: number;  // 默认 5
}): Promise<void>
```

### 埋点位置

| 操作 | 文件 | 调用方式 | title | description |
|------|------|---------|-------|-------------|
| 保存章节 | `works.ts` PUT chapters/:cid | `logActivityWithDedup` | `保存「${chapterTitle}」` | `新增 ${delta} 字，共 ${wordCount} 字` |
| 新建章节 | `works.ts` POST chapters | `logActivity` | `新建「${title}」` | 空 |
| 完成审稿 | `interactions-core.js` review 回调 | `logActivity` | `完成「${title}」审稿` | `发现 ${issues} 个问题` |
| 采纳建议 | review panel 采纳按钮 | `logActivity` | `采纳 ${n} 条修改建议` | 空 |
| AI 润色 | `interactions-ai.js` 工具回调 | `logActivity` | `AI 润色「${title}」` | `使用 ${toolType}` |
| 生成摘要 | `works.ts` summary 回调 | `logActivity` | `生成「${title}」摘要` | 空 |
| 保存灵感 | `inspirations.ts` | `logActivity` | `保存灵感「${title}」` | 空 |
| 完成 Agent 任务 | `agentExecutor.ts` job done | `logActivity` | `完成「${jobTitle}」` | 空 |
| 导出改编包 | `works.ts` export | `logActivity` | `导出「${title}」改编包` | 空 |

### commit

```
commit p2.1: creation_activities 表 + schema + 迁移
commit p2.2: activityLogger.ts + dedup 逻辑
commit p2.3: 9 个埋点（save/create/review/accept/polish/summary/inspiration/agent/export）
commit p2.4: GET /api/activities 端点
```

---

## P0b：Dashboard 接活动流

### 目标

把 Dashboard 从"今日新增字数"升级为"今日有效推进"。

### 后端 `stats.ts` 增强

1. 返回中增加 `todayActivities`（从 P2 的表读取，今日 limit 20）
2. 返回中增加 `todayProgress`：

```ts
{
  todayWords: number;
  dailyGoal: number;           // 0 = 未设置
  weeklyGoalDays: number;      // 0 = 未设置
  weeklyActiveDays: number;    // 本周有效创作天数（基于 activity）
  todayActivityCount: number;  // 今日有效活动次数
}
```

3. `nextActions` 规则增强（基于 activity 判断）：
   - 今日无任何 activity → `start_today` 优先级最高
   - 今日有 `save_chapter` 但无 `review` → `review_chapter`
   - 今日 `save_chapter` 字数 > 2000 → `continue_writing`（带鼓励文案）
   - 最近章节有摘要 → description 显示摘要片段

### 前端

1. `loadDashboardStats` 增加 `todayActivities` 渲染
2. Dashboard 新增「今日推进」模块：
   - 时间线形式展示今日 activity
   - 每条 activity 显示图标 + title + description + 时间
3. Hero 区从「今日新增 X 字」升级为：
   - 今日新增 X 字
   - 今日有效推进 Y 次
   - 最近推进作品

### commit

```
commit p0b.1: stats.ts 集成 todayActivities + todayProgress
commit p0b.2: Dashboard「今日推进」时间线 UI
```

---

## P1：连续创作/周目标

### 目标

让用户能设目标，Dashboard 展示进度。**目标基于 activity 判定，不只看字数**。

### 为什么基于 activity

用户今天审稿、改稿、整理设定，系统应判定为"有效创作"。只看字数会把非写作类推进漏掉。

### 目标分类

1. **每日字数目标**：纯字数，适合日更作者
2. **每周有效创作天数目标**：本周有 >=1 条 activity（除 goal_complete 外）即算有效创作日，适合非日更作者

### 数据库变更

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 0;        -- 0 = 未设置
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal_days INTEGER DEFAULT 0;   -- 0 = 未设置
```

### 后端

```
PUT /api/auth/me/goals    { dailyGoal: number, weeklyGoalDays: number }
GET /api/auth/me          返回中增加 dailyGoal, weeklyGoalDays
```

`stats.ts` 中：
- `todayProgress.dailyGoal` = user.daily_goal
- `todayProgress.weeklyGoalDays` = user.weekly_goal_days
- `todayProgress.weeklyActiveDays` = 本周有 activity 的天数（去重日期）

### 前端

1. `profile.js` 设置页加「创作目标」模块：
   - 每日目标（字）：input number，placeholder "0 = 不设置"
   - 每周有效创作天数：input number（1-7），placeholder "0 = 不设置"
   - 保存按钮

2. `dashboard.js` 今日写作台加目标进度：
   - 若设了每日目标：Hero 区显示 `今日 1,234 / 3,000 字（41%）`
   - 若设了每周目标：7 天打卡区每格显示当天 activity 数量，底部显示 `本周 3 / 5 天`
   - 若都没设：不显示进度条，保持现有简洁 UI

3. 目标达成时自动记 activity：
   - 今日字数 >= dailyGoal → `logActivity({ type: 'goal_complete', title: '达成今日字数目标' })`
   - 本周有效天数 >= weeklyGoalDays → `logActivity({ type: 'goal_complete', title: '达成本周创作目标' })`

### commit

```
commit p1.1: users 表加 daily_goal/weekly_goal_days + schema + API
commit p1.2: profile.js 目标设置 UI
commit p1.3: Dashboard 目标进度展示（每日字数 + 每周天数）
commit p1.4: 目标达成自动记 goal_complete activity
```

---

## P3：章节摘要 + 下一章建议

### 目标

章节保存后自动生成摘要和建议，并在 Dashboard/写作页展示。**摘要已自动生成，重点补展示和建议**。

### 后端新增

```
GET  /api/works/:id/chapters/:cid/summary     读取章节摘要
POST /api/works/:id/chapters/:cid/suggestion  生成下一章建议（按需，非自动）
```

`generateNextChapterSuggestion(summary, styleDNA, workContext)` 调用 LLM：

```
基于本章摘要和作品风格 DNA，给出下一章的 3 个建议方向。
要求：
1. 承接本章 openHooks
2. 符合 styleDNA 的叙事节奏
3. 给出具体场景建议（不是笼统方向）
```

### 前端

1. 写作页保存章节后，右侧面板显示「本章摘要」折叠面板：
   - 摘要内容
   - 关键事件列表
   - 开放钩子列表
   - 「生成下一章建议」按钮（点击才调 LLM，避免每次保存都烧钱）
   - 建议展示：3 个方向卡片，点击可直接填入 AI 输入框

2. Dashboard nextActions 增强：
   - `primaryWork` 的最新章节有摘要时，description 显示摘要片段
   - 新增 action 类型：`view_summary` → 进入写作页并展开摘要面板

3. 摘要生成成功后记 activity：
   - `logActivity({ type: 'summary', title: '生成摘要', description: chapterTitle })`

### commit

```
commit p3.1: GET /chapters/:cid/summary 端点
commit p3.2: POST /chapters/:cid/suggestion + LLM 生成
commit p3.3: 写作页摘要 + 下一章建议面板
commit p3.4: Dashboard 摘要片段展示 + view_summary action
```

---

## P4：审稿改稿闭环

### 目标

写完 → 审稿 → 定位问题 → 采纳/忽略 → 保存版本 → 记录 activity → Dashboard 反馈结果。

### 现状

链路已通，只需补"证据链"。

### 补齐

1. **审稿开始记 activity**
   - `runChapterReview` 开始时：`logActivity({ type: 'review', title: '开始审稿', description: chapterTitle })`

2. **审稿完成记 activity**
   - `runChapterReview` 回调中：`logActivity({ type: 'review', title: '完成审稿', description: '发现 ${issues} 个问题' })`

3. **采纳建议记 activity**
   - review panel 每条采纳：`logActivity({ type: 'accept_review', title: '采纳修改建议', description: issueType })`

4. **保存修改后记 activity**
   - 走现有 `save_chapter` 埋点（P2 已完成）

5. **Dashboard 反馈审稿状态**
   - `stats.ts` 的 `nextActions` 中：
     - 最近章节写了 > 4000 字且无 `review` activity → `review_chapter`（已有）
     - 最近章节有 `review` 但无 `accept_review` → `re_review_chapter`（新增："审稿完成但未采纳，建议复查"）

### commit

```
commit p4.1: runChapterReview 开始/完成记 activity
commit p4.2: review panel 采纳按钮记 accept_review activity
commit p4.3: stats.ts nextActions 增加 re_review_chapter 规则
commit p4.4: 端到端验证（Dashboard → 审稿 → 采纳 → 保存 → 活动流）
```

---

## 文件清单

### 新增

```
backend/src/
├─ services/activityLogger.ts
├─ routes/activities.ts
└─ db/migrations/0002_creation_activities.sql

frontend/js/
├─ activity-stream.js
```

### 修改

```
backend/src/
├─ db/schema.ts                    + creationActivities, users 加 daily_goal/weekly_goal_days
├─ routes/stats.ts                 + todayActivities + todayProgress + nextActions 规则增强
├─ routes/works.ts                 + GET/POST summary/suggestion + 保存时记 activity
├─ routes/auth.ts                  + PUT /me/goals
├─ services/chapterSummary.ts      + generateNextChapterSuggestion
├─ index.ts                        + 注册 activities 路由
└─ jobs/scheduler.ts               + 目标达成检测（可选定时任务）

frontend/js/
├─ interactions-works.js           + Dashboard 活动流渲染 + nextActions 增强
├─ pages/dashboard.js              + 今日推进模块 + 目标进度
├─ pages/profile.js                + 创作目标设置
├─ pages/writing.js                + 摘要/下一章建议面板
├─ interactions-writing.js         + 保存后显示摘要面板
├─ interactions-core.js            + runChapterReview 记 activity
└─ interactions-ai.js              + 润色/改稿后记 activity
```

---

## 验收标准

| # | 阶段 | 验收项 | 验证方式 |
|---|------|-------|---------|
| 1 | P0a | Dashboard 所有按钮走 `runDashboardAction()` | 代码审查 |
| 2 | P0a | 点击「继续写作」进入上次编辑章节 | 手动测试 |
| 3 | P2 | 保存章节后 `creation_activities` 表中新增 `save_chapter` | 查数据库 |
| 4 | P2 | 5 分钟内重复保存同一章节只保留最新 activity | 手动测试 + 查库 |
| 5 | P0b | Dashboard 显示「今日推进」时间线 | 手动测试 |
| 6 | P0b | `/api/stats` 返回中包含 `todayActivities` 和 `todayProgress` | curl |
| 7 | P1 | 设置每日目标 3000 字，Dashboard 显示进度 | 手动测试 |
| 8 | P1 | 本周有 activity 的天数正确统计 | 手动测试 |
| 9 | P3 | 保存章节后写作页显示摘要面板 | 手动测试 |
| 10 | P3 | 点击「生成下一章建议」返回 3 个方向 | 手动测试 |
| 11 | P4 | Dashboard 点击「检查节奏」→ 进入写作页 → 自动审稿 | 手动测试 |
| 12 | P4 | 审稿完成后「今日推进」显示"完成审稿，发现 5 个问题" | 手动测试 |
| 13 | P4 | 采纳 2 条建议后 activity 流显示"采纳 2 条修改建议" | 手动测试 |

---

## 风险

| 风险 | 缓解 |
|------|------|
| activity 埋点太多导致写库压力 | 异步写入（`.catch(() => {})`），不阻塞主流程；高频操作走 dedup |
| LLM 生成建议成本高 | 建议按需生成（用户点击才调），不走自动 |
| 目标设置给用户压力 | 默认 0（不设置），用户主动设置后才展示进度 |
| nextActions 规则复杂后维护难 | 规则集中在 `stats.ts` 一个函数，不分散 |
| activity 表膨胀 | 定期归档（>90 天），Dashboard 只展示最近 20 条 |
