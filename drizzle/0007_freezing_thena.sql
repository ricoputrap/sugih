-- Validate no orphaned records exist before adding constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM postings p LEFT JOIN transaction_events te ON p.event_id = te.id WHERE te.id IS NULL) THEN
        RAISE EXCEPTION 'Found orphaned postings with invalid event_id';
    END IF;
    IF EXISTS (SELECT 1 FROM postings WHERE wallet_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM wallets WHERE id = postings.wallet_id)) THEN
        RAISE EXCEPTION 'Found orphaned postings with invalid wallet_id';
    END IF;
    IF EXISTS (SELECT 1 FROM postings WHERE savings_bucket_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM savings_buckets WHERE id = postings.savings_bucket_id)) THEN
        RAISE EXCEPTION 'Found orphaned postings with invalid savings_bucket_id';
    END IF;
    IF EXISTS (SELECT 1 FROM transaction_events WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = transaction_events.category_id)) THEN
        RAISE EXCEPTION 'Found orphaned transaction_events with invalid category_id';
    END IF;
    IF EXISTS (SELECT 1 FROM budgets WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = budgets.category_id)) THEN
        RAISE EXCEPTION 'Found orphaned budgets with invalid category_id';
    END IF;
END $$;

DROP INDEX "budget_month_category_idx";--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "savings_bucket_id" text;--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_event_id_transaction_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."transaction_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_savings_bucket_id_savings_buckets_id_fk" FOREIGN KEY ("savings_bucket_id") REFERENCES "public"."savings_buckets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_savings_bucket_id_savings_buckets_id_fk" FOREIGN KEY ("savings_bucket_id") REFERENCES "public"."savings_buckets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_month_savings_bucket_idx" ON "budgets" USING btree ("month","savings_bucket_id") WHERE savings_bucket_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_month_category_idx" ON "budgets" USING btree ("month","category_id") WHERE category_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budget_target_check" CHECK ((category_id IS NOT NULL AND savings_bucket_id IS NULL) OR (category_id IS NULL AND savings_bucket_id IS NOT NULL));