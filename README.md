# ManageKar - PG & Hostel Management Platform

<div align="center">
  <img src="public/logo.svg" alt="ManageKar Logo" width="100" />

  **India's Smartest PG & Hostel Management Software**

  *"Kar" means "do" in Hindi - ManageKar = "Let's Manage"*

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

  [Live Demo](https://managekar.com) | [Product Page](https://managekar.com/products/pg-manager) | [Pricing](https://managekar.com/pricing) | [Documentation](CLAUDE.md)

</div>

---

## Overview

ManageKar is a comprehensive SaaS platform designed specifically for Indian PG (Paying Guest) and hostel owners. Built with modern technology and a mobile-first approach, it helps manage your entire PG business from anywhere.

### Why ManageKar?

- **Purpose-Built for India**: Supports INR, Indian mobile numbers, WhatsApp integration
- **Multi-Property Support**: Manage multiple PGs from one dashboard
- **Complete Lifecycle**: From tenant onboarding to exit clearance
- **AI-Powered Insights**: Predictive analytics for tenant behavior
- **Role-Based Access**: 50+ granular permissions for staff management
- **Mobile-First Design**: Works seamlessly on any device

---

## Features

### Core Modules (19 Dashboard Pages)

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Dashboard** | Overview & metrics | Quick actions, key stats, alerts |
| **Properties** | Multi-property management | 2D architecture view, settings |
| **Rooms** | Room & bed management | Capacity tracking, occupancy status |
| **Tenants** | Complete lifecycle | Documents, history, returning tenant detection |
| **Tenant Journey** | AI-powered insights | Timeline, risk scores, PDF export |
| **Bills** | Billing system | Auto-generation, itemized line items |
| **Payments** | Payment tracking | WhatsApp receipts, partial payments |
| **Refunds** | Refund processing | Deposit refunds, adjustments |
| **Expenses** | Expense tracking | Categories, receipts, reports |
| **Meter Readings** | Utility management | Electricity, water, gas readings |
| **Staff** | Staff management | RBAC with 50+ permissions |
| **Notices** | Announcements | Property-wide or targeted notices |
| **Complaints** | Issue tracking | Priority levels, resolution workflow |
| **Visitors** | Visitor log | Multi-day stays, tenant linking |
| **Exit Clearance** | Checkout process | Settlement calculation, checklist |
| **Reports** | Analytics | Revenue, occupancy, dues aging |
| **Architecture** | Property visualization | Interactive 2D floor plan |
| **Approvals** | Request workflow | Tenant requests, dispute handling |
| **Settings** | Configuration | Billing rules, room types, features |

### Tenant Journey Intelligence

The flagship feature providing a 360-degree view of each tenant:

- **Visual Timeline**: Chronological events from onboarding to exit
- **Event Categories**: Financial, accommodation, complaints, visitors
- **AI-Powered Scores**:
  - Payment Reliability Index (0-100)
  - Churn Risk Score (0-100)
  - Satisfaction Indicator (High/Medium/Low)
- **Predictive Insights**: Automated alerts and recommendations
- **PDF Export**: Professional journey reports

### Security & Access Control

- **Role-Based Access Control (RBAC)**:
  - 5 default roles: Admin, Property Manager, Accountant, Maintenance, Receptionist
  - 50+ granular permissions
  - Multi-role support per staff member
  - Property-level access control

- **Security Features**:
  - Row Level Security (RLS) on all tables
  - CSRF protection on sensitive endpoints
  - Rate limiting on all API routes
  - Security headers (CSP, HSTS, etc.)
  - Comprehensive audit logging

### Additional Features

- **Public PG Websites**: Auto-generated pages at `managekar.com/pg/your-slug`
- **Tenant Portal**: Self-service bill viewing, complaint submission
- **WhatsApp Integration**: Bills, receipts, reminders via WhatsApp
- **Feature Flags**: Enable/disable features per workspace
- **Platform Admin**: Superuser access for support operations

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (Strict Mode) |
| **Database** | PostgreSQL via Supabase |
| **Authentication** | Supabase Auth |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Charts** | Recharts |
| **PDF Generation** | @react-pdf/renderer |
| **Email** | Resend API |
| **Hosting** | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
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

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   RESEND_API_KEY=your-resend-key
   CRON_SECRET=your-cron-secret
   ```

4. **Run database migrations**

   Execute migrations 001-043 in order via Supabase Dashboard > SQL Editor

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

### Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run test suite (154 tests)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npx tsc --noEmit     # Type check
npm run lint         # Run ESLint
```

---

## Project Structure

```
pg-manager/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Authentication pages
│   │   ├── (dashboard)/        # Dashboard modules (19 pages)
│   │   ├── (tenant)/           # Tenant portal
│   │   ├── pg/[slug]/          # Public PG websites
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── forms/              # Form components
│   │   ├── shared/             # Shared templates
│   │   ├── auth/               # Auth guards
│   │   └── journey/            # Tenant journey components
│   ├── lib/
│   │   ├── supabase/           # Database clients & transforms
│   │   ├── auth/               # Auth context & hooks
│   │   ├── services/           # Service layer
│   │   ├── workflows/          # Business workflows
│   │   ├── hooks/              # Custom hooks
│   │   └── features/           # Feature flags
│   ├── types/                  # TypeScript type definitions
│   └── __tests__/              # Jest test suites (154 tests)
├── supabase/
│   └── migrations/             # Database migrations (001-043)
├── public/                     # Static assets
├── CLAUDE.md                   # AI Development Guide
└── REVIEW.md                   # Code Review Document
```

---

## Database Schema

### Key Tables

| Table | Purpose |
|-------|---------|
| `workspaces` | One per owner (auto-created on registration) |
| `user_profiles` | Central identity for all users |
| `user_contexts` | Links users to workspaces with roles |
| `platform_admins` | Superuser access table |
| `properties` | Building/property records |
| `rooms` | Room definitions with capacity |
| `tenants` | Tenant records with documents |
| `tenant_stays` | Stay history (supports re-joining) |
| `bills` | Monthly bills with line items |
| `payments` | Payment records |
| `refunds` | Refund tracking |
| `exit_clearance` | Checkout process tracking |
| `audit_events` | Comprehensive audit trail |

### Migrations

43 migrations covering:
- Core schema (001-010)
- Unified identity system (012)
- RBAC and permissions (013-014)
- Audit logging (016, 038)
- Platform admins (017)
- Billing enhancements (018-025)
- Tenant journey (041)
- Schema reconciliation (042)
- Security fixes (043)

---

## Deployment

### Deploy to Vercel

```bash
npm run build
vercel --prod
```

Or connect your GitHub repository for automatic deployments.

### Environment Variables (Production)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
CRON_SECRET=your-secure-cron-secret
```

### Cron Jobs

Configure in `vercel.json` for automated tasks:
- Bill generation (1st of month)
- Payment reminders (configurable)
- Daily summaries (09:30 IST)

---

## Pricing

| Plan | Price | Limits |
|------|-------|--------|
| **Free Trial** | 3 months free | Full access |
| **Free Forever** | Free | 1 PG, 10 rooms, 20 tenants |
| **Pro** | Rs.499/month | 3 PGs, 50 rooms, unlimited tenants |
| **Business** | Rs.999/month | Unlimited + priority support |

---

## Development

### For AI Development

See [CLAUDE.md](CLAUDE.md) for comprehensive AI development guidelines including:
- Critical patterns and conventions
- Database schema details
- Component usage guidelines
- Common issues and solutions

### Code Quality

The codebase follows:
- TypeScript strict mode
- ESLint with Next.js config
- Consistent API error handling
- Structured logging
- Comprehensive audit trail

### Testing

The project includes a Jest test suite with 154 tests covering:
- Format utilities (currency, dates, text)
- Indian validators (mobile, PAN, Aadhaar, GST)
- API response helpers
- Service layer types
- Currency display components

Run `npm test` to execute all tests.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

---

## Support

- **Issues**: [GitHub Issues](https://github.com/cybinfo/pg-manager/issues)
- **Email**: sethrajat0711@gmail.com
- **Documentation**: [CLAUDE.md](CLAUDE.md)

---

## Author

**Rajat Seth**
- GitHub: [@cybinfo](https://github.com/cybinfo)
- Email: sethrajat0711@gmail.com

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with care for Indian PG owners</p>
  <p><strong>ManageKar</strong> - Simple Software for Indian Small Businesses</p>
</div>
