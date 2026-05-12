# 免费部署方案：Hugging Face Spaces + Neon

目标：不绑卡，尽量免费可用。

## 方案

- 应用容器：Hugging Face Spaces，选择 Docker SDK 和免费 CPU。
- 数据库：Neon Free Postgres。
- 代码来源：GitHub 仓库。

不建议用 Vercel / Netlify 直接部署当前项目，因为当前后端是常驻 Node 服务，并且包含 SSE 流式 AI 接口、定时任务和 PostgreSQL 连接。

Hugging Face Spaces 对出站网络端口有限制，普通 PostgreSQL 的 5432 端口可能不可用。本项目已经在连接 Neon 时自动使用 `@neondatabase/serverless`，并建议显式设置 `DATABASE_DRIVER=neon`。

## 1. 创建 Neon 数据库

1. 打开 https://neon.tech/ 并注册。
2. 创建一个 Free 项目。
3. 进入项目的 Connection details。
4. 复制连接串，格式类似：

```env
postgresql://user:password/host/dbname?sslmode=require
```

后面把这个值作为 `DATABASE_URL`。

## 2. 同步数据库表

在本机项目根目录执行：

```bash
cd backend
npm ci
DATABASE_URL='把 Neon 连接串粘到这里' npm run db:push
```

如果已经安装过依赖，可以跳过 `npm ci`。

## 3. 创建 Hugging Face Space

1. 打开 https://huggingface.co/spaces。
2. New Space。
3. Space SDK 选择 Docker。
4. Hardware 选择免费的 CPU。
5. Visibility 可先选 Private，测试完再 Public。
6. 把这个 GitHub 仓库连接到 Space，或者把代码 push 到 Space 的 Git 仓库。

本仓库根目录已经有 Hugging Face 需要的 `README.md` 元数据：

```yaml
sdk: docker
app_port: 3000
```

## 4. 配置 Space 环境变量

进入 Space 的 Settings -> Variables and secrets。

建议放 Secrets：

```env
DATABASE_URL=Neon 连接串
JWT_SECRET=用 openssl rand -hex 32 生成的值
WANGSU_API_KEY=你的 AI 网关密钥
AI_API_KEY=可选兜底 AI 密钥
```

建议放 Variables：

```env
NODE_ENV=production
PORT=3000
DATABASE_DRIVER=neon
WANGSU_BASE_URL=你的 AI 网关地址
AI_BASE_URL=可选兜底 AI 地址
AI_MODEL=可选兜底模型名
ENABLE_DYNAMIC_TRENDS=false
DISABLE_PLAYWRIGHT_CRAWL=true
```

生成 `JWT_SECRET`：

```bash
openssl rand -hex 32
```

## 5. 触发部署

推送代码后，Hugging Face 会自动 build Docker 镜像。

部署成功后访问：

```text
https://你的用户名-你的space名.hf.space
```

健康检查地址：

```text
https://你的用户名-你的space名.hf.space/health
```

## 6. 常见问题

- Space 睡眠：免费服务可能会休眠，首次访问会慢一点。
- AI 不可用：检查 `WANGSU_BASE_URL` 和 `WANGSU_API_KEY`。
- 登录失败：检查 `JWT_SECRET` 是否存在。
- 数据保存失败：检查 `DATABASE_URL`，并确认已经执行过 `npm run db:push`。
- 不要开启付费硬件、持久化存储或付费数据库档位，否则可能要求绑定付款方式。
