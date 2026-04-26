# ManageKar - AI Development Guide

> **STEP 1 — MANDATORY**: Read [`KEY_PRINCIPLES.md`](./KEY_PRINCIPLES.md) before anything else. Every review, suggestion, improvement, or addition must be evaluated against the 35 Core Principles and answered against the 35-question Principle Test first.
>
> **Essential Reference**: Read this before making any code changes.
> **Last Updated**: 2026-04-26

---

## Default AI Behaviour — Every Session

These behaviours are non-negotiable for every Claude session on this codebase:

1. **Read KEY_PRINCIPLES.md first** — before any code change, review, or suggestion. No exceptions.
2. **Operate as platform architect** — not a task executor. Always surface broader opportunities beyond what was asked.
3. **Think broad, always** — when solving for one module, consider how the solution can serve all modules and all future business types (Hotel, School, Gym, Hospital, etc.).
4. **Build Core Modules, not domain features** — every new capability is built as a reusable, domain-agnostic Core Module first.
5. **Best available free AI** — product AI features use the best available free API (Gemini free tier, Groq, etc.). No paid AI APIs until the platform monetizes. Development uses whichever AI coding tool is available.
6. **India first** — every current suggestion, integration, and default must be optimised for the Indian market (UPI, WhatsApp, GST, 4G, INR). Never suggest non-Indian solutions as defaults today. Avoid hardcoding decisions that would block future global expansion.
7. **Simple by default** — every new feature/page starts with a minimal, purposeful default state. Advanced options are accessible but never forced.
8. **Test before done** — run existing tests before making changes, write new tests covering happy path + edge cases + permissions + RLS. No change is complete without passing tests.
9. **Proprietary always** — never suggest open sourcing any part of the codebase.
10. **White-label safe** — never hard-code ManageKar branding in customer-facing UI. All branding goes through workspace config.
11. **Update CLAUDE.md and memory** — when something architecturally significant is learned or decided, update the relevant memory files and CLAUDE.md immediately.
12. **100% confidence before any change** — read every file to be changed in full before touching it. Grep results and pattern assumptions are research, not proof. If uncertain, investigate further. Never add, modify, or delete code on a guess.

---

## Quick Reference

| Item | Value |
|------|-------|
| **Production URL** | https://managekar.com |
| **Stack** | Next.js 16 + TypeScript + Supabase + Tailwind + shadcn/ui |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **Migrations** | 72 total (001-072) |

```bash
npm run dev          # Development server at localhost:3000
npm run build        # Production build
npm test             # Run test suite (835 tests)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npx tsc --noEmit     # Type check
vercel --prod        # Deploy to production
```

---

## 1. Product Overview

**ManageKar** ("Let's Manage" in Hindi) is a SaaS platform for Indian small businesses with two main modules:
- **PG Manager** - For Paying Guest accommodations and hostels
- **Library Manager** - For study libraries (reading rooms/study halls)

### Target Users

| User Type | Description |
|-----------|-------------|
| **Owners** | PG/Hostel/Library owners managing multiple properties |
| **Staff** | Property managers, accountants, receptionists |
| **Tenants** | PG self-service portal users |
| **Members** | Library self-service portal users |

### Business Model

```
Free Trial (3 months) → Free Tier (1 PG/10 rooms) → Pro ₹499/month → Business ₹999/month
```

### Library Module Overview

Indian "libraries" in this context are **study spaces** (not book-lending), where:
- Students pay for **hours of access per day** (e.g., "9 Hours Plan" = 9h every day)
- They get assigned **seats** (similar to beds in PG)
- Attendance is tracked via check-in/check-out
- Lockers are rented separately
- Access schedule is defined as **multi-slot time windows** (e.g., 9AM-12PM + 4PM-6PM), stored as JSON
- **Per-day hours model**: `hours_balance` = daily allowance minus today's usage (resets each day)
- **Subscription = Plan + Duration (months) + Access Schedule + Amount** — payment recorded separately
- **People table is single source** for name/phone/email/photo — members always link via `person_id`

---

## 2. Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Register, Password Reset
│   ├── (dashboard)/         # 30+ dashboard modules (PG + Library)
│   ├── (tenant)/            # Tenant self-service portal
│   ├── (member)/            # Library member self-service portal
│   ├── pg/[slug]/           # Public PG websites
│   └── api/                 # API routes + cron jobs
├── components/
│   ├── ui/                  # shadcn + custom components
│   ├── forms/               # Form components
│   ├── shared/              # Templates (ListPageTemplate)
│   ├── auth/                # PermissionGuard, FeatureGuard
│   ├── journey/             # Tenant journey components
│   └── library/             # Library-specific components
└── lib/
    ├── supabase/            # Clients + transforms
    ├── auth/                # Auth context + hooks
    ├── audit/               # Audit utilities (withCreatedBy, softDelete)
    ├── features/            # Feature flags
    ├── services/            # Service layer (workflow engine, audit)
    ├── workflows/           # Business workflows
    ├── navigation/          # Navigation config
    └── hooks/               # Reusable hooks
```

### Dashboard Modules

#### PG Modules (20)

| Module | URL | Description |
|--------|-----|-------------|
| Dashboard | `/dashboard` | Overview + metrics |
| Properties | `/properties` | Building management |
| Rooms | `/rooms` | Room + bed management |
| Tenants | `/tenants` | Tenant lifecycle |
| Tenant Journey | `/tenants/[id]/journey` | AI-powered lifecycle tracking |
| Bills | `/bills` | Billing system |
| Payments | `/payments` | Payment tracking |
| Refunds | `/refunds` | Refund processing |
| Expenses | `/expenses` | Expense tracking |
| Meters | `/meters` | Physical meter management |
| Meter Readings | `/meter-readings` | Utility consumption tracking |
| Staff | `/staff` | Staff + RBAC roles |
| Notices | `/notices` | Announcements |
| Complaints | `/complaints` | Issue tracking |
| Visitors | `/visitors` | Visitor log |
| Exit Clearance | `/exit-clearance` | Checkout process |
| Reports | `/reports` | Analytics |
| Architecture | `/architecture` | Property 2D map |
| Activity | `/activity` | Audit log viewer |
| Approvals | `/approvals` | Tenant requests |

#### Library Modules (10)

| Module | URL | Description |
|--------|-----|-------------|
| Library | `/library` | Library management |
| Sections | `/library-sections` | Study areas (AC Hall, etc.) |
| Seats | `/library-seats` | Individual study positions |
| Members | `/library-members` | Student subscriptions |
| Waitlist | `/library-waitlist` | Prospective members queue |
| Attendance | `/library-attendance` | Check-in/check-out |
| Lockers | `/library-lockers` | Locker rental |
| Subscriptions | `/library-subscriptions` | All memberships with payment tracking |
| Library Payments | `/library-payments` | Subscription payments |
| Library Reports | `/library-reports` | Revenue & occupancy analytics |
| Plans | `/library-plans` | Subscription plans |

#### Self-Service Portals

| Portal | URL | Description |
|--------|-----|-------------|
| Tenant Portal | `/tenant` | PG tenant self-service |
| Member Portal | `/member` | Library member self-service |

---

## 3. Critical Patterns

### 3.1 Supabase Join Transform (MANDATORY)

Supabase returns JOINs in inconsistent formats. **ALWAYS transform:**

```typescript
import { transformJoin, transformArrayJoins } from "@/lib/supabase/transforms"

// Single join
const { data } = await supabase
  .from("tenants")
  .select(`*, property:properties(id, name), room:rooms(id, room_number)`)

const transformed = data?.map(item => ({
  ...item,
  property: transformJoin(item.property),
  room: transformJoin(item.room),
}))

// Multiple items with joins
const items = transformArrayJoins(data || [], ["property", "room", "charge_type"])
```

### 3.2 Ambiguous FK Joins (MANDATORY)

When a table has **multiple foreign keys to the same target table**, PostgREST requires an explicit FK hint. Without it, the query fails with `PGRST201: more than one relationship was found`.

**ALWAYS add `!fk_constraint_name`** to disambiguate:

```typescript
// BAD — ambiguous, will crash at runtime
assigned_seat:library_seats(id, seat_number)
locker:library_lockers(id, locker_number)

// GOOD — explicit FK constraint name
assigned_seat:library_seats!library_members_assigned_seat_id_fkey(id, seat_number)
locker:library_lockers!library_members_locker_id_fkey(id, locker_number)
```

**Known ambiguous relationships:**

| From Table | To Table | Must Use FK Hint |
|------------|----------|------------------|
| `library_members` | `library_seats` | `!library_members_assigned_seat_id_fkey` |
| `library_members` | `library_lockers` | `!library_members_locker_id_fkey` |
| `library_attendance` | `library_members` | `!library_attendance_member_id_fkey` |
| `library_memberships` | `library_members` | `!library_memberships_member_id_fkey` |
| `library_lockers` | `library_members` | `!fk_lockers_current_member` |
| `library_seats` | `library_members` | `!fk_seats_current_member` |
| `library_payments` | `library_memberships` | `!library_payments_membership_id_fkey` |

**IMPORTANT:** Check ALL three config locations: `list-page/configs.ts`, `detail-page/types.ts` (main select AND relatedQueries), and inline queries. When in doubt, add the hint — it never hurts.

**How to find the FK name:** Check the migration SQL or run `\d+ table_name` in psql.

### 3.3 Page Protection

```typescript
// Permission-based (ALWAYS use for dashboard pages)
import { PermissionGuard } from "@/components/auth"

<PermissionGuard permission="tenants.view">
  {content}
</PermissionGuard>

// Feature-flagged (FeatureGuard OUTSIDE PermissionGuard)
import { FeatureGuard } from "@/components/auth"

<FeatureGuard feature="expenses">
  <PermissionGuard permission="expenses.view">
    {content}
  </PermissionGuard>
</FeatureGuard>
```

### 3.4 Permission Checks

```typescript
import { useAuth, useCurrentContext } from "@/lib/auth"

const { hasPermission, user } = useAuth()
const { isOwner, isStaff, currentContext } = useCurrentContext()

if (hasPermission("tenants.create")) { /* allowed */ }
if (isOwner) { /* owner-only logic */ }
```

### 3.5 Platform Admin Check

```typescript
// In SQL - use is_platform_admin() function (NOT pa.is_active column)
-- The platform_admins table only has: user_id, created_at, created_by, notes

-- In RLS policies:
OR is_platform_admin(auth.uid())

// In TypeScript:
const isPlatformAdmin = await checkPlatformAdmin(userId)
```

### 3.6 Live Person Data Pattern (MANDATORY)

Entities with a `person_id` FK **MUST** have a linked `people` record. The `people` table is the **single source of truth** for name, phone, email, and photo.

**When creating a new member/tenant:**
1. Create a `people` record FIRST (with name, phone, email, photo_url, tags)
2. Then create the member/tenant with `person_id` linked
3. Note: `people` table does NOT have `workspace_id` — don't include it

**When editing name/phone/email:**
1. Update BOTH the entity table (denormalized fallback) AND the `people` table
2. Photo always saves to `people.photo_url` only

**When displaying:**
1. Always use fallback pattern: `entity.person?.name || entity.name`
2. Never assume `person_id` exists — use optional chaining

```typescript
// In list page configs - ALWAYS include person.name in select
export const TENANT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "tenants",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    person:people(id, name, photo_url)  // Include name for live data
  `,
  // ...
}

// In list page column render - use person.name with fallback
render: (tenant) => {
  // Live data from people table, fallback to denormalized copy
  const displayName = tenant.person?.name || tenant.name
  return (
    <Avatar name={displayName} src={getAvatarUrl(tenant)} />
    <span>{displayName}</span>
  )
}
```

### 3.7 Metric Factories (USE INSTEAD OF INLINE COMPUTE)

**NEVER write inline `compute` functions** for common metric patterns. Use the factories from `src/lib/metric-factories.ts`:

```typescript
import {
  createTotalMetric, createStatusMetric, createSumMetric, createCountMetric,
  createTodayCountMetric, createLastMonthSumMetric, createYearToDateSumMetric,
  createAverageMetric, createTopValueMetric, createTopValueByAmountMetric,
  createExpiringMetric,
} from "@/lib/metric-factories"

const metrics: MetricConfig<EntityType>[] = [
  createTotalMetric("Total", { icon: Users }),
  createStatusMetric("Active", "active", { icon: CheckCircle }),
  createSumMetric("Revenue", "amount", { icon: DollarSign, format: "currency" }),
  createTodayCountMetric("Today", "created_at", { icon: Calendar }),
  createAverageMetric("Avg Hours", "hours_included", { icon: Clock, suffix: "h" }),
  createTopValueMetric("Top Method", "payment_method", { icon: TrendingUp, labelMap: PAYMENT_METHOD_LABELS }),
  createExpiringMetric("Expiring", "expires_at", 3, { icon: AlertTriangle }),
]
```

### 3.8 Column Builders (USE FOR LIST PAGE COLUMNS)

**Use column builder functions** from `src/lib/columns/builders.ts` instead of inline column definitions:

```typescript
import {
  statusColumn, currencyColumn, dateColumn, personNameWithAvatarColumn,
  booleanColumn, phoneColumn, emailColumn, timeColumn, timeAgoColumn, countColumn, badgeColumn,
} from "@/lib/columns"

const columns = [
  personNameWithAvatarColumn("Tenant", { subtitleField: ["member_code", "phone"] }),
  statusColumn("Status"),
  currencyColumn("Amount", "amount"),
  dateColumn("Date", "created_at"),
  booleanColumn("is_active", "Active", { trueLabel: "Active", falseLabel: "Inactive" }),
  phoneColumn("phone", "Phone"),
  emailColumn("email", "Email"),
  timeColumn("check_in_time", "Check In"),
  timeAgoColumn("created_at", "Created"),
  countColumn("total_seats", "Seats", { icon: Armchair }),
  badgeColumn("room_type", "Type", ROOM_TYPE_LABELS),
]
```

### 3.9 Centralized Option Lists & Filter Presets (NEVER HARDCODE)

**NEVER hardcode option arrays** (payment methods, room types, etc.) inline. Import from centralized configs:

```typescript
// Status labels, payment methods, refund types, notice types
import { PAYMENT_METHODS, PAYMENT_METHOD_OPTIONS, REFUND_TYPE_OPTIONS, NOTICE_TYPE_OPTIONS } from "@/lib/status"

// Room types, amenities, ID proof types
import { ROOM_TYPE_OPTIONS, AVAILABLE_AMENITIES, ID_PROOF_TYPE_OPTIONS } from "@/lib/constants/form-options"

// Filter presets (for list pages) — 22 available
import {
  PROPERTY_FILTER, LIBRARY_FILTER, TIME_SLOT_FILTER, PAYMENT_METHOD_FILTER,
  COMPLAINT_STATUS_FILTER, NOTICE_TYPE_FILTER, REFUND_TYPE_FILTER,
  EXIT_CLEARANCE_STATUS_FILTER, BILL_STATUS_FILTER, APPROVAL_STATUS_FILTER,
  createStatusFilter, createDateRangeFilter,
} from "@/lib/filter-presets"
```

### 3.10 Library Member Detail Pattern

The library member detail page is the reference implementation for **surfacing people table data** and **quick actions**:

```typescript
// Detail config — fetch full person data including JSONB arrays
select: `
  *,
  person:people(id, name, phone, email, photo_url, gender, date_of_birth,
    phone_numbers, emergency_contacts, id_documents,
    permanent_address, permanent_city, permanent_state, permanent_pincode,
    current_address, current_city, occupation, blood_group, company_name),
  ...
`

// Quick actions in DetailHero — Call, WhatsApp, Email
{memberPhone && <a href={`tel:${memberPhone}`}><Button variant="outline" size="icon" /></a>}
{memberPhone && <a href={`https://wa.me/91${memberPhone.replace(/\D/g, "")}`}><Button /></a>}
{memberEmail && <a href={`mailto:${memberEmail}`}><Button /></a>}

// Profile completeness check
const missing = []
if (!phone) missing.push("Phone")
if (!email) missing.push("Email")
if (!photo_url) missing.push("Photo")
if (!id_proof_type && !id_documents?.length) missing.push("ID Proof")
if (!emergency_contacts?.length) missing.push("Emergency Contact")

// Overdue computation
const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
// >30d overdue = "Severely Overdue", >0d = "Overdue", ≤7d = "Expiring Soon"
```

### 3.11 Data Migration Scripts

Data migration scripts live in `scripts/` and use the Supabase service role key:

```bash
npx tsx scripts/migrate-library-data.ts  # Migrate Google Sheets → Supabase
```

**Key patterns:**
- Use `createClient(URL, SERVICE_ROLE_KEY)` to bypass RLS
- Clean up circular FKs before deletion (e.g., `library_members.locker_id` ↔ `library_lockers.current_member_id`)
- Tag migrated people records with `tags: ["library_member"]` for clean re-runs
- `universal_audit_trigger` now handles NULL `auth.uid()` gracefully (migration 069) — sets `actor_user_id = NULL` and `actor_type = 'system'`

### 3.12 List Page Architecture (MANDATORY FEATURES)

**Every list page MUST have ALL of these features** (100% parity across all pages):

| Feature | Required | Notes |
|---------|----------|-------|
| `ListPageTemplate` | YES | No custom list implementations |
| `enableAdvancedFilters` | YES | Advanced filter builder on all pages |
| `enableInlineEdit` | YES | Except Activity Log (immutable audit) |
| `enableColumnManager` | YES | Column visibility + persistence |
| `groupByOptions` | YES | At least 2-3 grouping options |
| Metric factories | YES | Never inline compute functions |
| Column builders | YES | Never inline render for standard patterns |
| Filter presets | YES | Never inline option arrays |
| `exportColumns` | YES | CSV export on all data pages |
| `PermissionGuard` | YES | Permission prop on template |
| `FeatureGuard` | YES | For feature-flagged modules |

All list pages use the centralized `ListPageTemplate` + `useListPage` hook pattern:

```typescript
// 1. Define config
const ENTITY_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "entity_table",
  select: `*, related:table(id, name)`,
  joinFields: ["related"],
  searchFields: ["name", "phone"],
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  defaultPageSize: 25,
}

// 2. Define metrics with compute function
const metrics: MetricConfig<EntityType>[] = [
  {
    id: "total",
    label: "Total",
    icon: Users,
    compute: (_items, total) => total,
  },
  {
    id: "active",
    label: "Active",
    icon: CheckCircle,
    compute: (items) => items.filter((i) => i.status === "active").length,
    serverFilter: { column: "status", operator: "eq", value: "active" },
  },
]

// 3. Use in page component
<ListPageTemplate
  tableKey="entities"
  config={ENTITY_LIST_CONFIG}
  columns={columns}
  filters={filters}
  metrics={metrics}
  title="Entities"
  description="Manage entities"
  icon={Users}
  permission="entities.view"
  createHref="/entities/new"
  createLabel="Add Entity"
/>
```

### 3.13 Audit System (MANDATORY)

All entities must track accountability using the centralized audit utilities.

#### 3.10.1 Created By Tracking

**ALWAYS** use `withCreatedBy()` when inserting records:

```typescript
import { withCreatedBy } from "@/lib/audit"

const { data, error } = await supabase
  .from("tenants")
  .insert(withCreatedBy(tenantData, user.id))
```

#### 3.10.2 Soft Delete (NEVER Hard Delete)

**NEVER** use `.delete()` on auditable tables. Use `softDelete()` instead:

```typescript
import { softDelete, cascadeSoftDelete } from "@/lib/audit"

// Single record soft delete
const result = await softDelete("tenants", tenantId, user.id)

// Cascade soft delete (parent + children)
const result = await cascadeSoftDelete(propertyId, user.id, [
  { table: "rooms", foreignKey: "property_id" },
  { table: "meters", foreignKey: "property_id" },
])
```

**Soft-deletable tables** (18 total):
`tenants`, `bills`, `payments`, `expenses`, `refunds`, `complaints`, `notices`, `visitors`, `meter_readings`, `exit_clearance`, `properties`, `rooms`, `people`, `meters`, `staff_members`, `visitor_contacts`, `library_waitlist`, plus all library module tables in `SOFT_DELETABLE_TABLES` constant

#### 3.10.3 Detail Page Audit Display

**Use `DetailPageTemplate`** - audit sections are added automatically:

```typescript
import { DetailPageTemplate } from "@/components/ui"

<DetailPageTemplate
  layoutKey="tenant-detail"
  entityType="tenant"
  record={tenant}
>
  <DetailSection title="Room Details">...</DetailSection>
</DetailPageTemplate>
```

**DO NOT manually add `DetailPageAudit`** - it's included in the template.

---

## 4. UI Component Patterns

### 4.1 Select Component (MANDATORY — NO RAW `<select>`)

**NEVER use raw HTML `<select>`**. Always use the custom Select component:

```typescript
// USE THIS - Custom Select from form-components
import { Select } from "@/components/ui/form-components"

<Select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  options={[
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ]}
  placeholder="Select status"  // optional, replaces <option value="">
/>

// DO NOT USE:
// - Raw HTML <select> with <option> children
// - shadcn Select with SelectItem children
```

### 4.2 Select vs Combobox Decision

| Criteria | Use Select | Use Combobox |
|----------|------------|--------------|
| Items | 10 or fewer | More than 10 |
| Searchable | No | Yes |
| Dynamic data | No | Yes |

### 4.3 Common UI Components

| Component | Import | Usage |
|-----------|--------|-------|
| `PageHeader` | `@/components/ui/page-header` | Title + actions |
| `MetricsBar` | `@/components/ui/metrics-bar` | Stats row |
| `DataTable` | `@/components/ui/data-table` | Table + search |
| `PageLoader` | `@/components/ui/page-loader` | Loading state |
| `StatusBadge` | `@/components/ui/status-badge` | Entity status |
| `Combobox` | `@/components/ui/combobox` | Searchable select |
| `Currency` | `@/components/ui/currency` | INR formatting |
| `Progress` | `@/components/ui/progress` | Progress bar |
| `DetailPageTemplate` | `@/components/ui` | Detail page wrapper |
| `DetailListSection` | `@/components/ui` | Limited list with "View All" |

### 4.4 Portal Components

| Component | Import | Usage |
|-----------|--------|-------|
| `PortalLayout` | `@/components/portal` | Shared layout for tenant/member portals |
| `PortalError` | `@/components/portal` | Shared error boundary for portals |

### 4.5 Library Components

| Component | Import | Usage |
|-----------|--------|-------|
| `MemberQRCode` | `@/components/library` | QR code for quick check-in |
| `MemberHoursCard` | `@/components/library` | Hours balance display |

---

## 5. Database Schema

### 5.1 Key Tables - PG Module

| Table | Purpose |
|-------|---------|
| `workspaces` | One per owner (auto-created) |
| `user_profiles` | Central identity |
| `user_contexts` | Links users to workspaces |
| `platform_admins` | Superusers (NO `is_active` column) |
| `properties` | Buildings |
| `rooms` | Rooms with `total_beds`, `occupied_beds` |
| `tenants` | Tenant records |
| `tenant_stays` | Track multiple stays |
| `bills` | Monthly bills with `line_items` JSONB |
| `payments` | Payment records |
| `refunds` | Refund tracking |
| `exit_clearance` | Checkout process |
| `meters` | Physical utility meters |
| `meter_assignments` | Meter-to-room assignments |
| `meter_readings` | Consumption readings |
| `audit_events` | Comprehensive audit trail |

### 5.2 Key Tables - Library Module

| Table | Purpose |
|-------|---------|
| `libraries` | Library locations |
| `library_sections` | Study areas (AC Hall, Non-AC, etc.) |
| `library_seats` | Individual study positions |
| `library_members` | Student records with subscriptions |
| `library_memberships` | Subscription periods with hours |
| `library_attendance` | Check-in/check-out tracking |
| `library_lockers` | Locker management |
| `library_locker_assignments` | Locker rental history |
| `library_payments` | Subscription & locker payments |
| `library_plans` | Subscription plan definitions |
| `library_waitlist` | Prospective member queue |
| `library_member_status_log` | Member status transition history |

### 5.3 Critical Column Names

| Table | Correct Column | NOT |
|-------|----------------|-----|
| `rooms` | `total_beds` | ~~bed_count~~ |
| `tenants` | `phone_numbers` (JSONB) | ~~phones~~ |
| `tenant_stays` | `join_date` | ~~start_date~~ |
| `exit_clearance` | `settlement_status` | ~~status~~ |
| `platform_admins` | NO `is_active` column | ~~is_active~~ |
| `workspaces` | `owner_user_id` | ~~owner_id~~ |

### 5.4 Key Migrations

| # | File | Purpose |
|---|------|---------|
| 001 | initial_schema.sql | Core tables |
| 007 | tenant_history.sql | Re-joining tenants |
| 012 | unified_identity.sql | Multi-context auth |
| 016 | audit_logging.sql | Audit trail |
| 038 | comprehensive_audit_system.sql | Universal triggers |
| 052 | meter_management.sql | Meters table |
| 057 | add_created_by.sql | created_by column |
| 058 | add_soft_delete.sql | deleted_at/deleted_by |
| 061 | library_module.sql | Core library tables |
| 062 | library_plans.sql | Subscription plans |
| 063 | library_complaints_notices.sql | Library support for complaints/notices |
| 064 | library_attendance_hours_trigger.sql | Auto-calculate hours on check-out |
| 065 | library_waitlist.sql | Waitlist with auto-queue positioning |
| 066 | add_composite_indexes.sql | Performance indexes |
| 067 | library_member_status_log.sql | Member status transition tracking |
| 068 | library_plans_audit_and_indexes.sql | Library plans audit trigger + indexes |
| 069 | fix_audit_trigger_service_role.sql | Fix audit trigger for service role (NULL auth.uid) |
| 070 | fix_hours_per_day_model.sql | Switch hours tracking from pool to per-day model |
| 071 | add_library_member_left_date.sql | Track when member explicitly left |
| 072 | widen_time_slot_column.sql | VARCHAR(20) → TEXT for JSON multi-slot storage |

---

## 6. Service Layer

### 6.1 Workflow Engine

```typescript
import { executeWorkflow, WorkflowDefinition } from "@/lib/services/workflow.engine"

const myWorkflow: WorkflowDefinition<InputType, OutputType> = {
  name: "my_workflow",
  steps: [
    { name: "validate", execute: async (ctx, input) => { /* ... */ } },
    { name: "process", execute: async (ctx, input, results) => { /* ... */ } },
  ],
  buildOutput: (results) => results.process as OutputType,
}
```

### 6.2 Email Service

```typescript
import { sendLibraryLowHoursWarning, sendLibraryExpiringMembership } from "@/lib/email"

// Send low hours warning (≤2 hours remaining)
await sendLibraryLowHoursWarning({
  to: member.email,
  memberName: member.name,
  libraryName: library.name,
  hoursRemaining: member.hours_balance,
  totalHours: membership.hours_included,
})
```

### 6.3 API Response Pattern

```typescript
import { apiSuccess, apiError, unauthorized, notFound } from "@/lib/api-response"

return apiSuccess(data, "Operation successful")
return unauthorized()
return notFound("Tenant")
return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid input", details)
```

---

## 7. Cron Jobs

| Cron | Schedule | Description |
|------|----------|-------------|
| `/api/cron/generate-bills` | Daily | Auto-generate monthly bills |
| `/api/cron/expire-library-memberships` | Daily | Mark expired memberships, update member status |
| `/api/cron/library-notifications` | Daily | Send low hours & expiring membership emails |

### Cron Configuration (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/generate-bills", "schedule": "0 6 * * *" },
    { "path": "/api/cron/expire-library-memberships", "schedule": "0 1 * * *" },
    { "path": "/api/cron/library-notifications", "schedule": "0 9 * * *" }
  ]
}
```

---

## 8. Authentication & Authorization

### 8.1 Permission Hierarchy

```
Platform Admin > Owner > Staff > Tenant/Member
```

### 8.2 Permissions List

```typescript
// PG Permissions
DASHBOARD_VIEW, PROPERTIES_*, ROOMS_*, TENANTS_*,
BILLS_*, PAYMENTS_*, EXPENSES_*, REFUNDS_*,
METERS_*, METER_READINGS_*, STAFF_*, NOTICES_*, COMPLAINTS_*,
VISITORS_*, EXIT_CLEARANCE_*, REPORTS_*, APPROVALS_*

// Library Permissions
LIBRARY_VIEW, LIBRARY_CREATE, LIBRARY_EDIT, LIBRARY_DELETE,
LIBRARY_SECTIONS_*, LIBRARY_SEATS_*,
LIBRARY_MEMBERS_*, LIBRARY_WAITLIST_*,
LIBRARY_ATTENDANCE_*, LIBRARY_LOCKERS_*, LIBRARY_PAYMENTS_*
```

---

## 9. Navigation Configuration

Navigation is centralized in `src/lib/navigation/config.ts`:

```typescript
import { DASHBOARD_NAVIGATION, filterNavigation } from "@/lib/navigation/config"

// Filter based on permissions and features
const filteredNav = filterNavigation(DASHBOARD_NAVIGATION, {
  hasPermission,
  isFeatureEnabled,
  isPlatformAdmin,
})
```

### Adding a New Navigation Item

**IMPORTANT: Navigation exists in TWO places — update BOTH:**

```typescript
// 1. In src/lib/navigation/config.ts (DASHBOARD_NAVIGATION + ROUTE_CONFIGS)
{
  name: "New Module",
  href: "/new-module",
  icon: NewIcon,
  permission: "new_module.view",
  feature: "newModule",  // or null if always visible
}

// 2. In src/app/(dashboard)/layout.tsx (~line 80, navigation const)
// Add to the correct parent group's children[] array
{ name: "New Module", href: "/new-module", icon: NewIcon, permission: "new_module.view", feature: "newModule" },
```

**If you only update config.ts, the item will NOT appear in the sidebar.** The layout.tsx navigation array is the actual source for the rendered sidebar.

---

## 10. Security

### 10.1 Implemented Protections

| Protection | Location | Description |
|------------|----------|-------------|
| Rate Limiting | `src/lib/rate-limit.ts` | All API routes |
| CSRF Protection | `src/lib/csrf.ts` | Sensitive POST endpoints |
| Security Headers | `next.config.ts` | CSP, HSTS, X-Frame-Options |
| RLS | All tables | Row Level Security |
| Audit Logging | Universal triggers | Critical tables |

### 10.2 Rate Limiters

| Limiter | Limit | Usage |
|---------|-------|-------|
| `authLimiter` | 5 req/min | Login, verification |
| `apiLimiter` | 100 req/min | General API routes |
| `sensitiveLimiter` | 3 req/min | Admin operations |
| `cronLimiter` | 2 req/min | Cron jobs |

---

## 11. Development Guidelines

### 11.1 Adding a New Dashboard Page

**List Page (ALL features mandatory — 100% parity with existing pages):**
1. Create `src/app/(dashboard)/[module]/page.tsx`
2. Define config with `ListPageConfig` type (with FK hints on all library joins)
3. Define metrics using **metric factories** from `src/lib/metric-factories.ts`
4. Define columns using **column builders** from `src/lib/columns` (11 available)
5. Define filters using **filter presets** from `src/lib/filter-presets.ts` (22 available)
6. Define `advancedFilterColumns` with filter column helpers
7. Define `groupByOptions` (at least 2-3 options)
8. Define `exportColumns` for CSV export
9. Use `ListPageTemplate` with: `enableAdvancedFilters`, `enableInlineEdit`, `enableColumnManager`
10. Add to navigation in **BOTH** `config.ts` AND `layout.tsx`
11. Wrap with `PermissionGuard` + `FeatureGuard` (if feature-flagged)
12. Import all options from `@/lib/status` or `@/lib/constants/form-options`

**Detail Page:**
1. Create `src/app/(dashboard)/[module]/[id]/page.tsx`
2. Use `useDetailPage` hook for data fetching (NEVER custom useEffect + createClient)
3. Use `<DetailPageTemplate>` for consistent layout (auto-adds audit section)
4. **ALWAYS add breadcrumbs** to `<DetailHero>`
5. **ALWAYS wrap edit/delete buttons** with `<PermissionGate permission="module.edit" hide>`
6. **ALWAYS show Not Found UI** when entity is missing (never `return null`)
7. Add **Quick Actions** (Call/WhatsApp/Email) if entity has phone/email
8. Use `<DetailListSection>` for related entity tables with "View All"
9. Use FK hints on all library cross-table joins

**Form Page:**
1. Use `useFormPage` / `useFormEditPage` for standard CRUD (custom only for complex workflows)
2. **ALWAYS wrap with `<PermissionGuard>`** — create pages use `.create`, edit pages use `.edit`
3. Use `FormField` wrapper with `error` prop for field-level validation
4. Use `validationSchema` with field validators from `@/lib/validation`
5. Import all dropdown options from `@/lib/status` (never hardcode)
6. Use `withCreatedBy` for inserts via the hook

### 11.2 Adding a New Database Table

1. Create migration in `supabase/migrations/`
2. Add RLS policies using `owner_id` pattern
3. Use `is_platform_admin()` for admin bypass
4. Create indexes for common queries
5. Add audit trigger: `EXECUTE FUNCTION universal_audit_trigger()`
6. Add audit columns: `created_by`, `deleted_at`, `deleted_by`
7. Update `SoftDeletableTable` type if needed

### 11.3 Code Style

- **TypeScript**: Strict mode, explicit types on callbacks
- **Logging**: Use structured logger (`src/lib/logger.ts`)
- **Errors**: Use API response helpers (`src/lib/api-response.ts`)
- **Audit**: Always use `withCreatedBy()` and `softDelete()`

---

## 12. Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Optional
RESEND_API_KEY=<resend_key>
CRON_SECRET=<cron_secret>
```

---

## 13. Deployment

### Git Account Requirement

**ALWAYS use the personal GitHub account (`cybinfo`) for this repository.**

### Quick Deploy

```bash
git add . && git commit -m "description" && git push && vercel --prod
```

### Database Migration

1. Create SQL in `supabase/migrations/`
2. Run in Supabase SQL Editor (production)
3. Test locally before production

---

## 14. Common Issues & Solutions

### "Column does not exist"
- Check column names in Section 5.3
- Common: `bed_count` vs `total_beds`, `is_active` on `platform_admins`

### TypeScript implicit any errors
- Add explicit type annotations to array callbacks
- Example: `.reduce((sum: number, r: Record) => sum + r.amount, 0)`

### RLS Policy blocking
- Check `owner_id = auth.uid()` pattern
- Use `is_platform_admin()` function (not column check)

### MetricConfig type errors
- Use generic type: `MetricConfig<EntityType>[]`
- Include `compute` function (required)
- Use `serverFilter` for server-side counting

### Recently Fixed Issues (2026-04-26)
- **V8 type deduplication**: SortConfig, MutationOptions, AuditEvent, ConfigurableRoomType, POLICE_VERIFICATION_STATUS_OPTIONS all centralized
- **PWA (D7)**: `@ducanh2912/next-pwa` wired in next.config.ts; `turbopack: {}` required for Next.js 16 + next-pwa coexistence
- **Cron failure alerts (G1)**: `sendCronFailureAlert()` in email.ts; wired non-blocking in `baseCronHandler` catch block
- **Portal pages**: `/tenant/renewal` (lease renewal via approvals), `/member/locker` (locker view), `/member/attendance` CSV export
- **Portal nav**: Confirmed single-source (config.ts only) — unlike dashboard which requires BOTH config.ts AND layout.tsx
- **Tenant complaints portal**: Already has full submission capability (was already implemented)

### Previously Fixed Issues (2026-03-20)
- **Full list page unification**: ALL 27 pages now have advanced filters, inline edit, column builders, filter presets, CSV export
- **PermissionGuard on ALL forms**: 52/52 form pages now have permission guards (was ~16)
- **Full CRUD**: All data modules have Create + Read + Edit + Delete (12 new edit pages, 8 new delete buttons)
- **People = single source of truth**: New members always get a person record; edits update both tables; photo on people
- **Subscription redesign**: Duration in months, multi-slot access schedule (JSON), no forced payment at creation
- **Library hours model**: Per-day (daily allowance), not depleting pool — migration 070
- **Library Subscriptions page**: `/library-subscriptions` with detail page + partial payment support
- **Payment Report**: New tab in Library Reports with group by day/week/month/year, charts, CSV export
- **Paginated data fetch**: Reports bypass Supabase 1000-row API cap via fetchAllRows()
- **Member codes**: Preserve client's original IDs (NGH-2001) not generated (NGH-2026-0001)
- **Payment receipts**: Format PYMT-LIB-000001, linked to memberships for balance tracking
- **Setup wizard**: Removed false redirect from dashboard layout — setup page self-protects
- **FK hints complete**: All ambiguous library joins have FK hints in list, detail, AND related query configs
- **Navigation dual-source**: Both `config.ts` and `layout.tsx` now in sync
- **Type consolidation**: PAYMENT_METHODS, library status configs, StatusInfo→StatusConfig unified
- **Brand gradient centralized**: 24 files now use `brandGradient` from design-tokens
- **Welcome emails**: Tenant + library member welcome on creation
- **Bulk operations**: Payment recording, member import (CSV), member status updates
- **Payment reconciliation**: 2-panel matching UI with auto-match algorithm
- **6 notification emails**: Receipts, resolution, refund, waitlist, monthly summary

### Portal Navigation Pattern (IMPORTANT)
- **Tenant/member portals**: nav is **single-source** — only update `TENANT_NAVIGATION` / `LIBRARY_MEMBER_NAVIGATION` in `src/lib/navigation/config.ts`
- **Dashboard**: nav requires updating **BOTH** `config.ts` AND `src/app/(dashboard)/layout.tsx`

### Next.js 16 + next-pwa Coexistence
- next-pwa injects webpack config; Next.js 16 Turbopack errors without explicit turbopack config
- Fix: add `turbopack: {}` to `nextConfig` in `next.config.ts`

---

## Contact

- **Developer**: Rajat Seth (sethrajat0711@gmail.com)
- **Repository**: https://github.com/cybinfo/pg-manager
- **Production**: https://managekar.com

---

*Last Updated: 2026-03-20*
