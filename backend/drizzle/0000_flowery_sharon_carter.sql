CREATE TABLE "agent_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"query" text NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"plan_id" integer,
	"progress" integer DEFAULT 0 NOT NULL,
	"error_msg" text DEFAULT '' NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_plan_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"parent_id" integer,
	"idx" integer DEFAULT 0 NOT NULL,
	"task_type" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"depends_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"artifact_id" integer,
	"reflection_result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_plan_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"query" text DEFAULT '' NOT NULL,
	"plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"query" text NOT NULL,
	"intent" text NOT NULL,
	"target_model_id" text NOT NULL,
	"enabled_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real NOT NULL,
	"fallback" boolean DEFAULT false NOT NULL,
	"raw_response" text,
	"user_feedback" text,
	"corrected_model_id" text,
	"corrected_tools" jsonb,
	"latency_ms" integer,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_step_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"step_id" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"conversation_id" text DEFAULT '',
	"type" text DEFAULT 'note' NOT NULL,
	"title" text DEFAULT '未命名' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"source_tool" text DEFAULT '',
	"source_model_id" text DEFAULT '',
	"status" text DEFAULT 'pending' NOT NULL,
	"linked_entity_type" text DEFAULT '',
	"linked_entity_id" integer,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_corrections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"chapter_id" integer,
	"ai_content" text DEFAULT '' NOT NULL,
	"user_action" text DEFAULT '' NOT NULL,
	"tool_type" text,
	"model_id" text,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "book_rankings" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"category" text NOT NULL,
	"rank" integer NOT NULL,
	"title" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"heat" text DEFAULT '' NOT NULL,
	"word_count" text DEFAULT '' NOT NULL,
	"status" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"fetched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chapter_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"work_id" integer NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"key_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"involved_characters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"open_hooks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"character_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chapter_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"volume" text DEFAULT '',
	"outline" text DEFAULT '',
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"name" text DEFAULT '未命名' NOT NULL,
	"role" text DEFAULT 'supporting' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"title" text DEFAULT '未命名草稿' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"source_type" text DEFAULT 'free' NOT NULL,
	"source_id" integer,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inspirations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"title" text DEFAULT '未命名灵感' NOT NULL,
	"source" text DEFAULT 'custom' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"length_type" text,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "model_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT '未命名模型' NOT NULL,
	"provider" text DEFAULT 'openai-compatible' NOT NULL,
	"base_url" text DEFAULT '' NOT NULL,
	"api_key" text DEFAULT '' NOT NULL,
	"model_name" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "outlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"title" text DEFAULT '总纲' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"related_id" integer,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"type" text DEFAULT 'background' NOT NULL,
	"name" text DEFAULT '未命名' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer NOT NULL,
	"chapter_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"earned_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tool_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_key" text NOT NULL,
	"prompt" text NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "tool_prompts_tool_key_unique" UNIQUE("tool_key")
);
--> statement-breakpoint
CREATE TABLE "trend_book_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"date_key" text NOT NULL,
	"seed_id" text DEFAULT 'auto' NOT NULL,
	"title" text NOT NULL,
	"hot_spot" text NOT NULL,
	"golden_finger" text NOT NULL,
	"core_hook" text NOT NULL,
	"character" text NOT NULL,
	"first_chapter" text NOT NULL,
	"outline" text DEFAULT '' NOT NULL,
	"model_used" text DEFAULT '' NOT NULL,
	"generated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trend_hot_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"raw_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trend_wind_vane" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"date_key" text NOT NULL,
	"title" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"suggestion" text NOT NULL,
	"avoid" text NOT NULL,
	"raw_analysis" jsonb DEFAULT '{"novelGenreTrends":[],"emotionTone":{"primary":"","secondary":"","implication":""},"audienceFocus":[],"trendingHooks":[]}'::jsonb NOT NULL,
	"model_used" text DEFAULT '' NOT NULL,
	"generated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar" text,
	"membership" text DEFAULT '免费版' NOT NULL,
	"points" integer DEFAULT 1000 NOT NULL,
	"token_percent" integer DEFAULT 100 NOT NULL,
	"work_count" integer DEFAULT 0 NOT NULL,
	"subscription_type" text DEFAULT 'none' NOT NULL,
	"subscription_expire_at" timestamp,
	"total_earned_points" integer DEFAULT 0 NOT NULL,
	"consecutive_submissions" integer DEFAULT 0 NOT NULL,
	"last_submission_at" timestamp,
	"last_check_in_at" timestamp,
	"feishu_union_id" text,
	"created_at" timestamp,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_feishu_union_id_unique" UNIQUE("feishu_union_id")
);
--> statement-breakpoint
CREATE TABLE "work_style_dna" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"avg_sentence_length" real,
	"short_sentence_ratio" real,
	"long_sentence_ratio" real,
	"dialogue_ratio" real,
	"avg_paragraph_length" integer,
	"common_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signature_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pacing_pattern" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "work_style_dna_work_id_unique" UNIQUE("work_id")
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"genre" text NOT NULL,
	"status" text DEFAULT 'unfinished' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emoji" text DEFAULT '📖' NOT NULL,
	"gradient" text DEFAULT '135deg, #1e3a5f, #0f2744' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"perspective" text DEFAULT 'third' NOT NULL,
	"channel" text DEFAULT 'male' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"cover" text DEFAULT '' NOT NULL,
	"inspiration" text DEFAULT '' NOT NULL,
	"analysis" text DEFAULT '' NOT NULL,
	"length_type" text DEFAULT 'long' NOT NULL,
	"source" text DEFAULT 'original' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
