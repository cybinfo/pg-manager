# ManageKar - PG & Hostel Management Software

<div align="center">
  <img src="public/logo.svg" alt="ManageKar Logo" width="80" />
  <h3>India's Smartest PG & Hostel Management Platform</h3>
  <p>"Kar" means "do" in Hindi — ManageKar = "Let's Manage"</p>

  **[Live Demo](https://managekar.com)** | **[Product Page](https://managekar.com/products/pg-manager)** | **[Pricing](https://managekar.com/pricing)**
</div>

---

## Why ManageKar?

ManageKar is a comprehensive SaaS platform designed specifically for Indian PG (Paying Guest) and hostel owners. Built with modern technology and a mobile-first approach, it helps you manage your entire PG business from anywhere.

### Key Highlights

- **Multi-Property Support** - Manage multiple PGs from one dashboard
- **Complete Tenant Lifecycle** - From onboarding to exit clearance with notice period workflow
- **Smart Billing** - Auto-generate bills, track meter readings, record payments
- **Staff Management** - Role-based access with 50+ granular permissions
- **Mobile-First** - Works beautifully on phones
- **Public PG Websites** - Auto-generate website for each property
- **WhatsApp Integration** - Send bills, receipts, and reminders via WhatsApp
- **Reports & Analytics** - Track revenue, occupancy, and collection rates

---

## Features

### 16 Dashboard Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview with key metrics and quick actions |
| **Properties** | Multi-property management with 2D architecture view |
| **Rooms** | Room types, capacity tracking, occupancy status |
| **Tenants** | Complete lifecycle with document upload and returning tenant detection |
| **Bills** | Itemized monthly bills with auto-generation |
| **Payments** | Payment recording with WhatsApp receipts |
| **Expenses** | Track property expenses by category |
| **Meter Readings** | Electricity, water, gas with auto-charge generation |
| **Staff** | Staff members with email invitations |
| **Notices** | Announcements for tenants |
| **Complaints** | Tenant issue tracking with priority levels |
| **Visitors** | Visitor log with multi-day overnight stays |
| **Exit Clearance** | Systematic checkout with settlement calculation |
| **Reports** | Revenue trends, occupancy stats, dues aging |
| **Approvals** | Tenant request workflow (profile changes, disputes) |
| **Settings** | Configuration for billing, room types, features |

### Staff & Permissions (RBAC)

- **5 Default Roles**: Admin, Property Manager, Accountant, Maintenance, Receptionist
- **50+ Permissions**: Granular control across all modules
- **Multi-Role Support**: Staff can have multiple roles
- **Property-Level Access**: Assign roles to specific properties

### Billing System

- Monthly bills with itemized line items
- Auto-generation via configurable schedule
- Support for rent, electricity, water, and custom charges
- Meter readings with per-unit or flat rate billing
- Calendar month or check-in anniversary billing modes
- PDF receipts and WhatsApp sharing

### Additional Features

- **Public PG Websites** - Each property gets a page at managekar.com/pg/your-slug
- **Tenant Portal** - Tenants can view bills, raise complaints, report issues
- **Feature Flags** - Enable/disable features per workspace
- **Activity Log** - Audit trail for all actions
- **Platform Admin** - Superuser access for support

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Email | Resend API |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cybinfo/pg-manager.git
   cd pg-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   RESEND_API_KEY=your_resend_key  # Optional, for emails
   ```

4. **Run database migrations**

   Run migrations in order from `supabase/migrations/` (001 through 037)

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Platform homepage
│   ├── pricing/                # Pricing page
│   ├── products/pg-manager/    # Product landing page
│   ├── (auth)/                 # Login, Register, Password Reset
│   ├── (dashboard)/            # Owner/Staff dashboard
│   │   ├── dashboard/          # Main dashboard (/dashboard)
│   │   ├── properties/         # Properties (/properties)
│   │   ├── rooms/              # Rooms (/rooms)
│   │   ├── tenants/            # Tenants (/tenants)
│   │   ├── bills/              # Bills (/bills)
│   │   ├── payments/           # Payments (/payments)
│   │   ├── expenses/           # Expenses (/expenses)
│   │   ├── meter-readings/     # Meter Readings (/meter-readings)
│   │   ├── staff/              # Staff (/staff)
│   │   ├── notices/            # Notices (/notices)
│   │   ├── complaints/         # Complaints (/complaints)
│   │   ├── visitors/           # Visitors (/visitors)
│   │   ├── exit-clearance/     # Exit Clearance (/exit-clearance)
│   │   ├── reports/            # Reports (/reports)
│   │   ├── architecture/       # Architecture View (/architecture)
│   │   ├── activity/           # Activity Log (/activity)
│   │   ├── approvals/          # Approvals (/approvals)
│   │   ├── admin/              # Platform Admin (/admin)
│   │   └── settings/           # Settings (/settings)
│   ├── (tenant)/               # Tenant portal
│   ├── pg/[slug]/              # Public PG websites
│   └── api/                    # API routes
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── forms/                  # Form components
│   └── auth/                   # Auth components
└── lib/
    ├── supabase/               # Database clients
    ├── auth/                   # Auth context & hooks
    └── features/               # Feature flags
```

---

## Deployment

### Deploy to Vercel

```bash
vercel --prod
```

Or connect your GitHub repository for automatic deployments.

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
RESEND_API_KEY=your_resend_key
```

---

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free Trial** | 3 months free | Full access to all features |
| **Free Forever** | ₹0/month | 1 PG, 10 rooms, 20 tenants |
| **Pro** | ₹499/month | 3 PGs, 50 rooms, unlimited tenants |
| **Business** | ₹999/month | Unlimited everything + priority support |

---

## Author

**Rajat Seth**
- GitHub: [@cybinfo](https://github.com/cybinfo)
- Email: sethrajat0711@gmail.com

---

## License

This project is licensed under the MIT License.

---

<div align="center">
  <p>Made with love for Indian PG owners</p>
  <p><strong>ManageKar</strong> - Simple Software for Indian Small Businesses</p>
</div>
