# Cushman & Wakefield CRM Dashboard — Project Log

## Project Overview

Custom CRM platform built for Michael Madden's commercial real estate brokerage team at Cushman & Wakefield (Chicago). Designed to replace their fragmented workflow across ACT, Airtable, ZoomInfo, Excel, and Outlook with one unified system.

**Client:** Michael Madden — Director, Cushman & Wakefield, 225 W Wacker Dr, Chicago
**Team:** Michael Madden, Tate Surtani (Associate), Lily Chen (Coordinator), Jonathan Metzel (Senior Managing Director)
**Built by:** BPN Solutions (Blake, Phil, Nick, Tate)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4, shadcn/ui components
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL) — project `CWDemo` (ID: `cdddtapyylxcposemqpp`)
- **AI:** Anthropic API key configured (not yet integrated into features)
- **Hosting:** GitHub repo `BlakeMarcotte/cwdemo`

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Dashboard — summary cards, pipeline chart, recent activity, upcoming follow-ups |
| `/companies` | Company list with sortable table, filters (relationship, industry, city, team, search) |
| `/companies/[id]` | Company detail with tabs: Notes, History, Contacts, Leases, Activities, Opportunities, Documents, Addresses |
| `/contacts` | Contact list with filters (building, designation, company, location, search) |
| `/contacts/[id]` | Contact detail with tabs: Notes, Company, History, Contact Activity, Company Activity |
| `/leases` | Lease list with filters (submarket, asset type, occupancy, agreement, expiration year, status, active toggle, search) |
| `/buildings` | Building list with filters (submarket, class, landlord, min SF, search) + tenant/contact/occupied SF counts |
| `/buildings/[id]` | Building detail with financial intelligence, lease expiration summary, tenant stacking |
| `/opportunities` | **Lease-centric kanban board** — 13 status columns with drag-and-drop |
| `/activities` | Activity list with filters (type, priority, team, date range, search) |
| `/prospecting` | Focus List + Reserve List with filters (status, team lead, industry, overdue, search) |

---

## Core Features Built

### Data Layer
- **Supabase integration** — all CRUD operations persist to PostgreSQL
- **Optimistic updates** — UI updates instantly, Supabase writes in background
- **Snake_case ↔ camelCase mapping** — transparent conversion between DB and app
- **Seed data** — 31 companies, 66+ contacts, 21 buildings, 30 leases, 15 opportunities, 52+ activities, 29 prospects
- **Data versioning** — stale localStorage auto-clears when seed data changes

### UI/UX
- **Light/Dark theme toggle** — persists to localStorage, sun/moon button in top bar
- **Breadcrumb navigation** — Dashboard > Companies > Cushman & Wakefield (resolves entity names)
- **Left sidebar** — BPN Solutions branding, 8+ nav items with active state highlighting
- **Drag-to-scroll tables** — click and drag to pan horizontally/vertically on any table
- **Dense layout** — Bloomberg-terminal density, minimal whitespace, text-xs/text-sm throughout
- **Color coding** — green for linked records, blue for hyperlinks, colored badges for statuses

### CRUD on Every Page
- **Add buttons** on every list page with form dialogs
- **Edit buttons** on every detail page and kanban cards
- **EditDialog component** — reusable form with text, number, date, checkbox, select, multi-select, textarea fields
- **All changes persist to Supabase**

### Filtering (Every Page)
- **Companies:** relationship (multi-select), industry, city, team member, search
- **Contacts:** building, designation (multi-select), company, location, search
- **Leases:** submarket, asset type, occupancy, agreement, expiration year, status, active toggle, search
- **Buildings:** submarket, class, landlord, min SF, search
- **Opportunities:** status column toggles, team member, search
- **Activities:** type, priority, team member, date range, search
- **Prospecting:** status, team lead, industry, overdue toggle, search
- All pages show "X of Y" counts and have clear filters buttons

### Building Financial Intelligence (Priority #1 from meeting)
- **Rent/SF and Tax & Operating** fields on every building (editable)
- **Pro rata share** — tenant SF / building SF as percentage
- **Annualized rent** — SF × rent/SF per tenant
- **Gross rent** — SF × (rent + tax/operating)
- **Cash flow gap** — red warning showing annualized rent loss for leases expiring within 2 years
- **Totals row** — aggregate pro rata, total rent, total at-risk cash flow
- **Lease expiration summary** — bar chart by year + timeline table with color-coded urgency

### Lease-Centric Opportunities (Kanban)
- **13 status columns:** Uncategorized, Monitor - Long Term, Hot Pursuit, Active Pursuit, Meeting Scheduled, Monitor - Near Term, On Hold, Strategy, Touring, Negotiations, In Lease, Closed, Lost/Dead/Dud
- **Each card = one lease** showing address, suite, company, SF, commission, expiration, term, agreement, primary contact, team
- **Drag-and-drop** — drag leases between columns to update status
- **Auto-relationship update** — dragging to "Closed" changes company relationship to Client
- **Column toggles** — show/hide any column
- **Commission calculation** — SF × rate (default $1.25/SF) × (term months ÷ 12)
- **Commission override** — manual amount per lease
- **Editable rate** — each lease can have its own $/SF rate

### Company Detail — History Tab
- Table format with columns: Date/Time, Result (type + priority badges), Title & Details (contact + regarding), Team Member (indigo pills)

### Prospecting
- **Focus List** — curated active prospects with nuggets (one-line outreach reasons)
- **Reserve List** — companies ready to rotate in
- **Promote to Focus** button — actually works, moves reserve → focus
- **Overdue indicators** — red warning for past-due follow-ups
- **Stats bar** — total prospects, active count, responded count, avg days since contact

---

## Database Schema (Supabase)

All tables use TEXT primary keys matching app IDs (c1, ct1, l1, b1, etc.).

### Tables
- `companies` — 31 rows
- `contacts` — 66+ rows
- `buildings` — 21 rows (with `rent_per_sf`, `tax_operating`)
- `leases` — 30 rows (with `status`, `commission_rate`, `commission_override`)
- `opportunities` — 15 rows
- `activities` — 52+ rows
- `prospect_entries` — 29 rows
- `tasks` — empty

### Key Columns Added
- `buildings.rent_per_sf` — asking rent per square foot
- `buildings.tax_operating` — tax & operating costs per square foot
- `leases.status` — 13-value enum for kanban pipeline
- `leases.commission_rate` — $/SF rate (default 1.25)
- `leases.commission_override` — manual commission amount

---

## Meeting Insights (Apr 1, 2026)

### Michael's Core Pain Points
1. Too many systems — wants ONE place
2. Too many clicks between tools
3. Research takes half a day per outreach batch
4. Speed is everything — "the second person hardly gets the meeting"

### Michael's "Brilliant Idea" — Building Financial Intelligence (BUILT)
- Pro rata share, annualized rent, cash flow gap calculations
- "38,000 SF tenant paying $36.73/SF, 17.7% pro rata, $1.4M gap when they vacate"

### Jonathan Metzel's Input
- Keep it simple — more dynamic than ACT, not as complex as Salesforce
- Mobile access is ideal
- They're 1099 contractors — IP concerns about company platforms
- Has old ACT database exported to Excel — needs import

### Priority Features (from meeting)
1. ~~Building financial intelligence~~ — **DONE**
2. One-click mass email from building view — NOT YET
3. Lease expiration timeline chart — **DONE**
4. Voice-to-notes — NOT YET
5. Morning outreach briefs — NOT YET
6. Click-to-call — NOT YET
7. Comps tracking — NOT YET
8. Engage integration check — NOT YET
9. Data import from ACT/Excel — NOT YET
10. Mobile responsive — NOT YET

---

## Removed Items
- **Q-Blocks** — removed from all data (company c3, contacts, leases, activities, opportunities, prospects)
- **Tasks page** — removed from sidebar/routes

---

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=https://cdddtapyylxcposemqpp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<in .env.local>
ANTHROPIC_API_KEY=<in .env.local>
```

`.env.local` is gitignored. RLS is disabled on all tables for the demo.

---

## Git History

Repository: `github.com/BlakeMarcotte/cwdemo`
Branch: `main`
