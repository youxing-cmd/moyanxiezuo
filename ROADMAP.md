# 九章 V2 体验优化路线

## 当前问题（已诊断）

1. **工具箱化过度**：20+ 个工具按钮按能力分类，用户要先判断"我该点哪个"。编辑和小白作者的核心路径不清晰。
2. **结果应用体验碎片化**：AI 工具结果分散在 4 种容器（工具库卡片/弹窗/底部浮层/聊天气泡），操作按钮各自拼接 HTML、独立绑定事件。
3. **高级能力暴露太早**：模型选择、工具选择、Prompt 调试对编辑/小白偏重，但直接摆在主路径上。
4. **缺乏编辑工作台**：编辑刚需是审稿报告→问题定位→修改建议→差异对比→一键替换→复核，目前未形成闭环。

---

## 任务分级

### P0 — 补回核心闭环（当前进行中）

| 任务 | 状态 | 验收标准 | 涉及文件 |
|---|---|---|---|
| 统一结果应用组件 | ✅ 已完成 | 7 个场景使用同一套 `createResultActionBar`（工具库卡片/润色弹窗/替换弹窗/纠错弹窗/去AI味弹窗/续写浮层/聊天气泡） | `components.js`, `components.css`, `interactions-ai.js`, `interactions-core.js`, `writing.js` |
| 隐藏高级能力 | ✅ 已完成 | 顶部导航栏无模型齿轮；写作页对话底部无模型/工具选择器；AI工具页无Prompt调试Tab；工具详情弹窗无"调试提示词"按钮；统一由 `isAdvancedMode()` 控制 | `index.html`, `writing.js`, `interactions-core.js`, `interactions-ai.js`, `profile.js`, `state.js` |
| 修复续写结果无 action bar | ✅ 已修复 | `handleContinueText()` 流式完成后补建 insert/copy action bar | `interactions-ai.js` |
| 修复 regenerate 按钮不渲染 | ✅ 已修复 | `createResultActionBar` btnDefs 和 switch 同时兼容 `retry`/`regenerate` | `components.js` |

**P0 验证命令**：
```bash
cd backend && npm run typecheck
cd frontend/js && node -c components.js && node -c interactions-ai.js && node -c interactions-core.js && node -c pages/writing.js && node -c pages/profile.js && node -c state.js
```

### P1 — 按任务闭环重组工具入口

**目标**：把"工具分类"改成"任务入口"。保留并强化 6 类高价值工具，其余降级为 AI 自动调用的内部能力。

| 任务 | 状态 | 验收标准 | 涉及文件 |
|---|---|---|---|
| 重构 AI 工具栏 | 待开始 | 写作页顶部 AI 工具栏从"续写/续写情节/替换/纠错/去AI味"改为"审稿/改稿/续写/设定检查/选题包装/新手引导" 6 个入口 | `writing.js`, `interactions-ai.js` |
| 审稿闭环（弹窗工作流） | 待开始 | 选中文本 → 一键审稿 → 显示问题定位列表 → 点击问题查看修改建议 → 差异对比 → 一键替换 → 复核 | `interactions-ai.js` |
| 修改执行闭环 | 待开始 | 润色/改写/去AI味合并为"改稿"入口，弹窗内统一走差异对比 → 一键替换流程 | `interactions-ai.js` |
| 连载助写闭环 | 待开始 | 续写正文/章纲到正文/卡文救援合并为"续写"入口 | `interactions-ai.js` |

### P2 — 编辑工作台 + 方法论沉淀

| 任务 | 状态 | 验收标准 | 涉及文件 |
|---|---|---|---|
| 编辑审稿报告面板 | 待开始 | 左栏"AI分析"Tab升级为"编辑工作台"，含：主编审稿报告、逻辑/人设/节奏/敏感词检查、版本对照、交稿状态 | `writing.js`, `interactions-content.js`, `backend/src/routes/ai.ts` |
| Skill/编辑方案系统 | 待开始 | UI 不叫 Skill，叫"编辑方案""审稿模板"。支持：资深网文主编审稿、女频情感线检查、男频爽点密度增强、短篇爆款拆解、章纲转正文工作流 | `backend/`, `frontend/js/` |
| 官方工作流嵌入 | 待开始 | 3-5 个官方高质量流程直接嵌入写作页主路径（审稿工作流、改稿工作流、续写工作流），不是放在 workflow.js 页面里展示 | `interactions-ai.js`, `workflow.js` |
| MCP-ready 工具 schema | 待开始 | 定义 8-10 个核心 tool schema：read_chapter/read_selection/read_character/read_outline/read_worldview/write_chapter/replace_selection/save_note/add_comment/check_consistency | `backend/src/config/tools.ts`, `backend/src/services/agentRouter.ts` |

---

## 技术边界（不要动）

| 文件/接口 | 原因 |
|---|---|
| `backend/src/services/llm.ts` | 已稳定，禁止改动 |
| `/api/ai/agent-chat` 的 SSE body 写入 | 前端透明是核心设计，决策只走日志和 `X-Agent-Route` header |
| `backend/src/services/agentRouter.ts` | 修改前必须跑 `L3-agent-router.md` 里的 5 个关键测试 case，准确率达标再合并 |
| `backend/.env` 中的密钥 | 红线：修改前必须问用户 |

---

## 设计原则

1. **按任务闭环组织，不按能力分类**。用户完成的是"审稿→修改→应用→复核"，不是"点润色按钮"。
2. **普通用户默认只看见任务入口**。模型选择、工具选择、Prompt 调试放到 `isAdvancedMode()` 控制下。
3. **结果应用统一走 `createResultActionBar`**。不再各处拼接 HTML。
4. **先做官方高质量流程，再开放自由编排**。当前 workflow.js 更像示例展示，先做 3-5 个真实闭环更有价值。
5. **Skill 有必要，但不要叫 Skill**。UI 上叫"编辑方案""审稿模板""创作流程"。
6. **MCP 先做 MCP-ready，不急着开放协议**。把现有工具统一成稳定内部 schema，等要接飞书/Notion/投稿平台时上真正 MCP。
