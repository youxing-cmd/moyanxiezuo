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
| POST | /api/ai/chat | AI对话（SSE流式） |
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
