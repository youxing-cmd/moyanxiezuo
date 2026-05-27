---
title: Jiuzhang Writing
sdk: docker
app_port: 7860
pinned: false
---

# Jiuzhang Writing

AI-assisted novel writing app.

This repository is configured so Hugging Face Spaces can run it as a Docker
Space. The backend serves both the API and the frontend on port 3000.

## Required Space Variables

Set these in the Space settings:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
DATABASE_DRIVER=neon
JWT_SECRET=...
WANGSU_BASE_URL=...
WANGSU_API_KEY=...
ENABLE_DYNAMIC_TRENDS=false
DISABLE_PLAYWRIGHT_CRAWL=true
```

Optional fallback model variables:

```env
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

Run database schema sync locally after creating the Neon database:

```bash
cd backend
DATABASE_URL='postgresql://...' npm run db:push
```
