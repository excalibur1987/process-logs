CREATE INDEX "idx_function_headers_func_name" ON "function_headers" USING btree ("func_name");--> statement-breakpoint
CREATE INDEX "idx_function_progress_parent_id_start_date" ON "function_progress" USING btree ("parent_id","start_date");--> statement-breakpoint
CREATE INDEX "idx_function_progress_func_header_id_start_date" ON "function_progress" USING btree ("func_header_id","start_date");--> statement-breakpoint
CREATE INDEX "idx_function_progress_finished_start_date" ON "function_progress" USING btree ("finished","start_date");