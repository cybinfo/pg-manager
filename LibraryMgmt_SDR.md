# Software Design & Requirements Document
# Library Management System (LibraryMgmt)

**Version:** 1.0
**Date:** 15 March 2026
**Owner:** Rajat Seth (newgreenhigh@gmail.com)
**Status:** Production system (3+ years of data)

---

## 1. Executive Summary

This is a mobile-first application used daily to manage a physical library/study-space business in India. It tracks **members, subscriptions, payments, attendance, lockers, and user profiles**. The system has been in production for 3+ years and contains significant live data.

The app must work on **mobile phones** as the primary device (owner uses it on the floor while managing the library). Desktop/tablet support is secondary.

### Key Data Volumes (as of March 2026)
| Table | Records |
|---|---|
| Members (Library User List) | ~406 |
| Subscriptions (Library Payment Sheet) | ~2,048 |
| Payment Transactions (Payment Details) | ~2,117 |
| Attendance Records | ~1,085 |
| Lockers | ~31 |
| Inactive/Left Users | ~841 |

---

## 2. Data Source

All data is stored in a single **Google Sheets** spreadsheet:
- **Spreadsheet ID:** `1-n7p4XriAk-jXxsxoccoP9KBxSasmi4gU9x5qaArzHw`
- **URL:** https://docs.google.com/spreadsheets/d/1-n7p4XriAk-jXxsxoccoP9KBxSasmi4gU9x5qaArzHw/edit
- **14 sheet tabs** (detailed below)

The developer may choose to migrate this data to a proper database (PostgreSQL, Firebase, Supabase, etc.) but must provide a **one-time migration script** from the Google Sheet and ensure no data is lost.

---

## 3. Data Model

### 3.1 Entity Relationship Overview

```
Library User List (Master)
├── Library Payment Sheet (1:N) ── via User ID
│   ├── Payment Details (1:N) ── via Payment ID
│   └── Timings (1:N) ── via paymentId
├── attendance (1:N) ── via userId
├── lockerList (1:N) ── via userId
├── leftUsers (1:N) ── via userId
│   └── userInactiveDuration (1:N) ── via userId
├── userContactNumberInfoList (1:N) ── via userId
├── userEmailList (1:N) ── via userId
├── userFatherContactInfoList (1:N) ── via userId
├── userGuardianContactInfoList (1:N) ── via userId
├── userIdProofList (1:N) ── via userId
└── User Address List (1:N) ── via userId
```

### 3.2 Table Definitions

#### 3.2.1 Library User List (Master Table)
The central entity. Every other table references this via `User ID`.

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| User ID | Number | Yes (Key) | - | Primary key, auto-incrementing |
| Full Name | Text | Yes | - | IsLabel=true. Auto-uppercased on save |
| Gender | Enum | Yes | - | Values: Male, Female |
| fatherName | Text | No | - | Display: "Father Name". Auto-uppercased on save |
| userProfileImage | Image | No | - | Profile photo |
| addDatetime | DateTime | No | =NOW() | Hidden. System field |
| addedBy | Email | No | =USEREMAIL() | Hidden. System field |

**Computed/Virtual Columns (calculated, not stored):**

| Column | Type | Formula/Logic |
|---|---|---|
| User Status | Enum (Active/Inactive) | Check if user has an active record in `leftUsers` with `inactiveToDate >= TODAY()`. If yes = "Inactive", else = "Active" |
| Payment Till Date | Date | MAX of all `End Date` from Library Payment Sheet for this user |
| Overdue Days | Duration | If Payment Till Date < TODAY: TODAY - Payment Till Date, else 0 |
| Days Until Expiry | Duration | If Payment Till Date >= TODAY: Payment Till Date - TODAY, else 0 |
| Total Paid | Price (₹) | SUM of all `Amount Received` from Payment Details linked to this user's subscriptions |
| Calculated Email ID | Text | Primary email from userEmailList (where isPrimaryEmailId = TRUE) |
| Calculated Mobile Number | Text | Primary phone from userContactNumberInfoList (where isPrimaryNumber = TRUE) |
| Calculated Overdue Status | Enum | "Severely Overdue" (>30 days), "Overdue" (>0 days), "Current" |
| Last Visit | DateTime | MAX of `in` from attendance for this user |
| Active Lockers | Number | COUNT of lockerList records where returnKey = FALSE |
| Missing Data Count | Number | Count of missing items (see Missing Data logic below) |
| Missing Data Details | Text | Comma-separated list: "Phone, Email, ID Proof, Subscription, Photo, Parent Contact" |

**Missing Data Logic** (tracks profile completeness):
- Phone: No records in userContactNumberInfoList
- Email: No records in userEmailList
- ID Proof: No records in userIdProofList
- Subscription: Payment Till Date is blank
- Photo: userProfileImage is blank
- Parent Contact: No records in BOTH userFatherContactInfoList AND userGuardianContactInfoList

#### 3.2.2 Library Payment Sheet (Subscriptions)
Each subscription has a date range (Start Date to End Date) and a price. Multiple payment installments can be made against one subscription.

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| Payment ID | Text | Yes (Key) | =UNIQUEID() | Hidden. Auto-generated |
| User ID | Ref → Library User List | Yes | - | |
| Start Date | Date | Yes | - | Subscription period start |
| End Date | Date | Yes | - | Subscription period end |
| Hours | Number | No | - | Subscribed hours per day |
| Price | Price (₹, 0 decimals) | Yes | - | Total subscription price |
| addDatetime | DateTime | No | =NOW() | Hidden |
| addedBy | Email | No | =USEREMAIL() | Hidden |

**Computed Columns:**

| Column | Formula/Logic |
|---|---|
| Calculated Actual Payment Received | SUM of Amount Received from linked Payment Details |
| Balance Due | Price - Calculated Actual Payment Received |
| Related Full Name | Dereferenced from User ID → Full Name |

#### 3.2.3 Payment Details (Individual Transactions)
Each payment transaction against a subscription.

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| Payment Detail ID | Text | Yes (Key) | =UNIQUEID() | Hidden |
| Payment ID | Ref → Library Payment Sheet | Yes | - | Links to subscription |
| Amount Received | Price (₹, 0 decimals) | Yes | - | |
| MOP | Enum | Yes | Cash | Display: "Payment Mode". Values: Cash, UPI, Google Pay, PhonePe, Paytm, Bank Transfer, Card. AllowOther=true |
| DOP | Date | Yes | =TODAY() | Display: "Date of Payment" |
| addDatetime | DateTime | No | =NOW() | Hidden |
| addedBy | Email | No | =USEREMAIL() | Hidden |

**Computed:** `User ID` = dereferenced from Payment ID → User ID (for cross-table linking)

#### 3.2.4 attendance
Daily check-in/check-out tracking.

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| attendaceId | Text | Yes (Key) | =UNIQUEID() | Hidden. Note: original typo preserved |
| userId | Ref → Library User List | Yes | - | Display: "User" |
| in | DateTime | Yes | =NOW() | Check-in time. Pre-filled for quick entry |
| out | DateTime | No | - | Check-out time. Left blank on check-in, filled on checkout |
| addDatetime | DateTime | No | =NOW() | Hidden |
| addedBy | Email | No | =USEREMAIL() | Hidden |

**Computed Columns:**

| Column | Formula/Logic |
|---|---|
| Seated Hours | Duration. If `out` is filled: out - in. Else: NOW() - in (live counter) |
| Seating Status | Enum: "Seated" if out is blank, "Left" if out is filled |
| Calculated Attendance Date | Date portion of `in` (strips time) |
| Subscribed Hours | Number. Looks up Hours from the user's current active subscription |
| Overdue Hours | Text. Shows "Xh seated / Yh subscribed" |
| Calculated Overdue Status | Enum: "Overtime" if seated hours > subscribed hours, "Within Limit" otherwise |

#### 3.2.5 lockerList

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| lockerBookingId | Text | Yes (Key) | =UNIQUEID() | Hidden |
| userId | Ref → Library User List | Yes | - | Display: "User" |
| lockerNumber | Number | Yes | - | |
| security | Price (₹, 0 decimals) | No | - | Security deposit amount |
| returnKey | Yes/No | No | - | Display: "Key Returned?" |
| securityReturned | Yes/No | No | - | Display: "Security Refunded?" |
| addDatetime | DateTime | No | =NOW() | Hidden |
| addedBy | Email | No | =USEREMAIL() | Hidden |

**Computed:** `Ref User Status` = User's Calculated Overdue Status

#### 3.2.6 leftUsers (Inactive Users)

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| leftUserId | Text | Yes (Key) | =UNIQUEID() | Hidden |
| userId | Ref → Library User List | Yes | - | Display: "User" |
| leftDate | Date | Yes | =TODAY() | Date user was marked inactive |
| addDatetime | DateTime | No | =NOW() | Hidden |
| addedBy | Email | No | =USEREMAIL() | Hidden |

**Computed:** `Related Inactive To` = looks up inactiveToDate from userInactiveDuration

#### 3.2.7 userInactiveDuration

| Column | Type | Notes |
|---|---|---|
| inactiveDurationId | Text (Key) | Hidden, =UNIQUEID() |
| userId | Ref → Library User List | |
| inactiveFromDate | Date | |
| inactiveToDate | Date | |
| inactiveReason | Text | |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

#### 3.2.8 User Address List

| Column | Type | Notes |
|---|---|---|
| userAddressId | Text (Key) | Hidden, =UNIQUEID() |
| userId | Ref → Library User List | |
| addressType | Enum | Values: Permanent, Current, Office. AllowOther |
| mapAddress | LatLong | Map location |
| address | LongText | Full address |
| landmark | Text | |
| areaPinCode | Text | |
| areaName | Text | |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

#### 3.2.9 userContactNumberInfoList

| Column | Type | Notes |
|---|---|---|
| userContactNumberId | Text (Key) | |
| userId | Ref → Library User List | |
| numberType | Enum | |
| contactNumber | Number | |
| isPrimaryNumber | Yes/No | Display: "Primary?" |
| isWhatsappNumber | Yes/No | Display: "WhatsApp?" |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

**Computed:** `WhatsApp Link` = URL: "https://wa.me/91" + contactNumber

#### 3.2.10 userEmailList

| Column | Type | Notes |
|---|---|---|
| userEmailId | Text (Key) | |
| userId | Ref → Library User List | |
| emailId | Email | |
| isPrimaryEmailId | Yes/No | |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

#### 3.2.11 userFatherContactInfoList

| Column | Type | Notes |
|---|---|---|
| userFatherContactInfoId | Text (Key) | |
| userId | Ref → Library User List | |
| contactNumber | Number | |
| numberType | Enum | |
| fatherName | Text | |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

#### 3.2.12 userGuardianContactInfoList

| Column | Type | Notes |
|---|---|---|
| userGuardianContactInfoId | Text (Key) | |
| userId | Ref → Library User List | |
| contactNumber | Number | |
| numberType | Enum | |
| guardianName | Text | |
| relation | Text | |
| guardianAddress | Text | |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

#### 3.2.13 userIdProofList

| Column | Type | Notes |
|---|---|---|
| userIdProofId | Text (Key) | Hidden, =UNIQUEID() |
| userId | Ref → Library User List | |
| idProofType | Enum | Values: Aadhaar, PAN, Voter ID, Driving License, Passport. AllowOther |
| idNumber | Text | |
| idImage | Image | Photo of ID document |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

#### 3.2.14 Timings

| Column | Type | Notes |
|---|---|---|
| timingId | Text (Key) | Hidden, =UNIQUEID() |
| paymentId | Ref → Library Payment Sheet | Display: "Subscription" |
| startDate | Date | |
| fromTime | Time | |
| toTime | Time | |
| addDatetime / addedBy | DateTime / Email | Hidden, defaults |

---

## 4. Business Logic & Rules

### 4.1 User Status (Active/Inactive)
- A user is **Active** by default
- A user becomes **Inactive** when the owner taps "Mark Inactive" (which adds a record to `leftUsers`)
- The `userInactiveDuration` table tracks the inactive period (`inactiveToDate`)
- A user **automatically reactivates** when a new subscription payment is added (the inactiveToDate check recalculates)
- **Mark Inactive button condition:** Only visible when user is Active AND Payment Till Date < TODAY

### 4.2 Payment Flow
```
User → Creates Subscription (Library Payment Sheet)
     → Price = total subscription cost
     → Can make multiple partial payments (Payment Details)
     → Balance Due = Price - SUM(payments)
     → Each payment records: Amount, Mode (Cash/UPI/etc.), Date
```

### 4.3 Attendance Flow
```
Check-in: Owner taps "+" on attendance → userId selected, "in" auto-fills with NOW()
Check-out: Owner edits the record → fills "out" field
Live tracking: "Seated Hours" updates in real-time (NOW() - in) while seated
Overtime alert: If seated hours exceed subscribed hours → "Overtime" status
```

### 4.4 Locker Management
```
Assign locker → Record userId, lockerNumber, security deposit
Return key → Set returnKey = TRUE
Refund deposit → "Refund Security Deposit" action sets securityReturned = TRUE
               → Only available when returnKey = TRUE
```

### 4.5 Auto-Uppercase
When a new member form is saved, Full Name and fatherName are automatically converted to UPPERCASE.

### 4.6 Currency
- ALL monetary values use **₹ (Indian Rupees)**
- **0 decimal places** (no paise)
- Price columns: security deposit, subscription price, payment amounts

---

## 5. User Interface Requirements

### 5.1 Navigation Structure

**Bottom Navigation Bar (4 tabs - always visible):**
1. **Library User List** - All members, grouped by User Status (Active/Inactive) with COUNT
2. **Pending Payment** - Members with overdue payments, grouped by severity (Severely Overdue/Overdue) with COUNT
3. **Payment Summary** - All payment transactions, grouped by Date of Payment with SUM of amounts
4. **Subscription List** - Active subscriptions, grouped by End Date with COUNT

**Side Menu (5 items):**
1. **Attendance** - All attendance records, grouped by Date + Seating Status with COUNT
2. **Inactive Users** - Users who left, sorted by leftDate DESC
3. **Locker List** - All lockers, grouped by Key Returned + User Status with COUNT
4. **Payment By Date** - Payments grouped by Date + Payment Mode with COUNT
5. **Assistant** - Search across all members

### 5.2 View Display Rules

ALL list views must show as **card/deck layout** (NOT spreadsheet/table layout).

**Each view shows only specific columns:**

| View | Columns Shown |
|---|---|
| Library User List | Full Name, User Status, Payment Till Date, Overdue Status, Missing Data Details, Mobile Number |
| Pending Payment | Full Name, Payment Till Date, Overdue Days, Overdue Status, Mobile Number |
| Payment Summary | Payment ID, Amount Received, Payment Mode, Date of Payment |
| Subscription List | User ID, Start Date, End Date, Hours, Price, Balance Due |
| Attendance | User, In, Out, Seated Hours, Seating Status |
| Inactive Users | User, Left Date, Related Inactive To |
| Locker List | User, Locker Number, Security, Key Returned, Security Refunded |
| Payment By Date | Payment ID, Amount Received, Payment Mode, Date of Payment |

### 5.3 Member Detail Page
When tapping on a member, show in this order:
1. **Profile image** (header/hero)
2. **Full Name, Gender, Father Name, User Status**
3. **Contact:** Calculated Mobile Number, Calculated Email ID
4. **Payment info:** Payment Till Date, Overdue Status, Overdue Days, Days Until Expiry, Total Paid
5. **Activity:** Last Visit, Active Lockers
6. **Data quality:** Missing Data Details
7. **Related records:** Subscriptions, Attendance, Lockers, Phone Numbers, Emails, Father Contact, Guardian Contact, ID Proofs, Addresses

### 5.4 Quick Actions on Member Detail
| Action | Behavior | Icon | Condition |
|---|---|---|---|
| Call User | Opens phone dialer with member's number | Phone | Has mobile number |
| Email User | Opens email client | Envelope | Has email |
| WhatsApp User | Opens wa.me/91+number | WhatsApp | Has mobile number |
| Mark Inactive | Creates leftUsers record with today's date. Asks confirmation. | User-times | Has expired payment |

### 5.5 Color-Coded Format Rules

| Rule | Table | Condition | Color |
|---|---|---|---|
| Overdue Users | Library User List | Severely Overdue status | Red highlight, white text |
| Overdue Payment | Library User List | Overdue status | Orange highlight |
| Active Users | Library User List | Active status | Green highlight, white text |
| Payment Expiring Soon | Library User List | Payment expires within 7 days | Yellow highlight, bold |
| Incomplete Profile | Library User List | Missing Data Count > 0 | Orange with warning icon |
| Currently Seated | attendance | Seating Status = "Seated" | Green highlight |
| Key Returned | lockerList | returnKey = TRUE | Green highlight |
| Subscription Expiring Soon | Library Payment Sheet | End Date within 7 days | Yellow highlight |
| Expired Subscription | Library Payment Sheet | End Date < TODAY | Red highlight |

### 5.6 Forms

**Subscription Form** (Library Payment Sheet):
- Fields: User ID, Start Date, End Date, Hours, Price
- All other fields auto-filled

**Payment Form** (Payment Details):
- Fields: Payment ID (auto-linked), Amount Received, Payment Mode (default: Cash), Date of Payment (default: TODAY)

**Attendance Form:**
- Fields: User (select), In (default: NOW), Out (blank - filled later on checkout)

**Member Registration Form** (Library User List):
- Fields: User ID, Full Name, Gender, Father Name, Profile Image
- On save: auto-uppercase Full Name and Father Name
- On save: trigger notification to owner

---

## 6. Data Filters (Slices/Views)

| Filter Name | Source Table | Condition |
|---|---|---|
| Pending Payment List | Library User List | Payment Till Date is not blank AND Payment Till Date < TODAY |
| Active Users | Library User List | User Status = "Active" |
| Overdue Users | Library User List | Payment Till Date is not blank AND Payment Till Date < TODAY |
| Todays Attendance | attendance | Calculated Attendance Date = TODAY |
| Currently Seated | attendance | Seating Status = "Seated" AND Calculated Attendance Date = TODAY |
| Active User Subscriptions | Library Payment Sheet | End Date = MAX subscription End Date for this user (latest subscription per user) |

---

## 7. Automation

### 7.1 New Member Registration Bot
- **Trigger:** New record added to Library User List
- **Action:** Send email to owner (USEREMAIL) with:
  - Subject: "New Member: {Full Name}"
  - Body: Name, Gender, User ID
- **Optional enhancement:** Also send push notification

---

## 8. Non-Functional Requirements

### 8.1 Locale & Currency
- **Country:** India
- **Currency:** ₹ (INR), 0 decimal places, thousands separator
- **Payment modes:** Cash, UPI, Google Pay, PhonePe, Paytm, Bank Transfer, Card (allow custom)
- **Date format:** Indian standard (DD/MM/YYYY)
- **Language:** English

### 8.2 Authentication
- Single owner use (Rajat Seth - newgreenhigh@gmail.com)
- No multi-user roles needed currently
- Google sign-in preferred

### 8.3 Performance
- Must work on mobile data (India - variable connectivity)
- Offline capability is a plus
- Quick load for attendance check-in (used multiple times daily)

### 8.4 Data Migration
- Developer must migrate existing Google Sheets data (all 14 sheets)
- Zero data loss
- Maintain all existing relationships (User ID links)

### 8.5 Platform
- **Primary:** Mobile web or native app (Android priority)
- **Secondary:** Desktop browser
- **Current:** Was running as AppSheet app (free plan)

---

## 9. Suggested Technology Stack

The developer is free to choose, but here are recommendations:

| Option | Stack | Pros |
|---|---|---|
| **A) Low-code** | Retool / Budibase / Appsmith + Supabase | Fast rebuild, similar to AppSheet |
| **B) Web app** | Next.js + Supabase (PostgreSQL) + Tailwind | Full control, mobile-responsive |
| **C) Mobile-first** | Flutter or React Native + Firebase | Best mobile UX, offline support |
| **D) Lightweight** | Google Apps Script + Google Sheets (keep existing data) | Zero migration, cheapest |

**Database:** Supabase (free tier, PostgreSQL) or Firebase (free tier) are recommended over keeping Google Sheets for better performance with this data volume.

---

## 10. Acceptance Criteria

The rebuilt app must:

1. Show all 406+ existing members with correct User Status
2. Show payment/subscription history with correct Balance Due calculations
3. Show attendance records with live Seated Hours tracking
4. Support all CRUD operations (Add, View, Edit, Delete) on all tables
5. Display correct color-coding (red for overdue, green for active, etc.)
6. Support quick actions (Call, Email, WhatsApp) from member detail
7. Have the "Mark Inactive" workflow (creates leftUsers record)
8. Auto-uppercase names on save
9. Send notification on new member registration
10. Work smoothly on mobile (Android phone, Chrome browser)
11. Handle ₹ currency with 0 decimals throughout
12. All views show grouped data with COUNT/SUM aggregates as specified

---

## 11. Appendix

### A. Google Sheet URL
https://docs.google.com/spreadsheets/d/1-n7p4XriAk-jXxsxoccoP9KBxSasmi4gU9x5qaArzHw/edit

### B. Original App (Corrupted - for reference only)
- App ID: ff15cb56-370b-43eb-b0e2-1f3ee4b2cf86
- Was built on AppSheet (free plan)
- Corrupted due to malformed NAVIGATE_APP action
- Support ticket filed with Google

### C. Backup App (Partial rebuild)
- App ID: LibraryMgmt2-3495636
- URL: https://www.appsheet.com/template/appdef?appId=LibraryMgmt2-3495636
- Has tables, slices, format rules, some actions configured
- Can be used as reference for business logic

### D. Contact
- **Owner:** Rajat Seth
- **Email:** newgreenhigh@gmail.com
- **Use case:** Daily management of a physical library/study space in India
