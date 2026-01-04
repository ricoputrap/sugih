# Transaction API Routes Documentation

## Overview

The Transaction module provides a REST API for creating and listing financial transactions. The API is organized into specific endpoints for each transaction type, ensuring clear separation of concerns and type-safe operations.

## Base URL

```
/api/transactions
```

## Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions with filtering |
| POST | `/api/transactions` | **DEPRECATED** - Use specific endpoints |
| POST | `/api/transactions/expense` | Create expense transaction |
| POST | `/api/transactions/income` | Create income transaction |
| POST | `/api/transactions/transfer` | Create transfer transaction |
| POST | `/api/transactions/savings/contribute` | Create savings contribution |
| POST | `/api/transactions/savings/withdraw` | Create savings withdrawal |
| GET | `/api/transactions/[id]` | Get single transaction |
| DELETE | `/api/transactions/[id]` | Soft delete transaction |
| PATCH | `/api/transactions/[id]/restore` | Restore deleted transaction |
| DELETE | `/api/transactions/[id]/permanent` | Permanently delete transaction |

---

## GET /api/transactions

List transactions with optional filtering and pagination.

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `from` | string (ISO date) | Filter transactions from date | `2024-01-01` |
| `to` | string (ISO date) | Filter transactions to date | `2024-01-31` |
| `type` | string | Filter by transaction type | `expense` |
| `walletId` | string | Filter by wallet ID | `wallet_123` |
| `categoryId` | string | Filter by category ID (expense only) | `cat_456` |
| `limit` | number | Number of results (1-100, default 50) | `25` |
| `offset` | number | Pagination offset (default 0) | `50` |

### Request Example

```bash
GET /api/transactions?type=expense&from=2024-01-01&to=2024-01-31&limit=10
```

### Response Example

```json
[
  {
    "id": "txn_123",
    "occurred_at": "2024-01-15T10:00:00.000Z",
    "type": "expense",
    "note": "Groceries",
    "payee": null,
    "category_id": "cat_food",
    "category_name": "Food & Dining",
    "deleted_at": null,
    "created_at": "2024-01-15T09:00:00.000Z",
    "updated_at": "2024-01-15T09:00:00.000Z",
    "idempotency_key": null,
    "display_amount_idr": 150000,
    "display_account": "Main Wallet",
    "postings": [
      {
        "id": "posting_1",
        "event_id": "txn_123",
        "wallet_id": "wallet_main",
        "savings_bucket_id": null,
        "amount_idr": -150000,
        "created_at": "2024-01-15T09:00:00.000Z"
      }
    ]
  }
]
```

---

## POST /api/transactions/expense

Create a new expense transaction.

### Request Body

```json
{
  "occurredAt": "2024-01-15T10:00:00.000Z",
  "walletId": "wallet_main",
  "categoryId": "cat_food",
  "amountIdr": 150000,
  "note": "Weekly groceries",
  "idempotencyKey": "exp_20240115_001"
}
```

### Required Fields

- `occurredAt` (string): ISO 8601 date string
- `walletId` (string): Valid wallet ID
- `categoryId` (string): Valid category ID
- `amountIdr` (number): Positive integer amount in Rupiah

### Optional Fields

- `note` (string): Transaction note/description
- `idempotencyKey` (string): Unique key to prevent duplicates

### Success Response (200)

Returns the created transaction object with all fields populated.

### Error Responses

- **400**: Invalid input, missing required fields, or archived wallet/category
- **404**: Wallet or category not found
- **409**: Duplicate idempotency key
- **422**: Validation error
- **500**: Database error

---

## POST /api/transactions/income

Create a new income transaction.

### Request Body

```json
{
  "occurredAt": "2024-01-15T09:00:00.000Z",
  "walletId": "wallet_salary",
  "amountIdr": 5000000,
  "note": "Monthly salary",
  "payee": "ACME Corp",
  "idempotencyKey": "inc_20240115_001"
}
```

### Required Fields

- `occurredAt` (string): ISO 8601 date string
- `walletId` (string): Valid wallet ID
- `amountIdr` (number): Positive integer amount in Rupiah

### Optional Fields

- `note` (string): Transaction note/description
- `payee` (string): Source of income
- `idempotencyKey` (string): Unique key to prevent duplicates

### Success Response (200)

Returns the created transaction object.

---

## POST /api/transactions/transfer

Create a transfer between two wallets.

### Request Body

```json
{
  "occurredAt": "2024-01-15T11:00:00.000Z",
  "fromWalletId": "wallet_checking",
  "toWalletId": "wallet_savings",
  "amountIdr": 1000000,
  "note": "Monthly savings transfer",
  "idempotencyKey": "trf_20240115_001"
}
```

### Required Fields

- `occurredAt` (string): ISO 8601 date string
- `fromWalletId` (string): Source wallet ID
- `toWalletId` (string): Destination wallet ID
- `amountIdr` (number): Positive integer amount in Rupiah

### Validation Rules

- `fromWalletId` and `toWalletId` must be different
- Both wallets must exist and not be archived

### Optional Fields

- `note` (string): Transfer description
- `idempotencyKey` (string): Unique key to prevent duplicates

### Success Response (200)

Returns the created transfer transaction with two postings (negative and positive).

---

## POST /api/transactions/savings/contribute

Move money from wallet to savings bucket.

### Request Body

```json
{
  "occurredAt": "2024-01-15T12:00:00.000Z",
  "walletId": "wallet_main",
  "bucketId": "bucket_emergency",
  "amountIdr": 200000,
  "note": "Emergency fund contribution",
  "idempotencyKey": "svc_20240115_001"
}
```

### Required Fields

- `occurredAt` (string): ISO 8601 date string
- `walletId` (string): Valid wallet ID
- `bucketId` (string): Valid savings bucket ID
- `amountIdr` (number): Positive integer amount in Rupiah

### Optional Fields

- `note` (string): Contribution description
- `idempotencyKey` (string): Unique key to prevent duplicates

### Success Response (200)

Returns the created contribution transaction with wallet (debit) and bucket (credit) postings.

---

## POST /api/transactions/savings/withdraw

Move money from savings bucket back to wallet.

### Request Body

```json
{
  "occurredAt": "2024-01-15T13:00:00.000Z",
  "walletId": "wallet_main",
  "bucketId": "bucket_emergency",
  "amountIdr": 50000,
  "note": "Emergency expense",
  "idempotencyKey": "svw_20240115_001"
}
```

### Required Fields

- `occurredAt` (string): ISO 8601 date string
- `walletId` (string): Valid wallet ID
- `bucketId` (string): Valid savings bucket ID
- `amountIdr` (number): Positive integer amount in Rupiah

### Optional Fields

- `note` (string): Withdrawal description
- `idempotencyKey` (string): Unique key to prevent duplicates

### Success Response (200)

Returns the created withdrawal transaction with bucket (debit) and wallet (credit) postings.

---

## GET /api/transactions/[id]

Retrieve a single transaction by ID.

### URL Parameters

- `id` (string): Transaction ID

### Response

Returns the transaction object with all fields, or 404 if not found.

---

## DELETE /api/transactions/[id]

Soft delete a transaction (marks as deleted, doesn't remove from database).

### URL Parameters

- `id` (string): Transaction ID

### Success Response (200)

Returns the updated transaction with `deleted_at` timestamp.

---

## PATCH /api/transactions/[id]/restore

Restore a soft-deleted transaction.

### URL Parameters

- `id` (string): Transaction ID

### Success Response (200)

Returns the updated transaction with `deleted_at` set to null.

---

## DELETE /api/transactions/[id]/permanent

Permanently delete a transaction from the database.

⚠️ **Warning**: This action cannot be undone!

### URL Parameters

- `id` (string): Transaction ID

### Success Response (200)

Returns success message.

---

## POST /api/transactions (DEPRECATED)

This endpoint is deprecated but maintained for backward compatibility. It supports creating any transaction type by including a `type` field in the request body.

### Recommended Alternative

Use the specific endpoints listed above for better type safety and clearer API semantics.

---

## Error Handling

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid request data",
    "issues": [
      {
        "field": "amountIdr",
        "message": "Amount must be a positive integer"
      }
    ]
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Wallet not found"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "Transaction with this idempotency key already exists"
  }
}
```

### 422 Unprocessable Entity
```json
{
  "error": {
    "message": "Validation failed",
    "issues": [
      {
        "field": "walletId",
        "message": "Wallet ID is required"
      }
    ]
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "Database error"
  }
}
```

---

## Idempotency

All POST endpoints support idempotency keys to prevent duplicate transactions:

- Include `idempotencyKey` in request body
- If a transaction with the same key exists, it returns the existing transaction
- Keys should be unique per transaction type and context
- Recommended format: `{type}_{date}_{sequence}` (e.g., `exp_20240115_001`)

---

## Transaction Posting Model

Every transaction creates one or more postings (ledger entries):

| Transaction Type | Postings | Description |
|-----------------|----------|-------------|
| **expense** | 1 | Wallet: -amount |
| **income** | 1 | Wallet: +amount |
| **transfer** | 2 | From wallet: -amount, To wallet: +amount |
| **savings_contribution** | 2 | Wallet: -amount, Bucket: +amount |
| **savings_withdrawal** | 2 | Bucket: -amount, Wallet: +amount |

All postings are created atomically within a database transaction.

---

## Amounts

- All amounts are in Indonesian Rupiah (IDR)
- Stored as integers (no decimal places)
- Input amounts must be positive
- Display amounts are always shown as positive values
- Internal posting amounts can be negative (debit) or positive (credit)

---

## Filtering Examples

### Get all expenses in January 2024
```
GET /api/transactions?type=expense&from=2024-01-01&to=2024-01-31
```

### Get transactions for a specific wallet
```
GET /api/transactions?walletId=wallet_main&limit=20
```

### Get savings contributions
```
GET /api/transactions?type=savings_contribution
```

### Get recent transactions with pagination
```
GET /api/transactions?limit=25&offset=0
```

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider adding:
- Rate limiting per IP address
- Request quotas per time period
- Idempotency key validation limits

---

## Authentication

Currently no authentication is implemented. Future versions should add:
- API key authentication
- OAuth 2.0 support
- User session validation

---

## Best Practices

1. **Use Specific Endpoints**: Prefer `/api/transactions/expense` over the deprecated `/api/transactions` with type field
2. **Include Idempotency Keys**: Always use idempotency keys for important transactions
3. **Validate Input**: Ensure all required fields are provided and valid
4. **Handle Errors**: Always check for error responses and handle them appropriately
5. **Use ISO Dates**: Use ISO 8601 format for all date fields
6. **Filter Efficiently**: Use query parameters to filter results on the server side
7. **Paginate Large Datasets**: Use limit/offset for large result sets

---

## Changelog

### v1.0.0 (2024-01-04)
- Initial API implementation
- Support for all transaction types
- Individual endpoints per transaction type
- List and detail endpoints
- Soft delete functionality
- Idempotency support
```
