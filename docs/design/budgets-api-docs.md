# Budgets API Documentation

## Overview

The Budgets API provides RESTful endpoints for managing personal budgets in Sugih. Budgets are organized by month (in `YYYY-MM-01` format) and can target either **expense categories** or **savings buckets**.

### Key Concepts

- **Month Format**: All dates use `YYYY-MM-01` format (e.g., `2026-02-01` for February 2026)
- **Dual Targeting**: Budgets can track spending in two ways:
  - **Category Budgets**: Track spending for expense categories
  - **Savings Bucket Budgets**: Track savings contributions to savings buckets
- **Exclusive Targeting**: Each budget must target exactly one category OR one savings bucket, never both
- **Category Validation**: Only **expense categories** can be budgeted (income categories are not budgetable)
- **Currency**: All amounts are in Indonesian Rupiah (IDR) stored as integers

---

## Base URL

```
/api/budgets
```

---

## Endpoints

### 1. List Budgets

Get all budgets, optionally filtered by month. Returns budgets with category or savings bucket information.

**Request**

```http
GET /api/budgets
GET /api/budgets?month=2026-02-01
```

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string | No | Filter by month in `YYYY-MM-01` format. When provided, returns unified response with budgets AND summary. |

**Response**

**When month is provided:**
```json
{
  "budgets": [
    {
      "id": "budget123",
      "month": "2026-02-01",
      "category_id": "cat456",
      "savings_bucket_id": null,
      "amount_idr": 5000000,
      "note": "Apartment rent and utilities",
      "category_name": "Housing",
      "savings_bucket_name": null,
      "target_type": "category",
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    }
  ],
  "summary": {
    "month": "2026-02-01",
    "totalBudget": 15000000,
    "totalSpent": 8500000,
    "remaining": 6500000,
    "items": [
      {
        "categoryId": "cat456",
        "savingsBucketId": null,
        "targetName": "Housing",
        "targetType": "category",
        "budgetAmount": 5000000,
        "spentAmount": 4200000,
        "remaining": 800000,
        "percentUsed": 84.0
      }
    ],
    "categoryItems": [
      {
        "categoryId": "cat456",
        "categoryName": "Housing",
        "budgetAmount": 5000000,
        "spentAmount": 4200000,
        "remaining": 800000,
        "percentUsed": 84.0
      }
    ]
  }
}
```

**When no month is provided:**
```json
[
  {
    "id": "budget123",
    "month": "2026-02-01",
    "category_id": "cat456",
    "savings_bucket_id": null,
    "amount_idr": 5000000,
    "note": "Apartment rent",
    "category_name": "Housing",
    "savings_bucket_name": null,
    "target_type": "category",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-01-15T10:00:00Z"
  }
]
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid query parameters |
| 500 | Server error |

---

### 2. Create Budget

Create a single budget for either a category or a savings bucket.

**Request**

```http
POST /api/budgets
Content-Type: application/json

{
  "month": "2026-02-01",
  "categoryId": "cat456",
  "amountIdr": 5000000,
  "note": "Apartment rent and utilities"
}
```

**Request Body (Category Budget)**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `month` | string | Yes | Format: `YYYY-MM-01`, valid month (01-12) |
| `categoryId` | string | Yes* | Must be an existing, non-archived expense category. *Exactly one of `categoryId` or `savingsBucketId` required. |
| `amountIdr` | number | Yes | Positive integer (> 0) |
| `note` | string | No | Max 500 characters. Empty string becomes null. |

**Request Body (Savings Bucket Budget)**

```json
{
  "month": "2026-02-01",
  "savingsBucketId": "bucket789",
  "amountIdr": 2000000,
  "note": "Monthly savings goal"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `month` | string | Yes | Format: `YYYY-MM-01` |
| `savingsBucketId` | string | Yes* | Must be an existing, non-archived savings bucket. *Exactly one of `categoryId` or `savingsBucketId` required. |
| `amountIdr` | number | Yes | Positive integer (> 0) |
| `note` | string | No | Max 500 characters |

**Response**

```json
{
  "id": "budget_new123",
  "month": "2026-02-01",
  "category_id": "cat456",
  "savings_bucket_id": null,
  "amount_idr": 5000000,
  "note": "Apartment rent and utilities",
  "category_name": "Housing",
  "savings_bucket_name": null,
  "target_type": "category",
  "created_at": "2026-01-20T15:30:00Z",
  "updated_at": "2026-01-20T15:30:00Z"
}
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Budget created successfully |
| 400 | Invalid request body, duplicate budget, or constraint violation |
| 404 | Category or savings bucket not found |
| 409 | Budget already exists for this month and target |
| 422 | Validation error |
| 500 | Server error |

**Error Examples**

```json
{
  "error": "Cannot specify both categoryId and savingsBucketId"
}
```

```json
{
  "error": "Must specify either categoryId or savingsBucketId"
}
```

```json
{
  "error": "Budget category must be an expense category. Income categories cannot be budgeted."
}
```

```json
{
  "error": "Category not found or archived"
}
```

```json
{
  "error": "Budget already exists for this month and category"
}
```

---

### 3. Get Budget by ID

Retrieve a specific budget by ID.

**Request**

```http
GET /api/budgets/{id}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Budget ID |

**Response**

```json
{
  "id": "budget123",
  "month": "2026-02-01",
  "category_id": "cat456",
  "savings_bucket_id": null,
  "amount_idr": 5000000,
  "note": "Apartment rent",
  "category_name": "Housing",
  "savings_bucket_name": null,
  "target_type": "category",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Budget not found |
| 500 | Server error |

---

### 4. Update Budget

Update a budget's amount and/or note. Preserves other fields.

**Request**

```http
PATCH /api/budgets/{id}
Content-Type: application/json

{
  "amountIdr": 6000000,
  "note": "Rent + utilities + internet"
}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Budget ID |

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `amountIdr` | number | Yes | Positive integer (> 0) |
| `note` | string | No | Max 500 characters. Pass `null` to clear. Omit to keep existing value. |

**Response**

```json
{
  "id": "budget123",
  "month": "2026-02-01",
  "category_id": "cat456",
  "savings_bucket_id": null,
  "amount_idr": 6000000,
  "note": "Rent + utilities + internet",
  "category_name": "Housing",
  "savings_bucket_name": null,
  "target_type": "category",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-20T16:45:00Z"
}
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid amount (must be positive integer) or note exceeds 500 characters |
| 404 | Budget not found |
| 409 | Budget conflict |
| 500 | Server error |

**Notes**

- If `note` is omitted, the existing note is preserved
- Pass `note: null` to explicitly clear the note
- The `amountIdr` field is always required in the request

---

### 5. Delete Budget

Permanently delete a budget.

**Request**

```http
DELETE /api/budgets/{id}
```

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Budget ID |

**Response**

```json
{
  "message": "Budget deleted successfully"
}
```

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Budget not found |
| 409 | Cannot delete budget (referenced by other records) |
| 500 | Server error |

---

### 6. Get Budget Summary

Get a comprehensive budget summary for a specific month, including actual spending/savings vs. budgeted amounts.

**Request**

```http
GET /api/budgets/months
```

This endpoint is part of the months API but included here for completeness.

**Response**

```json
[
  {
    "value": "2026-02-01",
    "label": "February 2026",
    "budgetCount": 8
  },
  {
    "value": "2026-01-01",
    "label": "January 2026",
    "budgetCount": 8
  }
]
```

**Alternative: Get Summary with Month Query**

```http
GET /api/budgets?month=2026-02-01
```

Returns budgets + summary in unified response (see List Budgets endpoint above).

**Summary Structure**

```json
{
  "month": "2026-02-01",
  "totalBudget": 15000000,
  "totalSpent": 8500000,
  "remaining": 6500000,
  "items": [
    {
      "categoryId": "cat456",
      "savingsBucketId": null,
      "targetName": "Housing",
      "targetType": "category",
      "budgetAmount": 5000000,
      "spentAmount": 4200000,
      "remaining": 800000,
      "percentUsed": 84.0
    },
    {
      "categoryId": null,
      "savingsBucketId": "bucket789",
      "targetName": "Emergency Fund",
      "targetType": "savings_bucket",
      "budgetAmount": 2000000,
      "spentAmount": 1500000,
      "remaining": 500000,
      "percentUsed": 75.0
    }
  ]
}
```

**Summary Details**

- **totalBudget**: Sum of all budget amounts for the month
- **totalSpent**: Sum of actual expenses (for categories) + savings contributions (for buckets)
- **remaining**: `totalBudget - totalSpent`
- **items**: Array of budget tracking items with:
  - **percentUsed**: Percentage of budget consumed (rounded to 2 decimals)
  - **spentAmount**: Actual expenses for categories; savings contributions for buckets
  - Note: Savings withdrawals do NOT count toward budget spent

---

### 7. Copy Budgets

Copy budgets from one month to another. Only copies budgets that don't already exist in the destination month.

**Request**

```http
POST /api/budgets/copy
Content-Type: application/json

{
  "fromMonth": "2026-02-01",
  "toMonth": "2026-03-01"
}
```

**Request Body**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `fromMonth` | string | Yes | Format: `YYYY-MM-01` |
| `toMonth` | string | Yes | Format: `YYYY-MM-01`, must be different from `fromMonth` |

**Response**

```json
{
  "created": [
    {
      "id": "budget_copied1",
      "month": "2026-03-01",
      "category_id": "cat456",
      "savings_bucket_id": null,
      "amount_idr": 5000000,
      "note": "Apartment rent",
      "category_name": "Housing",
      "savings_bucket_name": null,
      "target_type": "category",
      "created_at": "2026-01-25T12:00:00Z",
      "updated_at": "2026-01-25T12:00:00Z"
    }
  ],
  "skipped": [
    {
      "categoryId": "cat789",
      "savingsBucketId": null,
      "targetName": "Food"
    }
  ]
}
```

**Response Details**

- **created**: Array of newly created budgets copied to destination month
- **skipped**: Array of budgets that already exist in destination month (not copied)
  - Each skipped item includes either `categoryId` or `savingsBucketId` and `targetName`

**Status Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Invalid month format, same source/destination month, or other constraint violation |
| 404 | No budgets found in source month |
| 422 | Validation error |
| 500 | Server error |

**Error Examples**

```json
{
  "error": "Source and destination months must be different"
}
```

```json
{
  "error": "No budgets found for source month"
}
```

---

## Data Models

### BudgetWithCategory

Complete budget object with category or savings bucket information.

```typescript
interface BudgetWithCategory {
  id: string;                          // Unique identifier
  month: string;                       // YYYY-MM-01 format
  category_id: string | null;          // Null if budget targets savings bucket
  savings_bucket_id: string | null;    // Null if budget targets category
  amount_idr: number;                  // Budget amount in IDR
  note: string | null;                 // Optional note (max 500 chars)
  category_name: string | null;        // Denormalized for convenience
  savings_bucket_name: string | null;  // Denormalized for convenience
  target_type: "category" | "savings_bucket";  // Which type this budget targets
  created_at: Date;
  updated_at: Date;
}
```

### BudgetSummaryItem

Individual item in a budget summary.

```typescript
interface BudgetSummaryItem {
  categoryId: string | null;                      // Null if savings bucket budget
  savingsBucketId: string | null;                 // Null if category budget
  targetName: string;                             // Category or bucket name
  targetType: "category" | "savings_bucket";
  budgetAmount: number;                           // Budget in IDR
  spentAmount: number;                            // Actual spent/saved in IDR
  remaining: number;                              // budgetAmount - spentAmount
  percentUsed: number;                            // (spentAmount / budgetAmount) * 100
}
```

### BudgetSummary

Complete budget summary for a month.

```typescript
interface BudgetSummary {
  month: string;                                  // YYYY-MM-01 format
  totalBudget: number;                            // Sum of all budget amounts
  totalSpent: number;                             // Sum of all spending/savings
  remaining: number;                              // totalBudget - totalSpent
  items: BudgetSummaryItem[];                     // Detailed items
  categoryItems?: LegacyBudgetSummaryItem[];      // Backward compatibility
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow this format:

```json
{
  "error": "Description of the error"
}
```

### Validation Errors

When validation fails (422 status):

```json
{
  "error": "Validation error",
  "issues": [
    {
      "code": "invalid_type",
      "message": "Invalid month format",
      "path": ["month"]
    }
  ]
}
```

### Common Error Scenarios

| Error | Status | Cause |
|-------|--------|-------|
| `Invalid JSON body` | 400 | Request body is not valid JSON |
| `amountIdr must be a positive integer` | 400 | Amount is <= 0 or not an integer |
| `Note must be 500 characters or less` | 400 | Note exceeds 500 character limit |
| `Cannot specify both categoryId and savingsBucketId` | 400 | Both targets specified |
| `Must specify either categoryId or savingsBucketId` | 400 | Neither target specified |
| `Budget category must be an expense category` | 400 | Income category used |
| `Category not found or archived` | 404 | Category doesn't exist or is archived |
| `Savings bucket not found or archived` | 404 | Bucket doesn't exist or is archived |
| `Budget not found` | 404 | Budget ID doesn't exist |
| `Budget already exists for this month and category` | 409 | Duplicate category budget |
| `Budget already exists for this month and savings bucket` | 409 | Duplicate savings bucket budget |

---

## Usage Examples

### Create a Category Budget

```bash
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "month": "2026-02-01",
    "categoryId": "cat_housing_123",
    "amountIdr": 5000000,
    "note": "Rent + utilities"
  }'
```

### Create a Savings Bucket Budget

```bash
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "month": "2026-02-01",
    "savingsBucketId": "bucket_emergency_456",
    "amountIdr": 2000000,
    "note": "Emergency fund contribution"
  }'
```

### Get Budget Summary for a Month

```bash
curl http://localhost:3000/api/budgets?month=2026-02-01
```

### Update Budget Amount

```bash
curl -X PATCH http://localhost:3000/api/budgets/budget123 \
  -H "Content-Type: application/json" \
  -d '{
    "amountIdr": 6000000,
    "note": "Updated rent estimate"
  }'
```

### Copy Budgets to Next Month

```bash
curl -X POST http://localhost:3000/api/budgets/copy \
  -H "Content-Type: application/json" \
  -d '{
    "fromMonth": "2026-02-01",
    "toMonth": "2026-03-01"
  }'
```

---

## Design Notes

### Why Separate Category and Savings Bucket Budgets?

Budgets serve two distinct purposes:
- **Category Budgets**: Track spending constraints (e.g., "limit housing to 5M IDR/month")
- **Savings Bucket Budgets**: Track savings goals (e.g., "save 2M IDR/month toward emergency fund")

By allowing budgets to target either type, users can manage both constraints and goals within the same system.

### Spending Calculation for Budgets

- **Category Budgets**: Count all expenses with `deleted_at IS NULL` in the month
- **Savings Bucket Budgets**: Count only `savings_contribution` transactions, NOT withdrawals
  - This allows users to contribute toward goals without penalizing them for withdrawals

### Month Format Consistency

All months use the first day of the month (`YYYY-MM-01`) to ensure consistency and simplify queries. This is validated on every request.

---

## Rate Limiting

No explicit rate limiting is implemented. Clients should implement reasonable request patterns.

---

## Authentication

All endpoints require valid authentication via the application's session management system.

---

## Related Documentation

- [Budget Module Architecture](./budgets-page-refactoring.md)
- [Database Structure](./database-structure.md)
- [System Design Document](./sugih-mvp-sdd.md)
