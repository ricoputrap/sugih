# Plan: Wallet Balance Implementation

## Module Structure Check
- [ ] Confirmed that new files will be colocated within `/src/modules/Wallet/` directory.
- [ ] Confirmed types will use `.ts` files and be properly exported.
- [ ] Confirmed that every logic change has a planned test file.
- [ ] Verified existing module structure: `schema.ts`, `components/WalletTable.tsx`, and page at `src/app/wallets/page.tsx`.

## Implementation Overview
This plan adds balance display functionality to the existing wallet management system. The implementation will add a balance field to the database, update the API to include balance data, and modify the UI to display wallet balances in tables and summary cards.

## Execution Steps

### Phase 1: Database Schema Update
- [ ] **Step 1**: Update `/src/modules/Wallet/schema.ts` to add balance field **AND** create `/src/modules/Wallet/schema.test.ts`.
  - Add `balance` field to Drizzle wallet table definition
  - Update TypeScript types to include balance
  - Create test file to validate schema changes

### Phase 2: API Endpoint Updates
- [ ] **Step 2**: Update `/src/app/api/wallets/route.ts` to include balance in response **AND** create `/src/app/api/wallets/route.test.ts`.
  - Modify GET /api/wallets to return balance data
  - Implement balance calculation logic (sum of transactions or direct field)
  - Create test to verify API response includes balance

### Phase 3: UI Component Updates
- [ ] **Step 3**: Update `/src/modules/Wallet/components/WalletTable.tsx` to display balance column **AND** create `/src/modules/Wallet/components/WalletTable.test.tsx`.
  - Add "Balance" column to table header
  - Add balance cell to each table row
  - Implement currency formatting using existing `formatCurrency()` function
  - Update tests to verify balance display

### Phase 4: Summary Cards Enhancement
- [ ] **Step 4**: Update `/src/app/wallets/page.tsx` to add total balance summary card **AND** create `/src/app/wallets/page.test.tsx`.
  - Add new "Total Balance" summary card alongside existing count cards
  - Calculate sum of all active wallet balances
  - Display formatted currency value
  - Create test to verify total balance calculation and display

### Phase 5: Optional Enhancements (Future)
- [ ] **Step 5**: Add balance-based color coding (green for positive, red for negative)
- [ ] **Step 6**: Add "Highest Balance" and "Lowest Balance" summary cards
- [ ] **Step 7**: Implement balance search/filter functionality

## Technical Notes
- Balance field type: `numeric` or `decimal` for accurate currency calculations
- Default balance: `0` for new wallets
- Currency formatting: Use existing `formatCurrency()` utility with `Intl.NumberFormat`
- All balance displays should handle `null`/`undefined` values gracefully
- Ensure backward compatibility during migration

## File Locations Summary
```
/src/modules/Wallet/
├── schema.ts (updated)
├── schema.test.ts (new)
├── components/
│   └── WalletTable.tsx (updated)
│   └── WalletTable.test.tsx (new)
/src/app/
├── api/wallets/
│   └── route.ts (updated)
│   └── route.test.ts (new)
└── wallets/
    └── page.tsx (updated)
    └── page.test.tsx (new)
```

## Success Criteria
- [ ] All active wallets display their current balance in the table
- [ ] Total balance card shows sum of all active wallet balances
- [ ] Balances are formatted in IDR currency
- [ ] All tests pass successfully
- [ ] No breaking changes to existing functionality
