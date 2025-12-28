# PG Manager - Project Context

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

## Key Features

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
