# ManageKar - Project Context for Claude

> **CRITICAL RULES FOR CLAUDE:**
> 1. **Read this file completely** before making any changes
> 2. **Update this file** after adding features, fixing bugs, or significant changes
> 3. **Update README.md** when user-facing features change
> 4. **Write detailed git commits** explaining what and why
> 5. **Run `/compact`** after completing major tasks to save context
> 6. **Follow Master Prompt** - See `ManageKar_Claude_Master_Prompt.md` for full roadmap

---

## Design Principles (Always Follow)

All design, code, UI, and workflow must be:
- **Standardised** - Consistent patterns across codebase
- **Unified** - Single source of truth
- **Modular** - Reusable components
- **Centralised** - No scattered logic
- **Flexible** - Configurable behaviors
- **Secure** - RLS, validation, audit
- **Simplified** - Easy to understand
- **Automated** - Reduce manual work
- **Customer-Centric** - Indian business needs first

---

## Quick Reference

| Item | Value |
|------|-------|
| **Production URL** | https://managekar.com |
| **GitHub** | https://github.com/cybinfo/pg-manager |
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Hosting** | Vercel |
| **Developer** | Rajat Seth (sethrajat0711@gmail.com) |

### Essential Commands
```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build + TypeScript check
git push && vercel --prod   # Deploy to production
npx shadcn@latest add <component>   # Add UI component
```

---

## What is ManageKar?

**ManageKar** ("Manage Karo" in Hindi = "Let's Manage") is a SaaS platform for Indian small businesses, starting with **PG Manager** for Paying Guest accommodations and hostels.

### Core Value Proposition
- **Multi-property management** from single dashboard
- **Complete tenant lifecycle** - onboarding to exit clearance
- **Smart billing** with auto-generation and WhatsApp sharing
- **Staff management** with 50+ granular permissions (RBAC)
- **Public PG websites** at managekar.com/pg/your-slug

### Business Model
- 3 months free trial (full access)
- Free Forever: 1 PG, 10 rooms, 20 tenants
- Pro: ₹499/month | Business: ₹999/month

---

## Architecture Overview

### Project Structure
```
src/
├── app/
│   ├── page.tsx                    # Platform homepage
│   ├── pricing/                    # Pricing page
│   ├── products/pg-manager/        # Product page
│   ├── (auth)/                     # Login, Register
│   ├── (dashboard)/                # Owner/Staff dashboard (16 modules)
│   │   ├── dashboard/page.tsx      # Main dashboard (at /dashboard)
│   │   ├── properties/             # Property CRUD (at /properties)
│   │   ├── rooms/                  # Room management (at /rooms)
│   │   ├── tenants/                # Tenant lifecycle (at /tenants)
│   │   ├── bills/                  # Billing system (at /bills)
│   │   ├── payments/               # Payment tracking (at /payments)
│   │   ├── expenses/               # Expense tracking (at /expenses)
│   │   ├── meter-readings/         # Utility meters (at /meter-readings)
│   │   ├── staff/                  # Staff + roles RBAC (at /staff)
│   │   ├── notices/                # Announcements (at /notices)
│   │   ├── complaints/             # Issue tracking (at /complaints)
│   │   ├── visitors/               # Visitor log (at /visitors)
│   │   ├── exit-clearance/         # Checkout process (at /exit-clearance)
│   │   ├── reports/                # Analytics + charts (at /reports)
│   │   ├── architecture/           # Property 2D visual map (at /architecture)
│   │   ├── activity/               # Activity Log for all owners (at /activity)
│   │   ├── approvals/              # Tenant requests workflow (at /approvals)
│   │   ├── admin/                  # Platform Admin - workspaces only (at /admin)
│   │   └── settings/               # Config (owner only) (at /settings)
│   ├── (tenant)/                   # Tenant portal
│   ├── (setup)/                    # Initial setup wizard
│   ├── pg/[slug]/                  # Public PG websites
│   └── api/
│       ├── cron/generate-bills/    # Auto billing (daily 6AM UTC)
│       ├── cron/payment-reminders/ # Email reminders (daily 9AM UTC)
│       └── receipts/[id]/pdf/      # PDF receipt generation
├── components/
│   ├── ui/                         # shadcn + custom components
│   ├── forms/                      # Shared form components
│   └── auth/                       # Auth components (PermissionGuard, etc.)
└── lib/
    ├── supabase/                   # Supabase clients
    ├── auth/                       # Auth context + hooks
    ├── features/                   # Feature flags system
    │   ├── index.ts                # Flag definitions & utilities
    │   └── use-features.ts         # React hooks
    ├── email.ts                    # Resend email service
    └── notifications.ts            # WhatsApp templates
```

### Database Schema (Key Tables)
```
workspaces          - One per owner (auto-created)
user_profiles       - Central identity for all users
user_contexts       - Links users to workspaces (owner/staff/tenant)
owners              - PG owner accounts
properties          - Buildings with website_config JSONB
rooms               - Rooms in properties
tenants             - Tenant records with stay history
tenant_stays        - Track multiple stays per tenant
bills               - Monthly bills with line_items JSONB
payments            - Payment records linked to bills
charges             - Individual charges for tenants
charge_types        - Rent, Electricity, Water, etc.
meter_readings      - Utility meter readings
expenses            - Property expenses with categories
expense_types       - Expense categories
staff               - Staff members
roles               - Role definitions with permissions JSONB
user_roles          - Staff-to-role assignments (many-to-many)
invitations         - Pending email invitations
notices             - Announcements
complaints          - Tenant complaints
visitors            - Visitor log
exit_clearance      - Checkout process
```

---

## Critical Patterns (MUST FOLLOW)

### 1. Supabase Join Transform Pattern
Supabase returns JOIN data in varying formats (arrays or objects). **ALWAYS use the centralized utility**:

```typescript
import { transformJoin } from "@/lib/supabase/transforms"

// Transform JOIN data (handles both array and object formats)
const transformedData = data.map((item) => ({
  ...item,
  property: transformJoin(item.property),
  room: transformJoin(item.room),
  tenant: transformJoin(item.tenant),
}))
```

**Key File:** `src/lib/supabase/transforms.ts`
- `transformJoin<T>(value)` - Transform single JOIN to object or null
- `transformJoins<T>(data, fields)` - Transform multiple fields on one object
- `transformArrayJoins<T>(data, fields)` - Transform array of records

### 2. Permission Check Pattern
Always use the auth context for permission checks:
```typescript
import { useAuth, useCurrentContext } from "@/lib/auth"

function MyComponent() {
  const { hasPermission } = useAuth()
  const { isOwner, isStaff } = useCurrentContext()

  // Check specific permission
  if (hasPermission("tenants.create")) { /* ... */ }

  // Check role type
  if (isOwner) { /* full access */ }
}
```

### 3. Page Protection Pattern
All dashboard pages must be wrapped with appropriate guard:
```typescript
import { PermissionGuard, OwnerGuard, FeatureGuard } from "@/components/auth"

// For permission-based pages
export default function TenantsPage() {
  return (
    <PermissionGuard permission="tenants.view">
      {/* page content */}
    </PermissionGuard>
  )
}

// For feature-flagged pages (wrap FeatureGuard OUTSIDE PermissionGuard)
export default function ExpensesPage() {
  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        {/* page content */}
      </PermissionGuard>
    </FeatureGuard>
  )
}

// For owner-only pages (Settings)
export default function SettingsPage() {
  return (
    <OwnerGuard>
      {/* page content */}
    </OwnerGuard>
  )
}
```

### 4. Session Refresh Pattern
The auth context automatically refreshes sessions on:
- Tab visibility change (user returns to tab)
- Window focus
Uses `getUser()` (server validation) instead of `getSession()` (local only)

### 5. Clean URL Routing (Important!)
- All dashboard pages use **clean URLs** directly (e.g., `/tenants`, `/properties`)
- Files are at `src/app/(dashboard)/[module]/` NOT `src/app/(dashboard)/dashboard/[module]/`
- **No rewrites in next.config.ts** - routes are direct
- The `(dashboard)` route group provides shared layout without affecting URL
- Middleware protects all routes in `src/lib/supabase/middleware.ts`

---

## Key Features & Implementation

### 1. Unified Identity & Multi-Context System
**One login, multiple roles** - Same email can be owner at one PG, staff at another, tenant at third.

- **Workspaces**: Each owner = workspace. Staff/tenants are invited.
- **Context Switching**: Header dropdown to switch without re-login
- **Auto-Linking**: When creating staff/tenant, if email exists, auto-links immediately

**Key Files:**
- `src/lib/auth/auth-context.tsx` - AuthProvider with session management
- `src/lib/auth/types.ts` - ContextType, Permission constants
- `src/components/auth/context-switcher.tsx` - Header dropdown
- `supabase/migrations/012_unified_identity_system.sql`

### 2. Role-Based Access Control (RBAC)
**50+ granular permissions** organized by module.

**Default System Roles** (auto-created for new owners):
- Admin (full access)
- Property Manager (properties, rooms, tenants)
- Accountant (bills, payments, expenses)
- Maintenance (meter readings, complaints)
- Receptionist (visitors, complaints, notices)

**Multi-Role Support**: Staff can have multiple roles. Permissions aggregated from ALL assigned roles via `user_roles` table.

**Permission Categories:**
```
properties.view/create/edit/delete
rooms.view/create/edit/delete
tenants.view/create/edit/delete
bills.view/create/edit/delete
payments.view/create/edit/delete
expenses.view/create/edit/delete
meter_readings.view/create/edit
complaints.view/create/edit/resolve
notices.view/create/edit/delete
visitors.view/create
reports.view/export
exit_clearance.initiate/process/approve
staff.view/create/edit/delete
settings.view/edit
```

**Key Files:**
- `src/components/auth/permission-guard.tsx` - PermissionGuard, OwnerGuard
- `src/app/(dashboard)/layout.tsx` - Navigation filtering by permission
- `supabase/migrations/013_default_roles_tenant_features.sql`
- `supabase/migrations/014_fix_staff_permissions_aggregation.sql`

### 3. Invitation Email System
When creating staff/tenant:
1. System checks if email exists in `user_profiles`
2. **If exists**: Creates `user_context` immediately (auto-accepted)
3. **If not exists**: Creates invitation, sends email via Resend API

**Key Files:**
- `src/lib/email.ts` - `sendInvitationEmail()` function
- Email includes: workspace name, role, signup URL with token

### 4. Billing System
- Monthly bills with itemized line items (JSONB)
- Auto-generation via cron job (configurable day)
- Payment linking with auto-status updates
- WhatsApp bill sharing
- PDF receipts via `@react-pdf/renderer`

**Key Files:**
- `src/app/(dashboard)/dashboard/bills/`
- `src/app/api/cron/generate-bills/route.ts`
- `src/lib/pdf-receipt.tsx`

### 5. Meter Readings
- Track Electricity, Water, Gas
- Auto-fetch previous reading
- Auto-generate charges (split by occupants)
- Uses `calculation_config` JSONB on charge_types

### 6. Public PG Websites
Each property can have a public website at `managekar.com/pg/[slug]`

Configurable via property edit → Website Settings tab:
- Slug, tagline, description
- Amenities, house rules
- Contact info, Google Maps
- Display toggles

**Key Files:**
- `src/app/pg/[slug]/page.tsx`
- `supabase/migrations/005_property_website.sql`

---

## UI Component Library

### Custom Components (src/components/ui/)
| Component | Purpose |
|-----------|---------|
| `MetricsBar` | Compact horizontal stats bar with clickable items (uses router.push) |
| `DataTable` | Table with search, sorting, nested grouping, row actions |
| `PageHeader` | Page title with icon, actions, and breadcrumbs |
| `StatusBadge` | Pre-configured status badges (success, warning, error, info, muted, primary, purple) |
| `PageLoader` | Centralized page loading spinner with height variants (sm, md, lg, full) |
| `Avatar` | User avatar with auto-generated initials, size variants (xs-xl), AvatarGroup |
| `StatCard` | Stat card with icon + colored background, 9 color variants, StatItem inline variant |
| `Currency` | Indian Rupee formatting |
| `EmptyState` | No data/no results states |
| `ChartContainer` | Recharts wrapper preventing dimension warnings |
| `Combobox` | Searchable dropdown with single/multi select |
| `PhoneInput` | Indian mobile number input with validation |
| `Badge` | Status badges with variants |
| `Tabs` | Tab navigation component (shadcn/ui) |
| `EntityLink` | Centralized clickable links to entity detail pages (11 variants) |

### EntityLink Components (src/components/ui/entity-link.tsx)
Centralized, reusable link components for navigating to entity detail pages. **Always use these instead of inline Links** for consistency.

**Available Components:**
| Component | Icon | Route | Props |
|-----------|------|-------|-------|
| `PropertyLink` | Building2 | `/properties/[id]` | `id`, `name` |
| `RoomLink` | Home | `/rooms/[id]` | `id`, `roomNumber`, `showPrefix?` |
| `TenantLink` | User | `/tenants/[id]` | `id`, `name` |
| `BillLink` | FileText | `/bills/[id]` | `id`, `billNumber` |
| `PaymentLink` | CreditCard | `/payments/[id]` | `id`, `label` |
| `ExpenseLink` | Receipt | `/expenses/[id]` | `id`, `label` |
| `MeterReadingLink` | Gauge | `/meter-readings/[id]` | `id`, `label` |
| `ComplaintLink` | MessageSquare | `/complaints/[id]` | `id`, `title` |
| `VisitorLink` | UserCheck | `/visitors/[id]` | `id`, `name` |
| `NoticeLink` | Bell | `/notices/[id]` | `id`, `title` |
| `ExitClearanceLink` | LogOut | `/exit-clearance/[id]` | `id`, `label` |

**Common Props (all components):**
- `size?: "sm" | "default"` - Text size (`sm` = text-xs, `default` = text-sm)
- `showIcon?: boolean` - Show/hide icon (default: true)
- `stopPropagation?: boolean` - Prevent click bubbling for DataTable rows (default: true)
- `className?: string` - Additional CSS classes

**Usage Examples:**
```typescript
import { PropertyLink, TenantLink, RoomLink } from "@/components/ui/entity-link"

// In DataTable column render
{property && <PropertyLink id={property.id} name={property.name} size="sm" />}
{tenant && <TenantLink id={tenant.id} name={tenant.name} showIcon={false} />}
{room && <RoomLink id={room.id} roomNumber={room.room_number} showPrefix={false} />}

// In detail page sidebar
<PropertyLink id={property.id} name={property.name} />
```

**Key Features:**
- Consistent `hover:text-primary transition-colors` styling
- Built-in `stopPropagation` for use inside clickable DataTable rows
- Automatic icon + text layout with proper spacing
- Size variants match DataTable's text-xs/text-sm patterns

### Form Components (src/components/forms/)
| Component | Purpose |
|-----------|---------|
| `AddressInput` | Full address with type selector |
| `PhotoGallery` | Multi-photo upload |
| `PhoneEntry` | Phone with WhatsApp checkbox |
| `IdDocumentEntry` | ID document with front/back upload support |

### Auth Components (src/components/auth/)
| Component | Purpose |
|-----------|---------|
| `PermissionGate` | Conditional render by permission |
| `PermissionGuard` | Page wrapper with access denied |
| `OwnerGuard` | Owner-only page wrapper |
| `ContextSwitcher` | Header dropdown for context switch |
| `OwnerOnly/StaffOnly/TenantOnly` | Role-based visibility |
| `FeatureGate` | Conditional render by feature flag |
| `FeatureGuard` | Page wrapper for feature-flagged routes |
| `useFeatureCheck` | Hook to check if feature is enabled |

### DataTable Features (src/components/ui/data-table.tsx)
The DataTable component supports advanced features for consistent UX across all list pages:

**Column Sorting:**
- Click column headers to sort ascending/descending
- Supports nested properties (e.g., `property.name`)
- Visual indicators show sort direction

**Nested Grouping:**
- Multi-level hierarchical grouping with collapsible sections
- Depth-based styling (lighter backgrounds at deeper levels)
- Selection order numbers in group dropdown
- Compound keys for tracking collapsed state

```typescript
// Usage in page components
const groupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "status", label: "Status" },
]

const [selectedGroups, setSelectedGroups] = useState<string[]>([])

<DataTable
  columns={columns}
  data={filteredData}
  groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
    key,
    label: groupByOptions.find(o => o.value === key)?.label
  })) : undefined}
/>
```

**Pages with Grouping Support (Expanded January 2026):**

| Page | Group By Options |
|------|------------------|
| **tenants** | Property, Room, Status, Check-in Month, Check-in Year |
| **bills** | Property, Tenant, Status, Period, Bill Month, Year |
| **payments** | Property, Tenant, Method, Period, Month, Year, Charge Type |
| **expenses** | Category, Property, Vendor, Method, Month, Year |
| **visitors** | Property, Visiting Tenant, Relation, Purpose, Overnight, Month, Year |
| **complaints** | Property, Tenant, Room, Status, Priority, Category, Assigned To, Month, Year |
| **meter-readings** | Property, Room, Meter Type, Month, Year |
| **exit-clearance** | Property, Tenant, Room, Status, Inspection, Key Status, Exit Month, Year |
| **notices** | Property, Type, Audience, Status, Month, Year |
| **rooms** | Property, Floor, Room Type, Status, Capacity, AC, Bathroom |
| **staff** | Status, Role, Account, Joined Month, Joined Year |
| **approvals** | Type, Status, Priority, Tenant, Has Documents, Month, Year |

**Computed Fields for Grouping:**
Each page adds computed fields during data transformation for human-readable labels:
- `*_month`: "January 2026" format using `toLocaleDateString("en-US", { month: "long", year: "numeric" })`
- `*_year`: Year as string (e.g., "2026")
- `*_label`: Human-readable versions (e.g., "AC" vs "Non-AC", "Ground Floor" vs "Floor 1")

---

## Design System

### Colors
- **Primary**: Teal (#10B981) - Trust, energy
- **Accent**: Amber (#F59E0B) - Action, urgency
- **Success**: Teal/Emerald shades
- **Warning**: Amber shades
- **Error**: Rose shades

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 400 (body), 500 (labels), 600 (titles), 700 (headings)

### Visual Patterns
- Gradient headers (teal → emerald)
- Glassmorphism effects (backdrop blur)
- Rounded corners (rounded-lg, rounded-xl)
- Subtle shadows with brand color tints

### Button Variants
- `variant="gradient"` - Primary CTAs (teal → emerald)
- `variant="outline"` - Secondary actions
- `variant="ghost"` - Tertiary actions
- `size="xl"` - Large CTAs on marketing pages

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://pmedxtgysllyhpjldhho.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>

# Optional (for email)
RESEND_API_KEY=<resend_key>
```

---

## Recent Bug Fixes (Important)

### Auth Context Supabase Client Hanging (2026-01-02) ✅
**Problem**: Application stuck on loading for ALL users after refresh. Supabase client methods (`supabase.from()`, `supabase.rpc()`) were being called but not making actual HTTP requests.
**Root Cause**: Unknown issue with Supabase JS client where methods hang indefinitely
**Solution**: Converted auth context to use direct `fetch()` calls to Supabase REST API:
- `fetchProfile()` uses direct fetch to `/rest/v1/user_profiles`
- `fetchContexts()` uses direct fetch to `/rest/v1/rpc/get_user_contexts`
- Pass access token explicitly from session to fetch functions
**File**: `src/lib/auth/auth-context.tsx`

### Logout Blank Page (2026-01-02) ✅
**Problem**: Blank page appearing during logout while redirect was pending
**Root Cause**: Layout returned `null` while `router.push("/login")` was processing asynchronously
**Solution**: Show loading spinner with "Redirecting to login..." message during redirect
**File**: `src/app/(dashboard)/layout.tsx`

### Logout Stuck on Second Attempt (2026-01-02) ✅
**Problem**: First logout worked, second logout got stuck
**Root Cause**: Race condition - logout set `initialized=false` which triggered useEffect re-run before `signOut()` completed, finding still-valid session
**Solution**:
- Added `loggingOut` flag to prevent re-initialization during logout
- Reordered: call `signOut()` first, THEN clear state
- Check `loggingOut` flag before initialization
**File**: `src/lib/auth/auth-context.tsx`

### Blank Page After Sign-In (2026-01-02) ✅
**Problem**: Users seeing blank page after logging in, especially on second sign-in
**Root Cause**: Spurious `SIGNED_OUT` events from Supabase during navigation/initialization were clearing auth state
**Solution**: Complete rewrite of auth context with `explicitLogout` flag pattern:
- Added `explicitLogout` flag to global auth state
- Only process `SIGNED_OUT` events when flag is true (user explicitly called logout)
- Ignore spurious `SIGNED_OUT` events from Supabase
- Removed focus/visibility refresh handlers that caused issues
**File**: `src/lib/auth/auth-context.tsx`

### Session Timeout During Auth Init (2026-01-02) ✅
**Problem**: Session timeout dialog appearing during initial auth loading
**Solution**: Added `authReady` check to SessionTimeout component
- Only start timeout timers when `!isLoading && isAuthenticated`
**File**: `src/components/auth/session-timeout.tsx`

### Password Reset Flow (2026-01-02) ✅
**Problem**: Missing forgot-password and reset-password pages (404 errors)
**Solution**: Created forgot-password and reset-password pages
**Files**: `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`

### Chart Dimension Warnings (2026-01-02) ✅
**Problem**: Recharts ResponsiveContainer showing dimension warnings
**Solution**: Created ChartContainer wrapper that delays render until parent has dimensions
**File**: `src/components/ui/chart-container.tsx`

### Room Capacity Bug (2026-01-02) ✅
**Problem**: Room with available beds not showing in dropdown / occupancy not updating
**Root Cause**:
1. Trigger setting status to 'partial' but UI expecting 'partially_occupied'
2. Trigger not handling room_id changes (tenant moves) correctly
**Solution**:
- Migration 024: Standardized status values to 'partially_occupied'
- Improved trigger to handle both old and new room when tenant moves
- Added `sync_room_occupancy()` helper function for manual sync
- Added refresh button to tenant creation page
- UI now accepts both 'partial' and 'partially_occupied' status
**Files**: `supabase/migrations/024_standardize_room_status.sql`, `src/app/(dashboard)/dashboard/rooms/page.tsx`, `src/app/(dashboard)/dashboard/tenants/new/page.tsx`

### Login Blocked After Migrations (2026-01-02) ✅
**Problem**: Users couldn't login after running migration 017 - stuck at login page
**Root Cause**: RLS policies in migration 017 had issues:
1. `platform_admins` policy was self-referential (circular dependency)
2. Old policies weren't fully dropped (different names)
3. Complex joins in policies caused cascading RLS checks
**Solution**: Migration 018 - comprehensive RLS policy fix:
- Simplified `platform_admins` policy to only check own record
- Dropped ALL existing policies before recreating
- Added `debug_user_access()` function for diagnostics
**File**: `supabase/migrations/018_fix_rls_policies.sql`

### Dashboard MetricsBar Navigation Stuck (2026-01-03) ✅
**Problem**: Clicking Properties from Dashboard stuck on loading, but sidebar navigation works fine
**Root Cause**: MetricsBar was using `window.location.href` for navigation, triggering full page reload and auth re-initialization. Sidebar uses Next.js Link component with client-side routing.
**Solution**: Changed MetricsBar to use `useRouter().push()` for client-side navigation
**File**: `src/components/ui/metrics-bar.tsx`

### Deep Link Pages "Not Found" Error (2026-01-03) ✅
**Problem**: Clicking "View All" links from Property/Room/Tenant detail pages showed "Property/Tenant/Room not found" error
**Root Cause**: Two issues:
1. Pages used `if (!user) return` in useEffect, but `user` is initially null while auth loads, causing early return before data fetch
2. Property deep link pages queried non-existent `type` column from properties table (400 Bad Request)
**Solution**:
- Removed unnecessary `user` dependency from useEffect (data protected by RLS + dashboard layout ensures auth)
- Removed invalid `type` column from properties query
- Replaced `PageLoading` with centralized `PageLoader` component
**Files Fixed**:
- `src/app/(dashboard)/properties/[id]/rooms/page.tsx`
- `src/app/(dashboard)/properties/[id]/tenants/page.tsx`
- `src/app/(dashboard)/tenants/[id]/bills/page.tsx`
- `src/app/(dashboard)/tenants/[id]/payments/page.tsx`
- `src/app/(dashboard)/rooms/[id]/tenants/page.tsx`

### Dashboard Nav Active State (2026-01-02) ✅
**Problem**: Dashboard menu item always green/active on all pages
**Solution**: Dashboard route now uses exact match instead of startsWith
**File**: `src/app/(dashboard)/layout.tsx:176-178`

### Tenant Dashboard Display (2026-01-02) ✅
**Problem**: Property & Room not showing in tenant dashboard
**Solution**: Added Array.isArray() transform for Supabase joins
**File**: `src/app/(tenant)/tenant/page.tsx:107-116`

### Mobile Logout Accessibility (2026-01-02) ✅
**Problem**: Logout button hidden behind mobile bottom nav
**Solution**: Bottom nav fades out when sidebar is open
**File**: `src/app/(dashboard)/layout.tsx:277`

### Session Loading Issue (2025-01-02)
**Problem**: App stuck on loading after inactivity
**Solution**: Added visibility/focus handlers to refresh session
**File**: `src/lib/auth/auth-context.tsx`

### Multi-Role Permissions (2025-12-30)
**Problem**: Staff with multiple roles only got permissions from primary role
**Solution**: Migration 014 - aggregate permissions from ALL roles in `user_roles`

### Supabase Join Arrays (2025-12-30)
**Problem**: Role names not displaying, property selection broken
**Solution**: Always use `Array.isArray()` check for Supabase joins

---

## Development Backlog (Priority Order)

### Critical Bugs to Fix
| Issue | Description | Status |
|-------|-------------|--------|
| Blank page after sign-in | Spurious SIGNED_OUT events clearing auth | ✅ Fixed |
| Room capacity bug | Room 101 (3 beds) cannot add 3rd tenant | ✅ Fixed |
| Chart dimension warnings | Recharts ResponsiveContainer warnings | ✅ Fixed |
| Dashboard color | "Always green" - active state logic | ✅ Fixed |
| Tenant Dashboard | Property & Room not showing | ✅ Fixed |
| Mobile logout | Hidden behind bottom menu | ✅ Fixed |
| Photo uploads | Not working (Storage integration) | ✅ Verified working |
| Payment-bill linkage | Payments without bills allowed | ✅ Fixed (enforced) |

### Features Implemented (2026-01-02)
| Feature | Description | Status |
|---------|-------------|--------|
| Property Architecture View | Visual 2D map of properties→rooms→beds | ✅ Complete |
| Searchable Dropdowns | Combobox with search for tenant/room/property | ✅ Complete |
| Indian Mobile Validation | +91 normalization, format validation | ✅ Complete |
| Payment Workflow | Payments must reference a bill | ✅ Complete |
| Approvals Hub | Tenant requests (name/address change) with workflow | ✅ Complete |
| Email Verification | Token-based email verification with UI | ✅ Complete |
| Generate Bill Multi-select | Select multiple charge types when creating bills | ✅ Complete |
| Food & Meal Options | Settings for breakfast/lunch/dinner/snacks tracking | ✅ Complete |
| Demo Mode | Masked data, restricted actions, watermark for demos | ✅ Complete |
| Daily Summaries Cron | Daily payment/expense summaries via email + WhatsApp-ready | ✅ Complete |
| URL Aliases | Cleaner routes like /tenants instead of /dashboard/tenants | ✅ Complete |
| Breadcrumb Navigation | Breadcrumbs on all 16 dashboard pages via PageHeader | ✅ Complete |
| Platform Admin Explorer | /admin with workspace browser (Explore dialog) | ✅ Complete |
| Multiple Phones/Emails | Tenants can have multiple phones & emails with primary selection | ✅ Complete |
| Admin Workspace Stats | Per-workspace property/room/tenant counts in admin panel | ✅ Complete |
| Deep Links Navigation | Nested routes for tenant bills/payments, room tenants, property rooms/tenants | ✅ Complete |
| Room Defaults by Property Type | Different pricing defaults for PG, Hostel, Co-Living in Settings | ✅ Complete |
| ID Proof Front/Back Support | Separate front/back image uploads for ID documents | ✅ Complete |
| Feature Flags System | Enable/disable features per workspace via Settings → Features | ✅ Complete |
| Feature Flags Route Protection | FeatureGuard prevents direct URL access to disabled features | ✅ Complete |
| Activity Log Page | Workspace activity log for all owners at /activity | ✅ Complete |
| Admin Page Simplified | Platform admin shows workspaces only with Explore dialog | ✅ Complete |
| Clean URL Structure | Removed /dashboard/ prefix from all routes (e.g., /tenants not /dashboard/tenants) | ✅ Complete |
| Tenant Profile Issue Reporting | Tenants can report data issues from profile, flows to approvals | ✅ Complete |
| Expanded Issue Reporting | Report issues on bills, payments, tenancy details, room details | ✅ Complete |
| Tenant Document Management | Upload, verify, and manage tenant documents with approval workflow | ✅ Complete |
| DataTable Column Sorting | Click headers to sort by any column, supports nested properties | ✅ Complete |
| DataTable Nested Grouping | Multi-level hierarchical grouping on all 12 list pages with expanded options (Month/Year, Tenant, contextual fields) | ✅ Complete |
| Configurable Room Types | Add/edit/delete custom room types in Settings → Room Types | ✅ Complete |
| Billing Cycle Mode | Calendar Month (1st) or Check-in Anniversary billing dates | ✅ Complete |
| Utility Rates Configuration | Edit Electricity/Water/Gas rates, billing method, split options in Settings | ✅ Complete |
| Multi-Tenant Data Isolation Security Fix | Fixed charge_types/expense_types queries leaking cross-workspace data; RLS policies secured | ✅ Complete |
| Entity Linking: Meter Readings | Bi-directional navigation between meter readings, rooms, and tenants; clickable columns in data tables | ✅ Complete |
| Entity Linking: Full Application | Bi-directional navigation across ALL entities (bills, payments, expenses, complaints, visitors, exit-clearance, notices); financial sections in Property/Room detail pages | ✅ Complete |
| Unified Section Naming | Consistent section naming across all detail pages (Tenant, Room, Property): Meter Readings, Recent Bills, Recent Payments, Recent Complaints, Recent Visitors | ✅ Complete |

### Pending Features (Backlog)
| Priority | Feature | Description |
|----------|---------|-------------|
| **High** | WhatsApp Bill Sharing | Send bills directly via WhatsApp Business API |
| **High** | Mobile OTP Verification | Verify tenant phone numbers with SMS OTP (+91) |
| **High** | WhatsApp Payment Reminders | Auto-send payment reminders to tenants |
| **High** | Bill Continuity Chain | No gaps; `previous_bill_id` linking; ₹0 bills |
| **High** | Partial Payments | Support paying bills in installments |
| **Medium** | Tenant Portal Enhancement | Complaint raising from tenant portal (profile issues done) |
| **Medium** | Public PG Website Galleries | Photo galleries from uploaded photos |
| **Medium** | Parental/Emergency Contacts | Multiple emergency contacts per tenant |
| **Medium** | Superuser Payment Deletion | Allow platform admin to delete payments |
| **Low** | Document Templates | Rent agreement, NOC templates |
| **Low** | Bulk Operations | Bulk bill generation, bulk SMS |
| **Low** | Multi-language Support | Hindi, regional languages |
| **Low** | Payment Gateway | Razorpay/Paytm integration |

### Feature Flags System ✅ Implemented
Feature flags are now available in `src/lib/features/`:
```typescript
// Available flags (15 total)
features.approvals          // Approvals hub
features.architectureView   // 2D property map
features.food               // Meal tracking
features.whatsappSummaries  // Owner summaries
features.meterReadings      // Utility meter tracking
features.publicWebsite      // Public PG website
features.exitClearance      // Checkout process
features.visitors           // Visitor log
features.notices            // Announcements
features.complaints         // Issue tracking
features.expenses           // Expense tracking
features.reports            // Analytics
features.autoBilling        // Auto bill generation
features.emailReminders     // Payment reminders
features.demoMode           // Demo mode
features.activityLog        // Activity Log for workspace

// Usage in components (inline conditional render)
import { FeatureGate, useFeatureCheck } from "@/components/auth"

<FeatureGate feature="food">
  <FoodSettings />
</FeatureGate>

// Route protection (page-level guard)
import { FeatureGuard } from "@/components/auth"

<FeatureGuard feature="expenses">
  <PermissionGuard permission="expenses.view">
    {/* page content */}
  </PermissionGuard>
</FeatureGuard>

// Or programmatically
const { isEnabled } = useFeatures()
if (isEnabled("food")) { ... }
```
Managed via Settings → Features tab. Stored in `owner_config.feature_flags` JSONB.

**Route Protection**: 10 feature-flagged pages are protected with FeatureGuard:
- expenses, meter-readings, visitors, complaints, reports
- architecture, approvals, exit-clearance, notices, activity

When a feature is disabled, users see a "Feature Disabled" page instead of the content.

---

## Database Migrations

Run in order in Supabase SQL editor:
```
001_initial_schema.sql      - Core tables
002_visitors.sql            - Visitor log
003_exit_clearance.sql      - Checkout process
004_staff_permissions.sql   - Staff roles
005_property_website.sql    - Public PG sites
006_billing_system.sql      - Bills + payments
007_tenant_history.sql      - Stay tracking
008_auto_billing.sql        - Cron settings
009_expense_tracking.sql    - Expenses
010-011                     - Various fixes
012_unified_identity.sql    - Multi-context auth
013_default_roles.sql       - System roles + tenant features
014_fix_permissions.sql     - Multi-role aggregation
015_storage_buckets.sql     - Supabase Storage for photos/docs
016_audit_logging.sql       - Global immutable audit trail
017_platform_admins.sql     - Superuser/Global Admin system
018_fix_rls_policies.sql    - Fix RLS policies blocking login
019-023                      - Various RLS and trigger fixes
024_standardize_room_status.sql - Room occupancy trigger fix
025_enforce_payment_bill_linkage.sql - Payment must reference bill
026_approvals_hub.sql         - Tenant request workflow
027_verification_tokens.sql   - Email/phone verification tokens
028_food_options.sql          - Food/meal tracking for tenants
029_fix_platform_admins.sql   - Platform admin seeding fix
030_fix_user_creation.sql     - User creation trigger fixes
031_admin_functions.sql       - Enhanced admin functions with stats
032_workspace_details_admin.sql - get_workspace_details_admin() for admin Explore
033_tenant_documents.sql       - Tenant document uploads + expanded approval types
034_platform_admin_join_fix.sql - Platform admin JOIN fixes
035_configurable_room_types.sql - room_types JSONB + billing_cycle_mode columns
036_fix_charge_expense_rls.sql  - SECURITY: Fix RLS policies for charge_types/expense_types
```

### Storage Buckets (Migration 015)
Creates 4 storage buckets with RLS policies:
- `property-photos` - Property images (public)
- `room-photos` - Room images (public)
- `tenant-photos` - Tenant profile photos
- `tenant-documents` - ID documents (10MB limit)

### Audit Logging (Migration 016)
- `audit_events` table - immutable log of all actions
- Automatic triggers on: tenants, bills, payments, staff, roles, properties, rooms, exit_clearance
- Helper function `log_audit_event()` for programmatic logging
- `audit_events_view` for easy querying with actor info

### Platform Admin (Migration 017)
- `platform_admins` table - users with global access
- `is_platform_admin()` function for RLS checks
- Superuser bypass on all key tables
- Initial admins: newgreenhigh@gmail.com, sethrajat0711@gmail.com

### RLS Policy Fix (Migration 018)
- Fixes login issues caused by migration 017
- Drops ALL existing policies before recreating
- Simplified platform_admins policy (no self-reference)
- Added `debug_user_access()` diagnostic function
- Re-seeds platform admins

### Data Isolation Security Fix (Migration 036)
**CRITICAL SECURITY FIX** - Previous RLS policies on `charge_types` and `expense_types` used `USING(true)` allowing ANY authenticated user to read ALL data across workspaces.

**Vulnerability**: Migration 020 created insecure policies:
```sql
CREATE POLICY "charge_types_read" ON charge_types FOR SELECT USING (true);  -- INSECURE!
CREATE POLICY "expense_types_read" ON expense_types FOR SELECT USING (true);  -- INSECURE!
```

**Fix Applied** (Migration 036):
- Application-level: Added `.eq("owner_id", user.id)` filters to all charge_types/expense_types queries
- Database-level: New RLS policies properly scope by owner_id, allow staff access via workspace, platform admin bypass

**Files Fixed**:
- `src/app/(dashboard)/settings/page.tsx` - charge_types and expense_types queries
- `src/app/(dashboard)/expenses/page.tsx` - expense_types query
- `src/app/(dashboard)/expenses/new/page.tsx` - expense_types queries (2 locations)
- `src/app/(dashboard)/expenses/[id]/edit/page.tsx` - expense_types query
- `supabase/migrations/036_fix_charge_expense_rls.sql` - Proper RLS policies

---

## Cron Jobs (Vercel)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/generate-bills` | Daily 6 AM UTC | Auto-generate monthly bills |
| `/api/cron/daily-summaries` | Daily 8 AM UTC | Daily payment/expense summaries to owners |
| `/api/cron/payment-reminders` | Daily 9 AM UTC | Email payment reminders |

Configured in `vercel.json`

---

## Changelog Summary

### January 2026 (Latest)
- **Expanded Group By Options** - Significantly expanded grouping options across all 12 list pages for better data organization: added Month/Year grouping to all pages, Tenant grouping where relevant, plus contextual options like Vendor (expenses), Relation/Purpose (visitors), Inspection/Key Status (exit-clearance), AC/Bathroom/Capacity (rooms), Role/Account Status (staff). Uses computed fields for human-readable labels (e.g., "January 2026", "Ground Floor", "AC", "Has Login")
- **Centralized EntityLink Components** - Created 11 reusable entity link components in `src/components/ui/entity-link.tsx` (PropertyLink, RoomLink, TenantLink, BillLink, PaymentLink, ExpenseLink, MeterReadingLink, ComplaintLink, VisitorLink, NoticeLink, ExitClearanceLink); all list pages refactored to use centralized components; single source of truth for entity navigation styling
- **Unified Section Naming** - Consistent section naming across all detail pages for reduced user confusion:
  - **Tenant Detail Page**: Added "Meter Readings" section (shows room's meter readings with View All + Record buttons), "Recent Bills" section (inline preview of 5 recent bills with clickable items)
  - **Property Detail Page**: Added "Recent Complaints" section (issues reported by tenants), "Recent Visitors" section (visitor log for property)
  - **Room Detail Page**: Added "Recent Complaints" section (issues reported for this room)
  - All sections use unified naming: "Meter Readings", "Recent Bills", "Recent Payments", "Recent Complaints", "Recent Visitors", "Recent Expenses"
- **Entity Linking: Full Application** - Comprehensive bi-directional navigation across ALL entities:
  - **List Pages with Clickable Links**: Bills (Tenant→Property), Payments (Tenant→Property), Expenses (Property), Complaints (Tenant→Property→Room), Visitors (Tenant→Property), Exit Clearance (Tenant→Property→Room), Notices (Property)
  - **Property Detail Page**: Added Recent Bills, Recent Payments, Recent Expenses sections with clickable items and "View All" links
  - **Room Detail Page**: Added Recent Bills, Recent Payments sections for tenants in that room
  - All entity links use `stopPropagation()` for nested clickable areas within data table rows
- **Entity Linking: Meter Readings** - Full bi-directional navigation between meter readings, rooms, and tenants. From meter readings list, click Room or Property to navigate directly. From Room detail page, see recent meter readings with "View All" deep link to `/rooms/[id]/meter-readings`. From Tenant detail page, access "Meter Readings" button in Room Details section to view room's meter data.
- **SECURITY: Multi-Tenant Data Isolation Fix** - Critical fix for RLS policies that allowed cross-workspace data leakage; charge_types and expense_types now properly scoped by owner_id with staff workspace access
- **Migration 036** - Fixed `USING(true)` RLS policies on charge_types/expense_types; added proper owner-scoped policies with platform admin bypass
- **Utility Rates Configuration** - New Settings → Billing → Utility Rates section to edit Electricity/Water/Gas rates; choose per-unit vs flat rate billing; set rate per kWh/L/m³; choose split method (per occupant vs per room)
- **Configurable Room Types** - Add/edit/delete custom room types in Settings → Room Types; room creation/edit uses dynamic types from owner_config
- **Billing Cycle Mode** - Choose between Calendar Month (1st of month) or Check-in Anniversary (based on tenant check-in date) in Settings → Billing
- **Migration 035** - Added room_types JSONB and billing_cycle_mode columns to owner_config
- **Supabase JOIN Transform Utility** - Centralized `transformJoin()` function in `src/lib/supabase/transforms.ts` that handles both array and object formats from Supabase JOINs; refactored 14 files for consistency
- **DataTable Nested Grouping** - Multi-level hierarchical grouping on all 12 list pages (tenants, bills, payments, expenses, visitors, complaints, meter-readings, exit-clearance, notices, rooms, staff, approvals)
- **DataTable Column Sorting** - Click-to-sort on all columns with visual indicators, supports nested properties
- **UI Component Centralization** - Created PageLoader, Avatar, StatCard components; refactored 52 files replacing 155+ patterns
- **Tenant Document Management** - Tenants can upload documents for verification, link them to issue reports; once approved, cannot be deleted
- **Expanded Issue Reporting** - Report issues on bills, payments, tenancy details, room details (bill_dispute, payment_dispute, tenancy_issue, room_issue)
- **Migration 033** - Added tenant_documents table, expanded approval types, document_ids on approvals
- **Tenant Profile Issue Reporting** - Tenants can report data issues directly from profile with flag icons, flows to Approvals Hub
- **Clean URL Structure** - Removed /dashboard/ prefix from all routes (e.g., /tenants instead of /dashboard/tenants)
- **Activity Log Page** - New /activity page for all workspace owners to view audit events
- **Admin Page Simplified** - Platform admin now shows only workspaces list with Explore dialog for details
- **Migration 032** - Added get_workspace_details_admin() RPC function for admin Explore
- **Feature Flags Route Protection** - FeatureGuard component prevents direct URL access to disabled features (10 pages protected)
- **Deep Links Navigation** - Nested routes: /tenants/[id]/bills, /tenants/[id]/payments, /rooms/[id]/tenants, /rooms/[id]/meter-readings, /properties/[id]/rooms, /properties/[id]/tenants
- **Room Defaults by Property Type** - Settings → Room Pricing now supports PG, Hostel, Co-Living with different pricing defaults
- **ID Proof Front/Back** - IdDocumentEntry now supports front_url and back_url for documents with two sides
- **Feature Flags System** - 15 configurable features via Settings → Features tab with FeatureGate component
- **Breadcrumb navigation** - All 16 dashboard pages now have breadcrumbs via PageHeader
- **Platform Admin Explorer** - New /admin page for superusers with workspace browser
- **Admin navigation** - Admin link shows in sidebar for platform admins only
- **Tabs component** - Added shadcn/ui Tabs component
- **Dashboard nav fix** - Dashboard item no longer always green/active
- **Tenant dashboard fix** - Property/Room now displays correctly (Array.isArray fix)
- **Mobile logout fix** - Bottom nav hides when sidebar opens for logout access
- **Storage migration** - 015_storage_buckets.sql for photo uploads
- **Audit logging** - 016_audit_logging.sql with immutable event trail
- **Platform admin** - 017_platform_admins.sql for superuser access

### January 2025
- **Session refresh fix** - Auto-refresh on tab focus/visibility

### December 2025
- **RBAC System** - 50+ permissions, 5 default roles, multi-role support
- **Permission Guards** - Page-level access control
- **Invitation Emails** - Automated staff/tenant onboarding
- **Session Management** - Multi-context switching
- **UI Library** - Centralized components (MetricsBar, DataTable, etc.)
- **Form Components** - Shared form fields
- **Platform Rebrand** - ManageKar with teal/emerald theme

### Earlier Features
- Billing system with auto-generation
- Meter readings with charge generation
- Expense tracking
- Public PG websites
- PDF receipts
- WhatsApp notifications
- Email reminders
- Reports with Recharts
- Tenant re-joining detection

---

## For Next Claude Session

### Starting a New Session
1. Read this CLAUDE.md completely
2. Check `ManageKar_Claude_Master_Prompt.md` for full roadmap
3. Review the Development Backlog section above
4. Ask user which items to prioritize

### If User Reports Loading Issue
Check `src/lib/auth/auth-context.tsx` - session refresh handlers should handle this now.

### If Adding New Dashboard Page
1. Create page in `src/app/(dashboard)/[module]/` (NOT in dashboard/ subfolder - URLs are now clean)
2. URL will be `/[module]` (e.g., `/tenants`, `/payments`, NOT `/dashboard/tenants`)
3. Wrap with `<PermissionGuard permission="module.view">`
4. If feature-flagged, also wrap with `<FeatureGuard feature="featureName">` (outside PermissionGuard)
5. Add to navigation in `src/app/(dashboard)/layout.tsx` with `feature` property if applicable
6. Use `PageHeader` with `breadcrumbs` prop, `MetricsBar`, `DataTable` for consistency
7. Example breadcrumbs: `breadcrumbs={[{ label: "Module Name" }]}`

### If Modifying Permissions
1. Update `src/lib/auth/types.ts` - PERMISSIONS constant
2. Update role definitions in Supabase
3. Update navigation filtering in layout.tsx

### If Adding Staff/Tenant Features
Remember to check email existence and auto-link or create invitation.

### If Implementing Backlog Items
Follow the Output Contract from Master Prompt:
1. **Planning Mode** - Structured plan with options
2. **Implementation Diff** - File-by-file changes
3. **Security & RLS Matrix** - Permission predicates
4. **QA Checklist** - Test scenarios
5. **Release Artifacts** - Changelog, migrations

### Key Contacts
- **Developer/Owner**: Rajat Seth (sethrajat0711@gmail.com)
- **Client Owner**: newgreenhigh@gmail.com

---

*Last updated: 2026-01-04 (Expanded group by options across all 12 list pages)*
