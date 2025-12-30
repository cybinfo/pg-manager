# PG Manager - Project Context

> **IMPORTANT FOR CLAUDE - FOLLOW THESE RULES:**
> 1. **Update CLAUDE.md** - When new features are added, bugs are fixed, or significant changes are made, UPDATE this file. Add features to "Key Features" section and log changes in "Changelog" section.
> 2. **Update README.md** - Keep README.md updated with user-facing documentation when features change.
> 3. **Detailed Git Commits** - When committing code, write detailed commit messages explaining what was changed and why.
> 4. **Run /compact** - After completing a feature or significant task, run `/compact` to save session context.
> 5. **Keep this file as the single source of truth** for project context.

## Overview
PG Manager is a SaaS application for managing Paying Guest (PG) accommodations and hostels in India. It helps property owners manage tenants, rooms, payments, meter readings, and more.

## Live URLs
- **Production:** https://managekar.com (custom domain)
- **Vercel:** https://pg-manager-phi.vercel.app
- **GitHub:** https://github.com/cybinfo/pg-manager

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with RLS policies
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel
- **PWA:** Service worker for offline support

## Project Structure
```
src/
├── app/
│   ├── page.tsx          # Platform homepage (ManageKar)
│   ├── pricing/          # Freemium pricing page
│   ├── products/
│   │   └── pg-manager/   # PG Manager product page
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Owner dashboard pages
│   │   └── dashboard/
│   │       ├── properties/
│   │       ├── rooms/
│   │       ├── tenants/
│   │       ├── bills/           # Billing system
│   │       ├── payments/
│   │       ├── expenses/        # Expense tracking
│   │       ├── meter-readings/  # With auto-charge generation
│   │       ├── staff/
│   │       ├── notices/
│   │       ├── complaints/
│   │       ├── visitors/
│   │       ├── exit-clearance/
│   │       ├── reports/
│   │       └── settings/
│   ├── (tenant)/         # Tenant portal pages
│   ├── (setup)/          # Initial setup wizard
│   ├── pg/[slug]/        # Public PG websites
│   ├── contact/          # Contact page
│   └── help/             # FAQ/Help page
├── components/
│   ├── ui/               # shadcn/ui components (button, card, input, label, checkbox, dropdown-menu)
│   ├── forms/            # Shared form components (AddressInput, PhotoGallery, etc.)
│   ├── auth/             # Auth components (ContextPicker, ContextSwitcher, PermissionGate)
│   └── pwa-install-prompt.tsx
└── lib/
    ├── supabase/         # Supabase client (client.ts, server.ts, middleware.ts)
    ├── auth/             # Auth library (AuthProvider, types, AI detection, analytics)
    └── utils.ts
```

## Database Schema (Supabase)
Key tables (see `supabase/migrations/` for full schema):
- **owners** - PG/hostel owners (users)
- **properties** - Buildings/properties
- **rooms** - Individual rooms in properties
- **tenants** - Tenant records with status (active, inactive, moved_out)
- **charge_types** - Types of charges (Rent, Electricity, Water, etc.)
- **charges** - Charges generated for tenants
- **payments** - Payment records
- **meter_readings** - Electricity/Water/Gas meter readings
- **notices** - Announcements to tenants
- **complaints** - Tenant complaints
- **visitors** - Visitor log
- **exit_clearance** - Tenant checkout process
- **staff** - Staff members
- **staff_roles** - Role definitions with permissions

## Brand Identity

### Brand Name: ManageKar
"Kar" means "do/karo" in Hindi - "ManageKar" = "Manage Karo" (Do Manage / Start Managing)

### Platform Vision
ManageKar is a platform for multiple management products targeting Indian businesses:
- **PG Manager** (Current) - PG & hostel management
- Future products: Shop Manager, Rent Manager, Society Manager, etc.

### Color Palette
- **Primary:** Teal (#10B981) - Trust, energy, modern
- **Accent:** Amber (#F59E0B) - Action, urgency
- **Success:** Teal shades for positive states
- **Warning:** Amber shades for pending/due items
- **Error:** Rose shades for critical states

### Typography
- **Font Family:** Inter (Google Fonts)
- **Weights:** 400 (body), 500 (labels), 600 (titles), 700 (headings)

### Visual Elements
- Gradient headers on sidebars (teal to emerald)
- White logo on gradient backgrounds
- Soft colored backgrounds for stat cards (teal-50, emerald-50, violet-50, amber-50)
- Modern rounded corners (rounded-lg, rounded-xl)

## Key Features

### Unified Identity & Multi-Context System
- **Single Login, Multiple Roles**: One email can be owner at one PG, staff at another, tenant at a third
- **Context Switching**: Header dropdown to switch between workspaces without re-login
- **Workspaces**: Each PG owner account becomes a "workspace" - staff and tenants are invited to workspaces
- **Invitation System**: Invite staff/tenants via email/phone - they auto-link on signup
- **Role-Based Permissions**: Staff have role-specific permissions (manage_tenants, manage_payments, etc.)
- **Permission Gates**: `<PermissionGate>`, `<OwnerOnly>`, `<StaffOnly>`, `<TenantOnly>` components
- **AI Identity Detection**: Detect duplicate accounts, suggest account linking
- **Context Analytics**: Track context switches, permission usage, staff productivity
- **Database Tables**: `workspaces`, `user_profiles`, `user_contexts`, `invitations`, `context_switches`, `permission_audit_log`
- **Files**:
  - `src/lib/auth/` - AuthProvider, types, AI detection, analytics
  - `src/components/auth/` - ContextPicker, ContextSwitcher, PermissionGate, InvitationForm
  - `supabase/migrations/012_unified_identity_system.sql`

### Tenant Re-joining & Room Switching
- Automatic detection of returning tenants by phone number
- Pre-fill previous tenant data when re-joining
- Track multiple stays/tenures for same person
- Room transfer with rent adjustment and history
- Complete stay history timeline on tenant detail page
- Files: `src/app/(dashboard)/dashboard/tenants/`

### Billing System
- Generate monthly bills for tenants with itemized charges
- Line items for rent, electricity, water, and custom charges
- Support for discounts, late fees, and previous balance carry-over
- Link payments to specific bills for accurate tracking
- Auto-update bill status (pending/partial/paid/overdue) via database triggers
- Share bills via WhatsApp with formatted message
- Files: `src/app/(dashboard)/dashboard/bills/`

### Automated Monthly Bill Generation
- Cron job generates bills automatically on configured day each month
- Configurable: billing day, due date offset, include pending charges
- Includes monthly rent + pending electricity/water/custom charges
- Carries over previous balance from unpaid bills
- Settings UI in Dashboard → Settings → Billing tab
- Vercel Cron runs at 6 AM UTC (11:30 AM IST) daily
- Files: `src/app/api/cron/generate-bills/route.ts`

### Meter Readings with Auto-Charge Generation
- Record meter readings (Electricity, Water, Gas)
- Auto-fetch previous reading to calculate units consumed
- Auto-generate charges for active tenants in the room
- Supports splitting charges among room occupants
- "Generate Charges" button for existing readings without charges
- Files: `src/app/(dashboard)/dashboard/meter-readings/`

### Charge Types Configuration
Charge types use `calculation_config` JSONB field:
```json
{
  "rate_per_unit": 8,
  "split_by": "occupants"
}
```

### Supabase Join Pattern
Supabase joins return arrays, not single objects. Transform like this:
```typescript
const transformed = data.map((item) => ({
  ...item,
  property: Array.isArray(item.property) ? item.property[0] : item.property,
}))
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://pmedxtgysllyhpjldhho.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

## Development Commands
```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build (also checks TypeScript)
npm run lint     # Run ESLint
```

## Deployment
```bash
git add -A
git commit -m "Description"
git push
vercel --prod
```

## Important Notes

1. **Schema Alignment:** Always check actual database schema in `supabase/migrations/001_initial_schema.sql` before making changes. Some fields differ from typical naming:
   - `charge_type_id` (not `meter_type`)
   - `previous_reading` (not `previous_value`)
   - `calculation_config` JSONB (not `unit` column)

2. **RLS Policies:** All tables have Row Level Security. Users can only access their own data via `owner_id`.

3. **UI Components:** Only basic shadcn/ui components are installed (button, card, input, label). Add more with:
   ```bash
   npx shadcn@latest add <component>
   ```

4. **Mobile-First:** All pages are responsive, designed mobile-first for PG owners on the go.

## Owner Info
- **Developer:** Rajat Seth
- **Email:** sethrajat0711@gmail.com
- **GitHub:** cybinfo

---

## Changelog

### 2025-12-30 - Unified Identity & Multi-Context System
- **Problem Solved**: Comprehensive system for handling multi-role users (same person as owner, staff, tenant across different PGs)
- **Core Architecture**:
  - **Workspaces**: Each PG owner account is a workspace that staff and tenants are invited to
  - **User Contexts**: Links users to workspaces with specific roles (owner, staff, tenant)
  - **Single Authentication**: One login, multiple contexts - no re-authentication needed to switch
- **Database Migration** (`supabase/migrations/012_unified_identity_system.sql`):
  - `workspaces` - One per PG owner (auto-created on owner signup)
  - `user_profiles` - Central identity for all users
  - `user_contexts` - Links users to workspaces with roles and permissions
  - `invitations` - Pending invitations with tokens
  - `context_switches` - Audit log of context changes
  - `permission_audit_log` - Track permission checks and denials
  - Helper functions: `get_user_contexts()`, `switch_context()`, `accept_invitation()`, `has_permission()`
- **Auth Library** (`src/lib/auth/`):
  - `types.ts` - ContextType, ContextWithDetails, PERMISSIONS constants, TENANT_PERMISSIONS
  - `auth-context.tsx` - AuthProvider with user, profile, contexts state; switchContext, hasPermission methods
  - `ai-detection.ts` - detectIdentityConflicts, checkContextAnomalies, getSuggestionsForIdentity
  - `analytics.ts` - getContextMetrics, getPermissionUsage, getUserSwitchPatterns, getStaffProductivity
  - `index.ts` - Central exports
- **Auth Components** (`src/components/auth/`):
  - `context-picker.tsx` - Full-page context selection after login (for multi-context users)
  - `context-switcher.tsx` - Header dropdown for switching contexts
  - `permission-gate.tsx` - PermissionGate, RoleGate, OwnerOnly, StaffOnly, TenantOnly components
  - `invitation-components.tsx` - InvitationForm, InvitationList, AcceptInvitation
  - `index.ts` - Central exports
- **Updated Files**:
  - `src/app/(auth)/login/page.tsx` - Context picker flow after login
  - `src/app/(dashboard)/layout.tsx` - AuthProvider wrapper, ContextSwitcher in header
- **UI Components Added**: Installed shadcn/ui `checkbox` and `dropdown-menu`
- **Design Principles Applied**: Standardization, Unified, Modularization, Centralization, Flexibility, AI, BI, Customer Centric

### 2025-12-30 - Shared Form Components & UI Centralization
- **Problem Solved**: Eliminated duplicate form code across new/edit pages by creating shared form components
- **New Directory**: `/src/components/forms/` - Centralized form components
- **Components Created**:
  - **AddressInput** (`AddressInput.tsx`) - Full address input with type selector, line1/line2, city/state/pincode, primary toggle
  - **PropertyAddressInput** - Simplified variant for property forms
  - **PhotoGallery** (`PhotoGallery.tsx`) - Multi-photo upload with thumbnails, delete buttons, max limit
  - **CoverImageUpload** - Single cover image upload with preview
  - **PhoneEntry** (`PhoneEntry.tsx`) - Phone input with WhatsApp checkbox, primary radio
  - **EmailEntry** (`EmailEntry.tsx`) - Email input with primary radio
  - **GuardianEntry** (`GuardianEntry.tsx`) - Guardian/emergency contact with relation dropdown
  - **IdDocumentEntry** (`IdDocumentEntry.tsx`) - ID document type/number with file uploads
  - **MultiEntryList** (`MultiEntryList.tsx`) - Generic wrapper for add/remove multiple entries
  - **index.ts** - Central exports with types and default values
- **Exported Types**: `PhoneData`, `EmailData`, `AddressData`, `GuardianData`, `IdDocumentData`
- **Exported Constants**: `ADDRESS_TYPES`, `RELATION_TYPES`, `ID_DOCUMENT_TYPES`, `DEFAULT_PHONE`, `DEFAULT_EMAIL`, `DEFAULT_GUARDIAN`, `DEFAULT_ID_DOCUMENT`
- **Pages Updated**:
  - `properties/new` & `properties/[id]/edit` - Using `PropertyAddressInput`, `CoverImageUpload`, `PhotoGallery`
  - `rooms/new` & `rooms/[id]/edit` - Using `PhotoGallery`
  - `tenants/new` & `tenants/[id]/edit` - Using shared types + `IdDocumentEntry`
- **Code Reduction**: ~360 lines of duplicate code removed across 6 files
- **Benefits**:
  - Single source of truth for form field styling (`p-3 border rounded-lg bg-muted/30`)
  - Consistent dropdown options across pages
  - Type safety with exported interfaces
  - Easy to update all forms from one location
- **Files Created**:
  - `/src/components/forms/AddressInput.tsx`
  - `/src/components/forms/PhotoGallery.tsx`
  - `/src/components/forms/PhoneEntry.tsx`
  - `/src/components/forms/EmailEntry.tsx`
  - `/src/components/forms/GuardianEntry.tsx`
  - `/src/components/forms/IdDocumentEntry.tsx`
  - `/src/components/forms/MultiEntryList.tsx`
  - `/src/components/forms/index.ts`

### 2025-12-29 - Centralized UI Component Library & Detail Page Redesign
- **Problem Solved**: Created comprehensive reusable component library for consistent UI across application
- **New Components Created**:
  - **StatusBadge** (`/src/components/ui/status-badge.tsx`) - Pre-configured status badges for tenant, payment, complaint statuses with icons, colors, and variants (success/warning/error/info/muted)
  - **FormComponents** (`/src/components/ui/form-components.tsx`) - FormField wrapper, styled Select, CurrencyInput, PhoneInput, EmailInput, DateInput, SearchInput, Textarea with character count, FormSection divider, ToggleSwitch
  - **DetailComponents** (`/src/components/ui/detail-components.tsx`) - DetailHero (page header with avatar/status), InfoCard (stat cards), DetailSection (content sections), InfoRow (key-value rows), ActionMenu dropdown, QuickActions bar
  - **EmptyState** (`/src/components/ui/empty-state.tsx`) - Standardized empty states with variants (default/search/error/minimal), NoResultsState, NoDataState, ErrorState
  - **Loading** (`/src/components/ui/loading.tsx`) - Spinner, PageLoading, Skeleton variants (SkeletonText, SkeletonCard, SkeletonTable, SkeletonMetricsBar, SkeletonPageHeader, PageSkeleton)
  - **Currency** (`/src/components/ui/currency.tsx`) - Currency formatter, AmountDisplay, AmountWithTrend, DuesSummary progress bar, PaymentAmount with status colors
  - **Index** (`/src/components/ui/index.ts`) - Central export file for all UI components
- **Tenant Detail Page Redesigned**:
  - DetailHero with gradient avatar, status badge, quick actions
  - InfoCard grid for quick stats (rent, deposit, dues, check-in)
  - DetailSection components for organized content
  - InfoRow for consistent key-value display
  - Currency components for all money values
  - PageLoading for loading state
  - FormField and Select for modal forms
  - Animations: fade-in, scale-in for modals
- **Design System Benefits**:
  - Import from `@/components/ui` for all UI needs
  - Consistent colors using design tokens (emerald, amber, rose, teal)
  - Pre-configured status mappings (active, pending, paid, overdue, etc.)
  - TypeScript support with proper interfaces
  - Reusable across all pages
- **Files Created**:
  - `/src/components/ui/status-badge.tsx`
  - `/src/components/ui/form-components.tsx`
  - `/src/components/ui/detail-components.tsx`
  - `/src/components/ui/empty-state.tsx`
  - `/src/components/ui/loading.tsx`
  - `/src/components/ui/currency.tsx`
  - `/src/components/ui/index.ts`
- **Files Modified**:
  - `/src/app/(dashboard)/dashboard/tenants/[id]/page.tsx` - Complete redesign with new components

### 2025-12-29 - Complete UI Unification (All Dashboard Pages)
- **Problem Solved**: Unified UI across ALL dashboard pages for consistent design
- **Pages Updated with MetricsBar + DataTable + PageHeader**:
  - **Meter Readings**: Added PageHeader with Gauge icon, MetricsBar (This Month, Electricity, Water, Total kWh), DataTable with meter type icons, consumption indicators, property/room filters
  - **Visitors**: Added PageHeader, MetricsBar (Currently Here, Today, Overnight, This Month), DataTable with check-in/check-out status, "Check Out" action button
  - **Notices**: Added PageHeader, MetricsBar (Total, Active, Emergency, Expiring Soon), DataTable with type badges, action menu (Edit, Activate/Deactivate, Delete)
  - **Complaints**: Added PageHeader, MetricsBar (Open, In Progress, Resolved, Urgent), DataTable with priority badges, status dots, category labels
  - **Staff**: Added PageHeader, MetricsBar (Total Staff, Active, Inactive, Custom Roles), DataTable with role badges, Activate/Deactivate buttons
  - **Reports**: Added PageHeader with BarChart3 icon (kept existing charts and KPIs)
  - **Settings**: Added PageHeader with Cog icon (kept existing tabbed interface)
- **Design Consistency Achieved**:
  - All 14 main dashboard pages now use unified components
  - Consistent PageHeader with gradient icon across all pages
  - MetricsBar replaces stat card grids
  - DataTable replaces card lists with search, filters, and row actions
  - Consistent button variants (gradient for primary, outline for secondary)
- **Files Modified**:
  - `/src/app/(dashboard)/dashboard/meter-readings/page.tsx`
  - `/src/app/(dashboard)/dashboard/visitors/page.tsx`
  - `/src/app/(dashboard)/dashboard/notices/page.tsx`
  - `/src/app/(dashboard)/dashboard/complaints/page.tsx`
  - `/src/app/(dashboard)/dashboard/staff/page.tsx`
  - `/src/app/(dashboard)/dashboard/reports/page.tsx`
  - `/src/app/(dashboard)/dashboard/settings/page.tsx`

### 2025-12-28 - Dashboard UI Cleanup (Box Overload Fix)
- **Problem Solved**: Removed excessive card/box usage causing visual clutter
- **New Reusable Components Created**:
  - `MetricsBar` (`/src/components/ui/metrics-bar.tsx`) - Compact horizontal stats bar replacing multiple stat cards
  - `DataTable` (`/src/components/ui/data-table.tsx`) - Clean table with search, status dots, row hover, mobile responsive
  - `PageHeader` (`/src/components/ui/page-header.tsx`) - Consistent page headers with icon, description, actions
  - `SectionDivider` (`/src/components/ui/section-divider.tsx`) - For form sections with labels and divider lines
- **Pages Redesigned**:
  - Dashboard Home: 4 stat cards → 1 MetricsBar, simplified getting started, inline quick actions
  - Tenants: Card grid → MetricsBar + DataTable with avatar, status dots
  - Payments: Card list + stat cards → MetricsBar + DataTable with WhatsApp action
  - Bills: Card list + stat cards → MetricsBar + DataTable with status indicators
  - Expenses: Card list + stat cards → MetricsBar + DataTable with trend indicators
  - Properties: Card grid → MetricsBar + DataTable
  - Rooms: Card grid → MetricsBar + DataTable with occupancy stats
- **Design Improvements**:
  - ~70% fewer visible boxes/cards
  - Clean table rows with hover states
  - Unified PageHeader across all list pages
  - Consistent gradient buttons (variant="gradient")
  - Maintained teal/emerald color scheme and animations
- **Files Modified**:
  - `/src/app/(dashboard)/dashboard/page.tsx`
  - `/src/app/(dashboard)/dashboard/tenants/page.tsx`
  - `/src/app/(dashboard)/dashboard/payments/page.tsx`
  - `/src/app/(dashboard)/dashboard/bills/page.tsx`
  - `/src/app/(dashboard)/dashboard/expenses/page.tsx`
  - `/src/app/(dashboard)/dashboard/properties/page.tsx`
  - `/src/app/(dashboard)/dashboard/rooms/page.tsx`

### 2025-12-28 - Platform Rebrand & UI/UX Overhaul
- **Homepage Restructure** - Repositioned ManageKar as a platform, not just PG software:
  - New platform-focused homepage at `/` showcasing all products
  - PG Manager product page at `/products/pg-manager` with full feature details
  - Pricing page at `/pricing` with freemium model (3 months free, then free tier forever)
  - Products grid: PG Manager (Live), Shop Manager, Rent Manager, Society Manager (Coming Soon)
  - Why ManageKar section highlighting Indian market focus
  - Testimonial section with Hindi quote
  - "3 Months Free" promotional banner throughout
- **Freemium Pricing Model**:
  - Free Trial: 3 months full access
  - Free Forever: 1 PG, 10 rooms, 20 tenants (no deactivated data)
  - Pro: ₹499/month (3 PGs, 50 rooms, unlimited tenants)
  - Business: ₹999/month (unlimited everything + priority support)
  - Monthly/Yearly toggle with 20% yearly discount
- **UI/UX Enhancements**:
  - Glassmorphism effects (glass-nav, glass-card) with backdrop blur
  - Animation keyframes: fadeInUp, fadeInDown, slideInLeft, scaleIn, pulse-soft, float, shimmer
  - Animation utility classes with delays (100ms-500ms)
  - Staggered animations for lists (stagger-children)
  - Hover effects: hover-lift, hover-scale, hover-glow
  - Gradient utilities: gradient-primary, gradient-text
  - Custom scrollbar styling
- **Button Component Enhanced**:
  - New `gradient` variant (teal to emerald gradient with shadow)
  - New `gradient-outline` variant
  - New `xl` size for larger CTAs
  - Added active:scale press effect
  - Enhanced hover states with shadow
- **Card Component Enhanced**:
  - New variants: glass, elevated, interactive, highlight
  - Smooth transitions on all variants
  - Interactive cards with hover lift effect
- **Dashboard Layout Improvements**:
  - Glassmorphism sidebar and header
  - Gradient active state for navigation items
  - Animated loading screen with branded logo
  - Mobile bottom navigation (5 quick access items)
  - Custom scrollbar in navigation
  - Rose-tinted logout hover state
- **Dashboard Home Page**:
  - Time-based greeting (Good morning/afternoon/evening)
  - Animated floating greeting icon
  - Gradient stat cards with shadows
  - Net Income card (Revenue - Expenses)
  - Progress bar for Getting Started checklist
  - Revenue & Expenses summary cards
  - Staggered animation on card grid
- Files created:
  - `/src/app/products/pg-manager/page.tsx`
  - `/src/app/pricing/page.tsx`
- Files modified:
  - `/src/app/page.tsx` (complete rewrite)
  - `/src/app/globals.css` (added 300+ lines of animations/effects)
  - `/src/components/ui/button.tsx` (new variants)
  - `/src/components/ui/card.tsx` (new variants with CVA)
  - `/src/app/(dashboard)/layout.tsx` (glass effects, mobile nav)
  - `/src/app/(dashboard)/dashboard/page.tsx` (enhanced UI)

### 2025-12-28 - Expense Tracking Feature
- Complete expense management system for tracking property costs
- Database migration `009_expense_tracking.sql`:
  - `expense_types` table with 13 default categories
  - `expenses` table with vendor, reference, payment method
  - RLS policies and auto-create default types function
- Expense Management Pages:
  - `/dashboard/expenses` - List with stats, filters, CSV export
  - `/dashboard/expenses/new` - Add expense with category selection
  - `/dashboard/expenses/[id]` - Detail view with edit/delete
  - `/dashboard/expenses/[id]/edit` - Edit expense form
- Settings Integration:
  - New "Expense Categories" tab
  - Add/toggle/delete expense categories
- Reports Integration:
  - Total Expenses KPI with % change vs last month
  - Net Income KPI (Revenue - Expenses)
  - Expenses by Category horizontal bar chart
- Default categories: Maintenance, Electricity/Water (Owner), Cleaning, Security, Internet, Supplies, Furniture, Staff Salary, Property Tax, Insurance, Marketing, Miscellaneous
- Added "Expenses" to sidebar navigation

### 2025-12-28 - Enhanced Reports Dashboard with Recharts
- Replaced custom CSS progress bars with professional Recharts components
- Charts implemented:
  - **LineChart**: Revenue trend showing Collected vs Billed over 6 months
  - **PieChart**: Payment methods breakdown with percentages
  - **BarChart**: Property performance comparison (Occupancy vs Revenue)
- New features:
  - **Date Range Selector**: This Month, Last Month, Last 3/6 Months, This Year
  - **Dues Aging Report**: Color-coded buckets (Current, 1-30, 31-60, 60+ days)
  - **Collection Status**: Horizontal bar showing Paid, Late, Overdue distribution
  - Enhanced KPI cards with overdue amount indicators
  - Critical overdue alerts in Quick Insights section
- Technical improvements:
  - Proper TypeScript types for Recharts formatters
  - Responsive charts using ResponsiveContainer
  - Indian Rupee formatting throughout (₹)
- File modified: `src/app/(dashboard)/dashboard/reports/page.tsx`

### 2025-12-28 - Automated Monthly Bill Generation
- Added automated bill generation via Vercel Cron job
- Database migration: `008_auto_billing.sql` with:
  - `auto_billing_settings` JSONB column on owner_config
  - `bill_generation_log` table for tracking cron runs
  - `get_next_bill_number` function for sequential bill numbers
- Auto Billing Settings UI in Settings → Billing tab:
  - Enable/disable auto billing toggle
  - Bill generation day (1-28 of month)
  - Due date offset (5-30 days after bill date)
  - Include pending charges toggle
  - Send notification toggle
  - Last generated month display
- Cron endpoint `/api/cron/generate-bills` (runs 6 AM UTC / 11:30 AM IST):
  - Processes all owners with auto-billing enabled
  - Generates bills for active tenants on configured day
  - Includes monthly rent + pending charges
  - Carries over previous balance from unpaid bills
  - Logs generation results for audit trail
- Files created/modified:
  - `src/app/api/cron/generate-bills/route.ts`
  - `src/app/(dashboard)/dashboard/settings/page.tsx`
  - `supabase/migrations/008_auto_billing.sql`
  - `vercel.json` (added cron schedule)

### 2025-12-28 - Tenant Re-joining & Room Switching
- Added tenant history tracking for re-joining tenants
- Database migration: `007_tenant_history.sql` with:
  - `tenant_stays` table - tracks each tenure/stay of a tenant
  - `room_transfers` table - tracks room changes within stays
  - Added `is_returning`, `previous_tenant_id`, `total_stays` columns to tenants
  - Function to find returning tenants by phone
- Returning Tenant Detection:
  - When adding new tenant, system checks phone for previous tenants
  - Shows banner with previous stay info and option to pre-fill data
  - Automatically tracks stay number (1st stay, 2nd stay, etc.)
- Room Transfer Feature:
  - "Transfer Room" button on tenant detail page
  - Modal to select new room and update rent
  - Records transfer reason and history
  - Automatically creates new stay record
- Tenant Detail Page Enhancements:
  - Stay History section showing all tenures
  - Room Transfer History section
  - Visual timeline of stays with dates and rent changes

### 2025-12-28 - Billing System
- Added comprehensive billing system for generating monthly bills
- Created bills table with line items, discounts, late fees, previous balance tracking
- Database migration: `006_billing_system.sql` with:
  - Bills table with JSONB line_items for flexible charge breakdown
  - Trigger to auto-update bill status based on payments
  - Function to mark overdue bills
- Bills dashboard (`/dashboard/bills`) with:
  - Stats cards (Total Billed, Collected, Pending, Overdue)
  - Search and filter by status
  - List view with tenant info and amounts
- Bill generation page (`/dashboard/bills/new`) with:
  - Tenant selection with auto-populated charges
  - Editable line items (type, description, amount)
  - Discount, previous balance, and total calculation
  - Auto-generated bill number (INV-YYYY-XXXX format)
- Bill detail page (`/dashboard/bills/[id]`) with:
  - Full bill breakdown with line items
  - Payment history for the bill
  - Record payment directly from bill
  - Share via WhatsApp
- Payment linking:
  - Payments can now be linked to specific bills
  - Bill selection dropdown on payment form
  - Auto-updates bill status (pending/partial/paid)
- Added "Bills" to sidebar navigation

### 2025-12-28 - PG Website Builder
- Added public PG website feature for each property
- Created `/pg/[slug]` route for public PG pages
- Beautiful responsive template with:
  - Hero section with cover photo
  - Amenities grid
  - Rooms & pricing cards
  - House rules
  - Location with nearby landmarks
  - Contact form for inquiries
  - WhatsApp & Call buttons
- Property edit page now has "Website Settings" tab with:
  - Enable/disable toggle
  - Custom slug configuration
  - Tagline & description
  - Property type (PG/Hostel/Co-living)
  - Cover photo URL
  - Amenity selection (14 options)
  - House rules
  - Google Maps URL
  - Nearby landmarks
  - Contact info (WhatsApp, Email)
  - Display toggles (rooms, pricing, contact form)
- Database migration: `005_property_website.sql`
  - Added website_slug, website_enabled, website_config to properties
  - Created website_inquiries table for lead capture
- Website URL format: managekar.com/pg/your-pg-slug

### 2025-12-28 - PDF Rent Receipts & Homepage Rebrand
- Added professional PDF rent receipts using @react-pdf/renderer
- Created `/src/lib/pdf-receipt.tsx` with branded receipt template
- Added `/api/receipts/[id]/pdf` API endpoint for PDF generation
- "Download PDF" button on payment receipt page
- Receipts include: ManageKar branding, property details, tenant info, amount in words
- **Homepage Rebrand:**
  - Updated hero: "From Chaos to Clarity" - positioning as platform for Indian small businesses
  - Added "Platform Vision" section showcasing future products (Shop Manager, Rent Manager, Society Manager)
  - Updated features to highlight: Your Own PG Website, Smart Billing, PDF Receipts, Automated Reminders
  - New messaging: "Simple Software for Indian Small Businesses"
  - Updated footer with platform badge

### 2025-12-28 - Automated Email Payment Reminders
- Added automated email payment reminders via Vercel Cron
- Created email service library using Resend (100 emails/day FREE)
- Created professional HTML email templates (reminder, overdue, receipt)
- Added "Notifications" tab in Settings with configurable options:
  - Enable/disable email reminders
  - Days before due date (1-10)
  - Send on due date toggle
  - Overdue alerts toggle (daily/weekly)
  - Test email button
- Created cron job at `/api/cron/payment-reminders` (runs daily 9 AM UTC)
- Added `vercel.json` for cron configuration

### 2025-12-28 - WhatsApp Payment Notifications
- Added FREE WhatsApp notifications for payments (via wa.me click-to-chat)
- Created `/src/lib/notifications.ts` with message templates
- Created `/src/components/whatsapp-button.tsx` reusable component
- Added "Send Receipt" button on payment receipt page
- Added WhatsApp icon button on payments list for quick receipt sharing
- Created `/dashboard/payments/reminders` page for bulk payment reminders
- Message templates: payment receipt, reminder, overdue alert

### 2025-12-28 - Contact & Help Pages
- Added `/contact` page with contact form, email/phone/WhatsApp options
- Added `/help` page with comprehensive FAQ (20+ questions across 8 categories)
- FAQ features: search, category filters, expandable answers
- Updated footer links on landing page to point to new pages

### 2025-12-28 - Brand Identity & UI Overhaul
- Rebranded application from "PG Manager" to "ManageKar"
- Implemented new teal/emerald color palette for brand identity
- Switched from Geist to Inter font family for better readability
- Added gradient headers to sidebars (teal → emerald)
- Updated all status badges to use brand colors (teal, amber, rose, slate)
- Redesigned auth pages with gradient backgrounds and modern logo
- Updated dashboard stat cards with softer brand-aligned colors
- Consistent color system using CSS variables for easy theming

### 2025-12-28 - Initial Release
- Created full PG Manager application
- Implemented: Properties, Rooms, Tenants, Staff, Payments, Notices, Complaints, Visitors, Exit Clearance
- Added Meter Readings module with auto-charge generation
- Deployed to Vercel with custom domain (managekar.com)
- Created CLAUDE.md for project context
