CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "type" "category_type" NOT NULL DEFAULT 'expense';--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "type" DROP DEFAULT;
