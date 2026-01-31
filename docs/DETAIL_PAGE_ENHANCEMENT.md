# Detail Page Enhancement - Implementation Tracker

> **Created**: 2026-01-31
> **Status**: In Progress
> **Goal**: Unified, user-friendly detail pages with limited lists and auto-balancing layout

---

## Problem Statement

Current detail pages have these issues:
1. **Sections show ALL items** - Pending Dues shows 20+ bills, causing page overflow
2. **Static 2-column grid** - Left column has empty space, right column overflows
3. **Inconsistent patterns** - Each page implements list display differently
4. **No centralized components** - Code duplication across 15+ detail pages

---

## Solution Overview

### New Components

| Component | Purpose | File |
|-----------|---------|------|
| `DetailListSection` | Limited list with "View All" button | `src/components/ui/detail-list-section.tsx` |
| `MasonryGrid` | Auto-balancing CSS columns layout | `src/components/ui/masonry-grid.tsx` |
| `DetailPageContent` | Backwards-compatible wrapper | `src/components/ui/detail-page-content.tsx` |

### Key Features

1. **Limited Display**: Show 3-5 items per section with "View All" button
2. **Auto-balance**: CSS columns-based masonry layout
3. **Two View All Modes**:
   - `expand` - Expands inline for small lists (≤10 items)
   - `link` - Navigates to full page for large lists
4. **Consistent Empty States**: Standardized empty state across all sections
5. **Mobile Responsive**: Single column on mobile, 2 columns on desktop

---

## Implementation Checklist

### Phase 1: Create New Components

- [ ] `src/components/ui/detail-list-section.tsx`
- [ ] `src/components/ui/masonry-grid.tsx`
- [ ] `src/components/ui/detail-page-content.tsx`
- [ ] Update `src/components/ui/index.ts` with exports

### Phase 2: Update Detail Pages

| Page | File | Status |
|------|------|--------|
| Tenants | `src/app/(dashboard)/tenants/[id]/page.tsx` | [ ] |
| Properties | `src/app/(dashboard)/properties/[id]/page.tsx` | [ ] |
| Rooms | `src/app/(dashboard)/rooms/[id]/page.tsx` | [ ] |
| Bills | `src/app/(dashboard)/bills/[id]/page.tsx` | [ ] |
| People | `src/app/(dashboard)/people/[id]/page.tsx` | [ ] |
| Payments | `src/app/(dashboard)/payments/[id]/page.tsx` | [ ] |
| Expenses | `src/app/(dashboard)/expenses/[id]/page.tsx` | [ ] |
| Complaints | `src/app/(dashboard)/complaints/[id]/page.tsx` | [ ] |
| Notices | `src/app/(dashboard)/notices/[id]/page.tsx` | [ ] |
| Visitors | `src/app/(dashboard)/visitors/[id]/page.tsx` | [ ] |
| Meters | `src/app/(dashboard)/meters/[id]/page.tsx` | [ ] |
| Meter Readings | `src/app/(dashboard)/meter-readings/[id]/page.tsx` | [ ] |
| Refunds | `src/app/(dashboard)/refunds/[id]/page.tsx` | [ ] |
| Exit Clearance | `src/app/(dashboard)/exit-clearance/[id]/page.tsx` | [ ] |
| Staff | `src/app/(dashboard)/staff/[id]/page.tsx` | [ ] |

### Phase 3: Documentation

- [ ] Update `CLAUDE.md` with new patterns
- [ ] Mark this tracker as complete

---

## Component APIs

### DetailListSection

```typescript
interface DetailListSectionProps<T> {
  // Required
  title: string
  items: T[]
  renderItem: (item: T) => React.ReactNode
  keyExtractor: (item: T) => string

  // Optional - Section styling
  description?: string
  icon?: LucideIcon
  className?: string

  // Optional - List behavior
  initialLimit?: number          // Default: 3
  maxInlineExpand?: number       // Default: 10

  // Optional - View All behavior
  viewAllMode?: "link" | "expand" | "auto"  // Default: "auto"
  viewAllHref?: string
  viewAllLabel?: string          // Default: "View All"

  // Optional - Empty state
  emptyIcon?: LucideIcon
  emptyText?: string             // Default: "No items"
  emptyAction?: { label: string; href: string }

  // Optional - Additional actions
  actions?: React.ReactNode
}
```

### MasonryGrid

```typescript
interface MasonryGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3             // Default: 2
  gap?: "sm" | "md" | "lg"        // Default: "md"
  className?: string
}
```

### DetailPageContent

```typescript
interface DetailPageContentProps {
  children: React.ReactNode
  layout?: "grid" | "masonry"     // Default: "masonry"
  columns?: 1 | 2 | 3             // Default: 2
  className?: string
}
```

---

## Usage Examples

### Before (Current Implementation)

```tsx
// Tenant Detail Page - Shows ALL pending charges
<div className="grid md:grid-cols-2 gap-6">
  <DetailSection title="Pending Dues" icon={AlertCircle}>
    {charges.map((charge) => (
      <div key={charge.id}>
        {/* Could be 20+ items! */}
      </div>
    ))}
  </DetailSection>
</div>
```

### After (New Implementation)

```tsx
// Tenant Detail Page - Shows 5 items with "View All"
<DetailPageContent layout="masonry">
  <DetailListSection
    title="Pending Dues"
    description="Outstanding payments"
    icon={AlertCircle}
    items={charges}
    renderItem={(charge) => (
      <div className="flex justify-between py-2 border-b last:border-0">
        <div>
          <p className="font-medium">{charge.charge_type?.name}</p>
          <p className="text-xs text-muted-foreground">{charge.for_period}</p>
        </div>
        <Currency amount={charge.amount} className="text-rose-600" />
      </div>
    )}
    keyExtractor={(c) => c.id}
    initialLimit={5}
    viewAllHref={`/tenants/${tenant.id}/bills`}
    emptyIcon={CheckCircle}
    emptyText="No pending dues"
    actions={
      <Link href={`/payments/new?tenant=${tenant.id}`}>
        <Button size="sm" variant="gradient">
          <Plus className="mr-1 h-3 w-3" />
          Record Payment
        </Button>
      </Link>
    }
  />
</DetailPageContent>
```

---

## CSS Strategy: Masonry Layout

Using CSS columns for auto-balancing (best browser support):

```css
.masonry-grid {
  column-count: 2;
  column-gap: 1.5rem;
}

.masonry-grid > * {
  break-inside: avoid;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
  margin-bottom: 1.5rem;
  display: inline-block;
  width: 100%;
}

@media (max-width: 768px) {
  .masonry-grid {
    column-count: 1;
  }
}
```

---

## Verification Checklist

After implementation, verify:

- [ ] **Build passes**: `npm run build` without errors
- [ ] **Tenant page**: Shows max 5 pending dues with "View All"
- [ ] **Layout balance**: Sections distribute evenly across columns
- [ ] **Mobile view**: Single column on screens < 768px
- [ ] **Expand works**: Small lists expand inline when "View All" clicked
- [ ] **Link works**: Large lists navigate to full page
- [ ] **Empty states**: Sections with no items show friendly message
- [ ] **All pages updated**: All 15 detail pages use new pattern

---

## Benefits

1. **Cleaner UI**: No more overflowing sections with 20+ items
2. **Better UX**: Users see key info first, can expand for more
3. **Balanced layout**: No wasted space, sections auto-distribute
4. **Maintainable**: Single component for all list sections
5. **Consistent**: Same pattern across all 15+ detail pages
6. **Centralized**: Follows project philosophy of centralization

---

## Migration Notes

- **Backwards compatible**: Old pattern still works
- **Gradual rollout**: Can update pages one at a time
- **No data changes**: Only frontend component changes
- **No API changes**: Uses existing data from `useDetailPage` hook

---

*Last Updated: 2026-01-31*
