# Plan: Allocating Budget for Savings Buckets (Enhancement 5)

**Goal:** Enable users to allocate monthly budgets for savings buckets, allowing precise money allocation planning for both expenses and savings.

## Context

- Currently, budgets only support expense categories via `category_id`
- Savings buckets exist as a separate entity in `SavingsBucket` module
- User wants to plan monthly allocations to savings buckets (e.g., "Child School" savings for February 2026)
- This follows the envelope budgeting method where money is allocated to various "envelopes"

## Approach Decision

**Selected: Extend budgets table to support savings buckets**

This approach is chosen because:

1. Budgets and savings allocations share the same concept (allocating money for a month)
2. They can be viewed together in the same Budget UI
3. Simpler than creating a separate module
4. Budget summary can naturally include savings allocations

### Schema Change

The `budgets` table will be modified:

- `category_id` becomes nullable
- New `savings_bucket_id` column (nullable)
- Constraint: exactly one of `category_id` OR `savings_bucket_id` must be set
- Update unique constraint to handle both

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules.
- [x] Confirmed types are using .ts and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Files to Modify/Create

### Database Layer

1. `sugih/drizzle/migrations/XXXX_add_savings_bucket_to_budgets.sql` - New migration
2. `sugih/src/modules/Budget/drizzle-schema.ts` - Update schema

### Backend Layer

3. `sugih/src/modules/Budget/schema.ts` - Update Zod schemas
4. `sugih/src/modules/Budget/schema.test.ts` - Update schema tests
5. `sugih/src/modules/Budget/actions.ts` - Update CRUD actions
6. `sugih/src/modules/Budget/actions.integration.test.ts` - Update action tests

### Frontend Layer

7. `sugih/src/modules/Budget/components/BudgetDialogForm.tsx` - Add savings bucket selector
8. `sugih/src/modules/Budget/components/BudgetDialogForm.test.tsx` - Update tests
9. `sugih/src/modules/Budget/components/BudgetTable.tsx` - Display savings bucket budgets
10. `sugih/src/modules/Budget/components/BudgetTable.test.tsx` - Update tests
11. `sugih/src/modules/Budget/components/BudgetCardGrid.tsx` - Display savings bucket budgets
12. `sugih/src/modules/Budget/components/BudgetCardGrid.test.tsx` - Update tests

### API Layer

13. `sugih/src/app/api/budgets/route.ts` - Update to handle savings buckets

## Execution Steps

### Phase 1: Database & Schema Changes

- [x] **Step 1**: Create database migration to add `savings_bucket_id` column to budgets table.
  - Add nullable `savings_bucket_id` column
  - Add check constraint: `(category_id IS NOT NULL AND savings_bucket_id IS NULL) OR (category_id IS NULL AND savings_bucket_id IS NOT NULL)`
  - Update unique index to include savings_bucket_id

  **AND** update `drizzle-schema.ts` with the new column definition.

- [x] **Step 2**: Update `schema.ts` with new Zod validation schemas.
  - Update `BudgetItemSchema` to accept either `categoryId` OR `savingsBucketId`
  - Add `BudgetWithSavingsBucket` interface
  - Add validation that exactly one target is specified

  **AND** update `schema.test.ts` with corresponding tests.

### Phase 2: Backend Actions

- [x] **Step 3**: Update `actions.ts` to support savings bucket budgets.
  - Update `createBudget` to accept `savingsBucketId` as alternative to `categoryId`
  - Validate that savings bucket exists and is not archived
  - Update SQL queries to handle savings bucket budgets

  **AND** update `actions.integration.test.ts` with tests for savings bucket budget CRUD.

- [x] **Step 4**: Update `listBudgets` and `getBudgetById` to include savings bucket info.
  - Join with `savings_buckets` table when `savings_bucket_id` is set
  - Return `savings_bucket_name` in the response

  **AND** update `actions.integration.test.ts` with tests for retrieving savings bucket budgets.

- [x] **Step 5**: Update `copyBudgets` action to support savings bucket budgets.
  - Ensure savings bucket budgets are copied along with category budgets

  **AND** update tests accordingly.

### Phase 3: Frontend - Dialog Form

- [x] **Step 6**: Update `BudgetDialogForm.tsx` to add target type selection.
  - Add radio button or tabs to choose between "Expense Category" and "Savings Bucket"
  - Show category selector when "Expense Category" is selected
  - Show savings bucket selector when "Savings Bucket" is selected
  - Fetch savings buckets from `/api/savings-buckets`

  **AND** update `BudgetDialogForm.test.tsx` with tests for savings bucket selection.

- [x] **Step 7**: Update form submission logic in `BudgetDialogForm.tsx`.
  - Submit `categoryId` OR `savingsBucketId` based on target type
  - Handle validation for the selected target type

  **AND** update `BudgetDialogForm.test.tsx` with submission tests.

### Phase 4: Frontend - Display Components

- [x] **Step 8**: Update `BudgetTable.tsx` to display savings bucket budgets.
  - Show target name (category OR savings bucket name)
  - Add visual indicator to distinguish between category and savings bucket budgets
  - Handle sorting and filtering

  **AND** update `BudgetTable.test.tsx` with tests.

- [x] **Step 9**: Update `BudgetCardGrid.tsx` to display savings bucket budgets.
  - Similar updates as BudgetTable
  - Use different icon/color for savings bucket budgets

  **AND** update `BudgetCardGrid.test.tsx` with tests.

### Phase 5: Budget Summary

- [x] **Step 10**: Update `getBudgetSummary` action to include savings bucket allocations.
  - Calculate actual savings contributions vs budget
  - Include in the overall budget summary

  **AND** update tests accordingly.

## Technical Details

### New Schema (drizzle-schema.ts)

```typescript
export const budgets = pgTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    month: varchar("month", { length: 10 }).notNull(),
    category_id: text("category_id"), // Now nullable
    savings_bucket_id: text("savings_bucket_id"), // New column
    amount_idr: bigint("amount_idr", { mode: "number" }).notNull(),
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true }).$default(
      () => new Date(),
    ),
    updated_at: timestamp("updated_at", { withTimezone: true }).$default(
      () => new Date(),
    ),
  },
  (table) => [
    // Unique constraint per month + category
    uniqueIndex("budget_month_category_idx")
      .on(table.month, table.category_id)
      .where(sql`category_id IS NOT NULL`),
    // Unique constraint per month + savings bucket
    uniqueIndex("budget_month_savings_bucket_idx")
      .on(table.month, table.savings_bucket_id)
      .where(sql`savings_bucket_id IS NOT NULL`),
    // Check constraint: exactly one target
    check(
      "budget_target_check",
      sql`(category_id IS NOT NULL AND savings_bucket_id IS NULL) OR (category_id IS NULL AND savings_bucket_id IS NOT NULL)`,
    ),
  ],
);
```

### Updated TypeScript Interface

```typescript
export interface BudgetWithCategory extends Budget {
  category_name?: string | null;
  savings_bucket_name?: string | null;
  target_type: "category" | "savings_bucket";
}
```

### Form Target Type UI

```tsx
// In BudgetDialogForm.tsx
<RadioGroup value={targetType} onValueChange={setTargetType}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="category" id="target-category" />
    <Label htmlFor="target-category">Expense Category</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="savings_bucket" id="target-savings" />
    <Label htmlFor="target-savings">Savings Bucket</Label>
  </div>
</RadioGroup>

{targetType === "category" && (
  <CategorySelector ... />
)}

{targetType === "savings_bucket" && (
  <SavingsBucketSelector ... />
)}
```

## Test Scenarios

1. **Create savings bucket budget**: Successfully create a budget for a savings bucket
2. **Validation**: Reject budgets with both category and savings bucket
3. **Validation**: Reject budgets with neither category nor savings bucket
4. **Display**: Savings bucket budgets appear in list/grid with proper labeling
5. **Copy**: Copying budgets includes savings bucket budgets
6. **Summary**: Budget summary includes savings allocations

## Acceptance Criteria

- [x] Users can create a budget for a savings bucket
- [x] Users can view savings bucket budgets alongside category budgets
- [x] Savings bucket budgets are visually distinguishable from category budgets
- [x] Copy budgets feature works with savings bucket budgets
- [x] Budget summary includes savings allocations
- [x] All tests pass and cover new functionality
- [x] Database migration runs successfully
