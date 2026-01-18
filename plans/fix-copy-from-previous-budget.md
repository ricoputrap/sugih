# Fix Plan: Copy from Previous Budget Button Error

## Issue Summary

Clicking the "Copy from Previous" button triggers `handleCopyFromPrevious` which fails because it attempts to call `PUT /api/budgets` endpoint that does not exist.

## Root Cause Analysis

### Primary Issue: Missing API Endpoint

**Frontend Code (`src/app/budgets/page.tsx:218-273`)**

The `handleCopyFromPrevious` function:

1. Fetches budgets from the previous month via `GET /api/budgets?month=...` ✅ (works)
2. Maps the budgets to an upsert payload format
3. Sends a `PUT` request to `/api/budgets` with the payload ❌ (fails - endpoint doesn't exist)

**Backend Code (`src/app/api/budgets/route.ts`)**

The route only exports:

- `GET` - list budgets or get summary
- `POST` - create a single budget (calls `createBudget`)

**There is no `PUT` handler**, causing the request to fail with 405 Method Not Allowed.

### Secondary Issue: `copyBudgets` Function Too Restrictive

The existing `copyBudgets` function (`src/modules/Budget/actions.ts:526-594`) is semantically the **correct** function to use for copying budgets from previous month, but it has overly restrictive validation:

```typescript
// Lines 548-551: Blocks copying if destination has ANY budgets
const existingBudgets = await getBudgetsByMonth(toMonth);
if (existingBudgets.length > 0) {
  throw new Error("Destination month already has budgets");
}
```

**Why This Is Wrong:**

Real-world scenario:

- User creates budgets for March: Category A ($500), Category C ($200)
- User clicks "Copy from Previous" to copy from February (had: Category A ($450), Category B ($300), Category D ($400))
- Expected: Copy categories that don't exist yet in March (B and D)
- **Actual**: Function throws error and refuses to copy because March already has budgets 💥

This prevents users from:

1. Partially setting up a month and then copying from previous to fill in the rest
2. Using "Copy from Previous" as a "fill missing budgets" action
3. Iteratively building their monthly budgets

### Why `copyBudgets` Is The Right Function

- **Semantic correctness**: Name explicitly describes the action
- **Clear intent**: Takes `fromMonth` and `toMonth` parameters - obvious what it does
- **Purpose-built**: Designed specifically for copying budgets between months
- **Better than `upsertBudgets`**: Doesn't have the dangerous deletion logic that removes unmentioned budgets

## Proposed Solution: Smart Copy with User Feedback

### User Experience Flow

#### Scenario 1: Copy to Empty Month

1. User clicks **[Copy from Previous]** button
2. Backend copies ALL categories from previous month
3. Frontend shows success toast: `"Copied 5 budgets from previous month"`

#### Scenario 2: Copy with Existing Budgets

1. User clicks **[Copy from Previous]** button
2. Backend:
   - Previous month has: Food ($500), Transport ($300), Entertainment ($200), Groceries ($400)
   - Current month already has: Food ($600), Entertainment ($250)
   - Copies only: Transport ($300), Groceries ($400)
3. Frontend shows:
   - Success toast: `"Copied 2 budgets from previous month"`
   - **Modal dialog** with details:
     - ✅ **Created**: Transport ($300), Groceries ($400)
     - ⏭️ **Skipped** (already exist): Food, Entertainment

### Copy Behavior Rules

When copying budgets from Month A to Month B:

1. For each budget category in Month A:
   - If category **does NOT exist** in Month B: **INSERT** new budget
   - If category **already exists** in Month B: **SKIP** (preserve user's existing value)
2. Return detailed result with:
   - `created`: Array of newly created budgets
   - `skipped`: Array of categories that were skipped (already exist)

**Why This Approach:**

- ✅ **Non-destructive**: Never overwrites user's existing budget decisions
- ✅ **Always succeeds**: Only fails if source month has no budgets
- ✅ **Transparent**: User knows exactly what happened
- ✅ **Flexible**: Can copy multiple times, gradually building the month's budgets
- ✅ **Intuitive**: "Copy" means "add missing budgets from previous month"

## Implementation Plan

### ✅ Step 1: Fix `copyBudgets` Function

**File**: `src/modules/Budget/actions.ts`

**Status**: ✅ Complete

**Changes**:

1. **Remove the restrictive check** (lines 548-551) ✅

2. **Implement selective copy logic** ✅

```typescript
export async function copyBudgets(
  fromMonth: string,
  toMonth: string,
): Promise<{
  created: BudgetWithCategory[];
  skipped: Array<{ categoryId: string; categoryName: string }>;
}> {
  const pool = getPool();

  try {
    BudgetMonthSchema.parse(fromMonth);
    BudgetMonthSchema.parse(toMonth);

    if (fromMonth === toMonth) {
      throw new Error("Source and destination months must be different");
    }

    // Get source budgets
    const sourceBudgets = await getBudgetsByMonth(fromMonth);

    if (sourceBudgets.length === 0) {
      throw new Error("No budgets found for source month");
    }

    // Get existing budgets in destination month
    const existingBudgets = await getBudgetsByMonth(toMonth);
    const existingCategoryIds = new Set(
      existingBudgets.map((b) => b.category_id),
    );

    // Filter source budgets to only include categories NOT in destination
    const budgetsToCopy = sourceBudgets.filter(
      (b) => !existingCategoryIds.has(b.category_id),
    );

    // Track skipped budgets
    const skippedBudgets = sourceBudgets
      .filter((b) => existingCategoryIds.has(b.category_id))
      .map((b) => ({
        categoryId: b.category_id,
        categoryName: b.category_name ?? "",
      }));

    // If all budgets already exist, return early
    if (budgetsToCopy.length === 0) {
      return {
        created: [],
        skipped: skippedBudgets,
      };
    }

    const client = await pool.connect();
    const now = new Date();
    const createdBudgets: BudgetWithCategory[] = [];

    try {
      await client.query("BEGIN");

      // Insert only the budgets that don't exist in destination
      for (const budget of budgetsToCopy) {
        const newId = nanoid();
        await client.query(
          `INSERT INTO budgets (id, month, category_id, amount_idr, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newId, toMonth, budget.category_id, budget.amount_idr, now, now],
        );

        createdBudgets.push({
          id: newId,
          month: toMonth,
          category_id: budget.category_id,
          amount_idr: budget.amount_idr,
          created_at: now,
          updated_at: now,
          category_name: budget.category_name ?? "",
        });
      }

      await client.query("COMMIT");
      return {
        created: createdBudgets,
        skipped: skippedBudgets,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      throw unprocessableEntity("Invalid month format", formatZodError(error));
    }
    throw error;
  }
}
```

**Key Changes:**

- Return type now includes `{ created, skipped }` instead of just array
- Filters out categories that already exist in destination
- Returns early if nothing to copy
- No UPDATE operations - only INSERT for missing categories

### ✅ Step 2: Create API Endpoint

**File**: `src/app/api/budgets/copy/route.ts` (new file)

**Status**: ✅ Complete

```typescript
import { NextRequest } from "next/server";
import { copyBudgets } from "@/modules/Budget/actions";
import { ok, badRequest, notFound, serverError } from "@/lib/http";
import { formatPostgresError } from "@/db/client";
import { withRouteLogging } from "@/lib/logging";
import { z } from "zod";

const CopyBudgetsSchema = z.object({
  fromMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, "Invalid month format"),
  toMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])-01$/, "Invalid month format"),
});

/**
 * POST /api/budgets/copy
 * Copy budgets from one month to another
 *
 * Only copies categories that don't already exist in the destination month.
 *
 * Body:
 * {
 *   fromMonth: "YYYY-MM-01",
 *   toMonth: "YYYY-MM-01"
 * }
 *
 * Response:
 * {
 *   created: BudgetWithCategory[],
 *   skipped: Array<{ categoryId: string, categoryName: string }>
 * }
 */
async function handlePost(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    // Validate input
    const validation = CopyBudgetsSchema.safeParse(body);
    if (!validation.success) {
      return badRequest("Invalid request data", validation.error.issues);
    }

    const { fromMonth, toMonth } = validation.data;

    // Call copy function
    const result = await copyBudgets(fromMonth, toMonth);

    return ok(result);
  } catch (error: any) {
    console.error("Error copying budgets:", error);

    // Handle validation errors (already formatted as Response)
    if (error instanceof Response) {
      return error;
    }

    // Handle Zod validation errors
    if (error.status === 422) {
      return error;
    }

    // Handle not found errors
    if (error.message?.includes("not found")) {
      return notFound(error.message);
    }

    // Handle same month error
    if (error.message?.includes("must be different")) {
      return badRequest(error.message);
    }

    // Handle PostgreSQL-specific errors
    if (error.code) {
      const formattedError = formatPostgresError(error);
      console.error("PostgreSQL error:", formattedError);
      return serverError("Database error");
    }

    return serverError("Failed to copy budgets");
  }
}

export const POST = withRouteLogging(handlePost, {
  operation: "api.budgets.copy",
  logQuery: false,
  logBodyMetadata: true,
});
```

### ✅ Step 3: Create Copy Result Modal Component

**File**: `src/modules/Budget/components/CopyResultModal.tsx` (new file)

**Status**: ✅ Complete

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Info } from "lucide-react";

interface CopyResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  created: Array<{
    category_name?: string;
    amount_idr: number;
  }>;
  skipped: Array<{
    categoryName: string;
  }>;
}

export function CopyResultModal({
  open,
  onOpenChange,
  created,
  skipped,
}: CopyResultModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Results</DialogTitle>
          <DialogDescription>
            Summary of budgets copied from previous month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Created budgets */}
          {created.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Created ({created.length})</span>
              </div>
              <div className="space-y-1 pl-6">
                {created.map((budget, index) => (
                  <div
                    key={index}
                    className="text-sm flex justify-between items-center"
                  >
                    <span className="text-muted-foreground">
                      {budget.category_name || "Unknown"}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(budget.amount_idr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped budgets */}
          {skipped.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-blue-600">
                <Info className="h-4 w-4" />
                <span>Skipped - Already Exist ({skipped.length})</span>
              </div>
              <div className="space-y-1 pl-6">
                {skipped.map((budget, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    {budget.categoryName || "Unknown"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### ✅ Step 4: Update Frontend

**File**: `src/app/budgets/page.tsx`

**Status**: ✅ Complete

**Changes**:

1. **Add state for copy result modal**:

```typescript
const [copyResultModalOpen, setCopyResultModalOpen] = useState(false);
const [copyResult, setCopyResult] = useState<{
  created: BudgetWithCategory[];
  skipped: Array<{ categoryId: string; categoryName: string }>;
} | null>(null);
```

2. **Update `handleCopyFromPrevious` function**:

```typescript
const handleCopyFromPrevious = async () => {
  if (!selectedMonth) return;

  try {
    // Calculate previous month
    const date = new Date(selectedMonth);
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const previousMonth = `${year}-${month}-01`;

    // Call the copy endpoint
    const response = await fetch("/api/budgets/copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromMonth: previousMonth,
        toMonth: selectedMonth,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to copy budgets");
    }

    const result = await response.json();

    // Refresh budgets list
    await fetchBudgets();

    // Show appropriate feedback
    if (result.created.length === 0 && result.skipped.length > 0) {
      // All budgets already exist
      toast.info("All budgets from previous month already exist");
    } else if (result.skipped.length === 0) {
      // All budgets were created (simple case)
      toast.success(
        `Copied ${result.created.length} budget${result.created.length !== 1 ? "s" : ""} from previous month`,
      );
    } else {
      // Mixed case: some created, some skipped - show modal
      toast.success(
        `Copied ${result.created.length} budget${result.created.length !== 1 ? "s" : ""} from previous month`,
      );
      setCopyResult(result);
      setCopyResultModalOpen(true);
    }
  } catch (error: any) {
    toast.error(error.message || "Failed to copy budgets");
  }
};
```

3. **Add modal to JSX** (at the end of the component, after Edit Dialog):

```typescript
{/* Copy Result Modal */}
{copyResult && (
  <CopyResultModal
    open={copyResultModalOpen}
    onOpenChange={setCopyResultModalOpen}
    created={copyResult.created}
    skipped={copyResult.skipped}
  />
)}
```

4. **Import the modal component** at the top:

```typescript
import { CopyResultModal } from "@/modules/Budget/components/CopyResultModal";
```

### 🔄 Step 5: Add Tests

**File**: `src/app/api/budgets/copy/route.test.ts` (new file)

Test cases:

- ✅ Success: Copy all budgets to empty month
- ✅ Success: Copy only missing budgets (some already exist)
- ✅ Success: No budgets to copy (all exist) - returns empty created array
- ✅ Success: Verify skipped budgets are returned correctly
- ❌ Error: Invalid month format
- ❌ Error: Same source and destination month
- ❌ Error: No budgets in source month
- ❌ Error: Invalid JSON body
- ❌ Error: Missing required fields

## Files to Create/Modify

### Create:

| File                                                | Status      |
| --------------------------------------------------- | ----------- |
| `src/app/api/budgets/copy/route.ts`                 | ✅ Complete |
| `src/app/api/budgets/copy/route.test.ts`            | 🔄 Pending  |
| `src/modules/Budget/components/CopyResultModal.tsx` | ✅ Complete |

### Modify:

| File                                             | Status      |
| ------------------------------------------------ | ----------- |
| `src/modules/Budget/actions.ts`                  | ✅ Complete |
| `src/modules/Budget/actions.integration.test.ts` | ✅ Complete |
| `src/app/budgets/page.tsx`                       | ✅ Complete |

## Estimated Effort

- Step 1 (Fix copyBudgets): 25 minutes ✅
- Step 2 (Create API endpoint): 15 minutes ✅
- Step 3 (Create modal component): 20 minutes ✅
- Step 4 (Update frontend): 15 minutes ✅
- Step 5 (Add tests): 25 minutes 🔄
- **Total: ~100 minutes (1.5-2 hours)**
- **Completed: ~80 minutes**

## Benefits of This Approach

1. **Non-destructive**: Never overwrites existing budgets
2. **Transparent**: Users see exactly what was copied and what was skipped
3. **Flexible**: Can copy multiple times, gradually building budgets
4. **Intuitive**: "Copy" means "fill in missing budgets from previous month"
5. **Always succeeds**: Only fails if source month is empty
6. **Clean API**: Dedicated endpoint with clear purpose
7. **Better UX**: Modal provides detailed feedback for partial copies

## User Scenarios

### Scenario 1: Fresh Month

- Current: No budgets
- Previous: 10 budgets
- Result: Copies all 10, shows toast "Copied 10 budgets from previous month"

### Scenario 2: Partial Setup

- Current: 3 budgets (Food, Rent, Utilities)
- Previous: 8 budgets (Food, Rent, Utilities, Transport, Entertainment, Groceries, Insurance, Savings)
- Result:
  - Copies 5 new budgets (Transport, Entertainment, Groceries, Insurance, Savings)
  - Toast: "Copied 5 budgets from previous month"
  - Modal shows: Created (5 items), Skipped (3 items: Food, Rent, Utilities)

### Scenario 3: All Exist

- Current: 8 budgets
- Previous: 8 budgets (same categories)
- Result:
  - Copies 0 budgets
  - Toast: "All budgets from previous month already exist"
  - No modal (nothing to show)

## Risk Assessment

**Low Risk:**

- `copyBudgets` doesn't appear to be used anywhere currently
- New endpoint is isolated from existing functionality
- Changes make behavior safer (no overwrites)
- Frontend changes are minimal and localized
- Modal is optional UI enhancement

**Testing Priority: HIGH**

- Test copy to empty month
- Test copy with existing budgets (selective copy)
- Test that existing budgets are preserved
- Test modal appears correctly when appropriate
- Test error cases (no source budgets, invalid dates)
