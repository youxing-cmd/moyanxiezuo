# 基于 Playwright 官方镜像，与 backend 中 playwright 版本保持一致（1.59.1）
# 该镜像已预装 Chromium 和系统依赖，无需再次下载
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# 跳过 playwright 重复下载浏览器（基础镜像已自带）
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 先 copy 依赖清单，便于 docker layer 缓存
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --ignore-scripts
RUN cd backend && npm rebuild

# 运行阶段设为 production（npm ci 已结束，devDeps 已装好 tsx）
ENV NODE_ENV=production

# 复制源代码
COPY backend ./backend
COPY frontend ./frontend

# 日志目录预创建（运行时通过 volume 挂载）
RUN mkdir -p /app/backend/logs \
  && chown -R 1000:1000 /app

# 暴露后端端口（前端经后端静态托管）
EXPOSE 3000

WORKDIR /app/backend

USER 1000:1000

# 直接用 tsx 跑 TypeScript（与 npm start 一致）
CMD ["npm", "start"]
