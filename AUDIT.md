# ManageKar — Codebase Audit Against Core Principles

> **Audited:** 2026-04-25
> **Audited against:** KEY_PRINCIPLES.md (41 principles, 7 categories)
> **Scope:** Full codebase — 30+ dashboard pages, 2 portals, 12 API routes, 5 cron jobs, all lib/, all components/
> **Auditor:** AI session (Claude Code, claude-sonnet-4-6)

---

## Executive Summary

The codebase is in solid structural health. The core architecture, service layer, RLS, audit system, soft delete, and most UI patterns are well-implemented. The major gaps fall into 5 areas:

| # | Critical Gap | Principle | Affected Files |
|---|---|---|---|
| 1 | **No 2FA on login** — email OTP is absent from the login flow | E1 | `(auth)/login/page.tsx` |
| 2 | **20+ list pages missing CSV export** (`exportColumns`) | D1 | meters, meter-readings, people, staff, visitors, rooms, properties, library, library-sections, library-seats, library-lockers, library-plans, bills, complaints, notices, exit-clearance, refunds, meters, approvals, activity, inquiries |
| 3 | **No AI features implemented** despite multiple AI-branded labels | D3 | `/tenants/[id]/journey` (rule-based only), no Gemini/Groq/Hugging Face integration |
| 4 | **Hardcoded ManageKar branding** in all email templates (A6 violation) | A6 | `src/lib/templates/email.ts`, `src/lib/templates/whatsapp.ts`, `src/lib/email/components.ts` |
| 5 | **No soft-delete purge cron** and no audit log 1-year purge mechanism | E3/E4 | No scheduled purge cron exists |

**Health score by category:**

| Category | Score | Status |
|---|---|---|
| A. Vision & Market | 7/10 | White-label branding not workspace-driven in email/WhatsApp templates |
| B. Architecture | 8/10 | Solid. Service layer, event model partially event-driven |
| C. Data | 9/10 | People module, RLS, soft delete all strong. File compression partial |
| D. Development | 5/10 | AI features absent, CSV export missing on 20+ pages, inline compute violations |
| E. Security | 6/10 | No 2FA, no session duration config, no purge cron |
| F. User Experience | 7/10 | Portals mostly read-only, no self-registration invite QR flow for members |
| G. Quality | 4/10 | Zero API/service/page tests, no E2E tests, no performance benchmarks |

---

## A. Vision & Market

### A6 — White-Label: ManageKar Branding Hardcoded in Customer-Facing Communication

**Principle requires:** No forced ManageKar branding in customer-facing UI. Branding flows through workspace config. White-labeling is free for all tiers.

**Violations found:**

1. **`src/lib/templates/email.ts` (lines 41, 47, 58, 85, 89, 92, 533, 619, 649, 661, 667, 674, 775, 1310)** — "ManageKar" hardcoded in HTML title, h1, footer, subject lines, and body copy. When a library owner sends a payment receipt to a student, the email header reads "ManageKar" not their library's name. This breaks white-label completely.

2. **`src/lib/templates/whatsapp.ts` (lines 105, 107, 119, 133, 137)** — "_Powered by ManageKar_" hardcoded in WhatsApp message footers sent to tenants and members. The fallback `data.ownerName || "ManageKar"` means when ownerName is absent, ManageKar appears in customer-facing messages.

3. **`src/lib/email/components.ts` (line 52)** — `managekar.com` hardcoded as a hyperlink in every email footer regardless of workspace branding.

4. **`src/lib/email.ts` (line 30)** — `FROM_EMAIL` default is `"ManageKar <onboarding@resend.dev>"`. Customer emails appear to come from ManageKar, not the owner's business.

5. **`src/lib/email/theme.ts`** — `emailBrand.tagline` is "Smart PG Management" — domain-locked even for Library module emails.

**Fix:** Email templates must accept `workspaceName`, `workspaceLogo`, `workspaceDomain` parameters and render those instead of hardcoded "ManageKar". The `CONTACT.APP_NAME` abstraction exists in `email/theme.ts` but `src/lib/templates/email.ts` does not use it — it duplicates "ManageKar" inline throughout.

---

### A4 — Feature Control Center Not Built

**Principle requires:** A self-service Feature Control Center where owners can see all modules, features, usage meters, and costs. 80% usage limit triggers AI upgrade prompt.

**Current state:** Feature flags exist in `src/lib/features/index.ts` with 17 flags. `src/app/(dashboard)/settings/_components/FeatureSettings.tsx` exists as a basic toggle UI. No usage meter tracking, no 80% threshold alerting, no AI-driven discovery suggestions, no live bill breakdown.

**No critical file violations but the Feature Control Center described in A4 is not built.** The FeatureSettings component is a stub compared to the spec.

---

### A2 — CLAUDE.md Documents Only 3 Cron Jobs; vercel.json Has 5

**Minor doc drift.** `vercel.json` has 5 crons (`payment-reminders`, `generate-bills`, `expire-library-memberships`, `library-notifications`, `daily-summaries`) but CLAUDE.md Section 7 lists only 3. Not a principle violation but creates AI session confusion for future work.

---

## B. Architecture

### B2 — Composable Module: Inline Metric Computes (Minor)

The following pages use inline `compute:` functions instead of metric factories, violating C4/D1:

- **`src/app/(dashboard)/library-sections/page.tsx` (lines 220, 226)** — inline `reduce` for `total_seats` and `occupied_seats`
- **`src/app/(dashboard)/library/page.tsx` (lines 288, 294)** — inline `reduce` for `total_seats` and `occupied_seats`
- **`src/app/(dashboard)/properties/page.tsx` (lines 263, 269)** — inline `reduce` for `room_count` and `tenant_count`
- **`src/app/(dashboard)/people/page.tsx` (lines 325, 332, 339, 346, 353)** — inline `filter` for tag-based counts (tenants, staff, visitors, verified, blocked)
- **`src/app/(dashboard)/expenses/services/providers/page.tsx` (line 294)** — inline `reduce` for `total_jobs`

These should use a `createSumMetric` or `createCountMetric` factory variant. The `createSumMetric` factory already handles sum patterns; a `createTagCountMetric` factory would cover the people page patterns.

### B3 — Business Logic in Pages (Known Pattern — Visitors Form)

`src/app/(dashboard)/visitors/new/_components/useVisitorForm.ts` contains multi-step database operations (person creation, visitor creation, overnight stay) directly in a hook rather than a workflow service. This is a soft violation of B3 — business logic should be in `src/lib/workflows/`. The tenant and library member creation workflows correctly use `src/lib/workflows/`. The visitor creation should be migrated.

---

## C. Data

### C6 — File Compression: Partial Implementation, Not Pipeline

**Principle requires:** Every file upload goes through automatic compression before storage. Profile photos: max 200KB. ID documents: max 500KB. Receipt images: max 300KB.

**Current state:**

- `src/components/ui/image-cropper.tsx` — crops and encodes at JPEG quality 0.9. This is compression, but quality 0.9 of a 5MB phone photo still produces a large file. No explicit pixel dimension cap. No 200KB enforcement.
- `src/components/ui/file-upload.tsx` — `maxSize` prop defaults to 5MB. No pre-upload compression pipeline. Raw files up to 5MB are stored as-is for non-profile uploads.
- `src/components/tenant/document-upload-dialog.tsx` (line 180) — `maxSize={10}` (10MB). No compression.
- ID document uploads via `src/components/forms/IdDocumentEntry.tsx` — no compression.

**Fix needed:** A client-side compression pipeline (`canvas.toBlob` with progressive size reduction until under the target KB) should run before any Supabase storage upload. Profile photos need a dimension cap (800x800px maximum), not just quality reduction. The 200KB/500KB/300KB hard limits from C6 are not enforced anywhere.

### C4 — Hard Deletes on Configuration Tables (Minor)

The following tables use `.delete()` (hard delete) but are arguably auditable:

- **`charge_types`** — deleted in `src/app/(dashboard)/settings/_components/BillingSettings.tsx` (line 140)
- **`expense_types`** — deleted in `src/app/(dashboard)/settings/_components/ExpenseTypeSettings.tsx` (line 92)
- **`roles`** — deleted in `src/app/(dashboard)/staff/roles/page.tsx` (line 115) and `staff/roles/[id]/page.tsx` (line 200)
- **`tenant_documents`** — deleted in `src/app/(tenant)/tenant/documents/page.tsx` (line 144) — this is business data and arguably should be soft-deleted

`charge_types`, `expense_types`, and `roles` are workspace configuration tables. Hard delete is defensible for these. However, `tenant_documents` contains submitted documents from tenants — this should be soft-deleted and should be added to `SOFT_DELETABLE_TABLES` in `src/lib/audit/constants.ts`.

### C5 — No Scheduled Data Purge Crons (E4 Related)

**Principle E3 requires:** Audit logs retained 1 year, then purged. **Principle E4 requires:** Soft-deleted records retained 90 days, then purged.

**Neither purge mechanism exists.** No cron job for purging `deleted_at` records older than 90 days. No cron job for purging `audit_events` older than 365 days. These will accumulate indefinitely, accelerating Supabase's 500MB free-tier database limit.

---

## D. Development Standards

### D1 — Feature Parity: 20+ List Pages Missing CSV Export (`exportColumns`)

**Principle requires:** Every list page has CSV export (`exportColumns`).

Only 7 of ~27 list pages have `exportColumns` defined. The following list pages use `ListPageTemplate` but do NOT pass `exportColumns`:

| Page | File |
|---|---|
| Activity Log | `src/app/(dashboard)/activity/page.tsx` |
| Approvals | `src/app/(dashboard)/approvals/page.tsx` |
| Bills | `src/app/(dashboard)/bills/page.tsx` |
| Complaints | `src/app/(dashboard)/complaints/page.tsx` |
| Exit Clearance | `src/app/(dashboard)/exit-clearance/page.tsx` |
| Inquiries | `src/app/(dashboard)/inquiries/page.tsx` |
| Library | `src/app/(dashboard)/library/page.tsx` |
| Library Lockers | `src/app/(dashboard)/library-lockers/page.tsx` |
| Library Plans | `src/app/(dashboard)/library-plans/page.tsx` |
| Library Seats | `src/app/(dashboard)/library-seats/page.tsx` |
| Library Sections | `src/app/(dashboard)/library-sections/page.tsx` |
| Library Waitlist | `src/app/(dashboard)/library-waitlist/page.tsx` |
| Meter Readings | `src/app/(dashboard)/meter-readings/page.tsx` |
| Meters | `src/app/(dashboard)/meters/page.tsx` |
| Notices | `src/app/(dashboard)/notices/page.tsx` |
| People | `src/app/(dashboard)/people/page.tsx` |
| Properties | `src/app/(dashboard)/properties/page.tsx` |
| Refunds | `src/app/(dashboard)/refunds/page.tsx` |
| Rooms | `src/app/(dashboard)/rooms/page.tsx` |
| Staff | `src/app/(dashboard)/staff/page.tsx` |
| Visitors | `src/app/(dashboard)/visitors/page.tsx` |

Pages with CSV export already: `library-attendance`, `library-members`, `library-payments`, `library-subscriptions`, `payments`, `expenses`, `tenants`.

Note: Activity Log is immutable and doesn't need export; the others do.

### D1 — Feature Parity: groupByOptions Has < 3 Options on 2 Pages

**Principle requires:** Minimum 3 group-by options.

- **`src/app/(dashboard)/library-attendance/page.tsx`** — only 2 groupBy options (check this; it was counted from surrounding context)
- **`src/app/(dashboard)/library-plans/page.tsx`** — only 2 groupBy options

### D1 — Activity Page Missing PermissionGuard

**`src/app/(dashboard)/activity/page.tsx`** — does not import or use `PermissionGuard`. The `ListPageTemplate` only wraps with feature/permission if those props are passed. The activity page does not pass a `permission=` prop to `ListPageTemplate`. Anyone who can access the dashboard URL can view the full audit log.

**Fix:** Add `permission="activity.view"` (or `"dashboard.view"`) to the `ListPageTemplate` call in the activity page.

### D1 — Raw HTML `<select>` Elements (CLAUDE.md Mandatory Violation)

**CLAUDE.md explicitly prohibits raw `<select>` tags.** Found in:

- `src/components/forms/GuardianEntry.tsx` (line 50)
- `src/components/forms/AddressInput.tsx` (line 64)
- `src/components/forms/IdDocumentEntry.tsx` (line 77)
- `src/components/auth/invitation-form.tsx` (line 195)
- `src/components/reports/ReportPageHeader.tsx` (line 59)

Note: `src/components/ui/form-components.tsx`, `list-page-filters.tsx`, `advanced-filter-builder/FilterRow.tsx`, and `inline-edit/InlineEditCell.tsx` also use raw `<select>` but these are the implementation of the custom Select component itself — acceptable. The 5 files above use raw `<select>` in business forms and should use `<Select>` from `@/components/ui/form-components`.

### D1 — Hardcoded Gradient Colors (29 occurrences, not using brandGradient)

29 occurrences of hardcoded `from-teal-*`/`to-emerald-*` in `src/app/` files instead of `brandGradient.*` from `src/lib/design-tokens.ts`. Main offenders:

- `src/app/(home)/_sections/HeroSection.tsx` (5 instances)
- `src/app/(home)/_sections/CTASection.tsx`, `StatsSection.tsx`, `WhySection.tsx`, `ProductsSection.tsx`, `TestimonialsSection.tsx`
- `src/app/products/pg-manager/page.tsx` (7 instances)
- `src/app/contact/page.tsx` (3 instances)

These are primarily public-facing marketing pages. While not customer-facing management UI, they still deviate from the design system.

### D3 — No AI Features Actually Implemented

**Principle requires:** AI powers every intelligence feature using the best available free API (Gemini free tier, Groq, Hugging Face). AI is applied predictively, generatively, analytically, conversationally, and operationally.

**Current state:**

- The Tenant Journey page is labeled "AI-powered lifecycle tracking" in CLAUDE.md but the insights in `src/lib/services/journey.service.ts` are rule-based scoring algorithms (no API call to any AI provider). This is misleading branding, not deceptive implementation — the logic is genuinely useful. But it is not AI.
- Zero calls to Gemini API, Groq, Hugging Face, or any AI inference service exist anywhere in the codebase.
- No AI-generated notice drafts, no complaint response suggestions, no occupancy forecasts, no natural language query interface.
- No graceful degradation patterns are needed because no AI features exist.

**What should be built first:** The journey "insights" are a perfect AI upgrade path. Replace the rule-based scoring with a Gemini Flash API call that receives tenant data (payments, complaints, stay duration) and returns a risk narrative and recommended action. Cost: zero (Gemini free tier handles this volume). Fallback: the existing rule-based result.

### D2 — Platform-to-Owner Communication Not Built

**Principle requires:** When Rajat sends an announcement, it fires to ALL workspace owners via in-app notification AND email simultaneously, from one action.

**Current state:** No platform-wide announcement mechanism exists. The notices system is workspace-level (owner to tenants), not platform-level (Rajat to all owners). The notifications table (created in migration 038) is never surfaced in any UI as an owner notification inbox.

### D7 — PWA: Service Worker and Manifest Exist but Push Notifications Not Wired

**Positive:** `public/sw.js` implements cache-first for static assets, network-first for HTML. `public/manifest.json` is complete with all icon sizes, shortcuts, and display modes. Service worker is registered in `src/app/layout.tsx`.

**Gap:** The service worker has a `push` event listener but it is never used — there is no server-side push notification sender, no VAPID key setup, no push subscription storage. In-app notifications created by `src/lib/services/notification.service.ts` go to a `notifications` database table but no UI polls or displays them (no bell icon, no notification center in the dashboard).

---

## E. Security & Compliance

### E1 — Critical: No Two-Factor Authentication

**Principle requires:** Email OTP 2FA enforced for ALL users on every login. Cannot be disabled. Method: Supabase Auth built-in OTP.

**Current state:** `src/app/(auth)/login/page.tsx` uses `supabase.auth.signInWithPassword()` with email + password only. There is an email verification flow (`/api/verify-email/`) but this is a one-time address confirmation, not a per-login OTP. No second factor is requested on any login.

**Impact:** If any owner or staff credential is compromised, attacker has immediate full access with no second barrier. This is a critical security gap given the platform manages real financial and personal data.

**Fix:** Supabase Auth supports email OTP natively. After successful password verification, call `supabase.auth.signInWithOtp({ email })` and add a step in the login flow to collect and verify the 6-digit code. Zero additional cost. Zero third-party dependency.

### E1 — Session Duration Not Configured for 24 Hours

**Principle requires:** Session expires after 24 hours for all users. No "remember me for 30 days."

**Current state:** No Supabase JWT expiry override is configured in the application. Supabase's default JWT expiry is 1 hour for access tokens and 7 days for refresh tokens. With refresh token rotation, sessions effectively persist for 7 days without explicit logout. The platform never calls `auth.setSession()` with a custom expiry.

**Fix:** Configure Supabase project settings (JWT expiry = 86400 seconds / 24 hours). Also set `refreshTokenExpiryDuration` to 86400. This is a Supabase Dashboard setting, not a code change.

### E3 — Cron Failure Alerts: Logging Only, No Email Alert

**Principle G1 requires:** Cron failures must alert Rajat via email. The current `baseCronHandler` in `src/lib/cron-handler.ts` logs failures at ERROR level via `cronLogger.error()` but does not send any email or external alert. A silent cron failure means bills might not generate, memberships might not expire — and Rajat does not know until a client complains.

**Fix:** Add a `sendCronFailureAlert(cronName, error, context)` call inside the catch block of `baseCronHandler`. Use the existing `sendEmail()` from `src/lib/email.ts` targeting Rajat's email (`sethrajat0711@gmail.com`).

### E4 — No Soft Delete Purge Cron (90-Day Retention Not Enforced)

**Principle requires:** Soft-deleted records are retained for 90 days, then permanently purged.

**Current state:** `deleted_at` is set on soft delete. No cron job or Supabase scheduled function purges records where `deleted_at < NOW() - INTERVAL '90 days'`. Records accumulate indefinitely. On Supabase's 500MB free tier, this is a practical concern.

**Fix:** Add a `purge-deleted-records` cron to `vercel.json` running weekly. The cron should issue `DELETE FROM <table> WHERE deleted_at < NOW() - INTERVAL '90 days'` for every table in `SOFT_DELETABLE_TABLES`.

### E3 — Audit Log No 1-Year Purge

**Principle requires:** Audit logs retained for 1 year, then permanently purged.

**Current state:** `audit_events` table grows indefinitely. No purge mechanism. On the free Supabase tier with 500MB database limit, this is a practical concern that will hit before the soft-delete records.

### E2 — Permission Model: RBAC in Place, GBAC Individual Deny Override Missing

**Principle E2 requires:** Group-Based Access Control with (1) predefined groups, (2) multi-group membership, (3) individual deny override.

**Current state (positive):**
- Predefined system roles (Manager, Receptionist, Accountant) exist via migration `004_staff_management.sql` and `013_default_roles_tenant_features.sql`.
- Multi-role assignment works: `user_roles` table has multiple rows per staff member; `auth-context.tsx` line 296 confirms "If staff has MULTIPLE roles, permissions are AGGREGATED (UNION)."

**Missing:** Individual deny override. If a Receptionist is assigned to a role that includes `bills.view`, there is no way to block that specific permission for one specific staff member without removing them from the role. The `currentContext.permissions` is a union with no deny mechanism.

---

## F. User Experience

### F3 — Self-Service Portals: Mostly Read-Only, Missing Key F3 Features

**Principle requires:** End customers can view bills, payments, attendance, subscriptions, complaints; raise complaints; update own profile, emergency contacts, documents; download receipts/statements.

**Tenant portal (`src/app/(tenant)/tenant/`):**
- Bills, payments, notices, complaints: present and functional
- Profile: `src/app/(tenant)/tenant/profile/page.tsx` is **read-only**. No form to edit name, phone, emergency contacts, or ID documents. Violates F3.
- Document upload: present via `src/components/tenant/document-upload-dialog.tsx` (delete is a hard delete, see C4)
- Receipt download: available via `TENANT_PORTAL_SETTINGS.download_receipts = true`

**Member portal (`src/app/(member)/member/`):**
- Attendance, payments, QR code: present
- Profile: `src/app/(member)/member/profile/page.tsx` is **read-only**. No edit form.
- Complaints: **not in member portal** (only in tenant portal). Library members cannot raise complaints via self-service.
- Locker view: **not in member portal** — members cannot see their locker assignment.
- Subscription details/renewal: display-only; no self-service renewal flow.

### F3 — Self-Registration Invite Flow: Partial

Tenant invite-by-email flow exists (`src/app/(dashboard)/tenants/new/page.tsx`). Staff invite-by-email flow exists (`src/app/(dashboard)/staff/new/page.tsx`). **Library member self-registration invite is absent** — there is no "generate invite link/QR" action on the library members page. The invite-only registration pattern described in F3 is only implemented for PG tenants.

### F2 — Onboarding Self-Serve: Setup Wizard Exists but Untested for Full Self-Serve

`src/app/(setup)/setup/page.tsx` exists. Per the session memory, the setup redirect was previously incorrectly firing; now it self-protects. The setup wizard inserts directly without `withCreatedBy()` (line 135 — `supabase.from("properties").insert(...)` without `withCreatedBy`). This means setup-created records have no `created_by` attribution.

---

## G. Quality & Reliability

### G2 — Critical: Zero API Route Tests, Zero Service Tests, Zero Page Tests

**Principle requires:** Every API route has tests. Services at 80% coverage. Critical user flows have E2E tests.

**Current state:** 25 test files exist in `src/__tests__/`. Coverage is **entirely** in `src/__tests__/lib/` (utilities, hooks, format, validation, CSRF, rate limit, audit logic) and `src/__tests__/components/` (1 file: currency.tsx).

**Explicitly missing:**
- Zero tests for any of the 12 API routes
- Zero tests for `src/lib/services/journey.service.ts`, `notification.service.ts`, `tenant.workflow.ts`, `exit.workflow.ts`
- Zero tests for any dashboard page or form
- Zero E2E tests (no Playwright or Cypress configured)
- Zero RLS isolation tests (Workspace A cannot access Workspace B's data)

**From KEY_PRINCIPLES.md G2:** "As of 2026-04-25, all 25 test files cover `lib/` and `components/` only. Zero API route tests. Zero service-layer business flow tests. Zero page/form tests."

This is self-acknowledged in the principles document. Every new module must close this gap. It has not been closed.

**Highest priority tests to write:**
1. `/api/tenants/[id]/journey` — test auth, tenant ownership validation, rate limiting
2. `src/lib/services/journey.service.ts` — test insight calculations, edge cases (new tenant, no payments)
3. RLS test: Workspace A member cannot read Workspace B library records
4. Soft delete: deleted records are hidden from all queries

### G1 — Cron Jobs: No Failure Alerting to Rajat

As noted in E3. The `cronLogger.error()` call writes to Vercel logs but there is no mechanism to push that to Rajat's inbox. Cron failures are silent from the operator's perspective.

### G3 — No Performance Monitoring / No Benchmark Baselines

**Principle requires:** FCP < 2s on 4G, API p95 < 500ms, no N+1 queries.

**Current state:** No performance budget is enforced in the build pipeline. No API response time monitoring. Supabase query analysis is not configured. The dashboard page (`src/app/(dashboard)/dashboard/page.tsx`) makes multiple sequential Supabase queries in `useEffect` — this pattern could cascade on slow connections.

**N+1 check:** List pages all use Supabase joins (`.select()` with embedded relations), which is correct. No N+1 patterns identified in list pages. The dashboard page custom queries are the risk area.

---

## Priority Matrix

| # | Gap | Principle | Effort | Impact |
|---|---|---|---|---|
| 1 | Add email OTP 2FA to login flow | E1 | Low (Supabase built-in) | Critical |
| 2 | Add exportColumns to 20+ list pages | D1 | Medium (repeat pattern) | High |
| 3 | Fix hardcoded ManageKar in email/WhatsApp templates | A6 | Medium | High |
| 4 | Implement image compression pipeline (200KB profile, 500KB docs) | C6 | Medium | High |
| 5 | Add cron failure email alert in baseCronHandler | G1/E3 | Low (2 lines) | High |
| 6 | Add soft-delete purge cron (90-day) | E4 | Low | High |
| 7 | Add audit log purge cron (1-year) | E3 | Low | Medium |
| 8 | Build first real AI feature (Gemini for journey insights) | D3 | Medium | High |
| 9 | Fix raw `<select>` in 5 form/report components | D1 | Low | Medium |
| 10 | Fix activity page missing PermissionGuard | E2 | Low (1 line) | Medium |
| 11 | Add tenant_documents to SOFT_DELETABLE_TABLES | E4 | Low | Medium |
| 12 | Make member/tenant portal profiles editable (F3) | F3 | Medium | High |
| 13 | Add member portal: complaints, locker view | F3 | Medium | Medium |
| 14 | Add individual deny override to staff permission model | E2 | High | Medium |
| 15 | Write API route tests for 12 routes | G2 | High | Critical |
| 16 | Write service-layer tests (journey, notification, workflows) | G2 | High | Critical |
| 17 | Configure Supabase session duration to 24 hours | E1 | Low (Dashboard setting) | High |
| 18 | Add in-app notification bell UI to dashboard | D2/F3 | Medium | Medium |
| 19 | Build platform-to-owner announcement system | D2 | Medium | Medium |
| 20 | Replace hardcoded gradients with brandGradient tokens in public pages | F1 | Low | Low |

---

## Quick Wins

These fixes take under 1 hour each and close real gaps:

### 1. Cron Failure Alert (15 minutes)
In `src/lib/cron-handler.ts`, add inside the catch block:
```typescript
import { sendEmail } from "@/lib/email"
// After cronLogger.error(...)
await sendEmail({
  to: "sethrajat0711@gmail.com",
  subject: `[ManageKar] Cron failure: ${config.name}`,
  html: `<p>Cron <strong>${config.name}</strong> failed at ${new Date().toISOString()}.<br>Error: ${String(error)}</p>`
}).catch(() => {}) // Never throw from error handler
```

### 2. Activity Page PermissionGuard (5 minutes)
In `src/app/(dashboard)/activity/page.tsx`, add `permission="activity.view"` to the `ListPageTemplate` call (or `permission="dashboard.view"` to match what exists).

### 3. Fix Raw Selects in 5 Components (30 minutes)
Replace raw `<select>` with `<Select>` from `@/components/ui/form-components` in:
- `src/components/forms/GuardianEntry.tsx`
- `src/components/forms/AddressInput.tsx`
- `src/components/forms/IdDocumentEntry.tsx`
- `src/components/auth/invitation-form.tsx`
- `src/components/reports/ReportPageHeader.tsx`

### 4. Add tenant_documents to Soft Delete (5 minutes)
In `src/lib/audit/constants.ts`, add `"tenant_documents"` to `SOFT_DELETABLE_TABLES`. Then update the delete in `src/app/(tenant)/tenant/documents/page.tsx` to use `softDelete("tenant_documents", id, user.id)`.

### 5. Update CLAUDE.md Cron Count (5 minutes)
Section 7 of CLAUDE.md shows 3 cron jobs and an example config with 3. Add `payment-reminders` and `daily-summaries` to the table and update the example `vercel.json` snippet to match the actual 5-cron configuration.

### 6. Session Duration (10 minutes — Supabase Dashboard)
In the Supabase Dashboard → Authentication → Settings, set JWT expiry to `86400` (24 hours). This is a configuration change, not a code change.

### 7. withCreatedBy in Setup Wizard (10 minutes)
In `src/app/(setup)/setup/page.tsx` lines 135, 153, 172, wrap all inserts with `withCreatedBy(data, user.id)` from `@/lib/audit`. Currently setup-created properties and rooms have no `created_by` attribution.

---

## Full File Reference

### Files with Confirmed Violations

| File | Violation | Principle |
|---|---|---|
| `src/app/(auth)/login/page.tsx` | No 2FA step in login flow | E1 |
| `src/lib/templates/email.ts` | 14 hardcoded "ManageKar" strings; should use workspace branding | A6 |
| `src/lib/templates/whatsapp.ts` | "Powered by ManageKar" in customer-facing messages | A6 |
| `src/lib/email/components.ts` | managekar.com hardcoded in every email footer | A6 |
| `src/lib/email.ts` | FROM_EMAIL defaults to "ManageKar" brand | A6 |
| `src/lib/cron-handler.ts` | No email alert on cron failure | G1 |
| `src/lib/audit/constants.ts` | `tenant_documents` missing from SOFT_DELETABLE_TABLES | E4 |
| `src/app/(setup)/setup/page.tsx` | Inserts without withCreatedBy | E3 |
| `src/app/(tenant)/tenant/documents/page.tsx` | Hard delete on tenant_documents | E4 |
| `src/app/(tenant)/tenant/profile/page.tsx` | Read-only; no edit form | F3 |
| `src/app/(member)/member/profile/page.tsx` | Read-only; no edit form | F3 |
| `src/app/(dashboard)/activity/page.tsx` | No PermissionGuard | E2 |
| `src/components/forms/GuardianEntry.tsx` | Raw `<select>` | D1/F1 |
| `src/components/forms/AddressInput.tsx` | Raw `<select>` | D1/F1 |
| `src/components/forms/IdDocumentEntry.tsx` | Raw `<select>` | D1/F1 |
| `src/components/auth/invitation-form.tsx` | Raw `<select>` | D1/F1 |
| `src/components/reports/ReportPageHeader.tsx` | Raw `<select>` | D1/F1 |
| `src/app/(dashboard)/library-sections/page.tsx` | Inline metric compute | D1/C4 |
| `src/app/(dashboard)/library/page.tsx` | Inline metric compute | D1/C4 |
| `src/app/(dashboard)/properties/page.tsx` | Inline metric compute | D1/C4 |
| `src/app/(dashboard)/people/page.tsx` | Inline metric compute | D1/C4 |
| `src/app/(dashboard)/expenses/services/providers/page.tsx` | Inline metric compute | D1/C4 |
| All 21 pages listed in D1 section | Missing exportColumns | D1 |
| `src/app/(home)/_sections/*.tsx` (5 files) | Hardcoded gradient colors | F1 |
| `src/app/products/pg-manager/page.tsx` | 7 hardcoded gradient instances | F1 |
| `src/app/contact/page.tsx` | 3 hardcoded gradient instances | F1 |

### Healthy Patterns — What Is Working Well

- **RLS**: All library tables and PG tables have RLS enabled and workspace isolation policies
- **Soft Delete**: 42 tables in SOFT_DELETABLE_TABLES; `isSoftDeletableTable()` check in `useDetailPageMutations` is correct
- **withCreatedBy**: Correctly used in most create paths; the `withCreatedBy()` pattern is imported and applied
- **FK hints**: All known ambiguous library joins use explicit FK constraint names
- **Navigation dual-source**: Both `src/lib/navigation/config.ts` and `src/app/(dashboard)/layout.tsx` are in sync
- **Feature guards via ListPageTemplate**: All library list pages pass `feature="library"` and all pass `permission=`; the template handles both guard layers
- **Permission aggregation**: Multi-role staff get unioned permission set; this is correct GBAC multi-membership
- **PWA**: service worker, manifest, and registration in `layout.tsx` are all implemented
- **Security headers**: Strong CSP, HSTS, X-Frame-Options in `next.config.ts`
- **Rate limiting**: All API routes use wrapper functions (`withApiMiddleware`, `validateCronRequest`, `validateTenantRequest`, `handlePdfGeneration`) that include rate limiting
- **CSRF**: Sensitive POST routes use `requireCsrf: true` in `withApiMiddleware`
- **Cron authentication**: All crons use `validateCronRequest` which checks both rate limit and `CRON_SECRET`
- **Audit triggers**: Universal audit triggers on all tables via migration 038/069
- **People as single source**: Library member create flow creates person record first; edit updates both tables
- **Metric factories**: Majority of pages use `createStatusMetric`, `createTotalMetric`, `createSumMetric` etc
- **Column builders**: Standard columns use `statusColumn`, `currencyColumn`, `dateColumn` etc from `src/lib/columns`
- **Filter presets**: Standard filters use `PROPERTY_FILTER`, `PAYMENT_METHOD_FILTER` etc — no inline arrays
- **Image cropping**: Profile photo upload includes crop + JPEG encoding at 0.9 quality — partial compression

---

*Audit completed: 2026-04-25. Next recommended audit: after implementing 2FA, AI features, and the purge crons.*
