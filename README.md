Money Calculator

Money Calculator is a personal finance web application for managing financial activity across accounts, transactions, loans, investments, deposits, tuition, budgets, goals, recurring transactions, donations, and long-term assets.

The application is built with Next.js + TypeScript + Supabase and uses a ledger-oriented financial model so important financial changes can be tracked, related records can be updated consistently, and posted transactions can be reversed without silently destroying financial history.

---

Features

Dashboard

- Financial overview
- Account and balance information
- Recent financial activity
- Quick access to important financial workflows

Accounts

- Manage financial accounts
- Support multiple account types
- Track account balances
- Support different financial sources such as cash and bank accounts

Income & Expenses

- Record income
- Record expenses
- Categorize transactions
- Connect transactions to financial accounts
- Preserve transaction history

Transaction Reversals

- Reverse posted transactions
- Preserve the original transaction
- Maintain relationships between original and reversal records
- Avoid silently deleting financial history

Donations

- Record donations
- Track donations against an income-based target
- Monitor donated, remaining, and surplus amounts

Loans

Support both:

- Money lent to other people
- Money borrowed from other people

Loan functionality includes:

- Loan creation
- Principal tracking
- Due dates
- Repayments
- Outstanding balances
- Settlement
- Status synchronization
- Reliability information
- Loan updates/cancellation
- Repayment reversal with audit history

Investments

- Record investments
- Track investment-related financial activity
- Maintain investment records separately from ordinary transactions

Deposits

- Track deposits
- Connect deposits with financial accounts
- Preserve associated financial movements

Long-Term Assets

- Record long-term assets such as land
- Track acquisition cost
- Track additional acquisition costs
- Record asset sales
- Remove the appropriate asset cost basis when an asset is sold
- Preserve the associated financial transaction history

Budgets

- Create budgets
- Edit budgets
- Track spending against budgets
- Calculate remaining budget
- Archive budgets
- Preserve archived budget history
- Permanently delete archived budgets when required

Goals

- Create financial goals
- Track progress toward goals
- Maintain goal records independently from ordinary transactions

Recurring Transactions

- Create recurring financial transactions
- Edit recurring transactions
- Pause/archive recurring transactions
- Run a recurring transaction manually
- Maintain recurring transaction history

Tuition

- Manage students
- Store guardian/contact information
- Track monthly tuition fees
- Track due dates
- Record payments
- Support paid, partial, and unpaid statuses
- Track tuition payment reliability

Reports

- Financial summaries
- Transaction information
- Account-related financial information
- Budget and other financial insights

Authentication

- Supabase authentication
- Authenticated financial data access
- User-scoped financial records

Responsive Interface

The application is designed to work across:

- Desktop
- Tablet
- Mobile

---

Tech Stack

Technology| Purpose
Next.js 16.3.5| Web application framework
React 19| UI
TypeScript| Application type safety
Supabase| Database and authentication
PostgreSQL| Financial data storage
Tailwind CSS 4| Styling
Recharts| Financial charts
Lucide React| Icons
Vitest| Unit/integration testing
Playwright| End-to-end testing
Vercel| Production deployment

---

Project Structure

The main application code is organized under "src/":

src/
├── app/           # Next.js routes and pages
├── components/    # Reusable UI components
└── lib/           # Supabase, financial, and business logic

Tests are organized separately:

tests/
├── e2e/           # Browser/end-to-end tests
├── integration/   # Database/business-logic tests
└── unit/          # Unit tests

---

Requirements

Before running the project locally, install:

- Node.js
- npm
- A Supabase project

The application requires these environment variables:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

Create a local ".env.local" file and provide the values for your Supabase project.

Example:

NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key

Do not commit ".env.local" or any secret credentials to Git.

The Supabase publishable key is intended for client-side use. Never expose a Supabase service-role key or another server-only secret to browser code.

---

Getting Started

Clone the repository and enter the project:

git clone https://github.com/barshan94/money-calculator.git
cd money-calculator

Install dependencies:

npm install

Create ".env.local" with the required Supabase variables.

Start the development server:

npm run dev

Then open:

http://localhost:3000

---

Development on Android / ARM

The development environment used for mobile development may require webpack because Turbopack is not supported in the current ARM setup.

Development:

npm run dev -- --webpack

Production build:

npm run build -- --webpack

---

Production Build

Create a production build:

npm run build

Start the production server:

npm start

For the ARM development environment:

npm run build -- --webpack

---

Testing

Money Calculator includes multiple layers of automated testing.

Type Checking

npx tsc --noEmit --pretty false

Linting

npm run lint

Unit Tests

npm run test:unit

Integration Tests

npm run test:integration

End-to-End Tests

npm run test

The E2E suite uses Playwright and covers the application's major financial and UI workflows.

---

Testing Philosophy

Financial software needs more than visual testing.

Money Calculator therefore uses multiple testing layers:

Unit Tests
     ↓
Integration Tests
     ↓
End-to-End Tests
     ↓
Production Smoke Testing

The E2E environment uses deterministic test data so tests can run without depending on previous test state.

The test setup removes test-user financial records in a controlled order and creates the required baseline accounts before the authenticated E2E session starts.

This helps prevent one financial workflow from contaminating another test.

---

Financial Data Architecture

Money Calculator is designed around connected financial records rather than simply maintaining manually calculated balances.

Financial operations may involve:

- Accounts
- Transactions
- Transaction entries
- Categories
- Loans
- Repayments
- Investments
- Deposits
- Budgets
- Goals
- Tuition payments
- Long-term assets
- Recurring transactions

Where appropriate, financial operations are implemented through database functions/RPCs so related records can be changed together.

This is particularly important for operations such as:

- Loan creation
- Loan repayment
- Repayment reversal
- Long-term asset sale
- Transaction reversal
- Account balance movements

---

Reversal & Audit Design

Money Calculator avoids treating financial history as disposable data.

When a posted transaction needs to be undone, the preferred approach is to create an appropriate reversal relationship rather than simply deleting the original financial event.

This allows the system to preserve:

- Original transaction
- Reversal transaction
- Relationship between them
- Financial history
- Auditability

The same principle is applied to important loan repayment operations.

---

Loan Lifecycle

Loans have a dedicated lifecycle rather than being treated as ordinary expenses or income.

The lifecycle can include:

Loan Created
     ↓
Active
     ↓
Partial Repayment
     ↓
Settled

Additional operations include:

- Update
- Cancellation
- Repayment reversal
- Status synchronization

The system supports both asset-side loans (money lent) and liability-side loans (money borrowed).

---

Budget Lifecycle

Budgets have their own lifecycle:

Create
  ↓
Active
  ↓
Archive
  ↓
Historical Record
  ↓
Optional Permanent Deletion

Archiving does not erase the budget's historical context.

Budget spending calculations exclude reversed transactions where appropriate so that financial history remains consistent.

---

Long-Term Asset Lifecycle

Long-term assets can follow a lifecycle such as:

Purchase
  ↓
Asset Held
  ↓
Asset Sold

The asset system can account for:

- Purchase price
- Acquisition costs
- Asset cost basis
- Sale amount
- Related financial movements

Selling an asset therefore involves more than simply removing the asset record.

---

Authentication & Data Access

Authentication is handled through Supabase.

The application uses Supabase's server and browser clients through "@supabase/ssr".

Server-side access is implemented through:

src/lib/supabase/server.ts

Browser-side access is implemented through:

src/lib/supabase/client.ts

User-owned financial data should remain scoped to the authenticated user.

Production deployments should verify that Supabase Row Level Security (RLS) policies are enabled and correctly configured for every user-owned table.

---

Environment Variables

Required:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Never commit:

.env.local

Never expose:

SUPABASE_SERVICE_ROLE_KEY

or other server-only credentials to client-side code.

---

Deployment

Money Calculator is deployed using Vercel with Supabase providing the database and authentication backend.

The production release process should include:

1. Push the validated code to "master".
2. Allow the production deployment to complete.
3. Confirm the deployment succeeds.
4. Verify authentication.
5. Perform production smoke tests.
6. Verify critical financial workflows.
7. Confirm Supabase production configuration.
8. Confirm database backup/recovery arrangements.

---

Production Release Checklist

Before accepting real financial data, verify:

- [ ] Production login works.
- [ ] Production logout works.
- [ ] Income entries work.
- [ ] Expense entries work.
- [ ] Account balances update correctly.
- [ ] Loan creation works.
- [ ] Loan repayment works.
- [ ] Loan reversal works.
- [ ] Investment workflows work.
- [ ] Deposit workflows work.
- [ ] Long-term asset workflows work.
- [ ] Asset sale works.
- [ ] Budget creation works.
- [ ] Budget archive works.
- [ ] Archived budget deletion works.
- [ ] Recurring transactions work.
- [ ] Tuition workflows work.
- [ ] Donation tracking works.
- [ ] Transaction reversal works.
- [ ] Dashboard loads correctly.
- [ ] Reports load correctly.
- [ ] Mobile layout works.
- [ ] Supabase RLS is enabled and correctly scoped.
- [ ] Production authentication redirect settings are correct.
- [ ] Database backup/recovery is configured.
- [ ] No server-only secrets are exposed to the browser.

---

Current V1 Status

Money Calculator has reached its V1 development and E2E stabilization milestone.

The release candidate includes:

- Core financial workflows
- Database/RPC financial logic
- Authentication
- Reversal and audit behavior
- Loan lifecycle
- Investment and deposit workflows
- Long-term assets
- Budgets
- Goals
- Recurring transactions
- Tuition
- Donations
- Dashboard
- Reports
- Responsive UI
- Automated testing
- Production deployment

The current "master" branch has passed the final E2E stabilization cycle, and the latest production commit has a successful Vercel deployment check.

The remaining release responsibility is operational rather than feature development: verify the deployed application with a real production smoke test and verify the live Supabase security configuration.

---

Development Philosophy

Money Calculator is intended to evolve continuously.

A release milestone means that the current scope is usable, tested, and deliverable. It does not mean development permanently ends.

Future versions can improve:

- Financial analytics
- Forecasting
- Automation
- Reporting
- Investment analysis
- Financial health insights
- Notifications
- Data visualization
- Mobile experience
- Import/export
- Backup/recovery workflows
- AI-assisted financial analysis

The goal is to build a progressively more capable personal financial operating system rather than a simple expense tracker.

---

License

This project currently does not declare a public open-source license.

Unless a license is explicitly added, the repository should be treated as source-available to the project owner. Public visibility of the repository does not automatically grant permission to reuse, modify, redistribute, or commercially exploit the source code.

