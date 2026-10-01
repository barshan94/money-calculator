# Money Calculator — 2027 Development Progress

This file tracks the development status of the Money Calculator 2027 Edition.
Last updated: 2026-10-01 (Phase 28 complete)

---

## 🤖 AI agent workflow instructions

These rules apply automatically after every phase — no need to remind the agent:

1. **Update PROGRESS.md** — move the completed phase from "Remaining" to "Completed", add bullet points summarising what was built, update `Last updated` date and overall completion %.
2. **Update memory** — write or update the phase memory file at `/public/.claude/projects/-public-money-calculator/memory/phase-XX-name.md` and add/update its line in `MEMORY.md`.
3. **Git commit and push** — stage all changed files, write a commit message in the format `Phase XX: <short title> — <one-line summary>`, append the standard attribution line, then `git push origin master`.

Do all three steps at the end of every phase without waiting to be asked.

---

---

## Overall completion: ~96%

---

## ✅ Completed phases

### Core financial system (already existed before tracked sessions)
- Accounts (create, edit, archive, opening balance)
- Transactions (create, edit, void/reverse)
- Categories (create, edit, archive)
- Deposits (create, edit, withdraw)
- Investments (create, edit, buy, sell, archive)
- Long-term assets (create, edit, sell, cancel, value tracking)
- Loans — full lifecycle (create, repay, edit repayment, cancel repayment, cancel loan, reliability)
- Tuition (students, payments, history, reliability, WhatsApp integration)
- Budgets (create, edit, archive)
- Goals (create, edit, cancel, progress tracking)
- Recurring transactions (create, edit, cron processing)
- Dashboard (net worth, cash flow forecast, financial insights, recent activity)
- Reports suite (15+ report pages: income/expense, cash flow, net worth, investments, loans, etc.)
- Authentication (login, signup, reset password, change password)

### Phase 23 — Security audit ✅ (2026-09-29)
- Confirmed RLS enabled on all 15 database tables
- Confirmed SELECT ownership policies on all tables
- **Added deny-all write policies (INSERT/UPDATE/DELETE) on all 15 tables**
- All mutations now forced through SECURITY DEFINER RPCs
- Service role key confirmed server-only
- All 185 existing tests passed after the change

### Phase 24 — Financial invariant tests ✅ (2026-09-29)
- Created `tests/integration/financial-invariants.test.ts`
- 13 invariants verified against live database:
  1. Every posted transaction has balanced debits and credits
  2. Every posted transaction has at least two entries
  3. Loan remaining = principal - repaid
  4. No loan is over-repaid
  5. Transaction entries reference correct user's transactions
  6. Transaction entries reference correct user's accounts
  7. Voided transactions have exactly one reversal
  8. Sold assets have `archived_at` set
  9. Account balance RPC covers all non-archived asset accounts
  10. `get_financial_summary` returns without error
  11. No loan has negative principal
  12. Settled loans have zero remaining
- Fixed PostgREST 1000-row pagination issue (entries fetched in pages)
- **198 integration tests passing across 33 files**

### Phase 35 — Documentation ✅ (2026-09-30)
- `README.md` — project overview, setup instructions, structure, security summary
- `ARCHITECTURE.md` — Next.js/Supabase architecture, RLS model, data flow, security model
- `FINANCIAL-MODEL.md` — double-entry bookkeeping, loans, asset sales, net worth with journal entries
- `TESTING.md` — all three test layers, 33 integration test files documented

### Phase 27 — PWA ✅ (2026-09-30)
- `public/manifest.json` — name, theme color, start URL `/dashboard`, display standalone
- `public/icons/icon-192.svg` and `public/icons/icon-512.svg` — ৳ on blue background
- `src/app/layout.tsx` — manifest link, Apple PWA meta, theme color, viewport meta

### Phase 13 — Tuition 2.0 ✅ (2026-09-30)
- Upgraded monthly overview from count-only to amount-based pipeline
- Now shows: **Expected** / **Received** / **Outstanding** in BDT with collection rate %
- Added collection progress bar
- Added styled status pills (Paid / Partial / Unpaid)
- No database changes — uses existing `get_tuition_monthly_status` RPC

### Phase 16 — Receipts/Attachments ✅ (2026-10-01)
- Created `src/app/api/attachments/upload/route.ts` — POST handler, any file type, 10 MB limit, stores in Supabase Storage under `{user_id}/{entity_type}/{entity_id}/{timestamp}-{filename}`
- Created `src/app/api/attachments/delete/route.ts` — DELETE handler, calls `delete_attachment` RPC, removes file from Storage
- Created `src/components/attachments/attachments-section.tsx` — client component: upload button, file list with download (signed URL) and delete
- Wired into `transactions/[id]/page.tsx`, `loans/[id]/page.tsx`, `long-term-assets/[id]/page.tsx`
- **Manual setup required in Supabase dashboard** (see Phase 16 notes below)

### Phase 38 — CI/CD pipeline ✅ (2026-10-01)
- Created `.github/workflows/ci.yml` — 7-stage pipeline
- Stages: lint → type-check → unit → integration → build → E2E → deploy
- Integration and E2E skipped on fork PRs (secrets unavailable)
- Build artifact cached between build/E2E/deploy jobs (avoids double build)
- Deploy stage gated on all checks passing, runs only on `master` push
- Playwright report uploaded as artifact on E2E failure
- Vercel deployment via `vercel pull → vercel build --prod → vercel deploy --prebuilt`
- Required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### Phase 21 — Audit Log UI ✅ (2026-10-01)
- Created `src/lib/finance/get-audit-log.ts` — queries transactions, loans, assets, tuition payments in parallel; normalises to unified `AuditEvent` type; sorts by timestamp descending; returns top 200
- Created `src/app/audit/page.tsx` — server component; kind filter tabs (All / Transactions / Loans / Assets / Tuition); event list with coloured badges (green = created, red = cancelled/voided/reversed, amber = sold/opening balance); links to entity detail pages
- Updated `src/components/layout/dashboard-nav.tsx` — added "Audit Log" nav link (◑ icon)
- No new DB tables — built entirely from existing data

### Phase 28 — Accessibility pass ✅ (2026-10-01)
- `src/app/layout.tsx` — removed `userScalable: false`, set `maximumScale: 5` (WCAG 1.4.4 Resize Text)
- `src/components/layout/dashboard-shell.tsx` & `src/app/globals.css` — added skip-to-content link targeting `#main-content`
- `src/app/globals.css` — changed generic `:focus` on inputs to `:focus-visible` to ensure clear keyboard focus rings
- `src/components/categories/edit-category-button.tsx` — added focus trap on modal dialog (Tab/Shift+Tab cycle) and focus restoration to trigger button on close
- `src/app/transactions/new/page.tsx` — added `role="group"` with `aria-label="Transaction type"` and `aria-pressed` states on Expense/Income/Transfer toggle buttons; added `role="alert"` on error/status message
- `src/app/transactions/[id]/edit/page.tsx` & `src/components/transactions/void-transaction-button.tsx` — added `role="alert"` on message elements
- `src/app/dashboard/page.tsx` — added `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` to goals progress bars

---

## 🔲 Remaining phases (priority order)

### Phase 30-32 — AI assistant (deferred)
- Deferred until deterministic financial system is complete
- AI must explain data, not fabricate it
- Every AI number must come from actual database records

---

## 🔧 Known technical notes

- **Build command on ARM/Android (Termux):** `npm run build -- --webpack`
- **Test command:** `npm run test:integration` for integration, `npm run test:unit` for unit
- **No SQL migration files** — all RPCs and schema live in Supabase dashboard directly
- **PostgREST 1000-row limit** — always paginate `transaction_entries` bulk fetches
- **Test artifacts** — integration tests may leave "Asset Edge" / "Sale Test Asset" named assets in DB with sold status; these are excluded from invariant checks
- **PWA icons** — currently SVG; convert to PNG for older Android compatibility if needed
- **`close_investment` RPC** is SECURITY INVOKER (not DEFINER) — worth verifying it behaves correctly with deny-all write policies

---

## 📊 Test counts (as of 2026-10-01)

| Suite | Count | Status |
|---|---|---|
| Integration | 198 | ✅ All passing |
| Unit | 134 | ✅ All passing |
| E2E (Playwright) | separate run | — |

---

## 🏗️ Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.5 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Recharts |
| Database | PostgreSQL via Supabase |
| Auth | Supabase SSR authentication |
| Testing | Vitest (unit + integration), Playwright (E2E) |
