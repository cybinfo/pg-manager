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
- **Refund Tracking** - Comprehensive refund management for deposits and overpayments
- **Staff Management** - Role-based access with 50+ granular permissions
- **Mobile-First** - Works beautifully on phones
- **Public PG Websites** - Auto-generate website for each property
- **WhatsApp Integration** - Send bills, receipts, and reminders via WhatsApp
- **Reports & Analytics** - Track revenue, occupancy, and collection rates

---

## Features

### 17 Dashboard Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview with key metrics and quick actions |
| **Properties** | Multi-property management with 2D architecture view |
| **Rooms** | Room types, capacity tracking, occupancy status |
| **Tenants** | Complete lifecycle with document upload and returning tenant detection |
| **Bills** | Itemized monthly bills with auto-generation |
| **Payments** | Payment recording with WhatsApp receipts |
| **Refunds** | Deposit refunds, overpayment refunds, adjustments |
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

### Exit Clearance & Refunds

- **Notice Period Tracking**: Record notice date and expected exit date
- **Notice Period Analysis**: Compare actual notice vs configured notice days
- **Settlement Calculation**: Auto-calculate dues, deposits, and deductions
- **Checkout Checklist**: Room inspection, key return tracking
- **Refund Processing**: Track deposit refunds, overpayments, and adjustments
- **Refund Status**: Pending → Processing → Completed workflow

### Additional Features

- **Public PG Websites** - Each property gets a page at managekar.com/pg/your-slug
- **Tenant Portal** - Tenants can view bills, raise complaints, report issues
- **Feature Flags** - Enable/disable features per workspace
- **Activity Log** - Audit trail for all actions
- **Platform Admin** - Superuser access for support
- **Configurable Types** - Custom room types, charge types, expense types

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

   Run migrations in order from `supabase/migrations/` (001 through 039)

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
│   ├── (dashboard)/            # Owner/Staff dashboard (17 modules)
│   │   ├── dashboard/          # Main dashboard (/dashboard)
│   │   ├── properties/         # Properties (/properties)
│   │   ├── rooms/              # Rooms (/rooms)
│   │   ├── tenants/            # Tenants (/tenants)
│   │   ├── bills/              # Bills (/bills)
│   │   ├── payments/           # Payments (/payments)
│   │   ├── refunds/            # Refunds (/refunds)
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
│   ├── shared/                 # Shared templates
│   └── auth/                   # Auth components
└── lib/
    ├── supabase/               # Database clients
    ├── auth/                   # Auth context & hooks
    ├── features/               # Feature flags
    ├── services/               # Service layer
    ├── workflows/              # Business workflows
    └── hooks/                  # Custom hooks
```

---

## Deployment

### Deploy to Vercel

```bash
npm run build
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

## Database Migrations

The project uses 39 migrations. Key ones:

| Migration | Purpose |
|-----------|---------|
| `012_unified_identity.sql` | Multi-context auth system |
| `013_default_roles.sql` | System roles setup |
| `015_storage_buckets.sql` | Photo uploads |
| `035_configurable_room_types.sql` | Custom types |
| `038_comprehensive_audit_system.sql` | Audit logging |
| `039_refunds_table.sql` | Refund tracking |

Run migrations via Supabase Dashboard → SQL Editor.

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
