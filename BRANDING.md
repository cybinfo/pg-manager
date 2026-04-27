# ManageKar — Brand & Design System

> **MANDATORY**: Every UI change, new page, new component, or visual decision must follow this document exactly. This is the single source of truth for how ManageKar looks, feels, and communicates. Deviation from these standards is a bug, not a style choice.
>
> **Standard reference:** Apple Human Interface Guidelines · Meta Design System · Linear · Stripe Dashboard
>
> **Last Updated**: 2026-04-27

---

## 1. Brand Identity

### 1.1 Name & Tagline

| Element | Value |
|---------|-------|
| **App name** | ManageKar |
| **Meaning** | "Let's Manage" (Hindi) |
| **Primary tagline** | "Simple Software for Indian Small Businesses" |
| **Dashboard tagline** | "go from chaos to clarity" |
| **Hero statement** | "One Platform. Every Business." |
| **India-specific** | "Made with ❤️ in India" |

### 1.2 Brand Values (Inform Every Design Decision)

| Value | What it means in UI |
|-------|---------------------|
| **Clarity** | One obvious action per screen. Labels over icons alone. |
| **Trust** | Consistent, predictable patterns. Never surprise the user. |
| **Speed** | Instant perceived feedback. Optimistic UI. No spinners for < 200ms. |
| **Intelligence** | Smart defaults. Pre-filled fields. Context-aware suggestions. |
| **India-first** | INR everywhere. WhatsApp links. 4G-resilient. Touch-friendly. |

### 1.3 Brand Voice

| Context | Tone | Example |
|---------|------|---------|
| Empty states | Warm, encouraging | "No tenants yet — add your first one to get started" |
| Errors | Direct, helpful | "Phone number must be 10 digits starting with 6–9" |
| Success | Brief, confident | "Payment recorded" |
| Loading | Invisible — use skeletons | *(never show "Loading..." text)* |
| Destructive confirm | Serious, precise | "Delete this tenant? This cannot be undone." |
| Tooltips | Instructional, concise | "Mark as paid when rent is fully collected" |

**Voice rules:**
- **Never** use technical jargon (no "null", "undefined", "403", "API error")
- **Never** use passive voice: "Payment was recorded" → "Payment recorded"
- **Always** tell the user what to do next, not just what went wrong
- **Always** use Indian context: ₹ not $, "crore/lakh" not "million", WhatsApp not SMS

---

## 2. Color System

### 2.1 Brand Palette

```
Primary:   Teal    #0D9488  hsl(160 84% 28%)   — Main brand, PG module
Secondary: Emerald #10B981  hsl(152 69% 41%)   — Paired with primary
Accent:    Amber   #F59E0B  hsl(38 92% 50%)    — CTAs, highlights, money
```

**Portal variants:**
```
PG / Tenant portal:      from-teal-500 to-emerald-500   (#14B8A6 → #10B981)
Library / Member portal: from-purple-500 to-indigo-500  (#A855F7 → #6366F1)
```

### 2.2 Semantic Colors (Use These, Never Raw Hex)

| Token | CSS Variable | Light value | Dark value | Use for |
|-------|-------------|-------------|------------|---------|
| `primary` | `hsl(var(--primary))` | teal-700 | teal-400 | Brand actions, active nav |
| `accent` | `hsl(var(--accent))` | amber-500 | amber-500 | Money, CTAs, highlights |
| `success` | `hsl(var(--success))` | emerald-600 | emerald-500 | Paid, active, verified |
| `warning` | `hsl(var(--warning))` | amber-700 | amber-500 | Pending, expiring, partial |
| `destructive` | `hsl(var(--destructive))` | rose-600 | rose-500 | Delete, error, overdue |
| `info` | `hsl(var(--info))` | sky-600 | sky-500 | Info, partial payment |
| `muted-foreground` | `hsl(var(--muted-foreground))` | slate-500 | slate-400 | Secondary text, labels |

**Rule:** Never use `text-teal-600` directly in components. Use `text-primary`. Never use `text-red-600`. Use `text-destructive`. Raw Tailwind color classes are allowed only in `design-tokens.ts` and `globals.css`.

### 2.3 Status Color Mapping

| Status | Semantic color | Usage |
|--------|---------------|-------|
| active, paid, verified, online | success | Green family |
| pending, partial, expiring, notice_period | warning | Amber family |
| overdue, open complaint, error, deleted | destructive | Rose family |
| info, in_progress, partial payment | info | Sky family |
| inactive, closed, moved_out, disabled | muted | Slate family |
| primary action, occupied | primary | Teal family |

### 2.4 Background & Surface Hierarchy

```
Page background:     bg-background          (white / near-black)
Card surface:        bg-card                (white / navy-11%)
Muted surface:       bg-muted               (slate-5% / navy-17%)
Input background:    bg-background + border
Popover:             bg-popover shadow-lg
Glass surface:       glass-card             (backdrop-blur-md)
```

**Layering rule (Apple-inspired):** Each layer goes one step warmer/lighter than the layer below it. Never use raw `bg-white` — always use semantic tokens.

---

## 3. Typography

### 3.1 Font Stack

```
Primary:  Inter (Google Fonts, loaded via next/font)
          Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
Fallback: ui-sans-serif, system-ui, -apple-system, sans-serif
Mono:     ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas
```

**Inter is non-negotiable.** It is the most legible UI typeface at small sizes across all screens. SF Pro on Apple, Roboto on Android, Inter on everything else — these are the world's best UI fonts.

### 3.2 Type Scale

| Role | Size | Weight | Line height | Letter spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| Page title | `text-2xl` (24px) | `font-bold` | tight | `tracking-tight` | Page headers |
| Section title | `text-xl` (20px) | `font-semibold` | tight | normal | Card/section headers |
| Subsection | `text-lg` (18px) | `font-semibold` | snug | normal | Sub-headers, modal titles |
| Body | `text-sm` (14px) | `font-normal` | normal | normal | Body text, table cells |
| Label | `text-sm` (14px) | `font-medium` | normal | normal | Form labels, nav items |
| Caption / Meta | `text-xs` (12px) | `font-normal` | normal | normal | Timestamps, secondary info |
| Micro | `text-[10px]` | `font-semibold` | normal | `tracking-wide uppercase` | Status labels, counts |
| Metric value | `text-lg`–`text-3xl` | `font-bold` | none | normal | Dashboard numbers |
| Financial | `tabular-nums` | `font-medium`+ | normal | normal | All currency/number display |

**Rule:** Financial figures (`₹`, counts, percentages) always use `tabular-nums`. This prevents layout shift as numbers update.

### 3.3 Gradient Text (Use Sparingly)

```css
/* Hero headings and logo only */
bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent
```

**Use only for:** Logo text, hero H1, section emphasis words. **Never** on body text, labels, or inside cards.

---

## 4. Spacing & Grid

### 4.1 Base Grid — 8px System

Every spacing decision must be a multiple of 4px (Tailwind's 1-unit = 4px):

```
4px  = 1  → micro gaps between inline elements
8px  = 2  → icon-to-text gap, tight padding
12px = 3  → compact form spacing
16px = 4  → standard element spacing
24px = 6  → card content padding
32px = 8  → section separation
48px = 12 → large section breaks
64px = 16 → page-level breaks
```

**Never use `p-5` (20px) or `gap-5`.** These break the 8px rhythm. If between `p-4` and `p-6` is needed, use `p-4` and add a nested element.

### 4.2 Component Spacing Standards

| Component | Padding | Gap | Notes |
|-----------|---------|-----|-------|
| Card | `p-6` content, `p-4` compact | `space-y-4` | Header: `px-6 py-4 border-b` |
| Form section | `space-y-6` between fields | `gap-4` grid | Never `gap-3` in form grids |
| Metric card | `px-4 py-3` | — | Consistent height across bar |
| Page | `p-4 md:p-6 lg:p-8` | `space-y-6` | Desktop gets more breathing room |
| Sidebar nav item | `px-3 py-2.5` | — | Touch target ≥ 44px |
| Button | `h-9 px-4` (default) | `gap-2` | All sizes strictly from button.tsx |
| Table row | `px-4 py-3` | — | Never less than 44px tall on mobile |
| Modal / Dialog | `p-6` | `space-y-4` | Header separate section |
| Badge | `px-2.5 py-0.5` | — | Never custom padding |

### 4.3 Layout Structure

```
Sidebar:       w-64 (256px) fixed
Header:        h-16 sticky top-0
Content:       pl-64 on desktop, full width on mobile
Page padding:  p-4 md:p-6 lg:p-8
Max content:   No max-width on dashboard (use full width)
Section width: max-w-3xl for forms, no max for data tables
```

---

## 5. Border Radius

```
Micro elements (dots, checkboxes):  rounded-full
Small (badges, tags):               rounded-md   (6px)  ← inputs also use this
Standard (buttons):                 rounded-lg   (8px)
Large cards / containers:           rounded-xl   (12px)
Extra large (hero cards, modals):   rounded-2xl  (16px)
Avatars, icon containers:           rounded-full or rounded-xl
```

**Per-element rules:**
- `<Input>` → `rounded-md` (6px) — matches the shadcn default; keeps inputs visually lighter than cards
- `<Select>` (custom from form-components.tsx) → `rounded-lg` (8px) — matches its outer wrapper
- `<Button>` → `rounded-lg` (8px) by default; `rounded-md` for `size="sm"`
- `<Card>` → `rounded-xl` (12px) — never use `rounded-lg` on cards
- `<Badge>` / `<StatusBadge>` → `rounded-full`
- `<EmptyState>` icon container → `rounded-2xl` (16px) with brand gradient
- Internal card elements (form sections inside a card) → `rounded-lg` max — never `rounded-xl`

**Rule:** The hierarchy is inputs < buttons < cards < hero elements. A child element's radius must never exceed its parent's radius, or it visually "pops out" of the container.

---

## 6. Shadow System

```
None:       shadow-none         → Flat, inside another card
Subtle:     shadow-sm           → Default card state
Standard:   shadow              → Floating elements, default Card
Elevated:   shadow-md           → Active states, dropdowns
High:       shadow-lg           → Modals, popovers
Max:        shadow-xl           → Feature cards, hero elements
Glow:       shadow-teal-500/20  → Brand-accented shadow (primary actions)
Glow-lg:    shadow-teal-500/25  → Hover states on gradient buttons
```

**Rule:** Cards use `shadow` at rest, `shadow-md` on hover. Gradient buttons always pair with `shadow-teal-500/25`. Never use `shadow-2xl` in the product — reserved for marketing pages only.

---

## 7. Iconography

### 7.1 Icon Library

**Lucide React** — 100% exclusively. Never mix with other icon sets.

```
Icon sizes:
  Tiny (inline text):  h-3 w-3
  Small (badge):       h-4 w-4   ← Most common size
  Standard:            h-5 w-5   ← Page headers, nav
  Large:               h-6 w-6   ← Card hero icons
  Display:             h-8+ w-8+ ← Empty states only
```

### 7.2 Icon Containers

Every stand-alone icon sits inside a container — never raw icons:

```
Nav active item:     p-2 rounded-lg bg-white/20
Brand header:        p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500
Entity icon:         p-2 rounded-lg bg-{color}-100 dark:bg-{color}-900
                     text-{color}-600 dark:text-{color}-400
Metric card:         p-2 rounded-lg bg-muted
Empty state:         p-4 rounded-full bg-muted  (large, centered)
Stat card:           p-2 rounded-lg (named color from design-tokens)
```

### 7.3 Module → Icon Mapping

| Module | Icon |
|--------|------|
| Dashboard | `LayoutDashboard` |
| Properties | `Building2` |
| Rooms | `Home` |
| Tenants | `Users` |
| Bills | `Receipt` |
| Payments | `CreditCard` |
| Refunds | `RefreshCw` |
| Expenses | `TrendingDown` |
| Meters | `Zap` |
| Meter Readings | `Activity` |
| Staff | `UserCheck` |
| Notices | `Bell` |
| Complaints | `MessageSquare` |
| Visitors | `UserPlus` |
| Exit Clearance | `LogOut` |
| Reports | `BarChart2` |
| Architecture | `Map` |
| Activity | `History` |
| Approvals | `CheckSquare` |
| Library | `BookOpen` |
| Library Members | `GraduationCap` |
| Attendance | `ClipboardCheck` |
| Lockers | `Lock` |
| Seats | `Armchair` |
| Plans | `Package` |
| People | `UsersRound` |
| Settings | `Settings2` |
| Platform Admin | `ShieldCheck` |

---

## 8. Component Patterns

### 8.1 Page Structure (Every Dashboard Page)

```
PageHeader
  ├─ Breadcrumb (always on detail pages)
  ├─ Icon container (gradient bg)
  ├─ Title + Description
  └─ Actions (right side)

MetricsBar (list pages only)
  └─ 3–5 metrics using metric factories

DataTable / Content
  └─ Filters → Table → Pagination

Empty state (when no data)
```

### 8.2 Cards

**Standard card:**
```
rounded-xl border bg-card shadow
└─ Header: px-6 py-4 border-b (title + right action)
└─ Content: p-6
```

**Interactive card (clickable row/item):**
```
hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200
```

**Highlighted/Active card:**
```
border-primary/20 bg-primary/5
```

**Glass card (sidebar, overlays):**
```
glass-card border-white/20
```

### 8.3 Buttons

**Button variants (all defined in `button.tsx`):**

| Situation | Variant | Notes |
|-----------|---------|-------|
| Primary CTA (one per screen zone) | `gradient` | Teal→emerald gradient, white text |
| Secondary action | `outline` | ⚠️ Hovers amber — see warning below |
| Soft brand CTA (marketing/feature cards) | `gradient-outline` | Teal border + text, subtle hover |
| Destructive action | `destructive` | Always paired with `confirm-dialog` |
| Navigation / Toggle / icon-only | `ghost` | Hovers amber — OK for nav, avoid near financial data |
| Solid brand (non-gradient primary) | `default` | Blue-teal solid; rarely used on dashboard |
| Text link inside body content | `link` | Underline on hover |
| Icon-only action | `ghost` size `icon` | Must have `aria-label` |
| Landing page hero CTA | `gradient` size `xl` | Never inside the dashboard |

**⚠️ Amber hover warning:** Both `outline` and `ghost` variants hover with `bg-accent` (amber). On financial pages where amber means "money / pending / warning", this creates a visual collision. In those contexts, use a container-scoped override or wrap the button in a div with explicit hover class. Never change the base variant.

**Gradient button scope rule:** Maximum **one** `gradient` button per visual panel (card, PageHeader, or modal) visible at the same time. A PageHeader can have one. A card below it can have one. They can co-exist on screen because they belong to different panels — but two gradient buttons inside the same card is never allowed.

**Rules:**
- Destructive buttons always show a `confirm-dialog` — never fire immediately on click
- Disabled buttons: `opacity-50 cursor-not-allowed` — never hide them (user needs to see the action exists but is blocked)
- Every button with an icon: icon left of text, `gap-2`, icon `h-4 w-4`
- Loading state: replace icon with `<Loader2 className="h-4 w-4 animate-spin" />`, keep text unchanged, add `disabled`

### 8.4 Forms

**Field structure:**
```
<FormField label="Phone Number" error={errors.phone} hint="10-digit mobile number">
  <Input ... />
</FormField>
```

**Validation rules:**
- Error appears inline below the field (not toast) using `FormField error` prop
- Error text: `text-destructive text-xs` with `role="alert"` — precise, actionable
- Hint text: `text-muted-foreground text-xs` — always shown when field has a format requirement
- Required fields: `*` in red after label — never the word "required"
- Tooltip on complex fields: `tooltip="..."` prop on `FormField` — renders `HelpTooltip` next to label

**Focus ring — three variants exist (all correct, use the one matching the component):**
```
Input.tsx:              focus-visible:ring-1 focus-visible:ring-ring (no offset)
Select / Textarea:      focus:ring-2 focus:ring-primary/20 focus:border-primary
ToggleSwitch / custom:  ring-2 ring-primary ring-offset-2
```
Never invent a fourth variant. Never use `ring-teal-500` directly — use `ring-ring` or `ring-primary`.

**Error message format:**
```
❌ "Required"                          ← Too vague
❌ "Invalid input"                     ← Technical
✅ "Enter a 10-digit mobile number"    ← Tells user exactly what to do
✅ "Phone must start with 6, 7, 8, or 9"
✅ "Amount must be greater than ₹0"
```

**Form layout:**
- 1 column on mobile, 2 columns on desktop (`grid grid-cols-1 md:grid-cols-2 gap-4`)
- Full-width fields: name, address, notes, description
- Half-width fields: phone, email, date, amount, status
- Submit at bottom right, Cancel to its left

### 8.5 Status Badges

Always use `<StatusBadge status={value} />` — never custom-colored spans.

The status → color mapping is defined in `status-badge.tsx` and must not be duplicated anywhere.

### 8.6 Tables (DataTable)

**Column width tokens** (`columnWidths` from `data-table.tsx`):
```
primary:   flex-1 min-w-[200px]   → Main entity name
secondary: min-w-[150px]          → Supporting info
badge:     w-[100px]              → Status, type labels
status:    w-[120px]              → StatusBadge column
count:     w-[80px]               → Numeric counts
date:      w-[120px]              → Date columns
currency:  w-[100px]              → Amount columns
action:    w-[80px]               → Row actions
```

**Table row actions:** Always `TableRowActions` component. Never inline icon buttons in cells.

**Empty state inside table:** `EmptyState` component centered in table body. Never a blank white area.

### 8.7 Metrics Bar

Every list page uses `<MetricsBar>` — always 3–5 metrics, never more than 6. Built exclusively with metric factories from `src/lib/metric-factories.ts`.

**Metric ordering rule:**
1. Total (always first)
2. Most important status filter
3. Financial metric (if applicable)
4. Time-based metric (this month, today)
5. Alert metric (overdue, expiring) — highlighted in amber when > 0

### 8.8 Empty States

Every possible empty state is designed:

| State | Title format | CTA |
|-------|-------------|-----|
| No data yet | "No {entities} yet" | `gradient` button "Add first {entity}" |
| Search no results | "No results for '{query}'" | `outline` button "Clear search" |
| Filter no results | "No {entities} match these filters" | `outline` button "Clear filters" |
| Error | "Couldn't load {entities}" | `outline` button "Try again" |
| No permission | "Access restricted" | No CTA (just contact admin text) |

### 8.9 Loading States

**Rule:** Never show a spinner when content will load within 500ms. Use skeletons only.

```
Page loading:         PageLoader (centered Loader2 spinner)
Table loading:        Skeleton rows (same height as real rows)
Card loading:         Skeleton block matching card dimensions
Metric bar loading:   Skeleton pills
Button loading:       Loader2 icon replaces button icon, text unchanged, button disabled
Inline action:        Loader2 h-4 w-4 animate-spin — never toast "Loading..."
```

**Never use "Loading..." text. Never show a blank white area.** Every loading state has the same dimensions as the loaded state to prevent layout shift.

---

## 9. Animation System

### 9.1 Motion Principles (Apple-Inspired)

| Principle | Rule |
|-----------|------|
| **Purposeful** | Every animation communicates state change or hierarchy. No decoration-only animations. |
| **Fast** | Entry: 300–500ms. Exit: 150–200ms. Interactions: 100–200ms. Never exceed 600ms. |
| **Interruptible** | All animations use `forwards` fill — they stop cleanly if interrupted. |
| **Reduced-motion safe** | All animations wrapped in `prefers-reduced-motion: reduce` disabling. This is already in `globals.css`. |
| **Staggered entry** | Lists and grids use `.stagger-children` for sequential reveal — never all-at-once. |

### 9.2 Animation Class Reference

| Class | When to use |
|-------|-------------|
| `animate-fade-in-up` | Primary page content appearing |
| `animate-fade-in` | Overlays, modals, popovers |
| `animate-scale-in` | Dropdown menus, tooltips |
| `animate-slide-in-left` | Sidebar opening |
| `animate-slide-in-right` | Right panels, drawers |
| `stagger-children` | List of cards, grid items |
| `animate-stagger` | Table row entrance (with enough rows) |
| `animate-pulse-soft` | Background blob decorations only |
| `animate-float` | Hero icon or illustration only |
| `animate-shimmer` | Skeleton loading states |
| `animate-spin-slow` | Decorative logo spin, never on loading indicators |
| `hover-lift` | Clickable cards |
| `hover-scale` | Image thumbnails |
| `hover-glow` | Primary action buttons on feature/landing pages |

### 9.3 Transition Standards

```
Default:    transition-all duration-200 ease-out
Slow:       transition-all duration-300 ease-out   (page layout shifts)
Fast:       transition-colors duration-150           (hover color changes)
Spring:     transition-all duration-200 ease-out + active:scale-[0.98]  (button press)
```

---

## 10. Navigation Patterns

### 10.1 Sidebar (Desktop)

```
Width:       w-64 = 256px fixed (Tailwind w-64 class)
Header:      h-16, gradient bg (teal→emerald), white logo + text
Nav groups:  Collapsible with chevron, smooth max-h transition
Active item: Gradient pill (teal→emerald), white text, teal shadow
Hover item:  bg-muted, text-foreground
Footer:      border-t, bg-muted/30, logout (hover:destructive), theme toggle
```

**Active state must always use `brandGradient.navActive`** — never `bg-primary text-white` (that's a flat color, not the gradient).

### 10.2 Mobile Navigation

```
Mobile:      Bottom nav bar (5 most important items)
             Fixed bottom, glass background, safe-area padding
             Active dot indicator below active icon
             Overflow items → hamburger → full sidebar sheet
```

### 10.3 Portal Navigation (Tenant / Member)

```
Desktop:     Left sidebar w-64, gradient header with portal identity
Mobile:      Sticky gradient top bar + bottom sheet nav
             Full-bleed gradient header for portal brand recognition
```

**Portal brand colors must stay distinct:**
- Tenant portal: teal/emerald (same as owner)
- Member portal: purple/indigo (visually separate — different product feel)

---

## 11. Page-Level Patterns

### 11.1 List Pages

```
1. PageHeader (title, description, icon, "Add New" button)
2. MetricsBar (3–5 metrics)
3. Filter bar (search + quick filters, "Advanced Filters" toggle)
4. DataTable (with column manager, inline edit, group by)
5. Pagination
```

Page background: `brandGradient.pageBg` — always the subtle teal/emerald tint.

### 11.2 Detail Pages

```
1. PageHeader with breadcrumb ("Properties / Sunrise PG / Edit")
2. DetailHero (avatar/icon, name, primary status, quick actions)
3. Tab bar OR section list (overview, related data, history)
4. DetailSection components
5. DetailPageAudit (auto-added by DetailPageTemplate)
```

**Breadcrumb rule:** Every detail page has exactly this format:
```
Module list → Entity name → (Optional: Sub-page)
"Tenants / Rahul Sharma" or "Tenants / Rahul Sharma / Edit"
```

### 11.3 Form Pages

```
1. PageHeader with back button + breadcrumb
2. Form card (max-w-3xl mx-auto)
3. Grouped form sections (e.g., "Basic Info", "Contact Details")
4. Submit bar (sticky bottom on mobile, normal bottom on desktop)
```

**Form card:** `bg-card rounded-xl border shadow p-6`
**Section divider inside form:** `<SectionDivider>` component — subtle with label

### 11.4 Portal Pages

```
1. No PageHeader (portal uses PortalLayout's built-in header)
2. Page title inside content area (text-xl font-semibold mb-4)
3. Cards for content sections
4. Mobile-first layout — single column always
```

---

## 12. Data Patterns

### 12.1 Numbers & Currency

```
Currency:   Always use <Currency amount={value} />
            Never: "₹" + number.toFixed(2)
            Always: en-IN locale, INR

Large numbers: Use lakh/crore format in labels
              "₹1,23,456" not "₹123456" or "₹1.23L"

Counts:     Use tabular-nums on all count displays
            Animate with <AnimatedNumber /> on dashboard metrics

Percentages: Always show 1 decimal: "94.3%" not "94%" or "94.285714%"

Dates:       Use "27 Apr 2026" format (Indian standard)
             Never "04/27/2026" (US format)
             Never "2026-04-27" (ISO, only in inputs)
             Relative: "2 days ago", "3 months left"
```

### 12.2 Avatars & Identity

```
With photo:     Circular photo, ring on hover (ring-primary/50)
Without photo:  Initials in primary/10 bg, text-primary
                Use first + last initial: "RS" not "R"
Name display:   Always fall back: person?.name || entity.name
Photo source:   Always from people.photo_url (people table)
```

### 12.3 Phone Numbers

```
Display:    +91 98765 43210  (not "9876543210" or "+919876543210")
WhatsApp:   href="https://wa.me/91{phone}" — remove all non-digits
Call:       href="tel:{phone}"
Always show both Call and WhatsApp quick actions when phone is present
```

---

## 13. Notification System (In-App)

### 13.1 Toast Notifications (Current — Sonner)

Position: top-right. `richColors` enabled. `closeButton` visible.

```
Success:     "Payment of ₹5,000 recorded"        → green
Error:       "Failed to save — try again"         → red
Warning:     "Tenant's lease expires in 3 days"   → amber
Info:        "Sync in progress"                   → blue/neutral
```

**Toast rules:**
- Duration: 3s for success, 5s for error/warning
- Never toast on read-only operations (page loads, fetches)
- Always toast on write operations (save, delete, update)
- Error toasts show the user-friendly message, not the technical error

### 13.2 In-App Notification Bell (Implemented — `NotificationBell` component)

Component: `src/components/ui/notification-bell.tsx`
Hook: `src/lib/hooks/useNotifications.ts` (fetches from `notifications` table, realtime via Supabase channel)

```
Bell icon: Bell (Lucide), ghost button with hover:bg-muted
Unread badge: absolute top-1 right-1, h-4 w-4, rounded-full, bg-destructive
              text-[10px] font-bold tabular-nums — shows count, "99+" if >99
Dropdown panel: w-80 sm:w-96, rounded-xl, shadow-xl, z-50
  Header: "Notifications" title + "Mark all read" (CheckCheck icon) when unread > 0
  List: max-h-[420px] overflow-y-auto
  Unread item: bg-primary/5 — blue dot indicator on left
  Read item: bg-background — transparent dot (invisible)
  Each item: type color badge (success/warning/destructive/primary/info/muted)
             title (font-medium when unread) + body (line-clamp-2) + relative time
  Empty state: Inbox icon, "All caught up", "No notifications yet"
  Footer: "Showing last N notifications" caption
  Closes on: outside click, Escape key
```

**Notification types → color mapping:**
```
payment   → bg-success/10 text-success
bill      → bg-warning/10 text-warning
complaint → bg-destructive/10 text-destructive
approval  → bg-primary/10 text-primary
notice    → bg-info/10 text-info
system    → bg-muted text-muted-foreground
```

---

## 14. Accessibility Standards (WCAG 2.1 AA)

### 14.1 Color Contrast (All verified passing)

| Token | Ratio | Status |
|-------|-------|--------|
| `text-foreground` on `bg-background` | 19.8:1 | ✅ AAA |
| `text-muted-foreground` on `bg-background` | 5.1:1 | ✅ AA |
| `text-primary-foreground` on `bg-primary` | 4.9:1 | ✅ AA |
| `text-destructive` on `bg-background` | 5.4:1 | ✅ AA |
| `text-success` on `bg-background` | 4.6:1 | ✅ AA |
| `text-warning` on `bg-background` | 4.8:1 | ✅ AA |
| `text-info` on `bg-background` | 4.7:1 | ✅ AA |
| White on gradient (teal→emerald) | 4.7:1 | ✅ AA |

### 14.2 Interactive Element Rules

```
Minimum touch target:   44×44px (iOS HIG standard)
Focus ring:             ring-2 ring-ring ring-offset-2 (teal)
Keyboard navigation:    All interactive elements reachable via Tab
Skip links:             "Skip to content" for screen reader users
ARIA roles:             DataTable uses role="grid" / "row" / "columnheader" / "gridcell"
ARIA labels:            Icon-only buttons always have aria-label
ARIA expanded:          Collapsible sections use aria-expanded
Images:                 All meaningful images have alt text
Decorative images:      alt=""
```

### 14.3 Reduced Motion

All animations in `globals.css` are disabled under:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 15. Dark Mode

### 15.1 Dark Mode Principles

- Dark mode is **system-default** — respects OS setting
- **No manual toggle visible** in portal pages (portals are app-like, system follows)
- **Toggle in sidebar footer** for dashboard users (operators on desktop prefer choice)

### 15.2 Dark Mode Color Rules

```
Background:   hsl(224 71% 4%)   — deep navy, NOT pure black (#000)
Card:         hsl(222 47% 11%)  — elevated navy
Border:       hsl(217 33% 17%)  — subtle navy border
Primary:      teal-400 (brighter in dark — maintains contrast)
Text:         hsl(210 40% 98%) — near-white
Muted text:   hsl(215 20% 65%) — readable gray-blue
Gradients:    Same gradient values — they work in both modes
```

**Rule:** Never use `dark:bg-black` or `dark:text-white`. Always use semantic tokens. The dark mode values are already in CSS variables.

---

## 16. PWA & Mobile Patterns

### 16.1 Install Experience

```
beforeinstallprompt captured → stored in ref
Install button: gradient pill, bottom-right corner, appears after 30s of use
                OR in sidebar footer as "Install App" option
                "📱 Install App" — brief, non-intrusive
On install:     Confetti or subtle success animation
On decline:     Never ask again for 7 days
```

### 16.2 Offline State

```
Connection banner: sticky top-0, bg-warning/10, border-b border-warning/20
Text: "You're offline — viewing cached data"
Dismiss: × button, banner hides after 5s
Data freshness: "Last updated 2 min ago" in muted caption below page title when offline/stale
```

### 16.3 Mobile Layout Rules

```
All grids:    Have sm: breakpoints — grid-cols-2 always has sm:grid-cols-2 or similar
Nav:          Bottom tab bar on mobile, sidebar on desktop (lg:)
Tables:       Horizontal scroll (overflow-x-auto) on mobile — never break layout
Forms:        Single column on mobile, 2-col on md:
Buttons:      Full width on mobile for primary actions in cards
Touch targets: All interactive elements ≥ 44px height
Font size:    Never below text-xs (12px) in production UI
Tap areas:    Pad clickable icons with p-2 minimum
```

---

## 17. Portal-Specific Design

### 17.1 Tenant Portal (Teal Brand)

```
Portal name:   "Tenant Portal"
Brand:         from-teal-500 to-emerald-500 (same as dashboard)
Icon:          Building2
Entry point:   /tenant (login via OTP)
Entity info:   Property + Room number prominently displayed
Quick actions: Call owner, WhatsApp owner (from property data)
Data shown:    Bills, Payments, Complaints, Notices, Documents, Profile
```

### 17.2 Member Portal (Purple Brand)

```
Portal name:   "Member Portal"
Brand:         from-purple-500 to-indigo-500 (distinct from PG)
Icon:          BookOpen
Entry point:   /member (login via OTP)
Entity info:   Member code (monospace), Hours balance prominently displayed
Quick actions: QR code for check-in
Data shown:    Attendance, Payments, Locker, Notices, Complaints, Profile, QR
```

**The purple/indigo distinction is intentional and must be maintained.** A tenant and a library member could be the same person on the same device — they must be visually distinct portals.

---

## 18. Anti-Patterns (Never Do These)

### Visual Anti-Patterns

```
❌ Raw <select> element  → use <Select> from form-components.tsx
❌ Hard-coded colors (text-red-600, bg-blue-500 in components) → use semantic tokens
❌ Multiple gradient CTAs visible simultaneously → one per screen section
❌ Empty white areas while loading → use skeletons
❌ "Loading..." text → use skeleton or spinner
❌ Alerts for success operations (alert() browser dialog) → use toast
❌ Console.log in production components
❌ Inline style attributes in JSX (style={{ color: "red" }}) → use Tailwind classes
❌ Mixing icon libraries (any non-Lucide icon)
❌ Unconstrained image display (always specify dimensions or aspect ratio)
❌ Hero sections inside detail pages → reserved for landing/marketing only
```

### UX Anti-Patterns

```
❌ Forms that submit without validation → use validationSchema + FormField
❌ Destructive actions without confirmation dialog
❌ Error messages that say "Something went wrong" → always be specific
❌ Navigation that doesn't highlight the current page
❌ Modals for simple forms that should be a page
❌ Buttons that don't show loading state during async operations
❌ Search that requires Enter key → always search on input change (debounced)
❌ Required fields without visual indicator (*)
❌ More than 3 levels of hierarchy in a single page
❌ Phone numbers without WhatsApp link when user is Indian
```

### Code Anti-Patterns

```
❌ Inline option arrays (hardcoded dropdown values) → import from @/lib/status or form-options.ts
❌ Custom compute functions in metrics → use metric factories
❌ Inline column render for standard patterns → use column builders
❌ Direct supabase client calls in page components → use useDetailPage / useListPage
❌ useEffect for localStorage → use useState lazy initializer
❌ createSumMetric on computed/joined fields → use inline compute
```

---

## 19. Component Creation Checklist

Before creating any new UI component, verify:

**Foundation**
- [ ] Does an existing component in `src/components/ui/` already solve this?
- [ ] Uses semantic color tokens — no raw Tailwind colors (`text-teal-600`, `bg-red-500`, etc.)
- [ ] All spacing is on the 8px grid (multiples of 4px — no `p-5`, `gap-5`, `gap-3.5`)
- [ ] Uses `zIndex.*` from design-tokens.ts for any layered positioning — no raw `z-50`

**States (all interactive components require all 6)**
- [ ] Default (no interaction)
- [ ] Hover (`hover:` — color/shadow shift)
- [ ] Focus (`focus-visible:` — ring, not focus: to avoid mouse focus rings)
- [ ] Active/Pressed (`active:scale-[0.98]` or color darken)
- [ ] Disabled (`opacity-50 cursor-not-allowed pointer-events-none`)
- [ ] Loading (Loader2 spinner replaces icon, text unchanged, element disabled)

**States (data components)**
- [ ] Loading state (skeleton matching component dimensions — never blank white)
- [ ] Empty state (EmptyState or EmptyStateInline — never a blank area)
- [ ] Error state (ErrorState with "Try again" action — never a crash)

**Platform**
- [ ] Works in dark mode (test with `.dark` class — no hardcoded light colors)
- [ ] Works on mobile — touch targets ≥ 44px (add `min-h-[44px]` if needed)
- [ ] Responsive layout — grid breakpoints, no fixed widths that break at 375px
- [ ] Respects `prefers-reduced-motion` (handled globally in globals.css — just don't use `!important` on animations)

**Code quality**
- [ ] Exported from `src/components/ui/index.ts`
- [ ] TypeScript interface with JSDoc on any non-obvious props
- [ ] ARIA attributes: `role`, `aria-label`, `aria-expanded`, `aria-live` as appropriate
- [ ] Tested in at least one real page before marking done

---

## 20. Design Decisions Reference

| Decision | Rationale |
|----------|-----------|
| Inter over system fonts | Most legible UI font at 12–16px across all operating systems |
| Teal/emerald over pure blue | Differentiates from generic blue SaaS; Indian cultural warmth; works for finance and trust |
| Amber accent over orange/yellow | High visibility for financial figures; warm without aggression |
| Rounded-xl cards | Approachable, modern; consistent with iOS/Android native feel |
| Glassmorphism sidebar | Depth without heavy weight; works in both light and dark |
| Bottom nav on mobile | Thumb-friendly; same pattern as WhatsApp, Instagram, PhonePe |
| Gradient headers in sidebar/portals | Brand recognition anchor — user always knows which product they're in |
| Purple for library portal | Intentionally different from PG teal — same owner could have both portals on one device |
| 8px spacing grid | Forces consistency; eliminates ad-hoc spacing that breaks alignment |
| tabular-nums on all figures | Prevents column width shift as numbers update in real time |
| Lucide icons only | Single visual language; consistent weight and style at all sizes |
| PWA disabled by default | Next-pwa NavigationRoute intercepts all navigation — custom SW required to re-enable safely |
| Bottom nav implemented | `MobileNavBar` in `nav-item.tsx`, items defined in `DASHBOARD_MOBILE_NAV` in `navigation/config.ts` |

---

## 21. Z-Index Layer System

The z-index scale is defined in `globals.css` and exported from `src/lib/design-tokens.ts` as `zIndex.*`. **Never use raw `z-50`, `z-[9999]`, or any literal z-index value in components.**

```
Layer               Token                     CSS Value   Usage
─────────────────────────────────────────────────────────────────
Sidebar (desktop)   zIndex.sidebar            z-[20]      Fixed sidebar
Top header          zIndex.header             z-[30]      Sticky glass header
Overlays / backdrop zIndex.overlay            z-[40]      Mobile sidebar backdrop
Dropdowns/tooltips  zIndex.dropdown           z-[40]      Popovers, date pickers, combobox
Sticky elements     zIndex.sticky             z-[45]      Sticky table headers
Modals / drawers    zIndex.modal              z-[50]      Dialog overlays, mobile sidebar
Command palette     zIndex.dialog             z-[100]     CMD+K palette, fullscreen dialogs
Image lightbox      zIndex.lightbox           z-[150]     Full-screen image viewer
Toast notifications zIndex.toast              z-[200]     Always on top of everything
```

**Critical rules:**
- A child component's z-index must never exceed its parent's layer. A date picker inside a modal must use `zIndex.dropdown` (40), NOT `zIndex.modal` (50) — the modal's own z-index already elevates the picker above non-modal content.
- Tooltips always use `zIndex.dropdown` (40) — they must appear above cards but below modals.
- Mobile sidebar sheet uses `zIndex.modal` (50) + matching backdrop at `zIndex.overlay` (40).
- Never use `zIndex.toast` on anything except toast notifications — if content needs to be above toasts, the design is wrong.

---

## 22. Data Visualization (Charts)

Library: **Recharts**, always via `<ChartContainer config={...}>` — never raw Recharts components without the wrapper.

### Chart Color Assignments

| Token | Semantic meaning | Use for |
|-------|-----------------|---------|
| `chart-1` (teal) | Primary entity metric | Main trend line, primary bar series |
| `chart-2` (amber) | Financial / revenue | Amount series, payment bars |
| `chart-3` (purple) | Comparative / secondary | Second entity, comparative series |
| `chart-4` (sky) | Informational / count | Attendance count, member count |
| `chart-5` (rose) | Negative / loss / overdue | Overdue amounts, cancellations |

**In code:** Use `var(--chart-1)` through `var(--chart-5)` — never hardcode hex values in chart fill props.

### Chart Type Selection

| Data shape | Chart type | Why |
|-----------|-----------|-----|
| Trend over time (revenue, attendance) | Line chart | Shows continuity |
| Category comparison (by property, by month) | Vertical bar chart | Clearest comparison |
| Part-to-whole (payment status breakdown) | Donut chart | Labels don't overlap |
| Two related metrics on same timeline | Stacked bar | Additive relationship |
| Distribution (room occupancy range) | Horizontal bar | Long category labels fit |

**Never use:** 3D charts, pie charts with >5 segments, radar charts, treemaps.

### Visual Rules

```
Grid:           Always show CartesianGrid with stroke="hsl(var(--border))" strokeOpacity={0.4}
Tooltip:        Always show — custom tooltip component with ₹ formatting via formatCurrency()
Legend:         Hide on mobile (screen < md) — use a descriptive chart title instead
Axis labels:    className="text-xs fill-muted-foreground" — never default Recharts gray
ResponsiveContainer heights:
  Compact card metric chart:   h-[120px]
  Standard dashboard chart:    h-[200px]
  Full report chart:           h-[300px]
  Never use h-[400px]+ inside a card — use a full-width section
```

---

## 23. UI Pattern Selection (Modal vs Page vs Inline)

The most common source of cross-page inconsistency. Apply this decision tree exactly:

### Full Page (`/module/new`, `/module/[id]/edit`)

Use when:
- Creating a **new entity** (tenant, member, property, room, bill)
- Form has **more than 8 fields**
- Form involves **file upload**, photo, or multi-step flow
- User needs to see related context while filling out (e.g., editing from a detail page)
- The action is **high stakes** and benefits from a dedicated focus

### FormDialog (modal with form inside)

Use when:
- Quick action on an **existing record** — record a payment, add a note, log attendance
- Form has **6 or fewer fields**, no file upload
- The surrounding context (the list, the detail) must stay visible
- The action is **easily reversible** or low-stakes

Examples: Record payment, mark bill as paid, add complaint note, manual check-in, assign locker.

### Inline Edit (DataTable cell editing)

Use when:
- Editing **a single field** on a record already visible in the list
- The change is **immediately obvious** (status toggle, date change, amount correction)
- The field does **not require validation** that blocks other fields
- The change is **minor and reversible**

Examples: Toggle `is_active`, update amount, change status, edit a name.

### Confirm Dialog (`ConfirmDialog` component)

Use for **every** destructive or non-reversible action:
- Delete any record (soft delete)
- Revoke access, deactivate member
- Finalize exit clearance
- Any action described with "this cannot be undone"

**Never** use `window.confirm()` — always use the `ConfirmDialog` component.

### Decision flowchart

```
Is the action destructive or non-reversible?
  → YES: ConfirmDialog always

Is it creating something new OR does it have >8 fields OR does it involve a file upload?
  → YES: Full page

Does it operate on an existing record with ≤6 fields and no file upload?
  → YES: FormDialog

Is it a single-field change on a visible list row?
  → YES: Inline edit
```

---

## 24. Error Response Hierarchy

Every error in the platform has a specific level with a specific visual treatment. **Never mix levels** (no toast AND full ErrorState simultaneously).

### Level 1 — Field Validation Error (inline, immediate)

```
Trigger:  On blur + on every submit attempt
Display:  FormField error prop → text-xs text-destructive below field with role="alert"
Recovery: User corrects the field value
Never:    Toast for validation errors. Never show Level 1 errors only on submit (too late).
```

### Level 2 — Form Submission Error (toast + field re-highlight)

```
Trigger:  API returns 4xx on form submit
Display:  toast.error() with specific human message + re-highlight failed field(s)
Recovery: User corrects and resubmits
Never:    Expose HTTP status codes or "Internal server error" to users
```

### Level 3 — Page Load Error (full content area, ErrorState component)

```
Trigger:  Initial data fetch fails (network error, 5xx, timeout)
Display:  <EmptyState variant="error" title="Couldn't load this data"
                       description="Check your connection and try again."
                       action={{ label: "Try again", onClick: refetch }} />
Recovery: "Try again" button re-triggers the fetch
Never:    Blank white page. Never "Something went wrong" (violates voice rules).
```

### Level 4 — Not Found (record missing or access denied)

```
Trigger:  Record doesn't exist OR user lacks RLS permission (treat identically — never confirm what exists)
Display:  Not Found UI: icon + "This [entity] doesn't exist or you don't have access."
          + Link back to parent list ("Back to Tenants")
Recovery: Back navigation only — no retry
```

### Level 5 — Permission / Feature Denied (PermissionGuard renders nothing)

```
Trigger:  User navigates to a route requiring a permission they don't have
Display:  PermissionGuard shows an "Access Restricted" message with no action CTA
Recovery: No self-recovery — contact admin text only
Never:    CTA button that the user cannot act on. Never expose what permissions would unlock it.
```

**Voice rule across all levels:** Never say "Something went wrong", "An error occurred", "Unexpected error", or any passive phrasing. Always say what happened and what to do: "Couldn't load tenants — check your connection and try again."

---

## 25. Animation Refinement

### Easing Curves

```
Enter (content appearing):         ease-out      cubic-bezier(0, 0, 0.2, 1)
Exit (content disappearing):       ease-in       cubic-bezier(0.4, 0, 1, 1)
Move (element changing position):  ease-in-out   cubic-bezier(0.4, 0, 0.2, 1)
Spring (button press):             active:scale-[0.98] transition-transform duration-100
```

**Never use linear easing for UI interactions.** Linear easing reads as mechanical, not natural. It is only acceptable for progress bars and loading spinners.

### Duration by Interaction Type

```
Micro-interactions (button press, checkbox toggle):  100ms
Component transitions (dropdown open, tooltip show): 150ms
Panel animations (modal open, sidebar slide):        250ms
Page-level transitions (route change, tab switch):   300ms
```

**Never exceed 300ms for interactive elements.** Animations over 300ms on interactions feel sluggish. The 300–500ms range documented previously was for decoration animations (page entry) only — not interactions.

### Stagger Systems (Two Exist — Do Not Confuse)

```
.stagger-children  → For card grids and list renders
                     Each child gets animation-delay incremented by 50ms
                     Individual duration: 0.5s ease-out
                     Max items to stagger: 10 (beyond that, no stagger needed)

animate-stagger    → For DataTable row entrance
                     Each row: animation-delay: calc(index * 50ms)
                     Duration: 0.3s ease-out (faster — rows are smaller visual units)
```

---

## 26. Key Component Reference

Quick lookup for the 25 most-used components. Full implementation in `src/components/ui/`.

| Component | File | When to use | When NOT to use |
|-----------|------|------------|-----------------|
| `FormField` | `form-components.tsx` | Every form field — wraps label, input, error, hint, tooltip | Never raw `<label>` + `<input>` pair |
| `Select` | `form-components.tsx` | Dropdowns ≤10 static options | Dynamic/searchable data → use Combobox |
| `Combobox` | `combobox.tsx` | Searchable dropdowns, >10 options, or user can't predict the value | Static short lists |
| `DataTable` | `data-table.tsx` | All list pages | Never build a custom table |
| `EmptyState` | `empty-state.tsx` | Full-section empty (no data yet, no results) | Inline small empty → EmptyStateInline |
| `EmptyStateInline` | `empty-state-inline.tsx` | Small empty inside a card or panel | Full page empty → EmptyState |
| `StatusBadge` | `status-badge.tsx` | Any status display (active, pending, etc.) | Never custom-colored span |
| `ConfirmDialog` | `confirm-dialog.tsx` | Every destructive action | Never `window.confirm()` |
| `FormDialog` | `form-dialog.tsx` | Quick forms on existing records (≤6 fields) | New entity creation → full page |
| `PageLoader` | `page-loader.tsx` | Full-page loading state | In-card loading → Skeleton |
| `MetricsBar` | `metrics-bar.tsx` | Top of every list page | Never on detail pages or forms |
| `HelpTooltip` | `help-tooltip.tsx` | Complex field explanation via `tooltip=""` prop on `FormField` | General content tooltips |
| `InfoBanner` | `info-banner.tsx` | Dismissable contextual guidance (one per page max) | Persistent warnings → use Alert |
| `Currency` | `currency.tsx` | Every monetary display | Never `₹{amount.toFixed(2)}` |
| `AnimatedNumber` | `animated-number.tsx` | Dashboard metric counts that change | Static display numbers |
| `ChartContainer` | `chart-container.tsx` | Every Recharts chart | Never raw `<BarChart>` without wrapper |
| `DetailPageTemplate` | `detail-page-template.tsx` | Every detail page — auto-adds audit section | Never build custom detail layout |
| `ListPageTemplate` | `shared/ListPageTemplate.tsx` | Every list page | Never build custom list layout |
| `PortalLayout` | `portal/index.tsx` | Tenant + member portal pages | Never on dashboard pages |
| `PermissionGuard` | `auth/permission-guard.tsx` | Every page + every action button | Never skip — missing guard = security gap |
| `FeatureGuard` | `auth/feature-guard.tsx` | Feature-flagged modules (outside PermissionGuard) | Never nest inside PermissionGuard |
| `BrandLogo` | `brand-logo.tsx` | Sidebar header, loading screens | Never hardcode "ManageKar" text |
| `ThemeToggleSidebar` | `theme-toggle.tsx` | Sidebar footer only | Never duplicate in page content |
| `NotificationBell` | `notification-bell.tsx` | Dashboard header only | Never in portals |
| `PWAInstallButton` | `pwa-install-prompt.tsx` | Sidebar footer (auto-hides when not installable) | Never in page content |

### Select vs Combobox Decision (3-axis rule)

| Axis | Use Select | Use Combobox |
|------|-----------|--------------|
| Count | ≤10 options | >10 options |
| Searchability | User knows the value | User might not know exact value |
| Data source | Static (hardcoded list) | Dynamic (fetched from DB) |

**Third axis overrides count:** Even with 8 options, if the user cannot be expected to know the exact value in advance (e.g., selecting a room number they haven't memorized), use Combobox.

---

*ManageKar Brand & Design System — maintained by AI, owned by Rajat Seth.*
*Every pixel in this product is intentional. Every color has a reason. Every animation has a purpose.*
*Last Updated: 2026-04-27*
