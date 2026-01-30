# Audit System Enhancement Proposal

> **Status:** Draft for Review
> **Date:** 2026-01-30
> **Author:** Claude (AI Assistant)

---

## Executive Summary

This document proposes enhancements to ManageKar's audit system to improve accountability, data recovery, and user experience. The changes include adding `created_by` tracking, implementing soft delete functionality, and displaying audit information in the UI.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Proposed Enhancements](#2-proposed-enhancements)
3. [Database Changes](#3-database-changes)
4. [Application Code Changes](#4-application-code-changes)
5. [UI/UX Changes](#5-uiux-changes)
6. [Migration Strategy](#6-migration-strategy)
7. [Risk Assessment](#7-risk-assessment)
8. [Implementation Plan](#8-implementation-plan)

---

## 1. Current State Analysis

### 1.1 What Exists Today

#### Audit Events Table
```sql
audit_events (
  id, entity_type, entity_id, action,
  actor_id, actor_type, workspace_id,
  changes (JSONB), metadata, ip_address, user_agent,
  created_at
)
```

#### Universal Audit Trigger
Automatically captures INSERT/UPDATE/DELETE on 20+ tables:
- tenants, properties, rooms, bills, payments, expenses
- complaints, notices, visitors, staff_members
- exit_clearance, approvals, meter_readings, charges
- roles, user_roles, tenant_documents, etc.

#### Timestamp Columns
Most tables have:
- ✅ `created_at TIMESTAMPTZ DEFAULT NOW()`
- ✅ `updated_at TIMESTAMPTZ DEFAULT NOW()`

### 1.2 Current Gaps

| Gap | Impact |
|-----|--------|
| No `created_by` on records | Can't quickly see who created a record without querying audit_events |
| No `updated_by` on records | Must query audit_events for last modifier |
| Hard deletes | Deleted data is permanently lost; no recovery possible |
| No "deleted by" tracking | If something is deleted, no record of who did it |
| Audit info not shown in UI | Users don't see accountability information |

### 1.3 Current User Experience

**Detail Page (Tenant):**
```
Name: John Doe
Phone: +91 98765 43210
Room: 101
Created: 15 Jan 2026        ← No "by whom"
```

**After Enhancement:**
```
Name: John Doe
Phone: +91 98765 43210
Room: 101
Created: 15 Jan 2026 by Rajesh (Owner)
Last modified: 20 Jan 2026 by Amit (Staff)
```

---

## 2. Proposed Enhancements

### 2.1 Enhancement #1: Add `created_by` Column

**Scope:** Add `created_by UUID` to core tables

**Tables Affected:**
| Table | Priority | Reason |
|-------|----------|--------|
| tenants | High | Critical business data |
| bills | High | Financial accountability |
| payments | High | Financial accountability |
| expenses | High | Financial accountability |
| refunds | High | Financial accountability |
| complaints | Medium | Service tracking |
| notices | Medium | Communication tracking |
| visitors | Medium | Security tracking |
| meter_readings | Medium | Usage tracking |
| exit_clearance | Medium | Process tracking |
| properties | Low | Rarely changes |
| rooms | Low | Rarely changes |

**Why only `created_by` and not `updated_by`?**
- `created_by` is immutable (set once, never changes)
- `updated_by` changes frequently and is already captured in audit_events
- Reduces redundancy and storage
- Can derive "last updated by" from audit_events when needed

### 2.2 Enhancement #2: Soft Delete

**Scope:** Add soft delete columns to prevent data loss

**New Columns:**
```sql
deleted_at    TIMESTAMPTZ    -- When was it deleted (NULL = not deleted)
deleted_by    UUID           -- Who deleted it
```

**Tables Affected:**
| Table | Priority | Reason |
|-------|----------|--------|
| tenants | High | Accidental deletion is catastrophic |
| bills | High | Financial records must be preserved |
| payments | High | Financial records must be preserved |
| expenses | High | Financial records must be preserved |
| refunds | High | Financial records must be preserved |
| complaints | Medium | May need recovery |
| notices | Medium | May need recovery |
| visitors | Low | Less critical |
| meter_readings | Low | Less critical |

**Behavior Changes:**
- DELETE operations become UPDATE (set deleted_at, deleted_by)
- All queries automatically filter `WHERE deleted_at IS NULL`
- Admin can view/restore deleted records
- Permanent delete only via special admin function

### 2.3 Enhancement #3: UI Display of Audit Info

**Scope:** Show creator and last modifier on detail pages

**Components:**
1. **RecordMetadata Component** - Reusable component showing:
   - Created by [Name] on [Date]
   - Last modified by [Name] on [Date]

2. **Activity Timeline** - On detail pages:
   - Recent changes with who/what/when
   - Link to full history

3. **List Page Columns** - Optional columns:
   - "Created By" column
   - "Last Modified" column

---

## 3. Database Changes

### 3.1 Migration: Add `created_by` Column

```sql
-- Migration: 056_add_created_by.sql

-- Add created_by to core tables
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE notices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE exit_clearance ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill from audit_events (for existing records)
-- This finds the first 'insert' audit event for each record

UPDATE tenants t
SET created_by = (
  SELECT actor_id FROM audit_events
  WHERE entity_type = 'tenant'
  AND entity_id = t.id::text
  AND action = 'insert'
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE t.created_by IS NULL;

-- Repeat for other tables...

-- For records without audit history, set to owner_id as fallback
UPDATE tenants SET created_by = owner_id WHERE created_by IS NULL;
UPDATE bills SET created_by = owner_id WHERE created_by IS NULL;
-- etc.

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
```

### 3.2 Migration: Add Soft Delete Columns

```sql
-- Migration: 057_add_soft_delete.sql

-- Add soft delete columns to core tables
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE notices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create indexes for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_tenants_deleted ON tenants(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create view for non-deleted records (optional convenience)
CREATE OR REPLACE VIEW active_tenants AS
SELECT * FROM tenants WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_bills AS
SELECT * FROM bills WHERE deleted_at IS NULL;

-- Function to soft delete a record
CREATE OR REPLACE FUNCTION soft_delete(
  p_table TEXT,
  p_id UUID,
  p_deleted_by UUID
) RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
    p_table
  ) USING p_deleted_by, p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted record
CREATE OR REPLACE FUNCTION restore_deleted(
  p_table TEXT,
  p_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
    p_table
  ) USING p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete (admin only)
CREATE OR REPLACE FUNCTION permanent_delete(
  p_table TEXT,
  p_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Only allow if record is already soft-deleted
  EXECUTE format(
    'DELETE FROM %I WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table
  ) USING p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Update RLS Policies

```sql
-- Update RLS policies to exclude soft-deleted records

-- Example for tenants table
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants
  FOR SELECT
  USING (
    owner_id = auth.uid()
    AND deleted_at IS NULL  -- Exclude soft-deleted
  );

-- Admin policy to see deleted records
CREATE POLICY tenants_select_deleted ON tenants
  FOR SELECT
  USING (
    owner_id = auth.uid()
    AND deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_contexts
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );
```

---

## 4. Application Code Changes

### 4.1 Update Insert Operations

**Before:**
```typescript
const { data, error } = await supabase
  .from("tenants")
  .insert({
    name: input.name,
    phone: input.phone,
    owner_id: workspaceId,
    // ... other fields
  })
```

**After:**
```typescript
const { data, error } = await supabase
  .from("tenants")
  .insert({
    name: input.name,
    phone: input.phone,
    owner_id: workspaceId,
    created_by: actorId,  // NEW
    // ... other fields
  })
```

### 4.2 Update Delete Operations

**Before:**
```typescript
const { error } = await supabase
  .from("tenants")
  .delete()
  .eq("id", tenantId)
```

**After:**
```typescript
// Soft delete
const { error } = await supabase
  .from("tenants")
  .update({
    deleted_at: new Date().toISOString(),
    deleted_by: actorId,
  })
  .eq("id", tenantId)
  .is("deleted_at", null)  // Only if not already deleted
```

### 4.3 Update Select Operations

**Before:**
```typescript
const { data } = await supabase
  .from("tenants")
  .select("*")
  .eq("owner_id", workspaceId)
```

**After:**
```typescript
const { data } = await supabase
  .from("tenants")
  .select("*")
  .eq("owner_id", workspaceId)
  .is("deleted_at", null)  // Exclude soft-deleted
```

### 4.4 Files to Update

| File | Changes |
|------|---------|
| `src/lib/hooks/useListPage.ts` | Add `deleted_at IS NULL` filter to all configs |
| `src/lib/hooks/useDetailPage.ts` | Check for soft-deleted records |
| `src/app/(dashboard)/*/page.tsx` | Pass `created_by` on create |
| `src/lib/workflows/*.ts` | Update workflow steps to include `created_by` |
| `src/components/ui/detail-components.tsx` | Add RecordMetadata component |

### 4.5 New Utility Functions

```typescript
// src/lib/utils/soft-delete.ts

export async function softDelete(
  table: string,
  id: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: actorId,
    })
    .eq("id", id)
    .is("deleted_at", null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function restoreDeleted(
  table: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from(table)
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

---

## 5. UI/UX Changes

### 5.1 RecordMetadata Component

**Location:** `src/components/ui/record-metadata.tsx`

**Design:**
```
┌─────────────────────────────────────────────────────┐
│ Created by Rajesh Kumar (Owner) on 15 Jan 2026     │
│ Last modified by Amit Singh (Staff) • 2 hours ago  │
└─────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface RecordMetadataProps {
  createdAt: string
  createdBy?: {
    id: string
    name: string
    type: "owner" | "staff" | "system"
  }
  lastModified?: {
    at: string
    by: {
      id: string
      name: string
      type: "owner" | "staff" | "system"
    }
  }
}
```

### 5.2 Detail Page Integration

**Example: Tenant Detail Page**

```tsx
<DetailSection title="Record Information" icon={Info}>
  <RecordMetadata
    createdAt={tenant.created_at}
    createdBy={tenant.creator}
    lastModified={tenant.lastAuditEvent}
  />
  <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}>
    <History className="mr-2 h-4 w-4" />
    View Full History
  </Button>
</DetailSection>
```

### 5.3 Activity History Dialog

**Design:**
```
┌─────────────────────────────────────────────────────┐
│ Activity History for John Doe                    X │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ● 20 Jan 2026, 3:45 PM                             │
│   Amit Singh (Staff) updated rent_amount           │
│   ₹8,000 → ₹8,500                                  │
│                                                     │
│ ● 18 Jan 2026, 11:20 AM                            │
│   Amit Singh (Staff) updated room                  │
│   Room 101 → Room 205                              │
│                                                     │
│ ● 15 Jan 2026, 9:00 AM                             │
│   Rajesh Kumar (Owner) created record              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Deleted Records Management

**New Page:** `/settings/deleted-records`

**Features:**
- View all soft-deleted records by type
- Restore deleted records
- Permanently delete (with confirmation)
- Filter by date range, deleted by

**Design:**
```
┌─────────────────────────────────────────────────────┐
│ Deleted Records                                     │
├─────────────────────────────────────────────────────┤
│ [Tenants ▼] [Last 30 days ▼] [Search...]           │
├─────────────────────────────────────────────────────┤
│ Name          │ Deleted By    │ Deleted At │ Action │
│───────────────│───────────────│────────────│────────│
│ John Doe      │ Amit (Staff)  │ 2 days ago │ Restore│
│ Jane Smith    │ Owner         │ 5 days ago │ Restore│
└─────────────────────────────────────────────────────┘
```

---

## 6. Migration Strategy

### 6.1 Phase 1: Database Schema (Week 1)

1. Create migration `056_add_created_by.sql`
2. Create migration `057_add_soft_delete.sql`
3. Run migrations on staging
4. Verify data integrity
5. Run backfill scripts for `created_by`

### 6.2 Phase 2: Application Code (Week 2)

1. Update useListPage configs to filter soft-deleted
2. Update all insert operations to include `created_by`
3. Replace delete operations with soft delete
4. Update detail page queries to include creator info

### 6.3 Phase 3: UI Components (Week 3)

1. Create RecordMetadata component
2. Create ActivityHistory dialog
3. Integrate into all detail pages
4. Create deleted records management page

### 6.4 Phase 4: Testing & Rollout (Week 4)

1. Test all CRUD operations
2. Test soft delete/restore flow
3. Test UI components
4. Deploy to production
5. Monitor for issues

---

## 7. Risk Assessment

### 7.1 Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing queries | Medium | High | Add filter gradually, test thoroughly |
| Performance impact from soft delete filter | Low | Medium | Partial indexes on deleted_at |
| Data inconsistency during backfill | Low | Medium | Run backfill in transaction |
| UI confusion about deleted records | Low | Low | Clear messaging and separate admin page |

### 7.2 Rollback Plan

1. **Schema Rollback:** Columns are nullable, can be ignored
2. **Code Rollback:** Feature flag to disable soft delete
3. **UI Rollback:** Components are additive, can be hidden

---

## 8. Implementation Plan

### 8.1 Checklist

#### Database
- [ ] Create migration `056_add_created_by.sql`
- [ ] Create migration `057_add_soft_delete.sql`
- [ ] Run migrations on staging
- [ ] Backfill `created_by` from audit_events
- [ ] Update RLS policies
- [ ] Create helper functions (soft_delete, restore_deleted)

#### Application Code
- [ ] Add `created_by` to all insert operations
- [ ] Update useListPage.ts - add soft delete filter to all configs
- [ ] Update useDetailPage.ts - handle soft deleted records
- [ ] Create soft-delete utility functions
- [ ] Update all delete operations to use soft delete

#### UI Components
- [ ] Create RecordMetadata component
- [ ] Create ActivityHistory dialog
- [ ] Integrate RecordMetadata into all detail pages
- [ ] Create /settings/deleted-records page
- [ ] Add "View History" button to detail pages

#### Testing
- [ ] Test insert with created_by
- [ ] Test soft delete functionality
- [ ] Test restore functionality
- [ ] Test RLS policies with soft delete
- [ ] Test UI components
- [ ] Performance testing with soft delete filter

### 8.2 Estimated Effort

| Phase | Effort |
|-------|--------|
| Database migrations | 2-3 hours |
| Application code changes | 4-6 hours |
| UI components | 4-6 hours |
| Testing | 2-3 hours |
| **Total** | **12-18 hours** |

---

## Approval

- [ ] **Technical Review:** Approved by ___________
- [ ] **Product Review:** Approved by ___________
- [ ] **Ready for Implementation**

---

## Appendix

### A. Tables Summary

| Table | created_by | soft_delete | Priority |
|-------|------------|-------------|----------|
| tenants | ✅ Add | ✅ Add | High |
| bills | ✅ Add | ✅ Add | High |
| payments | ✅ Add | ✅ Add | High |
| expenses | ✅ Add | ✅ Add | High |
| refunds | ✅ Add | ✅ Add | High |
| complaints | ✅ Add | ✅ Add | Medium |
| notices | ✅ Add | ✅ Add | Medium |
| visitors | ✅ Add | ⚠️ Optional | Medium |
| meter_readings | ✅ Add | ⚠️ Optional | Medium |
| exit_clearance | ✅ Add | ⚠️ Optional | Medium |
| properties | ✅ Add | ❌ Skip | Low |
| rooms | ✅ Add | ❌ Skip | Low |

### B. Query Examples

**Get record with creator info:**
```sql
SELECT
  t.*,
  u.email as creator_email,
  COALESCE(o.name, sm.name) as creator_name
FROM tenants t
LEFT JOIN auth.users u ON t.created_by = u.id
LEFT JOIN owners o ON t.created_by = o.id
LEFT JOIN staff_members sm ON t.created_by = sm.user_id
WHERE t.id = $1 AND t.deleted_at IS NULL;
```

**Get last modifier from audit_events:**
```sql
SELECT
  ae.actor_id,
  ae.actor_type,
  ae.created_at as modified_at,
  COALESCE(o.name, sm.name, 'System') as modifier_name
FROM audit_events ae
LEFT JOIN owners o ON ae.actor_id = o.id
LEFT JOIN staff_members sm ON ae.actor_id = sm.user_id
WHERE ae.entity_type = 'tenant'
  AND ae.entity_id = $1
  AND ae.action = 'update'
ORDER BY ae.created_at DESC
LIMIT 1;
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-30*
