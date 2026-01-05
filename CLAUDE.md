# ManageKar - Claude Context

> **Read this file before making any changes. Update after significant changes.**

## Quick Reference

| Item | Value |
|------|-------|
| **Production** | https://managekar.com |
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Hosting** | Vercel |

```bash
npm run dev        # Dev server (localhost:3000)
npm run build      # Production build
```

---

## What is ManageKar?

SaaS platform for Indian small businesses, starting with **PG Manager** for Paying Guest accommodations and hostels.

**Core Features:**
- Multi-property management from single dashboard
- Complete tenant lifecycle (onboarding → exit clearance)
- Smart billing with auto-generation and WhatsApp sharing
- Staff management with 50+ granular permissions (RBAC)
- Public PG websites at managekar.com/pg/your-slug

**Business Model:** 3 months free trial → Free tier (1 PG/10 rooms/20 tenants) → Pro ₹499/month

---

## Project Structure

```
src/app/
├── page.tsx                    # Platform homepage
├── products/pg-manager/        # Product landing page
├── pricing/                    # Pricing page
├── (auth)/                     # Login, Register, Forgot Password
├── (dashboard)/                # Owner/Staff dashboard (16 modules)
│   ├── dashboard/              # Main dashboard (at /dashboard)
│   ├── properties/             # Property CRUD (at /properties)
│   ├── rooms/                  # Room management (at /rooms)
│   ├── tenants/                # Tenant lifecycle (at /tenants)
│   ├── bills/                  # Billing system (at /bills)
│   ├── payments/               # Payment tracking (at /payments)
│   ├── expenses/               # Expense tracking (at /expenses)
│   ├── meter-readings/         # Utility meters (at /meter-readings)
│   ├── staff/                  # Staff + roles RBAC (at /staff)
│   ├── notices/                # Announcements (at /notices)
│   ├── complaints/             # Issue tracking (at /complaints)
│   ├── visitors/               # Visitor log (at /visitors)
│   ├── exit-clearance/         # Checkout process (at /exit-clearance)
│   ├── reports/                # Analytics (at /reports)
│   ├── architecture/           # Property 2D visual map (at /architecture)
│   ├── activity/               # Activity Log (at /activity)
│   ├── approvals/              # Tenant requests workflow (at /approvals)
│   ├── admin/                  # Platform Admin (at /admin)
│   └── settings/               # Owner config (at /settings)
├── (tenant)/                   # Tenant portal
├── pg/[slug]/                  # Public PG websites
└── api/
    ├── cron/generate-bills/    # Auto billing (daily 6AM UTC)
    ├── cron/payment-reminders/ # Email reminders (daily 9AM UTC)
    └── receipts/[id]/pdf/      # PDF receipt generation

src/components/
├── ui/                         # shadcn + custom components
├── forms/                      # Shared form components
└── auth/                       # Auth components (PermissionGuard, etc.)

src/lib/
├── supabase/                   # Supabase clients + transforms
├── auth/                       # Auth context + hooks
├── features/                   # Feature flags system
├── services/                   # Centralized service layer (NEW)
│   ├── types.ts               # Service types, error codes
│   ├── audit.service.ts       # Audit logging
│   ├── notification.service.ts # Multi-channel notifications
│   └── workflow.engine.ts     # Workflow orchestrator
├── workflows/                  # Business workflows (NEW)
│   ├── tenant.workflow.ts     # Tenant lifecycle
│   ├── payment.workflow.ts    # Payment recording
│   └── exit.workflow.ts       # Exit clearance
├── hooks/                      # Centralized hooks (NEW)
│   ├── useListPage.ts         # List page data + UI
│   └── useEntityMutation.ts   # CRUD operations
├── email.ts                    # Resend email service
└── notifications.ts            # WhatsApp templates

src/components/
├── ui/                         # shadcn + custom components
├── forms/                      # Shared form components
├── auth/                       # Auth components (PermissionGuard, etc.)
└── shared/                     # Centralized templates (NEW)
    └── ListPageTemplate.tsx   # Standard list page
```

---

## Critical Patterns

### 1. Supabase Join Transform (ALWAYS USE)

Supabase returns JOINs in varying formats. **Always use the centralized utility:**

```typescript
import { transformJoin } from "@/lib/supabase/transforms"

const transformedData = data.map((item) => ({
  ...item,
  property: transformJoin(item.property),
  room: transformJoin(item.room),
  tenant: transformJoin(item.tenant),
}))
```

### 2. Permission Check Pattern

```typescript
import { useAuth, useCurrentContext } from "@/lib/auth"

function MyComponent() {
  const { hasPermission } = useAuth()
  const { isOwner, isStaff } = useCurrentContext()

  if (hasPermission("tenants.create")) { /* ... */ }
  if (isOwner) { /* full access */ }
}
```

### 3. Page Protection Pattern

```typescript
import { PermissionGuard, FeatureGuard } from "@/components/auth"

// Permission-based page
export default function TenantsPage() {
  return (
    <PermissionGuard permission="tenants.view">
      {/* content */}
    </PermissionGuard>
  )
}

// Feature-flagged page (FeatureGuard OUTSIDE PermissionGuard)
export default function ExpensesPage() {
  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        {/* content */}
      </PermissionGuard>
    </FeatureGuard>
  )
}
```

### 4. Clean URL Routing

- Dashboard pages use **clean URLs**: `/tenants`, `/properties` (NOT `/dashboard/tenants`)
- Files at `src/app/(dashboard)/[module]/` - the `(dashboard)` route group provides layout without affecting URL
- Middleware protects routes in `src/lib/supabase/middleware.ts`

### 5. Entity Links (Use Centralized Components)

```typescript
import { PropertyLink, TenantLink, RoomLink } from "@/components/ui/entity-link"

// In DataTable columns
{property && <PropertyLink id={property.id} name={property.name} size="sm" />}
{tenant && <TenantLink id={tenant.id} name={tenant.name} />}
```

Available: PropertyLink, RoomLink, TenantLink, BillLink, PaymentLink, ExpenseLink, MeterReadingLink, ComplaintLink, VisitorLink, NoticeLink, ExitClearanceLink

---

## Key Systems

### Multi-Context Identity
- One login, multiple roles - same email can be owner at one PG, staff at another
- Each owner = workspace. Staff/tenants are invited
- Context switching via header dropdown without re-login

### RBAC System
- 50+ permissions organized by module
- 5 default roles: Admin, Property Manager, Accountant, Maintenance, Receptionist
- Multi-role support via `user_roles` table
- Permissions aggregated from ALL assigned roles

### Feature Flags
15 configurable features via Settings → Features:
```typescript
import { FeatureGate, useFeatureCheck } from "@/components/auth"

<FeatureGate feature="food">
  <FoodSettings />
</FeatureGate>
```

### DataTable Features
- Column sorting (click headers)
- Multi-level nested grouping with collapsible sections
- Search across specified fields
- Entity link columns with stopPropagation for nested clicks

---

## UI Components

| Component | Purpose |
|-----------|---------|
| `PageHeader` | Page title with icon, actions, breadcrumbs |
| `MetricsBar` | Horizontal stats bar with clickable items |
| `DataTable` | Table with search, sorting, nested grouping |
| `PageLoader` | Centralized loading spinner |
| `Avatar` | User avatar with auto-generated initials |
| `StatCard` | Stat card with icon + colored background |
| `EntityLink` | Centralized clickable links to entity pages |

### Button Variants
- `variant="gradient"` - Primary CTAs (teal → emerald)
- `variant="outline"` - Secondary actions
- `size="xl"` - Large CTAs on marketing pages

---

## Database

### Key Tables
```
workspaces          - One per owner (auto-created)
user_profiles       - Central identity for all users
user_contexts       - Links users to workspaces
properties          - Buildings with website_config JSONB
rooms               - Rooms with capacity tracking
tenants             - Tenant records with lifecycle status
bills               - Monthly bills with line_items JSONB
payments            - Payment records linked to bills
staff_members       - Staff with email invitations
roles               - Role definitions with permissions JSONB
user_roles          - Staff-to-role assignments
```

### Migrations (38 total)
Run in order from `supabase/migrations/`. Key ones:
- `012_unified_identity.sql` - Multi-context auth
- `013_default_roles.sql` - System roles
- `015_storage_buckets.sql` - Photo uploads
- `016_audit_logging.sql` - Audit trail
- `017_platform_admins.sql` - Superuser system
- `036_fix_charge_expense_rls.sql` - Security fix for data isolation
- `038_comprehensive_audit_system.sql` - Complete audit triggers + workflow tables (NEW)

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://pmedxtgysllyhpjldhho.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
RESEND_API_KEY=<resend_key>  # For emails
```

---

## Centralized Architecture (NEW)

### Service Layer
All business operations should go through the service layer for consistent audit logging and notifications:

```typescript
import { wrapOperation, createAuditEvent, sendNotification } from "@/lib/services"

// Simple operation with automatic audit
const result = await wrapOperation(
  () => supabase.from("tenants").insert(data).select().single(),
  {
    entityType: "tenant",
    entityId: newTenant.id,
    action: "create",
    actorId: user.id,
    actorType: "owner",
    workspaceId: workspace.id,
  }
)
```

### Workflow Engine
For multi-step operations, use workflows to ensure all cascading effects happen:

```typescript
import { createTenant, recordPayment, initiateExitClearance } from "@/lib/workflows"

// Tenant creation with room occupancy, initial bill, welcome notification
const result = await createTenant(input, actorId, "owner", workspaceId)

// Payment with bill status update, receipt, notification
const result = await recordPayment(input, actorId, "owner", workspaceId)

// Exit clearance with tenant status, room release, settlement
const result = await initiateExitClearance(input, actorId, "owner", workspaceId)
```

### useListPage Hook
Eliminates 1000+ lines of duplicate code across list pages:

```typescript
import { useListPage, TENANT_LIST_CONFIG } from "@/lib/hooks"

const { data, filteredData, loading, filters, setFilter, metricsData } = useListPage({
  config: TENANT_LIST_CONFIG,
  filters: filterConfigs,
  groupByOptions,
  metrics,
})
```

### useEntityMutation Hook
Centralized CRUD with automatic audit logging:

```typescript
import { useEntityMutation } from "@/lib/hooks"

const { create, update, remove, loading } = useEntityMutation({
  entityType: "tenant",
  table: "tenants",
  onSuccess: () => refetch(),
})

await create({ name: "John", phone: "9876543210" })
```

### ListPageTemplate Component
Standard list page with 70% code reduction:

```typescript
import { ListPageTemplate } from "@/components/shared"

<ListPageTemplate
  title="Tenants"
  icon={Users}
  permission="tenants.view"
  config={TENANT_LIST_CONFIG}
  filters={tenantFilters}
  columns={tenantColumns}
  createHref="/tenants/new"
  detailHref={(t) => `/tenants/${t.id}`}
/>
```

---

## Adding New Features

### New Dashboard Page
1. Create at `src/app/(dashboard)/[module]/page.tsx`
2. Wrap with `<PermissionGuard permission="module.view">`
3. If feature-flagged, wrap with `<FeatureGuard>` (outside PermissionGuard)
4. Add to navigation in `src/app/(dashboard)/layout.tsx`
5. Use `PageHeader` with breadcrumbs, `MetricsBar`, `DataTable`

### New Permission
1. Update `src/lib/auth/types.ts` - PERMISSIONS constant
2. Update role definitions in database
3. Update navigation filtering in layout.tsx

### Supabase Query with JOINs
```typescript
const { data } = await supabase
  .from("tenants")
  .select(`*, property:properties(id, name), room:rooms(id, room_number)`)

// ALWAYS transform the result
const transformed = data?.map(item => ({
  ...item,
  property: transformJoin(item.property),
  room: transformJoin(item.room),
}))
```

---

## Design Principles

- **Standardised** - Consistent patterns across codebase
- **Modular** - Reusable components
- **Secure** - RLS, validation, audit
- **Simplified** - Easy to understand
- **Customer-Centric** - Indian business needs first

---

## Contacts

- **Developer**: Rajat Seth (sethrajat0711@gmail.com)
- **GitHub**: https://github.com/cybinfo/pg-manager

*Last updated: 2026-01-05*
