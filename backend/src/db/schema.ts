import { pgTable, serial, integer, text, timestamp, boolean, jsonb, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  membership: text('membership').notNull().default('免费版'),
  points: integer('points').notNull().default(1000),
  tokenPercent: integer('token_percent').notNull().default(100),
  workCount: integer('work_count').notNull().default(0),
  subscriptionType: text('subscription_type').notNull().default('none'),
  subscriptionExpireAt: timestamp('subscription_expire_at', { mode: 'date' }),
  totalEarnedPoints: integer('total_earned_points').notNull().default(0),
  consecutiveSubmissions: integer('consecutive_submissions').notNull().default(0),
  lastSubmissionAt: timestamp('last_submission_at', { mode: 'date' }),
  lastCheckInAt: timestamp('last_check_in_at', { mode: 'date' }),
  feishuUnionId: text('feishu_union_id').unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const works = pgTable('works', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  genre: text('genre').notNull(),
  status: text('status').notNull().default('unfinished'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  emoji: text('emoji').notNull().default('📖'),
  gradient: text('gradient').notNull().default('135deg, #1e3a5f, #0f2744'),
  wordCount: integer('word_count').notNull().default(0),
  chapterCount: integer('chapter_count').notNull().default(0),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  perspective: text('perspective').notNull().default('third'),
  channel: text('channel').notNull().default('male'),
  intro: text('intro').notNull().default(''),
  cover: text('cover').notNull().default(''),
  inspiration: text('inspiration').notNull().default(''),
  analysis: text('analysis').notNull().default(''),
  lengthType: text('length_type').notNull().default('long'),
  source: text('source').notNull().default('original'),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  workId: integer('work_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  wordCount: integer('word_count').notNull().default(0),
  orderIndex: integer('order_index').notNull().default(0),
  volume: text('volume').default(''),
  outline: text('outline').default(''),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const drafts = pgTable('drafts', {
  id: serial('id').primaryKey(),
  workId: integer('work_id').notNull(),
  title: text('title').notNull().default('未命名草稿'),
  content: text('content').notNull().default(''),
  sourceType: text('source_type').notNull().default('free'),
  sourceId: integer('source_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const aiConversations = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  workId: integer('work_id'),
  messages: jsonb('messages').$type<Array<Record<string, unknown>>>().notNull().default([]),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const toolPrompts = pgTable('tool_prompts', {
  id: serial('id').primaryKey(),
  toolKey: text('tool_key').notNull().unique(),
  prompt: text('prompt').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  workId: integer('work_id').notNull(),
  name: text('name').notNull().default('未命名'),
  role: text('role').notNull().default('supporting'),
  content: text('content').notNull().default(''),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const outlines = pgTable('outlines', {
  id: serial('id').primaryKey(),
  workId: integer('work_id').notNull(),
  title: text('title').notNull().default('总纲'),
  content: text('content').notNull().default(''),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const chapterVersions = pgTable('chapter_versions', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').notNull(),
  content: text('content').notNull().default(''),
  wordCount: integer('word_count').notNull().default(0),
  source: text('source').notNull().default('auto'),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const chapterSummaries = pgTable('chapter_summaries', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').notNull(),
  workId: integer('work_id').notNull(),
  summary: text('summary').notNull().default(''),
  keyEvents: jsonb('key_events').$type<string[]>().notNull().default([]),
  involvedCharacters: jsonb('involved_characters').$type<{ name: string; action: string }[]>().notNull().default([]),
  openHooks: jsonb('open_hooks').$type<string[]>().notNull().default([]),
  characterChanges: jsonb('character_changes').$type<{ name: string; change: string }[]>().notNull().default([]),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  workId: integer('work_id').notNull(),
  type: text('type').notNull().default('background'),
  name: text('name').notNull().default('未命名'),
  content: text('content').notNull().default(''),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const inspirations = pgTable('inspirations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull().default('未命名灵感'),
  source: text('source').notNull().default('custom'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  content: text('content').notNull().default(''),
  lengthType: text('length_type'),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const pointTransactions = pgTable('point_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  description: text('description').notNull().default(''),
  relatedId: integer('related_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  workId: integer('work_id').notNull(),
  chapterId: integer('chapter_id'),
  status: text('status').notNull().default('pending'),
  earnedPoints: integer('earned_points').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const modelConfigs = pgTable('model_configs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull().default('未命名模型'),
  provider: text('provider').notNull().default('openai-compatible'),
  baseUrl: text('base_url').notNull().default(''),
  apiKey: text('api_key').notNull().default(''),
  modelName: text('model_name').notNull().default(''),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const trendHotData = pgTable('trend_hot_data', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(),
  rawData: jsonb('raw_data').$type<Array<{ title: string; hot?: number | string; url?: string }>>().notNull().default([]),
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const trendWindVane = pgTable('trend_wind_vane', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  dateKey: text('date_key').notNull(),
  title: text('title').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  summary: text('summary').notNull(),
  suggestion: text('suggestion').notNull(),
  avoid: text('avoid').notNull(),
  rawAnalysis: jsonb('raw_analysis').$type<{
    novelGenreTrends: Array<{ genre: string; heat: number; reason: string }>;
    emotionTone: { primary: string; secondary: string; implication: string };
    audienceFocus: string[];
    trendingHooks: Array<{ hook: string; windowDays: number; exploitAngle: string }>;
  }>().notNull().default({
    novelGenreTrends: [],
    emotionTone: { primary: '', secondary: '', implication: '' },
    audienceFocus: [],
    trendingHooks: [],
  }),
  modelUsed: text('model_used').notNull().default(''),
  generatedAt: timestamp('generated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const trendBookAnalysis = pgTable('trend_book_analysis', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  dateKey: text('date_key').notNull(),
  seedId: text('seed_id').notNull().default('auto'),
  title: text('title').notNull(),
  hotSpot: text('hot_spot').notNull(),
  goldenFinger: text('golden_finger').notNull(),
  coreHook: text('core_hook').notNull(),
  character: text('character').notNull(),
  firstChapter: text('first_chapter').notNull(),
  outline: text('outline').notNull().default(''),
  modelUsed: text('model_used').notNull().default(''),
  generatedAt: timestamp('generated_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const bookRankings = pgTable('book_rankings', {
  id: serial('id').primaryKey(),
  platform: text('platform').notNull(),
  category: text('category').notNull(),
  rank: integer('rank').notNull(),
  title: text('title').notNull(),
  author: text('author').notNull().default(''),
  heat: text('heat').notNull().default(''),
  wordCount: text('word_count').notNull().default(''),
  status: text('status').notNull().default(''),
  url: text('url').notNull().default(''),
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).$defaultFn(() => new Date()),
});

export const agentRoutes = pgTable('agent_routes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  workId: integer('work_id'),
  query: text('query').notNull(),
  intent: text('intent').notNull(),
  targetModelId: text('target_model_id').notNull(),
  enabledTools: jsonb('enabled_tools').$type<string[]>().notNull().default([]),
  confidence: real('confidence').notNull(),
  fallback: boolean('fallback').notNull().default(false),
  rawResponse: text('raw_response'),
  userFeedback: text('user_feedback'),
  correctedModelId: text('corrected_model_id'),
  correctedTools: jsonb('corrected_tools').$type<string[]>(),
  latencyMs: integer('latency_ms'),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
});
