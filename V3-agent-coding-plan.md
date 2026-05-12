# 九章 V3 Agent 架构 Coding Plan

> 状态：方向性规划（待 V2 上线 + 数据反馈后正式启动）
> 起点：V2 已有 L3 路由层（决策）+ tool-use（行动）
> 目标：完整 Agent 架构（决策 + 行动 + 数据 + 记忆 + 规划 + 反思 + 主动）

---

## 总览

| 阶段 | 范围 | 工作量 | 触发条件 |
|------|------|--------|---------|
| **Phase 1 — L4 数据层** | 路由日志入库 + 用户反馈 | 1-2 周 | V2 上线后立即启动 |
| **Phase 2 — L5 记忆层** | 短期压缩 + 用户偏好 + 长期记忆 | 3-4 周 | Phase 1 数据积累 2 周后 |
| **Phase 3 — L6 规划层** | 任务规划器 + 多步执行 + 回退 | 4-6 周 | Phase 2 偏好画像稳定后 |
| **Phase 4 — L7 反思层** | 自评 + 重试 + 元认知 | 3-4 周 | Phase 3 完成（并行 Phase 5 可启动） |
| **Phase 5 — L8 主动层** | 状态机 + 主动触发 + 智能打断 | 3-4 周 | Phase 4 部分完成 |

合计 **3-5 个月**（不含 multi-agent 协作 L9）。

---

## Phase 1 — L4 数据层（1-2 周）

### 目标

让 Agent 的每个决策可追溯、可分析、可学习。当前 `[agent-chat] route: ...` 只写 console，没法做准确率分析。

### 验收标准

- 每次 `/api/ai/agent-chat` 调用都在 `agent_routes` 表留下一条记录
- 后端有 API 查询：按用户、按时间、按意图筛选路由记录
- 前端 AI 消息旁有"路由错了"按钮，点击后写入 `user_feedback`
- 跑一周数据后能输出报表：路由准确率、降级率、各意图分布、用户反馈率

### 数据库变更

新增 `agent_routes` 表：

```sql
CREATE TABLE agent_routes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  work_id INTEGER,
  query TEXT NOT NULL,           -- 用户最后一条 message
  intent TEXT NOT NULL,
  target_model_id TEXT NOT NULL,
  enabled_tools JSONB NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL,
  fallback BOOLEAN NOT NULL DEFAULT FALSE,
  raw_response TEXT,             -- 路由模型原始 JSON
  user_feedback TEXT,            -- accepted/rejected/corrected/null
  corrected_model_id TEXT,       -- 用户修正后的模型（如有）
  corrected_tools JSONB,         -- 用户修正后的工具（如有）
  latency_ms INTEGER,            -- 路由耗时
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_routes_user_created ON agent_routes(user_id, created_at DESC);
CREATE INDEX idx_agent_routes_intent ON agent_routes(intent);
```

### 后端改动

| 文件 | 改动 |
|------|------|
| `backend/src/db/schema.ts` | 加 `agentRoutes` 表定义 |
| `backend/src/services/agentRouter.ts` | `routeAgentRequest` 返回值增加 `latencyMs` |
| `backend/src/routes/ai-agent.ts` | 路由后立即 INSERT 到 `agent_routes`，拿到 row id，作为 header `X-Route-Id` 返回 |
| `backend/src/routes/agent-feedback.ts`（新增） | `POST /api/agent/feedback/:routeId` 接收用户反馈，UPDATE row |
| `backend/src/routes/agent-stats.ts`（新增） | `GET /api/agent/stats` 查准确率/降级率/分布 |

### 前端改动

| 文件 | 改动 |
|------|------|
| `frontend/js/app.js` | `runChatWithTools` 从响应 header 读取 `X-Route-Id` 存到 AI 消息上 |
| `frontend/js/app.js` | AI 消息旁加"👎 路由错了"按钮，点击后弹窗让用户选正确的模型+工具，POST 到 `/api/agent/feedback/:routeId` |

### 风险

- 写库失败不能阻塞主流程（用 try-catch，写库错误只 log）
- 用户反馈不应该影响积分（不扣费）

---

## Phase 2 — L5 记忆层（3-4 周）

### 目标

让 Agent 跨会话记住用户偏好，避免每次都从零开始路由。

### 验收标准

- 用户连续用 5 次"古风续写"后，新会话里 Agent 默认用古风偏好的模型组合
- 长对话超过 10K tokens 时自动摘要前文，对话仍可继续
- 跨会话记忆能让 Agent 知道用户上次写到哪、最近遇到什么剧情卡点

### 数据库变更

新增 `user_preferences` 表：

```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  preference_type TEXT NOT NULL,  -- writing_style / preferred_model / preferred_tools / avoid_phrases / typical_length
  preference_value JSONB NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  sample_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, preference_type)
);
```

新增 `conversation_summaries` 表：

```sql
CREATE TABLE conversation_summaries (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,  -- 关联 ai_conversations.id
  summary TEXT NOT NULL,
  covers_until_message_idx INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 后端改动

| 模块 | 文件 | 职责 |
|------|------|------|
| 偏好提取 | `backend/src/services/preferenceExtractor.ts`（新增） | 定时任务：从 `agent_routes` 最近 100 条记录中聚合用户偏好 |
| 偏好注入 | `backend/src/services/agentRouter.ts` | 路由 prompt 拼装时附加用户偏好 |
| 短期压缩 | `backend/src/services/contextCompressor.ts`（新增） | 检测消息累计 token 超阈值 → 调小模型压缩前 N 条为摘要 |
| 长期记忆 | `backend/src/services/longTermMemory.ts`（新增） | 会话结束/超时后提取关键信息（剧情进展、卡点、用户意图）入库 |

### 前端改动

| 文件 | 改动 |
|------|------|
| `frontend/js/app.js` | 设置页加"我的写作偏好"展示（只读，让用户看到 Agent 学到了什么） |
| `frontend/js/app.js` | "纠正偏好"按钮，允许用户手动修改偏好 |

### 关键设计点

- **偏好类型枚举**：`writing_style`（古风/现代/网文）、`preferred_model`（用户实际选择频率最高的）、`preferred_tools`、`avoid_phrases`（用户反馈拒绝过的）、`typical_length`（用户写作平均字数）
- **置信度衰减**：超过 30 天没新样本的偏好，置信度降低
- **冷启动**：新用户偏好为空时，使用全局默认配置

### 风险

- 偏好数据可能被路由模型过度采纳，导致用户尝试新风格时被偏好"锁死" → 加 `temperature` 让路由保留 10% 随机性
- 跨用户偏好不能混 → 严格按 `user_id` 隔离

---

## Phase 3 — L6 规划层（4-6 周）

### 目标

用户说"帮我写一章"，Agent 自动拆解为多步计划并执行，而不是一次性生成。

### 验收标准

- 用户输入"帮我写第三章"时，Agent 生成 5-7 步计划（读总纲 → 看角色 → 写章节大纲 → 写开头 → 补冲突 → 收尾 → 自检）
- 每步执行结果作为下一步输入，状态可见
- 某步失败时可回退到上一步，不丢前面进度
- 用户可中途介入修改计划

### 数据库变更

新增 `agent_plans` 表：

```sql
CREATE TABLE agent_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  work_id INTEGER,
  original_query TEXT NOT NULL,
  plan_steps JSONB NOT NULL,         -- [{step_id, description, tool, status, result_snapshot}, ...]
  status TEXT NOT NULL DEFAULT 'planning',  -- planning / executing / done / failed / cancelled
  current_step_idx INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 后端改动

| 模块 | 文件 | 职责 |
|------|------|------|
| 规划器 | `backend/src/services/agentPlanner.ts`（新增） | 输入用户 query + 上下文，输出 step 数组 |
| 执行器 | `backend/src/services/agentExecutor.ts`（新增） | 按 plan 步骤依次执行，每步存 snapshot |
| 端点 | `backend/src/routes/ai-agent.ts` | `POST /api/ai/agent-plan` 触发规划 + 执行（SSE 流式返回每步进度） |

### 前端改动

| 文件 | 改动 |
|------|------|
| `frontend/js/app.js` | 多步执行 UI：展示当前步骤、整体进度条、各步骤结果可展开 |
| `frontend/js/app.js` | "暂停"、"修改下一步"、"回退"按钮 |

### 关键设计点

- **规划复杂度判断**：简单 query（润色这段）不走规划，直接执行；复杂 query（写一章）才规划
- **步骤数限制**：最多 10 步，避免无限循环
- **快照粒度**：每步存编辑器内容快照，回退时恢复
- **用户介入接口**：在每步开始前给 200ms 窗口允许用户取消/修改

### 风险

- 规划失败（LLM 输出格式错）→ 降级为单步执行
- 执行中途网络断 → 持久化 plan 状态，恢复时继续

---

## Phase 4 — L7 反思层（3-4 周）

### 目标

AI 生成内容后自我评估，质量不达标自动重试，最终输出更稳定。

### 验收标准

- 续写/润色等关键端点，AI 生成完成后自动评估（流畅度、连贯性、去 AI 味、钩子密度）
- 评分 < 阈值时自动重生成最多 2 次
- 每次评估结果入库，可统计 AI 输出质量趋势

### 数据库变更

新增 `generation_evaluations` 表：

```sql
CREATE TABLE generation_evaluations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  route_id INTEGER,                  -- 关联 agent_routes.id
  original_content TEXT NOT NULL,
  evaluation_scores JSONB NOT NULL,  -- {fluency, coherence, ai_taste, hook_density}
  total_score REAL NOT NULL,
  retry_count INTEGER DEFAULT 0,
  final_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 后端改动

| 模块 | 文件 | 职责 |
|------|------|------|
| 评估器 | `backend/src/services/agentEvaluator.ts`（新增） | 用小模型对生成结果打分，JSON 输出（{fluency, coherence, ai_taste, hook_density, overall}） |
| 重试逻辑 | `backend/src/services/agentExecutor.ts` | 评分 < 阈值且 retry < max 时重新生成 |
| 元认知 | `backend/src/services/agentCapability.ts`（新增） | 维护各模型在各类任务上的历史成功率，路由时优先选成功率高的 |

### 前端改动

| 文件 | 改动 |
|------|------|
| `frontend/js/app.js` | AI 消息旁展示评分（小尺寸，非侵入式） |
| `frontend/js/app.js` | "重新生成"按钮永远可用 |

### 关键设计点

- **评估模型选择**：用 gemini-2.5-flash 评估（便宜快），不用顶级大模型
- **评分维度**：根据 intent 不同，评分维度不同（续写看连贯性、润色看流畅度、纠错看准确率）
- **重试触发阈值**：可配置，默认 60 分，重试上限 2 次
- **元认知数据**：从 `generation_evaluations` 聚合，更新各模型 capability 评分

### 风险

- 评估成本（每次生成多一次 LLM 调用）→ 仅关键端点启用，简单端点跳过
- 评估自身的偏差（评估模型也会出错）→ 多维度 + 总分 + 用户最终反馈校准

---

## Phase 5 — L8 主动层（3-4 周）

### 目标

Agent 不再被动等待用户输入，而是观察编辑器状态、识别合适时机主动介入。

### 验收标准

- 用户在编辑器停止输入 5 分钟时，Agent 主动检测当前内容是否有逻辑矛盾，有则提示
- 用户连续写 2000 字没出现新冲突时，Agent 提示"剧情停滞建议引入冲突"
- 用户快速打字时 Agent 不打扰，停下来思考时介入
- 用户可关闭主动模式（设置开关）

### 数据库变更

新增 `agent_state` 表：

```sql
CREATE TABLE agent_state (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',  -- idle / observing / suggesting / acting / reviewing
  state_data JSONB NOT NULL DEFAULT '{}',
  last_user_action_at TIMESTAMP,
  last_agent_action_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agent_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  work_id INTEGER,
  trigger_type TEXT NOT NULL,         -- idle_timeout / plot_stagnation / logic_conflict / style_drift
  suggestion_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / accepted / dismissed / ignored
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 后端改动

| 模块 | 文件 | 职责 |
|------|------|------|
| 状态机 | `backend/src/services/agentStateMachine.ts`（新增） | 维护每个用户的 Agent 状态，状态转换规则 |
| 触发器 | `backend/src/services/agentTriggers.ts`（新增） | 各种触发条件检测（idle、plot stagnation、logic conflict） |
| 建议生成器 | `backend/src/services/agentSuggester.ts`（新增） | 触发后用 LLM 生成具体建议 |
| WebSocket 端点 | `backend/src/routes/agent-ws.ts`（新增） | 前端订阅 Agent 主动建议（之前只有请求-响应模式不够） |

### 前端改动

| 文件 | 改动 |
|------|------|
| `frontend/js/app.js` | WebSocket 连接接收主动建议 |
| `frontend/js/app.js` | 编辑器事件上报（输入间隔、停顿时长、选区变化）→ 后端用于状态判断 |
| `frontend/js/app.js` | 主动建议气泡（非模态、可一键忽略） |
| `frontend/js/app.js` | 设置开关："开启 AI 主动建议" |

### 关键设计点

- **打扰最小化**：用户连续打字时不弹建议（节流）；用户主动暂停且时间足够长才介入
- **建议价值阈值**：建议必须明确（具体到改哪段、加什么冲突），而不是"建议你继续推进"这种空洞话
- **用户疲劳监测**：用户连续忽略 3 次建议 → 暂停 1 小时
- **状态机持久化**：避免后端重启丢失状态

### 风险

- 主动建议被用户视为"打扰" → 必须有强力关闭开关，默认低频
- WebSocket 连接管理复杂 → 用 SSE 单向推送代替（更简单）
- 触发条件误报 → 充分测试，可调阈值

---

## 跨阶段共性事项

### 监控与可观测性

每个 Phase 必须提供：
- 后端日志结构化（用 `[component] action: data` 格式）
- 关键指标埋点（路由准确率、生成成功率、用户反馈率、主动建议采纳率）
- Sentry 集成（已有，扩展捕获 Agent 异常）

### 测试策略

- 单元测试：每个新增 service 必须有 ≥ 5 个测试 case
- 集成测试：每个端点必须有端到端测试（模拟用户全流程）
- A/B 测试：通过 `?agent=1` 灰度开关已支持，每个 Phase 上线后跑 1 周对比

### 文档要求

每个 Phase 完成后必须：
- 更新 V2 项目的 `CLAUDE.md`（开发约束部分）
- 新增 `Phase-N-design.md`（详细设计文档）
- 更新 memory（项目进度）

---

## 优先级建议

**强烈推荐顺序：Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5**

理由：
- Phase 1（数据层）是后续所有 Phase 的基础，必须先做
- Phase 2（记忆层）能立即提升路由准确率，用户感知强
- Phase 4（反思层）能立即提升 AI 输出质量，用户感知最强
- Phase 3（规划层）依赖前面的数据和偏好，否则规划质量难保证
- Phase 5（主动层）放最后，需要前面 Phase 都成熟才不会变成"打扰用户"

**不推荐的顺序**：
- ❌ 跳过 Phase 1 直接做 Phase 5：没数据无法验证主动建议的价值
- ❌ Phase 3 早于 Phase 2：没用户偏好的规划质量差

---

## 风险总览

| 风险 | 影响阶段 | 缓解 |
|------|---------|------|
| 路由准确率低 | Phase 1-5 全部 | Phase 1 收集数据后针对性优化 prompt |
| AI 成本失控（多 LLM 调用） | Phase 4 反思 + Phase 3 规划 | 用小模型评估和规划，仅关键步骤用大模型 |
| 主动建议变骚扰 | Phase 5 | 严格的节流 + 用户疲劳监测 + 默认关闭 |
| 数据库膨胀（每次调用都写） | Phase 1-4 全部 | 定期归档、采样写入（不是 100% 写） |
| 用户隐私（写作内容入库） | Phase 1-5 全部 | 严格用户隔离，提供导出+删除功能 |

---

## 不在本 Plan 范围

- **L9 多 Agent 协作**（专家 Agent + 调度器）：等 V3 完整运行后再评估
- **训练私有路由模型**：当前 gemini-2.5-flash 够用，不投入训练资源
- **本地模型部署**：维持调用云端 API
- **跨设备同步**：依赖现有数据库设计，无需特别开发

---

## 启动建议

1. **现在不要开工**，先把 V2 上线，收 1-2 周用户数据
2. 数据出来后**先做 Phase 1**，看路由准确率到底多少
3. 如果路由准确率 > 90%，可以**跳过 Phase 2 的部分细节**，直接做 Phase 4
4. 如果路由准确率 < 70%，**重点放在 Phase 1 数据 + 路由 prompt 微调**，先把基础做扎实

记住：**Agent 架构的核心是数据闭环**。没有数据就没有学习，没有学习就没有 Agent。
