import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import {
  getPresetModels,
  getDefaultPresetModelId,
  toPublicModel,
} from '../config/presetModels.js';

const presetModelsRouter = new Hono();
presetModelsRouter.use('*', authMiddleware);

// GET /api/preset-models — 已配置 key 的内置模型列表（不含 apiKey/baseUrl）
presetModelsRouter.get('/', (c) => {
  const list = getPresetModels().map(toPublicModel);
  return c.json(list);
});

// GET /api/preset-models/default — 当前默认模型 ID
presetModelsRouter.get('/default', (c) => {
  const id = getDefaultPresetModelId();
  return c.json({ id });
});

export default presetModelsRouter;
