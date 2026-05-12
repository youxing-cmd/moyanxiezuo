# L3 Agent 路由层设计与决策

> 实施日期：2026-05-12  
> 状态：已合并到 V2 main 分支  
> 触发条件：V2 W2 任务（参见 `开发计划-v2v3v4.md`）

## 为什么需要这个

V2 之前所有 AI 请求都打默认 `claude-sonnet-4-6`，全部 9 个工具一股脑塞给模型。两个问题：

1. **成本浪费**：简单意图（如"起个标题"）也用顶级大模型，每次都消耗高单价 token
2. **工具污染**：全工具暴露给大模型，增加 prompt 长度且容易选错工具

L3 路由层在请求进入后端时先用小模型（`gemini-2.5-flash`）做意图分析，输出 JSON 决策（目标大模型 + 启用的工具子集），再用决策结果调真正的执行模型。

## 架构

```
用户 query
   ↓
[路由模型 - gemini-2.5-flash]  ← 输入：query + 工具清单 + 模型清单
   ↓ 输出 JSON：{ intent, targetModelId, enabledTools, confidence }
[执行模型 - 大模型]            ← 输入：路由决策 + 工具子集
   ↓ tool-use 循环（SSE 流式）
最终结果 → 前端
```

## 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 路由模型 | `gemini-2.5-flash` | 速度快、便宜、支持 JSON 输出（OpenAI 协议） |
| JSON 解析 | 去 markdown 围栏 → `JSON.parse` → 失败正则兜底 | 沿用 `/api/ai/tool-match` 已验证模式 |
| 路由失败 | 降级到默认模型 + 全工具集 | 不阻塞用户，宁可多算钱也不报错 |
| 对前端可见性 | 黑盒（只走日志和 HTTP header） | 用户感知不到路由过程 |
| 灰度方式 | URL 参数 `?agent=1` | 前端不需要新部署，方便对比 |
| 是否动 llm.ts | 不动 | 沿用 `callLLM(messages, false, geminiFlashConfig)` 调路由模型 |
| 是否动 ai.ts | 仅 export 几个共享函数 | `buildWorkContextPrompt`、`STYLE_PROMPTS`、`streamResponse` |

## 文件清单

### 新增

- `backend/src/services/agentRouter.ts`
  - `routeAgentRequest(messages, ctx)` — 主入口，返回 `RouteDecision`
  - `buildRouterPrompt(userQuery)` — 拼装路由 prompt（包含可用模型清单和工具清单）
  - `parseRouterJson(content)` — JSON 解析 + 正则兜底
  - `buildFallbackDecision()` — 降级决策（默认模型 + 全工具）
  - `ROUTER_MODEL_ID = 'gemini-2.5-flash'` 常量

- `backend/src/routes/ai-agent.ts`
  - `POST /api/ai/agent-chat`
  - 流程：JWT 鉴权 → 积分扣减 → 路由 → 注入 system prompt → 调大模型 → SSE 返回
  - `X-Agent-Route` header 暴露路由决策（前端可选用）

### 修改

- `backend/src/routes/ai.ts`
  - `buildWorkContextPrompt` 加 `export`
  - `STYLE_PROMPTS` 加 `export`
  - `streamResponse` 加 `export`，扩展 `extraHeaders` 参数

- `backend/src/index.ts`
  - 导入 `agentChatRoutes` 并 `app.route('/api/ai', agentChatRoutes)`

- `frontend/js/app.js`
  - `runChatWithTools` 加 `?agent=1` 灰度开关
  - 启用时 fetch `/api/ai/agent-chat` 并过滤 `model/modelId/tools` 字段

### 不动

- `backend/src/services/llm.ts` 完全不动
- `backend/src/config/tools.ts` 完全不动
- `backend/src/config/presetModels.ts` 完全不动
- 数据库 schema 不动

## 路由 Prompt（agentRouter.ts:buildRouterPrompt）

输入用户的最后一条 user message + 当前可用模型和工具清单，输出 JSON：

```json
{
  "intent": "continue|polish|expand|rewrite|analyze|chat|other",
  "targetModelId": "<预设模型 id>",
  "enabledTools": ["<工具 name>", ...],
  "confidence": 0.0-1.0
}
```

**规则**（写在 prompt 里）：
1. 纯对话/咨询/不涉及编辑器内容 → `enabledTools` 为 `[]`
2. 涉及"这段/选中/这句" → 必须包含 `get_selection` 和 `replace_selection`
3. 涉及"全文/整体/通篇" → 必须包含 `get_full_text`
4. 涉及"角色/人物" → 包含 `get_characters`
5. 涉及"总纲/大纲" → 包含 `get_outline`
6. 长文创作（续写/扩写/改写） → `claude-sonnet-4-6`
7. 长上下文分析 → `gemini-2.5-pro`
8. 短任务（标题/简介/问候/简短回复） → `gemini-2.5-flash`
9. 逻辑/纠错/规划类 → `gpt-5.4`

## 验证方法

### 静态

```bash
cd backend && npm run typecheck
```

### 运行时

```bash
# 1. 启动 v2
cd /Users/mac1/projects/九章-v2/backend && npm run dev

# 2. 浏览器访问 http://localhost:3000/?agent=1
#    （注意 URL 末尾的 ?agent=1）

# 3. 在 AI 对话框输入测试 query，观察后端日志：
#    [agent-chat] route: intent=polish, model=claude-sonnet-4-6, tools=[get_selection,replace_selection], confidence=0.85
```

### 关键测试 case（路由准确率验证）

| 用户输入 | 期望 intent | 期望 model | 期望 tools |
|---------|------------|-----------|-----------|
| "继续往下写" | continue | claude-sonnet-4-6 | get_full_text, append_paragraph |
| "润色这段" | polish | claude-sonnet-4-6 | get_selection, replace_selection |
| "总纲里主角的成长线是怎样的？" | analyze | gemini-2.5-pro | get_outline |
| "帮我起个章节标题" | other (短任务) | gemini-2.5-flash | [] |
| "你好" | chat | gemini-2.5-flash | [] |

### 降级验证

mock 路由模型返回非法 JSON 或网络失败 → 日志应显示 `fallback=true`，仍正常返回结果。

## 性能数据（预估）

- 路由调用延迟：< 1.5s（gemini-2.5-flash 非流式典型值）
- 端到端延迟比 `/api/ai/chat` 多 300-800ms
- 一次请求占用 2 个 LLM 并发槽位（`MAX_CONCURRENT=10`）

## 后续延伸（V3 范围，不在本次）

- 路由结果缓存（同样的 query 直接复用决策）
- 用户偏好学习（记录用户拒绝路由后的修正，调整路由权重）
- 多步规划（"帮我写一章" 拆解为多步执行计划）

## 修改路由 prompt 的时机

跑一段时间发现：
- 准确率 < 80% → 改 `agentRouter.ts:buildRouterPrompt()` 增加更多规则示例
- 降级率 > 10% → 检查 `gemini-2.5-flash` 是否稳定，或换 `gpt-4o-mini` 做路由
- 延迟 > 2s → 评估是否换更快的路由模型
- 路由准 → 准备进入 V3 阶段（路由结果入库 + 用户偏好学习）

## 相关 Commit

- `V2 L3 路由层：用 gemini-2.5-flash 做意图路由`（核心实现）
- `L3 路由层完善：前端灰度切换 + 复用 streamResponse`（前端集成 + 重构）
