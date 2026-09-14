CREATE TABLE "topics" (
	"key" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"kind" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'catalog' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
