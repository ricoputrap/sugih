CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'bank' NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_name_unique` ON `wallets` (`name`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `savings_buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `savings_buckets_name_unique` ON `savings_buckets` (`name`);--> statement-breakpoint
CREATE TABLE `postings` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`wallet_id` text,
	`savings_bucket_id` text,
	`amount_idr` integer NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `transaction_events` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` integer NOT NULL,
	`type` text NOT NULL,
	`note` text,
	`payee` text,
	`category_id` text,
	`deleted_at` integer,
	`created_at` integer,
	`updated_at` integer,
	`idempotency_key` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_events_idempotency_key_unique` ON `transaction_events` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_idr` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_month_category_idx` ON `budgets` (`month`,`category_id`);