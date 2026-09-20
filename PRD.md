# Money Calculator — Product Requirements Document

## 1. Product Vision

Money Calculator is a comprehensive personal financial management application.

The application should allow a user to record, manage, track, analyze, and understand their complete financial life from one place.

The system must prioritize:

- Financial accuracy
- Traceability
- Reversibility
- Security
- Clear financial reporting
- Simple user experience
- Extensibility

---

## 2. Core Financial Areas

Money Calculator supports or is designed to support:

- Income
- Expenses
- Donations
- Accounts
- Transfers
- Transactions
- Categories
- Loans
- Tuition
- Deposits
- Investments
- Goals
- Budgets
- Recurring transactions
- Reports
- Liquidity
- Net worth

---

## 3. Core Product Principles

### 3.1 Ledger-first design

Financial balances should be derived from financial records rather than maintained as unreliable duplicated state.

### 3.2 Traceability

Every important financial movement should be traceable to its originating record.

### 3.3 Reversibility

Where a financial action can be reversed, the system should preserve the original event and record the reversal rather than silently destroying history.

### 3.4 Security

Users must only be able to access and modify their own financial data.

### 3.5 Backend validation

Financial rules must be enforced on the backend/database layer and must not rely only on UI validation.

### 3.6 Consistency

Related modules must remain financially consistent.

For example:

- A loan should affect the appropriate account.
- A tuition payment should affect the appropriate account.
- A deposit withdrawal should affect the appropriate accounts.
- An investment purchase should affect the appropriate account.
- A recurring transaction should create a normal transaction through the financial ledger.

---

## 4. Current Financial Modules

### Accounts

Users can manage financial accounts and their balances.

Accounts may include:

- Bank
- Cash
- Mobile financial services
- Other assets
- Liabilities
- System accounts

System accounts must be protected from normal user deletion or inappropriate modification.

### Transactions

Transactions are the core financial ledger.

Supported lifecycle concepts include:

- Create
- Edit
- Void
- Reversal
- Audit history

### Loans

Loans support:

- Money lent
- Money borrowed
- Loan creation
- Repayment
- Repayment editing
- Repayment cancellation/reversal
- Remaining balance
- Reliability
- Loan status

### Tuition

Tuition supports:

- Students
- Guardians
- Monthly fees
- Payments
- Partial payments
- Unpaid status
- Reliability
- Late tracking
- Account integration

### Deposits

Deposits support:

- Fixed deposits
- Savings deposits
- Security deposits
- Other deposits
- Interest rate
- Maturity amount
- Withdrawal
- Account integration
- Deposit status

### Investments

Investments support:

- Investment creation
- Buying
- Selling
- Current value
- Performance
- Editing
- Closing/archiving
- Historical transactions

### Goals

Goals support:

- Target amount
- Current progress
- Progress updates
- Completion/cancellation

### Budgets

Budgets support:

- Expense category
- Budget amount
- Spending
- Remaining amount
- Progress
- Period
- Archive

### Recurring Transactions

Recurring transactions support:

- Scheduled transactions
- Frequency
- Next run date
- Manual execution
- Automatic due processing
- Editing
- Pausing

### Categories

Categories support:

- Income categories
- Expense categories
- Category ledger accounts
- Renaming
- Type changes where allowed
- Archive/delete protection

---

## 5. Reporting

The application should provide understandable financial reports including:

- Income vs expenses
- Account balances
- Monthly trends
- Loans
- Deposits
- Investments
- Goals
- Liquidity
- Net worth

Reports should use the underlying financial data rather than duplicated manually maintained totals.

---

## 6. Dashboard

The dashboard should provide a concise financial overview.

It should eventually include:

- Money lent
- Money borrowed
- Deposits
- Investments
- Active goals
- Budgets
- Recurring transactions
- Monthly overview
- Net worth
- Liquidity
- Account balances

---

## 7. Security Requirements

Every user-owned financial record must be isolated by authenticated user identity.

Backend functions must validate:

- Authentication
- Ownership
- Valid account relationships
- Valid categories
- Valid currencies
- Valid financial states
- System-account restrictions

Client-side validation must never be considered sufficient security.

---

## 8. Testing Requirements

The application should use multiple testing layers.

### Unit tests

For isolated business logic and pure functions.

### Integration tests

For:

- PostgreSQL
- Supabase RPCs
- Financial lifecycle
- Ownership
- Edge cases
- Cross-module financial behavior

### End-to-end tests

For real user workflows using Playwright.

E2E testing is executed through GitHub Actions because the mobile development environment does not provide a reliable ARM64 Chromium environment.

---

## 9. Financial Intelligence — Future

The application is intended to evolve beyond bookkeeping.

Future capabilities may include:

- Cash-flow forecasting
- Spending analysis
- Savings-rate analysis
- Net-worth forecasting
- Goal forecasting
- Recurring expense forecasting
- Debt analysis
- Investment analytics
- Financial health indicators
- What-if simulations
- AI financial assistant
- Anomaly detection
- Natural-language financial queries

These features must provide analysis and transparency rather than silently modifying financial records.

---

## 10. Long-Term Vision

Money Calculator should become a complete personal financial operating system.

The long-term objective is to allow a user to answer questions such as:

- Where is my money?
- Where did my money go?
- How much do I owe?
- How much is owed to me?
- How much am I saving?
- How much can I safely spend?
- When can I reach a financial goal?
- What will my future cash flow look like?
- How are my investments performing?
- What financial patterns should I pay attention to?

All intelligence must remain grounded in the user's actual financial records.


