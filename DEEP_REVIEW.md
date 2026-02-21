# ManageKar - Deep Centralization & Modularization Review

> **Date**: 2026-02-21
> **Scope**: Full codebase review after completing 11 centralization tasks
> **Previous Work**: Status config consolidation, type deduplication, cron handler, PDF handler, API middleware, metric factories, filter presets, column builders, entity selector, portal components, component splits

---

## Summary

| Tier | Items | Est. Lines Saved |
|------|-------|-----------------|
| **Tier 1 - High Impact** | 5 items | ~3,000+ lines |
| **Tier 2 - Medium Impact** | 6 items | ~1,500+ lines |
| **Tier 3 - Cleanup & Hygiene** | 7 items | ~500+ lines |
| **Total** | **18 items** | **~5,000+ lines** |

---

## Tier 1 — High Impact

### 1. Form Page Boilerplate Factory

**Problem**: 20+ form pages (new/edit) repeat the same boilerplate patterns:
- `handleChange` / `handleSelectChange` / `handleNumberChange` helpers
- Owner/workspace fetch via `useAuth()` + `useCurrentContext()`
- URL search-param pre-selection (e.g., `?property_id=xxx`)
- Loading/error/redirect patterns
- Supabase insert/update with `withCreatedBy()` + toast + redirect

**Affected Files** (sample):
- `src/app/(dashboard)/tenants/new/page.tsx` (590 lines)
- `src/app/(dashboard)/bills/new/page.tsx` (520 lines)
- `src/app/(dashboard)/payments/new/page.tsx` (480 lines)
- `src/app/(dashboard)/expenses/new/page.tsx` (450 lines)
- `src/app/(dashboard)/visitors/new/page.tsx` (865 lines)
- `src/app/(dashboard)/refunds/new/page.tsx` (430 lines)
- `src/app/(dashboard)/meter-readings/new/page.tsx`
- `src/app/(dashboard)/library-members/new/page.tsx`
- `src/app/(dashboard)/library-payments/new/page.tsx`
- `src/app/(dashboard)/library-lockers/new/page.tsx`
- All corresponding `[id]/edit/page.tsx` variants

**Solution**: Create `useFormPage` hook + `FormPageTemplate` component:
```typescript
// src/lib/hooks/useFormPage.ts
const { formData, handleChange, handleSelectChange, handleNumberChange,
        handleSubmit, loading, ownerId } = useFormPage({
  table: "tenants",
  initialData: { name: "", phone: "" },
  redirectTo: "/tenants",
  preSelectFields: ["property_id", "room_id"],
})

// src/components/shared/FormPageTemplate.tsx
<FormPageTemplate
  title="Add Tenant"
  permission="tenants.create"
  onSubmit={handleSubmit}
  loading={loading}
>
  {/* Only the form fields */}
</FormPageTemplate>
```

**Impact**: ~2,000 lines saved across 20+ files

---

### 2. Report Page Unification

**Problem**: `reports/page.tsx` (1,217 lines) and `library-reports/page.tsx` (1,104 lines) share ~80% identical code:
- Same chart components (revenue charts, occupancy charts)
- Same date range picker logic
- Same export functionality
- Same card/grid layout patterns
- Only differ in data source (PG tables vs library tables)

**Solution**: Create shared report infrastructure:
```
src/components/reports/
├── ReportPageTemplate.tsx    # Shared layout, date picker, export
├── RevenueChart.tsx          # Parameterized by data source
├── OccupancyChart.tsx        # Parameterized by entity type
├── ReportMetricCard.tsx      # Shared stat cards
└── useReportData.ts          # Generic data fetching hook
```

**Impact**: ~800 lines saved, single source of truth for report logic

---

### 3. Large Page Decomposition

**Problem**: 10 pages exceed 700 lines and contain mixed concerns (data fetching, state management, rendering, sub-components):

| File | Lines | Recommendation |
|------|-------|---------------|
| `reports/page.tsx` | 1,217 | See #2 above |
| `tenants/[id]/page.tsx` | 1,119 | Extract tab panels into separate components |
| `library-reports/page.tsx` | 1,104 | See #2 above |
| `visitors/new/page.tsx` | 865 | Extract visitor contact form, use FormPageTemplate |
| `library-members/[id]/page.tsx` | 830 | Extract membership, attendance, locker sections |
| `complaints/page.tsx` | 780 | Extract complaint detail modal |
| `exit-clearance/page.tsx` | 760 | Extract clearance steps component |
| `architecture/page.tsx` | 745 | Extract floor/room map renderer |
| `bills/[id]/page.tsx` | 720 | Extract line items editor |
| `notices/page.tsx` | 710 | Extract notice detail/preview |

**Solution**: For each, extract:
1. Tab panels / sections → `components/[module]/[Section].tsx`
2. Data fetching logic → custom hooks
3. Sub-forms / modals → standalone components

**Impact**: ~1,500 lines moved into focused, testable components

---

### 4. Tenant Portal Data Hook

**Problem**: Tenant portal pages (`/tenant/*`) each independently fetch the same base data:
- Current user authentication
- Tenant record lookup
- Property details
- Active stay information

Files repeating this pattern:
- `src/app/(tenant)/tenant/page.tsx`
- `src/app/(tenant)/tenant/bills/page.tsx`
- `src/app/(tenant)/tenant/payments/page.tsx`
- `src/app/(tenant)/tenant/complaints/page.tsx`
- `src/app/(tenant)/tenant/notices/page.tsx`
- `src/app/(tenant)/tenant/profile/page.tsx`

**Solution**: Create `useTenantPortalData()` hook:
```typescript
// src/lib/hooks/useTenantPortalData.ts
const { tenant, property, stay, loading, error } = useTenantPortalData()
```

Similarly, create `useMemberPortalData()` for library member portal pages.

**Impact**: ~300 lines saved, consistent data loading across portals

---

### 5. UI Component Barrel Export Gaps

**Problem**: 35 UI components exist in `src/components/ui/` but are NOT exported from the barrel `index.ts`. This forces inconsistent import paths across the codebase.

**Missing from barrel** (confirmed):
- `activity-history`, `advanced-filter-builder`, `alert-dialog`
- `avatar`, `badge`, `breadcrumb`, `calendar`
- `chart`, `checkbox`, `collapsible`, `combobox`
- `currency`, `data-table`, `date-picker`
- `dialog`, `dropdown-menu`, `entity-selector`
- `form-components`, `input`, `label`
- `metrics-bar`, `page-header`, `page-loader`
- `popover`, `progress`, `scroll-area`
- `select`, `separator`, `skeleton`, `slider`
- `status-badge`, `switch`, `tabs`, `textarea`, `tooltip`

**Solution**: Add all components to `src/components/ui/index.ts` barrel file.

**Impact**: Consistent imports, better tree-shaking, cleaner import statements

---

## Tier 2 — Medium Impact

### 6. Phone Formatting Consolidation

**Problem**: Phone formatting/validation logic duplicated in 3 places:
- `src/lib/format.ts` — `formatPhoneDisplay()`
- `src/lib/validators.ts` — `validatePhone()`
- `src/lib/notifications.ts` — phone normalization for WhatsApp

Each has slightly different formatting rules.

**Solution**: Centralize in `src/lib/phone.ts`:
```typescript
export { formatPhone, validatePhone, normalizePhone, formatPhoneDisplay }
```

**Impact**: ~80 lines saved, consistent phone handling

---

### 7. Message & Notification Template Consolidation

**Problem**: Message templates (WhatsApp, SMS, email subjects) scattered across:
- `src/lib/notifications.ts` — WhatsApp message templates
- `src/lib/email.ts` — Email subject/body templates
- Various page components — inline template strings for notices/complaints

**Solution**: Create `src/lib/templates/`:
```
src/lib/templates/
├── whatsapp.ts    # All WhatsApp message templates
├── email.ts       # All email templates
├── sms.ts         # SMS templates (if added)
└── index.ts       # Re-exports + helper: renderTemplate()
```

**Impact**: ~150 lines saved, single place to update messaging

---

### 8. Error Handling Unification

**Problem**: Three error handling systems coexist:
1. `src/lib/api-response.ts` — API route error responses (`apiError`, `ErrorCodes`)
2. `src/lib/logger.ts` — Structured logging with error context
3. Individual try/catch blocks with inconsistent `toast.error()` messages in pages

Client-side pages use raw try/catch with varying error messages. No standard pattern for extracting user-friendly messages from Supabase/API errors.

**Solution**: Create `src/lib/error-handler.ts`:
```typescript
export function handleClientError(error: unknown, context: string): string {
  // Extracts user-friendly message from Supabase, API, or generic errors
  // Logs via structured logger
  // Returns display message
}

// Usage in pages:
catch (err) {
  toast.error(handleClientError(err, "creating tenant"))
}
```

**Impact**: ~200 lines saved, consistent error UX

---

### 9. Stat Card Component Unification

**Problem**: Three stat card components with overlapping functionality and inconsistent props:
- `StatCard` in `src/components/ui/metrics-bar.tsx` — uses `title`, `value`, `icon`
- `QuickStatsGrid` (inline in some pages) — uses `label`, `count`, `color`
- `PortalStatCard` in `src/components/portal/` — uses `title`, `value`, `icon`, `trend`

**Solution**: Consolidate into single `StatCard` with unified props:
```typescript
interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: { value: number; direction: "up" | "down" }
  color?: string
  href?: string
}
```

**Impact**: ~120 lines saved, consistent visual language

---

### 10. CSS Animation Deduplication

**Problem**: Stagger animations defined in multiple places:
- `src/app/globals.css` — `.stagger-children` class
- `src/app/(tenant)/tenant/layout.tsx` — `.animate-stagger` inline styles
- `src/app/(member)/member/layout.tsx` — identical `.animate-stagger` inline styles
- Several page components — inline `@keyframes` definitions

**Solution**: Consolidate all animations in `globals.css`:
```css
/* Stagger animations */
.stagger-children > * { animation: fadeSlideIn 0.3s ease forwards; }
.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
/* ... */
```

Remove all inline animation definitions from layouts and pages.

**Impact**: ~100 lines saved, consistent animations

---

### 11. Entity Name Mapping Centralization

**Problem**: Entity display names (for audit logs, toast messages, breadcrumbs) are mapped in multiple places:
- `src/components/ui/activity-history.tsx` — entity type to display name
- `src/lib/audit/` — audit event entity names
- Various toast messages — inline entity names
- Breadcrumb components — route to display name

**Solution**: Create `src/lib/entity-names.ts`:
```typescript
export const ENTITY_NAMES: Record<string, string> = {
  tenants: "Tenant",
  bills: "Bill",
  library_members: "Library Member",
  // ...
}

export function getEntityName(table: string, plural = false): string
```

**Impact**: ~100 lines saved, consistent naming

---

## Tier 3 — Cleanup & Hygiene

### 12. Unused Component Removal

**Problem**: Several components appear to be unused (no imports found):
- `src/components/ui/alert-dialog.tsx` — 0 imports
- `src/components/ui/bulk-action-bar.tsx` — 0 imports
- `src/components/ui/card-section.tsx` — 0 imports (superseded by DetailSection)
- `src/components/ui/slider.tsx` — 0 imports

**Action**: Verify via `grep -r` and remove if truly unused.

**Impact**: ~400 lines removed

---

### 13. Form Component Library Adoption

**Problem**: `src/components/ui/form-components.tsx` exports reusable form primitives (`PhoneEntry`, `EmailEntry`, `IdDocumentEntry`, `AddressFields`) but they're only used in 2-3 pages. Many form pages manually build equivalent inputs.

**Action**: Audit all form pages and adopt existing form components where applicable.

**Impact**: ~200 lines saved, consistent form UX

---

### 14. Soft-Deletable Table List as Constant

**Problem**: The list of soft-deletable tables is hardcoded inside `useEntityMutation` hook:
```typescript
// Inside the hook
const softDeletableTables = ["tenants", "bills", "payments", ...]
```

This should be a shared constant since it's referenced in audit utilities too.

**Solution**: Move to `src/lib/audit/constants.ts`:
```typescript
export const SOFT_DELETABLE_TABLES = [
  "tenants", "bills", "payments", "expenses", "refunds",
  "complaints", "notices", "visitors", "meter_readings",
  "exit_clearance", "properties", "rooms", "people",
  "meters", "staff_members", "visitor_contacts", "library_waitlist",
] as const
```

**Impact**: Single source of truth, type-safe

---

### 15. Missing Navigation Config

**Problem**: `src/lib/navigation/config.ts` has `DASHBOARD_NAVIGATION` and `TENANT_NAVIGATION` but is missing `LIBRARY_MEMBER_NAVIGATION` for the member portal. Member portal navigation is defined inline in the layout.

**Solution**: Add `LIBRARY_MEMBER_NAVIGATION` to `config.ts` and use it in the member portal layout.

**Impact**: Consistent navigation pattern

---

### 16. Environment & Config Hygiene

**Problem**:
- No `.env.example` file — new developers can't easily set up
- `tsconfig.json` doesn't enable `strictNullChecks` explicitly
- `package.json` has minimal scripts (missing lint, format, type-check shortcuts)

**Solution**:
```bash
# Create .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
CRON_SECRET=

# Add npm scripts
"lint": "next lint",
"format": "prettier --write .",
"typecheck": "tsc --noEmit"
```

**Impact**: Better DX for onboarding

---

### 17. Unused Static Assets

**Problem**: `public/` directory may contain SVG/image assets that are no longer referenced after UI changes.

**Action**: Audit `public/` against all `src/` imports and remove unreferenced assets.

**Impact**: Smaller deployment bundle

---

### 18. Command Palette Sync

**Problem**: `src/components/command-palette.tsx` has a hardcoded list of 12 navigation items and 6 action items. These are NOT synced with `DASHBOARD_NAVIGATION` in `config.ts`, meaning new modules added to nav won't appear in Cmd+K.

**Missing from command palette**:
- Sections, Seats, Waitlist, Lockers, Library Payments, Library Reports, Plans
- Meters, Meter Readings, Notices, Complaints, Visitors
- Exit Clearance, Architecture, Activity, Approvals, Refunds

**Solution**: Generate command palette items from `DASHBOARD_NAVIGATION`:
```typescript
import { DASHBOARD_NAVIGATION } from "@/lib/navigation/config"

const NAVIGATION_ITEMS = DASHBOARD_NAVIGATION.flatMap(group =>
  group.items.map(item => ({
    name: item.name,
    href: item.href,
    icon: item.icon,
    keywords: item.keywords || [],
  }))
)
```

**Impact**: Command palette always in sync with navigation, no manual maintenance

---

## Implementation Priority

### Phase 1 — Quick Wins (1-2 hours)
- [ ] #5 — Barrel export gaps
- [ ] #12 — Unused component removal
- [ ] #14 — Soft-deletable table constant
- [ ] #15 — Missing navigation config
- [ ] #16 — Environment & config hygiene
- [ ] #18 — Command palette sync

### Phase 2 — Medium Effort (3-4 hours)
- [ ] #1 — Form page boilerplate factory
- [ ] #4 — Tenant/member portal data hooks
- [ ] #6 — Phone formatting consolidation
- [ ] #8 — Error handling unification
- [ ] #10 — CSS animation deduplication
- [ ] #11 — Entity name mapping

### Phase 3 — Larger Refactors (4-6 hours)
- [ ] #2 — Report page unification
- [ ] #3 — Large page decomposition
- [ ] #7 — Message template consolidation
- [ ] #9 — Stat card unification
- [ ] #13 — Form component adoption
- [ ] #17 — Unused asset audit

---

*Generated from deep review of 200+ source files across components, hooks, services, API routes, portals, and configuration.*
