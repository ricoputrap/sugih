# Transaction Read Models

This document describes the enhanced read model functions for the Transaction module, which provide enriched transaction data with display-friendly information.

## Overview

The Transaction module includes two primary read model functions that return enhanced transaction data with user-friendly information:

- `listTransactions()` - List transactions with optional filtering
- `getTransactionById()` - Get a single transaction by ID

## Enhanced Return Types

Both functions return enriched transaction objects with additional computed fields:

```typescript
{
  // Original event fields
  id: string;
  occurred_at: Date;
  type: "expense" | "income" | "transfer" | "savings_contribution" | "savings_withdrawal";
  note?: string;
  payee?: string;
  category_id?: string;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
  idempotency_key?: string;
  
  // Enhanced fields
  category_name?: string | null;    // Joined category name (expense only)
  display_amount_idr: number;        // User-friendly amount (always positive)
  display_account: string;           // Human-readable account information
  postings: Posting[];               // Original postings
}
```

## Display Amount Calculation

The `display_amount_idr` field provides a user-friendly positive amount based on transaction type:

| Transaction Type | Display Amount | Description |
|-----------------|----------------|-------------|
| **expense** | `Math.abs(wallet_posting.amount_idr)` | Amount spent (always positive) |
| **income** | `wallet_posting.amount_idr` | Amount received (always positive) |
| **transfer** | `Math.abs(from_posting.amount_idr)` | Amount transferred (always positive) |
| **savings_contribution** | `bucket_posting.amount_idr` | Amount saved (always positive) |
| **savings_withdrawal** | `Math.abs(bucket_posting.amount_idr)` | Amount withdrawn (always positive) |

## Display Account Format

The `display_account` field provides human-readable account information:

| Transaction Type | Format | Example |
|-----------------|--------|---------|
| **expense** | `Wallet Name` | "Main Wallet" |
| **income** | `Wallet Name` | "Main Wallet" |
| **transfer** | `From Wallet → To Wallet` | "Main Wallet → Savings" |
| **savings_contribution** | `To: Bucket Name` | "To: Emergency Fund" |
| **savings_withdrawal** | `From: Bucket Name` | "From: Emergency Fund" |

## Database Joins

The enhanced functions perform LEFT JOINs to fetch related data:

```sql
-- For events (expense categories)
LEFT JOIN categories c 
  ON te.category_id = c.id AND c.archived = false
  AND te.type = 'expense'

-- For postings (wallets and buckets)
LEFT JOIN wallets w 
  ON p.wallet_id = w.id AND w.archived = false
LEFT JOIN savings_buckets sb 
  ON p.savings_bucket_id = sb.id AND sb.archived = false
```

## Filtering and Pagination

Both functions support comprehensive filtering:

```typescript
interface TransactionListQueryInput {
  from?: Date;        // Filter by occurred_at >= from
  to?: Date;          // Filter by occurred_at <= to
  type?: TransactionType;
  walletId?: string;  // Filter by involved wallet
  categoryId?: string; // Filter by category (expense only)
  limit?: number;     // Default 50, max 100
  offset?: number;    // Default 0
}
```

## Performance Considerations

1. **Efficient Joins**: Uses LEFT JOINs to fetch related data in single queries
2. **Archive Filtering**: Filters out archived records at database level
3. **Indexed Fields**: Optimized for common filter patterns
4. **Pagination**: Supports LIMIT/OFFSET for large datasets

## Usage Examples

### List Recent Expenses

```typescript
const expenses = await listTransactions({
  type: "expense",
  limit: 10,
  from: new Date("2024-01-01")
});

// Returns array of expense transactions with:
// - category_name populated
// - display_amount_idr showing amount spent
// - display_account showing wallet name
```

### Get Single Transaction

```typescript
const transaction = await getTransactionById("tx_123");

// Returns enriched transaction with:
// - All display fields calculated
// - Category name (if expense)
// - Formatted account display
// - Original postings
```

### List Transfers

```typescript
const transfers = await listTransactions({
  type: "transfer",
  limit: 20
});

// Each transfer shows:
// - display_amount_idr: amount transferred
// - display_account: "Source Wallet → Destination Wallet"
```

### List Savings Activity

```typescript
const contributions = await listTransactions({
  type: "savings_contribution"
});

const withdrawals = await listTransactions({
  type: "savings_withdrawal"
});

// Contributions: display_account shows "To: Bucket Name"
// Withdrawals: display_account shows "From: Bucket Name"
```

## Error Handling

Both functions validate inputs using Zod schemas:

- Invalid query parameters → 422 Unprocessable Entity
- Invalid transaction ID → 422 Unprocessable Entity
- Database errors → 500 Internal Server Error

## Backward Compatibility

The enhanced return type is additive - it includes all original fields plus new enhanced fields. Existing code will continue to work, but can optionally use the new fields for better user interfaces.

## Related Functions

- `createExpense()` - Create expense transaction
- `createIncome()` - Create income transaction
- `createTransfer()` - Create transfer transaction
- `createSavingsContribution()` - Create savings contribution
- `createSavingsWithdrawal()` - Create savings withdrawal
