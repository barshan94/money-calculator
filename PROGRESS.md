# Money Calculator — 2027 Development Progress

This file tracks the development status of the Money Calculator 2027 Edition.
Last updated: 2026-09-30

---

## Overall completion: ~82%

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

---

## 🔲 Remaining phases (priority order)

### Phase 17 — Global search
- No search functionality exists yet
- Should cover transactions, loans, accounts, students by name/description
- Approach: server-side full-text search via Supabase

### Phase 38 — CI/CD pipeline
- No `.github/workflows` or CI config exists
- Target: lint → type check → unit tests → integration tests → build → E2E → deploy
- Deployment should not proceed if critical checks fail

### Phase 16 — Receipts/attachments
- No file upload or Supabase Storage integration exists
- Target: attach receipts/invoices to transactions, loans, assets
- Requires: file type validation, size limits, secure ownership, safe deletion

### Phase 21 — Audit log UI
- Financial audit trail exists implicitly via transactions/reversals
- Missing: dedicated audit log page showing what happened, when, and why
- Important actions: loan repayment created/reversed, asset sold, transaction cancelled

### Phase 28 — Accessibility pass
- No dedicated accessibility review done
- Target: semantic HTML, keyboard navigation, focus states, screen-reader labels, contrast

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

## 📊 Test counts (as of 2026-09-30)

| Suite | Count | Status |
|---|---|---|
| Integration | 198 | ✅ All passing |
| Unit | ~48 | ✅ All passing |
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
