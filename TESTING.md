# Testing

## Overview

Money Calculator has three layers of tests:

| Layer | Runner | Location | What it tests |
|---|---|---|---|
| Unit | Vitest | `tests/unit/` | Pure TypeScript functions, no database |
| Integration | Vitest | `tests/integration/` | Live Supabase database via RPC and table queries |
| E2E | Playwright | `tests/e2e/` | Full browser flows against the running app |

## Running tests

```bash
# Unit tests only (fast, no DB needed)
npm run test:unit

# Integration tests (requires live Supabase + env vars)
npm run test:integration

# E2E tests (requires running dev server + Playwright browsers)
npm test

# All tests
npm run test:all
```

## Environment requirements

Integration and E2E tests require these environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PLAYWRIGHT_TEST_EMAIL=...
PLAYWRIGHT_TEST_PASSWORD=...
```

The test user (`PLAYWRIGHT_TEST_EMAIL`) must exist in the Supabase Auth system and have appropriate test data (at least one asset account in BDT).

## Unit tests (`tests/unit/`)

Unit tests cover the TypeScript calculation functions in `src/lib/intelligence/`. These functions receive structured data and return derived values — they have no database dependency.

**What is tested:**
- Cash flow forecast calculations
- Net worth forecast calculations
- Goal forecast calculations
- Financial insights generation
- Budget intelligence
- Liquidity risk warnings
- Investment analytics
- Income/expense trend calculations
- What-if scenario modelling
- Recurring cash flow calculations
- Loan utility functions

These tests run in milliseconds and require no external services.

## Integration tests (`tests/integration/`)

Integration tests run against a live Supabase database. They authenticate as the test user and exercise the full RPC/table stack.

**Key test files and what they verify:**

| File | What it tests |
|---|---|
| `financial-invariants.test.ts` | Fundamental accounting identities (double-entry balance, loan math, ownership integrity) |
| `loan-lifecycle.test.ts` | Full loan create → repay → update → cancel repayment → cancel loan flow |
| `loan-settlement.test.ts` | Loan settlement and settled-loan invariants |
| `loan-borrowed.test.ts` | Borrowed loan flow |
| `loan-account-balance.test.ts` | Account balance changes during loan operations |
| `loan-authorization.test.ts` | Cross-user access prevention for loans |
| `loan-edge-cases.test.ts` | Invalid inputs, boundary conditions |
| `long-term-assets.test.ts` | Asset create/edit/cancel |
| `long-term-assets-sale.test.ts` | Full asset sale lifecycle (8 tests including double-entry verification) |
| `long-term-asset-edge-cases.test.ts` | Invalid sale prices, double-sale prevention |
| `transaction-lifecycle.test.ts` | Transaction create/void/reversal |
| `transaction-protection.test.ts` | Protection against invalid mutations |
| `account-lifecycle.test.ts` | Account create/edit/archive |
| `account-protection.test.ts` | System account protection |
| `authorization-boundary.test.ts` | Cross-user access prevention |
| `cross-module-integrity.test.ts` | Reversal balance verification, legacy RPC blocking |
| `cross-module-balance-edge-cases.test.ts` | Balance consistency across modules |
| `financial-reports.test.ts` | Report RPC correctness |
| `tuition-lifecycle.test.ts` | Student create/payment/cancel flow |
| `tuition-edge-cases.test.ts` | Tuition boundary conditions |
| `investment-edge-cases.test.ts` | Investment edge cases |
| `deposit-edge-cases.test.ts` | Deposit edge cases |
| `goal-edge-cases.test.ts` | Goal boundary conditions |
| `budget-edge-cases.test.ts` | Budget boundary conditions |
| `recurring-edge-cases.test.ts` | Recurring transaction edge cases |
| `report-edge-cases.test.ts` | Report RPC edge cases |

### Financial invariants

`financial-invariants.test.ts` is the most important integration test. It verifies accounting truths against all real data in the database:

1. Every posted transaction has equal debit and credit totals
2. Every posted transaction has at least two entries
3. Loan remaining = principal - repaid
4. No loan is over-repaid
5. Transaction entries reference transactions owned by the authenticated user
6. Transaction entries reference accounts owned by the authenticated user
7. Voided transactions have exactly one reversal
8. Sold assets have `archived_at` set
9. Account balance RPC covers all non-archived asset accounts
10. `get_financial_summary` returns without error
11. No loan has a negative principal
12. Settled loans have zero remaining amount

**Important implementation note:** The `transaction_entries` RLS SELECT policy uses a JOIN. PostgREST has a default 1000-row limit per query. The invariant tests paginate entries in 1000-row pages to avoid false failures on large datasets.

### Test helpers

`tests/integration/test-helpers.ts` exports:
- `createAuthenticatedClient()` — creates a Supabase client (anon key)
- `createAdminClient()` — creates a Supabase client (service role key, for cleanup)
- `signInTestUser(supabase)` — signs in the test user

Most integration tests use both clients: the authenticated client for the operations under test, and the admin client for cleanup after each test (since users cannot directly delete their own records due to the deny-all write RLS policies).

## E2E tests (`tests/e2e/`)

Playwright tests exercise full browser flows. They require the dev server to be running and an authenticated session.

**Coverage:**
- Dashboard loads
- Account CRUD
- Budget CRUD
- Category CRUD
- Deposit flows
- Goal flows
- Investment flows
- Loan flows
- Recurring transaction flows
- Report pages render
- Transaction flows
- Tuition flows

Auth setup is in `tests/e2e/auth.setup.ts` — it signs in once and saves the session to `playwright/.auth/user.json` for reuse across tests.

## Test data and cleanup

Integration tests create real records in the test database. Each test is responsible for cleaning up what it created, using the admin client (which bypasses RLS write policies).

Test artifacts that may persist in the database after incomplete cleanup are named with recognisable patterns:
- `Asset Edge <timestamp>` — from `long-term-asset-edge-cases.test.ts`
- `Sale Test Asset <timestamp>` — from `long-term-assets-sale.test.ts`

The financial invariant tests explicitly skip these artifacts where description-based checks would produce false failures.

## Current test counts

As of the last full run:

```
Unit:         ~48 tests
Integration:  ~150 tests  (33 files)
              198 total passing
E2E:          separate Playwright run
```
