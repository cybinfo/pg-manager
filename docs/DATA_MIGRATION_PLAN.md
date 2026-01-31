# Data Migration Plan for newgreenhigh@gmail.com

> **Client**: newgreenhigh@gmail.com (Premium Client)
> **Source**: Excel file `docs/Daily Spend Tracker (1).xlsx`
> **Date**: 2026-01-31

---

## Status Overview

| Component | Status |
|-----------|--------|
| Misc Transactions Module (Code) | ✅ Complete |
| Misc Transactions Module (DB Migration) | ✅ Complete |
| Products Module (Code) | ✅ Complete |
| Daily Spend Module (Code) | ✅ Complete |
| Vendors Module (Code) | ✅ Complete |
| Bill Payments Module (Code) | ✅ Complete |
| Service Providers Module (Code) | ✅ Complete |
| Service Payments Module (Code) | ✅ Complete |
| **Data Migration** | ⏳ Pending |

---

## Excel Data Summary

### Transaction Data to Migrate

| Sheet | Records | Total Amount | Target Module |
|-------|---------|--------------|---------------|
| dailySpendList | 12,145 | ₹14,75,099.00 | Daily Spend |
| paidBillsList | 794 | ₹27,00,173.00 | Bill Payments |
| paidForService | 389 | ₹4,95,327.00 | Service Payments |
| otherMoneyIn | 1,505 | ₹87,90,632.20 | **Misc Transactions (in)** |
| otherMoneyOut | 602 | ₹55,63,646.20 | **Misc Transactions (out)** |

**Total Transactions**: 15,435 records
**Total Amount**: ₹1,90,24,877.40

### Master Data to Migrate

| Sheet | Records | Target Table |
|-------|---------|--------------|
| ProductList | 388 | products |
| CategoryList | 11 | product_categories |
| VendorList | 28 | vendors |
| ServiceProviderList | 54 | service_providers |
| ServiceCategoryList | 44 | service_categories |
| CashBookCategory | 51 | misc_transaction_categories |

---

## Migration Plan

### Phase 1: Get Workspace ID

First, we need to identify the workspace_id for newgreenhigh@gmail.com:

```sql
SELECT w.id as workspace_id, w.name, up.email
FROM workspaces w
JOIN user_profiles up ON w.owner_id = up.id
WHERE up.email = 'newgreenhigh@gmail.com';
```

### Phase 2: Migrate Master Data (Order Matters)

**Step 2.1: Product Categories** (11 records)
- Source: `CategoryList` sheet
- Target: `product_categories` table
- Fields: name, workspace_id

**Step 2.2: Products** (388 records)
- Source: `ProductList` sheet
- Target: `products` table
- Fields: name, unit, category_id (lookup), workspace_id

**Step 2.3: Vendors** (28 records)
- Source: `VendorList` sheet
- Target: `vendors` table
- Fields: name, workspace_id

**Step 2.4: Service Categories** (44 records)
- Source: `ServiceCategoryList` sheet
- Target: `service_categories` table
- Fields: name, workspace_id

**Step 2.5: Service Providers** (54 records)
- Source: `ServiceProviderList` sheet
- Target: `service_providers` table
- Fields: name, workspace_id

**Step 2.6: Misc Transaction Categories** (51 records)
- Source: `CashBookCategory` sheet
- Target: `misc_transaction_categories` table
- Fields: name, default_type (derive from usage), workspace_id

### Phase 3: Migrate Transaction Data

**Step 3.1: Daily Spend** (12,145 records)
- Source: `dailySpendList` sheet
- Target: `daily_spend` table
- Amount Verification: ₹14,75,099.00

**Step 3.2: Bill Payments** (794 records)
- Source: `paidBillsList` sheet
- Target: `bill_payments` table
- Amount Verification: ₹27,00,173.00

**Step 3.3: Service Payments** (389 records)
- Source: `paidForService` sheet
- Target: `service_payments` table
- Amount Verification: ₹4,95,327.00

**Step 3.4: Misc Transactions - Money In** (1,505 records)
- Source: `otherMoneyIn` sheet
- Target: `misc_transactions` table (transaction_type = 'in')
- Amount Verification: ₹87,90,632.20

**Step 3.5: Misc Transactions - Money Out** (602 records)
- Source: `otherMoneyOut` sheet
- Target: `misc_transactions` table (transaction_type = 'out')
- Amount Verification: ₹55,63,646.20

### Phase 4: Verification

After migration, run verification queries:

```sql
-- Verify misc transactions totals
SELECT
    transaction_type,
    COUNT(*) as count,
    SUM(amount) as total
FROM misc_transactions
WHERE workspace_id = '<WORKSPACE_ID>'
AND deleted_at IS NULL
GROUP BY transaction_type;

-- Expected:
-- in:  1,505 records, ₹87,90,632.20
-- out: 602 records, ₹55,63,646.20

-- Verify daily spend
SELECT COUNT(*), SUM(total_amount)
FROM daily_spend
WHERE workspace_id = '<WORKSPACE_ID>'
AND deleted_at IS NULL;
-- Expected: 12,145 records, ₹14,75,099.00

-- Verify bill payments
SELECT COUNT(*), SUM(amount)
FROM bill_payments
WHERE workspace_id = '<WORKSPACE_ID>'
AND deleted_at IS NULL;
-- Expected: 794 records, ₹27,00,173.00

-- Verify service payments
SELECT COUNT(*), SUM(amount)
FROM service_payments
WHERE workspace_id = '<WORKSPACE_ID>'
AND deleted_at IS NULL;
-- Expected: 389 records, ₹4,95,327.00
```

---

## Migration Approach Options

### Option A: Python Script (Recommended)
- Use pandas to read Excel
- Generate SQL INSERT statements
- Run via Supabase SQL Editor
- **Pros**: Can verify data before inserting, easy to audit
- **Cons**: Need Python environment

### Option B: Direct SQL with CSV Export
- Export each sheet to CSV
- Use Supabase CSV import
- **Pros**: No code needed
- **Cons**: Less control over data transformation

### Option C: API-based Migration
- Write TypeScript migration script
- Use Supabase client
- **Pros**: Uses RLS, tracks created_by
- **Cons**: Slower, more complex

**Recommendation**: Option A (Python Script) for safety and verification

---

## Data Cleanup Notes

Based on Excel analysis, these transformations will be applied:

1. **Standardize Names**: Trim whitespace, proper capitalization
2. **Fix Dates**: Ensure consistent YYYY-MM-DD format
3. **Payment Modes**: Map to valid enum values (cash, upi, bank_transfer, etc.)
4. **Categories**: Deduplicate and standardize spellings
5. **Legacy IDs**: Store original row numbers for traceability

---

## Safety Measures

1. **Backup**: Export current data before migration
2. **Workspace Isolation**: All data tied to specific workspace_id
3. **RLS Protection**: Only newgreenhigh@gmail.com can access
4. **Legacy ID Tracking**: Store original Excel row numbers
5. **Amount Verification**: Compare totals before and after
6. **Rollback Plan**: DELETE by legacy_id if issues found

---

## Questions Before Proceeding

1. **Confirm workspace**: Is newgreenhigh@gmail.com already registered?
2. **Created by**: Should we use a system user or the owner's user_id?
3. **Date handling**: Some dates may be in DD/MM/YYYY format - confirm transformation
4. **Category mapping**: Should we auto-create categories or review first?

---

## Next Steps

1. [ ] Confirm this plan looks good
2. [ ] Get workspace_id for newgreenhigh@gmail.com
3. [ ] Create Python migration script
4. [ ] Run master data migration
5. [ ] Run transaction data migration
6. [ ] Verify all totals match
7. [ ] Test in production UI

---

*Last Updated: 2026-01-31*
