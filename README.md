# ManageKar - PG & Hostel Management Software

<div align="center">
  <img src="public/logo.svg" alt="ManageKar Logo" width="80" />
  <h3>India's Smartest PG & Hostel Management Platform</h3>
  <p>"Kar" means "do" in Hindi — ManageKar = "Let's Manage" 🇮🇳</p>

  **[Live Demo](https://managekar.com)** | **[Documentation](CLAUDE.md)**
</div>

---

## ✨ Why ManageKar?

ManageKar is a comprehensive SaaS platform designed specifically for Indian PG (Paying Guest) and hostel owners. Built with modern technology and a mobile-first approach, it helps you manage your entire PG business from anywhere.

### Key Highlights

- 🏠 **Multi-Property Support** - Manage multiple PG properties from one dashboard
- 👥 **Complete Tenant Lifecycle** - From onboarding to exit clearance
- 💰 **Smart Billing** - Automated bills, meter readings, payment tracking
- 👨‍💼 **Staff Management** - Role-based access control with 50+ permissions
- 📱 **PWA Support** - Install as mobile app, works offline
- 🌐 **Public PG Websites** - Auto-generate website for each property
- 🔔 **Automated Notifications** - Email & WhatsApp reminders
- 📊 **Reports & Analytics** - Track revenue, occupancy, and more

---

## 🚀 Features

### Property & Room Management
- Add multiple properties with addresses, photos, and amenities
- Manage rooms with different types (Single, Double, Triple, Dormitory)
- Track room occupancy and availability in real-time
- Set default pricing per room type

### Tenant Management
- Complete tenant profiles with photos, ID documents, emergency contacts
- Returning tenant detection (auto-fill previous data)
- Room transfer with history tracking
- Exit clearance process with settlement calculation

### Billing & Payments
- Generate itemized monthly bills automatically
- Support for rent, electricity, water, and custom charges
- Meter readings with auto-charge generation
- Payment tracking with partial payment support
- WhatsApp bill sharing
- PDF rent receipts

### Staff Management & Permissions
- **5 Default Roles**: Admin, Property Manager, Accountant, Maintenance, Receptionist
- Create custom roles with specific permissions
- 50+ granular permissions across all modules
- Multi-role support (staff can have multiple roles)
- Property-level role assignments

### Notifications
- Automated payment reminders via email
- WhatsApp notifications for receipts and reminders
- Notice board for tenant announcements
- Complaint tracking and resolution

### Reports & Analytics
- Revenue trends and collection rates
- Occupancy statistics
- Expense tracking by category
- Dues aging report
- Export to CSV

### Additional Features
- **Visitor Log** - Track visitor entries with checkout
- **Complaints** - Handle tenant complaints with priority levels
- **Exit Clearance** - Systematic checkout process
- **PG Websites** - Public website for each property (managekar.com/pg/your-slug)
- **Expense Tracking** - Track property expenses with categories

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth with RLS |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Email | Resend API |
| Hosting | Vercel |
| Icons | Lucide React |

---

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

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

   Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   RESEND_API_KEY=your_resend_key  # Optional, for emails
   ```

4. **Run database migrations**

   Go to your Supabase SQL editor and run migrations in order from `supabase/migrations/`:
   - `001_initial_schema.sql`
   - `002_visitors.sql`
   - ... through `014_fix_staff_permissions_aggregation.sql`

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

---

## 🚢 Deployment

### Deploy to Vercel

1. **Via CLI**
   ```bash
   vercel --prod
   ```

2. **Via GitHub**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Automatic deployments on push to main

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
RESEND_API_KEY=your_resend_key
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (ManageKar platform)
│   ├── pricing/              # Pricing page
│   ├── products/pg-manager/  # PG Manager product page
│   ├── (auth)/               # Login, Register
│   ├── (dashboard)/          # Owner dashboard (14 modules)
│   │   └── dashboard/
│   │       ├── properties/   # Property management
│   │       ├── rooms/        # Room management
│   │       ├── tenants/      # Tenant management
│   │       ├── bills/        # Billing system
│   │       ├── payments/     # Payment tracking
│   │       ├── expenses/     # Expense tracking
│   │       ├── meter-readings/
│   │       ├── staff/        # Staff & role management
│   │       ├── notices/      # Announcements
│   │       ├── complaints/   # Complaint handling
│   │       ├── visitors/     # Visitor log
│   │       ├── exit-clearance/
│   │       ├── reports/      # Analytics
│   │       └── settings/     # Configuration
│   ├── (tenant)/             # Tenant portal
│   ├── (setup)/              # Initial setup wizard
│   ├── pg/[slug]/            # Public PG websites
│   ├── contact/              # Contact page
│   └── help/                 # FAQ page
├── components/
│   ├── ui/                   # Reusable UI components
│   ├── forms/                # Form components
│   └── auth/                 # Auth components
└── lib/
    ├── supabase/             # Database clients
    ├── auth/                 # Auth context & hooks
    ├── email.ts              # Email service
    └── format.ts             # Formatting utilities
```

---

## 🔐 User Roles

### Owner
- Full access to all features
- Can manage staff and assign roles
- Access to settings and configuration

### Staff (with assigned roles)
- Access based on role permissions
- Can have multiple roles
- Property-specific or all-property access

### Tenant
- View their bills and payment history
- Raise complaints
- View notices
- Update profile

---

## 💰 Pricing

| Plan | Price | Features |
|------|-------|----------|
| **Free Trial** | 3 months free | Full access to all features |
| **Free Forever** | ₹0/month | 1 PG, 10 rooms, 20 tenants |
| **Pro** | ₹499/month | 3 PGs, 50 rooms, unlimited tenants |
| **Business** | ₹999/month | Unlimited everything + priority support |

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Rajat Seth**
- GitHub: [@cybinfo](https://github.com/cybinfo)
- Email: sethrajat0711@gmail.com

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Hosting platform
- [Lucide](https://lucide.dev/) - Icons

---

<div align="center">
  <p>Made with ❤️ for Indian PG owners</p>
  <p><strong>ManageKar</strong> - Simple Software for Indian Small Businesses</p>
</div>
