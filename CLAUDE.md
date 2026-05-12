# 九章写作

## 项目概述

AI辅助小说创作平台。完整TypeScript全栈应用。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Hono + Drizzle ORM + better-sqlite3 + jose(JWT) |
| 前端 | 原生HTML + CSS + JS（纯CSS变量主题） |
| AI | OpenAI兼容API（通过.env配置） |

## 目录结构

```
├── backend/         # Hono后端
│   ├── src/
│   │   ├── index.ts           # 入口 + 静态文件托管
│   │   ├── db/
│   │   │   ├── schema.ts      # 数据库表定义
│   │   │   └── index.ts       # Drizzle连接
│   │   ├── routes/
│   │   │   ├── auth.ts        # 认证（注册/登录/用户信息）
│   │   │   ├── works.ts       # 作品CRUD + 章节CRUD
│   │   │   └── ai.ts          # AI对话/续写/润色/大纲
│   │   └── middleware/
│   │       └── auth.ts        # JWT验证
│   └── data/jiuzhang.db       # SQLite数据库
├── frontend/        # 前端静态文件
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── CLAUDE.md        # 本文件
```

## 命令

### 后端
```bash
cd backend
npm run dev       # 开发模式（tsx watch），端口3000
npm run start     # 生产模式
npm run db:push   # 推送数据库schema变更
npm run typecheck # TypeScript类型检查
```

### 访问
- 前端：http://localhost:3000
- API：http://localhost:3000/api/*
- 健康检查：http://localhost:3000/health

## 数据库Schema

- **users**：id, username, phone, passwordHash, avatar, membership, points, tokenPercent, workCount
- **works**：id, userId, title, genre, status, tags[], emoji, gradient, wordCount, chapterCount, settings
- **chapters**：id, workId, title, content, wordCount, orderIndex
- **ai_conversations**：id, userId, workId, messages[]

## API清单

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 登录 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/me | 更新用户信息 |
| GET | /api/works | 作品列表 |
| POST | /api/works | 创建作品 |
| GET | /api/works/:id | 作品详情（含章节） |
| PUT | /api/works/:id | 更新作品 |
| DELETE | /api/works/:id | 删除作品 |
| GET | /api/works/:id/chapters | 章节列表 |
| POST | /api/works/:id/chapters | 创建章节 |
| PUT | /api/works/:id/chapters/:cid | 更新章节 |
| DELETE | /api/works/:id/chapters/:cid | 删除章节 |
| POST | /api/ai/chat | AI对话（SSE流式，支持手动选模型/工具） |
| POST | /api/ai/agent-chat | L3 路由层（gemini-2.5-flash 自动选模型和工具，SSE 流式） |
| POST | /api/ai/continue | AI续写 |
| POST | /api/ai/polish | AI润色 |
| POST | /api/ai/outline | 生成大纲 |

## 配置

编辑 `backend/.env`：
```
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your-api-key
AI_MODEL=gpt-4o-mini
```

## 验证

1. `cd backend && npm run dev`
2. 打开 http://localhost:3000
3. 注册/登录
4. 创建作品 → 进入编辑器 → 写内容 → 保存
5. 刷新页面，数据应持久化

## L3 Agent 路由层（Router-Worker 架构）

**目标**：用小模型做意图路由，避免每次都用顶级大模型 + 全工具集。

**核心文件**：
- `backend/src/services/agentRouter.ts` — 路由服务（`routeAgentRequest()`）
- `backend/src/routes/ai-agent.ts` — 端点 `POST /api/ai/agent-chat`
- `backend/src/routes/ai.ts` — 共享 `buildWorkContextPrompt`/`TOOL_PROMPTS`/`STYLE_PROMPTS`/`streamResponse`

**关键决策（不要改）**：
- 路由模型：`gemini-2.5-flash`（速度快、便宜、支持 JSON）
- 路由失败降级：默认模型（`claude-sonnet-4-6`）+ 全工具集，不阻塞用户
- JSON 解析：先去 markdown 围栏 → JSON.parse → 失败正则兜底（沿用 `/tool-match` 模式）
- 路由对前端透明：决策只走日志（`[agent-chat] route: ...`）和 HTTP header（`X-Agent-Route`），不写入 SSE body
- 灰度开关：前端 URL 加 `?agent=1` 走 L3，否则走原 `/api/ai/chat`

**调试**：
- 路由决策日志：后端 console 看 `[agent-chat] route: intent=..., model=..., tools=[...], confidence=...`
- 路由 prompt 在 `agentRouter.ts:buildRouterPrompt()`，需要修规则时改这里
- 路由模型 ID 在 `agentRouter.ts:ROUTER_MODEL_ID` 常量

**详细方案**：见 `L3-agent-router.md`
