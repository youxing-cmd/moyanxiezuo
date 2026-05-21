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
├── backend/
│   ├── src/
│   │   ├── index.ts              # 入口 + 路由挂载 + 静态文件托管
│   │   ├── db/
│   │   │   ├── schema.ts         # 数据库表定义（PostgreSQL，22张表）
│   │   │   └── index.ts          # Drizzle连接
│   │   ├── routes/
│   │   │   ├── auth.ts           # 认证（注册/登录/验证码/飞书）
│   │   │   ├── works.ts          # 作品CRUD + 章节CRUD + 版本 + 导入/导出
│   │   │   ├── metadata.ts       # 角色/设定/大纲/草稿管理
│   │   │   ├── ai.ts             # AI对话/续写/润色/大纲/工具/Artifacts
│   │   │   ├── ai-agent.ts       # L3 Agent路由端点 + L4反馈统计API
│   │   │   ├── points.ts         # 积分/订阅系统
│   │   │   ├── inspirations.ts   # 灵感库CRUD + 回收站
│   │   │   ├── trends.ts         # 热点/榜单数据 + 分析
│   │   │   ├── stats.ts          # 用户写作统计
│   │   │   ├── model-configs.ts  # 自定义模型配置CRUD
│   │   │   └── preset-models.ts  # 预设模型清单
│   │   ├── services/
│   │   │   ├── llm.ts            # LLM调用层（稳定，禁止改动）
│   │   │   ├── agentRouter.ts    # L3路由层（小模型意图分析）
│   │   │   ├── contextBuilder.ts # 工作区上下文构建
│   │   │   ├── chapterSummary.ts # 章节摘要生成
│   │   │   ├── styleDNA.ts       # 风格DNA提取与注入
│   │   │   ├── bookCrawler.ts    # 书籍爬取
│   │   │   ├── dailyHotApi.ts    # 热点API聚合
│   │   │   ├── trendsAnalysis.ts # 热点分析
│   │   │   ├── trendsInspiration.ts # 热点灵感生成
│   │   │   └── feishu.ts         # 飞书登录服务
│   │   ├── config/
│   │   │   ├── tools.ts          # 工具注册表
│   │   │   ├── presetModels.ts   # 预设模型清单
│   │   │   └── reviewAgents.ts   # 审稿Agent配置
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT验证中间件
│   │   ├── jobs/
│   │   │   └── scheduler.ts      # 定时任务（热点数据更新等）
│   │   └── types/
│   │       └── opentype.d.ts     # 类型声明
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── base.css
│   │   ├── themes.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── editor.css
│   │   ├── modals.css
│   │   ├── pages.css
│   │   ├── auth.css
│   │   └── responsive.css
│   └── js/
│       ├── main.js               # 路由 + 页面初始化
│       ├── app.js                # 应用级逻辑（含 ?agent=1 灰度）
│       ├── auth.js               # 认证逻辑
│       ├── api.js                # API封装
│       ├── state.js              # 全局状态（含 isAdvancedMode）
│       ├── utils.js              # 工具函数
│       ├── config.js             # 前端配置
│       ├── components.js         # 通用组件（createResultActionBar等）
│       ├── editor-core.js        # 编辑器核心
│       ├── interactions-core.js  # 核心交互（调试面板、工具库）
│       ├── interactions-ai.js    # AI交互（续写/润色/审稿/去AI味等）
│       ├── interactions-content.js # 内容交互
│       ├── interactions-works.js # 作品交互
│       ├── interactions-writing.js # 写作页交互
│       ├── page-utils.js         # 页面工具
│       ├── pages/
│       │   ├── dashboard.js      # 首页仪表盘
│       │   ├── works.js          # 作品列表
│       │   ├── work-detail.js    # 作品详情
│       │   ├── writing.js        # 写作页（核心页面）
│       │   ├── workflow.js       # 工作流展示
│       │   ├── inspiration.js    # 灵感库
│       │   ├── trends.js         # 热点/榜单
│       │   ├── profile.js        # 个人设置
│       │   ├── center.js         # 用户中心
│       │   ├── analytics.js      # 数据分析
│       │   └── model-configs.js  # 模型配置
│       └── demo/
│           └── writing-views.js  # 写作页视图演示
├── CLAUDE.md                     # 本文件
├── L3-agent-router.md            # L3/L4 设计文档
├── ROADMAP.md                    # V2 体验优化路线
├── 开发计划-v2v3v4.md            # 排期计划
├── AGENTS.md                     # Agent提示词与配置
├── AGENTS.md                     # Agent提示词与配置
└── DEPLOY_FREE.md                # 免费部署指南
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

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| **users** | 用户 | username, phone, passwordHash, avatar, membership, points, tokenPercent, workCount, subscriptionType, subscriptionExpireAt |
| **works** | 作品 | userId, title, genre, status, tags[], emoji, gradient, wordCount, chapterCount, settings, perspective, channel, intro, cover, inspiration, analysis |
| **chapters** | 章节 | workId, title, content, wordCount, orderIndex, volume, outline |
| **drafts** | 草稿 | workId, title, content, sourceType, sourceId |
| **aiConversations** | AI对话 | userId, workId, messages[] |
| **characters** | 角色 | workId, name, role, content, sort |
| **outlines** | 大纲 | workId, title, content |
| **settings** | 作品设定 | workId, type, name, content, sort |
| **inspirations** | 灵感 | userId, title, source, tags[], content |
| **pointTransactions** | 积分变动 | userId, type, amount, description, relatedId |
| **submissions** | 投稿记录 | userId, workId, chapterId, status, earnedPoints |
| **modelConfigs** | 自定义模型配置 | userId, name, provider, baseUrl, apiKey, modelName, isDefault |
| **trendHotData** | 热点数据 | platform, title, hotValue, rank, date |
| **trendWindVane** | 风向数据 | category, trend, score |
| **trendBookAnalysis** | 书籍分析 | bookId, platform, analysis |
| **bookRankings** | 书籍排行 | platform, rank, bookInfo |
| **agentRoutes** | 路由决策日志 | userId, workId, query, intent, targetModelId, enabledTools[], confidence, fallback, rawResponse, userFeedback, correctedModelId, correctedTools[], latencyMs |
| **toolPrompts** | 工具提示词 | tool, prompt, isCustom |
| **chapterVersions** | 章节版本 | chapterId, content, wordCount, createdAt |
| **chapterSummaries** | 章节摘要 | chapterId, summary, keyEvents |
| **workStyleDNA** | 风格DNA | workId, styleFingerprint, lastAnalyzedAt |
| **aiCorrections** | AI修正记录 | userId, workId, original, corrected, applied |
| **aiArtifacts** | AI产物 | userId, workId, type, content, linkedEntityType, linkedEntityId |

## API清单

### 认证 /api/auth/*

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 注册 |
| POST | /api/auth/login | 密码登录 |
| POST | /api/auth/send-code | 发送手机验证码 |
| POST | /api/auth/login-by-code | 验证码登录 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/me | 更新用户信息 |
| POST | /api/auth/change-phone | 换绑手机 |
| GET | /api/auth/feishu/url | 飞书授权URL |
| GET | /api/auth/feishu/callback | 飞书回调 |

### 作品 /api/works/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/works | 作品列表 |
| POST | /api/works | 创建作品 |
| GET | /api/works/trash | 回收站 |
| GET | /api/works/:id | 作品详情 |
| PUT | /api/works/:id | 更新作品 |
| DELETE | /api/works/:id | 删除作品（软删） |
| POST | /api/works/:id/restore | 恢复作品 |
| DELETE | /api/works/:id/permanent | 永久删除 |
| GET | /api/works/:id/chapter-summaries | 章节摘要 |
| GET | /api/works/:id/style-dna | 风格DNA |
| GET | /api/works/:id/chapters | 章节列表 |
| POST | /api/works/:id/chapters | 创建章节 |
| GET | /api/works/:id/chapters/:cid | 章节详情 |
| PUT | /api/works/:id/chapters/:cid | 更新章节 |
| DELETE | /api/works/:id/chapters/:cid | 删除章节 |
| PUT | /api/works/:id/chapters/reorder | 章节重排 |
| GET | /api/works/:id/export | 导出作品 |
| GET | /api/works/:id/chapters/:cid/export | 导出章节 |
| GET | /api/works/:id/chapters/:cid/versions | 版本列表 |
| POST | /api/works/:id/chapters/:cid/versions | 创建版本 |
| GET | /api/works/:id/chapters/:cid/versions/:vid | 版本详情 |
| POST | /api/works/:id/chapters/:cid/versions/:vid/restore | 恢复版本 |
| POST | /api/works/import | 导入作品（txt/docx/doc） |

### 元数据 /api/metadata/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/metadata/:id/characters | 角色列表 |
| POST | /api/metadata/:id/characters | 创建角色 |
| PUT | /api/metadata/:id/characters/:cid | 更新角色 |
| DELETE | /api/metadata/:id/characters/:cid | 删除角色 |
| PUT | /api/metadata/:id/characters/reorder | 角色重排 |
| GET | /api/metadata/:id/settings | 设定列表 |
| POST | /api/metadata/:id/settings | 创建设定 |
| PUT | /api/metadata/:id/settings/:sid | 更新设定 |
| DELETE | /api/metadata/:id/settings/:sid | 删除设定 |
| PUT | /api/metadata/:id/settings/reorder | 设定重排 |
| GET | /api/metadata/:id/outlines | 大纲列表 |
| POST | /api/metadata/:id/outlines | 创建大纲 |
| PUT | /api/metadata/:id/outlines/:oid | 更新大纲 |
| DELETE | /api/metadata/:id/outlines/:oid | 删除大纲 |
| GET | /api/metadata/:id/drafts | 草稿列表 |
| POST | /api/metadata/:id/drafts | 创建草稿 |
| PUT | /api/metadata/:id/drafts/:did | 更新草稿 |
| DELETE | /api/metadata/:id/drafts/:did | 删除草稿 |

### AI /api/ai/*

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat | AI对话（SSE流式，支持手动选模型/工具） |
| GET | /api/ai/conversations | 获取对话历史 |
| POST | /api/ai/conversations | 保存对话 |
| GET | /api/ai/artifacts | 获取Artifacts |
| GET | /api/ai/artifacts/:id | 获取单个Artifact |
| POST | /api/ai/artifacts | 创建Artifact |
| PUT | /api/ai/artifacts/:id | 更新Artifact |
| DELETE | /api/ai/artifacts/:id | 删除Artifact |
| POST | /api/ai/continue | AI续写 |
| POST | /api/ai/polish | AI润色 |
| POST | /api/ai/outline | 生成大纲 |
| POST | /api/ai/expand | 扩写 |
| POST | /api/ai/character | 角色生成 |
| POST | /api/ai/chapter-outline | 章纲生成 |
| POST | /api/ai/inspiration | 灵感生成 |
| POST | /api/ai/fuse-inspirations | 灵感融合 |
| POST | /api/ai/titles | 标题生成 |
| POST | /api/ai/rewrite | 改写 |
| POST | /api/ai/detect | AI纠错 |
| POST | /api/ai/de-ai | 去AI味 |
| POST | /api/ai/scene | 场景生成 |
| POST | /api/ai/dialogue | 对话生成 |
| POST | /api/ai/conflict | 冲突生成 |
| POST | /api/ai/foreshadow | 伏笔生成 |
| POST | /api/ai/pacing | 节奏生成 |
| POST | /api/ai/hook | 钩子生成 |
| POST | /api/ai/blurb | 简介生成 |
| POST | /api/ai/tool-match | 工具匹配 |
| GET | /api/ai/tool-prompts | 工具提示词列表 |
| GET | /api/ai/tool-prompts/:tool | 单个工具提示词 |
| PUT | /api/ai/tool-prompts/:tool | 更新工具提示词 |
| POST | /api/ai/tool-prompts/:tool/test | 测试工具提示词 |
| POST | /api/ai/tool-prompts/:tool/reset | 重置单个工具提示词 |
| POST | /api/ai/tool-prompts/reset | 重置所有工具提示词 |
| POST | /api/ai/tools/:name | 执行指定工具 |
| POST | /api/ai/chapter-review | 章节审稿 |
| POST | /api/ai/corrections | 修改建议应用 |
| POST | /api/ai/debug/preview-context | 调试上下文预览 |

### Agent /api/ai/*

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/agent-chat | L3 路由层（gemini-2.5-flash 自动选模型和工具，SSE 流式） |
| POST | /api/ai/route-feedback | L4 路由反馈（用户对路由决策评分/修正） |
| GET | /api/ai/route-stats | L4 路由统计（fallback率、意图/模型分布、平均延迟） |

### 积分 /api/points/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/points | 积分与订阅状态 |
| POST | /api/points/check-in | 每日签到 |
| POST | /api/points/earn | 完成任务得积分 |
| POST | /api/points/spend | 消费积分 |
| GET | /api/points/transactions | 积分变动明细 |
| POST | /api/points/redeem | 积分兑换订阅时长 |

### 灵感 /api/inspirations/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/inspirations | 灵感列表 |
| GET | /api/inspirations/trash | 回收站 |
| POST | /api/inspirations | 创建灵感 |
| GET | /api/inspirations/:id | 灵感详情 |
| PUT | /api/inspirations/:id | 更新灵感 |
| DELETE | /api/inspirations/:id | 软删除 |
| POST | /api/inspirations/:id/restore | 恢复 |
| DELETE | /api/inspirations/:id/permanent | 永久删除 |
| DELETE | /api/inspirations/trash/clear | 清空回收站 |

### 热点 /api/trends/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/trends | 热点/榜单数据聚合 |
| POST | /api/trends/generate-inspiration | 从热点生成灵感 |
| POST | /api/trends/generate-from-seed | 从种子生成 |
| POST | /api/trends/analyze-hot | 热点分析 |
| POST | /api/trends/crawl-books | 爬取书籍 |

### 统计 /api/stats/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/stats | 用户写作统计 |

### 模型配置 /api/model-configs/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/model-configs | 模型配置列表 |
| GET | /api/model-configs/default | 默认配置 |
| POST | /api/model-configs | 创建配置 |
| PUT | /api/model-configs/:id | 更新配置 |
| DELETE | /api/model-configs/:id | 删除配置 |
| POST | /api/model-configs/:id/set-default | 设为默认 |
| POST | /api/model-configs/:id/test | 测试配置 |

### 预设模型 /api/preset-models/*

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/preset-models | 预设模型列表 |
| GET | /api/preset-models/default | 默认预设模型 |

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
- `backend/.env` 中的密钥（修改前必须问用户）

**新增 AI 端点时**：复用 `backend/src/routes/ai.ts` 已导出的 `streamResponse(res, extraHeaders?)`、`buildWorkContextPrompt`、`TOOL_PROMPTS`、`STYLE_PROMPTS`，不要重复造轮子。

**前端组件复用**：AI 结果统一使用 `createResultActionBar(container, options)`（`frontend/js/components.js`），支持 insert/copy/replace/retry/regenerate/inspiration/quote 动作。

**高级模式控制**：通过 `isAdvancedMode()`（`frontend/js/state.js`）控制模型选择器、工具选择器、Prompt调试Tab 的显隐。普通用户默认只看见任务入口。

L3 路由层完整设计见 `L3-agent-router.md`。
V2 体验优化路线见 `ROADMAP.md`。
