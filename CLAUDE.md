# ManageKar - AI Development Guide

> **CRITICAL**: This is the definitive source of truth for AI development on ManageKar. Read completely before any code changes.

## Quick Reference

| | |
|---|---|
| **Production** | https://managekar.com |
| **Stack** | Next.js 16 + TypeScript + Supabase + Tailwind + shadcn/ui |
| **Deploy** | `git add . && git commit -m "msg" && git push && vercel --prod` |

```bash
npm run dev      # localhost:3000
npm run build    # Production build
npx tsc --noEmit # Type check
```

---

## Product Context

**ManageKar** = "Let's Manage" in Hindi. A SaaS platform for Indian small businesses, starting with **PG Manager** for Paying Guest accommodations and hostels.

### Target Users
- PG/Hostel owners managing 1-50 properties
- Staff members (managers, accountants, receptionists)
- Tenants (self-service portal)

### Business Model
```
Free Trial (3 months) → Free Tier (1 PG/10 rooms) → Pro ₹499/month → Business ₹999/month
```

---

## Architecture Overview

### Directory Structure
```
src/
├── app/
│   ├── (auth)/              # Login, Register, Forgot Password
│   ├── (dashboard)/         # 19 dashboard modules
│   ├── (tenant)/            # Tenant self-service portal
│   ├── pg/[slug]/           # Public PG websites
│   └── api/                 # API routes + cron jobs
├── components/
│   ├── ui/                  # shadcn + custom components
│   ├── forms/               # Shared form components
│   ├── shared/              # Templates (ListPageTemplate)
│   ├── auth/                # PermissionGuard, FeatureGuard
│   └── journey/             # Tenant journey components
└── lib/
    ├── supabase/            # Clients + transforms
    ├── auth/                # Auth context + hooks
    ├── features/            # Feature flags
    ├── services/            # Service layer (journey, analytics)
    ├── workflows/           # Business workflows
    └── hooks/               # Reusable hooks
```

### Dashboard Modules (19)

| Module | URL | Description |
|--------|-----|-------------|
| Dashboard | `/dashboard` | Overview + metrics |
| Properties | `/properties` | Building management |
| Rooms | `/rooms` | Room + bed management |
| Tenants | `/tenants` | Tenant lifecycle |
| **Tenant Journey** | `/tenants/[id]/journey` | **AI-powered lifecycle tracking** |
| Bills | `/bills` | Billing system |
| Payments | `/payments` | Payment tracking |
| Refunds | `/refunds` | Refund processing |
| Expenses | `/expenses` | Expense tracking |
| Meter Readings | `/meter-readings` | Utility meters |
| Staff | `/staff` | Staff + RBAC roles |
| Notices | `/notices` | Announcements |
| Complaints | `/complaints` | Issue tracking |
| Visitors | `/visitors` | Visitor log |
| Exit Clearance | `/exit-clearance` | Checkout process |
| Reports | `/reports` | Analytics |
| Architecture | `/architecture` | Property 2D map |
| Activity | `/activity` | Audit log viewer |
| Approvals | `/approvals` | Tenant requests |

---

## Critical Patterns (MUST FOLLOW)

### 1. Supabase Join Transform (MANDATORY)

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

### 2. Page Protection

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

### 3. Permission Checks

```typescript
import { useAuth, useCurrentContext } from "@/lib/auth"

const { hasPermission, user } = useAuth()
const { isOwner, isStaff, currentContext } = useCurrentContext()

if (hasPermission("tenants.create")) { /* allowed */ }
if (isOwner) { /* owner-only logic */ }
```

### 4. Select Component (NOT shadcn)

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

### 5. DataTable

```typescript
import { DataTable, Column } from "@/components/ui/data-table"

const columns: Column<T>[] = [
  {
    key: "name",
    header: "Name",
    width: "primary",  // primary|secondary|tertiary|amount|count|date|status|badge|actions
    sortable: true,
    render: (row) => <span>{row.name}</span>,
  },
]

<DataTable
  columns={columns}
  data={data}
  keyField="id"  // REQUIRED - unique identifier
  onRowClick={(row) => router.push(`/path/${row.id}`)}
  searchable
/>
```

### 6. Entity Links

```typescript
import { PropertyLink, TenantLink, RoomLink } from "@/components/ui/entity-link"

<PropertyLink id={property.id} name={property.name} size="sm" />
<TenantLink id={tenant.id} name={tenant.name} />
<RoomLink id={room.id} roomNumber={room.room_number} />
```

### 7. Avatar Component

```typescript
import { Avatar } from "@/components/ui/avatar"

// Takes name and optional src - NOT AvatarImage/AvatarFallback children
<Avatar name={tenant.name} src={tenant.photo_url} size="md" />
// Sizes: xs | sm | md | lg | xl
```

### 8. Platform Admin Check

```typescript
// Use is_platform_admin() function in SQL, NOT pa.is_active column
// The platform_admins table only has: user_id, created_at, created_by, notes

// In RLS policies:
OR is_platform_admin(auth.uid())

// In TypeScript:
const isPlatformAdmin = await checkPlatformAdmin(userId)
```

---

## Database Schema

### Key Tables

| Table | Purpose |
|-------|---------|
| `workspaces` | One per owner (auto-created) |
| `user_profiles` | Central identity |
| `user_contexts` | Links users to workspaces (has `is_active`) |
| `platform_admins` | Superusers (NO `is_active` column) |
| `properties` | Buildings |
| `rooms` | Rooms with `total_beds`, `occupied_beds` |
| `tenants` | Tenant records |
| `tenant_stays` | Track multiple stays (re-joining tenants) |
| `bills` | Monthly bills with `line_items` JSONB |
| `payments` | Payment records |
| `refunds` | Refund tracking |
| `exit_clearance` | Checkout process |
| `tenant_risk_alerts` | AI-generated risk alerts |
| `communications` | Message tracking |
| `audit_events` | Comprehensive audit trail |

### Critical Column Names

| Table | Correct Column | NOT |
|-------|---------------|-----|
| `rooms` | `total_beds` | ~~bed_count~~ |
| `tenants` | `phone_numbers` (JSONB) | ~~phones~~ |
| `tenants` | `guardian_contacts` (JSONB) | ~~guardians~~ |
| `tenant_stays` | `join_date` | ~~start_date~~ |
| `exit_clearance` | `settlement_status` | ~~status~~ |
| `platform_admins` | NO `is_active` | ~~is_active~~ |

### Migrations (41 total)

| # | File | Purpose |
|---|------|---------|
| 001 | initial_schema.sql | Core tables |
| 007 | tenant_history.sql | Re-joining tenants, room transfers |
| 011 | tenant_enhanced_fields.sql | JSONB fields |
| 012 | unified_identity.sql | Multi-context auth |
| 016 | audit_logging.sql | Audit trail |
| 017 | platform_admins.sql | Superuser system |
| 038 | comprehensive_audit_system.sql | Universal triggers |
| 039 | refunds_table.sql | Refund tracking |
| 040 | fix_schema_gaps.sql | Feature flags, RLS fixes |
| **041** | **tenant_journey_analytics.sql** | **Risk alerts, communications** |

---

## Key Systems

### Multi-Context Identity
- One login, multiple roles
- Same email can be owner at one PG, staff at another
- Context switching via header dropdown
- `user_contexts` table with `is_active` flag

### RBAC System
- 50+ permissions organized by module
- 5 default roles: Admin, Property Manager, Accountant, Maintenance, Receptionist
- Multi-role support via `user_roles`
- Permissions aggregated from ALL assigned roles

### Tenant Journey System (NEW)
- Visual timeline of all tenant events
- AI-powered predictive insights:
  - Payment Reliability Score (0-100)
  - Churn Risk Score (0-100)
  - Satisfaction Level (High/Medium/Low)
- Financial summary with breakdown
- PDF export for reports
- Visitor-to-tenant linkage detection

### Feature Flags
```typescript
import { useFeatures } from "@/lib/features"

const { isEnabled } = useFeatures()
if (isEnabled("food")) { /* show food features */ }
```

---

## Workflows

Business logic centralized in `src/lib/workflows/`:

### Tenant Workflow (`tenant.workflow.ts`)
1. `validate_room` - Check capacity
2. `create_tenant` - Insert tenant record
3. `create_tenant_stay` - Track stay history
4. `update_room_occupancy` - Update room stats
5. `update_bed` - Assign bed if applicable
6. `save_documents` - Store ID documents
7. `generate_initial_bill` - Optional first bill

### Exit Workflow (`exit.workflow.ts`)
1. Initiate exit clearance
2. Calculate settlement (dues - refundable)
3. Process checklist (inspection, key return)
4. Create refund record
5. Update tenant status

---

## UI Components Reference

| Component | Import | Usage |
|-----------|--------|-------|
| `PageHeader` | `@/components/ui/page-header` | Title + actions |
| `MetricsBar` | `@/components/ui/metrics-bar` | Stats row |
| `DataTable` | `@/components/ui/data-table` | Table + search |
| `PageLoader` | `@/components/ui/page-loader` | Loading state |
| `Avatar` | `@/components/ui/avatar` | User avatar (name + src props) |
| `StatCard` | `@/components/ui/stat-card` | Metric card |
| `EntityLink` | `@/components/ui/entity-link` | Clickable links |
| `Select` | `@/components/ui/form-components` | Dropdown (NOT shadcn) |
| `TableBadge` | `@/components/ui/table-badge` | Status badges |
| `StatusBadge` | `@/components/ui/status-badge` | Entity status |
| `Combobox` | `@/components/ui/combobox` | Searchable select |
| `EmptyState` | `@/components/ui/empty-state` | No data placeholder |

### Journey Components
| Component | Import | Usage |
|-----------|--------|-------|
| `Timeline` | `@/components/journey` | Event timeline |
| `TimelineEvent` | `@/components/journey` | Single event card |
| `JourneyHeader` | `@/components/journey` | Page header |
| `JourneyAnalytics` | `@/components/journey` | Metric cards |
| `FinancialSummary` | `@/components/journey` | Financial overview |
| `PredictiveInsights` | `@/components/journey` | AI scores |
| `JourneyFilters` | `@/components/journey` | Filter controls |

### Button Variants
- `variant="gradient"` - Primary CTAs (teal gradient)
- `variant="default"` - Standard primary
- `variant="outline"` - Secondary actions
- `variant="ghost"` - Tertiary/subtle
- `size="xl"` - Large marketing CTAs

---

## Common Issues & Solutions

### "Column does not exist"
- Check column names in schema section
- Common mistakes: `bed_count` vs `total_beds`, `is_active` on `platform_admins`

### 400 Bad Request on insert
- Verify all required columns exist
- Check column names match exactly
- Ensure JSONB fields are properly formatted

### RLS Policy blocking
- Check `owner_id = auth.uid()` pattern
- Verify workspace_id for staff access
- Use `is_platform_admin()` function (not column check)

### Supabase client hanging
- Use direct REST API for complex workflows
- See `exit.workflow.ts` for pattern

### TypeScript implicit any errors
- Add explicit type annotations to array callbacks
- Example: `.filter((b: { status: string }) => b.status === "paid")`

---

## Adding New Features

### New Dashboard Page
1. Create `src/app/(dashboard)/[module]/page.tsx`
2. Wrap with `<PermissionGuard permission="module.view">`
3. Add to navigation in layout
4. Use `PageHeader`, `MetricsBar`, `DataTable` patterns

### New Database Table
1. Create migration in `supabase/migrations/`
2. Add RLS policies using `owner_id` pattern
3. Use `is_platform_admin()` for admin bypass
4. Create indexes for common queries
5. Add to audit triggers if needed

### New Permission
1. Update `src/lib/auth/types.ts` - PERMISSIONS constant
2. Update role definitions in database
3. Update navigation filtering

### New Journey Event Type
1. Add to `EventType` in `src/types/journey.types.ts`
2. Create normalizer in `journey.service.ts`
3. Add icon mapping in `EventIcon.tsx`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
RESEND_API_KEY=<resend_key>
```

---

## Deployment

### Production Deploy
```bash
git add . && git commit -m "description" && git push && vercel --prod
```

### Database Migration
1. Create SQL in `supabase/migrations/`
2. Run in Supabase SQL Editor
3. Test locally before production

---

## Design Principles

1. **Standardized** - Consistent patterns everywhere
2. **Modular** - Reusable, composable components
3. **Secure** - RLS, validation, audit logging
4. **Simplified** - Easy to understand and modify
5. **Customer-Centric** - Built for Indian business needs
6. **AI-Ready** - Predictive analytics and insights

---

## Contacts

- **Developer**: Rajat Seth (sethrajat0711@gmail.com)
- **Repository**: https://github.com/cybinfo/pg-manager
- **Production**: https://managekar.com

---

*Last updated: 2026-01-10*
