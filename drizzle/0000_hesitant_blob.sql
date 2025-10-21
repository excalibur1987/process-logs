CREATE TABLE "function_headers" (
	"id" serial PRIMARY KEY NOT NULL,
	"func_name" varchar(200) NOT NULL,
	"func_slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "function_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"row_date" timestamp with time zone NOT NULL,
	"func_id" integer NOT NULL,
	"type" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"trace_back" text
);
--> statement-breakpoint
CREATE TABLE "function_progress" (
	"func_id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"slug" varchar(200),
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"finished" boolean NOT NULL,
	"success" boolean NOT NULL,
	"source" varchar(20) DEFAULT '' NOT NULL,
	"args" json,
	"func_header_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "function_progress_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"func_id" integer NOT NULL,
	"prog_id" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"current_value" numeric NOT NULL,
	"max_value" numeric,
	"duration" numeric,
	"last_updated" timestamp with time zone NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "function_logs" ADD CONSTRAINT "fk_function_logs_func_id_function_progress" FOREIGN KEY ("func_id") REFERENCES "public"."function_progress"("func_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "function_progress" ADD CONSTRAINT "fk_function_progress_parent_id_function_progress" FOREIGN KEY ("parent_id") REFERENCES "public"."function_progress"("func_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "function_progress" ADD CONSTRAINT "function_progress_function_headers_fk" FOREIGN KEY ("func_header_id") REFERENCES "public"."function_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "function_progress_tracking" ADD CONSTRAINT "fk_function_progress_tracking_func_id_function_progress" FOREIGN KEY ("func_id") REFERENCES "public"."function_progress"("func_id") ON DELETE no action ON UPDATE no action;