CREATE TABLE "agent_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"trigger_type" text NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"job_id" integer,
	"content" text,
	"artifact_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "creation_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"work_id" integer,
	"chapter_id" integer,
	"type" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_proactive_settings" (
	"user_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"idle_timeout_seconds" integer DEFAULT 300 NOT NULL,
	"stagnation_word_count" integer DEFAULT 2000 NOT NULL,
	"fatigue_threshold" integer DEFAULT 3 NOT NULL,
	"fatigue_cooldown_minutes" integer DEFAULT 60 NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "user_proactive_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "trigger_type" text;--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD COLUMN "suggestion_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_goal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weekly_goal_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "writing_memory" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_proactive_settings" ADD CONSTRAINT "user_proactive_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;