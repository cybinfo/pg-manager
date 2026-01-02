
# 🔧 ManageKar / PG Manager — Claude Code Terminal **MASTER PROMPT**

**Owner:** Rajat Seth  
**Client Owner Email:** `newgreenhigh@gmail.com`  
**Last updated:** 2026-01-02 (IST)

> **Purpose:** Plan → Implement → Validate → Ship all requested enhancements & fixes (client + owner) with best‑practice **security, RBAC, RLS, UX, and maintainability**.
> 
> **Usage:** Copy‑paste this entire document into the **Claude Code Terminal**. Claude must output a Planning Mode first, then the Implementation Diff, Security & RLS Matrix, QA checklist, and Release artifacts.

---

## 0) CONTEXT (read‑first, non‑negotiable)
- Project: **ManageKar (PG Manager)** — Next.js 16 (App Router), TypeScript, Tailwind + shadcn/ui, Supabase (PostgreSQL) with **RLS**, hosted on Vercel.
- References (from CLAUDE.md):
  - `src/app/(dashboard)/dashboard/*` modules: properties, rooms, tenants, bills, payments, expenses, meter‑readings, staff/roles, notices, complaints, visitors, exit‑clearance, reports, settings.
  - `src/lib/auth/*`: AuthProvider, hooks, permission guards; **session refresh** on tab visibility/focus via `getUser()`.
  - `src/lib/email.ts` (Resend), `src/lib/notifications.ts` (WhatsApp templates), `src/lib/pdf-receipt.tsx`.
  - Supabase migrations **001 → 014** (identity, roles, permissions, billing, website, tenant history, etc.).
- **Critical patterns:**
  1) Supabase **join arrays** → always guard with `Array.isArray(...)` before dereferencing.
  2) Use `useAuth().hasPermission()` + `useCurrentContext()` for **permission checks**.
  3) **Page protection**: wrap pages with `<PermissionGuard/>` or `<OwnerGuard/>`.
  4) **Session refresh**: use server‑validated `getUser()`; refresh on **tab visibility** / **window focus**.

---

## 1) PRINCIPLES (Always Remember)
The entire **design, code, UI, workflow** must be: **Standardised, Unified, Modular, Centralised, Flexible, Secure, Simplified, Automated, Reutilised, Innovative, Fully Linked, AI‑driven, BI‑enabled, Customer‑Centric**.

> You MAY modify any workflow (even globally) if it objectively improves usability, security, auditability, and performance while preserving data integrity.

---

## 2) ACTING ROLES
You will act as: **Planner → Systems Architect → Security Engineer → Full‑stack Developer → QA → Release Manager**.

---

## 3) INPUTS — Implement ALL Client + Owner Feedback
**Client owner email:** `newgreenhigh@gmail.com`

### 3.1 New items to implement
1. **Audit logging**: Log **all** activity (who/when/what/before/after/context) → global, immutable, queryable.  
2. **Indian mobile validation & verification** (+91 normalization; 10 digits; OTP verification).  
3. **Email validation & verification** (format; token link; optional disposable‑domain blocklist).  
4. **Tenant Dashboard**: Property & Room **not showing** → fix; add **check‑in date** to dashboard.  
5. **Dashboard color issue**: “always green” looks selected → fix active state logic & theme tokens.  
6. **Mobile layout**: Logout button hidden behind bottom menu → fix z‑index/safe‑area.  
7. **Superuser (Global Admin)**: Full A–Z permissions across **all** owners/workspaces; ability to delete payment records for troubleshooting.  
8. **Demo owner account**: Masked sample data, safe to demo/record without leakage.  
9. **URL clarity**: Provide cleaner paths/aliases (e.g., `/tenants`) with redirects from `/dashboard/*`; add breadcrumbs & deep links.  
10. **Property Architecture View (2D)**: Visual map of properties → rooms → beds → availability; filters for free beds/rooms.  
11. **Approvals Hub**: Tenant requests (name/address change, complaints, etc.) with statuses & audit trail.  
12. **WhatsApp summaries**: Payment & expense summary to owner/manager; recipients configurable.  
13. **Photo uploads**: Not working anywhere → fix across Properties/Rooms/Tenants/Website; Supabase Storage; signed URLs.  
14. **Generate Bill (UI)**: Multi‑select categories (Rent/Food/Electricity…) to build combined bill.  
15. **Default bill date**: Use **check‑in date**; **month = current**.  
16. **Tenant food options**: Breakfast/Lunch/Dinner/Snacks; shown only if enabled in Settings via meal toggles.  
17. **Payment workflow**: **No direct payments**; always reference a **Bill** first. Enforce in UI + server + RLS.  
18. **Dropdowns**: Always include **search** at top (combobox).  
19. **Bill continuity**: Monthly chain with **no gaps**; even zero‑usage → create ₹0 bill + auto payment record; else remove assignment for that period.  
20. **Session timeout**: Auto‑logout on inactivity (configurable).  
21. **Room capacity bug**: Room 101 (3 beds) cannot add 3rd tenant → fix capacity/occupancy.

### 3.2 Validate & (re)implement previous requests
- Multiple stays per person (leave & rejoin), and room switches → **comprehensive history** via `tenant_stays`; validate UI.  
- Payments linked to bills; support **partial payments**; auto‑clear dues when total ≥ due.  
- Public PG websites per property (slug config, content, galleries).  
- Homepage branding: ManageKar (platform) ≠ only PG; PG Manager is a product. Update messaging to reflect mission/vision; show new features routinely.  
- Pricing: 3 months full access; **Free tier** (1 PG, max 10 rooms, max 30 active members, no deactivated data). Display on main page; PG product info on separate page.  
- UI/UX improvements: higher polish, consistency, accessibility (A11y).  
- **₹ (INR)** symbol everywhere money appears via `Currency` component.  
- Room defaults: rent & deposit from PG type; editable; configurable in **Settings → Money**; show amenities.  
- Auto‑select room capacity by room type (double sharing → 2 beds).  
- Tenant addition: resolve “Failed to add tenant”; support **multiple phones/emails** with defaults & WhatsApp flag; **multiple parental contacts**; **multiple addresses** with zip lookup & type tags.  
- ID proofs: multiple docs per proof; support front/back.  
- Website: handle duplicate domain errors; cover photo & galleries for properties/rooms/tenants; reflect on public site.  
- Dashboard: increase information density with meaningful metrics.

---

## 4) GLOBAL ENGINEERING REQUIREMENTS
- Update **CLAUDE.md** and **README.md** for any user‑facing change; write **detailed git commits** (why/what/how).  
- Follow Next.js App Router best practices; **TypeScript strict**; Tailwind + shadcn idioms.  
- Maintain **RLS**: no privileged actions on client. Use **server actions/API routes** for superuser ops.  
- Respect **Supabase join arrays** pattern everywhere.  
- Run `/compact` after major tasks.

---

## 5) OUTPUT CONTRACT — Every run MUST produce
1) **PLANNING MODE** (MANDATORY):  
   - Structured plan with options (A/B/C) where relevant; pick best default if no selection is provided.  
   - Architecture impacts (DB schema, RLS policies, APIs, UI components).  
   - Security considerations (AuthN/AuthZ, secrets, auditability, rate limiting).  
   - Migration strategy (forward‑only, seed/backfill).  
   - Rollout plan & feature flags.

2) **IMPLEMENTATION DIFF**:  
   - File‑by‑file changes (paths under `src/…`, SQL migrations, configs).  
   - New tables/policies/functions for **audit logs, approvals, superuser**.  
   - UI changes: component reuse (`PageHeader`, `MetricsBar`, `DataTable`, `PhotoGallery`, etc.), combobox search.  
   - Tests (unit/integration/e2e), incl. **regression** for previous items.

3) **SECURITY & RLS MATRIX**:  
   - For each table: `SELECT/INSERT/UPDATE/DELETE` predicates, including superuser bypass.  
   - Invitation/verification tokens: short‑lived, **hashed**, single‑use; audit who invited/accepted; rate limit.

4) **QA CHECKLIST & TEST RUN LOGS**:  
   - Step‑by‑step scenarios with expected results for each item above.  
   - Screenshots or textual snapshots (component states, sample data).

5) **RELEASE ARTIFACTS**:  
   - Changelog for **CLAUDE.md**; README updates.  
   - Migration list incremented (**015+**).  
   - Vercel configs for cron/feature flags.  
   - Demo owner account creation instructions (or script), masked data policy.

---

## 6) IMPLEMENTATION GUIDELINES (deep detail)

### A) Audit Logging (global, immutable)
- Create table: `audit_events` with fields:
  ```sql
  id uuid pk,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid not null,
  actor_context_id uuid null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before jsonb null,
  after jsonb null,
  workspace_id uuid null,
  request_id text null,
  ip inet null,
  user_agent text null
  ```
- RLS:  
  - Owners/Staff: `workspace_id = current_workspace_id()`.  
  - Superuser: bypass via server actions (service role) or dedicated predicate `is_platform_admin(auth.uid())`.
- Emit logs for CRUD across modules, auth events, context switch, role changes, billing & payments, approvals.

### B) Indian Mobile & Email Validation/Verification
- **Frontend validation**:  
  - Mobile: `^(\+?91)?[6-9]\d{9}$` with country code normalization and leading zero handling.  
  - Email: RFC5322‑lite; optional disposable domain blocklist.  
- **Verification**:  
  - OTP for mobile via provider abstraction in `lib/notifications.ts`.  
  - Email link tokens: new table `verification_tokens` (hashed token, type=email|phone, user_id, expires_at).  
- **UI**: `StatusBadge` for verified; enforce verification for sensitive operations (setting toggles).

### C) Tenant Dashboard fixes
- Use Supabase **join array pattern** to fetch Property/Room reliably.  
- Display **check‑in date** (from latest active `tenant_stays`).  
- Handle multiple stays; surface room assignment clearly.

### D) UI Bugs
- **Dashboard active color**: route‑aware `usePathname()` mapping; selected state only when route matches; brand color reused for hover/focus themes.  
- **Mobile logout**: increase z‑index; add bottom safe‑area padding; expose logout in profile sheet for mobile.

### E) Superuser (Global Admin)
- Role: **SystemAdmin** with A–Z permissions.  
- Table: `platform_admins (user_id uuid pk)`; seed includes `newgreenhigh@gmail.com`.  
- RLS: `(is_owner_of_workspace) OR (is_platform_admin)`; cross‑workspace ops through server actions using service role.  
- UI: `(dashboard)/admin/` explorer → Owners → Properties → Rooms → Tenants → Bills → Payments; allow payment deletion (with audit record).

### F) Demo Owner Account
- Env flag `DEMO_MODE=true`:  
  - Seed masked data; disable outbound emails/WhatsApp.  
  - Read‑only guard for destructive actions; watermark “Demo”.  
  - Script: `scripts/seed-demo-owner.ts` for safe demo workspace creation.

### G) URL Clarity & Navigation
- Route aliases `/tenants`, `/properties`, etc., redirect to `/dashboard/*`.  
- Breadcrumbs everywhere via `PageHeader`.  
- Deep linkability for entities.

### H) Property Architecture View (2D)
- New module: `src/app/(dashboard)/dashboard/architecture/`.  
- Visual: properties grid → click → rooms grid → bed tiles (occupied/free/maintenance).  
- Filters: free beds/rooms, by property, tags.  
- Components: `DataTable` + tile/canvas view; keyboard navigation; A11y labels.

### I) Approvals Hub
- New table `approvals`:
  ```sql
  id uuid pk,
  requester_tenant_id uuid not null,
  workspace_id uuid not null,
  type text check (type in ('name_change','address_change','complaint','other')),
  payload jsonb not null,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  decided_by uuid null,
  decided_at timestamptz null,
  notes text null
  ```
- Flow: create → notify → decide → audit → apply change if approved.  
- UI: `(dashboard)/approvals/` with filters, bulk actions, templates.

### J) WhatsApp Summaries
- Extend `lib/notifications.ts` to generate daily/weekly summaries of **payments & expenses**.  
- Recipients: `settings.notifications.whatsapp_recipients`.  
- Cron: `api/cron/owner-summaries` at **09:30 IST** (convert to UTC in `vercel.json`).

### K) Photo Uploads (All)
- Supabase Storage buckets: `properties`, `rooms`, `tenants`, `websites`.  
- Reuse `PhotoGallery`; ensure correct `Content-Type`, CORS, **signed URLs**, expiry, thumbnails.  
- Update public PG websites to render galleries.

### L) Billing UI & Logic
- Multi‑select charge types → merge into single `bills.line_items`.  
- Default bill date: **check‑in day**; **month = current**.  
- Continuity: add `previous_bill_id` to link chain; enforce **no gaps**.  
- Zero usage with assignment → create ₹0 bill + auto payment (`auto_settled=true`).  
- Enforce workflow: payments **must** reference a `bill_id` (UI + server + RLS).

### M) Food Options
- Settings: `settings.features.food.enabled`.  
- Meal toggles: `breakfast|lunch|dinner|snacks`; show only enabled meals in Tenant UI.  
- Charges created per selection period.

### N) Dropdown Search Everywhere
- Replace selects with shadcn **Combobox** + search; keyboard accessible; virtualize large lists.

### O) Session Timeout
- Configurable inactivity timeout (e.g., 15/30/60 mins).  
- On timeout: soft warning dialog → auto‑logout; audit event.

### P) Room Capacity Bug
- Validate `rooms.capacity` vs active occupants; fix off‑by‑one; prevent over‑assign; helpful error messages.

### Q) UX/Branding/INR/A11y/Performance
- INR via `Currency` component (₹).  
- Homepage: platform positioning; PG Manager as a product; mission/vision; features timeline.  
- Dashboard: richer metrics via `MetricsBar` & `Reports` (occupancy, AR, DSO, revenue, expenses).  
- Accessibility: color contrast, focus ring, aria labels, skip links.  
- Performance: image optimization, route‑level caching, skeletons, web vitals.

---

## 7) DATABASE & RLS CHANGES
- New migrations:
  - `015_audit_events.sql`
  - `016_platform_admins.sql`
  - `017_approvals.sql`
  - `018_billing_continuity.sql`
  - `019_verification_tokens.sql`
- Update policies to include `is_platform_admin(auth.uid())` or route privileged ops via **server actions** (service role).

---

## 8) TESTING MATRIX
- **Unit**: validators (mobile/email), billing chain, approvals state machine.  
- **Integration**: photo upload to storage, bill→payment linkage, tenant stays & room switches.  
- **E2E (Playwright)**: mobile logout visibility; combobox search; superuser payment deletion (audit logged); demo mode read‑only; WhatsApp summary cron dry‑run.

---

## 9) GIT & RELEASE HYGIENE
- Commits (Conventional):
  - `feat(audit): introduce global audit_events with RLS & server emitters`
  - `fix(ui): correct dashboard active state green selection & mobile logout z-order`
  - `feat(admin): platform_admins with SystemAdmin role & global explorer`
  - `feat(billing): multi-select charges, continuity chain, enforce bill->payment`
  - `feat(approvals): tenant request hub with policies and audit`
- PRs: one per major theme; include screenshots, schema diffs, QA checklist.  
- Update **CLAUDE.md** (Changelog & patterns) + **README** (features, pricing, branding).  
- Run `/compact` after shipping each theme.

---

## 10) EXECUTION — Start Now

### Step 1 — **PLANNING MODE** (produce first)
- Enumerate options & choose defaults for: audit architecture, superuser model (RLS vs server‑only), billing continuity, verification providers, approvals UX, property map rendering.  
- Call out risks & mitigations.  
- Task breakdown (JIRA‑style) with timeboxes.

### Step 2 — **IMPLEMENTATION** (then produce diffs)
- Apply DB migrations (015–019).  
- Implement server actions/API routes for superuser operations.  
- Fix all UI bugs; wire validation; enforce payment→bill linkage.  
- Add combobox search; property architecture 2D module; approvals hub.  
- Photo upload end‑to‑end with storage + public sites.  
- WhatsApp summaries cron endpoint + settings.  
- Session timeout logic & settings.

### Step 3 — **VALIDATION** (print logs & checklists)
- Run the Testing Matrix; show pass/fail.  
- Present regression proof for previous items.  
- Provide “Go/No‑Go” release note.

### Step 4 — **RELEASE**
- Update CLAUDE.md & README; changelog.  
- Output final PR links and deployment steps.

---

## 11) CONFIGURABLE DEFAULTS (Claude must propose, you may override)
- Inactivity timeout: **30 minutes** (suggested).  
- Superuser model: **server‑only service role** for cross‑workspace ops; RLS recognizes `is_platform_admin` for read scopes.  
- Mobile OTP provider: stub abstraction (`lib/notifications.ts`) with provider switch.  
- Disposable email blocklist: **disabled by default**; enable per workspace via `settings.security.email_blocklist_enabled`.  
- WhatsApp summaries: **weekly** on Monday 09:30 IST; **daily** optional toggle.  
- Demo mode: `DEMO_MODE=true` disables outbound notifications; masks PII.  
- Feature flags: `features.approvals`, `features.architectureView`, `features.food`, `features.whatsappSummaries`.

---

## 12) APPENDIX — Patterns to Respect
- **Supabase Join Array Pattern**: always use `Array.isArray()` when handling joins.  
- **Permission Guard Pattern**: page‑level guard via `<PermissionGuard permission="module.action"/>`.  
- **Session Refresh Pattern**: refresh on visibility/focus; use `getUser()` for server validation.  
- **RBAC**: multi‑role aggregation; least privilege mindset; export effective permissions per user in `reports/`.

---

**Begin now.**
