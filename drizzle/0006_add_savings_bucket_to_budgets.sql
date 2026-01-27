-- Migration: Add savings_bucket_id to budgets table
-- This enables budgets to target either expense categories OR savings buckets

-- Step 1: Drop the existing unique index on month and category_id
DROP INDEX IF EXISTS budget_month_category_idx;

-- Step 2: Make category_id nullable (it was previously NOT NULL)
ALTER TABLE "budgets" ALTER COLUMN "category_id" DROP NOT NULL;

-- Step 3: Add the new savings_bucket_id column (nullable)
ALTER TABLE "budgets" ADD COLUMN "savings_bucket_id" text;

-- Step 4: Add foreign key constraint for savings_bucket_id
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_savings_bucket_id_fkey"
  FOREIGN KEY ("savings_bucket_id") REFERENCES "savings_buckets"("id") ON DELETE RESTRICT;

-- Step 5: Add check constraint to ensure exactly one target is set
-- Either category_id OR savings_bucket_id must be set, but not both and not neither
ALTER TABLE "budgets" ADD CONSTRAINT "budget_target_check"
  CHECK (
    (category_id IS NOT NULL AND savings_bucket_id IS NULL) OR
    (category_id IS NULL AND savings_bucket_id IS NOT NULL)
  );

-- Step 6: Create unique index for month + category_id (when category_id is set)
CREATE UNIQUE INDEX "budget_month_category_idx"
  ON "budgets" ("month", "category_id")
  WHERE category_id IS NOT NULL;

-- Step 7: Create unique index for month + savings_bucket_id (when savings_bucket_id is set)
CREATE UNIQUE INDEX "budget_month_savings_bucket_idx"
  ON "budgets" ("month", "savings_bucket_id")
  WHERE savings_bucket_id IS NOT NULL;
