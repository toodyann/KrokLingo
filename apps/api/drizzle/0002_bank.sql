CREATE TABLE "bank_collections" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"lang" text DEFAULT 'en' NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_passages" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"topic" text NOT NULL,
	"text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct" integer NOT NULL,
	"explanation" text,
	"passage_id" text,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bank_questions_collection" ON "bank_questions" USING btree ("collection_id","position");--> statement-breakpoint
-- Read through the API only, like the user tables (see 0001_enable_rls.sql).
ALTER TABLE "bank_meta" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_passages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_questions" ENABLE ROW LEVEL SECURITY;
