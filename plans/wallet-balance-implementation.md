# Plan: Wallet Balance Display Implementation

## Module Structure Check

- [x] Confirmed that balance logic stays within Wallet module
- [x] Confirmed UI components remain colocated in `src/modules/Wallet/components/`
- [x] Confirmed API routes remain at `src/app/api/wallets/`
- [x] Confirmed that types are using `.ts` and properly exported
- [x] Confirmed that every logic change has a planned test file
- [x] **ARCHITECTURAL DECISION**: Use transaction-based calculation (no balance field in wallets table)

## Implementation Overview

Display wallet balances across the application by calculating balances from the existing `postings` table (double-entry bookkeeping system). This approach ensures data integrity and follows accounting best practices.

**Key Changes from Original Plan:**

- ❌ **Step 1 REJECTED**: No balance field added to wallets table
- ✅ **Revised Approach**: Calculate balances from `postings` table using SQL aggregation
- ✅ Leverages existing transaction system with `transaction_events` and `postings`

## Execution Steps

### Phase 1: Database Schema Update

- [x] **Step 1**: ~~Add `balance` field to wallet schema~~ **REJECTED**
  - ❌ **DECISION**: Balance field approach rejected by user
  - ✅ **REVISED APPROACH**: Calculate balance from `postings` table using SQL SUM aggregation
  - **Reasoning**: System uses double-entry bookkeeping; balances should be derived from transactions (single source of truth)
  - **SQL**: `SELECT SUM(amount_idr) FROM postings WHERE wallet_id = ?`

### Phase 2: API Endpoint Updates

- [x] **Step 2**: Update `/src/app/api/wallets/route.ts` to calculate and return balances **AND** create tests
  - Calculate balance from `postings` table: `SELECT wallet_id, SUM(amount_idr) as balance FROM postings WHERE wallet_id IN (...) GROUP BY wallet_id`
  - Modify GET /api/wallets to include calculated balance for each wallet
  - Handle wallets with no postings (default balance = 0)
  - Add balance to response type (extend Wallet type with computed balance)
  - Create integration tests for API response with balances
  - Test edge cases: no postings, negative balances, large amounts
  - ✅ **COMPLETED**: Updated `listWallets()` to calculate balance from postings for each wallet
  - ✅ **COMPLETED**: Updated `getWalletById()` to include calculated balance
  - ✅ **COMPLETED**: Created comprehensive test suite in `actions.test.ts` (22 tests covering balance calculations)
  - ✅ **COMPLETED**: Excludes soft-deleted transactions (where `deleted_at IS NOT NULL`)
  - ✅ **COMPLETED**: Returns balance = 0 for wallets with no postings

### Phase 3: UI Component Updates

- [x] **Step 3**: Update `/src/modules/Wallet/components/WalletTable.tsx` to display balance column **AND** create tests
  - ✅ Added "Balance" column to table header (positioned after "Type" column)
  - ✅ Added balance cell to each table row for active and archived wallets
  - ✅ Implemented currency formatting using existing `formatCurrency()` function
  - ✅ Handle null/undefined balances gracefully (displays "Rp0")
  - ✅ Created comprehensive test suite in `WalletTable.test.tsx` (27 tests)
  - ✅ Tests cover: balance display, currency formatting, edge cases, zero/negative balances
  - ✅ Added `WalletWithBalance` type to extend Wallet type with balance field
  - ✅ TypeScript compilation successful (only Tailwind warnings remain)

### Phase 4: Summary Cards Enhancement

- [x] **Step 4**: Update `/src/app/wallets/page.tsx` to add total balance summary card **AND** create tests
  - ✅ Added "Total Balance" summary card as first card in grid
  - ✅ Calculates sum of all active wallet balances using reduce()
  - ✅ Displays formatted currency value (IDR) using Intl.NumberFormat
  - ✅ Updated grid from 4 columns to 5 columns (lg:grid-cols-5)
  - ✅ Handles null/undefined balances gracefully (defaults to 0)
  - ✅ Created comprehensive test suite in `page.test.tsx` (50+ test cases)
  - ✅ Tests cover: total calculation, currency formatting, edge cases, archived wallets
  - ✅ Updated type to WalletWithBalance for component state
  - ✅ TypeScript compilation successful (no errors)

### Phase 5: Optional Enhancements (Future)

- [ ] **Step 5**: Add balance-based color coding (green for positive, red for negative)
- [ ] **Step 6**: Add "Highest Balance" and "Lowest Balance" summary cards
- [ ] **Step 7**: Implement balance search/filter functionality
- [ ] **Step 8**: Add performance optimization (caching, materialized views)

## Technical Notes

### Balance Calculation

```sql
-- Calculate balance for a single wallet
SELECT COALESCE(SUM(amount_idr), 0) as balance
FROM postings
WHERE wallet_id = 'wallet-id-here';

-- Calculate balances for all wallets
SELECT
  wallet_id,
  COALESCE(SUM(amount_idr), 0) as balance
FROM postings
WHERE wallet_id IN (SELECT id FROM wallets WHERE archived = false)
GROUP BY wallet_id;
```

### Data Types

- Balance is calculated as `bigint` (from postings.amount_idr)
- Convert to number for display: divide by 100 if storing cents, or use as-is for Rupiah
- Currency formatting: Use `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`

### Performance Considerations

- Consider adding index on `postings(wallet_id)` if not exists
- For large datasets, may need to optimize with materialized views
- Cache calculated balances if performance becomes an issue

### Edge Cases

- Wallets with no postings: balance = 0
- Negative balances: allowed (overdraft)
- Archived wallets: exclude from calculations
- Null/undefined: handle gracefully in UI

## File Locations Summary

```
/src/modules/Wallet/
├── schema.ts (NO CHANGES - balance field rejected)
├── components/
│   └── WalletTable.tsx (updated - add balance column)
│   └── WalletTable.test.tsx (new - test balance display)
/src/app/
├── api/wallets/
│   └── route.ts (updated - add balance calculation)
│   └── route.test.ts (new - test balance calculation)
└── wallets/
    └── page.tsx (updated - add total balance card)
    └── page.test.tsx (new - test total balance)
```

## Success Criteria

- [ ] All active wallets display their current balance calculated from postings
- [ ] Balance calculation is accurate and matches sum of transaction postings
- [ ] Total balance card shows sum of all active wallet balances
- [ ] Balances are formatted in IDR currency
- [ ] All tests pass successfully
- [ ] No breaking changes to existing functionality
- [ ] Performance is acceptable (< 500ms for balance calculation)
- [ ] Edge cases handled gracefully (no postings, negative balances, etc.)

## Rollback Plan

If issues arise:

1. No database changes to rollback (Step 1 rejected)
2. API changes can be reverted by removing balance calculation
3. UI changes can be reverted by removing balance column and card
4. No data migration needed

---

**Status**: Step 1 Rejected - Ready for Step 2  
**Next Action**: Calculate balances from postings in API endpoint
