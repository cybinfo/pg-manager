# ManageKar - AI Development Guide

> **Essential Reference**: Read this before making any code changes.
> **Last Updated**: 2026-02-02

---

## Quick Reference

| Item | Value |
|------|-------|
| **Production URL** | https://managekar.com |
| **Stack** | Next.js 16 + TypeScript + Supabase + Tailwind + shadcn/ui |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **Migrations** | 65 total (001-065) |

```bash
npm run dev          # Development server at localhost:3000
npm run build        # Production build
npm test             # Run test suite (280 tests)
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
- Students pay for **hours of access** (e.g., ₹1000 for 9 hours)
- They get assigned **seats** (similar to beds in PG)
- Attendance is tracked via check-in/check-out
- Lockers are rented separately
- Time slots (Morning/Evening/Night/24 Hours) determine access

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

### 3.2 Page Protection

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

### 3.3 Permission Checks

```typescript
import { useAuth, useCurrentContext } from "@/lib/auth"

const { hasPermission, user } = useAuth()
const { isOwner, isStaff, currentContext } = useCurrentContext()

if (hasPermission("tenants.create")) { /* allowed */ }
if (isOwner) { /* owner-only logic */ }
```

### 3.4 Platform Admin Check

```typescript
// In SQL - use is_platform_admin() function (NOT pa.is_active column)
-- The platform_admins table only has: user_id, created_at, created_by, notes

-- In RLS policies:
OR is_platform_admin(auth.uid())

// In TypeScript:
const isPlatformAdmin = await checkPlatformAdmin(userId)
```

### 3.5 Live Person Data Pattern (IMPORTANT)

Entities with a `person_id` FK should display **live data from the `people` table**, not denormalized copies. This ensures name/phone/photo updates in People are immediately reflected everywhere.

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

### 3.6 List Page Architecture

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

### 3.7 Audit System (MANDATORY)

All entities must track accountability using the centralized audit utilities.

#### 3.7.1 Created By Tracking

**ALWAYS** use `withCreatedBy()` when inserting records:

```typescript
import { withCreatedBy } from "@/lib/audit"

const { data, error } = await supabase
  .from("tenants")
  .insert(withCreatedBy(tenantData, user.id))
```

#### 3.7.2 Soft Delete (NEVER Hard Delete)

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

**Soft-deletable tables** (17 total):
`tenants`, `bills`, `payments`, `expenses`, `refunds`, `complaints`, `notices`, `visitors`, `meter_readings`, `exit_clearance`, `properties`, `rooms`, `people`, `meters`, `staff_members`, `visitor_contacts`, `library_waitlist`

#### 3.7.3 Detail Page Audit Display

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

### 4.1 Select Component (NOT shadcn)

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
/>

// DO NOT USE shadcn Select with SelectItem children
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

### 4.4 Library Components

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

### 5.3 Critical Column Names

| Table | Correct Column | NOT |
|-------|----------------|-----|
| `rooms` | `total_beds` | ~~bed_count~~ |
| `tenants` | `phone_numbers` (JSONB) | ~~phones~~ |
| `tenant_stays` | `join_date` | ~~start_date~~ |
| `exit_clearance` | `settlement_status` | ~~status~~ |
| `platform_admins` | NO `is_active` column | ~~is_active~~ |

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

```typescript
// In src/lib/navigation/config.ts
{
  name: "New Module",
  href: "/new-module",
  icon: NewIcon,
  permission: "new_module.view",
  feature: "newModule",  // or null if always visible
  dividerBefore: true,   // optional divider
}
```

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

**List Page:**
1. Create `src/app/(dashboard)/[module]/page.tsx`
2. Define config with `ListPageConfig` type
3. Define metrics with `MetricConfig` type and `compute` function
4. Use `ListPageTemplate` with all required props
5. Add to navigation in `src/lib/navigation/config.ts`
6. Add permissions in `src/lib/auth/types.ts`

**Detail Page:**
1. Create `src/app/(dashboard)/[module]/[id]/page.tsx`
2. Use `useDetailPage` hook for data fetching
3. Use `<DetailPageTemplate>` for consistent layout
4. Use `<DetailListSection>` for lists with "View All"

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

---

## Contact

- **Developer**: Rajat Seth (sethrajat0711@gmail.com)
- **Repository**: https://github.com/cybinfo/pg-manager
- **Production**: https://managekar.com

---

*Last Updated: 2026-02-02*
