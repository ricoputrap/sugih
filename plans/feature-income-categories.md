# Plan: Categorize Income Transactions

## Goal

Extend the existing Transaction system so **income** transactions can optionally be assigned to a **category**, similar to expenses, with minimal disruption and strong test coverage.

---

## Assumptions / Current State (from codebase context already provided)

- `transaction_events.category_id` exists and is currently used for expenses (nullable).
- `IncomeCreateSchema` currently does **not** accept `categoryId`.
- Listing supports `categoryId` filtering and joins may treat it as “expense only”.
- There is a `Category` module already; categories likely exist as reusable entities.

---

## Key Design Choice (Simple)

- **Make `categoryId` optional for income** (`categoryId?: string`).
- Reuse the same `categories` table/entity and validations used by expense.
- Keep DB schema unchanged (already has `category_id` nullable).
- Update API docs + UI labels so category applies to both expense and income.

---

## Module Structure Check

- [x] Confirmed that new files are colocated within their modules (e.g., `/src/modules/Transaction/**`, `/src/modules/Category/**`).
- [x] Confirmed types use `.ts` and are exported/imported explicitly (no new ambient types).
- [x] Confirmed every new/changed logic file has an accompanying sibling test file (or an existing test is updated accordingly).

---

## Execution Steps

- [x] **Step 1: Update Transaction schemas to accept income `categoryId` (optional)**  
       **Code:** Update `/src/modules/Transaction/schema.ts` to add `categoryId?: string` to `IncomeCreateSchema` (mirroring expense constraints but optional).  
       **Test:** Update/add schema tests in `/src/modules/Transaction/schema.test.ts` to cover:
  - income create with no `categoryId` passes
  - income create with valid `categoryId` passes
  - income create with empty string `categoryId` fails (min length)
  - (optional) income create with too-long `categoryId` fails (max length)

- [x] **Step 2: Enforce category existence (and not archived) when `categoryId` is provided for income creation**  
       **Code:** Update `/src/modules/Transaction/actions.ts` so the "create income" flow, when `categoryId` is present, validates:
  - category exists
  - category is not archived (if the system supports archiving)
  - (optional) category belongs to the same user/tenant scope as the wallet (if applicable)

  **Test:** Update `/src/modules/Transaction/actions.integration.test.ts` (preferred, since this is behavior tied to DB/application wiring) to cover:
  - income create succeeds with valid `categoryId`
  - income create returns 404/400 when `categoryId` does not exist
  - income create returns 400 when category is archived (if applicable)

- [x] **Step 3: Update transaction listing/joined output to treat `category_name` as available for income too**  
       **Code:** In `/src/modules/Transaction/actions.ts` (or wherever listing query lives), ensure the join that populates `category_name` is not gated by "expense only".  
       Also update any types in the Transaction module readme/type docs as needed.  
       **Test:** Add/update integration test in `/src/modules/Transaction/actions.integration.test.ts` to verify:
  - listing transactions includes `category_name` for an income transaction with `categoryId`
  - filtering by `categoryId` returns income transactions as well

- [x] **Step 4: Update API documentation to reflect income categories**  
       **Code:** Update `API_ROUTES.md` so:
  - POST `/api/transactions/income` documents optional `categoryId`
  - GET `/api/transactions` query param `categoryId` is no longer labeled "expense only"
  - response examples show `category_id`/`category_name` may appear for income

  **Test:** If doc tests/lints exist, run them; otherwise, do a minimal verification by ensuring examples remain consistent with schemas (manual check recorded in plan notes).

- [x] **Step 5: Update UI to allow selecting a category for income transactions (minimal changes)**  
       **Code:** Identify the income-create form component(s) under `/src/modules/Transaction/components/**` and:
  - add a category selector (same component as expense form if exists)
  - ensure submit payload includes `categoryId` when selected
  - ensure existing flows remain unchanged when not selected

  **Test:** Add/update component test(s) colocated in `/src/modules/Transaction/components/**` to cover:
  - rendering category selector on income form
  - selecting a category includes `categoryId` in submit payload
  - omitting category does not send `categoryId`

---

## Rollout / Backward Compatibility Notes

- Existing income transactions without categories remain valid (DB already allows `category_id = null`).
- API clients that don’t provide `categoryId` continue to work.
- Any UI display code that assumes “expense-only category” should be updated to avoid hiding valid income categories.

---

## Acceptance Criteria

- Can create an income transaction with or without `categoryId`.
- If `categoryId` is provided, it is validated for existence (and not archived if applicable).
- Transaction list returns `category_name` for income when categorized.
- Filtering by `categoryId` returns both expenses and incomes that share that category.
- All updated logic is covered by automated tests.

---

Plan created at `sugih/plans/feature-income-categories.md`. Review it, and say "Start" to begin Step 1.
