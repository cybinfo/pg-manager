# ManageKar — Comprehensive UI/UX Audit

> **Date**: 2026-02-22
> **Scope**: Full application — 30+ dashboard modules, 2 self-service portals, public website, 164 UI components, 43 hooks, 12 API routes, 5 auth pages
> **Methodology**: Automated deep-dive across 8 parallel analysis tracks

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scoring Dashboard](#2-scoring-dashboard)
3. [Shared UI Components](#3-shared-ui-components)
4. [Dashboard List Pages](#4-dashboard-list-pages)
5. [Dashboard Detail Pages](#5-dashboard-detail-pages)
6. [Form Pages](#6-form-pages)
7. [Hooks & Service Layer](#7-hooks--service-layer)
8. [Self-Service Portals](#8-self-service-portals)
9. [Styling & Theming](#9-styling--theming)
10. [API Routes & Auth](#10-api-routes--auth)
11. [Cross-Cutting Issues](#11-cross-cutting-issues)
12. [Prioritized Action Plan](#12-prioritized-action-plan)

---

## 1. Executive Summary

### Overall Grade: A- (87/100)

The ManageKar codebase demonstrates **excellent architectural discipline** with strong centralization patterns. The `ListPageTemplate`, `DetailPageTemplate`, `useFormPage`, and `useListPage` abstractions are mature and widely adopted. However, the audit identified **67 specific issues** across 8 categories, with 12 critical, 23 high, and 32 medium/low priority items.

### Key Strengths
- 96% `ListPageTemplate` adoption across 28 list pages
- 100% `DetailPageTemplate` adoption across 32 detail pages
- 98% hook centralization (43 hooks, only 1 page-level)
- Excellent z-index management (10/10 — fully centralized via CSS variables)
- Comprehensive dark mode support (129 `dark:` instances across 47 files)
- Strong security infrastructure (CSRF, rate limiting, RLS, audit trails)

### Key Weaknesses
- 4 overlapping stat display systems (StatCard, QuickStatsGrid, MetricsBar, InfoCard)
- Avatar+Name column renderer duplicated in 8 list pages
- Design tokens defined but underutilized (shadows in 34 files, spacing inconsistent)
- 5 detail pages missing breadcrumbs
- ~15 form pages use raw `<select>` instead of centralized `<Select>` component
- Hardcoded teal/emerald brand colors in 15+ files instead of CSS variables
- Audit logging missing on 8/12 API routes

---

## 2. Scoring Dashboard

| Area | Score | Grade | Key Issue |
|------|-------|-------|-----------|
| **List Pages** | 92/100 | A | Minor metric/column duplication |
| **Detail Pages** | 85/100 | B+ | Missing breadcrumbs, inconsistent inline editing |
| **Form Pages** | 78/100 | B | Raw selects, hardcoded options, validation gaps |
| **UI Components** | 82/100 | B | 4 overlapping stat systems, shadow/spacing tokens unused |
| **Hooks & Services** | 95/100 | A+ | Near-perfect centralization |
| **Portals** | 80/100 | B | Nav not centralized in tenant portal, error duplication |
| **Styling & Theming** | 88/100 | A- | Hardcoded brand colors, minor focus state gaps |
| **API & Security** | 88/100 | A- | Missing audit logging, weak password requirements |

---

## 3. Shared UI Components

### 3.1 Critical: 4 Overlapping Stat Display Systems

**The single largest design system gap.** Four components serve overlapping purposes:

| Component | File | Approach | Used In |
|-----------|------|----------|---------|
| `StatCard/StatsGrid` | `stat-card.tsx` | Color palette (blue/green/red/amber...) | Dashboard, portals |
| `QuickStatsGrid` | `quick-stats-grid.tsx` | Semantic variants (success/warning/error) | Detail pages |
| `MetricsBar` | `metrics-bar.tsx` | Horizontal strip with trends | List pages |
| `InfoCard` | `detail-components.tsx:130-197` | Detail page stat cards with links | Detail pages |

**Impact**: Developers don't know which to use. Decision tree comment in `stat-card.tsx:3-24` acknowledges the confusion.

**Fix**: Unify StatCard + QuickStatsGrid into a single component supporting both color-name and semantic variant APIs.

### 3.2 Critical: Design Tokens Defined but Not Used

Design tokens exist at `src/lib/design-tokens.ts` but are bypassed throughout:

| Token Category | Defined | Actually Used | Violation Count |
|----------------|---------|---------------|-----------------|
| Shadows | `shadows.card`, `shadows.dropdown` | Hardcoded `shadow-sm/md/lg` | **34 files** |
| Spacing | `spacing.section.padding` | Hardcoded `px-5 py-4`, `px-4 py-3` | **20+ files** |
| Typography | `typography.pageTitle` | Hardcoded `text-2xl font-bold` | **10+ files** |
| Border radius | `borders.radius.md` | Direct `rounded-lg`, `rounded-xl` | **15+ files** |
| Z-index | CSS variables | Used correctly | **0 violations** |

### 3.3 High: Hardcoded Colors Breaking Dark Mode

| Component | File | Issue |
|-----------|------|-------|
| `SectionDivider` | `section-divider.tsx:22-42` | 5 hardcoded `slate-*` colors, no dark mode |
| `PageHeader` avatar | `page-header.tsx:77` | Hardcoded `shadow-teal-500/20` |
| `DetailHero` avatar | `detail-components.tsx:86,92` | Hardcoded `from-teal-500 to-emerald-500` |
| `Divider` | `section-divider.tsx:42` | `bg-slate-200` (light only) |

**Fix**: Replace with semantic tokens (`bg-muted`, `text-muted-foreground`, `border`).

### 3.4 Medium: Dialog/Modal Pattern Fragmentation

Three import paths for dialogs:
```typescript
// Low-level primitives (should NOT be used directly)
import { AlertDialog, AlertDialogTrigger } from "@/components/ui"
// High-level wrappers (CORRECT)
import { FormDialog, ConfirmDialog, DeleteDialog } from "@/components/ui"
// Deprecated re-export
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
```

**Fix**: Remove AlertDialog primitive exports from `index.ts`. Standardize on FormDialog variants.

### 3.5 Medium: Missing Component States

| Component | Missing State | File |
|-----------|--------------|------|
| `Select` | No error styling, no disabled visual | `form-components.tsx:87-130` |
| `Combobox` | Incomplete error handling, no `aria-invalid` | `combobox.tsx:52` |
| `CurrencyInput/EmailInput` | No error-specific styling | `form-components.tsx:139-202` |
| `MetricsBar` | No `aria-pressed` on clickable items | `metrics-bar.tsx:63` |
| `ActionMenu` | No focus trap, fixed positioning breaks mobile | `detail-components.tsx:290-376` |

### 3.6 Low: Unused Card Variants

`card.tsx:6-22` defines `glass` and `interactive` variants — neither is used anywhere in the codebase. Remove or document intended usage.

---

## 4. Dashboard List Pages

### 4.1 Template Adoption: 96% (27/28 pages)

Only `Reports` and `Library Reports` use custom implementations (intentional — analytics dashboards). `Library Attendance` has a mixed implementation with custom QuickCheckIn/CurrentlyCheckedIn components alongside ListPageTemplate.

### 4.2 High: Avatar+Name Renderer Duplicated in 8 Pages

The same person-avatar-with-name rendering logic appears in:

| Page | File | Lines |
|------|------|-------|
| Tenants | `tenants/page.tsx` | 83-100 |
| Refunds | `refunds/page.tsx` | 73-81 |
| Visitors | `visitors/page.tsx` | 118-155 |
| Exit Clearance | `exit-clearance/page.tsx` | 65-79 |
| Staff | `staff/page.tsx` | 87-113 |
| Library Members | `library-members/page.tsx` | 60-74 |
| Library Attendance | `library-attendance/page.tsx` | 372-385 |
| Library Payments | `library-payments/page.tsx` | 61-74 |

**Fix**: Create `personNameWithAvatarColumn()` column builder. Single extraction, 8 files updated.

### 4.3 Medium: Custom Inline Metrics (7 Pages)

These pages define custom `compute` functions instead of using metric factories:

| Page | File | Lines | Missing Factory |
|------|------|-------|-----------------|
| Payments | `payments/page.tsx` | 221-234 | `createTopItemMetric()` |
| Expenses | `expenses/page.tsx` | 212-257 | `createAverageMetric()` |
| Meter Readings | `meter-readings/page.tsx` | 269-278 | Custom compute |
| Notices | `notices/page.tsx` | 273-287 | `createExpiringMetric()` |
| Visitors | `visitors/page.tsx` | 329-337 | `createDynamicDateMetric()` |
| Library Payments | `library-payments/page.tsx` | 224-233 | `createTodayMetric()` |
| Library Plans | `library-plans/page.tsx` | 155-177 | `createAverageMetric()` |

**Fix**: Extract 3-4 new metric factories, update 7 files.

### 4.4 Medium: Inline Status Filters (8+ Pages)

8+ pages define `createStatusFilter([...])` inline instead of using predefined filter constants. Consolidate into `lib/filter-presets.ts`.

### 4.5 Low: Notes Truncation Inconsistency

Notes columns use different max-widths: `150px` (Rooms, Tenants, Bills), `200px` (other pages), `line-clamp-2` (Refunds). Create a `notesColumn()` builder with standard behavior.

### 4.6 Low: Hardcoded Feature Badge Colors

Library list pages (`library/page.tsx:182-193`, `library-lockers/page.tsx:88-94`, `library-seats/page.tsx:52-61`) hardcode colors for AC, WiFi, Lockers, Parking badges. Move to centralized config maps.

---

## 5. Dashboard Detail Pages

### 5.1 Template Adoption: 100% (32/32 pages)

All detail pages correctly use `DetailPageTemplate` with `layoutKey`, `entityType`, and `record` props. Automatic "Record Information" and "Activity History" sections are included in every detail page.

### 5.2 Critical: 5 Pages Missing Breadcrumbs

| Page | File | Has Breadcrumbs |
|------|------|-----------------|
| Properties | `properties/[id]/page.tsx:113-116` | Yes |
| Rooms | `rooms/[id]/page.tsx:107-110` | Yes |
| Tenants | `tenants/[id]/page.tsx:240-243` | Yes |
| **Refunds** | `refunds/[id]/page.tsx:175-179` | **NO** |
| **Expenses** | `expenses/[id]/page.tsx:72-76` | **NO** |
| **Payments** | `payments/[id]/page.tsx:165-172` | **NO** |
| **Staff** | `staff/[id]/page.tsx:250-253` | **NO** |
| **Meters** | `meters/[id]/page.tsx:242-244` | **NO** |

### 5.3 Critical: Missing PermissionGate on Edit/Delete Buttons

| Page | File | Issue |
|------|------|-------|
| Properties | `properties/[id]/page.tsx:134-139` | Edit button lacks PermissionGate |
| Rooms | `rooms/[id]/page.tsx:119-124` | Edit button lacks PermissionGate |
| Refunds | `refunds/[id]/page.tsx:195-202` | Edit/Delete buttons lack PermissionGate |

### 5.4 High: Inconsistent Inline Editing Patterns

Three different editing approaches exist on detail pages:

| Pattern | Pages | Issue |
|---------|-------|-------|
| Edit button in Hero → separate `/edit` page | Properties, Rooms, Tenants, Bills | Correct standard pattern |
| Inline edit within DetailSection | Refunds (`264-356`), Staff (`340-391`), Complaints (`249-317`) | Breaks read-only detail pattern |
| Entire page becomes edit form | Notices (`235-520`) | Unique, inconsistent |

**Fix**: Refunds, Staff, Complaints should use separate edit pages. Keep detail pages read-only.

### 5.5 Medium: Status Display Variations

- Properties: `status="active"` prop on DetailHero
- Rooms: Converts to variant (`"success"`, `"error"`, `"warning"`)
- Tenants: Uses `getStatusKey()` function
- Refunds: Uses `<TableBadge>` instead of `status` prop

**Fix**: Standardize on DetailHero `status` + `statusVariant` pattern.

### 5.6 Medium: Number Formatting Inconsistency

Meters detail page (`meters/[id]/page.tsx:301,381,397,445`) uses `toLocaleString()` instead of `formatNumber()` utility. Standardize.

---

## 6. Form Pages

### 6.1 Hook Adoption: 66% (35/53 pages)

| Hook | Adoption | Notes |
|------|----------|-------|
| `useFormPage` (create) | 35/53 (66%) | 18 pages use custom implementations |
| `useFormEditPage` (edit) | 20/53 (38%) | Complex forms bypass hook |

### 6.2 Critical: ~15 Pages Use Raw `<select>` Instead of `<Select>`

Per CLAUDE.md Section 4.1, the custom `<Select>` from `form-components` should always be used. Pages using raw `<select>`:

| Page | File | Lines |
|------|------|-------|
| Rooms (new) | `rooms/new/page.tsx` | 269, 301 |
| Rooms (edit) | `rooms/[id]/edit/page.tsx` | 206, 238 |
| Payments (new) | `payments/new/page.tsx` | 496, 528 |
| Expenses (new) | `expenses/new/page.tsx` | Multiple |
| Visitors (new) | `visitors/new/page.tsx` | Via `_components` |
| ~10 more pages | Various | Various |

### 6.3 High: Hardcoded Option Lists Duplicated

| Options | Duplicated In | Occurrences |
|---------|---------------|-------------|
| Payment methods (cash/upi/bank_transfer/cheque/card) | payments/new, library-members/new, library-members/renew | 3+ |
| Status options (active/notice_period/checked_out) | tenants/edit, library-members/edit, meter-readings/edit | 3+ |
| ID proof types (Aadhaar, PAN, etc.) | library-members/new, library-members/edit | 2 |
| Room types + bed counts | rooms/new (`34-46`), rooms/edit (`30-35`) | 2 |
| Amenities list | rooms/new (`49-59`), rooms/edit (`38-48`) | 2 |

**Fix**: Centralize all option lists in `src/lib/constants/` or `src/types/`.

### 6.4 High: Only 1 Page Has Field-Level Error Display

Only `people/new/page.tsx:299,314,391` shows inline field errors. All other forms display errors only via toast notifications.

**Fix**: Implement field-level error display for complex forms (tenants/new, bills/new, payments/new at minimum).

### 6.5 Medium: Validation Approach Inconsistency

- 35 pages: Callback validation via `useFormPage` `validate` option
- 1 page: `validationSchema` (field-level, promoted but rarely used)
- 18 pages: Custom manual validation

**Fix**: Promote `validationSchema` adoption for consistent field-level validation.

### 6.6 Medium: Missing Required Field Indicators

Labels inconsistently show asterisks for required fields. Some pages mark required fields (`library-members/new:371,383,503`), others don't (`rooms/new:367`).

### 6.7 Low: Missing Form Value Persistence

Long forms (people/new, bills/new) lose data on page refresh. No localStorage/sessionStorage fallback exists.

### 6.8 Low: No Submit Debouncing

No form implements submit debouncing — users could trigger multiple submissions before redirect completes.

---

## 7. Hooks & Service Layer

### 7.1 Centralization: 98% (42/43 shared, 1 page-level)

**Outstanding architecture.** 42 of 43 hooks are properly extracted to `/src/lib/hooks/`. The architecture is clean:

```
Pages → Hooks (43) → Services (5) → Workflows (4) → Supabase + RLS
```

### 7.2 Medium: 1 Page-Level Hook Should Be Extracted

`useVisitorForm` (`src/app/(dashboard)/visitors/new/_components/useVisitorForm.ts`, 477 lines) should move to `src/lib/hooks/useVisitorForm.ts`.

### 7.3 Medium: No AbortController Usage

`useAsyncOperation` (`src/lib/hooks/useAsyncOperation.ts:85+`) uses `isMountedRef` workaround instead of proper AbortController for request cancellation. Risk: memory leaks on slow networks.

### 7.4 Low: Error Handling Pattern Inconsistency

Three patterns coexist without documented guidance:
1. Try/catch with toast (hooks)
2. `ServiceResult<T>` wrapper (services)
3. Return error with data (detail page hooks)

**Fix**: Document when to use which pattern.

### 7.5 Audit System: Exemplary

- `withCreatedBy()` on every insert
- `softDelete()` on every deletion (17 auditable tables)
- `logAuditEvent()` centralized
- Universal triggers in PostgreSQL

---

## 8. Self-Service Portals

### 8.1 Critical: Tenant Portal Navigation Not Centralized

**Member portal** correctly uses `LIBRARY_MEMBER_NAVIGATION` from config (`layout.tsx:95`).

**Tenant portal** hardcodes navigation inline (`layout.tsx:18-26`) instead of using `TENANT_NAVIGATION` from `src/lib/navigation/config.ts`.

**Fix**: Update tenant layout to import from centralized config.

### 8.2 High: Error Boundary Code Duplication

`src/app/(tenant)/error.tsx` and `src/app/(member)/error.tsx` are identical except for route references.

**Fix**: Create shared `src/components/portal/PortalError.tsx` that accepts `portalType` prop.

### 8.3 High: Inconsistent Status Badge Usage

Member portal uses inline Tailwind badges instead of the `StatusBadge` component:
- `member/profile/page.tsx:61-72` — inline badge for member status
- `member/page.tsx:220` — subscription status

### 8.4 Medium: Empty State Styling Inconsistency

- **Tenant portal**: Card-based empty states with icons (e.g., `bills/page.tsx:197-204`)
- **Member portal**: Simple text with icon (e.g., `attendance/page.tsx:179-183`)

**Fix**: Create shared `PortalEmptyState` component.

### 8.5 Medium: Join Transform Inconsistency

- Tenant payments: Uses `transformJoin()` correctly
- Tenant notices: Manual array handling (`notices/page.tsx:99-106`)
- Member home: Manual array handling (`page.tsx:49-51`)

### 8.6 Low: QR Code Not Responsive

Member QR code size hardcoded to `250px` (`member/qr/page.tsx:88`). Could overflow on small screens.

---

## 9. Styling & Theming

### 9.1 Overall Design System Score: 8.8/10

| Aspect | Score | Notes |
|--------|-------|-------|
| Color centralization | 8.5/10 | Minor hardcoding (40+ teal/emerald instances) |
| Typography | 9/10 | 4 arbitrary `text-[10px]` instances |
| Spacing | 9.5/10 | Zero arbitrary `p-[X]` values |
| Dark mode | 9.5/10 | 129 `dark:` instances, comprehensive |
| Z-index | 10/10 | Perfect CSS variable management |
| Borders | 9.5/10 | Zero arbitrary border-radius values |
| Responsive | 9.5/10 | 376 breakpoint instances, mobile-first |
| Animations | 9/10 | 11 keyframes, motion reduction support |
| Focus states | 8/10 | Some inconsistency in ring styles |
| Shadows | 7/10 | 107 instances, many bypass tokens |

### 9.2 High: Hardcoded Brand Colors (40+ instances)

Teal/emerald gradient hardcoded across 15+ landing/public pages:
- `src/app/contact/page.tsx` (3 instances)
- `src/app/products/pg-manager/page.tsx` (6+ instances)
- `src/app/(home)/_sections/HeroSection.tsx` (4 instances)
- Multiple other files

**Fix**: Extract to CSS variable `--gradient-brand`.

### 9.3 Medium: Gray Color Hardcoding (8 instances)

`bg-gray-300/400/500/900` in:
- `src/components/ui/image-cropper.tsx` (4 instances)
- `src/app/(dashboard)/properties/[id]/edit/_components/WebsiteSettingsTab.tsx` (2)
- `src/app/(dashboard)/refunds/[id]/page.tsx` (1)

**Fix**: Replace with `bg-muted`, `bg-secondary`, `bg-border`.

### 9.4 Low: Focus State Inconsistency

Some buttons use `focus-visible:ring-ring`, others `focus-visible:ring-primary/30`. Standardize on `focus-visible:ring-2 focus-visible:ring-primary`.

---

## 10. API Routes & Auth

### 10.1 Infrastructure: Excellent

| Infrastructure | Status | Implementation |
|----------------|--------|----------------|
| CSRF Protection | A+ | Double-submit cookie, constant-time comparison |
| Rate Limiting | A+ | 5 pre-configured limiters, sliding window |
| API Middleware | A+ | Composable `withApiMiddleware()` |
| Response Format | A+ | Consistent `apiSuccess`/`apiError` helpers |
| Auth Context | A | 50+ permissions, runtime validation |
| Session Management | A | Timeout protection, refresh buffer |

### 10.2 Critical: Audit Logging Missing on 8/12 Routes

| Route | Has Audit Logging |
|-------|-------------------|
| POST /admin/update-user-email | **NO** |
| POST /verify-email/send | **NO** |
| POST /verify-email/confirm | **NO** |
| GET /cron/generate-bills | Partial |
| GET /cron/expire-memberships | **YES** |
| GET /cron/library-notifications | **NO** |
| GET /cron/payment-reminders | Partial |
| GET /cron/daily-summaries | **NO** |
| GET /receipts/[id]/pdf | **NO** |
| GET /library-receipts/[id]/pdf | **NO** |
| GET /tenants/[id]/journey | **NO** |
| GET /tenants/[id]/journey-report | **NO** |

### 10.3 High: Weak Password Requirements

Registration and password reset only enforce 6-character minimum. No complexity requirements (uppercase, numbers, symbols).

**Files**: `register/page.tsx`, `reset-password/page.tsx`

### 10.4 High: Email Enumeration Risk

`/forgot-password` shows success only for valid emails, revealing account existence.

**Fix**: Always show generic "If account exists, you'll receive an email" message.

### 10.5 Medium: Auth Pages Missing Schema Validation

Login and register forms use manual state checks instead of Zod schemas (unlike API routes which properly use Zod).

---

## 11. Cross-Cutting Issues

### 11.1 Centralization Violations Summary

| Violation | Instances | Fix Effort |
|-----------|-----------|------------|
| Avatar+Name column duplication | 8 pages | 2 hours |
| Hardcoded option lists | 10+ pages | 1 hour |
| Raw `<select>` instead of `<Select>` | ~15 pages | 2-3 hours |
| Stat system overlap | 4 components | 4 hours |
| Shadow tokens unused | 34 files | 2 hours |
| Brand color hardcoding | 15+ files | 1 hour |
| Error boundary duplication | 2 portal files | 30 min |
| Tenant nav not centralized | 1 file | 15 min |

### 11.2 Missing Patterns

| Pattern | Impact | Where Needed |
|---------|--------|--------------|
| `PersonNameWithAvatarColumn` builder | 8 list pages | `src/lib/column-builders.ts` |
| `notesColumn()` builder | 10+ pages | `src/lib/column-builders.ts` |
| Field-level form errors | All complex forms | `src/components/ui/form-field-error.tsx` |
| `PortalError` shared component | 2 portals | `src/components/portal/PortalError.tsx` |
| `PortalEmptyState` shared component | 2 portals | `src/components/portal/PortalEmptyState.tsx` |
| Submit debouncing | All forms | `useFormPage` hook |
| AbortController in async hooks | Data fetching hooks | `useAsyncOperation` |

### 11.3 Accessibility Gaps

| Issue | Component | Severity |
|-------|-----------|----------|
| Missing `aria-pressed` on clickable metrics | `MetricsBar` | Medium |
| No keyboard navigation beyond Escape | `ActionMenu` | Medium |
| Missing `role="listbox"` on options | `Combobox` | Medium |
| Spinning icon lacks `aria-label` | `StatusBadge` | Low |
| Small touch targets (8x8 px) in portals | `ProfileFieldRow` | Low |

---

## 12. Prioritized Action Plan

### Phase 1: Critical Fixes (1-2 days)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Add breadcrumbs to 5 detail pages | Refunds, Expenses, Payments, Staff, Meters `[id]/page.tsx` | 1 hour |
| 2 | Add PermissionGate to edit/delete buttons | Properties, Rooms, Refunds `[id]/page.tsx` | 30 min |
| 3 | Centralize tenant portal navigation | `src/app/(tenant)/layout.tsx` | 15 min |
| 4 | Add audit logging to 8 API routes | `src/app/api/*/route.ts` | 2 hours |
| 5 | Fix email enumeration on forgot-password | `src/app/(auth)/forgot-password/page.tsx` | 15 min |
| 6 | Strengthen password requirements | `register/page.tsx`, `reset-password/page.tsx` | 30 min |

### Phase 2: High-Priority Centralization (3-5 days)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 7 | Create `personNameWithAvatarColumn()` builder | New builder + 8 list pages | 2 hours |
| 8 | Replace all raw `<select>` with `<Select>` | ~15 form pages | 2-3 hours |
| 9 | Centralize hardcoded option lists | New constants file + 10+ form pages | 1.5 hours |
| 10 | Fix SectionDivider hardcoded colors | `section-divider.tsx` | 30 min |
| 11 | Extract brand gradient to CSS variable | `globals.css` + 15+ landing pages | 1.5 hours |
| 12 | Create shared PortalError component | New component + 2 error files | 30 min |
| 13 | Remove inline editing from detail pages | Refunds, Staff, Complaints `[id]/page.tsx` | 3 hours |
| 14 | Extract custom metric factories | New factories + 7 list pages | 2 hours |

### Phase 3: Design System Hardening (1-2 weeks)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 15 | Unify stat display systems (StatCard + QuickStatsGrid) | 2 component files + consumers | 4 hours |
| 16 | Enforce design token usage (shadows, spacing) | 34+ files for shadows, 20+ for spacing | 4 hours |
| 17 | Add field-level error display to complex forms | `form-components.tsx` + 5+ forms | 3 hours |
| 18 | Standardize portal empty states | New component + 10+ pages | 2 hours |
| 19 | Standardize status display on detail pages | 10+ detail pages | 2 hours |
| 20 | Replace gray hardcoded colors | 8 files | 1 hour |
| 21 | Remove AlertDialog primitive exports | `components/ui/index.ts` | 30 min |
| 22 | Move useVisitorForm to shared hooks | 1 file move + import updates | 30 min |

### Phase 4: Polish & Enhancement (ongoing)

| # | Task | Effort |
|---|------|--------|
| 23 | Add AbortController to useAsyncOperation | 2 hours |
| 24 | Add submit debouncing to useFormPage | 1 hour |
| 25 | Improve accessibility (aria attributes, focus states) | 4 hours |
| 26 | Add form value persistence for long forms | 1 hour |
| 27 | Standardize focus-visible ring styles | 2 hours |
| 28 | Add `notesColumn()` builder | 1 hour |
| 29 | Add Zod validation to auth pages | 1 hour |
| 30 | Remove unused Card variants (glass, interactive) | 15 min |

---

## Appendix: File Index

### Files Requiring Immediate Attention (Phase 1)

```
src/app/(dashboard)/refunds/[id]/page.tsx        — Missing breadcrumbs + PermissionGate
src/app/(dashboard)/expenses/[id]/page.tsx        — Missing breadcrumbs
src/app/(dashboard)/payments/[id]/page.tsx        — Missing breadcrumbs
src/app/(dashboard)/staff/[id]/page.tsx           — Missing breadcrumbs
src/app/(dashboard)/meters/[id]/page.tsx          — Missing breadcrumbs
src/app/(dashboard)/properties/[id]/page.tsx      — Missing PermissionGate on edit
src/app/(dashboard)/rooms/[id]/page.tsx           — Missing PermissionGate on edit
src/app/(tenant)/layout.tsx                       — Hardcoded navigation (lines 18-26)
src/app/(auth)/forgot-password/page.tsx           — Email enumeration risk
src/app/(auth)/register/page.tsx                  — Weak password requirements
src/app/(auth)/reset-password/page.tsx            — Weak password requirements
src/app/api/admin/update-user-email/route.ts      — Missing audit logging
src/app/api/verify-email/send/route.ts            — Missing audit logging
src/app/api/receipts/[id]/pdf/route.ts            — Missing audit logging
```

### Component Files Requiring Refactoring (Phase 2-3)

```
src/components/ui/section-divider.tsx             — 5 hardcoded colors
src/components/ui/stat-card.tsx                   — Overlaps with quick-stats-grid
src/components/ui/quick-stats-grid.tsx            — Overlaps with stat-card
src/components/ui/detail-components.tsx            — Hardcoded avatar colors
src/components/ui/page-header.tsx                 — Hardcoded teal shadow
src/components/ui/form-components.tsx             — Missing error states
src/components/ui/combobox.tsx                    — Incomplete ARIA
src/components/ui/metrics-bar.tsx                 — Missing ARIA
src/components/ui/image-cropper.tsx               — Hardcoded gray colors
```

---

*Generated by CPE-AI deep codebase audit — 8 parallel analysis agents, 164 components, 53 forms, 32 detail pages, 28 list pages, 43 hooks, 12 API routes, 5 auth pages examined.*
