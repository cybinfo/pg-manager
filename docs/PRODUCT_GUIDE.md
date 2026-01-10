# ManageKar Product Guide

**India's Smartest PG & Hostel Management Platform**

---

## Welcome to ManageKar

ManageKar is a comprehensive software solution designed specifically for Indian PG (Paying Guest) and hostel owners. Whether you manage a single PG or multiple properties across cities, ManageKar helps you streamline operations, track finances, and grow your business.

**Website:** [managekar.com](https://managekar.com)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Property Management](#property-management)
4. [Room & Bed Management](#room--bed-management)
5. [Tenant Management](#tenant-management)
6. [Tenant Journey Intelligence](#tenant-journey-intelligence)
7. [Billing System](#billing-system)
8. [Payment Tracking](#payment-tracking)
9. [Refund Management](#refund-management)
10. [Exit Clearance](#exit-clearance)
11. [Staff & Permissions](#staff--permissions)
12. [Additional Features](#additional-features)
13. [Reports & Analytics](#reports--analytics)
14. [Pricing Plans](#pricing-plans)
15. [Support](#support)

---

## Getting Started

### Registration

1. Visit [managekar.com](https://managekar.com)
2. Click "Get Started Free"
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile setup

### First-Time Setup

After registration, follow these steps:

1. **Add Your First Property** - Enter property details (name, address, amenities)
2. **Configure Rooms** - Add rooms with bed count and monthly rent
3. **Set Billing Preferences** - Choose billing cycle and payment terms
4. **Add Tenants** - Register your existing tenants
5. **Invite Staff** - Add property managers or accountants (optional)

---

## Dashboard Overview

Your dashboard provides a real-time snapshot of your business:

### Key Metrics
- **Total Revenue** - Monthly earnings across all properties
- **Occupancy Rate** - Percentage of beds occupied
- **Pending Dues** - Outstanding amounts from tenants
- **Collection Rate** - Payment efficiency percentage

### Quick Actions
- Add new tenant
- Generate bills
- Record payment
- View complaints

### Recent Activity
- Latest payments received
- New tenants joined
- Complaints raised
- Staff actions

---

## Property Management

Manage unlimited properties from a single dashboard.

### Property Details
- Property name and address
- Contact information
- Amenities list (WiFi, Parking, Meals, etc.)
- Property photos
- Custom URL for public website

### Property Configuration
- Notice period (days required before exit)
- Security deposit amount
- Billing preferences
- Room types available

### Public PG Website
Each property gets a free public website at:
```
managekar.com/pg/your-property-slug
```

This website showcases:
- Property photos and amenities
- Available rooms and pricing
- Contact information
- Location map

---

## Room & Bed Management

### Room Setup
- **Room Number** - Unique identifier (e.g., "101", "A-1")
- **Room Type** - Single, Double, Triple, Dormitory, etc.
- **Total Beds** - Capacity of the room
- **Monthly Rent** - Base rent per bed
- **Attached Bathroom** - Yes/No
- **AC/Non-AC** - Climate control availability

### Occupancy Tracking
- Real-time bed availability
- Color-coded status (Green: Available, Red: Occupied)
- Occupancy percentage per room

### Architecture View
Visual 2D floor plan showing:
- Room layout
- Current occupancy
- Quick tenant info on hover

---

## Tenant Management

Complete tenant lifecycle from onboarding to exit.

### Tenant Onboarding
1. **Basic Information**
   - Full name
   - Phone numbers (multiple)
   - Email address
   - Date of birth
   - Occupation/Company

2. **Guardian/Emergency Contact**
   - Guardian name
   - Relationship
   - Phone number
   - Address

3. **ID Documents**
   - Aadhaar Card
   - PAN Card
   - Company ID
   - Other documents

4. **Room Assignment**
   - Select property
   - Choose room
   - Assign specific bed
   - Set join date
   - Enter security deposit

### Tenant Statuses
- **Active** - Currently staying
- **Notice Period** - Given notice, exit date set
- **Checked Out** - Completed stay
- **Suspended** - Temporarily inactive

### Returning Tenant Detection
ManageKar automatically detects if a tenant has stayed before:
- Shows previous stay history
- Displays past payment patterns
- Highlights any previous issues

---

## Tenant Journey Intelligence

**NEW FEATURE** - AI-Powered Tenant Insights

The Tenant Journey provides a 360-degree view of each tenant's complete history with your property.

### Visual Timeline
See every event chronologically:
- When they joined
- All bills generated
- Every payment made
- Room transfers
- Complaints raised
- Visitor logs
- Exit process

### Event Categories
Events are color-coded for easy identification:
- **Green** - Onboarding events (join, document upload)
- **Blue** - Financial events (bills, payments)
- **Teal** - Accommodation events (room transfer, bed change)
- **Red** - Complaint events
- **Amber** - Exit events (notice, checkout)
- **Purple** - Visitor events
- **Gray** - System events

### Journey Analytics
Quick stats at a glance:
- Total stays at your properties
- Total amount paid
- Number of complaints
- Room transfers count

### AI-Powered Scores

**Payment Reliability Index (0-100)**
Measures how reliably a tenant pays rent:
- 90-100: Excellent - Always pays on time
- 70-89: Good - Mostly timely
- 50-69: Fair - Occasional delays
- Below 50: Poor - Frequent late payments

**Churn Risk Score (0-100)**
Predicts likelihood of tenant leaving:
- 0-30: Low risk - Likely to stay long-term
- 31-60: Medium risk - Watch for signs
- 61-100: High risk - May leave soon

**Satisfaction Indicator**
Based on interactions:
- High - Few complaints, long stay
- Medium - Some issues but resolved
- Low - Multiple unresolved complaints

### Predictive Insights
Automated alerts and recommendations:
- "3 consecutive late payments detected"
- "High churn risk - consider engagement"
- "Outstanding balance exceeds security deposit"
- "Agreement expiring in 30 days"

### Pre-Tenant History
If a tenant was a visitor before joining, see:
- Previous visits
- Who they visited
- Time between visit and joining

### PDF Export
Generate a professional PDF report containing:
- Tenant profile summary
- All analytics scores
- Financial history
- Complete event timeline

Perfect for:
- Documentation
- Legal purposes
- Tenant reference letters

---

## Billing System

### Bill Generation

**Manual Billing**
Create individual bills with custom line items:
- Base rent
- Electricity charges
- Water charges
- Maintenance
- Custom charges

**Auto-Generation**
Set up automatic monthly billing:
- Choose generation day (1st, 5th, etc.)
- Configure included charges
- Bills created automatically each month

### Billing Modes
- **Calendar Month** - Bill from 1st to end of month
- **Check-in Anniversary** - Bill from join date

### Line Items
Each bill contains:
| Item | Description | Amount |
|------|-------------|--------|
| Rent | Monthly room rent | ₹8,000 |
| Electricity | 45 units @ ₹8/unit | ₹360 |
| Water | Flat monthly charge | ₹200 |
| Maintenance | Building maintenance | ₹500 |
| **Total** | | **₹9,060** |

### Bill Sharing
- **WhatsApp** - Send bill directly via WhatsApp
- **Email** - Send as PDF attachment
- **PDF Download** - Save for records

### Bill Statuses
- **Unpaid** - No payment received
- **Partial** - Some amount paid
- **Paid** - Fully paid
- **Overdue** - Past due date

---

## Payment Tracking

### Recording Payments

1. Select tenant or bill
2. Enter payment amount
3. Choose payment mode:
   - Cash
   - UPI
   - Bank Transfer
   - Cheque
   - Card
4. Add transaction reference
5. Save payment

### Payment Receipt
Automatically generated with:
- Receipt number
- Payment date
- Amount received
- Payment mode
- Running balance

### WhatsApp Receipt
One-click send to tenant:
- Professional format
- All payment details
- Current balance

### Payment History
Track all payments:
- Filter by tenant
- Filter by date range
- Filter by payment mode
- Export to Excel

---

## Refund Management

### Refund Types

**Security Deposit Refund**
- Full or partial deposit return
- Deductions for damages
- Settlement at checkout

**Overpayment Refund**
- When tenant pays more than due
- Excess amount refunded

**Adjustment Refund**
- Billing corrections
- Goodwill adjustments

### Refund Process

1. **Create Refund**
   - Select tenant
   - Enter refund amount
   - Choose refund type
   - Add reason/notes

2. **Processing**
   - Review refund details
   - Approve refund
   - Process payment

3. **Completion**
   - Mark as completed
   - Generate receipt
   - Update tenant balance

### Refund Statuses
- **Pending** - Created, awaiting processing
- **Processing** - Being reviewed
- **Completed** - Refund paid out
- **Cancelled** - Refund cancelled

---

## Exit Clearance

Systematic checkout process ensuring nothing is missed.

### Initiate Exit

1. **Notice Recording**
   - Enter notice date
   - Calculate expected exit date
   - System checks notice period compliance

2. **Notice Period Analysis**
   - Days of notice given
   - Required notice period
   - Shortfall (if any)
   - Penalty calculation

### Settlement Calculation

| Item | Amount |
|------|--------|
| Pending Dues | ₹5,000 |
| Notice Period Shortfall | ₹3,000 |
| Room Damages | ₹500 |
| **Total Dues** | **₹8,500** |
| Security Deposit | ₹12,000 |
| **Refundable Amount** | **₹3,500** |

### Checkout Checklist
- [ ] Room inspection completed
- [ ] Keys returned
- [ ] Electricity meter reading taken
- [ ] Personal belongings collected
- [ ] ID documents returned

### Final Settlement
- Review all calculations
- Confirm amounts
- Process refund
- Generate clearance certificate

---

## Staff & Permissions

### Adding Staff

1. Go to Staff module
2. Click "Add Staff Member"
3. Enter staff details:
   - Name
   - Email (for login)
   - Phone number
   - Assigned properties

4. Select role(s)
5. Send invitation email

### Default Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | Full access | Everything |
| **Property Manager** | Property operations | Tenants, rooms, complaints |
| **Accountant** | Financial management | Bills, payments, reports |
| **Maintenance** | Issue handling | Complaints only |
| **Receptionist** | Front desk | Visitors, basic tenant info |

### Custom Roles
Create custom roles with specific permissions:
- 50+ individual permissions
- Module-level access control
- Action-level restrictions (view, create, edit, delete)

### Multi-Role Support
Staff can have multiple roles:
- Different roles for different properties
- Combined permissions from all roles

---

## Additional Features

### Meter Readings
Track utility consumption:
- Electricity meters
- Water meters
- Gas meters
- Auto-calculate charges

### Visitor Log
- Record visitor entry/exit
- Visitor-tenant relationship
- Multi-day stays
- Overnight tracking

### Complaints Management
- Raise issues
- Priority levels (Low, Medium, High, Critical)
- Assignment to staff
- Resolution tracking
- SLA monitoring

### Notices & Announcements
- Property-wide notices
- Targeted communications
- Notice history

### Activity Log
Complete audit trail:
- Who did what
- When it happened
- Before/after values
- IP address logging

### Feature Flags
Enable/disable features per workspace:
- Expenses tracking
- Meter readings
- Food management
- Tenant portal

---

## Reports & Analytics

### Available Reports

**Revenue Report**
- Monthly revenue trends
- Property-wise breakdown
- Charge type analysis

**Occupancy Report**
- Current occupancy rates
- Historical trends
- Property comparison

**Collection Report**
- Collection efficiency
- Aging analysis (30, 60, 90+ days)
- Defaulter list

**Tenant Report**
- Active tenants
- Notice period tenants
- Checked out tenants

**Expense Report**
- Category-wise expenses
- Monthly trends
- Budget vs actual

### Report Features
- Date range filtering
- Property filtering
- Export to Excel
- Print-friendly view

---

## Pricing Plans

### Free Trial
**3 Months Free**
- Full access to all features
- No credit card required
- Upgrade anytime

### Free Forever
**₹0/month**
- 1 Property
- 10 Rooms
- 20 Tenants
- Basic features

### Pro
**₹499/month**
- 3 Properties
- 50 Rooms
- Unlimited Tenants
- All features
- Email support

### Business
**₹999/month**
- Unlimited Properties
- Unlimited Rooms
- Unlimited Tenants
- All features
- Priority support
- Custom integrations

---

## Support

### Self-Help Resources
- In-app help tooltips
- FAQ section on website
- Video tutorials (coming soon)

### Contact Support

**Email:** support@managekar.com

**Response Times:**
- Free Plan: 48-72 hours
- Pro Plan: 24-48 hours
- Business Plan: 4-8 hours

### Feedback
We love hearing from our users! Share your suggestions:
- Feature requests
- Bug reports
- General feedback

---

## Why Choose ManageKar?

### Built for India
- Designed for Indian PG/hostel business
- Supports Indian billing practices
- Rupee-based pricing
- Local support

### Mobile-First
- Works on any device
- Responsive design
- Manage on-the-go

### Secure & Reliable
- Bank-grade security
- Daily backups
- 99.9% uptime

### Affordable
- Free plan available
- No hidden charges
- Pay monthly, cancel anytime

---

<div align="center">

**ManageKar - Simple Software for Indian Small Businesses**

[Start Free Trial](https://managekar.com) | [Contact Us](mailto:support@managekar.com)

</div>
