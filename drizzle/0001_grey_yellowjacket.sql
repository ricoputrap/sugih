ALTER TABLE "wallets" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "type" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "type" SET DEFAULT 'bank';--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DATA TYPE varchar(3);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "currency" SET DEFAULT 'IDR';--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "savings_buckets" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "transaction_events" ALTER COLUMN "type" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "transaction_events" ALTER COLUMN "idempotency_key" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "month" SET DATA TYPE varchar(10);