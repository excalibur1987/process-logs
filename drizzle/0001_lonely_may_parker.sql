CREATE TABLE "saved_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"filters" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_function_logs_type" ON "function_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_function_logs_message" ON "function_logs" USING btree ("message");--> statement-breakpoint
CREATE INDEX "idx_function_logs_func_id_row_date" ON "function_logs" USING btree ("func_id","row_date");--> statement-breakpoint
CREATE INDEX "idx_function_progress_source" ON "function_progress" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_function_progress_start_date_finished_success" ON "function_progress" USING btree ("start_date","finished","success");