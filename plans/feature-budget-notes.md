# Plan: Add Note/Description Field to Budgets

## Overview

Add an optional `note` field to the budgets table to allow users to add descriptions that differentiate budgets for the same category across different months.

**Example Use Case:**

- "Bills" budget in January 2026: "Apartment only"
- "Bills" budget in February 2026: "Apartment, Water, and Electricity"

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules.
- [x] Confirmed types are using .ts and are properly exported.
- [x] Confirmed that every logic change has a planned test file.

## Architecture Analysis

### Affected Files:

1. **Database Layer:**
   - `src/modules/Budget/drizzle-schema.ts` - Add `note` column to budgets table
2. **Validation & Types:**
   - `src/modules/Budget/schema.ts` - Update Zod schemas to include optional note field
   - `src/modules/Budget/schema.test.ts` - Test schema validation with note field

3. **Server Actions:**
   - `src/modules/Budget/actions.ts` - Update CRUD functions to handle note field
   - `src/modules/Budget/actions.integration.test.ts` - Test actions with note field

4. **API Routes:**
   - `src/app/api/budgets/route.ts` - Update POST to accept note
   - `src/app/api/budgets/route.test.ts` - Test API with note field
   - `src/app/api/budgets/[id]/route.ts` - Update PATCH to accept note
   - `src/app/api/budgets/[id]/route.test.ts` - Test update with note field
   - `src/app/api/budgets/copy/route.ts` - Update copy to include note
   - `src/app/api/budgets/copy/route.test.ts` - Test copy with note field

5. **UI Components:**
   - `src/modules/Budget/components/BudgetDialogForm.tsx` - Add note textarea input
   - `src/modules/Budget/components/BudgetTable.tsx` - Display note in table
   - `src/app/budgets/page.tsx` - Update handlers to pass note field

6. **Database Migration:**
   - Create migration file to add note column to budgets table

## Execution Steps

### Step 1: Database Schema & Migration

- [x] **Step 1.1**: Update `src/modules/Budget/drizzle-schema.ts` to add optional `note` field (text type, nullable).
- [x] **Step 1.2**: Generate Drizzle migration file for adding the `note` column to budgets table.
- [x] **Step 1.3**: Run migration to update database schema (`pnpm db:migrate`)

### Step 2: Update Type Definitions & Validation

- [x] **Step 2.1**: Update `src/modules/Budget/schema.ts` to add optional `note` field to `Budget`, `BudgetWithCategory`, and `BudgetItemSchema`.
- [x] **Step 2.2**: Update `src/modules/Budget/schema.test.ts` to test schema validation with note field (valid note, empty note, long note).

### Step 3: Update Server Actions

- [x] **Step 3.1**: Update `createBudget()` in `src/modules/Budget/actions.ts` to accept and save note field.
- [x] **Step 3.2**: Update `updateBudget()` in `src/modules/Budget/actions.ts` to accept and update note field.
- [x] **Step 3.3**: Update `upsertBudgets()` in `src/modules/Budget/actions.ts` to handle note field in bulk operations.
- [x] **Step 3.4**: Update `copyBudgets()` in `src/modules/Budget/actions.ts` to include note when copying budgets.
- [x] **Step 3.5**: Update `listBudgets()` and `getBudgetById()` to include note field in SELECT queries.
- [x] **Step 3.6**: Update `src/modules/Budget/actions.integration.test.ts` to test all CRUD operations with note field.

### Step 4: Update API Routes

- [x] **Step 4.1**: Update POST handler in `src/app/api/budgets/route.ts` to accept note in request body.
- [x] **Step 4.2**: Update `src/app/api/budgets/route.test.ts` to test create with note field.
- [x] **Step 4.3**: Update PATCH handler in `src/app/api/budgets/[id]/route.ts` to accept note in request body.
- [x] **Step 4.4**: Update `src/app/api/budgets/[id]/route.test.ts` to test update with note field.
- [x] **Step 4.5**: Update `src/app/api/budgets/copy/route.test.ts` to verify copied budgets include notes.

### Step 5: Update UI Components

- [ ] **Step 5.1**: Update `src/modules/Budget/components/BudgetDialogForm.tsx` to add Textarea field for note (optional, max 500 chars).
- [ ] **Step 5.2**: Create component test for `BudgetDialogForm` to verify note field rendering and validation.
- [ ] **Step 5.3**: Update `src/modules/Budget/components/BudgetTable.tsx` to display note in a new column or as a tooltip/secondary text.
- [ ] **Step 5.4**: Create component test for `BudgetTable` to verify note display.
- [ ] **Step 5.5**: Update `src/app/budgets/page.tsx` handlers (`handleCreateBudget`, `handleUpdateBudget`) to include note field.

### Step 6: Integration Testing & Verification

- [ ] **Step 6.1**: Run all tests to ensure nothing breaks (`pnpm test`).
- [ ] **Step 6.2**: Manual verification: Create budget with note, update note, copy budget with note, delete budget with note.
- [ ] **Step 6.3**: Verify note displays correctly in UI table and forms.

## Technical Details

### Database Schema Addition

```sql
ALTER TABLE budgets ADD COLUMN note TEXT;
```

### Field Constraints

- **Type:** `text` (nullable)
- **Max Length:** 500 characters (enforced in Zod schema)
- **Default:** `null`
- **Required:** No (optional field)

### Validation Rules (Zod)

```typescript
note: z.string()
  .max(500, "Note must be 500 characters or less")
  .optional()
  .nullable();
```

### UI Considerations

- Use `<Textarea>` component for multi-line note input
- Display note in table as truncated text with tooltip or expandable row
- Show character count in form (e.g., "245/500")
- Placeholder text: "Add a note to describe this budget allocation..."

## Testing Strategy

IMPORTANT: Always clean up the mock/dummy data after finishing the tests!!!

### Unit Tests:

1. Schema validation with valid notes
2. Schema validation with notes exceeding max length
3. Schema validation with null/undefined notes

### Integration Tests:

1. Create budget with note
2. Create budget without note
3. Update budget to add note
4. Update budget to remove note (set to null)
5. Copy budgets preserves notes
6. List budgets returns notes
7. Get budget by ID returns note

### Component Tests:

1. BudgetDialogForm renders note field
2. BudgetDialogForm validates note length
3. BudgetDialogForm submits note value
4. BudgetTable displays note text
5. BudgetTable handles missing notes gracefully

## Migration Safety

- Column is nullable, so existing budgets won't break
- Default value is null for existing records
- No data loss risk
- Can be rolled back by dropping the column

## Success Criteria

✅ Database schema updated with `note` column
✅ All tests pass
✅ Users can add notes when creating budgets
✅ Users can edit notes when updating budgets
✅ Notes are displayed in the budget table
✅ Notes are preserved when copying budgets
✅ Existing budgets without notes continue to work
