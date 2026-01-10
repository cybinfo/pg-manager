# ManageKar - AI Development Guide

> **IMPORTANT**: Read before making any changes. This file is the source of truth for AI assistants working on this codebase.

## Quick Start

| | |
|---|---|
| **Production** | https://managekar.com |
| **Stack** | Next.js 16 + TypeScript + Supabase + Tailwind + shadcn/ui |
| **Deploy** | `vercel --prod` |

```bash
npm run dev      # localhost:3000
npm run build    # Production build
vercel --prod    # Deploy
```

---

## Product Overview

**ManageKar** is a SaaS platform for Indian small businesses, starting with **PG Manager** for Paying Guest accommodations and hostels.

### Core Capabilities
- Multi-property management from single dashboard
- Complete tenant lifecycle: onboarding → billing → notice → exit → refund
- Smart billing with auto-generation and WhatsApp sharing
- RBAC with 50+ granular permissions
- Public PG websites at `managekar.com/pg/{slug}`
- Comprehensive audit logging

### Business Model
Free trial (3 months) → Free tier (1 PG/10 rooms/20 tenants) → Pro ₹499/month

---

## Architecture

### Project Structure
```
src/
├── app/
│   ├── (auth)/           # Login, Register, Forgot Password
│   ├── (dashboard)/      # Owner/Staff dashboard (18 modules)
│   ├── (tenant)/         # Tenant self-service portal
│   ├── pg/[slug]/        # Public PG websites
│   └── api/              # API routes + cron jobs
├── components/
│   ├── ui/               # shadcn + custom components
│   ├── forms/            # Shared form components
│   ├── shared/           # Templates (ListPageTemplate)
│   └── auth/             # PermissionGuard, FeatureGuard
└── lib/
    ├── supabase/         # Clients + transforms
    ├── auth/             # Auth context + hooks
    ├── features/         # Feature flags
    ├── services/         # Service layer + workflow engine
    ├── workflows/        # Business workflows
    └── hooks/            # Reusable hooks
```

### Dashboard Modules (18)
| Module | URL | Description |
|--------|-----|-------------|
| Dashboard | `/dashboard` | Overview + metrics |
| Properties | `/properties` | Building management |
| Rooms | `/rooms` | Room + bed management |
| Tenants | `/tenants` | Tenant lifecycle |
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

## Critical Patterns

### 1. Supabase Join Transform (MANDATORY)

Supabase returns JOINs in inconsistent formats. **Always transform:**

```typescript
import { transformJoin } from "@/lib/supabase/transforms"

const { data } = await supabase
  .from("tenants")
  .select(`*, property:properties(id, name), room:rooms(id, room_number)`)

// ALWAYS transform
const transformed = data?.map(item => ({
  ...item,
  property: transformJoin(item.property),
  room: transformJoin(item.room),
}))
```

### 2. Page Protection

```typescript
// Permission-based
<PermissionGuard permission="tenants.view">
  {content}
</PermissionGuard>

// Feature-flagged (FeatureGuard OUTSIDE)
<FeatureGuard feature="expenses">
  <PermissionGuard permission="expenses.view">
    {content}
  </PermissionGuard>
</FeatureGuard>
```

### 3. Permission Checks

```typescript
import { useAuth, useCurrentContext } from "@/lib/auth"

const { hasPermission } = useAuth()
const { isOwner, isStaff } = useCurrentContext()

if (hasPermission("tenants.create")) { /* ... */ }
```

### 4. Select Component (NOT shadcn)

```typescript
import { Select } from "@/components/ui/form-components"

<Select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  options={[
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
  ]}
/>
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
  keyField="id"  // REQUIRED
  onRowClick={(row) => router.push(`/path/${row.id}`)}
  searchable
/>
```

### 6. Entity Links

```typescript
import { PropertyLink, TenantLink, RoomLink } from "@/components/ui/entity-link"

<PropertyLink id={property.id} name={property.name} size="sm" />
<TenantLink id={tenant.id} name={tenant.name} />
```

### 7. URL Routing

- Dashboard uses **clean URLs**: `/tenants` not `/dashboard/tenants`
- Route groups `(dashboard)` provide layout without affecting URL
- Middleware at `src/lib/supabase/middleware.ts`

---

## Database Schema

### Key Tables
| Table | Purpose |
|-------|---------|
| `workspaces` | One per owner (auto-created) |
| `user_profiles` | Central identity |
| `user_contexts` | Links users to workspaces |
| `properties` | Buildings |
| `rooms` | Rooms with `total_beds`, `occupied_beds` |
| `tenants` | Tenant records |
| `tenant_stays` | Track multiple stays (re-joining tenants) |
| `bills` | Monthly bills with `line_items` JSONB |
| `payments` | Payment records |
| `refunds` | Refund tracking |
| `exit_clearance` | Checkout process |
| `staff_members` | Staff records |
| `roles` | Role definitions with `permissions` JSONB |
| `user_roles` | Staff-to-role assignments |
| `audit_events` | Comprehensive audit trail |

### Critical Column Names (Avoid Mismatches!)

| Table | Correct Column | NOT |
|-------|---------------|-----|
| `rooms` | `total_beds` | ~~bed_count~~ |
| `tenants` | `phone_numbers` (JSONB) | ~~phones~~ |
| `tenants` | `guardian_contacts` (JSONB) | ~~guardians~~ |
| `tenant_stays` | `join_date` | ~~start_date~~ |
| `exit_clearance` | `settlement_status` | ~~status~~ |

### Migrations (40 total)
Key migrations in `supabase/migrations/`:
| # | File | Purpose |
|---|------|---------|
| 001 | initial_schema.sql | Core tables |
| 007 | tenant_history.sql | Re-joining tenants, room transfers |
| 011 | tenant_enhanced_fields.sql | JSONB fields for phones, emails, addresses |
| 012 | unified_identity.sql | Multi-context auth |
| 016 | audit_logging.sql | Audit trail |
| 038 | comprehensive_audit_system.sql | Universal audit triggers |
| 039 | refunds_table.sql | Refund tracking |
| 040 | fix_schema_gaps.sql | Feature flags, RLS fixes |

---

## Workflows

Business logic is centralized in `src/lib/workflows/`:

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

## Key Systems

### Multi-Context Identity
- One login, multiple roles
- Same email can be owner at one PG, staff at another
- Context switching via header dropdown

### RBAC System
- 50+ permissions organized by module
- 5 default roles: Admin, Property Manager, Accountant, Maintenance, Receptionist
- Multi-role support via `user_roles`
- Permissions aggregated from ALL assigned roles

### Feature Flags
Stored in `owner_config.feature_flags` JSONB:
```typescript
import { useFeatures } from "@/lib/features"

const { isEnabled } = useFeatures()
if (isEnabled("food")) { /* show food features */ }
```

---

## Common Issues & Fixes

### "Column does not exist"
- Check column names in schema above
- Common: `bed_count` vs `total_beds`, `phones` vs `phone_numbers`

### 400 Bad Request on insert
- Verify all required columns exist
- Check column names match exactly
- Ensure JSONB fields are properly formatted

### RLS Policy blocking
- Check `owner_id = auth.uid()` pattern
- Verify workspace_id for staff access
- Platform admins bypass via `platform_admins` table

### Supabase client hanging
- Use direct REST API for complex workflows
- See `exit.workflow.ts` for pattern

### Select component not working
- Use `@/components/ui/form-components` Select
- Pass `options` array, NOT SelectItem children

---

## Adding New Features

### New Dashboard Page
1. Create `src/app/(dashboard)/[module]/page.tsx`
2. Wrap with `<PermissionGuard permission="module.view">`
3. Add to navigation in `layout.tsx`
4. Use `PageHeader`, `MetricsBar`, `DataTable`

### New Database Table
1. Create migration in `supabase/migrations/`
2. Add RLS policies (owner_id pattern)
3. Create indexes for common queries
4. Add to audit triggers if needed

### New Permission
1. Update `src/lib/auth/types.ts` - PERMISSIONS constant
2. Update role definitions in database
3. Update navigation filtering

---

## UI Components Reference

| Component | Import | Usage |
|-----------|--------|-------|
| `PageHeader` | `@/components/ui/page-header` | Title + actions |
| `MetricsBar` | `@/components/ui/metrics-bar` | Stats row |
| `DataTable` | `@/components/ui/data-table` | Table + search |
| `PageLoader` | `@/components/ui/page-loader` | Loading state |
| `Avatar` | `@/components/ui/avatar` | User avatar |
| `StatCard` | `@/components/ui/stat-card` | Metric card |
| `EntityLink` | `@/components/ui/entity-link` | Clickable links |
| `Select` | `@/components/ui/form-components` | Dropdown (NOT shadcn) |
| `TableBadge` | `@/components/ui/table-badge` | Status badges |
| `Combobox` | `@/components/ui/combobox` | Searchable select |

### Button Variants
- `variant="gradient"` - Primary CTAs
- `variant="outline"` - Secondary actions
- `size="xl"` - Large marketing CTAs

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://pmedxtgysllyhpjldhho.supabase.co
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

1. **Standardised** - Consistent patterns everywhere
2. **Modular** - Reusable, composable components
3. **Secure** - RLS, validation, audit logging
4. **Simplified** - Easy to understand and modify
5. **Customer-Centric** - Built for Indian business needs

---

## Contacts

- **Developer**: Rajat Seth (sethrajat0711@gmail.com)
- **Repository**: https://github.com/cybinfo/pg-manager
- **Production**: https://managekar.com

---

*Last updated: 2026-01-10*
