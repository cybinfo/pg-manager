# Comprehensive Module Review: People, Tenants, Staff, and Visitors

> **Review Date**: 2026-01-20
> **Reviewer**: Claude Code (CPE-AI)
> **Scope**: Deep analysis of four interconnected identity/person management modules

---

## Executive Summary

This review covers four interconnected modules that form the **person-centric architecture** of ManageKar:

| Module       | Files                   | Lines      | Issues Found | Critical |
|--------------|-------------------------|------------|--------------|----------|
| **People**   | 8 pages + 3 components  | ~2,000     | 12           | 2        |
| **Tenants**  | 12 files                | ~3,000     | 31           | 7        |
| **Staff**    | 6 pages                 | ~2,500     | 15           | 3        |
| **Visitors** | 5 pages                 | ~3,500     | 28           | 3        |
| **Total**    | **31 files**            | **~11,000**| **86**       | **15**   |

### Key Findings

1. **Architecture is sound** - The person-centric model with unified identity is well-designed
2. **Implementation gaps** - Several critical patterns from CLAUDE.md are not consistently applied
3. **Security concerns** - Missing permission guards, client-side-only validations
4. **Code duplication** - Same transform/fetch logic repeated across modules
5. **Type safety gaps** - Mismatches between TypeScript types and database schema

---

## Table of Contents

1. [People Module](#1-people-module)
2. [Tenants Module](#2-tenants-module)
3. [Staff Module](#3-staff-module)
4. [Visitors Module](#4-visitors-module)
5. [Cross-Cutting Issues](#5-cross-cutting-issues)
6. [Priority Matrix](#6-priority-matrix)
7. [Recommendations](#7-recommendations)

---

## 1. People Module

### 1.1 Overview

The People module is the **central identity registry** - a unified source of truth for all persons (tenants, staff, visitors). It eliminates data duplication by having all other modules reference `people.id`.

Key Files:

- `src/app/(dashboard)/people/page.tsx` - Directory listing
- `src/app/(dashboard)/people/[id]/page.tsx` - 360° view
- `src/app/(dashboard)/people/new/page.tsx` - Create person
- `src/app/(dashboard)/people/[id]/edit/page.tsx` - Edit person
- `src/app/(dashboard)/people/duplicates/page.tsx` - Duplicate detection
- `src/app/(dashboard)/people/merge/page.tsx` - Merge duplicates
- `src/components/people/person-selector.tsx` - Reusable picker
- `src/components/people/person-card.tsx` - Display card
- `src/types/people.types.ts` - TypeScript interfaces

### 1.2 Issues Found

#### People - Critical Issues

| ID      | Issue                                              | Location              | Impact                                         |
|---------|----------------------------------------------------|-----------------------|------------------------------------------------|
| PPL-001 | **No permission guard on detail page**             | `people/[id]/page.tsx`| Unauthorized access to sensitive person data   |
| PPL-002 | **Person query from URL doesn't validate owner**   | `people/[id]/page.tsx`| Cross-tenant data leakage if URL manipulated   |

#### People - High Priority Issues

| ID      | Issue                                                    | Location               | Impact                                |
|---------|----------------------------------------------------------|------------------------|---------------------------------------|
| PPL-003 | PersonSelector doesn't prevent selecting blocked people  | `person-selector.tsx`  | Blocked people can be added to modules|
| PPL-004 | Duplicate detection uses name similarity only            | `duplicates/page.tsx`  | May miss phone/email duplicates       |
| PPL-005 | Merge operation has no transaction guarantee             | `merge/page.tsx`       | Partial merge could corrupt data      |

#### People - Medium Priority Issues

| ID      | Issue                                            | Location          | Impact                                   |
|---------|--------------------------------------------------|-------------------|------------------------------------------|
| PPL-006 | No audit logging for person operations           | All pages         | Compliance gap                           |
| PPL-007 | Tags array manipulation without validation       | `new/page.tsx`    | Invalid tags could be stored             |
| PPL-008 | Emergency contact `person_id` not validated      | `new/page.tsx`    | Could link to non-existent person        |
| PPL-009 | Phone number validation uses basic regex         | `new/page.tsx`    | Invalid Indian mobile numbers accepted   |
| PPL-010 | No pagination in 360° view lists                 | `[id]/page.tsx`   | Performance issues with large data       |

#### People - Low Priority Issues

| ID      | Issue                                    | Location          | Impact                       |
|---------|------------------------------------------|-------------------|------------------------------|
| PPL-011 | No loading skeleton on initial fetch     | All pages         | Poor perceived performance   |
| PPL-012 | Edit page doesn't show what changed      | `edit/page.tsx`   | UX issue                     |

### 1.3 Architecture Notes

Strengths:

- Clean separation of identity (people) from role-specific data (tenants/staff/visitors)
- Deduplication and merge capabilities built-in
- 360° view provides comprehensive person history
- PersonSelector component is reusable across modules

Weaknesses:

- `person_id` can be NULL in referencing tables (backwards compatibility)
- No data migration to link existing records to people table
- Permission model borrows from `tenants.view` instead of dedicated permission

---

## 2. Tenants Module

### 2.1 Overview

The Tenants module handles the full tenant lifecycle: onboarding, room transfers, notice periods, and checkout. It's the most complex module with ~3,000 lines of code.

Key Files:

- `src/app/(dashboard)/tenants/page.tsx` - Tenant listing
- `src/app/(dashboard)/tenants/[id]/page.tsx` - Tenant detail (~560 lines)
- `src/app/(dashboard)/tenants/new/page.tsx` - Add tenant (~526 lines)
- `src/app/(dashboard)/tenants/[id]/edit/page.tsx` - Edit tenant
- `src/app/(dashboard)/tenants/[id]/bills/page.tsx` - Tenant bills
- `src/app/(dashboard)/tenants/[id]/payments/page.tsx` - Tenant payments
- `src/app/(dashboard)/tenants/[id]/journey/page.tsx` - Journey view
- `src/lib/workflows/tenant.workflow.ts` - Business logic (~1,060 lines)
- `src/app/api/tenants/[id]/journey/route.ts` - Journey API

### 2.2 Issues Found

#### Tenants - Critical Issues

| ID      | Issue                                                   | Location                   | Impact                                    |
|---------|---------------------------------------------------------|----------------------------|-------------------------------------------|
| TEN-001 | **No PermissionGuard on detail page**                   | `[id]/page.tsx`            | Sensitive tenant data exposed             |
| TEN-002 | **Room transfer not atomic**                            | `[id]/page.tsx:447-515`    | Race condition can corrupt occupancy      |
| TEN-003 | **Room capacity not validated before transfer**         | `[id]/page.tsx`            | Can exceed room capacity                  |
| TEN-004 | **Delete allowed without checking outstanding bills**   | `[id]/page.tsx:407-426`    | Financial data integrity                  |
| TEN-005 | **Blocked person can be invited**                       | `new/page.tsx:464-477`     | Blocked people can become tenants         |
| TEN-006 | **API route lacks workspace isolation**                 | `api/route.ts`             | Staff access control incomplete           |
| TEN-007 | **Manual JOIN transform instead of helper**             | `[id]/page.tsx:239-245`    | CLAUDE.md violation, fragile code         |

#### Tenants - High Priority Issues

| ID      | Issue                                                   | Location                   | Impact                           |
|---------|---------------------------------------------------------|----------------------------|----------------------------------|
| TEN-008 | roomTransferWorkflow exists but not used                | `[id]/page.tsx:447`        | Two different implementations    |
| TEN-009 | No transaction support for multi-step operations        | Multiple                   | Partial operations possible      |
| TEN-010 | Notice period workflow not atomic                       | `[id]/page.tsx:365-401`    | Data inconsistency               |
| TEN-011 | No validation that monthly_rent > 0                     | `new/page.tsx:248-259`     | Invalid financial data           |
| TEN-012 | No audit event on tenant delete                         | `[id]/page.tsx:407`        | Compliance gap                   |
| TEN-013 | Journey API categories validation inconsistent          | `api/route.ts:118-149`     | Potential bugs                   |
| TEN-014 | Missing PermissionGuard on edit/bills/payments pages    | Multiple                   | Authorization gap                |
| TEN-015 | generate_initial_bill defaulted to false                | `new/page.tsx:363`         | Inconsistent with business logic |
| TEN-016 | Unsafe `any` type casting                               | `[id]/page.tsx`            | Runtime errors                   |

#### Tenants - Medium Priority Issues

| ID      | Issue                                                   | Location                   | Impact                        |
|---------|---------------------------------------------------------|----------------------------|-------------------------------|
| TEN-017 | Duplicate tenant fetch logic across 5 files             | Multiple                   | Maintenance burden            |
| TEN-018 | Hard-coded values (30-day notice period)                | `[id]/page.tsx:355`        | Should be configurable        |
| TEN-019 | N+1 query problem (8 sequential queries)                | `[id]/page.tsx:213-349`    | Performance                   |
| TEN-020 | No pagination in detail lists                           | `[id]/page.tsx`            | Performance with large data   |
| TEN-021 | `window.location.reload()` after transfer               | `[id]/page.tsx:508`        | Poor UX                       |
| TEN-022 | Status badge naming inconsistent                        | `[id]/page.tsx:528-536`    | `checked_out` vs `moved_out`  |
| TEN-023 | Person data usage inconsistent                          | `new/page.tsx`             | Duplicate fields for compat   |
| TEN-024 | Silent failures on person linking                       | `new/page.tsx:417-512`     | Data integrity                |
| TEN-025 | Notes field uses string concatenation for history       | `[id]/page.tsx:365-401`    | Brittle pattern               |

#### Tenants - Low Priority Issues

| ID      | Issue                                           | Location              | Impact          |
|---------|-------------------------------------------------|-----------------------|-----------------|
| TEN-026 | No skeleton loading                             | `new/page.tsx`        | UX              |
| TEN-027 | No progress indication for multi-step workflow  | `new/page.tsx`        | UX              |
| TEN-028 | Missing breadcrumb on edit pages                | `edit/page.tsx`       | Navigation      |
| TEN-029 | Inconsistent error handling messages            | Multiple              | UX              |
| TEN-030 | No unit tests for workflow                      | `tenant.workflow.ts`  | Quality         |
| TEN-031 | Missing inline documentation                    | Multiple              | Maintainability |

### 2.3 Code Samples

Issue TEN-002 - Non-atomic room transfer:

```typescript
// Current implementation - THREE separate updates that can race
await supabase.from("room_transfers").insert({...})
await supabase.from("tenant_stays").update({...})
await supabase.from("tenants").update({...})

// Should use: roomTransferWorkflow from tenant.workflow.ts
```

Issue TEN-007 - Manual JOIN transform:

```typescript
// Current - violates CLAUDE.md section 3.1
property: Array.isArray(tenantData.property) ? tenantData.property[0] : tenantData.property,

// Should be:
import { transformJoin } from "@/lib/supabase/transforms"
property: transformJoin(tenantData.property),
```

---

## 3. Staff Module

### 3.1 Overview

The Staff module implements a sophisticated RBAC system with 50+ permissions, multi-role support, and property-scoped access.

Key Files:

- `src/app/(dashboard)/staff/page.tsx` - Staff listing
- `src/app/(dashboard)/staff/[id]/page.tsx` - Staff detail (~560 lines)
- `src/app/(dashboard)/staff/new/page.tsx` - Add staff (~620 lines)
- `src/app/(dashboard)/staff/roles/page.tsx` - Role listing
- `src/app/(dashboard)/staff/roles/new/page.tsx` - Create role
- `src/app/(dashboard)/staff/roles/[id]/page.tsx` - Edit role
- `src/lib/auth/types.ts` - Permission definitions
- `src/lib/auth/auth-context.tsx` - Permission checking

### 3.2 Issues Found

#### Staff - Critical Issues

| ID      | Issue                                                      | Location                   | Impact                                |
|---------|------------------------------------------------------------|----------------------------|---------------------------------------|
| STF-001 | **Duplicate role assignments allowed**                     | `[id]/page.tsx:230-261`    | No check for existing role+property   |
| STF-002 | **Person query from URL doesn't validate owner**           | `new/page.tsx:101-120`     | Cross-tenant data access              |
| STF-003 | **Email used from formData instead of selectedPerson**     | `new/page.tsx:303,341`     | Invitation sent to wrong email        |

#### Staff - High Priority Issues

| ID      | Issue                                            | Location                     | Impact                               |
|---------|--------------------------------------------------|------------------------------|--------------------------------------|
| STF-004 | Silent RPC failures on person creation           | `new/page.tsx:209-230`       | Person link silently lost            |
| STF-005 | No page-level permission gate on role pages      | `roles/new/page.tsx:175-186` | UI loads before RLS blocks           |
| STF-006 | Race condition in role detail fetch              | `roles/[id]/page.tsx:148-182`| Stale data could display             |
| STF-007 | Staff detail doesn't verify ownership            | `[id]/page.tsx:102-110`      | RLS handles it but error not graceful|

#### Staff - Medium Priority Issues

| ID      | Issue                                       | Location              | Impact                       |
|---------|---------------------------------------------|-----------------------|------------------------------|
| STF-008 | Duplicate transform logic                   | Multiple files        | DRY violation                |
| STF-009 | Email validation too permissive             | `new/page.tsx:175-179`| Invalid emails accepted      |
| STF-010 | Email normalization inconsistent            | Multiple              | Duplicate profiles possible  |
| STF-011 | System role protection logic distributed    | `roles/[id]/page.tsx` | Should be centralized        |
| STF-012 | No confirmation summary before creating role| `roles/new/page.tsx`  | UX gap                       |

#### Staff - Low Priority Issues

| ID      | Issue                                    | Location               | Impact             |
|---------|------------------------------------------|------------------------|--------------------|
| STF-013 | Role sort order unclear in list display  | `page.tsx:112-137`     | UX confusion       |
| STF-014 | Staff detail page too long (560 lines)   | `[id]/page.tsx`        | Should split       |
| STF-015 | Email failure shows success toast        | `new/page.tsx:318-350` | Confusing feedback |

### 3.3 RBAC Architecture Analysis

Permission Hierarchy:

```text
Platform Admin (superuser) → Full access ALL workspaces
         ↓
Owner → Full access to their workspace
         ↓
Staff → Role-based permissions (UNION of all assigned roles)
         ↓
Tenant → Fixed hardcoded permissions
```

Permission Check Flow:

```typescript
hasPermission(permission) {
  if (isPlatformAdmin) return true              // Bypass
  if (context_type === 'owner') return true     // Owner full access
  if (context_type === 'tenant') {
    return TENANT_PERMISSIONS.includes(permission)
  }
  if (context_type === 'staff') {
    return currentContext.permissions.includes(permission)  // Aggregated
  }
  return false
}
```

Strengths:

- Multi-role support with permission aggregation
- Property-scoped role assignments
- System roles protected from modification
- Clean separation of roles and permissions

Weaknesses:

- No permission inheritance (child permissions don't imply parent)
- Staff permissions not cached (re-fetched on each check)
- No permission audit trail

---

## 4. Visitors Module

### 4.1 Overview

The Visitors module supports four visitor types (tenant visitor, enquiry, service provider, general) with dual-database model: `visitors` for check-in records and `visitor_contacts` for directory.

Key Files:

- `src/app/(dashboard)/visitors/page.tsx` - Visitor log
- `src/app/(dashboard)/visitors/[id]/page.tsx` - Visitor detail (~773 lines)
- `src/app/(dashboard)/visitors/new/page.tsx` - Check-in form (~1,303 lines)
- `src/app/(dashboard)/visitors/directory/page.tsx` - Visitor directory
- `src/types/visitors.types.ts` - TypeScript interfaces
- Migrations: 002, 037, 046

### 4.2 Issues Found

#### Visitors - Critical Issues

| ID      | Issue                                                        | Location                  | Impact                         |
|---------|--------------------------------------------------------------|---------------------------|--------------------------------|
| VIS-001 | **Blocked visitor check is client-side only**                | `new/page.tsx:220`        | Security bypass possible       |
| VIS-002 | **tenant_id NOT NULL but only needed for tenant_visitor**    | DB schema                 | Data integrity errors          |
| VIS-003 | **Visitor contact search doesn't filter by owner_id**        | `new/page.tsx:158-183`    | Data leakage if RLS disabled   |

#### Visitors - High Priority Issues

| ID      | Issue                                                | Location                  | Impact                         |
|---------|------------------------------------------------------|---------------------------|--------------------------------|
| VIS-004 | No staff/multi-workspace context in RLS              | Migration 002             | Staff can't see visitors       |
| VIS-005 | TypeScript type says nullable, DB says NOT NULL      | Types vs DB               | Runtime type mismatches        |
| VIS-006 | No checkout trigger to update visitor_contact stats  | Migration 046             | Inaccurate "last visit"        |
| VIS-007 | Enquiry conversion doesn't auto-update status        | `[id]/page.tsx:367-376`   | Inconsistent tracking          |
| VIS-008 | Bill creation failure doesn't prevent visitor        | `new/page.tsx:482-515`    | Billing inconsistencies        |

#### Visitors - Medium Priority Issues

| ID      | Issue                                                   | Location             | Impact                    |
|---------|---------------------------------------------------------|----------------------|---------------------------|
| VIS-009 | Data migration has collision issues                     | Migration 046        | Corrupt data for old inst |
| VIS-010 | No audit trail for visitor operations                   | All pages            | Compliance gap            |
| VIS-011 | Type safety issues in array transforms                  | Multiple             | Runtime errors            |
| VIS-012 | Overnight charge validation missing                     | `new/page.tsx:153`   | Invalid charges possible  |
| VIS-013 | No expected checkout date enforcement                   | Schema               | Unlimited stays           |
| VIS-014 | Legacy contact selection UI alongside PersonSelector    | `new/page.tsx`       | Confusing UX              |
| VIS-015 | No rate limiting or CSRF protection                     | `new/page.tsx`       | Security gap              |

#### Visitors - Low Priority Issues

| ID      | Issue                                         | Location             | Impact          |
|---------|-----------------------------------------------|----------------------|-----------------|
| VIS-016 | No quick check-out on list view               | `page.tsx`           | UX              |
| VIS-017 | No bulk operations                            | All pages            | UX              |
| VIS-018 | Duplicated badge constants in 4 files         | Multiple             | DRY violation   |
| VIS-019 | Very long component files (1,303 lines)       | `new/page.tsx`       | Maintainability |
| VIS-020 | No visitor analytics/reports                  | Schema               | Missing feature |
| VIS-021 | No visitor photo capture UI                   | `new/page.tsx`       | Feature gap     |
| VIS-022 | No phone/email/ID validation                  | `new/page.tsx`       | Data quality    |
| VIS-023 | No error retry logic                          | All pages            | Resilience      |
| VIS-024 | Client-side search filtering                  | `directory/page.tsx` | Performance     |
| VIS-025 | Inconsistent permission checking across pages | Multiple             | Auth inconsist  |
| VIS-026 | No React Error Boundary                       | All pages            | Crash handling  |
| VIS-027 | No unit/integration tests                     | N/A                  | Quality         |
| VIS-028 | Missing JSDoc documentation                   | All files            | Maintainability |

### 4.3 Database Schema Issues

Critical Issue - tenant_id Constraint:

```sql
-- Current (002_visitors.sql)
tenant_id UUID NOT NULL REFERENCES tenants(id)  -- WRONG

-- Should be
tenant_id UUID REFERENCES tenants(id)  -- Nullable for non-tenant visitors
-- Then validate at application level for tenant_visitor type
```

Missing RLS for Staff Access:

```sql
-- Current
CREATE POLICY "Users can view their own visitors"
  ON visitors FOR SELECT
  USING (auth.uid() = owner_id);  -- Only owner

-- Should include
OR EXISTS (
  SELECT 1 FROM user_contexts uc
  WHERE uc.user_id = auth.uid()
  AND uc.workspace_id = (SELECT workspace_id FROM properties WHERE id = visitors.property_id)
)
```

---

## 5. Cross-Cutting Issues

### 5.1 Pattern Violations (CLAUDE.md)

| Section  | Requirement                                 | Violations                                          |
|----------|---------------------------------------------|-----------------------------------------------------|
| **3.1**  | Use `transformJoin()` for Supabase JOINs    | TEN-007, plus 8 other instances                     |
| **3.2**  | Wrap dashboard pages with `PermissionGuard` | PPL-001, TEN-001, TEN-014, VIS-025                  |
| **4.1**  | Use custom Select component                 | Generally followed                                  |
| **6.1**  | Use workflow engine for multi-step ops      | TEN-002, TEN-008 (workflow exists but not used)     |
| **6.2**  | Log audit events for sensitive ops          | PPL-006, TEN-012, VIS-010                           |
| **8.2**  | Apply rate limiting                         | VIS-015 (visitor check-in unprotected)              |

### 5.2 Security Issues Summary

| Priority     | Count | Key Issues                                                                           |
|--------------|-------|--------------------------------------------------------------------------------------|
| **Critical** | 6     | Client-side-only blocked person check, missing permission guards, cross-tenant data  |
| **High**     | 8     | Non-atomic operations, race conditions, missing workspace isolation                  |
| **Medium**   | 12    | Incomplete validation, no audit logging, email normalization                         |

### 5.3 Code Quality Issues

| Category          | Count   | Examples                                                     |
|-------------------|---------|--------------------------------------------------------------|
| **DRY Violations**| 15+     | Transform logic duplicated, badge constants in 4 files       |
| **Type Safety**   | 12      | `any` types, DB/TS mismatches                                |
| **Long Files**    | 4       | visitors/new (1303), tenant detail (560), staff detail (560) |
| **Missing Tests** | 4       | No unit tests for workflows                                  |

### 5.4 Person-Centric Integration Status

| Module   | PersonSelector Used | person_id FK         | person_roles Tracked |
|----------|---------------------|----------------------|----------------------|
| Tenants  | Yes                 | Added (nullable)     | On create            |
| Staff    | Yes                 | Added (nullable)     | On create            |
| Visitors | Yes                 | Added (nullable)     | Not implemented      |

Integration Issues:

- `person_id` can be NULL (backwards compat), but creates inconsistent data
- No migration to link existing records to people
- Visitors don't create person_roles entries

---

## 6. Priority Matrix

### 6.1 Critical (Fix Immediately)

| ID      | Module   | Issue                                   | Effort |
|---------|----------|-----------------------------------------|--------|
| VIS-001 | Visitors | Blocked visitor check client-side only  | S      |
| TEN-001 | Tenants  | No PermissionGuard on detail page       | S      |
| PPL-001 | People   | No PermissionGuard on detail page       | S      |
| TEN-002 | Tenants  | Room transfer not atomic                | M      |
| VIS-002 | Visitors | tenant_id NOT NULL constraint wrong     | M      |
| STF-001 | Staff    | Duplicate role assignments allowed      | S      |

### 6.2 High (Fix This Week)

| ID      | Module   | Issue                                   | Effort |
|---------|----------|-----------------------------------------|--------|
| TEN-004 | Tenants  | Delete without checking bills           | S      |
| TEN-005 | Tenants  | Blocked person can be invited           | S      |
| PPL-002 | People   | Person URL query no owner check         | S      |
| STF-002 | Staff    | Person URL query no owner check         | S      |
| STF-003 | Staff    | Wrong email used for invitation         | S      |
| VIS-004 | Visitors | No staff access in RLS                  | M      |
| TEN-007 | Tenants  | Manual JOIN transform (8+ instances)    | M      |
| TEN-008 | Tenants  | Workflow exists but not used            | M      |

### 6.3 Medium (Fix This Sprint)

| ID      | Module   | Issue                        | Effort |
|---------|----------|------------------------------|--------|
| VIS-006 | Visitors | Checkout trigger missing     | S      |
| VIS-007 | Visitors | Enquiry conversion incomplete| M      |
| TEN-012 | Tenants  | No audit on delete           | S      |
| PPL-006 | People   | No audit logging             | M      |
| VIS-010 | Visitors | No audit logging             | M      |
| TEN-017 | Tenants  | Duplicate fetch logic        | M      |
| STF-008 | Staff    | Duplicate transform logic    | M      |
| VIS-018 | Visitors | Duplicate badge constants    | S      |

### 6.4 Low (Backlog)

All remaining issues (UX improvements, documentation, tests, analytics features)

---

## 7. Recommendations

### 7.1 Immediate Actions (This Week)

1. **Add Permission Guards**
   - Wrap all detail/edit pages with `<PermissionGuard>`
   - Create a lint rule to enforce this

2. **Fix Critical Security Issues**
   - Add server-side blocked person check in visitors
   - Add owner_id filter to all person URL queries
   - Validate role+property uniqueness before insert

3. **Fix Database Constraints**
   - Alter `visitors.tenant_id` to be nullable
   - Add CHECK constraint for tenant_id when type = 'tenant_visitor'

### 7.2 Short-Term (This Sprint)

1. **Centralize Common Logic**
   - Create `src/lib/services/person.service.ts` for person operations
   - Create `src/lib/services/tenant.service.ts` for tenant fetch/transform
   - Extract transform logic into reusable functions

2. **Use Existing Workflows**
   - Replace manual room transfer with `roomTransferWorkflow`
   - Ensure all multi-step operations use workflow engine

3. **Add Audit Logging**
   - Add `createAuditEvent` calls for delete operations
   - Add audit for blocked/unblocked person changes

### 7.3 Medium-Term (This Month)

1. **Fix RLS for Multi-Workspace**
   - Update visitors RLS to include staff access
   - Test with staff account at property

2. **Improve Data Quality**
   - Add phone/email validators from `src/lib/validators`
   - Add ID number format validation (Aadhaar, PAN)
   - Add CHECK constraints in database

3. **Component Refactoring**
   - Split `visitors/new/page.tsx` (1303 lines) into smaller components
   - Extract role management from `staff/[id]/page.tsx`
   - Create reusable `TenantInfoCard` component

### 7.4 Long-Term (Next Quarter)

1. **Testing**
   - Add unit tests for all workflow files
   - Add integration tests for critical flows
   - Add RLS policy tests

2. **Documentation**
   - Add JSDoc to all exported functions
   - Create architecture diagrams for person-centric model
   - Document permission hierarchy

3. **Feature Completeness**
   - Implement visitor analytics
   - Add bulk operations
   - Complete person_roles tracking for visitors

---

## Appendix A: File Path Reference

### People Module

```text
src/app/(dashboard)/people/page.tsx
src/app/(dashboard)/people/[id]/page.tsx
src/app/(dashboard)/people/new/page.tsx
src/app/(dashboard)/people/[id]/edit/page.tsx
src/app/(dashboard)/people/duplicates/page.tsx
src/app/(dashboard)/people/merge/page.tsx
src/components/people/person-selector.tsx
src/components/people/person-card.tsx
src/types/people.types.ts
supabase/migrations/047_people_module.sql
supabase/migrations/050_merge_people.sql
supabase/migrations/051_duplicate_detection.sql
```

### Tenants Module

```text
src/app/(dashboard)/tenants/page.tsx
src/app/(dashboard)/tenants/[id]/page.tsx
src/app/(dashboard)/tenants/new/page.tsx
src/app/(dashboard)/tenants/[id]/edit/page.tsx
src/app/(dashboard)/tenants/[id]/bills/page.tsx
src/app/(dashboard)/tenants/[id]/payments/page.tsx
src/app/(dashboard)/tenants/[id]/journey/page.tsx
src/lib/workflows/tenant.workflow.ts
src/app/api/tenants/[id]/journey/route.ts
src/app/api/tenants/[id]/journey-report/route.ts
```

### Staff Module

```text
src/app/(dashboard)/staff/page.tsx
src/app/(dashboard)/staff/[id]/page.tsx
src/app/(dashboard)/staff/new/page.tsx
src/app/(dashboard)/staff/roles/page.tsx
src/app/(dashboard)/staff/roles/new/page.tsx
src/app/(dashboard)/staff/roles/[id]/page.tsx
src/lib/auth/types.ts
src/lib/auth/auth-context.tsx
src/components/auth/permission-gate.tsx
supabase/migrations/004_staff_management.sql
```

### Visitors Module

```text
src/app/(dashboard)/visitors/page.tsx
src/app/(dashboard)/visitors/[id]/page.tsx
src/app/(dashboard)/visitors/new/page.tsx
src/app/(dashboard)/visitors/directory/page.tsx
src/types/visitors.types.ts
supabase/migrations/002_visitors.sql
supabase/migrations/037_visitor_multi_day_support.sql
supabase/migrations/046_visitor_contacts_directory.sql
```

---

## Appendix B: Issue Tracking Checklist

### Critical Issues (6)

- [ ] VIS-001: Add API route for visitor check-in with blocked check
- [ ] TEN-001: Add PermissionGuard to tenant detail page
- [ ] PPL-001: Add PermissionGuard to people detail page
- [ ] TEN-002: Use roomTransferWorkflow for atomic transfers
- [ ] VIS-002: Alter tenant_id to be nullable in visitors table
- [ ] STF-001: Add duplicate check before role assignment

### High Issues (8)

- [ ] TEN-004: Check outstanding bills before tenant delete
- [ ] TEN-005: Validate person is not blocked before invitation
- [ ] PPL-002: Add owner_id filter to person URL fetch
- [ ] STF-002: Add owner_id filter to person URL fetch
- [ ] STF-003: Use selectedPerson.email instead of formData.email
- [ ] VIS-004: Update visitors RLS to include staff access
- [ ] TEN-007: Replace manual transforms with transformJoin()
- [ ] TEN-008: Use roomTransferWorkflow from workflow file

---

Generated by Claude Code (CPE-AI) - 2026-01-20
