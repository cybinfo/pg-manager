# Expense Module Enhancement Proposal

> **Status**: Draft for Review (Enhanced with AI & India Features)
> **Last Updated**: 2026-01-31
> **Based On**: Analysis of client's Daily Spend Tracker (11 sheets, 12,144+ transactions)
> **Vision**: World-class Indian expense tracker with AI intelligence

---

## Executive Summary

This proposal outlines a comprehensive redesign of ManageKar's expense module to provide a **unified financial management system** that surpasses the client's current multi-sheet Excel-based tracking. The enhanced module will:

1. **Work independently** - No dependency on tenant/property modules
2. **Auto-integrate** - Seamlessly connects when other modules are used
3. **Be more powerful** - Features Excel can't provide (analytics, automation, receipts)
4. **Be simpler** - Unified interface vs 11 separate sheets
5. **AI-Powered** - Smart categorization, anomaly detection, price predictions
6. **India-First** - UPI tracking, GST compliance, regional languages, Indian fiscal year

---

## Part 1: Analysis of Client's Current System

### Current Structure (11 Sheets)

| Sheet | Records | Purpose |
|-------|---------|---------|
| `dailySpendList` | 12,144 | Kitchen/grocery daily purchases |
| `productList` | 385 | Product master with categories |
| `productCategoryList` | 27 | Product categories |
| `paidBillsList` | 98 | Vendor bills (utilities, supplies) |
| `billsCategoryList` | 6 | Bill categories |
| `billsPartyList` | 8 | Vendor/party directory |
| `paidForService` | 46 | Service provider payments |
| `serviceCategoryList` | 11 | Service categories |
| `servicePersonList` | 14 | Service provider directory |
| `tenantsPaidList` | 1,022 | Tenant payments (out of scope) |
| `tenantsDepositList` | N/A | Security deposits (out of scope) |

### Key Insights from Analysis

**1. Daily Spend Tracking (Kitchen)**
- Tracks individual purchases with quantity, rate, total
- Links to product master for consistency
- Categories: Vegetables, Grocery, Fruits, Milk/Dairy, etc.
- High volume: ~33 transactions/day average

**2. Bill Payment Tracking**
- 6 categories: Electricity, Cylinder, Water, Building Materials, Kitchen Items, Salary
- Links to vendor/party directory
- Tracks payment dates and amounts

**3. Service Provider Management**
- 11 categories: Electrician, Plumber, AC Service, Carpenter, etc.
- Maintains provider contact information
- Tracks service history and payments

### Pain Points with Excel System

1. **No automation** - Manual data entry, no auto-calculations
2. **No receipts** - Can't attach photos of bills/receipts
3. **No analytics** - Limited to basic Excel formulas
4. **No mobile access** - Desktop-only workflow
5. **No multi-user** - Single file, no collaboration
6. **No alerts** - No reminders for recurring bills
7. **Data integrity** - No validation, duplicate risk

---

## Part 2: Proposed Enhanced Expense Module

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPENSE MODULE                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Daily Spend    │  Bills & Vendors │  Services                   │
│  (Kitchen)      │  (Recurring)     │  (On-demand)                │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                    SHARED INFRASTRUCTURE                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Product  │  │ Vendor   │  │ Service  │  │ Receipt  │        │
│  │ Master   │  │ Directory│  │ Providers│  │ Storage  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                    INTEGRATION LAYER                             │
│  Auto-connects with: Tenants | Properties | Payments | Reports  │
└─────────────────────────────────────────────────────────────────┘
```

### Module Independence Strategy

The expense module will work in **three modes**:

| Mode | Description | Available Features |
|------|-------------|-------------------|
| **Standalone** | No other modules used | Full expense tracking, reports |
| **Property-Linked** | Properties module used | Expenses per property, consolidated reports |
| **Fully Integrated** | All modules used | Auto-sync tenant payments, property expenses, unified analytics |

---

## Part 3: Feature Specifications

### 3.1 Daily Spend Tracking (Kitchen Module)

**Purpose**: Track daily grocery/kitchen purchases with product-level detail

#### Features

| Feature | Description | Improvement over Excel |
|---------|-------------|----------------------|
| **Quick Entry** | Date, product (searchable), qty, rate, auto-total | Type-ahead search, keyboard shortcuts |
| **Bulk Entry** | Enter multiple items at once | Single screen vs multiple rows |
| **Product Master** | Searchable product catalog with categories | Auto-suggest, prevent typos |
| **Receipt Capture** | Photo upload for purchase receipts | Not possible in Excel |
| **Daily Summary** | Auto-calculated daily totals | Real-time, no formulas |
| **Category Reports** | Spending by category over time | Visual charts, trends |
| **Price Tracking** | Track price changes per product | Alerts for unusual prices |
| **Recurring Items** | Templates for daily purchases | One-click repeat |

#### UI: Daily Spend Entry

```
┌─────────────────────────────────────────────────────────────────┐
│  Daily Spend Entry                              [+ Add Receipt] │
├─────────────────────────────────────────────────────────────────┤
│  Date: [Jan 31, 2026 ▼]     Property: [All Properties ▼]       │
├─────────────────────────────────────────────────────────────────┤
│  Product          │ Qty  │ Unit │ Rate  │ Total  │ Actions     │
│  ─────────────────┼──────┼──────┼───────┼────────┼─────────    │
│  [🔍 Tomato    ▼] │ [2]  │ Kg   │ [40]  │ ₹80    │ [×]         │
│  [🔍 Onion     ▼] │ [3]  │ Kg   │ [35]  │ ₹105   │ [×]         │
│  [🔍 Milk      ▼] │ [5]  │ Ltr  │ [60]  │ ₹300   │ [×]         │
│  [+ Add Item]                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                        Daily Total: ₹485       │
│                                                                 │
│  [Save & New] [Save & Close]                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Product Master Management

```
┌─────────────────────────────────────────────────────────────────┐
│  Product Master                        [+ Add Product]          │
├─────────────────────────────────────────────────────────────────┤
│  Search: [                    ]  Category: [All ▼]              │
├─────────────────────────────────────────────────────────────────┤
│  Product Name    │ Category    │ Default Unit │ Avg Price      │
│  ────────────────┼─────────────┼──────────────┼────────────    │
│  Tomato          │ Vegetables  │ Kg           │ ₹42/kg         │
│  Potato          │ Vegetables  │ Kg           │ ₹28/kg         │
│  Milk (Amul)     │ Dairy       │ Ltr          │ ₹60/ltr        │
│  Rice (Basmati)  │ Grocery     │ Kg           │ ₹85/kg         │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Bills & Vendors Module

**Purpose**: Track recurring bills and vendor payments

#### Features

| Feature | Description | Improvement over Excel |
|---------|-------------|----------------------|
| **Vendor Directory** | Centralized vendor/party database | Contact info, payment history |
| **Bill Categories** | Customizable categories | User-defined, not hardcoded |
| **Receipt Upload** | Attach bill images/PDFs | Searchable document storage |
| **Due Date Tracking** | Set and track payment due dates | Automated reminders |
| **Recurring Bills** | Auto-generate recurring entries | Set once, auto-creates |
| **Payment Status** | Paid/Pending/Overdue status | Visual indicators |
| **Approval Workflow** | Optional approval before payment | Multi-user accountability |

#### Bill Entry UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Record Bill Payment                                            │
├─────────────────────────────────────────────────────────────────┤
│  Category: [Electricity ▼]     Vendor: [🔍 BESCOM         ▼]   │
│                                                                 │
│  Bill Details                                                   │
│  ─────────────                                                  │
│  Bill Number:    [KA-2026-1234        ]                        │
│  Bill Period:    [Jan 2026 ▼]                                  │
│  Bill Amount:    [₹ 15,420            ]                        │
│  Due Date:       [Feb 10, 2026        ]                        │
│                                                                 │
│  Payment Details                                                │
│  ───────────────                                                │
│  Payment Date:   [Jan 31, 2026        ]                        │
│  Payment Mode:   [Bank Transfer ▼]                             │
│  Reference:      [UTR123456789        ]                        │
│                                                                 │
│  Attachments                                                    │
│  ───────────                                                    │
│  [📷 Upload Bill Image]  [📄 Upload PDF]                       │
│                                                                 │
│  Property: [🏠 Sunrise PG ▼] (Optional - links to property)    │
│                                                                 │
│  [Cancel]                                    [Save Payment]     │
└─────────────────────────────────────────────────────────────────┘
```

#### Vendor Directory UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Vendor Directory                         [+ Add Vendor]        │
├─────────────────────────────────────────────────────────────────┤
│  Vendor Name     │ Category    │ Contact      │ Total Paid     │
│  ────────────────┼─────────────┼──────────────┼────────────    │
│  BESCOM          │ Electricity │ 1912         │ ₹1,85,420      │
│  BWSSB           │ Water       │ 1916         │ ₹42,300        │
│  HP Gas          │ Cylinder    │ 9876543210   │ ₹28,800        │
│  Sri Balaji      │ Supplies    │ 8765432109   │ ₹1,24,500      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Services Module

**Purpose**: Track service provider payments (electrician, plumber, etc.)

#### Features

| Feature | Description | Improvement over Excel |
|---------|-------------|----------------------|
| **Provider Directory** | Contact database with skills | Call directly from app |
| **Service Categories** | Customizable service types | User-defined categories |
| **Work Description** | Detailed notes per service | Searchable history |
| **Rating System** | Rate service quality | Find best providers |
| **Photo Documentation** | Before/after photos | Visual work records |
| **Warranty Tracking** | Track service warranties | Reminder alerts |

#### Service Payment UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Record Service Payment                                         │
├─────────────────────────────────────────────────────────────────┤
│  Category: [Electrician ▼]    Provider: [🔍 Raju Electric  ▼]  │
│                                                                 │
│  Service Details                                                │
│  ───────────────                                                │
│  Date:           [Jan 31, 2026        ]                        │
│  Description:    [                                        ]    │
│                  [Fan repair in Room 201, replaced capacitor]  │
│                                                                 │
│  Payment                                                        │
│  ───────                                                        │
│  Amount:         [₹ 450               ]                        │
│  Payment Mode:   [Cash ▼]                                      │
│                                                                 │
│  Documentation                                                  │
│  ─────────────                                                  │
│  [📷 Add Photos]     Warranty: [6 months ▼]                    │
│                                                                 │
│  Location                                                       │
│  ────────                                                       │
│  Property: [🏠 Sunrise PG ▼]   Room: [201 ▼] (Optional)        │
│                                                                 │
│  [Cancel]                                    [Save Service]     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Receipt Management

**Central receipt storage with smart features**

| Feature | Description |
|---------|-------------|
| **Multi-format** | Images (JPG, PNG), PDFs supported |
| **OCR Ready** | Structure for future OCR extraction |
| **Organized** | Auto-organized by date, category, vendor |
| **Searchable** | Find receipts by amount, vendor, date |
| **Bulk Upload** | Upload multiple receipts at once |
| **Cloud Backup** | Secure storage in Supabase |

---

## Part 3A: AI-Powered Intelligence (Game Changer)

> **This is what makes ManageKar unbeatable** - Features no Excel or basic app can provide

### 3A.1 Smart Receipt OCR

**Auto-extract data from photos of bills and receipts**

```
┌─────────────────────────────────────────────────────────────────┐
│  📷 Receipt Captured                                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐                                        │
│  │  [Photo of Receipt] │  AI Extracted Data:                    │
│  │                     │  ─────────────────                     │
│  │  Sri Balaji Store   │  Vendor: Sri Balaji Store ✓           │
│  │  ─────────────────  │  Date: Jan 31, 2026 ✓                 │
│  │  Tomato 2kg  ₹80    │  Items:                                │
│  │  Onion 3kg   ₹105   │    • Tomato 2kg @ ₹40 = ₹80 ✓        │
│  │  Rice 5kg    ₹425   │    • Onion 3kg @ ₹35 = ₹105 ✓        │
│  │  ─────────────────  │    • Rice 5kg @ ₹85 = ₹425 ✓         │
│  │  Total: ₹610        │  Total: ₹610 ✓                        │
│  └─────────────────────┘                                        │
│                                                                 │
│  [✏️ Edit]  [✓ Confirm & Save]  [🔄 Re-scan]                   │
└─────────────────────────────────────────────────────────────────┘
```

**How it works:**
1. User takes photo of any receipt/bill
2. AI extracts: vendor name, date, line items, quantities, rates, total
3. Auto-matches to existing products in catalog
4. Creates new products if not found (with confirmation)
5. One tap to save multiple expense entries

**Technology:** Google Cloud Vision API / AWS Textract for OCR + Custom ML model for Indian receipt formats

### 3A.2 Smart Categorization

**AI auto-categorizes expenses based on description/vendor**

| Input | AI Detection | Action |
|-------|--------------|--------|
| "Tomato, Onion, Potato" | Vegetables | Auto-assign category |
| "BESCOM bill payment" | Electricity | Link to vendor, set as bill |
| "Raju electrician fan repair" | Electrician service | Create service entry |
| "Amul milk 5 packets" | Dairy | Auto-select product |

**Learning System:**
- Learns from user corrections
- Workspace-specific patterns
- Improves accuracy over time

### 3A.3 Anomaly Detection & Alerts

**AI spots unusual patterns and potential issues**

```
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Smart Alerts                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ PRICE SPIKE DETECTED                                       │
│  Tomato price jumped from ₹40/kg to ₹80/kg (100% increase)     │
│  This is unusual. Market average is ₹45/kg.                    │
│  [Ignore] [Flag for Review] [Find Alternatives]                │
│                                                                 │
│  ⚠️ UNUSUAL SPENDING PATTERN                                   │
│  Kitchen spending this week: ₹12,400 (vs ₹8,200 avg)           │
│  50% higher than usual. Check for:                             │
│  • Bulk purchases • Wastage • Pilferage                        │
│  [View Details] [Dismiss]                                      │
│                                                                 │
│  💡 SAVINGS OPPORTUNITY                                         │
│  You buy Rice from "Sri Balaji" at ₹85/kg                      │
│  "Krishna Traders" offers same quality at ₹78/kg               │
│  Potential monthly savings: ₹350                               │
│  [Switch Vendor] [Keep Current]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Alert Types:**

| Alert | Trigger | Value |
|-------|---------|-------|
| **Price Spike** | Item price > 30% above average | Prevent overcharging |
| **Volume Anomaly** | Quantity unusually high/low | Detect pilferage/waste |
| **Pattern Break** | Spending pattern changes | Early warning |
| **Duplicate Entry** | Same amount, vendor, date | Prevent double entry |
| **Missing Regular** | Expected recurring expense missing | Bill reminder |
| **Budget Breach** | Category exceeds budget | Cost control |

### 3A.4 Predictive Analytics

**AI predicts future expenses for better planning**

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 February 2026 Expense Forecast                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Category         │ Predicted │ Confidence │ vs Last Month     │
│  ─────────────────┼───────────┼────────────┼─────────────────  │
│  Kitchen/Daily    │ ₹48,500   │ 92%        │ ↑ ₹3,200 (7%)    │
│  Electricity      │ ₹16,200   │ 88%        │ ↑ ₹800 (5%)      │
│  Water            │ ₹3,400    │ 95%        │ → Same           │
│  Services         │ ₹8,000    │ 65%        │ Variable         │
│  ─────────────────┼───────────┼────────────┼─────────────────  │
│  TOTAL PREDICTED  │ ₹76,100   │ 85%        │ ↑ ₹4,000         │
│                                                                 │
│  💡 Insight: Kitchen costs rising due to seasonal vegetable    │
│     price increases. Consider bulk buying rice/dal now.        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3A.5 Voice Entry (Hindi + English)

**Speak to add expenses - perfect for busy kitchen staff**

```
User: "आज सब्जी में 2 किलो टमाटर 80 रुपये, 3 किलो प्याज 105 रुपये"
       (Today vegetables: 2kg tomato ₹80, 3kg onion ₹105)

AI Response: "Added 2 items to daily spend:
             - Tomato 2kg @ ₹40/kg = ₹80
             - Onion 3kg @ ₹35/kg = ₹105
             Total: ₹185. Confirm?"
```

**Supported Languages:**
- Hindi (primary)
- English
- Kannada, Tamil, Telugu (Phase 2)
- Marathi, Bengali, Gujarati (Phase 3)

### 3A.6 Smart Suggestions

**Context-aware recommendations**

| Context | Suggestion |
|---------|------------|
| Monday morning | "Add yesterday's kitchen expenses?" |
| 1st of month | "Time to record electricity bill?" |
| After adding items | "You usually buy milk too. Add?" |
| High spending day | "Unusual day? Add notes for reference" |
| Near month end | "3 pending bills due this week" |

---

## Part 3B: India-Specific Features (Desi Power)

### 3B.1 UPI Payment Tracking

**Auto-link UPI payments to expenses**

```
┌─────────────────────────────────────────────────────────────────┐
│  💳 Payment Mode                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ○ Cash                                                         │
│  ● UPI                                                          │
│    ├── 📱 Google Pay                                           │
│    ├── 📱 PhonePe                                              │
│    ├── 📱 Paytm                                                │
│    ├── 📱 BHIM                                                 │
│    └── 📱 Bank UPI                                             │
│  ○ Bank Transfer (NEFT/IMPS/RTGS)                              │
│  ○ Cheque                                                       │
│  ○ Credit/Debit Card                                           │
│                                                                 │
│  UPI Reference: [Enter UTR/Transaction ID        ]             │
│                                                                 │
│  🔗 [Link from UPI App] - Auto-fetch transaction details       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**UPI Integration Features:**
- Store UPI IDs for vendors (auto-fill for repeat payments)
- UTR/Reference number tracking
- Payment proof screenshot upload
- Bank SMS parsing (future: auto-create expenses from bank SMS)

### 3B.2 Indian Fiscal Year (April - March)

**All reports aligned to Indian financial year**

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Report Period                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Select:                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │This     │ │This     │ │This FY  │ │Last FY  │              │
│  │Month    │ │Quarter  │ │2025-26  │ │2024-25  │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
│                                                                 │
│  FY 2025-26: April 1, 2025 - March 31, 2026                    │
│  Current Quarter: Q4 (Jan-Mar 2026)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3B.3 GST Compliance Ready

**Track GST for vendors and generate GST-friendly reports**

```sql
-- Vendor table enhancements for GST
ALTER TABLE vendors ADD COLUMN gstin TEXT;
ALTER TABLE vendors ADD COLUMN gst_registered BOOLEAN DEFAULT false;
ALTER TABLE vendors ADD COLUMN pan TEXT;

-- Bill payments with GST tracking
ALTER TABLE bill_payments ADD COLUMN gst_amount DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN cgst DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN sgst DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN igst DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN hsn_code TEXT;
```

**GST Features:**
- GSTIN validation (15-digit format)
- Auto-calculate GST from total (reverse calculation)
- GST-wise expense reports
- Input tax credit tracking
- GSTR-2 ready data export

### 3B.4 TDS Tracking for Services

**Track TDS deductions for service provider payments**

```
┌─────────────────────────────────────────────────────────────────┐
│  Service Payment with TDS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Provider: Raju Electrician                                     │
│  PAN: ABCDE1234F ✓                                             │
│                                                                 │
│  Gross Amount:     ₹10,000                                     │
│  TDS @10% (194C):  ₹1,000                                      │
│  Net Payable:      ₹9,000                                      │
│                                                                 │
│  ☑️ Generate TDS Certificate (Form 16A)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**TDS Sections Supported:**
- 194C - Contractor payments
- 194J - Professional fees
- 194I - Rent payments
- 194H - Commission

### 3B.5 Regional Language Support

**Full UI in Indian languages**

| Language | Status | Coverage |
|----------|--------|----------|
| English | Phase 1 | 100% |
| Hindi | Phase 1 | 100% |
| Kannada | Phase 2 | 80% |
| Tamil | Phase 2 | 80% |
| Telugu | Phase 2 | 80% |
| Marathi | Phase 3 | UI only |
| Bengali | Phase 3 | UI only |
| Gujarati | Phase 3 | UI only |

**Implementation:**
- i18n framework (next-intl)
- Product names in regional languages
- Voice input in regional languages
- Reports can be generated in preferred language

### 3B.6 Indian Number Formatting

**Lakhs and Crores, not millions**

| Amount | International | Indian (ManageKar) |
|--------|---------------|-------------------|
| 100000 | 100,000 | 1,00,000 |
| 1500000 | 1,500,000 | 15,00,000 |
| 10000000 | 10,000,000 | 1,00,00,000 |

```typescript
// Already implemented in ManageKar
formatIndianCurrency(1500000) // "₹15,00,000"
formatInWords(1500000) // "Fifteen Lakhs"
```

---

## Part 3C: Kitchen/Mess Management (PG Special)

> **Built specifically for PG/Hostel kitchen operations**

### 3C.1 Per-Person Cost Calculator

**Track food cost per tenant**

```
┌─────────────────────────────────────────────────────────────────┐
│  🍽️ Per-Person Food Cost Analysis                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  January 2026                    Sunrise PG (42 tenants)       │
│                                                                 │
│  Total Kitchen Spend:     ₹1,26,000                            │
│  Days in Month:           31                                    │
│  Avg Daily Spend:         ₹4,065                               │
│  Per Person Per Day:      ₹96.78                               │
│  Per Person Per Month:    ₹3,000                               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Breakdown by Category:                                         │
│  • Vegetables:   ₹32,000 (₹762/person)                         │
│  • Grocery:      ₹45,000 (₹1,071/person)                       │
│  • Dairy:        ₹28,000 (₹667/person)                         │
│  • Others:       ₹21,000 (₹500/person)                         │
│                                                                 │
│  💡 Insight: Your per-person cost is ₹200 below Bangalore avg  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3C.2 Menu Planning Integration (Future)

**Link daily menu to ingredient costs**

```
Monday Menu:
├── Breakfast: Idli Sambar
│   └── Ingredients: Rice ₹12, Urad dal ₹8, Vegetables ₹15 = ₹35
├── Lunch: Rice, Dal, Sabzi, Roti
│   └── Ingredients: Rice ₹15, Dal ₹12, Vegetables ₹20, Wheat ₹8 = ₹55
└── Dinner: Chapati, Paneer, Dal
    └── Ingredients: Wheat ₹10, Paneer ₹40, Dal ₹12 = ₹62

Daily Menu Cost: ₹152/person
Monthly Projection: ₹4,560/person
```

### 3C.3 Wastage Tracking

**Monitor and reduce food waste**

```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️ Wastage Log                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Date: Jan 31, 2026                                            │
│                                                                 │
│  Item              │ Qty Wasted │ Reason        │ Value        │
│  ──────────────────┼────────────┼───────────────┼──────────    │
│  Cooked Rice       │ 2 kg       │ Over-prepared │ ₹50          │
│  Vegetables        │ 0.5 kg     │ Spoiled       │ ₹25          │
│  Milk              │ 1 ltr      │ Expired       │ ₹60          │
│                                                                 │
│  Today's Wastage: ₹135                                         │
│  Monthly Wastage: ₹2,100 (1.7% of spend)                       │
│                                                                 │
│  💡 Industry benchmark: <2%. You're doing well!                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3C.4 Inventory Alerts

**Never run out of essentials**

```
⚠️ LOW STOCK ALERTS

Item          │ Current │ Avg Daily Use │ Days Left │ Action
──────────────┼─────────┼───────────────┼───────────┼──────────
Rice          │ 10 kg   │ 5 kg          │ 2 days    │ [Order Now]
Cooking Oil   │ 2 ltr   │ 0.5 ltr       │ 4 days    │ [Add to List]
Sugar         │ 1 kg    │ 0.3 kg        │ 3 days    │ [Order Now]
```

---

## Part 3D: WhatsApp Integration (Indian Favorite)

### 3D.1 WhatsApp Expense Entry

**Send expenses via WhatsApp - no app needed**

```
User WhatsApp Message:
"Sabzi 500
Doodh 300
Raju electrician 800"

ManageKar Bot Response:
"✅ Added 3 expenses:
1. Sabzi (Vegetables) - ₹500
2. Doodh (Dairy) - ₹300
3. Raju electrician (Service) - ₹800

Total: ₹1,600
Reply 'OK' to confirm or 'EDIT' to modify"
```

### 3D.2 WhatsApp Reports

```
User: "Report"

Bot: "📊 January 2026 Summary
Kitchen: ₹45,230
Bills: ₹28,400
Services: ₹12,500
Total: ₹86,130

Reply 'DETAIL' for breakdown"
```

### 3D.3 WhatsApp Reminders

```
Bot: "⏰ Reminder: BESCOM bill due in 3 days
Amount: ₹15,420
Due: Feb 10, 2026

Reply 'PAID' when done or 'SNOOZE' for later"
```

---

## Part 3E: Financial Intelligence Dashboard

### 3E.1 Cash Flow Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 Cash Flow - January 2026                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INFLOWS (from Tenant module if connected)                     │
│  ─────────────────────────────────────────                     │
│  Rent Collections:        ₹4,20,000                            │
│  Maintenance Fees:        ₹42,000                              │
│  Other Income:            ₹8,000                               │
│  Total Inflows:           ₹4,70,000                            │
│                                                                 │
│  OUTFLOWS                                                       │
│  ─────────────────────────────────────────                     │
│  Kitchen/Daily Spend:     ₹45,230                              │
│  Utility Bills:           ₹28,400                              │
│  Services/Repairs:        ₹12,500                              │
│  Salaries:                ₹65,000                              │
│  Other Expenses:          ₹15,000                              │
│  Total Outflows:          ₹1,66,130                            │
│                                                                 │
│  NET CASH FLOW:           ₹3,03,870 ✅                         │
│  Operating Margin:        64.6%                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3E.2 Profitability Analysis (Per Property)

```
Property: Sunrise PG
──────────────────────────────────────────
Monthly Revenue:        ₹4,70,000
Monthly Expenses:       ₹1,66,130
─────────────────────────────────
Gross Profit:           ₹3,03,870
Profit Margin:          64.6%

Expense Breakdown:
├── Fixed (Salary, Rent, EMI):     ₹85,000 (51%)
├── Variable (Kitchen, Utils):     ₹73,630 (44%)
└── Discretionary (Repairs):       ₹7,500 (5%)

💡 Recommendation: Variable costs are 12% above benchmark.
   Focus on kitchen efficiency to improve margins.
```

### 3E.3 Year-over-Year Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│  📈 YoY Comparison: January                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Category        │ Jan 2025 │ Jan 2026 │ Change    │ Trend     │
│  ────────────────┼──────────┼──────────┼───────────┼─────────  │
│  Kitchen         │ ₹38,500  │ ₹45,230  │ +₹6,730   │ ↑ 17.5%  │
│  Electricity     │ ₹14,200  │ ₹15,420  │ +₹1,220   │ ↑ 8.6%   │
│  Water           │ ₹3,100   │ ₹3,400   │ +₹300     │ ↑ 9.7%   │
│  Services        │ ₹9,800   │ ₹12,500  │ +₹2,700   │ ↑ 27.5%  │
│  ────────────────┼──────────┼──────────┼───────────┼─────────  │
│  TOTAL           │ ₹65,600  │ ₹76,550  │ +₹10,950  │ ↑ 16.7%  │
│                                                                 │
│  💡 Kitchen costs rising faster than inflation (6%).           │
│     Review vendor pricing and portion sizes.                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3E.4 Budget Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Budget vs Actual - January 2026                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Category      │ Budget   │ Actual   │ Variance  │ Status      │
│  ──────────────┼──────────┼──────────┼───────────┼───────────  │
│  Kitchen       │ ₹40,000  │ ₹45,230  │ -₹5,230   │ 🔴 Over    │
│  Electricity   │ ₹16,000  │ ₹15,420  │ +₹580     │ 🟢 Under   │
│  Water         │ ₹4,000   │ ₹3,400   │ +₹600     │ 🟢 Under   │
│  Services      │ ₹15,000  │ ₹12,500  │ +₹2,500   │ 🟢 Under   │
│  ──────────────┼──────────┼──────────┼───────────┼───────────  │
│  TOTAL         │ ₹75,000  │ ₹76,550  │ -₹1,550   │ 🟡 Slight  │
│                                                                 │
│  Progress: ██████████████████░░░░░░░░░░░░ 102%                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3F: Tax & Compliance Reports

### 3F.1 ITR-Ready Summary

**Generate tax-ready expense summary**

```
┌─────────────────────────────────────────────────────────────────┐
│  📑 FY 2025-26 Expense Summary (ITR Ready)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DEDUCTIBLE EXPENSES                                            │
│  ─────────────────────────────────────────                     │
│  Repairs & Maintenance:        ₹1,45,000                       │
│  Utility Bills:                ₹3,40,800                       │
│  Staff Salaries:               ₹7,80,000                       │
│  Insurance:                    ₹48,000                         │
│  Professional Fees:            ₹35,000                         │
│  ─────────────────────────────────────────                     │
│  Total Deductible:             ₹13,48,800                      │
│                                                                 │
│  NON-DEDUCTIBLE / PERSONAL                                      │
│  ─────────────────────────────────────────                     │
│  Owner Food/Personal:          ₹24,000                         │
│  Capital Expenses:             ₹85,000                         │
│  ─────────────────────────────────────────                     │
│                                                                 │
│  [📥 Download PDF]  [📧 Email to CA]  [📊 View Breakdown]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3F.2 TDS Summary Report

```
FY 2025-26 TDS Deducted (Section 194C/194J)
───────────────────────────────────────────────────────────────

Provider          │ PAN         │ Gross    │ TDS     │ Net Paid
──────────────────┼─────────────┼──────────┼─────────┼──────────
Raju Electrician  │ ABCDE1234F  │ ₹85,000  │ ₹8,500  │ ₹76,500
Sharma Plumbing   │ FGHIJ5678K  │ ₹42,000  │ ₹4,200  │ ₹37,800
AC Care Services  │ KLMNO9012P  │ ₹68,000  │ ₹6,800  │ ₹61,200
──────────────────┼─────────────┼──────────┼─────────┼──────────
TOTAL             │             │ ₹1,95,000│ ₹19,500 │ ₹1,75,500

[Generate Form 26Q]  [Download TDS Certificates]
```

---

## Part 4: Database Schema

### New Tables

```sql
-- ============================================
-- EXPENSE MODULE TABLES
-- ============================================

-- Product Master (for kitchen/daily spend)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  default_unit TEXT, -- Kg, Ltr, Pcs, etc.
  default_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

-- Product Categories
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

-- Daily Spend Entries
CREATE TABLE daily_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  property_id UUID REFERENCES properties(id), -- Optional link

  spend_date DATE NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL, -- Denormalized for history
  category_name TEXT, -- Denormalized

  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,

  notes TEXT,
  receipt_url TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

-- Vendors/Parties
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  name TEXT NOT NULL,
  category TEXT, -- Electricity, Water, Supplies, etc.
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,

  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name)
);

-- Bill Payments
CREATE TABLE bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  property_id UUID REFERENCES properties(id), -- Optional link

  vendor_id UUID REFERENCES vendors(id),
  vendor_name TEXT NOT NULL, -- Denormalized
  category TEXT NOT NULL,

  bill_number TEXT,
  bill_period TEXT, -- "Jan 2026", "Q1 2026", etc.
  bill_date DATE,
  due_date DATE,

  bill_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2),
  payment_date DATE,
  payment_mode TEXT, -- Cash, Bank Transfer, UPI, Cheque
  payment_reference TEXT,

  status TEXT DEFAULT 'pending', -- pending, paid, overdue

  receipt_url TEXT,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

-- Service Providers
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Electrician, Plumber, Carpenter, etc.
  phone TEXT,
  alternate_phone TEXT,
  address TEXT,

  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, name, category)
);

-- Service Payments
CREATE TABLE service_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  property_id UUID REFERENCES properties(id), -- Optional
  room_id UUID REFERENCES rooms(id), -- Optional

  provider_id UUID REFERENCES service_providers(id),
  provider_name TEXT NOT NULL, -- Denormalized
  category TEXT NOT NULL,

  service_date DATE NOT NULL,
  description TEXT NOT NULL,

  amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT,
  payment_reference TEXT,

  warranty_months INTEGER DEFAULT 0,
  warranty_expiry DATE,

  photos JSONB DEFAULT '[]', -- Array of photo URLs
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

-- Bill Categories (User-defined)
CREATE TABLE bill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, name)
);

-- Service Categories (User-defined)
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, name)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_daily_spend_workspace_date ON daily_spend(workspace_id, spend_date DESC);
CREATE INDEX idx_daily_spend_property ON daily_spend(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_daily_spend_product ON daily_spend(product_id);

CREATE INDEX idx_bill_payments_workspace ON bill_payments(workspace_id, payment_date DESC);
CREATE INDEX idx_bill_payments_vendor ON bill_payments(vendor_id);
CREATE INDEX idx_bill_payments_status ON bill_payments(workspace_id, status);

CREATE INDEX idx_service_payments_workspace ON service_payments(workspace_id, service_date DESC);
CREATE INDEX idx_service_payments_provider ON service_payments(provider_id);
CREATE INDEX idx_service_payments_property ON service_payments(property_id) WHERE property_id IS NOT NULL;

-- Soft delete partial indexes
CREATE INDEX idx_daily_spend_active ON daily_spend(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bill_payments_active ON bill_payments(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_payments_active ON service_payments(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_active ON vendors(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_providers_active ON service_providers(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active ON products(workspace_id) WHERE deleted_at IS NULL;
```

### Enhanced Tables for AI & India Features

```sql
-- ============================================
-- AI FEATURES TABLES
-- ============================================

-- Price History (for anomaly detection & predictions)
CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  product_id UUID NOT NULL REFERENCES products(id),

  recorded_date DATE NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  vendor_id UUID REFERENCES vendors(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_product ON product_price_history(product_id, recorded_date DESC);

-- AI Alerts & Insights
CREATE TABLE expense_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  alert_type TEXT NOT NULL, -- 'price_spike', 'anomaly', 'duplicate', 'budget_breach', 'savings'
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Alert-specific data

  related_entity_type TEXT, -- 'daily_spend', 'bill_payment', 'service_payment'
  related_entity_id UUID,

  status TEXT DEFAULT 'active', -- 'active', 'dismissed', 'actioned'
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES user_profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_alerts_workspace ON expense_alerts(workspace_id, status, created_at DESC);

-- Expense Budgets
CREATE TABLE expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  property_id UUID REFERENCES properties(id),

  category TEXT NOT NULL,
  budget_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'

  amount DECIMAL(10,2) NOT NULL,
  fiscal_year TEXT, -- '2025-26'
  month INTEGER, -- 1-12 for monthly budgets
  quarter INTEGER, -- 1-4 for quarterly budgets

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(workspace_id, property_id, category, budget_type, fiscal_year, month, quarter)
);

-- Receipt OCR Results
CREATE TABLE receipt_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  image_url TEXT NOT NULL,
  ocr_raw_text TEXT,
  ocr_structured_data JSONB, -- Extracted vendor, items, amounts
  ocr_confidence DECIMAL(3,2), -- 0.00 to 1.00

  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'confirmed', 'failed'

  linked_entity_type TEXT, -- 'daily_spend', 'bill_payment'
  linked_entity_ids UUID[], -- Can link to multiple entries

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Wastage Tracking (Kitchen)
CREATE TABLE kitchen_wastage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  property_id UUID REFERENCES properties(id),

  wastage_date DATE NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,

  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  estimated_value DECIMAL(10,2) NOT NULL,

  reason TEXT, -- 'over_prepared', 'spoiled', 'expired', 'other'
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- ============================================
-- INDIA-SPECIFIC TABLES
-- ============================================

-- GST Details for Bill Payments (extends bill_payments)
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS cgst DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS sgst DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS igst DECIMAL(10,2);
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- TDS Tracking for Service Payments
ALTER TABLE service_payments ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT false;
ALTER TABLE service_payments ADD COLUMN IF NOT EXISTS tds_section TEXT; -- '194C', '194J', etc.
ALTER TABLE service_payments ADD COLUMN IF NOT EXISTS tds_rate DECIMAL(5,2);
ALTER TABLE service_payments ADD COLUMN IF NOT EXISTS tds_amount DECIMAL(10,2);
ALTER TABLE service_payments ADD COLUMN IF NOT EXISTS gross_amount DECIMAL(10,2);

-- Service Provider PAN (for TDS)
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT false;
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS default_tds_section TEXT;

-- UPI Payment Details
CREATE TABLE payment_upi_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL, -- 'bill_payment', 'service_payment', 'daily_spend'
  entity_id UUID NOT NULL,

  upi_app TEXT, -- 'gpay', 'phonepe', 'paytm', 'bhim', 'bank'
  upi_id TEXT, -- vendor's UPI ID
  transaction_id TEXT, -- UTR number
  screenshot_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upi_details_entity ON payment_upi_details(entity_type, entity_id);

-- Vendor UPI IDs
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE service_providers ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- WhatsApp Integration Log
CREATE TABLE whatsapp_expense_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  phone_number TEXT NOT NULL,
  user_id UUID REFERENCES user_profiles(id),

  message_type TEXT NOT NULL, -- 'expense_entry', 'report_request', 'confirmation'
  raw_message TEXT NOT NULL,
  parsed_data JSONB,

  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'confirmed', 'failed'

  created_expenses UUID[], -- Array of created expense IDs

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

### Default Categories (Seeded)

```sql
-- Product Categories (Kitchen) - with Hindi names
INSERT INTO product_categories (workspace_id, name, name_hi, sort_order) VALUES
  (ws_id, 'Vegetables', 'सब्जियां', 1),
  (ws_id, 'Fruits', 'फल', 2),
  (ws_id, 'Grocery', 'किराना', 3),
  (ws_id, 'Dairy', 'दूध/डेयरी', 4),
  (ws_id, 'Meat & Poultry', 'मांस', 5),
  (ws_id, 'Spices', 'मसाले', 6),
  (ws_id, 'Beverages', 'पेय पदार्थ', 7),
  (ws_id, 'Snacks', 'नाश्ता', 8),
  (ws_id, 'Cleaning', 'सफाई', 9),
  (ws_id, 'Other', 'अन्य', 99);

-- Bill Categories
INSERT INTO bill_categories (workspace_id, name, sort_order) VALUES
  (ws_id, 'Electricity', 1),
  (ws_id, 'Water', 2),
  (ws_id, 'Gas/Cylinder', 3),
  (ws_id, 'Internet', 4),
  (ws_id, 'Maintenance', 5),
  (ws_id, 'Insurance', 6),
  (ws_id, 'Tax', 7),
  (ws_id, 'Other', 99);

-- Service Categories
INSERT INTO service_categories (workspace_id, name, sort_order) VALUES
  (ws_id, 'Electrician', 1),
  (ws_id, 'Plumber', 2),
  (ws_id, 'Carpenter', 3),
  (ws_id, 'AC Service', 4),
  (ws_id, 'Cleaning', 5),
  (ws_id, 'Pest Control', 6),
  (ws_id, 'Painting', 7),
  (ws_id, 'Security', 8),
  (ws_id, 'Other', 99);
```

---

## Part 5: Integration Strategy

### 5.1 Standalone Mode (No Dependencies)

When used without other modules:

```typescript
// Expense module works with just workspace_id
const expenses = await supabase
  .from('daily_spend')
  .select('*')
  .eq('workspace_id', workspaceId)
  .is('property_id', null) // No property linking
```

### 5.2 Property Integration

When Properties module is used:

```typescript
// Expenses can be linked to properties
const expenses = await supabase
  .from('daily_spend')
  .select(`
    *,
    property:properties(id, name)
  `)
  .eq('workspace_id', workspaceId)

// Property-level expense reports
const propertyExpenses = await supabase
  .rpc('get_property_expenses', {
    p_property_id: propertyId,
    p_start_date: startDate,
    p_end_date: endDate
  })
```

### 5.3 Full Integration (Unified Financial View)

When all modules are used:

```typescript
// Unified expense dashboard combining:
// 1. Daily spend (kitchen)
// 2. Bill payments
// 3. Service payments
// 4. Property maintenance from complaints
// 5. Tenant-related refunds

interface UnifiedExpenseView {
  source: 'daily_spend' | 'bill_payment' | 'service' | 'maintenance' | 'refund'
  date: string
  category: string
  description: string
  amount: number
  property?: { id: string; name: string }
  vendor?: string
}

// RPC for unified view
CREATE OR REPLACE FUNCTION get_unified_expenses(
  p_workspace_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_property_id UUID DEFAULT NULL
) RETURNS TABLE (
  source TEXT,
  date DATE,
  category TEXT,
  description TEXT,
  amount DECIMAL,
  property_id UUID,
  property_name TEXT,
  vendor TEXT
) AS $$
BEGIN
  RETURN QUERY

  -- Daily Spend
  SELECT
    'daily_spend'::TEXT,
    ds.spend_date,
    ds.category_name,
    ds.product_name || ' x ' || ds.quantity || ' ' || ds.unit,
    ds.total,
    ds.property_id,
    p.name,
    NULL::TEXT
  FROM daily_spend ds
  LEFT JOIN properties p ON ds.property_id = p.id
  WHERE ds.workspace_id = p_workspace_id
    AND ds.spend_date BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR ds.property_id = p_property_id)
    AND ds.deleted_at IS NULL

  UNION ALL

  -- Bill Payments
  SELECT
    'bill_payment'::TEXT,
    bp.payment_date,
    bp.category,
    bp.vendor_name || COALESCE(' - ' || bp.bill_number, ''),
    bp.paid_amount,
    bp.property_id,
    p.name,
    bp.vendor_name
  FROM bill_payments bp
  LEFT JOIN properties p ON bp.property_id = p.id
  WHERE bp.workspace_id = p_workspace_id
    AND bp.payment_date BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR bp.property_id = p_property_id)
    AND bp.deleted_at IS NULL

  UNION ALL

  -- Service Payments
  SELECT
    'service'::TEXT,
    sp.service_date,
    sp.category,
    sp.description,
    sp.amount,
    sp.property_id,
    p.name,
    sp.provider_name
  FROM service_payments sp
  LEFT JOIN properties p ON sp.property_id = p.id
  WHERE sp.workspace_id = p_workspace_id
    AND sp.service_date BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR sp.property_id = p_property_id)
    AND sp.deleted_at IS NULL

  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## Part 6: UI/UX Design

### 6.1 Navigation Structure

```
Expenses (Main Menu)
├── Dashboard (Overview + Quick Entry)
├── Daily Spend
│   ├── Entry
│   ├── History
│   └── Products (Master)
├── Bills
│   ├── Record Payment
│   ├── History
│   ├── Vendors
│   └── Due Bills
├── Services
│   ├── Record Payment
│   ├── History
│   └── Providers
├── Reports
│   ├── Summary
│   ├── By Category
│   ├── By Property
│   └── Trends
└── Settings
    ├── Categories
    └── Import/Export
```

### 6.2 Dashboard Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Expenses Dashboard                           [This Month ▼]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ ₹45,230  │  │ ₹28,400  │  │ ₹12,500  │  │ ₹86,130  │       │
│  │ Kitchen  │  │ Bills    │  │ Services │  │ Total    │       │
│  │ ↑12%     │  │ ↓5%      │  │ ↑8%      │  │ ↑6%      │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Quick Entry                                                    │
│  ───────────                                                    │
│  [🛒 Daily Spend]  [📄 Bill Payment]  [🔧 Service Payment]     │
│                                                                 │
├───────────────────────────────┬─────────────────────────────────┤
│  Recent Transactions          │  Pending Bills                  │
│  ────────────────────         │  ─────────────                  │
│  Today                        │                                 │
│  • Vegetables ₹450  10:30 AM  │  ⚠️ BESCOM - ₹15,420           │
│  • Milk ₹300        8:00 AM   │     Due: Feb 10                 │
│  Yesterday                    │  ⚠️ Internet - ₹1,200          │
│  • Grocery ₹2,100   6:00 PM   │     Due: Feb 5                  │
│  • AC Service ₹800  2:00 PM   │                                 │
│                               │  [View All]                     │
│  [View All]                   │                                 │
├───────────────────────────────┴─────────────────────────────────┤
│  Spending Trend (Last 30 Days)                                  │
│  ────────────────────────────                                   │
│  [Chart: Line graph showing daily spending]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Mobile-First Design

All expense entry screens optimized for mobile:

```
┌─────────────────────┐
│  Quick Spend Entry  │
├─────────────────────┤
│  [🔍 Search product]│
│                     │
│  Recent Products:   │
│  ┌─────┐ ┌─────┐   │
│  │Tomato│ │Milk │   │
│  └─────┘ └─────┘   │
│  ┌─────┐ ┌─────┐   │
│  │Onion│ │Rice │   │
│  └─────┘ └─────┘   │
│                     │
│  ─────────────────  │
│  Selected: Tomato   │
│  Qty: [2] Kg        │
│  Rate: [₹40]        │
│  ─────────────────  │
│  Total: ₹80         │
│                     │
│  [+ Add More]       │
│                     │
│  [💾 Save]          │
└─────────────────────┘
```

---

## Part 7: Improvements Over Excel

### Feature Comparison Matrix (Enhanced)

| Feature | Excel | Basic Apps | ManageKar |
|---------|-------|------------|-----------|
| **Data Entry** | Manual typing | Form-based | AI auto-fill, voice, OCR |
| **Calculations** | Formulas | Automatic | Automatic + predictions |
| **Receipts** | Not possible | Basic upload | OCR extraction, auto-categorize |
| **Mobile Access** | No | Yes | Yes + WhatsApp integration |
| **Multi-user** | Single file | Basic sharing | Real-time + role-based |
| **Search** | Ctrl+F | Basic search | AI-powered, smart filters |
| **Reports** | Manual pivot | Template reports | AI insights + custom reports |
| **Backups** | Manual | Cloud | Automatic + audit trail |
| **Reminders** | None | Basic | Smart, context-aware |
| **Integration** | None | Limited | Full module integration |
| **Offline** | Yes | Varies | PWA with sync |
| **Price Tracking** | Manual | None | AI anomaly detection |
| **Audit Trail** | None | Basic | Complete forensic trail |
| **Duplicate Check** | None | None | AI-powered detection |
| **GST Compliance** | Manual | Basic | Auto-calculate, reports |
| **TDS Tracking** | Manual | None | Auto-deduct, Form 26Q |
| **UPI Integration** | None | None | Full UPI app support |
| **Voice Entry** | None | None | Hindi + English |
| **Language Support** | English | English | 8 Indian languages |
| **Per-Person Cost** | Manual calc | None | Auto per property |
| **Wastage Tracking** | None | None | Built-in with insights |
| **Budget Alerts** | None | Basic | Predictive breach alerts |
| **Vendor Compare** | Manual | None | AI price comparison |

### Why ManageKar Wins

#### vs Excel (Client's Current System)

| Pain Point | Excel Problem | ManageKar Solution |
|------------|--------------|-------------------|
| 11 sheets to manage | Fragmented, error-prone | Single unified interface |
| No mobile entry | Must be at computer | Enter from anywhere |
| Manual calculations | Formula errors | 100% automatic |
| No receipt storage | Bills get lost | Permanent cloud storage |
| Single user | Can't delegate | Staff can enter, owner approves |
| No insights | Just raw data | AI-powered recommendations |
| Tax filing nightmare | Manual compilation | One-click ITR summary |

#### vs Other Indian Expense Apps

| Competitor Weakness | ManageKar Strength |
|--------------------|-------------------|
| Generic expense tracking | Built for PG/Hostel operations |
| No kitchen management | Full mess cost tracking |
| No integration | Connects with tenant/room/payment |
| English only | 8 Indian languages |
| No WhatsApp | Full WhatsApp support |
| Manual categorization | AI auto-categorization |
| No per-tenant cost | Automatic per-person calculations |

### Unique Value Propositions (Updated)

**For PG/Hostel Owners:**

1. **AI Receipt Scanner** - Take photo, data extracted automatically
2. **WhatsApp Entry** - Kitchen staff can add expenses via WhatsApp
3. **Per-Person Cost** - Know exact food cost per tenant
4. **Vendor Price Comparison** - AI finds cheaper alternatives
5. **Predictive Budgeting** - Know next month's expenses today
6. **Wastage Tracking** - Reduce kitchen waste by 20%
7. **GST/TDS Ready** - Tax compliance built-in
8. **Multi-Property** - Compare costs across all properties
9. **Hindi Voice Entry** - Speak expenses in Hindi
10. **Smart Alerts** - Get warned before problems happen

**The Ultimate Pitch:**

> "Why spend 2 hours daily managing 11 Excel sheets when ManageKar does it in 5 minutes? Take a photo of your receipt, speak your expenses in Hindi, or just WhatsApp them. AI handles the rest. Your CA will thank you at tax time."

---

## Part 8: Implementation Phases (Revised)

### Phase 1: Foundation (Week 1-2)

- [ ] Create database tables and migrations (all new tables)
- [ ] Build product master CRUD with Hindi name support
- [ ] Build daily spend entry/list
- [ ] Basic category management
- [ ] RLS policies for all tables
- [ ] Indian number formatting throughout

### Phase 2: Bills & Vendors (Week 3-4)

- [ ] Vendor directory with UPI ID support
- [ ] Bill payment recording with GST fields
- [ ] Receipt upload integration (Supabase Storage)
- [ ] Due date tracking with reminders
- [ ] Payment mode support (UPI apps, bank, cash, cheque)
- [ ] Basic duplicate detection

### Phase 3: Services & TDS (Week 5-6)

- [ ] Service provider directory with PAN
- [ ] Service payment recording with TDS
- [ ] Photo documentation (before/after)
- [ ] Warranty tracking with alerts
- [ ] TDS calculation and deduction

### Phase 4: India Features (Week 7-8)

- [ ] Indian fiscal year support (April-March)
- [ ] GST compliance reports
- [ ] TDS summary and Form 26Q data
- [ ] Hindi language support (UI + categories)
- [ ] UPI transaction linking
- [ ] Per-person cost calculator

### Phase 5: Integration & Reports (Week 9-10)

- [ ] Property linking (optional)
- [ ] Unified expense view
- [ ] Cross-module reports
- [ ] Dashboard widgets
- [ ] Budget tracking with alerts
- [ ] ITR-ready expense summary
- [ ] Excel import tool

### Phase 6: AI Features (Week 11-14)

- [ ] Receipt OCR integration (Google Cloud Vision)
- [ ] Smart categorization model
- [ ] Price anomaly detection
- [ ] Duplicate expense detection
- [ ] Predictive expense forecasting
- [ ] Smart alerts system
- [ ] Vendor price comparison

### Phase 7: Advanced Features (Week 15-16)

- [ ] Voice entry (Hindi + English)
- [ ] WhatsApp bot integration
- [ ] Kitchen wastage tracking
- [ ] Menu cost planning
- [ ] Cash flow visualization
- [ ] YoY comparison reports

### Phase 8: Regional Expansion (Week 17-20)

- [ ] Kannada, Tamil, Telugu language support
- [ ] Regional product name database
- [ ] State-specific GST handling
- [ ] Marathi, Bengali, Gujarati (UI only)

### MVP Scope (Phases 1-5)

The MVP delivers a **production-ready expense module** in 10 weeks with:
- Full expense tracking (daily, bills, services)
- India-specific features (GST, TDS, fiscal year, UPI)
- Basic reports and budget tracking
- Hindi language support
- Receipt storage

AI features and WhatsApp integration come in subsequent phases to ensure solid foundation first.

---

## Part 9: API Endpoints

### Daily Spend

```
POST   /api/expenses/daily-spend          Create entry
GET    /api/expenses/daily-spend          List entries (with filters)
GET    /api/expenses/daily-spend/:id      Get single entry
PUT    /api/expenses/daily-spend/:id      Update entry
DELETE /api/expenses/daily-spend/:id      Soft delete

POST   /api/expenses/daily-spend/bulk     Bulk create entries
```

### Products

```
GET    /api/expenses/products             List products
POST   /api/expenses/products             Create product
PUT    /api/expenses/products/:id         Update product
DELETE /api/expenses/products/:id         Soft delete

GET    /api/expenses/product-categories   List categories
POST   /api/expenses/product-categories   Create category
```

### Bills

```
POST   /api/expenses/bills                Record payment
GET    /api/expenses/bills                List bills
GET    /api/expenses/bills/pending        List due/overdue
PUT    /api/expenses/bills/:id            Update
DELETE /api/expenses/bills/:id            Soft delete
```

### Vendors

```
GET    /api/expenses/vendors              List vendors
POST   /api/expenses/vendors              Create vendor
PUT    /api/expenses/vendors/:id          Update
DELETE /api/expenses/vendors/:id          Soft delete
```

### Services

```
POST   /api/expenses/services             Record payment
GET    /api/expenses/services             List services
PUT    /api/expenses/services/:id         Update
DELETE /api/expenses/services/:id         Soft delete
```

### Service Providers

```
GET    /api/expenses/providers            List providers
POST   /api/expenses/providers            Create provider
PUT    /api/expenses/providers/:id        Update
DELETE /api/expenses/providers/:id        Soft delete
```

### Reports

```
GET    /api/expenses/reports/summary      Period summary
GET    /api/expenses/reports/by-category  Category breakdown
GET    /api/expenses/reports/by-property  Property breakdown
GET    /api/expenses/reports/trends       Spending trends
GET    /api/expenses/reports/unified      Unified expense view
```

---

## Part 10: Success Metrics

### User Adoption

- Daily spend entries per user
- Receipt upload rate
- Mobile vs desktop usage ratio

### Data Quality

- Product master utilization (% entries using catalog)
- Duplicate entry rate
- Receipt attachment rate

### Business Value

- Time saved vs Excel (target: 50% reduction)
- Bill payment on-time rate
- Expense visibility (% categorized)

---

## Appendix: Migration from Excel

### Import Tool Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Import Expense Data                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Upload File                                            │
│  ───────────────────                                            │
│  [📄 Drop Excel/CSV file here or click to browse]              │
│                                                                 │
│  Supported formats: .xlsx, .csv                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Step 2: Map Columns                                            │
│  ───────────────────                                            │
│  Your Column    →    ManageKar Field                           │
│  ────────────────────────────────────                          │
│  Date           →    [spend_date ▼]                            │
│  Product        →    [product_name ▼]                          │
│  Qty            →    [quantity ▼]                              │
│  Rate           →    [rate ▼]                                  │
│  Total          →    [total ▼]                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Step 3: Preview & Import                                       │
│  ───────────────────────                                        │
│  ✅ 12,144 records ready to import                             │
│  ⚠️ 23 records with missing dates (will use today)             │
│  ❌ 5 records with invalid amounts (will skip)                 │
│                                                                 │
│  [Cancel]                              [Import 12,139 Records]  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

This enhanced expense module transforms ManageKar from a PG management tool into **India's most intelligent business expense platform**.

### What Makes This World-Class

| Dimension | Our Approach |
|-----------|--------------|
| **AI-First** | Not an afterthought - AI powers core features from OCR to predictions |
| **India-First** | Built for Indian businesses - GST, TDS, UPI, Hindi, fiscal year |
| **PG-First** | Kitchen tracking, per-person costs, mess management - no one else does this |
| **Integration-First** | Works alone, becomes magical with other modules |
| **Mobile-First** | WhatsApp, voice, camera - entry methods that match Indian reality |

### The Competitive Moat

```
┌─────────────────────────────────────────────────────────────────┐
│                    ManageKar Expense Module                      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AI Receipt   │  │ WhatsApp     │  │ Voice Entry  │          │
│  │ Scanner      │  │ Integration  │  │ (Hindi)      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                          │                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │           INDIA-SPECIFIC FOUNDATION              │          │
│  │  GST | TDS | UPI | Fiscal Year | 8 Languages    │          │
│  └──────────────────────────────────────────────────┘          │
│                          │                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │           PG/HOSTEL SPECIALIZATION               │          │
│  │  Kitchen | Per-Person Cost | Wastage | Menu     │          │
│  └──────────────────────────────────────────────────┘          │
│                          │                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │           MANAGEKAR ECOSYSTEM                    │          │
│  │  Tenants | Properties | Payments | Reports      │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Client Migration Story

**Before (11 Excel Sheets):**
- 2 hours daily managing expenses
- Bills get lost, no receipts
- Tax filing takes 2 weeks
- No insights, just data
- Owner must do everything

**After (ManageKar):**
- 15 minutes daily (85% time saved)
- Every bill photographed and searchable
- Tax reports generated in 1 click
- AI tells you where to save money
- Staff can enter, owner just approves

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time Saved** | 75%+ reduction | User survey |
| **Receipt Capture Rate** | 80%+ | Bills with photos |
| **AI Accuracy** | 90%+ | OCR + categorization |
| **Mobile Usage** | 60%+ | Entry method tracking |
| **WhatsApp Adoption** | 40%+ | Active WhatsApp users |
| **Budget Compliance** | 15% improvement | YoY comparison |
| **Tax Prep Time** | 80% reduction | User feedback |

### Final Word

> "ManageKar doesn't just track expenses - it **thinks about them for you**. It sees the price spike before you do. It knows your electricity bill is due before you forget. It tells you that you're spending ₹200 more per person than the Bangalore average. It speaks Hindi. It understands your receipt photo. It talks to you on WhatsApp.
>
> No Excel file. No generic expense app. No competitor built for Indian PG owners can do this.
>
> This is the expense module that makes clients say: *'How did I manage without this?'*"

---

## Appendix A: Technology Stack for AI Features

| Feature | Technology | Cost Estimate |
|---------|------------|---------------|
| Receipt OCR | Google Cloud Vision API | ~₹0.15 per receipt |
| Voice Recognition | Web Speech API (free) | Free |
| Smart Categorization | Custom TensorFlow model | Self-hosted |
| WhatsApp Integration | WhatsApp Business API | ~₹0.50 per conversation |
| Language Translation | Google Translate API | ~₹1 per 1000 chars |
| Anomaly Detection | Custom Python model | Self-hosted |

**Total AI Cost:** ~₹500-1000/month per active workspace

---

## Appendix B: Competitor Analysis

| App | Strengths | Weaknesses vs ManageKar |
|-----|-----------|------------------------|
| Khatabook | Simple, popular | No PG features, no AI |
| Vyapar | GST invoicing | B2B focused, no kitchen |
| Zoho Expense | Enterprise features | Too complex, expensive |
| Expensify | OCR, reports | No India features, USD |
| Money Manager | Personal finance | Not for business |

**ManageKar's unique position:** The only expense app built specifically for Indian PG/Hostel operations with AI intelligence.

---

*Document Version: 2.0 (Enhanced with AI & India Features)*
*Prepared for: Product Review*
*Ready for: Implementation Planning*
*Estimated Timeline: 20 weeks for full feature set, 10 weeks for MVP*
