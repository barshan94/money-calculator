# Money Calculator — Roadmap

## Phase 1 — Foundation & Architecture

Status: COMPLETE

- Next.js foundation
- Supabase
- Authentication
- PostgreSQL
- Core application structure
- Financial architecture

---

## Phase 2 — Core Financial Ledger

Status: COMPLETE

- Accounts
- Transactions
- Income
- Expenses
- Transfers
- Void/reversal
- Ledger integrity

---

## Phase 3 — Financial Modules

Status: COMPLETE

- Loans
- Tuition
- Deposits
- Investments
- Long-term assets

---

## Phase 4 — Planning & Automation

Status: COMPLETE

- Goals
- Budgets
- Recurring transactions
- Categories

---

## Phase 5 — Dashboard & Reports

Status: COMPLETE

- Dashboard
- Recent activity
- Account reports
- Income/expense reports
- Loan reports
- Deposit reports
- Investment reports
- Goal reports
- Liquidity
- Financial insights
- Forecasting reports
- What-if analysis

---

## Phase 6 — Testing & Financial Integrity

Status: COMPLETE

- Unit testing
- Integration testing
- Cross-module financial integrity testing
- Financial edge-case testing
- Authorization-boundary testing
- Transaction protection testing
- Loan lifecycle testing
- Tuition lifecycle testing
- Deposit testing
- Investment testing
- Long-term asset testing
- Recurring transaction testing
- Production build verification

### Current verification

- 25 unit test files
- 134/134 unit tests passing
- 32 integration test files
- 185/185 integration tests passing
- Production build passing
- Playwright/E2E testing deferred until laptop/Codespace is available

---

## Phase 7 — Security & Production Hardening

Status: COMPLETE

- RLS audit
- RPC ownership audit
- SECURITY DEFINER audit
- Cross-user access testing
- System account protection
- Input validation audit
- Authorization audit
- Financial mutation audit
- Direct financial-table mutation privileges revoked
- Anonymous financial mutation privileges revoked
- Internal RPC execution privileges restricted
- Long-term asset mutation policies removed
- Legacy loan RPC access revoked
- Integration-test database access hardened
- Security boundary tests verified
- Production build verified

### Security verification

- Authenticated financial INSERT/UPDATE/DELETE privileges revoked
- Anonymous financial INSERT/UPDATE/DELETE privileges revoked
- Internal financial RPCs restricted
- Ownership checks verified
- Protected financial mutations routed through RPCs
- 185/185 integration tests passing

---

## Phase 8 — UX & Mobile Experience

Status: NEXT

- Responsive polish
- Loading states
- Empty states
- Error states
- Form UX
- Navigation
- Search/filter/sort
- Accessibility
- Mobile usability
- Performance optimization
- Consistent UI patterns
- Dashboard UX refinement

---

## Phase 9 — Financial Intelligence

Planned:

- Cash-flow forecasting
- Spending analysis
- Savings analysis
- Goal forecasting
- Net-worth forecasting
- Investment analytics
- Debt analysis
- What-if simulations
- AI financial assistant
- Anomaly detection
- Financial recommendations and insights

---

## Phase 10 — Production & Advanced Platform

Planned:

- Production deployment
- Custom domain
- Monitoring
- Backups
- Performance optimization
- Data export/import
- Notifications
- PWA/offline capabilities
- Advanced analytics
- Future Android application

---

## Completion Philosophy

"Complete" means a usable and verified milestone.

The project may continue with new phases after Phase 10 as the product evolves.
