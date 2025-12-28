# PG Manager

A modern SaaS application for managing Paying Guest (PG) accommodations and hostels in India.

**Live:** [https://managekar.com](https://managekar.com)

## Features

- **Property Management** - Manage multiple PG properties and buildings
- **Room Management** - Track rooms, occupancy, and amenities
- **Tenant Management** - Full tenant lifecycle from onboarding to exit
- **Meter Readings** - Record electricity, water, gas readings with auto-charge generation
- **Payments & Billing** - Track charges, payments, and dues
- **Staff Management** - Manage staff with roles and permissions
- **Notices** - Send announcements to tenants
- **Complaints** - Handle tenant complaints and track resolution
- **Visitors Log** - Track visitor entries
- **Exit Clearance** - Manage tenant checkout process
- **Reports** - Dashboard with key metrics
- **PWA Support** - Install as mobile app for offline access

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with Row Level Security
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cybinfo/pg-manager.git
   cd pg-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Run database migrations in Supabase SQL editor (see `supabase/migrations/`)

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel:
```bash
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register
│   ├── (dashboard)/      # Owner dashboard
│   ├── (tenant)/         # Tenant portal
│   └── (setup)/          # Initial setup
├── components/
│   └── ui/               # UI components
└── lib/
    └── supabase/         # Database clients
```

## License

MIT

## Author

**Rajat Seth**
- GitHub: [@cybinfo](https://github.com/cybinfo)
