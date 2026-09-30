# Money Calculator

A personal financial management web application built for clarity, correctness, and auditability.

## What it does

Money Calculator helps you record, understand, and plan your personal finances. Every number shown in the UI comes from real database records — nothing is hardcoded or estimated.

**Core capabilities:**

- Track income, expenses, and account balances across multiple accounts
- Manage loans (lent and borrowed) with full repayment lifecycle
- Track investments, deposits, and long-term assets (land, property)
- Record tuition students and monthly payment status
- Set budgets, goals, and recurring transactions
- View cash-flow forecasts, net-worth trends, and financial insights
- All financial mutations are auditable and reversible where appropriate

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.5 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Recharts |
| Database | PostgreSQL via Supabase |
| Auth | Supabase SSR authentication |
| Testing | Vitest (unit + integration), Playwright (E2E) |

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project with the database schema applied

### Environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PLAYWRIGHT_TEST_EMAIL=your_test_user_email
PLAYWRIGHT_TEST_PASSWORD=your_test_user_password
CRON_SECRET=a_secret_string_for_the_recurring_cron_endpoint
```

> **Never commit `.env.local`.** The service role key bypasses all RLS policies.

### Run in development

```bash
npm install
npm run dev
```

If you are on Android/ARM (Termux/Acode), use:

```bash
npm run dev -- --webpack
```

### Run tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires live Supabase connection)
npm run test:integration

# E2E tests (requires running dev server)
npm test
```

### Build for production

```bash
npm run build
# or on ARM:
npm run build -- --webpack
```

## Project structure

```
src/
  app/                  # Next.js App Router pages and API routes
    accounts/           # Account management
    budgets/            # Budget management
    categories/         # Transaction categories
    dashboard/          # Main dashboard
    deposits/           # Fixed deposits
    goals/              # Financial goals
    investments/        # Investment tracking
    loans/              # Loan lifecycle management
    long-term-assets/   # Land and long-term asset management
    recurring/          # Recurring transactions
    reports/            # Analytics and report pages
    transactions/       # General transaction management
    tuition/            # Tuition student management
    auth/               # Authentication pages
    api/cron/           # Cron endpoint for recurring transactions

  lib/
    supabase/           # Supabase client (browser, server, admin)
    finance/            # Server-side financial data fetchers
    intelligence/       # Cash-flow forecasting, financial insights
    contacts/           # Contact picker utility

  components/
    ui/                 # Base UI components (button, etc.)
    layout/             # Navigation
    reports/            # Chart components
    loans/              # Loan-specific components
    goals/              # Goal-specific components
    accounts/           # Account-specific components
    budgets/            # Budget-specific components
    categories/         # Category-specific components

tests/
  unit/                 # Pure function tests (no DB)
  integration/          # Tests against live Supabase DB
  e2e/                  # Playwright browser tests
```

## Security model

- All database tables have Row Level Security (RLS) enabled
- Every table has a SELECT policy enforcing `auth.uid() = user_id`
- All tables have deny-all INSERT/UPDATE/DELETE policies — direct writes are blocked
- All financial mutations go through PostgreSQL RPC functions (SECURITY DEFINER)
- Each RPC enforces `auth.uid()` ownership internally
- The service role key is only used server-side (cron route) and never exposed to the browser
- See [ARCHITECTURE.md](ARCHITECTURE.md) for the full security model

## Financial model

See [FINANCIAL-MODEL.md](FINANCIAL-MODEL.md) for a detailed explanation of:
- How accounts, transactions, and double-entry ledger entries work
- How loan balances are calculated
- How asset sales are recorded
- How net worth is derived

## Testing

See [TESTING.md](TESTING.md) for a description of the test strategy, what each test suite covers, and how to run specific suites.
