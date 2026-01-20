# ManageKar - AI Development Guide

> **Essential Reference**: Read this before making any code changes.
> **Last Updated**: 2026-01-13

---

## Quick Reference

| Item | Value |
|------|-------|
| **Production URL** | https://managekar.com |
| **Stack** | Next.js 16 + TypeScript + Supabase + Tailwind + shadcn/ui |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **Migrations** | 53 total (001-053) |

```bash
npm run dev          # Development server at localhost:3000
npm run build        # Production build
npm test             # Run test suite (154 tests)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npx tsc --noEmit     # Type check
vercel --prod        # Deploy to production
```

---

## 1. Product Overview

**ManageKar** ("Let's Manage" in Hindi) is a SaaS platform for Indian small businesses, starting with **PG Manager** for Paying Guest accommodations and hostels.

### Target Users

| User Type | Description |
|-----------|-------------|
| **Owners** | PG/Hostel owners managing 1-50 properties |
| **Staff** | Property managers, accountants, receptionists |
| **Tenants** | Self-service portal users |

### Business Model

```
Free Trial (3 months) → Free Tier (1 PG/10 rooms) → Pro ₹499/month → Business ₹999/month
```

---

## 2. Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/              # Login, Register, Password Reset
│   ├── (dashboard)/         # 19 dashboard modules
│   ├── (tenant)/            # Tenant self-service portal
│   ├── pg/[slug]/           # Public PG websites
│   └── api/                 # API routes + cron jobs
├── components/
│   ├── ui/                  # shadcn + custom components
│   ├── forms/               # Form components
│   ├── shared/              # Templates (ListPageTemplate)
│   ├── auth/                # PermissionGuard, FeatureGuard
│   └── journey/             # Tenant journey components
└── lib/
    ├── supabase/            # Clients + transforms
    ├── auth/                # Auth context + hooks
    ├── features/            # Feature flags
    ├── services/            # Service layer (workflow engine, audit)
    ├── workflows/           # Business workflows
    └── hooks/               # Reusable hooks
```

### Dashboard Modules (20)

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
| Mobile UX | Native dropdown | Custom popover |

### 4.3 DataTable

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

### 4.4 Entity Links

```typescript
import { PropertyLink, TenantLink, RoomLink, MeterLink } from "@/components/ui/entity-link"

<PropertyLink id={property.id} name={property.name} size="sm" />
<TenantLink id={tenant.id} name={tenant.name} />
<RoomLink id={room.id} roomNumber={room.room_number} />
<MeterLink id={meter.id} meterNumber={meter.meter_number} meterType={meter.meter_type} />
```

### 4.5 Avatar Component

```typescript
import { Avatar } from "@/components/ui/avatar"

// Takes name and optional src - NOT AvatarImage/AvatarFallback children
<Avatar name={tenant.name} src={tenant.photo_url} size="md" />
// Sizes: xs | sm | md | lg | xl
```

### 4.6 Common UI Components

| Component | Import | Usage |
|-----------|--------|-------|
| `PageHeader` | `@/components/ui/page-header` | Title + actions |
| `MetricsBar` | `@/components/ui/metrics-bar` | Stats row |
| `DataTable` | `@/components/ui/data-table` | Table + search |
| `PageLoader` | `@/components/ui/page-loader` | Loading state |
| `StatCard` | `@/components/ui/stat-card` | Metric card |
| `TableBadge` | `@/components/ui/table-badge` | Status badges |
| `StatusBadge` | `@/components/ui/status-badge` | Entity status |
| `Combobox` | `@/components/ui/combobox` | Searchable select |
| `EmptyState` | `@/components/ui/empty-state` | No data placeholder |
| `Currency` | `@/components/ui/currency` | INR formatting |
| `Pagination` | `@/components/ui/pagination` | Page navigation |

---

## 5. Database Schema

### 5.1 Key Tables

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
| `meters` | Physical utility meters (electricity, water, gas) |
| `meter_assignments` | Meter-to-room assignments with date ranges |
| `meter_readings` | Consumption readings linked to meters |
| `tenant_risk_alerts` | AI-generated risk alerts |
| `communications` | Message tracking |
| `audit_events` | Comprehensive audit trail |

### 5.2 Critical Column Names

| Table | Correct Column | NOT |
|-------|----------------|-----|
| `rooms` | `total_beds` | ~~bed_count~~ |
| `tenants` | `phone_numbers` (JSONB) | ~~phones~~ |
| `tenants` | `guardian_contacts` (JSONB) | ~~guardians~~ |
| `tenant_stays` | `join_date` | ~~start_date~~ |
| `exit_clearance` | `settlement_status` | ~~status~~ |
| `platform_admins` | NO `is_active` column | ~~is_active~~ |

### 5.3 UUID Generation

```sql
-- Postgres (preferred)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Client-side (TypeScript)
const id = crypto.randomUUID()
```

### 5.4 Key Migrations

| # | File | Purpose |
|---|------|---------|
| 001 | initial_schema.sql | Core tables |
| 007 | tenant_history.sql | Re-joining tenants, room transfers |
| 012 | unified_identity.sql | Multi-context auth |
| 016 | audit_logging.sql | Audit trail |
| 017 | platform_admins.sql | Superuser system |
| 038 | comprehensive_audit_system.sql | Universal triggers |
| 039 | refunds_table.sql | Refund tracking |
| 040 | fix_schema_gaps.sql | Feature flags, RLS |
| 041 | tenant_journey_analytics.sql | Risk alerts |
| 042 | schema_reconciliation.sql | FK indexes, atomic RPCs |
| 043 | security_fixes.sql | Audit policy, CHECK constraints |
| 052 | meter_management.sql | Meters table, meter_assignments, RLS |
| 053 | cleanup_old_meter_readings.sql | Remove legacy readings, make meter_id required |

### 5.5 CHECK Constraints (Migration 043)

```sql
tenants.discount_percent: 0-100 range
bills.paid_amount: non-negative
bills.balance_due: non-negative
payments.amount: positive (> 0)
refunds.amount: positive (> 0)
tenant_risk_alerts.severity: 'low', 'medium', 'high', 'critical'
```

---

## 6. Service Layer

### 6.1 Workflow Engine

The workflow engine (`src/lib/services/workflow.engine.ts`) orchestrates multi-step operations:

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

// Execute with idempotency key to prevent duplicates
const result = await executeWorkflow(
  myWorkflow,
  input,
  actorId,
  actorType,
  workspaceId,
  { idempotency_key: `payment-${paymentId}` }
)
```

### 6.2 Audit Service

```typescript
import { createAuditEvent, logAuditEvent } from "@/lib/services/audit.service"

const event = createAuditEvent(
  "tenant",           // entity_type
  tenantId,           // entity_id
  "update",           // action
  { actor_id, actor_type, workspace_id },
  { before: oldData, after: newData }
)
await logAuditEvent(event)
```

### 6.3 API Response Pattern

```typescript
import { apiSuccess, apiError, unauthorized, notFound } from "@/lib/api-response"

// Success
return apiSuccess(data, "Operation successful")

// Errors
return unauthorized()
return notFound("Tenant")
return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid input", details)
```

### 6.4 Structured Logging

```typescript
import { cronLogger, apiLogger, workflowLogger } from "@/lib/logger"

cronLogger.info("Bill generation started", { ownerId, count: tenants.length })
apiLogger.error("Request failed", { error: extractErrorMeta(err) })
```

---

## 7. Authentication & Authorization

### 7.1 Multi-Context Identity

- One login, multiple roles
- Same email can be owner at one PG, staff at another
- Context switching via header dropdown
- `user_contexts` table with `is_active` flag

### 7.2 RBAC System

- 50+ permissions organized by module
- 5 default roles: Admin, Property Manager, Accountant, Maintenance, Receptionist
- Multi-role support via `user_roles`
- Permissions aggregated from ALL assigned roles (UNION)

### 7.3 Permission Hierarchy

```
Platform Admin > Owner > Staff > Tenant
```

### 7.4 Permissions List

```typescript
// All permissions from src/lib/auth/types.ts
DASHBOARD_VIEW, PROPERTIES_*, ROOMS_*, TENANTS_*,
BILLS_*, PAYMENTS_*, EXPENSES_*, REFUNDS_*,
METERS_*, METER_READINGS_*, STAFF_*, NOTICES_*, COMPLAINTS_*,
VISITORS_*, EXIT_CLEARANCE_*, REPORTS_*, APPROVALS_*,
SETTINGS_*, ARCHITECTURE_VIEW, ACTIVITY_VIEW
```

---

## 8. Security

### 8.1 Implemented Protections

| Protection | Location | Description |
|------------|----------|-------------|
| Rate Limiting | `src/lib/rate-limit.ts` | All API routes |
| CSRF Protection | `src/lib/csrf.ts` | Sensitive POST endpoints |
| Security Headers | `next.config.ts` | CSP, HSTS, X-Frame-Options |
| RLS | All tables | Row Level Security |
| Audit Logging | Universal triggers | Critical tables |
| Input Validation | API routes | UUID, date, limit validation |

### 8.2 Rate Limiters

| Limiter | Limit | Usage |
|---------|-------|-------|
| `authLimiter` | 5 req/min | Login, verification |
| `apiLimiter` | 100 req/min | General API routes |
| `sensitiveLimiter` | 3 req/min | Admin operations |
| `cronLimiter` | 2 req/min | Cron jobs |

### 8.3 Security Patterns

```typescript
// Rate limiting
import { withRateLimit, apiLimiter } from "@/lib/rate-limit"
const { limited, headers } = await withRateLimit(request, apiLimiter)
if (limited) return rateLimited()

// CSRF protection
import { validateCsrfToken } from "@/lib/csrf"
const valid = await validateCsrfToken(request)
if (!valid) return csrfError()

// Filename sanitization for downloads
import { sanitizeFilename } from "@/lib/format"
const safe = sanitizeFilename(tenantName)
```

### 8.4 Edge Runtime Compatibility

The middleware runs in Vercel's Edge Runtime which has limited Node.js API support.

**Do NOT use in middleware or CSRF module:**
- `import crypto from "crypto"` - Use `crypto.getRandomValues()` (Web Crypto API)
- `Buffer.from()` / `Buffer.toString()` - Use `btoa()` / `atob()`
- `crypto.timingSafeEqual()` - Use manual constant-time comparison

---

## 9. Testing

### 9.1 Test Suite Overview

The project uses Jest with React Testing Library. **154 tests** across 5 test suites:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `format.test.ts` | 45 | Currency, number, text formatting |
| `validators.test.ts` | 42 | Indian mobile, PAN, Aadhaar, GST validators |
| `api-response.test.ts` | 32 | API response helpers, error codes |
| `services/types.test.ts` | 26 | Service layer error codes |
| `currency.test.tsx` | 21 | Currency display components |

### 9.2 Running Tests

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Generate coverage report
```

### 9.3 Test Configuration

- **Config**: `jest.config.js` (uses `next/jest`)
- **Setup**: `jest.setup.js` (mocks for NextResponse, router, Supabase)
- **Location**: `src/__tests__/`

### 9.4 Writing New Tests

```typescript
// Component test example
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/ui/my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop="value" />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})

// Utility test example
import { myFunction } from '@/lib/my-utility'

describe('myFunction', () => {
  it('handles valid input', () => {
    expect(myFunction('input')).toBe('expected')
  })
})
```

---

## 10. Common Issues & Solutions

### "Column does not exist"
- Check column names in Section 5.2
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

## 11. Development Guidelines

### 11.1 Adding a New Dashboard Page

1. Create `src/app/(dashboard)/[module]/page.tsx`
2. Wrap with `<PermissionGuard permission="module.view">`
3. Add to navigation in layout
4. Use `PageHeader`, `MetricsBar`, `DataTable` patterns

### 11.2 Adding a New Database Table

1. Create migration in `supabase/migrations/`
2. Add RLS policies using `owner_id` pattern
3. Use `is_platform_admin()` for admin bypass
4. Create indexes for common queries
5. Add to audit triggers if needed

### 11.3 Adding a New Permission

1. Update `src/lib/auth/types.ts` - PERMISSIONS constant
2. Update role definitions in database
3. Update navigation filtering

### 11.4 Code Style

- **TypeScript**: Strict mode, explicit types
- **Logging**: Use structured logger (`src/lib/logger.ts`)
- **Errors**: Use API response helpers (`src/lib/api-response.ts`)
- **Constants**: Use `src/lib/constants.ts` for magic numbers
- **Formatting**: Use `src/lib/format.ts` for currency, dates

---

## 12. Workflows

### Tenant Workflow (`tenant.workflow.ts`)

1. `validate_room` - Check capacity
2. `create_tenant` - Insert tenant record
3. `create_tenant_stay` - Track stay history
4. `update_room_occupancy` - Atomic increment
5. `update_bed` - Assign bed if applicable
6. `save_documents` - Store ID documents
7. `generate_initial_bill` - Optional first bill

### Exit Workflow (`exit.workflow.ts`)

1. Initiate exit clearance
2. Calculate settlement (dues - refundable + advance)
3. Process checklist (inspection, key return)
4. Create refund record
5. Update tenant and room status

### Payment Workflow (`payment.workflow.ts`)

1. Validate payment amount (positive)
2. Verify bill belongs to tenant
3. Record payment
4. Update bill status

---

## 13. Environment Variables

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

## 14. Deployment

### Git Account Requirement (IMPORTANT)

**ALWAYS use the personal GitHub account (`cybinfo`) for this repository.**

The developer has two GitHub accounts:
- **Personal**: `cybinfo` - USE THIS for pg-manager
- **Enterprise**: `rajat-seth_sndt` - DO NOT use for this repo

Before pushing, ensure correct authentication:
```bash
# Verify you're using the cybinfo account
gh auth status

# If wrong account, switch to personal:
gh auth setup-git
```

### Quick Deploy
```bash
git add . && git commit -m "description" && git push && vercel --prod
```

### Database Migration
1. Create SQL in `supabase/migrations/`
2. Run in Supabase SQL Editor
3. Test locally before production

---

## 15. Design Principles

1. **Standardized** - Consistent patterns everywhere
2. **Modular** - Reusable, composable components
3. **Secure** - RLS, validation, audit logging
4. **Simplified** - Easy to understand and modify
5. **Customer-Centric** - Built for Indian business needs
6. **AI-Ready** - Predictive analytics and insights

---

## Contact

- **Developer**: Rajat Seth (sethrajat0711@gmail.com)
- **Repository**: https://github.com/cybinfo/pg-manager
- **Production**: https://managekar.com

---

*Last Updated: 2026-01-15*
