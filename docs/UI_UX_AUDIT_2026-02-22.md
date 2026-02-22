# ManageKar — Comprehensive UI/UX Audit

> **Date**: 2026-02-22
> **Scope**: Full application — 167 pages, 84+ UI components, 38+ hooks, 30+ dashboard modules
> **Codebase Version**: 95877ee (main)
> **Fixes Applied**: Phase 1 (10/10) + Phase 2 (9/9) + Phase 3 (6/6) + Phase 4 (6/6) + Phase 5 (5/5) = **36 tasks completed, 300+ files changed**

---

## Executive Summary

| Area | Score | Verdict |
|------|-------|---------|
| **Component Library** | 9.0/10 | Mature, well-decomposed, minimal duplication |
| **Dashboard Pages** | 8.2/10 | 51% on ListPageTemplate, high standardization |
| **Auth & Portals** | 7.5/10 | Good flows, accessibility gaps |
| **Styles & Theming** | 8.0/10 | Solid infrastructure, 367 hardcoded colors to migrate |
| **Hooks & Data Patterns** | 9.2/10 | Excellent centralization, 38+ reusable hooks |
| **Navigation & IA** | 8.0/10 | Centralized config, inconsistent tab/redirect patterns |
| **Overall** | **8.3/10** | Production-ready with clear improvement roadmap |

---

## Table of Contents

1. [Component Library](#1-component-library)
2. [Dashboard Page Consistency](#2-dashboard-page-consistency)
3. [Authentication & Self-Service Portals](#3-authentication--self-service-portals)
4. [Styles & Theming](#4-styles--theming)
5. [Hooks & Data Patterns](#5-hooks--data-patterns)
6. [Navigation & Information Architecture](#6-navigation--information-architecture)
7. [Cross-Cutting Issues](#7-cross-cutting-issues)
8. [Prioritized Recommendations](#8-prioritized-recommendations)
9. [Appendix: File Reference](#9-appendix-file-reference)

---

## 1. Component Library

**84 components** in `src/components/ui/`, organized into 6 categories.

### 1.1 Templates (Excellent)

| Template | Purpose | Usage | Code Reduction |
|----------|---------|-------|----------------|
| `ListPageTemplate` | All list pages | 72 pages (51%) | ~1,600 lines eliminated |
| `DetailPageTemplate` | All detail pages | 20+ pages | ~800 lines eliminated |
| `FormPageTemplate` | Create/edit forms | 35+ pages | ~400 lines eliminated |

### 1.2 Status & Badge System (Excellent)

- `StatusBadge` — config-driven with 7 color variants (success, warning, error, info, muted, primary, purple)
- `PriorityBadge` — priority-specific variant
- `StatusIndicator` — compact dot for tables
- `TableBadge` — inline table rendering
- Centralized color map in `src/lib/status-colors.ts`

### 1.3 Stats Display (Needs Documentation)

Four overlapping systems exist:

| Component | Use Case | Location |
|-----------|----------|----------|
| `MetricsBar` | Horizontal KPI bar on list pages | `metrics-bar.tsx` |
| `StatCard` + `StatsGrid` | Grid of stats (most flexible) | `stat-card.tsx` |
| `QuickStatsGrid` | Preset wrapper over StatsGrid | `quick-stats-grid.tsx` |
| `InfoCard` | Small cards on detail pages | `detail-components.tsx` |

**Issue**: No documented decision tree for when to use each.
**Recommendation**: Document that `StatCard`/`StatsGrid` is the preferred base; `QuickStatsGrid` is a convenience wrapper; `MetricsBar` is for list page headers only.

### 1.4 Dialog/Modal Duplication (Fix Required)

**Two `ConfirmDialog` implementations exist:**

| File | Base Component | Features |
|------|---------------|----------|
| `form-dialog.tsx` | `<Dialog>` | Destructive variant, icon support, form wrapper |
| `confirm-dialog.tsx` | `<AlertDialog>` | Simpler, fewer options |

**Recommendation**: Consolidate to `form-dialog.tsx` version (more features). Remove `confirm-dialog.tsx` and update all imports.

### 1.5 Form Components (Good)

- `FormField` wrapper with label/hint/error/accessibility
- Custom `Select` component (NOT shadcn) — per CLAUDE.md
- Specialized inputs: `CurrencyInput`, `PhoneInput`, `DateInput`, `SearchInput`
- Entity selectors: `EntitySelector` base with `PersonSelector`, `VendorSelector`, `ProductSelector` wrappers
- Multi-entry: `PhoneEntry`, `EmailEntry`, `GuardianEntry`, `AddressInput`, `IdDocumentEntry`

### 1.6 Entity Links (Elegant)

Factory pattern in `entity-link.tsx` creates 12 link types (PropertyLink, TenantLink, BillLink, etc.) with consistent icon + text formatting and stopPropagation handling.

### 1.7 Missing or Weak Abstractions

| Gap | Details |
|-----|---------|
| No `Toast` component exposed | Uses `toast-helpers.ts` functions only — consider a visual component |
| No standardized `EmptyState` in portals | Portals use ad-hoc text instead of `EmptyState` component |
| No `FormField` adoption in portals | Portal forms use raw inputs instead of the accessible `FormField` wrapper |

---

## 2. Dashboard Page Consistency

### 2.1 Coverage Matrix

| Page Type | Count | Template Used | Consistency |
|-----------|-------|--------------|-------------|
| List Pages | 72 | `ListPageTemplate` | 95% |
| Detail Pages | 20+ | `DetailPageTemplate` | 92% |
| Form Pages | 53 | `useFormPage` hook | 78% |
| Special Pages | 16 | Custom | 45% |

### 2.2 Fully Standardized List Pages (30+)

**PG Modules**: tenants, properties, rooms, bills, payments, expenses, refunds, complaints, notices, visitors, exit-clearance, meters, meter-readings, staff, people

**Library Modules**: members, attendance, seats, sections, plans, payments, lockers, waitlist, libraries

All follow:
```
ListPageTemplate
├── PageHeader (title, description, icon)
├── MetricsBar (computed stats)
├── ListPageFilters (quick filters)
├── GroupBy Options
├── AdvancedFilterBuilder
├── DataTable (columns, sorting, pagination, inline edit)
└── SavedViews
```

### 2.3 Pages NOT Using Standard Templates

| Page | Current Pattern | Should Standardize? |
|------|----------------|-------------------|
| `/approvals` | Custom `useListPage` + manual DataTable | **Yes** — refactor to ListPageTemplate |
| `/activity` | Custom DataTable with ACTION_CONFIG | **Yes** — refactor to ListPageTemplate |
| `/dashboard` | Custom metrics + charts | No — justified (overview page) |
| `/reports` | Custom Recharts layouts | No — justified (analytics) |
| `/library-reports` | Custom Recharts layouts | No — justified (analytics) |
| `/architecture` | Custom 3D visualization | No — justified (visualization) |
| `/settings` | Custom multi-tab form | Partially — tabs should be URL-based |
| `/admin` | Custom workspace explorer | No — justified (platform admin) |

### 2.4 Detail Pages Missing Template

| Page | Issue |
|------|-------|
| `/tenants/[id]` | Uses `DetailHero` + custom layout instead of `DetailPageTemplate` |
| `/properties/[id]` | Uses `DetailHero` + custom layout instead of `DetailPageTemplate` |

**Recommendation**: Refactor both to use `DetailPageTemplate` for consistent audit trail display.

### 2.5 Form Page Inconsistencies

| Issue | Pages Affected | Fix |
|-------|---------------|-----|
| Different hooks for new vs edit | All edit pages use `useFormEditPage` | Unify into single hook |
| Direct Supabase calls in forms | ~10 library pages | Migrate to `useFormPage` with `customSubmit` |
| No unsaved changes warning | All edit pages | Add `beforeunload` handler |
| Toast-only validation (no field highlighting) | All form pages | Add field-level error display |

### 2.6 Loading States

| Pattern | Component | Usage | Consistency |
|---------|-----------|-------|-------------|
| Full page loading | `PageSkeleton` | List pages (95%) | High |
| Detail page loading | `PageLoading` | Detail pages (90%) | High |
| Form page loading | Mixed | Variable | Medium |
| Inline loading | `Loader2` spinner | Button states (100%) | Perfect |

### 2.7 Error Handling

| Pattern | Coverage | Issue |
|---------|----------|-------|
| `showError()` toast | 85% of pages | Consistent |
| `handleClientError()` | 60% of pages | Good but not universal |
| `ErrorState` component | 30% of pages | Inconsistent — some show, some toast only |
| Global error boundary | **0%** | **Missing entirely** |

### 2.8 Empty States

- All `ListPageTemplate` pages have consistent empty states
- **Exception**: Approvals and Activity pages have missing/vague empty messages
- Portal empty states are inconsistent (tenant uses icon+message, member uses text-only)

---

## 3. Authentication & Self-Service Portals

### 3.1 Auth Pages (`src/app/(auth)/`)

| Page | Dark Mode | Loading | Error Pattern | Mobile | Dead Ends |
|------|-----------|---------|---------------|--------|-----------|
| Login | ✓ | SubmitButton + Suspense | Toast | ✓ px-4, max-w-md | None |
| Register | ✓ | SubmitButton + countdown | Toast | ✓ | None |
| Forgot Password | ✓ | SubmitButton | Toast | ✓ | None |
| Reset Password | ✓ | 3-stage verification | Toast + card states | ✓ | None |
| Verify Email | ✓ | 4-stage flow | Card states | ✓ | None |

**Branding**: Teal-50 → Emerald-50 gradient (light), Teal-950 → Emerald-950 (dark)

### 3.2 Tenant Portal (`src/app/(tenant)/`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Navigation | 7 items via `PortalLayout` | Consistent sidebar |
| Branding | Teal/Emerald gradient | Matches auth pages |
| Dark mode | Implemented | Good coverage |
| Mobile | `lg:hidden` responsive header | Proper hamburger menu |
| Forms | Raw inputs (no `FormField`) | **Should adopt FormField** |
| Empty states | Icon + message pattern | Good |
| Dead ends | None detected | Clean flow |

### 3.3 Member Portal (`src/app/(member)/`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Navigation | 5 items via `PortalLayout` | Consistent sidebar |
| Branding | Purple/Indigo gradient | Intentionally distinct |
| Dark mode | Implemented | Good coverage |
| Mobile | `lg:hidden` responsive header | Matches tenant portal |
| Forms | Raw inputs (no `FormField`) | **Should adopt FormField** |
| Empty states | Text-only (weaker) | **Should match tenant portal pattern** |
| Dead ends | None detected | Clean flow |

### 3.4 Public PG Website (`src/app/pg/[slug]/`)

- Standard brand colors
- Contact form with rate limiting
- Proper 404 handling for non-existent/disabled properties

### 3.5 Portal Accessibility Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| Missing `aria-label` on icon-only buttons (mobile menu toggle, logout) | Screen readers can't describe actions | Add aria-labels (30 min) |
| No `FormField` wrapper in portal forms | Missing `aria-invalid`, `aria-describedby` | Adopt FormField (2-3 hrs) |
| No skip-to-content links | Keyboard users can't skip nav | Add sr-only link (30 min) |
| Gradient text contrast not verified | WCAG AA may fail in some areas | Test and fix (1-2 hrs) |

### 3.6 Feedback Pattern Inconsistency

| Context | Success | Failure |
|---------|---------|---------|
| Auth pages | Full success card + auto-redirect | Toast + error card states |
| Portal actions | Toast only | Toast only |
| Dashboard CRUD | Toast + redirect | Toast |

**Recommendation**: Document when to use card-state vs toast-only feedback.

---

## 4. Styles & Theming

### 4.1 Theme Infrastructure (Solid)

- **CSS Variables**: 13+ semantic colors in `:root` and `.dark` (globals.css)
- **Tailwind v4**: `@theme inline` block maps CSS vars to theme
- **Design Tokens**: Centralized in `src/lib/design-tokens.ts`
- **Dark Mode**: 442 `dark:` class instances across codebase
- **Animations**: 28 utility classes with `prefers-reduced-motion` support

### 4.2 Hardcoded Colors (367 instances)

**This is the single biggest styling issue.**

| Category | Count | Examples | Fix Strategy |
|----------|-------|---------|-------------|
| Status/semantic colors | ~250 | `text-green-600`, `bg-red-100`, `text-blue-600` | Use semantic tokens or `status-colors.ts` map |
| Brand/marketing pages | ~60 | `text-teal-600`, `from-teal-500 to-emerald-500` | Use `--primary` CSS variable |
| Component variants | ~40 | Status badge, stat card colors | Already centralized — acceptable |
| Print styles | ~15 | `#e5e5e5`, `#ddd`, `#333` | Migrate to CSS variables |

**Top offending files**:
- `src/app/(tenant)/tenant/bills/page.tsx`
- `src/app/(tenant)/tenant/complaints/page.tsx`
- `src/app/(tenant)/tenant/profile/_components/*.tsx`
- `src/app/contact/page.tsx`
- `src/app/products/pg-manager/page.tsx`

### 4.3 Inline Styles (15 instances — All Justified)

All inline styles are for dynamic values (heights, transforms, percentages, grid templates). No hardcoded static styles.

### 4.4 Z-Index Inconsistencies

| File | Value | Issue |
|------|-------|-------|
| `image-lightbox.tsx` | `style={{ zIndex: 99999 }}` | Hardcoded |
| `image-cropper.tsx` | `style={{ zIndex: 99999 }}` | Hardcoded |
| `keyboard-shortcuts-dialog.tsx` | `z-[100]` | Arbitrary |
| `command-palette.tsx` | `z-[100]` | Arbitrary |

**Recommendation**: Define z-index scale in Tailwind config (modal: 50, dialog: 100, lightbox: 200).

### 4.5 Spacing & Radius (Consistent)

- **Spacing**: Standard Tailwind scale, only 4 arbitrary values
- **Border radius**: `rounded-md` (513x), `rounded-full` (233x), `rounded-lg` (125x)
- **Typography**: 1,093 classes, only 4 arbitrary text sizes (`text-[10px]`, `text-[11px]`)
- **Shadows**: Standard variants, but CSS custom shadows use hardcoded `rgba()` values

### 4.6 Gradient Standardization Needed

15+ hardcoded gradient patterns (`from-teal-500 to-emerald-500`) should be extracted to CSS variables:

```css
:root {
  --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(160, 69%, 41%));
  --gradient-secondary: linear-gradient(135deg, hsl(var(--accent)), hsl(26, 90%, 50%));
}
```

---

## 5. Hooks & Data Patterns

### 5.1 Hook Architecture (Excellent — 38+ Hooks)

#### Core Data Hooks

| Hook | Lines | Purpose | Sub-hooks |
|------|-------|---------|-----------|
| `useListPage` | 650 | List page data + UI state | 4 (Filters, Metrics, Grouping, Pagination) |
| `useFormPage` | 630 | Create/edit form state + submission | None |
| `useEntityMutation` | 555 | CRUD with audit logging | None |
| `useDetailPage` | 107 | Detail page data (composition) | 2 (Data, Mutations) |
| `useAsyncOperation` | 227 | Generic async with loading/error | Exports `useMutation`, `useLoadingOperation` |
| `useInlineEdit` | 277 | Cell-level editing with optimistic updates | None |

#### Utility Hooks

`useDebounce`, `useCopyToClipboard`, `useTimer`, `useDeleteConfirmation`, `useDialogState`, `useKeyboardShortcuts`, `useCountUp`, `useSidebarOrder`, `useFilterBuilder`

#### Auth Hooks

`useAuthContext` (combined), `useAuth` (permissions), `useCurrentContext` (workspace), `useRequireAuth` (protection)

### 5.2 Data Fetching Patterns (Verified)

- **No Supabase calls in components** — all data fetching lives in hooks
- **All list pages** use `useListPage` hook
- **All detail pages** use `useDetailPage` hook
- **Join transforms** consistently applied via `transformJoin()`/`transformArrayJoins()`
- **Audit tracking** enforced via `withCreatedBy()` and `softDelete()`

### 5.3 Error Handling Chain (Centralized)

```
Component → handleClientError() → getErrorMessage() → showError() toast
                                                    → POSTGRES_ERROR_MESSAGES lookup
```

All API routes use `apiSuccess()`/`apiError()` response helpers.

### 5.4 Issues Found

| Issue | Severity | Details |
|-------|----------|---------|
| Direct Supabase calls in ~10 form pages | Medium | Library new pages bypass `useFormPage` |
| Three filter systems running together | Low | Simple + Advanced + Server filters (works, but complex) |
| No form-level validation framework | Medium | Each page does custom validation |
| Portal hooks duplicate structure | Low | `useTenantPortalData` / `useMemberPortalData` are similar |

### 5.5 Recommended Improvements

1. **Standardize all form pages to `useFormPage`** with `customSubmit` for complex workflows
2. **Create `useFetchData` generic hook** — extract common fetch/transform pattern
3. **Extract shared portal hook** — `usePortalData` base for tenant/member
4. **Add optimistic updates** to detail page mutations
5. **Add request deduplication** to prevent parallel identical fetches

---

## 6. Navigation & Information Architecture

### 6.1 Navigation Config (Centralized — 371 lines)

| Config | Items | Portal |
|--------|-------|--------|
| `DASHBOARD_NAVIGATION` | 40 | Dashboard sidebar |
| `DASHBOARD_MOBILE_NAV` | 5 | Mobile bottom bar |
| `TENANT_NAVIGATION` | 7 | Tenant portal |
| `LIBRARY_MEMBER_NAVIGATION` | 5 | Member portal |
| `ROUTE_CONFIGS` | 28 | Route metadata |

### 6.2 Sidebar Features

- Collapsible groups with auto-expansion
- Customizable ordering via `useSidebarOrder` (localStorage)
- Edit mode with drag handles
- Mobile drawer with glass-effect backdrop
- Context switcher for multi-workspace

### 6.3 Command Palette

- `Cmd+K` / `Ctrl+K` trigger
- Searches 40+ nav items + quick-create actions
- Auto-synced from `DASHBOARD_NAVIGATION`

### 6.4 Critical Navigation Issues

| Issue | Severity | Files Affected | Fix |
|-------|----------|---------------|-----|
| **15 `window.location` calls** | Critical | Library new pages, tenant components | Replace with `router.push` |
| **Settings tabs not URL-based** | High | `/settings` | Use `searchParams` for active tab |
| **No query parameter validation** | High | 32 `useSearchParams` usages | Add Zod validation |
| **Inconsistent post-action redirects** | High | All form pages | Create `useFormSubmit` wrapper |
| **Mobile nav ignores feature flags** | Medium | Dashboard layout | Filter through `filterNavigation()` |
| **Hardcoded back navigation** | Medium | 15+ detail pages | Store referrer for dynamic back |
| **Inconsistent breadcrumbs** | Medium | Detail pages | Standardize on all detail pages |
| **Modal vs page navigation mixed** | Medium | New/edit pages | Document convention |

### 6.5 URL Structure

| Pattern | Example | Consistency |
|---------|---------|-------------|
| List | `/tenants` | ✓ Consistent |
| Detail | `/tenants/[id]` | ✓ Consistent |
| Edit | `/tenants/[id]/edit` | ✓ Consistent |
| New | `/tenants/new` | ✓ Consistent |
| Nested | `/tenants/[id]/payments` | Partial |
| Library | `/library-members` (hyphenated) | ✓ Consistent |

### 6.6 Toast/Notification System

- Centralized in `src/lib/toast-helpers.ts` (Sonner)
- `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`
- Used in 108 files
- **Issue**: Some custom calls override default duration

---

## 7. Cross-Cutting Issues

### 7.1 Accessibility (Biggest Gap)

| Issue | Impact | Effort |
|-------|--------|--------|
| No global error boundary | Silent failures in production | 2 hrs |
| Missing aria-labels on icon buttons | Screen readers fail | 30 min |
| No skip-to-content links in portals | Keyboard users blocked | 30 min |
| Gradient text contrast not verified | WCAG AA compliance risk | 1-2 hrs |
| No `FormField` wrapper in portals | Missing aria-invalid/describedby | 2-3 hrs |

### 7.2 Mobile Responsiveness

| Area | Status | Gap |
|------|--------|-----|
| List pages | ✓ `hideOnMobile` column flag | None |
| Detail pages | ✓ Responsive grids | None |
| Form pages | ✓ Progressive spacing | None |
| Reports | ⚠️ Charts don't resize | Fix chart containers |
| Architecture | ⚠️ 3D view unusable on mobile | Add mobile fallback |
| Portals | ✓ Full responsive layout | None |

### 7.3 Performance Opportunities

| Opportunity | Details |
|-------------|---------|
| Request deduplication | Multiple identical Supabase calls can run in parallel |
| Optimistic updates | Detail page edits wait for server round-trip |
| Route prefetching | Not explicitly configured |
| Image optimization | Verify Next.js Image component usage |

### 7.4 Code Quality Observations

| Metric | Value | Assessment |
|--------|-------|-----------|
| TypeScript strict mode | ✓ Enabled | Good |
| Arbitrary Tailwind values | 4 text sizes, some widths | Acceptable |
| Dead code | Minimal (cleaned in recent refactors) | Good |
| Test coverage | 280 tests | Good baseline |
| Component documentation | JSDoc on most components | Good |

---

## 8. Prioritized Recommendations

### Phase 1: Critical Fixes — COMPLETED

| # | Task | Status |
|---|------|--------|
| 1 | **Add global error boundary** | ✅ Done |
| 2 | **Replace 15 `window.location` calls** with `router.push` | ✅ Done |
| 3 | **Consolidate `ConfirmDialog` duplication** | ✅ Done |
| 4 | **Add aria-labels to icon buttons** | ✅ Done |
| 5 | **Add skip-to-content links** in portal layouts | ✅ Done |
| 6 | **Make Settings tabs URL-based** | ✅ Done |
| 7 | **Add query parameter validation** (Zod) | ✅ Done |
| 8 | **Standardize post-action redirect** (`useFormSubmit` hook) | ✅ Done |
| 9 | **Sync mobile nav with feature flags** | ✅ Done |
| 10 | **Refactor Tenant/Property detail to `DetailPageTemplate`** | ✅ Done |

### Phase 2: Standardization — COMPLETED

| # | Task | Status |
|---|------|--------|
| 11 | **Migrate ~10 form pages to `useFormPage`** | ✅ Done |
| 12 | **Refactor Approvals page to `ListPageTemplate`** | ✅ Already migrated |
| 13 | **Refactor Activity page to `ListPageTemplate`** | ✅ Already migrated |
| 14 | **Adopt `FormField` wrapper in portal forms** | ✅ Already using FormField |
| 15 | **Standardize empty states across portals** | ✅ Done |
| 16 | **Add unsaved changes warning** to edit forms | ✅ Done (useUnsavedChanges hook) |
| 17 | **Add breadcrumbs to all detail pages** | ✅ Done |
| 18 | **Document modal vs page convention** | ✅ Done |
| 19 | **Define z-index scale in Tailwind** | ✅ Done |

### Phase 3: Hardcoded Color Migration — COMPLETED

| # | Task | Status |
|---|------|--------|
| 20 | **Create status color utility** (expand `status-colors.ts`) | ✅ Done |
| 21 | **Migrate portal pages** (~60 hardcoded colors) | ✅ Done |
| 22 | **Migrate marketing pages** (~60 hardcoded colors) | ✅ Done |
| 23 | **Migrate dashboard pages** (~150 hardcoded colors) | ✅ Done |
| 24 | **Create gradient CSS variables** | ✅ Done |
| 25 | **Fix print style colors** | ✅ Done |

244 files changed, ~500 color replacements from hardcoded Tailwind to semantic tokens.

### Phase 4: Enhancements — COMPLETED

| # | Task | Status |
|---|------|--------|
| 26 | **Add field-level form validation UI** | ✅ Done (useFormValidation hook) |
| 27 | **Implement dynamic back navigation** | ✅ Done (useBackNavigation hook) |
| 28 | **Add mobile responsiveness to Reports** | ✅ Done (responsive charts) |
| 29 | **Document stats display decision tree** | ✅ Done (JSDoc in stat-card.tsx) |
| 30 | **Create shared `usePortalData` hook** | ✅ Done (base hook for portals) |
| 31 | **Add optimistic updates to detail pages** | ✅ Done (snapshot + rollback) |

### Phase 5: Standardization & Performance — COMPLETED

| # | Task | Status |
|---|------|--------|
| 36 | **Request deduplication** in hooks | ✅ Done (fetchIdRef in useListPage & useDetailPageData) |
| — | **Migrate 3 expense form pages** to useFormPage | ✅ Done (vendors, misc, products) |
| — | **Products page** adopts FormPageTemplate | ✅ Done (was raw Card layout) |

### Remaining Future Enhancements (Backlog)

| # | Task | Impact |
|---|------|--------|
| 32 | **Global search** (integrate with command palette) | Major UX win |
| 33 | **Session storage for navigation state** (scroll, filters) | Better UX |
| 34 | **Auto-generated breadcrumbs from route config** | Zero-maintenance nav |
| 35 | **Navigation analytics** (track patterns, dead spots) | Data-driven UX |
| 37 | **Component Storybook** | Developer productivity |

---

## 9. Appendix: File Reference

### Core Templates
- `src/components/shared/ListPageTemplate.tsx` — List page template (400+ lines)
- `src/components/ui/detail-page-template.tsx` — Detail page template
- `src/components/ui/form-page-template.tsx` — Form page template

### Key Hooks
- `src/lib/hooks/useListPage.ts` — 650 lines, 4 sub-hooks
- `src/lib/hooks/useFormPage.ts` — 630 lines
- `src/lib/hooks/useEntityMutation.ts` — 555 lines
- `src/lib/hooks/useDetailPage.ts` — 107 lines, 2 sub-hooks
- `src/lib/hooks/useAsyncOperation.ts` — 227 lines

### Styling
- `src/app/globals.css` — Global styles + CSS variables + animations
- `src/lib/design-tokens.ts` — Centralized design tokens
- `src/lib/status-colors.ts` — Status color mapping

### Navigation
- `src/lib/navigation/config.ts` — 371 lines, all navigation configs
- `src/app/(dashboard)/layout.tsx` — 750 lines, sidebar + mobile nav
- `src/components/portal/PortalLayout.tsx` — 200+ lines, shared portal layout

### Auth & Portals
- `src/app/(auth)/` — 5 auth pages
- `src/app/(tenant)/` — 7 portal pages
- `src/app/(member)/` — 5 portal pages
- `src/components/auth/` — PermissionGuard, FeatureGuard, ContextPicker

### Error Handling
- `src/lib/error-handler.ts` — Centralized error extraction + logging
- `src/lib/toast-helpers.ts` — Toast notification functions
- `src/lib/api-response.ts` — API response helpers

### Components with Issues
- `src/components/ui/confirm-dialog.tsx` — **Duplicate** (consolidate into form-dialog.tsx)
- `src/components/ui/image-lightbox.tsx` — Hardcoded z-index: 99999
- `src/components/ui/image-cropper.tsx` — Hardcoded z-index: 99999

---

## Methodology

This audit was conducted by 6 parallel investigation agents analyzing:
1. **UI Component Library** — 84+ components, usage patterns, duplication
2. **Dashboard Pages** — 141 pages across 30+ modules
3. **Auth & Portals** — 5 auth pages, 2 portal types, public site
4. **Styles & Theming** — CSS variables, Tailwind config, 367+ hardcoded colors
5. **Hooks & Data Patterns** — 38+ hooks, data fetching, validation
6. **Navigation & IA** — Sidebar, routing, breadcrumbs, toasts, deep-linking

---

*Generated: 2026-02-22 | Codebase: 95877ee (main)*
