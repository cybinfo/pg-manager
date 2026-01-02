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
│   ├── (dashboard)/                # Owner/Staff dashboard (14 modules)
│   │   └── dashboard/
│   │       ├── properties/         # Property CRUD
│   │       ├── rooms/              # Room management
│   │       ├── tenants/            # Tenant lifecycle
│   │       ├── bills/              # Billing system
│   │       ├── payments/           # Payment tracking
│   │       ├── expenses/           # Expense tracking
│   │       ├── meter-readings/     # Utility meters
│   │       ├── staff/              # Staff + roles RBAC
│   │       ├── notices/            # Announcements
│   │       ├── complaints/         # Issue tracking
│   │       ├── visitors/           # Visitor log
│   │       ├── exit-clearance/     # Checkout process
│   │       ├── reports/            # Analytics + charts
│   │       └── settings/           # Config (owner only)
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

### 1. Supabase Join Array Pattern
Supabase returns joined tables as arrays, NOT objects. Always transform:
```typescript
// WRONG - Will fail
const propertyName = data.property.name

// CORRECT - Handle array
const propertyName = Array.isArray(data.property)
  ? data.property[0]?.name
  : data.property?.name
```

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
import { PermissionGuard, OwnerGuard } from "@/components/auth"

// For permission-based pages
export default function TenantsPage() {
  return (
    <PermissionGuard permission="tenants.view">
      {/* page content */}
    </PermissionGuard>
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
| `MetricsBar` | Compact horizontal stats bar |
| `DataTable` | Table with search, filters, row actions |
| `PageHeader` | Page title with icon and actions |
| `StatusBadge` | Pre-configured status badges |
| `Currency` | Indian Rupee formatting |
| `EmptyState` | No data/no results states |
| `Loading` | Spinners and skeletons |

### Form Components (src/components/forms/)
| Component | Purpose |
|-----------|---------|
| `AddressInput` | Full address with type selector |
| `PhotoGallery` | Multi-photo upload |
| `PhoneEntry` | Phone with WhatsApp checkbox |
| `IdDocumentEntry` | ID document with file upload |

### Auth Components (src/components/auth/)
| Component | Purpose |
|-----------|---------|
| `PermissionGate` | Conditional render by permission |
| `PermissionGuard` | Page wrapper with access denied |
| `OwnerGuard` | Owner-only page wrapper |
| `ContextSwitcher` | Header dropdown for context switch |
| `OwnerOnly/StaffOnly/TenantOnly` | Role-based visibility |

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
| Room capacity bug | Room 101 (3 beds) cannot add 3rd tenant | **Investigating** |
| Dashboard color | "Always green" - active state logic | ✅ Fixed |
| Tenant Dashboard | Property & Room not showing | ✅ Fixed |
| Mobile logout | Hidden behind bottom menu | ✅ Fixed |
| Photo uploads | Not working (Storage integration) | Migration 015 ready |

### New Features (Migrations Ready)
| Feature | Description | Migration |
|---------|-------------|-----------|
| **Storage Buckets** | Photo uploads for properties/rooms/tenants | 015 ✅ |
| **Audit Logging** | Global immutable log (who/when/what/before/after) | 016 ✅ |
| **Platform Admin** | Cross-workspace superuser access | 017 ✅ |
| **Approvals Hub** | Tenant requests (name/address change) with workflow | 017 |
| **Billing Continuity** | No gaps; ₹0 bills for zero usage; bill_id required for payments | 018 |
| **Verification Tokens** | Indian mobile (+91) & email verification with OTP | 019 |
| **Property Architecture 2D** | Visual map: properties → rooms → beds → availability | - |
| **WhatsApp Summaries** | Payment & expense summaries to owner (cron) | - |
| **Session Timeout** | Auto-logout on inactivity (configurable) | - |
| **Demo Mode** | Masked sample data; safe for demos | - |
| **Food Options** | Breakfast/Lunch/Dinner/Snacks per tenant | - |

### UX Improvements Needed
- Dropdowns: Always include search (Combobox)
- URL clarity: `/tenants` aliases, breadcrumbs, deep links
- INR (₹) symbol everywhere via `Currency` component
- Room defaults from PG type; editable in Settings → Money
- Multiple phones/emails/addresses per tenant
- ID proofs: multiple docs, front/back support

### Upcoming Migrations (015-019)
```sql
015_audit_events.sql        - Global audit logging
016_platform_admins.sql     - Superuser table + RLS
017_approvals.sql           - Tenant request workflow
018_billing_continuity.sql  - Bill chain + payment enforcement
019_verification_tokens.sql - Mobile/email verification
```

### Feature Flags to Add
```typescript
features.approvals          // Approvals hub
features.architectureView   // 2D property map
features.food               // Meal tracking
features.whatsappSummaries  // Owner summaries
settings.security.email_blocklist_enabled
settings.notifications.whatsapp_recipients
```

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

---

## Cron Jobs (Vercel)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/generate-bills` | Daily 6 AM UTC | Auto-generate monthly bills |
| `/api/cron/payment-reminders` | Daily 9 AM UTC | Email payment reminders |

Configured in `vercel.json`

---

## Changelog Summary

### January 2026 (Latest)
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
1. Create page in `src/app/(dashboard)/dashboard/[module]/`
2. Wrap with `<PermissionGuard permission="module.view">`
3. Add to navigation in `src/app/(dashboard)/layout.tsx`
4. Use `PageHeader`, `MetricsBar`, `DataTable` for consistency

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

*Last updated: 2025-01-02*
