CREATE INDEX "idx_postings_event_id" ON "postings" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_postings_wallet_id_created_at" ON "postings" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_postings_savings_bucket_id_created_at" ON "postings" USING btree ("savings_bucket_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_transaction_events_occurred_at" ON "transaction_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_transaction_events_type_occurred_at" ON "transaction_events" USING btree ("type","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_transaction_events_category_id_occurred_at" ON "transaction_events" USING btree ("category_id","occurred_at");