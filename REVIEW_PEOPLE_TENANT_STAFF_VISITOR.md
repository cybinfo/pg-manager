# Comprehensive Module Review: People, Tenants, Staff, and Visitors

> **Review Date**: 2026-01-20 (Updated)
> **Reviewer**: Claude Code (CPE-AI)
> **Scope**: Deep architectural analysis of person-centric modules

---

## Executive Summary

This review covers four interconnected modules that should form a **unified person-centric architecture**. The critical finding is that while the architecture was designed correctly, **implementation has significant data duplication issues** that violate the single-source-of-truth principle.

| Module       | Files                   | Architecture Issues | Data Duplication | Critical |
|--------------|-------------------------|---------------------|------------------|----------|
| **People**   | 8 pages + 3 components  | 2                   | N/A (source)     | 2        |
| **Tenants**  | 12 files                | 8                   | **SEVERE**       | 9        |
| **Staff**    | 6 pages                 | 3                   | Minimal          | 3        |
| **Visitors** | 5 pages                 | 6                   | **SEVERE**       | 5        |
| **Total**    | **31 files**            | **19**              | -                | **19**   |

### The Core Problem

**The People module is comprehensive but underutilized.** Personal data that should be stored ONLY in the `people` table is being duplicated in:

- `tenants` table (name, email, phone, addresses, guardian_contacts, id_documents)
- `visitors` table (visitor_name, visitor_phone, id_type, id_number, company_name)
- `visitor_contacts` table (name, phone, id_type, id_number, company_name, service_type)

---

## 1. Critical Architecture Finding: Data Duplication Map

### 1.1 What Should Be the Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     PEOPLE TABLE (Source of Truth)              │
│  - name, phone, email, photo_url                                │
│  - id_documents[] (Aadhaar, PAN, License, Passport, etc.)       │
│  - permanent_address, current_address, city, state, pincode     │
│  - emergency_contacts[] (name, phone, relation)                 │
│  - occupation, company_name, designation                        │
│  - dob, gender, blood_group                                     │
│  - tags[], is_verified, is_blocked                              │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ TENANTS TABLE   │  │ STAFF TABLE     │  │ VISITORS TABLE  │
│ (Tenancy Data)  │  │ (Role Data)     │  │ (Visit Data)    │
│                 │  │                 │  │                 │
│ - person_id FK  │  │ - person_id FK  │  │ - person_id FK  │
│ - property_id   │  │ - user_id       │  │ - property_id   │
│ - room_id       │  │ - is_active     │  │ - tenant_id     │
│ - monthly_rent  │  │                 │  │ - check_in_time │
│ - deposit       │  │ (roles via      │  │ - check_out_time│
│ - check_in_date │  │  user_roles)    │  │ - purpose       │
│ - police_status │  │                 │  │ - visitor_type  │
│ - agreement     │  │                 │  │ - is_overnight  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 1.2 What Actually Exists (PROBLEM)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     PEOPLE TABLE (Underutilized)                │
│  ✓ Has all fields defined correctly                             │
│  ✗ Other modules don't READ from here, they DUPLICATE           │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ TENANTS TABLE   │  │ STAFF TABLE     │  │ VISITORS TABLE  │
│ ❌ DUPLICATES:  │  │ ✓ Clean:        │  │ ❌ DUPLICATES:  │
│                 │  │                 │  │                 │
│ - name          │  │ - person_id FK  │  │ - visitor_name  │
│ - email         │  │ - name (display)│  │ - visitor_phone │
│ - phone         │  │ - email         │  │ - id_type       │
│ - photo_url     │  │ - phone         │  │ - id_number     │
│ - phone_numbers │  │                 │  │ - company_name  │
│ - emails        │  │ Staff is mostly │  │ - service_type  │
│ - addresses     │  │ correct!        │  │                 │
│ - guardian_cont │  │                 │  │ + visitor_cont  │
│ - id_documents  │  │                 │  │   table ALSO    │
│                 │  │                 │  │   duplicates    │
│ + person_id     │  │                 │  │   all of these  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 2. Tenant Module - Severe Data Duplication

### 2.1 Fields in Tenant Form That Should NOT Exist

| Field in Tenant Form               | Already In People              | Impact                                 |
|------------------------------------|--------------------------------|----------------------------------------|
| ID Documents upload (Aadhaar, etc) | `people.id_documents[]`        | **CRITICAL** - User asked about this   |
| Emergency contacts                 | `people.emergency_contacts[]`  | Data divergence risk                   |
| Addresses (permanent/current)      | `people.permanent_address`     | Sync issues                            |
| Secondary phone numbers            | `people.phone_numbers[]`       | Duplicate storage                      |
| Secondary emails                   | `people.emails[]`              | Duplicate storage                      |

### 2.2 Code Evidence - Tenant Workflow (tenant.workflow.ts)

Lines 299-324 show duplication:

```typescript
const tenantData = {
  name: input.name,                    // ❌ DUPLICATE - exists in people.name
  email: input.email,                  // ❌ DUPLICATE - exists in people.email
  phone: input.phone,                  // ❌ DUPLICATE - exists in people.phone
  photo_url: input.photo_url,          // ❌ DUPLICATE - exists in people.photo_url
  phone_numbers: input.phones,         // ❌ DUPLICATE - exists in people.phone_numbers
  emails: input.emails,                // ❌ DUPLICATE - exists in people.emails
  addresses: input.addresses,          // ❌ DUPLICATE - exists in people addresses
  guardian_contacts: input.guardians,  // ❌ DUPLICATE - exists in people.emergency_contacts
  id_documents: input.idDocuments,     // ❌ DUPLICATE - exists in people.id_documents
  person_id: personResult?.person_id,  // ✓ CORRECT - this is the link
}
```

### 2.3 Database Schema Issue (Migration 011)

The `tenants` table has JSONB columns that duplicate People module:

- `phone_numbers` JSONB - Should use `people.phone_numbers`
- `emails` JSONB - Should use `people.emails`
- `addresses` JSONB - Should use `people.permanent_address` + `current_address`
- `guardian_contacts` JSONB - Should use `people.emergency_contacts`

### 2.4 What Tenant Form SHOULD Collect

Only tenancy-specific data:

| Field                        | Why It's Tenant-Specific        |
|------------------------------|---------------------------------|
| `property_id`                | Which property                  |
| `room_id`                    | Which room                      |
| `monthly_rent`               | Rent for THIS tenancy           |
| `security_deposit`           | Deposit for THIS tenancy        |
| `check_in_date`              | When THIS tenancy starts        |
| `police_verification_status` | Status for THIS property        |
| `agreement_signed`           | Agreement for THIS tenancy      |
| `notes`                      | Notes for THIS tenancy          |

---

## 3. Visitor Module - Triple Data Duplication

### 3.1 The Three-Way Duplication Problem

Personal data is stored in THREE places:

#### Location 1: Form State to visitors table

```typescript
const visitorData = {
  visitor_name: formData.visitor_name,      // ❌ Should be people.name
  visitor_phone: formData.visitor_phone,    // ❌ Should be people.phone
  id_type: formData.id_type,                // ❌ Should be people.id_documents
  id_number: formData.id_number,            // ❌ Should be people.id_documents
  company_name: formData.company_name,      // ❌ Should be people.company_name
  service_type: formData.service_type,      // ❌ Should be people tag metadata
}
```

#### Location 2: Form State to visitor_contacts table

```typescript
.insert({
  name: formData.visitor_name,              // ❌ DUPLICATE
  phone: formData.visitor_phone || null,    // ❌ DUPLICATE
  company_name: formData.company_name,      // ❌ DUPLICATE
  service_type: formData.service_type,      // ❌ DUPLICATE
  id_type: formData.id_type,                // ❌ DUPLICATE
  id_number: formData.id_number,            // ❌ DUPLICATE
})
```

#### Location 3: Should be in people table only

- All the above fields already exist in `people` table
- PersonSelector already links to `people.id`
- But form doesn't READ from people, it collects fresh data

### 3.2 PersonSelector Integration Gap

PersonSelector only populates 2 fields from People:

```typescript
const handlePersonSelect = (person: PersonSearchResult | null) => {
  setFormData((prev) => ({
    ...prev,
    visitor_name: person.name,           // ✓ Pulled from people
    visitor_phone: person.phone || "",   // ✓ Pulled from people
    // ❌ MISSING: id_documents, company_name, service_type
  }))
}
```

### 3.3 What Visitor Form SHOULD Collect

Only visit-specific data:

| Field             | Why It's Visit-Specific           |
|-------------------|-----------------------------------|
| `property_id`     | Where the visit occurs            |
| `tenant_id`       | Who they're visiting (if tenant)  |
| `check_in_time`   | When THIS visit started           |
| `check_out_time`  | When THIS visit ended             |
| `purpose`         | Reason for THIS visit             |
| `visitor_type`    | Context of THIS visit             |
| `vehicle_number`  | Vehicle for THIS visit            |
| `is_overnight`    | THIS visit overnight?             |
| `num_nights`      | Duration of THIS stay             |
| `charge_per_night`| Rate for THIS stay                |
| `rooms_interested`| Rooms viewed in THIS enquiry      |
| `follow_up_date`  | Follow-up for THIS enquiry        |

---

## 4. Staff Module - Generally Clean

### 4.1 What's Working Well

The Staff module is the **best implemented** of the three role modules:

- ✓ Uses PersonSelector as primary flow
- ✓ Only collects name/email/phone as fallback when no person selected
- ✓ Role assignments correctly stored in `user_roles` table
- ✓ Links to person via `person_id` foreign key
- ✓ Does NOT duplicate ID documents, addresses, or emergency contacts

### 4.2 Minor Issues

| Issue                                                    | Location                | Impact                    |
|----------------------------------------------------------|-------------------------|---------------------------|
| Email used from formData instead of selectedPerson       | `new/page.tsx:303,341`  | Wrong invitation email    |
| Phone validation missing                                 | `new/page.tsx:472-486`  | Invalid phones accepted   |
| Fallback creates person without enforcing PersonSelector | `new/page.tsx:209-220`  | Bypass person-centric flow|

---

## 5. People Module - Comprehensive But Underutilized

### 5.1 What People Module CAN Capture

The People form (`new/page.tsx` and `[id]/edit/page.tsx`) is comprehensive:

| Category              | Fields                                                                | Status     |
|-----------------------|-----------------------------------------------------------------------|------------|
| **Identity**          | Name, phone, email, photo                                             | ✓ Complete |
| **Demographics**      | DOB, gender, blood group                                              | ✓ Complete |
| **ID Documents**      | Aadhaar, PAN, License, Passport, Voter ID, Employee ID + file uploads | ✓ Complete |
| **Addresses**         | Permanent + current with city, state, pincode                         | ✓ Complete |
| **Professional**      | Occupation, company, designation                                      | ✓ Complete |
| **Emergency Contacts**| Name, phone, relation (12+ relation types)                            | ✓ Complete |
| **Classification**    | Tags, verification status, blocked status                             | ✓ Complete |

### 5.2 PersonSelector Quick-Create Limitations

Quick-create mode only captures 3 fields:

```typescript
interface QuickCreateForm {
  name: string    // Required
  phone: string   // Optional
  email: string   // Optional
}
```

This is intentional for speed, but creates a gap:

- User creates person with minimal data
- Tenant/Visitor form then collects ID documents separately
- Data ends up in BOTH places

### 5.3 The Integration Gap

PersonSelector returns:

```typescript
interface PersonSearchResult {
  id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  tags: string[]
  is_verified: boolean
  is_blocked: boolean
}
```

**Missing from PersonSearchResult:**

- `id_documents[]` - Could show "ID verified" status
- `company_name` - For service providers
- `emergency_contacts[]` - For emergency situations

---

## 6. Recommended Architecture Refactoring

### 6.1 Phase 1: Stop Collecting Duplicate Data

**Tenant Form Changes:**

1. Remove ID Documents section entirely (lines 769-802)
2. Remove emergency contacts input
3. Remove addresses input
4. Show read-only personal info from People with "Edit in People" link

**Visitor Form Changes:**

1. Remove manual visitor_name, visitor_phone fields
2. Remove ID type/number fields
3. Remove company_name, service_type fields (for service providers)
4. PersonSelector becomes the ONLY way to enter personal info
5. Show read-only personal info from selected person

### 6.2 Phase 2: Enhance PersonSelector

```typescript
// Add to PersonSearchResult
interface PersonSearchResult {
  // ... existing fields
  id_documents: Array<{
    type: string
    number: string
    is_verified: boolean
  }>
  company_name: string | null
  emergency_contacts: Array<{
    name: string
    phone: string
    relation: string
  }>
}
```

### 6.3 Phase 3: Clean Up Database Schema

**Remove from tenants table:**

- `name`, `email`, `phone`, `photo_url` (fetch via JOIN to people)
- `phone_numbers`, `emails`, `addresses`, `guardian_contacts` (JSONB columns)
- `id_documents` (use people.id_documents)

**Remove from visitors table:**

- `visitor_name`, `visitor_phone` (use person_id → people.name/phone)
- `id_type`, `id_number` (use person_id → people.id_documents)
- `company_name`, `service_type` (use person_id → people)

**Deprecate visitor_contacts table:**

- Merge into people table
- Use people.tags for "visitor", "frequent", "blocked"
- Move visit_count, last_visit_at to a separate tracking table or use views

### 6.4 Phase 4: Update Workflows

**Tenant Workflow:**

```typescript
// BEFORE (current)
const tenantData = {
  name: input.name,
  email: input.email,
  // ... duplicates
}

// AFTER (refactored)
const tenantData = {
  person_id: input.person_id,  // ONLY the link
  property_id: input.property_id,
  room_id: input.room_id,
  monthly_rent: input.monthly_rent,
  // ... tenancy-specific only
}
```

---

## 7. Data Flow: Current vs. Recommended

### 7.1 Current Flow (Problematic)

```text
User opens /tenants/new
        ↓
PersonSelector finds person (minimal fields)
        ↓
Form COLLECTS: ID docs, addresses, emergency contacts
        ↓
Workflow STORES: All data in BOTH tenants AND people tables
        ↓
Result: Two sources of truth, sync nightmares
```

### 7.2 Recommended Flow

```text
User opens /tenants/new
        ↓
PersonSelector finds person (comprehensive view)
        ↓
Form SHOWS: Person's ID docs, addresses, emergency contacts (READ-ONLY)
        ↓
Form COLLECTS: ONLY tenancy-specific data (rent, room, deposit)
        ↓
If person data incomplete:
  ├─ Link to /people/[id]/edit to complete profile
  └─ Or use PersonSelector's enhanced quick-create
        ↓
Workflow STORES: ONLY tenancy data + person_id link
        ↓
Result: Single source of truth in People module
```

---

## 8. Immediate Action Items

### 8.1 Critical (Fix This Week)

| ID       | Issue                               | Module   | Action                      |
|----------|-------------------------------------|----------|-----------------------------|
| ARCH-001 | ID Documents in Tenant Form         | Tenants  | Remove, link to People      |
| ARCH-002 | Triple duplication in Visitors      | Visitors | Remove all personal fields  |
| ARCH-003 | PersonSelector doesn't pull ID docs | People   | Enhance PersonSearchResult  |
| ARCH-004 | Tenant workflow stores duplicates   | Tenants  | Remove duplicate fields     |

### 8.2 High Priority (This Sprint)

| ID       | Issue                                   | Module   | Action                           |
|----------|-----------------------------------------|----------|----------------------------------|
| ARCH-005 | visitor_contacts duplicates people      | Visitors | Plan deprecation                 |
| ARCH-006 | Addresses in tenant form                | Tenants  | Remove, use people addresses     |
| ARCH-007 | Emergency contacts in tenant form       | Tenants  | Remove, use people.emergency     |
| ARCH-008 | Form doesn't show "Edit in People" link | All      | Add prominent edit link          |

### 8.3 Database Migration Required

```sql
-- Step 1: Ensure all tenants have person_id
UPDATE tenants t
SET person_id = (
  SELECT p.id FROM people p
  WHERE p.phone = t.phone OR p.email = t.email
  LIMIT 1
)
WHERE t.person_id IS NULL;

-- Step 2: Backfill people table from tenants (if missing)
INSERT INTO people (owner_id, name, phone, email, id_documents, emergency_contacts, ...)
SELECT DISTINCT
  t.owner_id,
  t.name,
  t.phone,
  t.email,
  t.id_documents,
  t.guardian_contacts,
  ...
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM people p WHERE p.id = t.person_id
);

-- Step 3: After verification, deprecate columns
-- ALTER TABLE tenants DROP COLUMN phone_numbers, emails, addresses, guardian_contacts, id_documents;
```

---

## 9. UI/UX Recommendations

### 9.1 Tenant Form Redesign

```text
┌─────────────────────────────────────────────────────────────────┐
│ Add New Tenant                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Step 1: Select Person                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [PersonSelector - Search or create person]                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Selected: Rahul Sharma                                      │ │
│ │ Phone: +91 98765 43210                                      │ │
│ │ ID: Aadhaar ****1234 ✓ Verified                            │ │
│ │ Address: 123 Main St, Mumbai                                │ │
│ │                                          [Edit in People →] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Step 2: Tenancy Details                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Property:    [Dropdown]                                     │ │
│ │ Room:        [Dropdown]                                     │ │
│ │ Monthly Rent: [₹ Input]                                     │ │
│ │ Deposit:     [₹ Input]                                      │ │
│ │ Check-in:    [Date Picker]                                  │ │
│ │ Police Status: [Dropdown]                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                            [Cancel] [Add Tenant]│
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Visitor Form Redesign

```text
┌─────────────────────────────────────────────────────────────────┐
│ Check In Visitor                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Who's Visiting?                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [PersonSelector - Search or create person]                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Selected: Delivery Person                                   │ │
│ │ Phone: +91 99887 76655                                      │ │
│ │ Company: Amazon Logistics                                   │ │
│ │ Tags: [service_provider] [frequent]                         │ │
│ │                                          [Edit in People →] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Visit Details                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Property:     [Dropdown]                                    │ │
│ │ Visiting:     [Tenant Dropdown] (if tenant_visitor)         │ │
│ │ Purpose:      [Text Input]                                  │ │
│ │ Vehicle No:   [Text Input]                                  │ │
│ │ Overnight:    [ ] Yes                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                          [Cancel] [Check In]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Summary

### The Problem

The person-centric architecture was **designed correctly** but **implemented with duplication**:

- People module has comprehensive fields ✓
- PersonSelector links modules to people ✓
- BUT forms collect duplicate data ✗
- AND workflows store duplicates ✗
- RESULT: Multiple sources of truth ✗

### The Solution

1. **Forms should READ from People** (not collect)
2. **Forms should ONLY collect role-specific data**
3. **Workflows should ONLY store role-specific data + person_id link**
4. **PersonSelector should expose more person data**
5. **"Edit in People" links should be prominent**

### Impact of Not Fixing

- Data divergence (person updates their phone, tenant record has old phone)
- Storage waste (same data in 3+ tables)
- Maintenance nightmare (which source is correct?)
- User confusion (why enter ID twice?)
- Audit/compliance issues (which ID document is authoritative?)

---

## Appendix: File References

### Files Needing Changes

```text
# Tenant Module (Remove personal data collection)
src/app/(dashboard)/tenants/new/page.tsx - Remove ID docs, addresses, emergency contacts
src/lib/workflows/tenant.workflow.ts - Remove duplicate field storage

# Visitor Module (Remove personal data collection)
src/app/(dashboard)/visitors/new/page.tsx - Remove name, phone, ID, company fields
src/types/visitors.types.ts - Update interfaces

# People Module (Enhance PersonSelector)
src/components/people/person-selector.tsx - Return more fields
src/types/people.types.ts - Update PersonSearchResult

# Database Migrations
supabase/migrations/054_remove_tenant_duplicates.sql - Clean up tenants table
supabase/migrations/055_remove_visitor_duplicates.sql - Clean up visitors table
supabase/migrations/056_deprecate_visitor_contacts.sql - Merge into people
```

---

Generated by Claude Code (CPE-AI) - 2026-01-20

**This review addresses the user's concern about ID documents appearing in the Tenant form when they should be in the People module.**
