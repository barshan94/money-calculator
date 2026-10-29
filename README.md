# Money Calculator

**A personal finance management system built around accurate accounting, liquidity awareness, and an auditable financial history.**

Money Calculator is a full-stack web application for recording everyday money movement and understanding the bigger financial picture. It brings accounts, income, expenses, lending, borrowing, investments, deposits, long-term assets, tuition income, budgets, goals, and reports into one system.

The project is designed around a core rule: **financial data should be explainable and traceable, not just displayed as totals.** Balances and reports are derived from persisted records, financial writes are handled by database functions, and reversals preserve the history of what happened.

> This is a personal finance tracking application, not a bank, payment processor, tax adviser, or source of guaranteed investment advice. Forecasts and insights are estimates based on recorded data and assumptions.

## Contents

- [Highlights](#highlights)
- [Financial design principles](#financial-design-principles)
- [Technology stack](#technology-stack)
- [Application modules](#application-modules)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available commands](#available-commands)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Deployment notes](#deployment-notes)
- [Documentation](#documentation)

## Highlights

- **Personal finance ledger:** record income, spending, transfers, and opening balances across multiple accounts.
- **Account-aware balances:** keep account balances derived from ledger entries rather than maintaining unrelated manual totals.
- **Double-entry accounting:** financial transactions are represented by balanced debit and credit entries.
- **Loans and repayments:** manage money lent and money borrowed, record repayments, update repayment details, and reverse/cancel repayments while preserving history.
- **Investments and deposits:** track investment positions and fixed/term deposits as part of the broader financial picture.
- **Long-term assets:** record assets such as land or property, track acquisition costs, and account for gains or losses when assets are sold.
- **Tuition tracking:** maintain students, monthly fees, due dates, and paid, partial, or unpaid payment status.
- **Budgets and recurring transactions:** plan spending and handle scheduled financial activity.
- **Goals and planning:** track financial goals and model progress toward targets.
- **Reports and financial insights:** review cash flow, income and expenses, liquidity, net worth trends, and forecasts.
- **Reversible operations:** voids and reversals retain an audit trail instead of silently deleting financial history.
- **Authenticated, user-scoped data:** each account holder's financial records are isolated through Supabase Auth and PostgreSQL Row Level Security.
- **Automated quality checks:** unit, database integration, and browser end-to-end tests cover calculations and financial workflows.

## Financial design principles

### 1. The ledger is the source of truth

Balances and summaries are calculated from persisted financial records. Avoid treating a UI total or an independently edited balance as the authoritative record.

### 2. Every posted transaction must balance

The sum of debit entries must equal the sum of credit entries. Database validation protects this invariant before a transaction is committed.

### 3. Preserve history instead of deleting financial events

When a posted transaction needs to be cancelled, the application uses a reversal and marks the original as voided. Repayment cancellations follow the same audit-oriented approach. This makes changes traceable and helps prevent silent corruption of historical reports.

### 4. Net worth is not the same as available cash

Net worth includes assets and liabilities; liquidity concerns money that is currently available to spend. Money lent, investments, deposits, and long-term assets may contribute to net worth without being immediately spendable. Expected but unpaid tuition is not cash received.

### 5. Forecasts are projections, not facts

Forecasts and insights are derived from recorded history and explicit calculation logic. They should be interpreted as planning aids, not guarantees of future outcomes.

## Technology stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, shadcn/ui and Base UI components |
| Charts | Recharts |
| Backend and database | Supabase, PostgreSQL |
| Authentication | Supabase Auth with `@supabase/ssr` |
| Unit and integration tests | Vitest |
| Browser end-to-end tests | Playwright |
| Deployment | Vercel-compatible Next.js deployment |

Dependency versions are maintained in [package.json](package.json).

## Application modules

| Module | Purpose |
| --- | --- |
| Dashboard | High-level financial overview |
| Accounts | Manage financial accounts and opening balances |
| Transactions | Record and review financial activity |
| Categories | Organise transactions |
| Loans | Track lent/borrowed principal, repayments, and settlement status |
| Investments | Track investment purchases and current values |
| Deposits | Track deposits and their financial value |
| Long-term assets | Track assets such as land/property and asset sales |
| Tuition | Track students, expected fees, and payment status |
| Budgets | Compare spending against planned limits |
| Recurring | Configure repeating transactions |
| Goals | Track savings and financial targets |
| Reports | Review financial summaries, trends, and forecasts |

Exact navigation and functionality may evolve as the project changes.

## Architecture

The application uses the Next.js App Router with server-side data loading and client-side components for interactive actions.

```text
Browser
  |
  v
Next.js App Router
  |-- Server Components: authenticated data loading and page rendering
  |-- Client Components: forms and interactive controls
  |-- API route: protected recurring-transaction processing
  |
  v
Supabase
  |-- Auth: user identity and session
  |-- PostgreSQL: financial records and constraints
  |-- RLS: user-scoped reads
  |-- RPC functions: validated financial mutations
```

- Server-side financial data fetchers live in `src/lib/finance/`.
- Forecasting and insight calculations live in `src/lib/intelligence/`.
- Supabase browser, server, and admin clients are separated by purpose in `src/lib/supabase/`.
- Financial mutations are routed through PostgreSQL RPC functions rather than direct client-side table writes.
- The recurring transaction endpoint is located at `src/app/api/cron/recurring/route.ts` and requires a configured cron secret.

The database schema and RPC functions are currently managed in Supabase rather than shipped as a complete migration history in this repository. A fresh database therefore needs the corresponding schema and functions before the application can work correctly.

## Security model

The project uses layered controls to protect financial data:

1. **Authentication:** Supabase Auth provides user identity and sessions.
2. **Row Level Security:** database reads are restricted to rows belonging to the authenticated user.
3. **Restricted direct writes:** financial tables deny direct client-side inserts, updates, and deletes.
4. **Database RPCs:** mutations go through PostgreSQL functions that validate authentication, ownership, inputs, and financial invariants.
5. **Server-only admin credentials:** the Supabase service-role key is reserved for trusted server-side operations, such as recurring-transaction processing. It must never be exposed to browser code.
6. **Protected cron endpoint:** the recurring processor validates a `CRON_SECRET` bearer token.

**Security rule:** never commit secrets, production credentials, service-role keys, real financial data, or a real user's authentication details. Use a dedicated test account and a separate test environment for integration and end-to-end tests.

## Getting started

### Prerequisites

- Node.js 20 or newer (use a version supported by the installed Next.js release)
- npm
- A Supabase project
- The application's database schema, RLS policies, and required RPC functions applied to that project

### 1. Clone the repository

```bash
git clone https://github.com/barshan94/money-calculator.git
cd money-calculator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env.local` file in the project root and populate the variables listed below. Do not commit this file.

### 4. Prepare Supabase

Set up the required database tables, policies, and RPC functions in your Supabase project. The repository's [Architecture](ARCHITECTURE.md) and [Financial Model](FINANCIAL-MODEL.md) documents explain the design, but they are not a substitute for applying the actual database schema.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Android / ARM environments (such as Termux):** if the default Next.js bundler fails in your environment, try:

```bash
npm run dev -- --webpack
```

## Environment variables

Create `.env.local` with the values appropriate to your environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY

# Required for integration/E2E tests
PLAYWRIGHT_TEST_EMAIL=your_test_user_email
PLAYWRIGHT_TEST_PASSWORD=your_test_user_password

# Required by the recurring-transactions cron endpoint
CRON_SECRET=replace_with_a_long_random_secret
```

Notes:

- Use the publishable/anon key intended for client use; follow the key format configured in your Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` is highly privileged. Keep it server-only and never prefix it with `NEXT_PUBLIC_`.
- Test credentials should belong to a dedicated test user, not your personal account.
- The integration tests need a live Supabase database with the required schema and RPCs.
- The cron secret must match the bearer token configured in the external scheduler.
- Never use the example placeholders as real credentials.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server after building |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run Supabase integration tests |
| `npm test` | Run Playwright end-to-end tests |
| `npm run test:all` | Run the Playwright suite |

On ARM environments, if needed, run the build with the Webpack option:

```bash
npm run build -- --webpack
```

## Project structure

```text
src/
  app/
    accounts/             Account management
    auth/                 Authentication pages
    budgets/               Budget management
    categories/            Transaction categories
    dashboard/             Financial dashboard
    deposits/              Deposit tracking
    goals/                 Goal tracking
    investments/           Investment tracking
    loans/                 Loan lifecycle
    long-term-assets/      Land/property and asset sales
    recurring/             Recurring transactions
    reports/               Reports and analytics
    transactions/          Transaction management
    tuition/               Tuition management
    api/cron/recurring/    Protected recurring processor
  components/              UI and module components
  lib/
    finance/                Server-side financial data access
    intelligence/           Forecasts and financial insights
    supabase/               Browser, server, and admin clients
tests/
  unit/                     Pure calculation tests
  integration/              Tests against Supabase
  e2e/                      Playwright browser tests
```

## Testing

Money Calculator has three testing layers:

- **Unit tests:** fast tests for pure calculations and utilities; no database required.
- **Integration tests:** validate database-backed workflows, financial invariants, and authorization boundaries against Supabase.
- **End-to-end tests:** exercise user flows through the running web application using Playwright.

Run the relevant suites using the commands above. Integration and E2E tests require valid test credentials and suitable test data. Review [TESTING.md](TESTING.md) before running tests against a database; tests create records and must use an environment intended for testing.

Key invariants covered by the integration suite include balanced posted transactions, valid loan balances, ownership boundaries, transaction reversals, asset-sale accounting, and module-level balance consistency.

## Deployment notes

The app is designed for deployment on Vercel or another platform that supports the configured Next.js version.

Before deploying:

- Configure the required environment variables in the hosting platform.
- Apply and verify the Supabase schema, policies, and RPC functions.
- Keep service-role credentials restricted to server-side execution.
- Configure an external scheduler to call the recurring-transaction endpoint with the correct bearer secret, if recurring processing is enabled.
- Run type checks, tests, and a production build.
- Verify authentication, financial mutations, and user-data isolation in the deployed environment.

Do not assume a new Supabase project is ready merely because the web application builds; the database schema and RPC functions are essential runtime dependencies.

## Documentation

- [Architecture](ARCHITECTURE.md) — application structure, data flow, Supabase clients, and security model.
- [Financial Model](FINANCIAL-MODEL.md) — ledger principles, loans, asset sales, net worth, tuition, donations, investments, and deposits.
- [Testing](TESTING.md) — test layers, commands, integration coverage, and test-data notes.

## Project

- **Repository:** [barshan94/money-calculator](https://github.com/barshan94/money-calculator)
- **Author:** Barshan Ghosh

