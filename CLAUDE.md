# 九章写作

## 项目概述

AI辅助小说创作平台。完整TypeScript全栈应用。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Hono + Drizzle ORM + PostgreSQL (Neon/pg) + jose(JWT) |
| 前端 | 原生HTML + CSS + JS（纯CSS变量主题） |
| AI | OpenAI兼容API（通过.env配置） |

## 目录结构

```
├── backend/         # Hono后端
│   ├── src/
│   │   ├── index.ts           # 入口 + 静态文件托管
│   │   ├── db/
│   │   │   ├── schema.ts      # 数据库表定义（PostgreSQL）
│   │   │   └── index.ts       # Drizzle连接
│   │   ├── routes/
│   │   │   ├── auth.ts        # 认证
│   │   │   ├── works.ts       # 作品CRUD + 章节CRUD
│   │   │   ├── ai.ts          # AI对话/续写/润色/大纲
│   │   │   ├── ai-agent.ts    # L3 Agent路由端点 + L4反馈统计API
│   │   │   └── points.ts      # 积分/订阅系统
│   │   ├── services/
│   │   │   ├── llm.ts         # LLM调用层（稳定，禁止改动）
│   │   │   └── agentRouter.ts # L3路由层（小模型意图分析）
│   │   ├── config/
│   │   │   ├── tools.ts       # 工具注册表
│   │   │   └── presetModels.ts# 预设模型清单
│   │   └── middleware/
│   │       └── auth.ts        # JWT验证
├── frontend/        # 前端静态文件
│   ├── index.html
│   ├── css/
│   └── js/
├── CLAUDE.md        # 本文件
└── L3-agent-router.md # L3/L4 设计文档
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
- 前端：http://localhost:3001
- API：http://localhost:3001/api/*
- 健康检查：http://localhost:3001/health

## 数据库Schema

- **users**：id, username, phone, passwordHash, avatar, membership, points, tokenPercent, workCount, subscriptionType, subscriptionExpireAt
- **works**：id, userId, title, genre, status, tags[], emoji, gradient, wordCount, chapterCount, settings, perspective, channel, intro, cover, inspiration, analysis
- **chapters**：id, workId, title, content, wordCount, orderIndex, volume, outline
- **drafts**：id, workId, title, content, sourceType, sourceId
- **ai_conversations**：id, userId, workId, messages[]
- **characters**：id, workId, name, role, content, sort
- **outlines**：id, workId, title, content
- **settings**（作品设定）：id, workId, type, name, content, sort
- **inspirations**：id, userId, title, source, tags[], content
- **point_transactions**：id, userId, type, amount, description, relatedId
- **submissions**：id, userId, workId, chapterId, status, earnedPoints
- **model_configs**：id, userId, name, provider, baseUrl, apiKey, modelName, isDefault
- **trend_hot_data/trend_wind_vane/trend_book_analysis/book_rankings**：热点/榜单数据
- **agent_routes**：id, userId, workId, query, intent, targetModelId, enabledTools[], confidence, fallback, rawResponse, userFeedback, correctedModelId, correctedTools[], latencyMs

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
| POST | /api/ai/route-feedback | L4 路由反馈（用户对路由决策评分/修正） |
| GET | /api/ai/route-stats | L4 路由统计（fallback率、意图/模型分布、平均延迟） |
| POST | /api/ai/continue | AI续写 |
| POST | /api/ai/polish | AI润色 |
| POST | /api/ai/outline | 生成大纲 |
| GET | /api/points | 积分与订阅状态 |
| POST | /api/points/check-in | 每日签到 |
| POST | /api/points/earn | 完成任务得积分 |
| POST | /api/points/spend | 消费积分 |
| POST | /api/points/redeem | 积分兑换订阅时长 |
| GET | /api/points/transactions | 积分变动明细 |

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

## 开发约束

**修改路由层（`backend/src/services/agentRouter.ts`）前**：必须跑 `L3-agent-router.md` 里的 5 个关键测试 case，准确率达标再合并。

**禁止改动**：
- `backend/src/services/llm.ts`（已稳定）
- `/api/ai/agent-chat` 的 SSE body 写入路由决策（前端透明是核心设计，决策只走日志和 `X-Agent-Route` header）

**新增 AI 端点时**：复用 `backend/src/routes/ai.ts` 已导出的 `streamResponse(res, extraHeaders?)`、`buildWorkContextPrompt`、`TOOL_PROMPTS`、`STYLE_PROMPTS`，不要重复造轮子。

L3 路由层完整设计见 `L3-agent-router.md`。
