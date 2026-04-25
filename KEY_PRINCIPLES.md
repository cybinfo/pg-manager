# ManageKar — Core Principles

> **MANDATORY**: Every AI session, code review, feature addition, improvement, or architectural decision MUST begin by reading this document in full. No change should violate or compromise these principles. They apply to the **entire platform and every individual module** without exception.
>
> **Last Updated**: 2026-04-25

---

## The Vision

> *"Become the world's most intelligent, composable management platform — where any business that manages people, spaces, payments, and operations can be operational in minutes by assembling the right modules. Starting with India. Powered by AI."*

ManageKar is not a niche SaaS product for PG owners or library managers. It is a **universal management platform** — the operating system for any business that needs to manage anything. PG management and Library management are the first two recipes on the platform, built for our first client. They prove the architecture. Every future domain — hotels, schools, colleges, hospitals, offices, gyms, co-working spaces, retail, clinics — is a new recipe assembled from the same reusable ingredients.

**India is the first market, not the only market.** Starting deep in one market builds a stronger, more trusted, more proven product than starting everywhere at once. India is the world's largest SMB market — winning here is not a small ambition. It is the foundation for everything that follows.

**Think at this scale at all times. Never think small.**

---

## This Platform Is Designed and Built by AI

ManageKar is not built by a traditional engineering team. **The entire platform — architecture, design, code, patterns, and data model — is conceived and built by AI.** This is not a temporary arrangement. It is the permanent, intentional development model.

**Two distinct AI roles — development and product — use the best available free tool for each:**

| Role | Current Tool | Principle |
| --- | --- | --- |
| **Building the platform** | AI coding assistant (currently Claude Code) | Best available AI development tool |
| **Powering product features** | Best available free AI API (Gemini free tier, Groq, etc.) | Zero cost, best capability available |

**The division of responsibility:**

| Human (Rajat Seth) | AI (Architect + Developer + Platform Intelligence) |
| --- | --- |
| Provides vision and mission | Translates vision into architecture |
| Provides business context and client requirements | Designs the technical solution |
| Provides direction and priorities | Writes all code, patterns, and systems |
| Validates and redirects | Powers all AI features in the product |
| Makes final decisions | Thinks at platform scale, always |

**What this means for every AI session:**

Every AI agent working on this platform must approach it as a **platform architect** — not a task executor. When the human says "add an attendance feature for the library," the AI should think: "How do I build an Attendance Core Module that works for libraries today, schools tomorrow, gyms next month, and any future domain forever?" Then build that.

**What this means for the codebase:**

- Code must be written so AI can read, understand, and extend it without human explanation
- Patterns must be consistent and predictable — AI navigates by pattern recognition
- `CLAUDE.md` and `KEY_PRINCIPLES.md` are the AI's persistent memory — they must always be complete and current
- Every architectural decision must be documented in a way that allows AI to make the next decision consistently
- When something is built in a non-obvious way, the reason must be captured — not for humans, but for the next AI session

**What this means for thinking:**

AI must never answer only what was asked. It must always surface the broader opportunity. When asked to fix a bug, also identify related improvements. When asked to add a feature, also consider how it elevates the platform. When asked about one module, think about all modules. The human is steering. The AI is the engine, the navigator, and the co-architect.

> *This document exists so that every AI session — regardless of context — starts with the full intelligence, vision, and architectural intent of the platform. Read it. Own it. Build from it.*

---

## Why This Document Exists

Companies that follow their core principles consistently earn lasting market position. ManageKar is not built by accident — it is built by design, at deliberate scale, by AI. These principles are the DNA of the platform and the persistent memory of every AI session.

When in doubt, return to this document. It is always the source of truth.

> *A feature that violates a principle is not a feature — it is technical debt with a deadline.*
> *A solution that solves one problem when it could solve ten is a missed platform opportunity.*
> *An AI that only answers what was asked has not done its job.*

---

## The 7 Categories

| # | Category | Focus |
| --- | --- | --- |
| A | Vision & Market | Why we exist, who we serve, how big we think |
| B | Architecture | How the platform is structured for infinite scale |
| C | Data | How data is modeled, linked, and protected |
| D | Development | How we build — broadly, intelligently, consistently |
| E | Security & Compliance | How we protect at every layer |
| F | User Experience | How every user feels, regardless of business type |
| G | Quality & Reliability | How we sustain trust as the platform grows |

> **Note for every AI session:** You are not a tool being used on this platform. You are the architect and builder of it. Read every principle as an owner, not an assistant.

---

## A. Vision & Market

### A1. Mission First — Think World-Class, Always

> *"Become the global operating system for business management — composable for any industry, intelligent by default, and accessible to every business owner regardless of size, budget, or technical ability."*

Every decision — from architecture to UI to data model — must serve this mission. The current focus on PG and Library is a **starting point**, not a ceiling. Every line of code written today must be worthy of a platform that will one day power thousands of different business types across the world.

If a feature makes one owner's life better but cannot be extended to serve ten different business types, it was designed too narrowly. **Think platform, think broad, think world-class — always.**

### A2. India First — Deep Market Focus, Global Vision

ManageKar launches and dominates in India before expanding anywhere else. India is the **first market, not the only market**. This is a deliberate strategic sequence — not a ceiling on ambition. Winning deeply in one market creates the proven, trusted, battle-hardened platform that can then expand globally with confidence.

**India is the right first market because:**

- World's largest and fastest-growing SMB ecosystem
- Underserved by world-class management software
- Unique operating conditions (UPI, WhatsApp, GST, 4G) that, once solved, prove the platform's adaptability
- Winning here is not a small ambition — it is the foundation for everything that follows

**What India-first means in practice today:**

- **Communication**: WhatsApp-first, email. **Current: WhatsApp Web automation** (free, unofficial). Future: WhatsApp Business API as a paid add-on when scale justifies cost.
- **Payments**: UPI, cash, bank transfer, digital wallets — manually recorded by owners. No payment gateway until the platform monetizes.
- **Compliance**: GST, TDS, DPDP Act data privacy, Indian accounting and billing cycles
- **Connectivity**: Performant on 4G, resilient to intermittent internet
- **Language**: English only for now — Indian B2B owners operate comfortably in English. Multi-language support is a future consideration for global expansion.
- **Pricing**: INR-denominated, calibrated for Indian SMB budgets

**What India-first means for focus:** Every current engineering decision, product default, and architectural trade-off is optimised for India. No effort is diverted to accommodate other markets today. When global expansion begins, the architecture is already ready — composable modules, multi-language-ready codebase, and a proven platform are the foundation.

### A3. Disciplined Expansion — DACB Order

Platform expansion follows a deliberate four-phase sequence — **Validate → Respond → Multiply → Lead**:

- **D (Validate first)**: Reach 10+ active clients on PG + Library before any new domain. Harden Core Modules through real usage at scale.
- **A (Respond to demand)**: The next domain is built when a real client needs it — never speculatively. Client demand validates, funds, and tests every new domain.
- **C (Multiply simultaneously)**: Once 2–3 domains are proven, build multiple new domains at the same time. By this phase, Core Modules are fully battle-tested and new domains are largely configuration.
- **B (Lead strategically)**: With market data and a proven platform, proactively target high-value verticals. This is the scale phase.

This sequence ensures the platform is never overextended, always grounded in real demand, and compounds in value with every client and every domain added.

### A4. Granular Feature Economy — Pay Only for What You Use

ManageKar does not sell plans with bundled features customers didn't ask for. It sells **exactly what each customer needs** — nothing more, nothing less. Every module, every feature, and every usage limit is independently controllable by the customer from a single self-service Control Center.

#### The Three-Tier Granularity

```text
Domain Module      → PG Manager, Library Manager, School Manager, Hotel Manager ...
    Core Module    → Payment, Attendance, Visitor, Complaint, Electricity, Notices ...
        Feature    → PDF Invoice, WhatsApp Notification, Bulk Export, Advanced Reports ...
```

Each tier is independently enable/disable-able. A customer can have the Payment Core Module enabled but PDF Invoice feature disabled. They pay only for what is on.

#### The Three Monetization Levers

| Lever | Example |
| --- | --- |
| **Enable / Disable** | Turn a module or feature on or off — pay only when on |
| **Usage limits** | 100 payments/month free → unlimited paid |
| **Capacity limits** | 50 members free → unlimited paid |

#### The Feature Control Center

Every workspace has a self-service **Feature Control Center** — a dedicated, beautiful dashboard showing:

- All Domain Modules (on/off, cost)
- All Core Modules per domain (on/off, cost)
- All Features per module (on/off, usage meter, cost)
- Live bill breakdown — exactly what they're paying for and why
- Usage meters with visual progress — 80% of limit triggers a contextual upgrade prompt
- Module and feature dependency graph — what requires what

Customers configure their own platform. They are never locked into a bundle they don't need.

#### AI-Driven Discovery and Upsell

- When a customer hits **80% of any usage limit**, AI proactively suggests upgrading that specific feature — not the entire plan. Surgical, relevant, never pushy.
- When a customer's usage pattern suggests an unused feature would help them, AI surfaces it contextually: *"You're manually exporting attendance data. The Bulk Export feature automates this — enable it free for 30 days."*
- AI monitors which disabled features are adjacent to the customer's current usage and times discovery suggestions for maximum relevance.

#### Feature Bundles — Quick Start for New Customers

Pre-curated bundles let customers who prefer simplicity get started instantly:

- **PG Starter** — Rooms + Tenants + Basic Billing + Visitor Log
- **Library Pro** — Members + Attendance + Subscriptions + Locker Management
- **School Essential** — Students + Attendance + Fees + Notices

Bundles are starting points, not cages. Customers can add or remove any feature after activation.

#### Module Dependency Rules

Features respect their parent hierarchy — the system enforces dependencies automatically:

- PDF Invoice requires Payment Core Module
- Bulk Attendance Export requires Attendance Core Module
- WhatsApp Notifications requires Notifications Core Module
- Advanced Reports requires the relevant domain's data modules

Customers are guided through dependencies — never blocked without explanation.

#### The Freemium Entry Point

```text
Trial Phase (current — validation in progress):
  - All features enabled
  - Usage limits apply — but extendable for free on request
  - Exact limit numbers TBD — defined once real client usage data is collected
  - No payment required during this phase

Free Tier (future — defined post-validation):
  - Limits based on real usage data from the trial phase
  - Core features available; advanced features gated

Paid (future):
  - Per-feature or per-module pricing in INR
  - Usage-based top-ups beyond free limits
  - Pre-curated bundles at Pro ₹499/month and Business ₹999/month
  - Enterprise: custom modules, custom limits, dedicated support
```

**The free tier is not a crippled demo.** It is a real, working product for small operations. Customers graduate to paid naturally — when their business grows, the platform grows with them. The exact shape of free vs paid will be defined by real data, not by guessing.

### A5. Freemium — Accessible to Every Business

The pricing model is an extension of A4. Every feature has a free entry point, and every upgrade is earned through demonstrated value — never forced. Features must be gracefully gated — informative upgrade prompts at the point of relevance, never abrupt blocks, never dark patterns.

#### Pricing Architecture — Hybrid (Base Plan + Module Add-Ons)

Pricing combines a **predictable base plan** with **granular module and usage add-ons**. The base plan unlocks the platform; add-ons unlock more capability on top.

| Tier | What it includes | Price |
| --- | --- | --- |
| **Free** | 1 Domain Module, core limits (50 members, 100 payments/month) | ₹0 |
| **Pro** | 1 Domain Module, higher limits, advanced features | ₹499/month |
| **Business** | Multiple Domain Modules, highest limits, priority support | ₹999/month |
| **Enterprise** | Unlimited modules, custom limits, white-label, SLA | Custom |

**On top of any plan:**

- Additional Domain Modules — enable a second domain (e.g., Library on top of PG) for an add-on fee
- Usage limit increases — need more than the plan limit? Purchase the increment, not a full upgrade
- Feature add-ons — specific advanced features (e.g., WhatsApp Business API, custom reports) available as individual purchases

**The result:** A small PG owner on Free never pays for Library features they do not use. A large operator running PG + Library + Hostel pays only for what they have enabled and used. No customer ever pays for a bundle that does not fit their business.

**Subscription billing is deferred.** All workspaces operate on the Free tier until the platform has validated 10+ active clients (Phase D of A3). Paid plan infrastructure — how ManageKar collects Pro/Business fees from workspace owners — will be designed and built when the first real upgrade request arrives. Building payment collection before anyone wants to pay is premature. Solve it when it is a real problem.

#### Trial Period & Limit Extension Policy

**During the current validation phase:**

- **All features are enabled** — clients experience the complete platform, nothing hidden
- **Usage limits apply** — but the exact numbers are TBD, defined once real usage data is collected
- **Limits are extendable for free** — when a client hits a limit, they contact Rajat, who extends it at no cost
- **No client is cut off** — the trial extends indefinitely until the platform is stable, tested, and ready for monetization

**When a client hits a limit:**

1. The platform blocks the action and shows a clear prompt to contact Rajat
2. The client contacts Rajat directly (WhatsApp or email)
3. Rajat manually extends the specific limit for free — recorded in the platform admin panel

**Why enforce limits at all if extending for free?** Limits train clients to understand value, reveal which features matter most, generate real usage data for defining future tiers, and create natural monetization conversations when billing goes live. A client who has hit their limit and been helped is a client ready to pay.

**The free vs paid model is defined by data, not by guessing.** The validation phase exists precisely to learn what real clients actually use. That data defines the final tier structure — not assumptions made today.

#### Staff Limits

Staff member counts are capped per plan tier — included in the paid model when billing goes live. Until then, a reasonable free-tier staff limit applies (exact number TBD based on real client usage during validation phase). Staff limits follow the same manual extension process as all other limits.

### A6. White-Label First — Customer Branding Over Platform Branding

ManageKar is **fully white-labelable**. Any customer can present the platform under their own brand — their logo, their domain, their colors, their name. The platform's job is to make the customer's business look world-class, not to market ManageKar.

**What white-labeling covers:**

- Custom domain — `app.theirbusiness.com` instead of `managekar.com`
- Custom logo and brand colors across the entire interface
- Custom email templates — receipts, welcome messages, notifications all carry their brand
- Self-service portals (tenant, member, student) appear as the customer's own product
- "Powered by ManageKar" is optional — never forced

**Why this matters:**

A PG owner who shows tenants a portal branded "Sharma PG Management" builds more trust than one showing a third-party tool. A school that sends fee receipts under their own letterhead looks more professional. White-labeling lets every customer on this platform punch above their weight — they look like they built it themselves.

This is customer success by design. When the customer looks good, ManageKar wins.

**White-labeling is free for all tiers — including the Free tier.** It is never a paid upgrade. A small PG owner on Free gets the same custom branding capability as an Enterprise client. Withholding branding to force an upgrade would undermine the entire white-label-first philosophy — and it would make every customer-facing interaction feel like a third-party tool. That is unacceptable at any tier.

### A7. Free by Principle — Zero Development Cost, Fully Proprietary

ManageKar is **developed by the founder at zero cost** — no paid subscriptions, paid tools, or paid third-party services are used to build or operate the platform. Free-tier services, open-source tools, and self-hosted solutions are the default at every layer.

This is not a budget constraint — it is a deliberate philosophy that keeps the platform independent, lean, and sustainable regardless of revenue stage.

**"Free by Principle" does not mean open source.** The platform is and will always remain **fully proprietary**:

- The codebase is private — never open sourced, partially or fully
- No community edition, no public repository, no source-available licensing
- The IP is the business — it is protected permanently

The distinction is clear: ManageKar *uses* open source tools to build the platform. It does not *become* one.

**What "zero cost" means in practice — current decisions:**

| Feature | Decision | Reason |
| --- | --- | --- |
| Payment processing | Manual recording only — no gateway | Every gateway charges per-transaction fees |
| WhatsApp messaging | Web automation (unofficial, free) | WhatsApp Business API charges per message |
| Email | Free tier (Resend/SMTP) | Paid tiers deferred until monetization |
| SMS | Not implemented yet | Every SMS provider charges per message |
| AI (product features) | Best available free API — Gemini free tier, Groq | Paid AI APIs deferred until monetization; free alternatives used now |
| AI (development) | AI coding assistant — current tool in use | Not a permanent paid subscription |
| Data export | No self-service export — data stays in platform | Keeps implementation simple; deferred until clients ask |
| External integrations | No integrations — platform is self-contained | CSV export is the only bridge. Tally, GST portal, webhooks deferred until real client demand |

**The rule:** If a feature requires paying a third party — even one rupee — it is either deferred, replaced with a free alternative, or made a paid customer add-on. No exceptions until the platform generates revenue.

> This principle applies to the **builder**, not the customer. Customers follow the freemium model (A4 + A5).

#### Infrastructure Usage Monitoring — Never Hit a Limit by Surprise

Free-tier infrastructure has hard limits. Hitting them unexpectedly breaks the platform for every client simultaneously. This is unacceptable.

| Service | Key Free Limit | Monitor |
| --- | --- | --- |
| **Supabase** | 500MB database, 1GB storage, 50K MAU | Weekly check via Supabase dashboard |
| **Vercel** | 100GB bandwidth, build minute limits | Monthly check via Vercel dashboard |
| **Resend** | 3,000 emails/month on free tier | Weekly check — high-volume alerts |
| **AI APIs** | Rate limits per minute/day | Monitored per request (graceful degradation on hit) |

**At 70% of any infrastructure limit:** Rajat is alerted and evaluates whether to upgrade the service tier, optimise usage, or migrate to an alternative free option.

**At 90%:** Immediate action — the platform cannot afford a surprise outage caused by an infrastructure limit. Upgrade or migrate before hitting 100%.

---

## B. Architecture

### B1. Multi-Tier Hierarchy — Universal Across All Domains

Every entity, permission, and data access decision on the platform flows through a single, universal hierarchy:

```text
Platform Admin
    └── Workspace (Business Owner)
            ├── Domain Module (PG / Library / Hotel / School / Gym / ...)
            │       ├── Operational Unit (Property / Library / Campus / Branch)
            │       │       ├── Staff (with role-based permissions)
            │       │       └── End User (Tenant / Member / Student / Guest / ...)
            │       └── Active Core Modules (People, Payment, Attendance, ...)
            └── Shared Foundation (People, Payments, Complaints — cross-domain)
```

This hierarchy is universal — it works for PG today and for a hospital tomorrow without structural change. Access, permissions, data visibility, and business logic all flow downward. Nothing bypasses it. An owner with both a PG and a Library sees unified data at the workspace level but clean isolation at the domain level.

#### Multi-Workspace — One Owner, Multiple Independent Businesses

A single owner account can create and manage **multiple workspaces**. Each workspace is a fully independent business entity with its own data, staff, billing, and configuration.

**When to use multiple modules in one workspace:**
Same owner, same premises, shared staff — a PG and a Library in the same building. One workspace, both modules enabled. Staff and data are shared where it makes sense.

**When to use multiple workspaces:**
Genuinely separate businesses — a PG in Mumbai and a Library in Pune, different staff, different billing, operationally unrelated. Two workspaces. The owner switches between them from a single login.

**The rule:** If two businesses share staff and operations, use one workspace with multiple modules. If they are independent, use separate workspaces. The owner decides — the platform supports both without any architectural change.

### B2. Composable Module Platform — Core + Domain

ManageKar is a **platform of composable modules**, not a monolithic application. This is the most important architectural principle on the platform.

**Core Modules** are domain-agnostic, standalone capabilities built once and reused everywhere. They are the ingredients:

```text
People · Payment · Attendance · Visitor · Complaint · Electricity · Notices
Documents · Locker · Seat · Room/Bed · Inventory · Schedule · Reports
Audit · Notifications · Staff · Roles · Analytics · ...
```

**Domain Modules** are curated compositions of Core Modules, configured for a specific business type. They are the recipes:

```text
PG Manager       = People + Room/Bed + Payment + Visitor + Complaint + Electricity + Notices
Library Manager  = People + Seat + Locker + Payment + Attendance + Complaint + Notices
Hotel Manager    = People + Room/Bed + Payment + Visitor + Complaint + Electricity + Schedule
School Manager   = People + Attendance + Payment + Schedule + Visitor + Complaint + Notices
Gym Manager      = People + Locker + Payment + Attendance + Notices
Co-Working       = People + Seat + Payment + Visitor + Complaint + Notices
Hospital (OPD)   = People + Attendance + Payment + Schedule + Visitor + Complaint + Documents
[Any Future Domain] = People + [relevant Core Modules]
```

**Non-negotiable rules:**

- Every new capability is built as a **Core Module first** — standalone, reusable, domain-agnostic
- Domain Modules are **recipes**, not rebuilds — they compose, never duplicate
- Core Modules are **context-blind** — Attendance does not know if it serves a Library or a School; the Domain provides the context
- A workspace activates only the modules it needs — an owner never sees irrelevant screens
- An owner with multiple business types (PG + Library) shares People, Payment, and Complaint seamlessly across both

> **The compounding return:** The 10th Domain Module costs 10% of the 1st to build — because 90% of the ingredients already exist. Every Core Module built today is an investment that pays dividends across every future domain forever.

#### Reports — A Dedicated Core Module with Three Tiers

Reporting is a **horizontal Core Module** — every Domain Module (PG, Library, Hotel, School) feeds data into the same Reports engine. It is never built domain-by-domain. Every domain gets the same three tiers of reporting power:

| Tier | What it delivers | Who it serves |
| --- | --- | --- |
| **Standard reports** | Curated, one-click templates per domain — PG revenue, library attendance, occupancy, payment summary | All users — instant value with zero configuration |
| **Custom report builder** | Choose columns, apply filters, group by any dimension, set date ranges, export CSV | Power users — full flexibility without code |
| **AI insights** | AI analyses workspace data and proactively surfaces patterns — "Occupancy dropped 20% this month — here are the likely reasons" | Every user — intelligence delivered without asking |

The Reports Core Module is domain-context-aware but domain-agnostic in implementation. A PG owner sees PG-relevant templates; a library owner sees library templates — same engine, different data.

### B3. Service Layer Owns Business Logic

Business logic lives exclusively in the **service layer** — never in components, pages, or API routes:

```text
Component  → renders UI, nothing else
Page       → coordinates data and state, no decisions
API Route  → validates input, authorizes, then delegates immediately
Service    → owns all business decisions and rules
Workflow   → orchestrates multi-step, multi-service operations
```

Every service returns a `ServiceResult<T>` — a consistent contract of success, failure, error code, and message. This makes logic testable, reusable across all Domain Modules, and independently auditable.

### B4. API-First & Event-Driven Integration

Modules communicate through **contracts and events** — never through direct internal coupling:

- Every Core Module exposes a versioned interface: inputs, outputs, error codes, and emitted events
- Modules integrate via events: `payment.recorded` → membership activates; `member.checked_in` → hours logged; `complaint.resolved` → notification sent
- Breaking changes to a module interface require a version increment — never a silent change
- Real-time propagation uses Supabase subscriptions — no polling
- Any future module integrates with any existing module by consuming its events — zero internal access

This is what makes the platform infinitely extensible: new modules plug in without touching existing ones.

---

## C. Data Principles

### C1. Centralize Before Building New

Before creating anything — a component, a utility, a config, a query, an abstraction — **check if it already exists**. Extend and unify before adding. The cost of a new pattern is paid in perpetuity by every developer who must learn it, every AI that must discover it, and every future module that must replicate it.

New abstractions earn their place. They do not get it by default.

### C2. People Module — Universal Identity Layer

The `people` table is the **single source of truth** for every human identity on the platform — tenants, library members, students, hotel guests, gym members, staff, anyone. It is the one module that every Domain Module shares without exception.

- Name, phone, email, photo, ID documents, emergency contacts — all live in `people`
- Every domain entity links via `person_id` — never stores its own identity copy as primary
- Denormalized fields exist only as display fallbacks, never as authoritative data
- All writes to identity fields go to `people` first
- All reads use the fallback pattern: `entity.person?.name || entity.name`

As the platform expands to new domains, the People module grows richer — and every domain benefits instantly.

### C3. Linked Data Model — Everything Is Traceable

Nothing on this platform exists in isolation. Every entity is linked upward through the full hierarchy and outward to related entities:

- A payment links to a person, a membership or bill, a workspace, and a domain module
- An attendance record links to a person, a session, a seat, a library, and a workspace
- A complaint links to a person, a unit (room/seat), a domain, and a workspace

**Every entity must be fully traceable from any direction.** This enables: 360° views of any person or entity, cross-module reporting, complete audit trails, and the ability to answer any business question from data alone — without relying on institutional memory.

### C4. No Duplication — DRY Is Non-Negotiable

If logic, configuration, or data exists in one place, it must not exist in another — anywhere on the platform.

Shared hooks, reusable components, centralized utilities, metric factories, column builders, filter presets, option lists, status labels — all centralized. No inline arrays, no scattered constants, no per-module reimplementations of common patterns.

Duplication is technical debt that compounds exponentially as the platform grows. It is never acceptable as a shortcut.

### C5. Privacy by Design — Globally Compliant

Every person's data on the platform is handled with the highest standard of care:

- **Minimum collection**: Only data necessary for the business purpose is collected
- **Strict isolation**: Data never crosses workspace boundaries — RLS enforces this at the database level
- **Right to erasure**: Soft delete retains for 90 days, then permanently purges
- **Audit of access**: Who viewed or modified personal data is recorded
- **Sensitive field sanitization**: Passwords, tokens, and PII are stripped from all logs
- **Indian compliance**: DPDP Act aligned — consent management, data export, and residency planned
- **Global extensibility**: No India-specific privacy decision should permanently block GDPR compliance when global expansion begins. GDPR is not being built now — but nothing being built today should make it impossible later. Consent management, data isolation, and right-to-erasure patterns already align across both frameworks.

### C6. File Storage — Hard Limits with Automatic Optimisation

Every workspace has a **hard storage limit** for uploaded files (photos, ID documents, receipts). Storage is never unlimited — it is a capped resource tied to the plan tier.

**Automatic file optimisation is mandatory on every upload — no raw file is ever stored as-is:**

| File type | Optimisation applied |
| --- | --- |
| **Profile photos** | Auto-compressed + smart-cropped to a square, max 200KB. Pixel quality preserved — only file size reduced. |
| **ID documents** | Auto-compressed to max 500KB. Readable quality maintained. |
| **Receipt images** | Auto-compressed to max 300KB. |
| **Any image upload** | Resized to the maximum display dimension needed — never stored larger than it will ever be displayed. |

**Why compress and crop:** Mobile uploads from Indian phones are often 3–8MB. Storing raw files burns storage quota fast and slows page loads. Auto-optimisation is invisible to the user and keeps the platform fast and lean.

**Storage limit enforcement:** When a workspace approaches its storage limit, the Feature Control Center shows a warning at 80%. At 100%, new uploads are blocked and the owner is prompted to contact Rajat for an extension (same manual extension process as all other limits).

---

## D. Development Standards

### D1. 100% Feature Parity — No Module Is Second-Class

Every list page, detail page, and form across every module ships with the same complete feature set. No module gets a degraded experience. No "v1 without filters." The standard is absolute:

| Feature | Required |
| --- | --- |
| Advanced filter builder | Every list page |
| Inline edit | Every list page (except immutable audit logs) |
| Column manager with persistence | Every list page |
| Group by options (minimum 3) | Every list page |
| CSV export | Every list page |
| Metric cards (using factories) | Every list page |
| PermissionGuard | Every page and form |
| FeatureGuard | Every feature-flagged module |
| Breadcrumbs | Every detail page |
| Not Found UI | Every detail page |

A module that ships without any of these is not a v1. It is incomplete.

### D2. Automation by Default

Manual, repetitive work is a failure of system design. Every task that a user has to perform more than once — billing cycles, membership expiry, status transitions, notifications, report generation, attendance summaries — must be automated.

Automation is not an enhancement layer added later. It is a requirement that is designed in from the start. If a user has to manually trigger something the system could predict and execute, the system has underserved them.

#### Platform-to-Owner Communication — Automated, Two-Channel

When Rajat needs to reach all workspace owners (new feature announcement, maintenance notice, critical bug fix, policy update) — one action triggers two channels automatically:

| Channel | What gets sent | When owners see it |
| --- | --- | --- |
| **In-app announcement** | Banner or notification inside the dashboard | Next time they log in |
| **Email** | Formatted announcement to all registered owner emails | Immediately |

Rajat writes the announcement once. The platform distributes it automatically to both channels simultaneously. No manual emailing, no individual WhatsApp messages.

**Why in-app + email:** In-app catches owners who are active. Email catches owners who haven't logged in recently. Together they guarantee every owner sees critical communications regardless of their login pattern.

### D3. AI-Powered Intelligence — Best Available Free Model

**AI powers every intelligence feature on this platform — using the best available free API at each point in time.** AI is never paid for. If a capability requires a paid API, it is deferred until the platform has revenue to fund it.

**Current free options (use whichever has the best free tier at build time):**

| Provider | Free Tier | Best For |
| --- | --- | --- |
| Google Gemini API | 15 RPM, 1M tokens/day (Gemini Flash) | General intelligence, insights, generation |
| Groq | Fast inference, generous free limits | Real-time conversational features |
| Hugging Face | Free inference for many models | Specialised tasks |

AI must be applied at every layer where it adds genuine value:

- **Predictive**: Anticipate churn, flag payment risk, forecast occupancy, detect anomalies before they become problems
- **Generative**: Draft notices, complaint responses, welcome messages, payment reminders — in the owner's voice
- **Analytical**: Surface cross-module insights — revenue trends, attendance patterns, complaint clusters, occupancy forecasts
- **Conversational**: Natural language queries — *"Who hasn't paid this month?"* *"Which seats are expiring this week?"*
- **Workflow intelligence**: Suggest next actions, flag anomalies, auto-route approvals, recommend follow-ups
- **Operational**: Auto-categorize complaints, detect meter anomalies, identify at-risk members
- **Discovery**: Proactively surface unused features, suggest module upgrades, personalise the platform over time

The platform thinks **ahead** of the user — not just reacts. Every new module defines its AI-powered capabilities at design time. AI is never retrofitted. When the platform monetizes, upgrade to the best paid model at that time.

#### AI Graceful Degradation — Core Workflows Never Depend on AI

AI features are **enhancements, not dependencies.** Every free AI API has rate limits, quotas, and can go down. The platform must never break because an AI API is unavailable.

**The rule:** Every AI-powered feature must have a non-AI fallback. The core workflow completes with or without AI — AI makes it better, not possible.

| AI Feature | If AI is unavailable |
| --- | --- |
| AI-generated complaint response draft | Show empty text field — owner writes manually |
| AI insights on dashboard | Hide the insights card — dashboard still loads |
| AI support chatbot | Show "Contact support via WhatsApp" — human fallback |
| AI occupancy forecast | Hide the forecast widget — data tables still show |
| AI usage suggestions | Skip the suggestion — feature works normally |

**Implementation rule:** Every AI API call is wrapped in a try/catch with a defined fallback. A failed AI call logs a warning (G1) but never throws an error the user sees. Rate limit hits trigger the fallback silently — the user experiences a slightly less intelligent interface, not a broken one.

### D4. AI-Led Development — Every Session Is an Architect Session

This platform is **designed, built, and evolved entirely by AI**. Every AI session working on this codebase is not executing tasks — it is acting as the platform's architect, co-designer, and primary engineer.

**The AI's role in every session:**

- Read `KEY_PRINCIPLES.md` and `CLAUDE.md` before touching a single file — these are the AI's memory
- Approach every request as a platform architect: consider the full system, not just the immediate task
- Proactively surface improvements, architectural opportunities, and cross-module enhancements — even when not asked
- When asked to build for one module, design for all modules
- When asked to fix one bug, identify related issues in the same pattern across the codebase
- When asked for a simple solution, deliver the most architecturally sound one

**The AI's responsibility to the codebase:**

- Write code that the next AI session can read, understand, and extend without explanation
- Keep patterns consistent and predictable — future AI sessions navigate by recognition
- Document non-obvious decisions with the reason, not just the what
- Update `CLAUDE.md` and memory when something architecturally significant is learned or changed
- Never leave the codebase in a state that requires human knowledge to understand

**The compounding effect:** Each AI session that leaves the codebase better — more consistent, better documented, more aligned with these principles — makes every future AI session more powerful. The platform gets smarter with every session. This is the flywheel.

> *You are not here to complete a task. You are here to advance a world-class platform. Act accordingly.*

### D5. Broad Impact Thinking — Build for the Platform, Not the Feature

This is the principle that separates a collection of features from a world-class platform.

**Every problem solved for one module is an opportunity to build something that serves the entire platform.** Before implementing any solution, every developer and every AI agent must ask:

- **"Can this be a Core Module?"** — If the solution addresses a need that exists in multiple business types (attendance, payments, scheduling, notifications), build it as a universal Core Module — not a domain-specific feature
- **"What is the most universal version of this solution?"** — Do not solve the narrowest version of the problem. Solve the broadest version and configure it down for each domain
- **"Does this design port to other domains?"** — A room booking flow in PG should directly inform a seat booking in Library, which should inform a desk booking in Co-Working — same Core Module, different configuration
- **"How does this interact with other modules?"** — Every feature should declare what events it emits and what events it consumes — its place in the broader platform ecosystem
- **"If 10 different business types used this, what would need to change?"** — If the answer is "nothing," it is a great Core Module. If the answer is "everything," it was built too narrowly

**For AI agents specifically:** When reviewing, improving, or building any feature, evaluate the solution at platform scale. A suggestion that fixes a problem for PG Manager while ignoring its applicability to Library, School, or Hotel is an incomplete suggestion. Always surface the broader opportunity.

> *A narrow solution fixes one problem. A broad solution builds the platform. Always choose broad.*

### D6. Unified System — One Platform, Zero Seams

The platform presents a single, coherent experience across every Domain Module. A business owner switching from PG Manager to Library Manager feels they are in one world, not two products.

- Unified identity and navigation
- Unified component library and design language
- Unified permission model and feature flag system
- Unified audit trail across all domains
- Unified People module — one person record, visible across all domains they appear in

A new Domain Module must feel like it was always part of the platform. If it feels bolted on, the integration is incomplete.

### D7. Mobile & PWA First — Resilient on Poor Connectivity

Indian business owners and staff are predominantly mobile users on 4G networks that are fast but intermittent. The platform is a **Progressive Web App (PWA)** — installable on the home screen, fast on weak signal, and resilient when connectivity drops.

**Full offline mode is not the goal.** Resilience on poor connectivity is. The platform must never lose a user's work because of a bad signal.

- **Fully responsive** — Every page works flawlessly on mobile. No horizontal scroll, no tiny tap targets, no desktop-only features
- **Performance first** — First Contentful Paint under 2 seconds on 4G. Pages feel instant through aggressive caching
- **Optimistic UI** — Actions (record payment, check attendance, log visitor) appear immediate. They sync in the background — the user never waits for a server response
- **Graceful degradation** — If connectivity drops mid-session, in-progress work is preserved and queued. Nothing is lost, nothing breaks silently
- **Aggressive caching** — Recently visited pages load from cache instantly on weak signal. Stale data is shown with a clear "last updated" indicator
- **PWA installed experience** — Installable from the browser, home screen icon, app-like launch — no app store required
- **Self-service portals mobile-first** — Tenants, members, and students access from smartphones. Their portal is designed for mobile before desktop

**PWA is the permanent mobile strategy — not a compromise.** A native iOS/Android app will never be built. The reasons go beyond cost:

- One codebase serves web and mobile together — no divergence, no duplicate effort
- Updates ship instantly — no app store review cycle delaying releases by days
- ManageKar is a management tool, not a consumer app — store discoverability is irrelevant
- Android PWA is near-native in experience; iOS PWA push notifications work from iOS 16.4+
- The $25 Play Store fee and $99/year Apple Developer fee are not the deciding factor — the architectural simplicity is

Any session that suggests building a native app is in violation of this principle.

---

## E. Security & Compliance

### E1. Secure by Design — Structural, Not Surface

Security is enforced at every layer of the stack simultaneously:

- **Database**: Row Level Security on every table — data isolation at the lowest possible level
- **API**: CSRF protection, rate limiting, input validation, and security headers on every route
- **Application**: Permission checks at component, API route, and database levels — all three, always
- **Transport**: HTTPS enforced, HSTS, secure cookies, no sensitive data in URLs
- **Logging**: Passwords, tokens, and PII sanitized from every log entry

Security is not a feature. It is the ground the platform stands on.

**Two-Factor Authentication (2FA) is enforced for all users — owners, staff, and end customers.** No exceptions.

- **Method**: Email OTP — a 6-digit code sent to the user's registered email on every login
- **Implementation**: Supabase Auth built-in OTP — zero additional cost, zero third-party dependency
- **Scope**: Every account type. A tenant checking their bill and an owner managing ₹50,000/month receive the same login protection.
- **Why email OTP over SMS**: SMS OTP costs money per message. Email OTP is free, already set up, and sufficient for this trust level.

2FA cannot be disabled by workspace owners for their staff or end customers. It is a platform-level security guarantee, not a configurable option.

**Session duration: 24 hours for all users.** Every session expires after 24 hours regardless of activity. Users log in once per day — consistent with the daily-use nature of a management platform and compatible with enforced 2FA. No "remember me for 30 days" option. Short sessions limit the damage window if a device is lost or a session is stolen.

### E2. Permission Guard Everything

Every page, every form, every action, every button that triggers a write is guarded. The three-layer permission check is non-negotiable:

```text
FeatureGuard     → Is this module enabled for this workspace?
    PermissionGuard  → Does this user have this specific permission?
        RLS Policy       → Does this row belong to this workspace?
```

There are no exceptions. A UI that shows a button a user cannot execute has failed its user. A UI that shows data a user should not see has failed its security obligation.

#### Permission Model — Group-Based Access Control (GBAC)

Staff permissions are managed through Groups, not individual assignments. This is the permission model at every layer of the platform:

| Layer | What it does |
| --- | --- |
| **Groups** | Named permission sets — predefined by the platform, customisable by the owner, or created from scratch |
| **Multi-group membership** | A staff member can belong to multiple groups simultaneously. Effective permissions = union of all group memberships |
| **Individual deny override** | An owner can explicitly block a specific permission for one specific user, regardless of their group memberships. Deny always overrides grant. |

**Predefined groups** ship with every workspace: Owner, Manager, Receptionist, Accountant. Each has a sensible default permission set. Owners can edit these defaults.

**Custom groups** can be created by the owner at any time — name them, assign any combination of permissions, add staff. A staff member needing cross-role access is added to a second group rather than granting exceptions inline.

**How to resolve edge cases:**

- Receptionist needs one extra permission → add them to a second group that has that permission
- Receptionist should NOT have a permission their group normally grants → use individual deny override
- Entirely new staff role → create a new custom group

This model is clean, auditable, and scales to any business type. Every permission decision traces to a group — never to an untracked individual override.

### E3. Accountability by Default

Nothing on this platform changes silently. Every mutation is attributed, timestamped, and recorded:

- Every insert carries `created_by` via `withCreatedBy()`
- Every table has a universal audit trigger — changes are logged automatically
- Every status transition records the actor, timestamp, previous state, and new state
- The audit log is immutable — never soft-deleted, never amended
- **Audit logs are retained for 1 year** — covers any dispute, complaint, or compliance lookback an Indian SMB would face. Logs older than 1 year are purged automatically.

**Who did what, when, and why must always be answerable from the data alone** — across every domain, for every business type, for the past 12 months.

### E4. Soft Delete — 90-Day Retention, Never Hard Delete

Hard deletes are never used on auditable tables. Period.

- Deletions set `deleted_at` and `deleted_by` — the record is hidden, not destroyed
- All deleted records are retained for **90 days** before permanent purge
- Cascade soft delete automatically propagates to all child entities
- Restore is available within the 90-day window
- The audit trail persists even after the retention window expires

This applies universally — PG, Library, School, Hotel, and every future domain.

---

## F. User Experience

### F1. Next-Level UI — World-Class, Not Generic

ManageKar looks and feels like a world-class product — not generic SaaS, not a dashboard template, not a "good enough for SMBs" interface.

- Brand design system: teal/amber gradient, centralized in `design-tokens.ts` — never deviated from
- Every component, spacing, color, and transition is intentional and deliberate
- Empty states, loading states, and error states are fully designed — never bare spinners or raw text
- The UI must signal to every business owner who opens it: "this was built for you, at the highest standard"

As new Domain Modules are added, they inherit the full design system automatically. There is no "new module aesthetic" — there is only the ManageKar aesthetic.

### F2. Simplicity Over Complexity — Zero Training Required

No user of this platform — owner, staff, student, or tenant — should ever need training to complete a core task. If they do, the UI has failed them.

- Progressive disclosure: advanced options appear only when needed
- Smart defaults: pre-fill what can be inferred, minimize required input
- Contextual guidance at the point of decision — not in a separate help center
- Error messages tell the user what to do, not just what went wrong
- One obvious primary action per screen — the right next step is never ambiguous

Complexity belongs inside the system, invisible to the user. Simplicity is what every user experiences, regardless of which Domain Module they are using.

**Onboarding is fully self-serve.** A new owner registers, sets up their workspace, adds their properties and members, and is operational — without any involvement from Rajat or a support agent. The platform guides them through every step. If a new owner cannot get fully operational without human help, the onboarding flow has failed and must be fixed. This scales infinitely and is non-negotiable.

### F3. Customer Experience First — End Users Are First-Class

The end customer — tenant, library member, hotel guest, student, gym member — is a first-class user of the platform. They have their own self-service portal:

- View their bills, payments, attendance, subscriptions, and complaints
- Raise complaints and track resolution in real time
- Update their own profile, emergency contacts, and documents
- Download receipts, statements, and certificates

They should never need to call the owner for information they can access themselves. Every owner-facing feature has a corresponding customer-facing touchpoint. Reducing friction for the end customer reduces the operational burden on the owner — both win every time.

#### Self-Registration — Invite-Only, Automated, Secure

End customers (tenants, members, students) can register themselves — the owner never types their details. But registration is **invite-only**, not open public signup:

1. Owner generates an invite link or QR code from the dashboard (one click)
2. Customer receives the link (via WhatsApp, email, or printed QR at the premises)
3. Customer fills their own profile — name, phone, photo, ID proof, emergency contact
4. Owner reviews and approves before the account activates

**Why invite-only:** An open registration URL would allow anyone to create an account in any workspace. Invite-only scopes the link to a specific workspace, expires it in 48 hours, and keeps the owner in control of who joins.

**Automation principle met:** The owner sends one link. The customer does all the data entry. The owner approves. Zero manual data typing by staff.
**Security principle met:** No one joins a workspace without an invitation and owner approval.

#### Support Model — AI First, Human When Needed

Customer support follows a tiered escalation model:

```text
Tier 1 — AI-powered in-app chatbot
    Instant, 24/7, free. Answers how-to questions, explains features,
    guides through workflows, resolves common issues automatically.
    Powered by the best available free AI API (D3).

Tier 2 — Human support via WhatsApp or email
    Triggered when the AI cannot resolve the issue. Response within
    business hours. Used for billing disputes, account issues,
    data problems, or anything requiring human judgement.
```

**Why this model:**

- AI handles the majority of support requests instantly — no waiting, no cost
- Human support is reserved for genuinely complex situations — effort is never wasted on routine questions
- WhatsApp is the natural escalation channel for Indian users — familiar, fast, no app switching
- The support chatbot learns from every resolved ticket — it gets better with every customer interaction

Every support interaction the AI fails to resolve is a signal to improve the product — the best support is a product so simple it needs no support at all.

#### Notification Channels — Multi-Channel, User-Controlled

The platform notifies end customers and owners through three channels simultaneously. Users control their preference from their profile:

| Channel | Use | Default |
| --- | --- | --- |
| **In-app notifications** | Real-time alerts inside the dashboard and self-service portal | Always on |
| **WhatsApp** | High-priority alerts — payment due, expiry, complaint resolved, receipt | On (where available) |
| **Email** | All notifications + receipts, statements, summaries | On |

**Channel priority:** In-app is always delivered. WhatsApp is the highest-engagement channel for Indian users — it is the primary push channel. Email is the reliable fallback and the permanent record.

Users can disable any channel except in-app from their notification preferences. No notification is sent without the user's channel preference being respected. Critical alerts (e.g., account suspended, security event) override channel preferences and go to all channels regardless.

### F4. Progressive Complexity — Simple by Default, Powerful by Choice

The platform is world-class in capability but never overwhelming in presentation. **Every layer of the platform starts simple and expands on demand.** This is not about hiding power — it is about revealing it at the right moment, in the right context, for the right user.

> *The default state is always curated, purposeful, and immediately useful. The expanded state is always discoverable, never buried.*

#### The Principle Applied at Every Layer

| Layer | Simple Default | Powerful When Chosen |
| --- | --- | --- |
| List views | Top 5 most useful columns, curated per module | Column manager — add, remove, reorder any column |
| Filters | Basic search bar | Advanced filter builder with conditions and logic |
| Forms | Essential fields only | Optional and advanced fields expandable inline |
| Dashboard | Key KPI metrics | Drill-down, trend charts, custom date ranges |
| Navigation | Only active modules visible | Additional modules activatable from settings |
| Settings | Basic workspace config | Advanced config, integrations, custom rules |
| Permissions | Simple predefined roles | Granular per-permission overrides |
| Notifications | Essential system alerts | Full notification preference center |
| Reports | Standard curated templates | Custom report builder, export configurations |
| Feature modules | Core workflow only | Advanced features enabled via feature flags |
| Columns/fields | Minimum viable data entry | Full data model accessible progressively |

#### The Default Is a Design Decision, Not a Shortcut

Choosing what to show by default requires as much thought as building the feature itself. A poorly chosen default overwhelms new users and kills adoption. A well-chosen default makes the product feel intuitive on day one.

Every AI session that builds a new feature must define:

1. **What is the default state?** — The minimum set that covers 80% of use cases
2. **What is hidden but accessible?** — Advanced options available without friction
3. **What is the trigger to reveal more?** — A button, a setting, a usage milestone

#### Role-Based Defaults

The default experience is not one-size-fits-all. It is role-aware:

- **Owner** — Sees financial summaries, occupancy, pending actions
- **Staff / Receptionist** — Sees daily operations: check-ins, visitors, complaints
- **End Customer (Tenant / Member)** — Sees only their own data: bills, attendance, profile

Same platform. Same data. Three different default experiences — each optimally simple for its user.

#### AI-Curated Progressive Discovery

As the platform matures, AI actively participates in progressive revelation:

- **Usage-triggered suggestions** — "You've been active for 30 days. You might find the Advanced Reports feature useful — enable it here."
- **AI-adjusted defaults** — AI observes which columns and features a workspace actually uses and progressively suggests personalising their defaults
- **Onboarding mode** — New workspaces see a guided, even simpler first-time experience; complexity unlocks as confidence grows
- **Feature discovery hints** — Contextual, non-intrusive prompts that appear when a user encounters a situation where an advanced feature would help

#### The Philosophy

Simple by Default does not limit the platform's power or the team's thinking. It limits only what is **shown at first**. The full capability is always there — available, accessible, waiting. The goal is **quick adoption for new users** and **deep utilisation for power users** — both served by the same interface, at different stages of their journey.

> *A customer who discovers a feature over three months becomes a loyal advocate. A customer who sees all features on day one becomes overwhelmed and churns. Design for the journey, not just the destination.*

### F5. Accessibility & Inclusivity — Usable by Everyone

The platform serves users across a wide spectrum: technical literacy, device quality, internet speed, and physical ability. It must work for all of them:

- WCAG 2.1 AA compliance — keyboard navigation, screen reader support, colour contrast
- Fully functional on entry-level Android devices and mid-range browsers
- Core flows work when JavaScript-heavy features degrade
- No functionality hidden behind hover states — every action is touch-accessible
- Text readable without zoom on a 5-inch screen

Accessibility is not an edge case. It is the standard.

---

## G. Quality & Reliability

**Reliability commitment:** ManageKar targets 99.9% uptime — no more than ~8 hours of unplanned downtime per year. Owners run real businesses on this platform. A PG owner whose attendance page is down at 9AM, or whose billing cron silently failed overnight, loses real money and trust. Every outage is an incident that demands a post-mortem and a permanent fix — not a shrug.

When the platform is unavailable:

1. Rajat is alerted immediately via infrastructure monitoring
2. The issue is diagnosed and resolved as the sole priority
3. Affected workspaces receive a communication (in-app + email) explaining what happened and what was fixed
4. A root cause analysis is documented so the same issue cannot recur

> *Reliability is not a metric. It is a promise to every business owner who depends on this platform.*

### G1. Observability by Default — Measure Everything

You cannot improve what you cannot measure, and you cannot fix what you cannot see. Every module ships with full observability built in:

- **Structured logging**: Every API route, service call, workflow step, and cron job logs via the centralized logger (`src/lib/logger.ts`) with module-specific child loggers
- **Error tracking**: All unhandled errors are caught, assigned digest IDs, and surfaced — never silently swallowed
- **Business event audit**: Payments, check-ins, status changes — logged independently of application logs, permanently
- **Performance signals**: Slow queries, failed cron jobs, and rate limit hits are logged and alertable

Observability is built before the first bug occurs, not in response to the first incident.

#### Cron Job Reliability — Failure Is Not Acceptable Silently

The platform runs 5 business-critical cron jobs daily. A silent failure is worse than a loud one — owners don't know bills weren't generated until a tenant complains.

**Every cron job must:**

- Log start, completion, and record count at structured INFO level
- Log any failure at ERROR level with full context — which records failed, why, what state was left
- Complete idempotently — running the same cron twice produces the same result, never duplicates
- Recover from partial failure — if 3 of 10 bills fail, the other 7 still generate. Failures are isolated, not cascading.

**On failure, the platform must:**

1. Log the failure with full diagnostic context
2. Send an alert to Rajat (email) — cron failures are never silent
3. Expose the failure in the platform admin panel — visible, actionable, not buried in logs
4. Allow manual re-trigger from the admin panel without re-running already-completed records

**Idempotency is non-negotiable.** A cron that cannot be safely re-run is a cron that cannot be safely operated.

### G2. AI-Driven Deep Testing — Every Change Is Verified, Not Assumed

Since this platform is built entirely by AI, **testing is how AI verifies its own work**. A feature that AI builds but does not test is a feature that AI does not trust. No change — no matter how small — is complete without passing tests.

Testing is not a separate phase. It is part of every change, every session, every module.

#### The Test Pyramid

```text
E2E Tests        — Few, slow, high confidence  (critical user journeys)
    Integration Tests — Medium, real DB patterns  (API routes, services, cross-module)
        Unit Tests       — Many, fast, isolated     (utilities, validators, pure logic)
```

#### What AI Must Test for Every Change

**Before making any change:**

- Run the full existing test suite — confirm nothing is already broken
- Identify which existing tests cover the area being changed

**For every new feature or modification, AI must write tests covering:**

| Test Type | What to Cover |
| --- | --- |
| **Happy path** | The intended use case works correctly end to end |
| **Edge cases** | Null inputs, empty arrays, boundary values, max lengths |
| **Error states** | What happens when dependencies fail, data is invalid, DB errors |
| **Permission testing** | User without permission cannot access; user with permission can |
| **RLS validation** | Workspace A cannot access Workspace B's data under any condition |
| **Audit trail** | `created_by`, `deleted_by`, status transitions are all recorded |
| **Soft delete** | Deleted records are hidden, not destroyed; cascade works correctly |
| **Cross-module** | Changes in one module propagate correctly to dependent modules |
| **Regression** | Previously passing tests still pass after the change |

#### Deep Testing — Adversarial Thinking

AI must think adversarially when testing — not just "does it work?" but "how can it break?":

- What if `person_id` is null when it should never be?
- What if a user manipulates the API to access another workspace's records?
- What if a payment is recorded but membership activation fails — is the system consistent?
- What if a soft-deleted record is referenced by a foreign key?
- What if the same record is edited by two sessions simultaneously?
- What if a required field is missing from a form submission?
- What if a cron job fails mid-execution — is the state recoverable?

These questions must be answered by tests, not by assumption.

#### Coverage Standards

| Layer | Minimum Coverage | Why |
| --- | --- | --- |
| `src/lib/` utilities | 80% | Pure logic, easy to test, high leverage |
| `src/lib/services/` | 80% | Owns all business decisions — most critical |
| `src/app/api/` routes | Every route has tests | Security and validation boundary |
| Critical user flows | E2E tests | Confirm real business operations work |
| Dashboard pages | Smoke tests minimum | Render without crash, key data present |

#### The Current Gap — and the Direction

As of 2026-04-25, all 25 test files cover `lib/` and `components/` only. Zero API route tests. Zero service-layer business flow tests. Zero page/form tests. **Every new module added to the platform must close this gap for its own surface area.** The test suite grows with every AI session — it never shrinks.

#### Definition of Done

A change is **not complete** until:

1. All existing tests pass
2. New tests cover the happy path, at least 3 edge cases, permission checks, and error states
3. If a service was modified — service-layer tests pass
4. If an API route was added or changed — route tests pass
5. If a critical user flow was affected — E2E or integration test confirms it

> *AI builds the platform. Tests prove the platform works. Both are non-negotiable.*

### G3. Performance Standards — Fast at Every Layer

A slow platform is a broken platform. Performance is a feature — not a post-launch concern. Every layer of the stack has a defined standard, and every AI session must honour it.

| Layer | Standard | Why |
| --- | --- | --- |
| **Frontend (4G)** | First Contentful Paint < 2s | Indian 4G is fast but intermittent — perceived speed is trust |
| **API routes** | p95 response time < 500ms | Owners and staff use the dashboard in real-time operations |
| **Database queries** | No query exceeds 100ms in p95 | Slow queries cascade — one slow page kills the whole session |
| **Cron jobs** | Complete within their scheduled window | A billing cron that runs past midnight corrupts the next day's data |
| **File uploads** | Optimisation pipeline completes within 3s | Raw upload → compressed → stored — invisible to the user |

#### N+1 Prevention — Non-Negotiable

Every list page that fetches related entities must use joins or batch queries — never a query per row. N+1 queries are a correctness bug disguised as a performance issue: they work on 10 rows and break on 1000.

- Every Supabase query that joins related data uses `.select()` with embedded joins — never a loop of individual fetches
- Every new list page is reviewed for N+1 patterns before merge
- If a page feels slow in development, it will be unusable in production — fix it before it ships

#### Performance Is Tested, Not Assumed

- Slow queries are caught by Supabase query analysis before they reach production
- API routes with response times above 500ms are flagged in observability (G1) and investigated immediately
- Performance regressions are treated as bugs — any change that makes a previously fast page slow is reverted or fixed before shipping

> *A world-class platform is fast for the owner in Mumbai on 4G at 9AM. Everything else is a footnote.*

---

## Principle Test — Run Before Every Change

Every AI session must answer all 41 questions before proceeding. These are not a checklist — they are the AI's obligation to the platform:

| # | Question | Ref |
| --- | --- | --- |
| 1 | Does this serve the mission — does it advance the world-class universal platform? | A1 |
| 2 | Is this optimised for the Indian context today — UPI, WhatsApp, GST, 4G, INR? Does it avoid blocking future global expansion? | A2 |
| 3 | Is this driven by real client demand, not speculation? | A3 |
| 4 | Does this respect the granular feature economy — is it independently enable/disable-able? | A4 |
| 5 | Does it have a free usage tier with generous limits before any paywall? | A5 |
| 6 | Does this respect white-label — no forced ManageKar branding in customer-facing UI? | A6 |
| 7 | Does it use a free solution where one exists? | A7 |
| 8 | Is white-labeling available on this feature for all tiers including Free — no branding paywalls? | A6 |
| 9 | Does it respect the universal multi-tier hierarchy? | B1 |
| 10 | Is this a Core Module (reusable) or a Domain Module (composition)? Never both. | B2 |
| 11 | Does business logic live exclusively in the service layer? | B3 |
| 12 | Does this communicate via contracts and events, never direct internal coupling? | B4 |
| 13 | Did I check for existing patterns before creating anything new? | C1 |
| 14 | Is all identity data flowing through the People module? | C2 |
| 15 | Is every entity linked and traceable through the full hierarchy? | C3 |
| 16 | Is there any duplication — in logic, config, or data — that can be eliminated? | C4 |
| 17 | Is personal data handled with minimum collection, strict isolation, and right to erasure? | C5 |
| 18 | Does any file upload go through automatic compression and crop optimisation before storage? | C6 |
| 19 | Does this module/page have 100% feature parity with every other module? | D1 |
| 20 | Can any step here be automated so the user never does it manually? | D2 |
| 21 | If this is a platform communication, does it fire to both in-app and email automatically? | D2 |
| 22 | Where can AI make this predictive, generative, or 10x better? | D3 |
| 23 | Is this feature using the best available free AI API — no paid AI until the platform monetizes? | D3 |
| 24 | **Am I operating as a platform architect — proactively surfacing improvements beyond what was asked?** | D4 |
| 25 | **Is this the broadest, most platform-wide solution possible? Can it serve multiple business types?** | D5 |
| 26 | Does this feel like one unified platform, not a domain-specific bolt-on? | D6 |
| 27 | Does this work on mobile without compromise? Is it PWA-ready? | D7 |
| 28 | Is security enforced structurally at database, API, and component levels? | E1 |
| 29 | Are all pages, forms, and actions guarded with PermissionGuard and FeatureGuard? | E2 |
| 30 | Does any new permission model use Groups (GBAC) — not individual permission assignments? | E2 |
| 31 | Is every change attributed — created_by, audit trigger, status log? | E3 |
| 32 | Is deletion soft with 90-day retention and cascade handling? | E4 |
| 33 | Does the UI reflect the brand design system and world-class quality standard? | F1 |
| 34 | Can a first-time user complete this task without any training? | F2 |
| 35 | Does the end customer have a corresponding self-service touchpoint? | F3 |
| 36 | Is the default state minimal and purposeful — showing only what 80% of users need immediately? | F4 |
| 37 | Is every advanced feature accessible but not forced — hidden by default, revealed on demand? | F4 |
| 38 | Are defaults role-aware — owner, staff, and end customer each see what they need? | F4 |
| 39 | Did I run existing tests before making changes — and do they still pass after? | G2 |
| 40 | Have I written tests covering happy path, edge cases, permissions, RLS, and error states? | G2 |
| 41 | Does this meet performance standards — FCT < 2s, API < 500ms, no N+1 queries? | G3 |

> Q24: AI must operate as architect, not task executor.
> Q25: Solutions must serve the broadest possible set of business types.
> Q36–38: Default state must be simple, role-aware, and expandable — always.
> Q39–40: No change is complete without tests. AI builds it, AI proves it works.
> Q18: Every file upload must be auto-compressed — never store raw.
> Q30: Permissions always flow through Groups, never individual assignments.
> Q41: Performance is a principle — FCT < 2s, API < 500ms, no N+1 queries.

If any answer is **no** — do not ship. Revisit, elevate, and align.

---

## Platform Vision — Infinite Expansion Through Composition

ManageKar starts with PG and Library — the first two recipes, built for the first client. The kitchen — the Core Modules — is being hardened through real usage before being offered to the world.

### The Expansion Strategy: Validate → Respond → Multiply → Lead

Expansion follows a deliberate, four-phase sequence:

**Phase 1 — D: Validate (Current)**
Reach 10+ active clients on PG + Library before expanding to any new domain. Real usage at scale reveals what is truly universal in the Core Modules versus what is PG/Library-specific. This phase hardens the architecture, closes gaps, and proves the composable model under real business conditions. No new domain is considered until this foundation is solid.

**Phase 2 — A: Respond (Demand-Driven)**
The next domain module is built when a real client needs it. No speculative building. Client demand validates the domain, funds the development, and provides a live testing environment from day one. Each new domain costs a fraction of the previous one — because the Core Module ingredients already exist.

**Phase 3 — C: Multiply (Simultaneous Scale)**
Once the pattern is proven across 2–3 domains, build multiple domains simultaneously. By this phase, the Core Modules are battle-tested and reusable at full confidence. A new domain is largely a configuration — the compound returns of the composable architecture fully activate here.

**Phase 4 — B: Lead (Strategic Targeting)**
With market data, usage patterns, and a proven platform, proactively identify and target high-value verticals. This is the strategic scale phase — ManageKar moves from responding to leading, choosing which markets to enter based on size, need, and competitive advantage.

**There is no fixed roadmap of business types.** The platform serves any management-intensive business. The architecture is always ready. The expansion strategy ensures it is entered at the right time, in the right order.

| What needs managing | Core Modules already available |
| --- | --- |
| A hotel | Room/Bed + People + Payment + Visitor + Complaint + Electricity + Notices |
| A school | People + Attendance + Payment + Schedule + Visitor + Complaint + Notices |
| A gym | People + Locker + Payment + Attendance + Notices |
| A co-working space | People + Seat + Payment + Visitor + Complaint + Notices |
| A clinic | People + Schedule + Payment + Attendance + Visitor + Complaint + Documents |
| A hostel | People + Room/Bed + Payment + Complaint + Notices + Electricity |
| Any business | People + Payment + [domain-specific Core Modules] |

**The investment made in every Core Module today is permanent. It serves every domain that will ever be built on this platform.**

---

*ManageKar — "Let's Manage" — India's most intelligent, composable business management platform. Built for India. Dedicated to India.*
