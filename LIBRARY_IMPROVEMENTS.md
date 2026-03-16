# Library Module — Improvement Spec
# Derived from LibraryMgmt SDR, Aligned to ManageKar Architecture

**Version:** 1.0
**Date:** 2026-03-16
**Status:** Proposed
**Source:** `LibraryMgmt_SDR.md` (3+ years of production usage patterns)

---

## Guiding Principles

1. **No architectural changes** — all improvements use existing patterns (ListPageTemplate, DetailPageTemplate, metric factories, column builders, centralized configs, audit system)
2. **No new tables unless justified** — leverage `people` table JSONB fields already in schema
3. **Each improvement is a standalone, deployable unit** — independent migrations, independent PRs
4. **Mobile-first** — the SDR emphasizes daily phone usage; every UI change must work well on small screens

---

## Improvement 1: Surface People Data on Member Detail

**Why:** The `people` table already stores gender, DOB, multiple phones (with WhatsApp flags), emergency contacts (father/guardian), addresses, ID documents, occupation. None of this is visible on the library member detail page today.

**What exists in `people` table (migration 047):**
- `gender` — male/female/other
- `date_of_birth` — DATE
- `phone_numbers` — JSONB array `[{number, type, is_whatsapp}]`
- `emergency_contacts` — JSONB array `[{name, phone, relation}]`
- `id_documents` — JSONB array `[{type, number, verified, file_url, expiry}]`
- `permanent_address`, `permanent_city`, `permanent_state`, `permanent_pincode`
- `current_address`, `current_city`, `current_state`, `current_pincode`
- `aadhaar_number`, `pan_number`
- `occupation`, `company_name`
- `blood_group`

**Changes:**

### 1a. Expand member detail `select` query
- **File:** `src/app/(dashboard)/library-members/[id]/page.tsx`
- Update `LIBRARY_MEMBER_DETAIL_CONFIG.select` to fetch full person data:
  ```
  person:people(id, name, photo_url, phone, email, gender, date_of_birth,
    phone_numbers, emergency_contacts, id_documents,
    permanent_address, permanent_city, permanent_state, permanent_pincode,
    current_address, current_city, current_state, current_pincode,
    occupation, blood_group)
  ```

### 1b. Add "Personal Details" section to detail page
- Below existing Contact Information section
- Show: Gender, Date of Birth, Occupation, Blood Group
- Only render fields that have values (conditional display)

### 1c. Add "Address" section to detail page
- Show permanent and current address (if present)
- Format: `address, city, state - pincode`

### 1d. Add "Emergency Contacts" section to detail page
- Render `person.emergency_contacts[]` array
- Each contact: Name, Phone (clickable `tel:`), Relation
- Maps to SDR's father/guardian contact requirement

### 1e. Add "Phone Numbers" section to detail page
- Render `person.phone_numbers[]` array
- Each: Number (clickable `tel:`), Type badge, WhatsApp icon if `is_whatsapp`
- WhatsApp link: `https://wa.me/91{number}`

### 1f. Enhance "ID Proof" section
- Currently shows single `id_proof_type` + `id_proof_number` from `library_members`
- Also render `person.id_documents[]` if present (multiple documents)
- Each: Type, Number, Verified badge, Expiry date

**Migration:** None — data already exists in `people` table.
**Tests:** Update member detail page tests to assert new sections render.

---

## Improvement 2: Quick Actions (Call / WhatsApp / Email)

**Why:** SDR §5.4 — the owner manages the library on their phone, needs one-tap access to call/message members.

**Changes:**

### 2a. Add action buttons to member detail hero
- **File:** `src/app/(dashboard)/library-members/[id]/page.tsx`
- Add to `DetailHero` actions array (before Edit button):
  - **Call** — `<a href="tel:{phone}">` — Phone icon — condition: has phone
  - **WhatsApp** — `<a href="https://wa.me/91{phone}" target="_blank">` — MessageCircle icon — condition: has phone
  - **Email** — `<a href="mailto:{email}">` — Mail icon — condition: has email
- Use `Button` variant="outline" size="icon" for compact mobile display

### 2b. Add WhatsApp link to member list (optional)
- In member list `personNameWithAvatarColumn`, phone subtitle is already shown
- No change needed — the detail page is the right place for actions

**Migration:** None.
**Tests:** Assert action buttons render conditionally.

---

## Improvement 3: Overdue Status & Pending Payments View

**Why:** SDR §3.2.1, §5.1 — the owner's daily workflow centers on "who hasn't paid?" The current list page has Active/Expired metrics but no overdue severity or days-based tracking.

**Changes:**

### 3a. Add computed overdue fields to member list
- **File:** `src/app/(dashboard)/library-members/page.tsx`
- Add `computedFields` to config:
  - `overdue_days`: `Math.max(0, daysBetween(expiry_date, today))` when expired
  - `days_until_expiry`: `Math.max(0, daysBetween(today, expiry_date))` when active
  - `overdue_status`: "Severely Overdue" (>30d), "Overdue" (>0d), "Expiring Soon" (≤7d), "Current"

### 3b. Add overdue columns (hidden by default)
- **Overdue Days** — number, red text — hidden by default
- **Days Until Expiry** — number — hidden by default
- **Overdue Status** — colored badge — hidden by default

### 3c. Add new metrics
- Using metric factories:
  - `createCountMetric("Overdue", ...)` — members where `expiry_date < today AND status = 'active'`
  - `createCountMetric("Expiring Soon", ...)` — members where `expiry_date` within 7 days

### 3d. Add "Overdue Status" filter
- Filter options: Severely Overdue, Overdue, Expiring Soon, Current
- Uses computed field for client-side filtering

### 3e. Add "Overdue Status" group-by option
- Group members by overdue severity

### 3f. Color-code overdue rows (SDR §5.5)
- Add `rowClassName` function to ListPageTemplate:
  - Severely Overdue → `bg-red-50 dark:bg-red-950`
  - Overdue → `bg-orange-50 dark:bg-orange-950`
  - Expiring Soon → `bg-yellow-50 dark:bg-yellow-950`

**Migration:** None — computed from existing `expiry_date`.
**Tests:** Test overdue computation logic, metric counts.

---

## Improvement 4: Balance Due on Subscriptions

**Why:** SDR §3.2.2 — subscription `Price - SUM(payments) = Balance Due`. Currently, subscription records on member detail don't show how much is still owed.

**Changes:**

### 4a. Compute balance due per membership
- **File:** `src/app/(dashboard)/library-members/[id]/page.tsx`
- In subscriptions section, for each membership:
  - Fetch linked payments: `library_payments` where `membership_id = membership.id`
  - `paid = SUM(payment.amount)` where `status = 'completed'`
  - `balance_due = membership.final_amount - paid`
- Display: "₹{final_amount} | Paid: ₹{paid} | Due: ₹{balance_due}" with red highlight if due > 0

### 4b. Add balance indicator on member detail stats
- In Quick Stats Grid, replace or supplement "Total Paid" with:
  - **Balance Due** — sum of all unpaid balances across active memberships — red if > 0, green ₹0 if fully paid

**Migration:** None — computed from existing `library_payments` + `library_memberships`.
**Tests:** Test balance computation with partial payment scenarios.

---

## Improvement 5: Mark Inactive / Reactivation Workflow

**Why:** SDR §4.1 — core business workflow. Members leave and return. Currently the only status transitions are via subscription expiry cron. There's no manual "mark inactive" or "reactivate" flow.

**Changes:**

### 5a. Add "Mark Inactive" action on member detail
- **File:** `src/app/(dashboard)/library-members/[id]/page.tsx`
- Condition: `status === 'active' AND expiry_date < today`
- Action: Confirmation dialog → updates `library_members.status = 'suspended'` (using existing status enum)
- Records: reason (optional text), inactive date
- Audit: `withCreatedBy()` on the update

### 5b. Add "Reactivate" action on member detail
- Condition: `status === 'suspended'`
- Action: Navigate to `/library-members/{id}/renew` (existing renew flow)
- On successful subscription renewal, status auto-sets to `active`

### 5c. Add status transition tracking
- **Migration:** `066_library_member_status_log.sql`
- New table `library_member_status_log`:
  ```sql
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES library_members(id),
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  -- RLS + audit
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
  ```
- Add universal audit trigger
- RLS: owner_id = auth.uid() OR is_platform_admin()

### 5d. Show status history on member detail
- New `DetailListSection` showing recent status changes (last 5)
- Each entry: old → new status, reason, date, changed by

**Migration:** One new table (`library_member_status_log`).
**Tests:** Test mark inactive flow, reactivation flow, status log creation.

---

## Improvement 6: Profile Completeness Indicator

**Why:** SDR §3.2.1 "Missing Data" — the owner wants to see at a glance which members have incomplete profiles (no phone, no email, no ID proof, no photo, no emergency contact).

**Changes:**

### 6a. Add computed `missing_data` field
- **File:** `src/app/(dashboard)/library-members/page.tsx`
- Compute on list load:
  ```typescript
  const missingItems = []
  if (!item.phone && !item.person?.phone) missingItems.push("Phone")
  if (!item.email && !item.person?.email) missingItems.push("Email")
  if (!item.id_proof_type) missingItems.push("ID Proof")
  if (!item.person?.photo_url) missingItems.push("Photo")
  if (!item.person?.emergency_contacts?.length) missingItems.push("Emergency Contact")
  ```

### 6b. Add "Incomplete" metric
- `createCountMetric("Incomplete", ...)` — count members with `missing_data.length > 0`

### 6c. Add missing data badge on member list
- New column (hidden by default): "Missing Data" — shows orange warning icon + count
- Tooltip or expand: comma-separated list of missing fields

### 6d. Add completeness banner on member detail
- At top of detail page (below hero): "Profile incomplete: Phone, Photo missing" — dismissible, links to edit form

**Migration:** None — computed from existing data.
**Tests:** Test missing data detection for each field.

---

## Improvement 7: Attendance Enhancements

**Why:** SDR §3.2.4 — live seated hours, overtime alerts, subscribed hours comparison.

**Changes:**

### 7a. Live "Seated Hours" display on currently checked-in panel
- **File:** `src/app/(dashboard)/library-attendance/page.tsx`
- Currently shows "Hours elapsed" — enhance with:
  - Compare against member's subscribed hours (from active membership `hours_included`)
  - Show: "3h 20m / 6h" (seated / subscribed)
  - Color: green if within limit, red if overtime

### 7b. Add "Overtime" badge on attendance list
- For completed attendance records where `hours_spent > membership.hours_included / days_in_period`
- Show orange "Overtime" badge next to duration

### 7c. Add "Currently Seated" count to member list metrics
- New metric: "Seated Now" — count of members with open attendance records (no check_out_time) for today

**Migration:** None.
**Tests:** Test overtime calculation, seated hours display.

---

## Improvement 8: Registration Form Enhancements

**Why:** SDR §4.5, §7.1 — auto-uppercase names, collect gender, richer member data on registration.

**Changes:**

### 8a. Auto-uppercase name on save
- **File:** `src/app/(dashboard)/library-members/new/page.tsx`
- In form submit: `name = formData.name.toUpperCase()`
- Also apply to edit form

### 8b. Add Gender field to registration form
- Add `Select` with options: Male, Female, Other
- Save to `people.gender` (via person record)

### 8c. Add Father/Guardian Name field (optional)
- Text input, optional
- Save to `people.emergency_contacts` JSONB: `[{name: value, relation: "Father"}]`

### 8d. Add Date of Birth field (optional)
- Date input
- Save to `people.date_of_birth`

**Migration:** None — fields exist in `people` table.
**Tests:** Test form submission with new fields, uppercase transform.

---

## Improvement 9: Locker Workflow Enhancements

**Why:** SDR §4.4 — explicit "Return Key" → "Refund Deposit" two-step workflow.

**Changes:**

### 9a. Add "Return Key" action on locker assignment
- **File:** `src/app/(dashboard)/library-lockers/page.tsx` or member detail
- Updates `library_locker_assignments.status = 'ended'`, `end_date = today`
- Updates `library_lockers.status = 'available'`, clears `current_member_id`

### 9b. Add "Refund Deposit" action
- Condition: Key returned (`status = 'ended'`) AND `deposit_returned = false`
- Action: Sets `deposit_returned = true`
- Creates a refund payment record in `library_payments` (type: `locker_deposit`, negative or separate refund type)

### 9c. Add "Key Returned" and "Deposit Refunded" badges on locker list
- Green checkmark for returned keys
- Green checkmark for refunded deposits
- Red for pending

**Migration:** None — `deposit_returned` already exists in `library_locker_assignments`.
**Tests:** Test two-step locker return flow.

---

## Improvement 10: Payment-by-Date & Payment Summary Views

**Why:** SDR §5.1 — the owner needs daily payment summaries grouped by date and mode.

**Changes:**

### 10a. Add "Today's Collection" metric to library payments page
- `createTodayCountMetric` already exists — add companion:
- New metric: "Today's Amount" — sum of `amount` where `payment_date = today`

### 10b. Add default group-by "payment_date" option
- Already exists in group-by options — just ensure it's prominent

### 10c. Add payment mode summary in group headers
- When grouped by date, show: "₹{total} — {count} payments"
- When grouped by method, show: "₹{total} — {count} transactions"

**Migration:** None.
**Tests:** Test summary calculations.

---

## Implementation Order

| Phase | Improvements | Effort | New Migrations |
|-------|-------------|--------|----------------|
| **Phase A** | 1 (People data), 2 (Quick actions) | Small | None |
| **Phase B** | 3 (Overdue status), 4 (Balance due), 6 (Completeness) | Small-Medium | None |
| **Phase C** | 5 (Inactive workflow), 8 (Registration form) | Medium | 1 table |
| **Phase D** | 7 (Attendance), 9 (Locker workflow), 10 (Payment views) | Small | None |

**Total new migrations:** 1 (status log table)
**Total new components:** 0 (uses existing DetailListSection, StatusBadge, etc.)
**Total new tables:** 1 (`library_member_status_log`)
**Architectural changes:** 0

---

*Each improvement maps 1:1 to a deployable PR. No improvement depends on another unless noted.*
