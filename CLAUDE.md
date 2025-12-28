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
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Owner dashboard pages
│   │   └── dashboard/
│   │       ├── properties/
│   │       ├── rooms/
│   │       ├── tenants/
│   │       ├── meter-readings/  # With auto-charge generation
│   │       ├── payments/
│   │       ├── staff/
│   │       ├── notices/
│   │       ├── complaints/
│   │       ├── visitors/
│   │       ├── exit-clearance/
│   │       ├── reports/
│   │       └── settings/
│   ├── (tenant)/         # Tenant portal pages
│   └── (setup)/          # Initial setup wizard
├── components/
│   ├── ui/               # shadcn/ui components (button, card, input, label)
│   └── pwa-install-prompt.tsx
└── lib/
    ├── supabase/         # Supabase client (client.ts, server.ts, middleware.ts)
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
