
### 4. `DATABASE.md`

```md
# Money Calculator — Database & Financial Rules

## 1. Database

Money Calculator uses PostgreSQL through Supabase.

Database business logic is implemented through PostgreSQL functions/RPCs where financial integrity requires server-side enforcement.

---

## 2. Core Concepts

The financial model is based around:

- Users
- Accounts
- Transactions
- Categories
- Loans
- Tuition
- Deposits
- Investments
- Goals
- Budgets
- Recurring transactions

---

## 3. Accounts

Accounts represent financial locations or financial positions.

Examples:

- Bank
- Cash
- Bkash
- Other assets
- Liabilities
- System accounts

Account rules:

- Accounts belong to users.
- System accounts require special protection.
- Currency must be validated.
- Archived accounts should not be used for new financial operations where prohibited.

---

## 4. Transactions

Transactions represent financial movements.

Important rules:

- Entries must remain balanced.
- Accounts must belong to the authenticated user or be valid protected system accounts.
- Categories must be valid for the selected transaction.
- Financial history must remain auditable.

---

## 5. Categories

Categories have:

- Name
- Category type
- Ledger account

Category types include:

- income
- expense

Category ledger accounts are system accounts.

Category deletion/type changes are restricted when financial history or dependent records exist.

---

## 6. Loans

Loans represent:

### Money Lent

An asset/receivable representing money owed to the user.

### Money Borrowed

A liability/payable representing money owed by the user.

Loan lifecycle includes:

- Create
- Balance
- Repayment
- Repayment update
- Repayment cancellation/reversal
- Status synchronization
- Reliability

Repayment reversals must preserve the original repayment record.

---

## 7. Tuition

Tuition records represent students and expected/payment history.

Supported states include:

- paid
- partial
- unpaid

Tuition payments integrate with financial accounts.

---

## 8. Deposits

Deposits represent money placed into deposit-type financial instruments.

Important values may include:

- Principal
- Currency
- Interest rate
- Maturity amount
- Start date
- Maturity date
- Status

Withdrawals must affect the appropriate financial account.

---

## 9. Investments

Investments support:

- Creation
- Purchase
- Sale
- Current value
- Performance
- Editing
- Closing/archiving

Investment cash movements must remain connected to financial accounts.

---

## 10. Goals

Goals track:

- Target amount
- Current amount
- Currency
- Progress
- Status

Goal progress must remain internally consistent.

---

## 11. Budgets

Budgets are associated with expense categories.

They track:

- Budget amount
- Spent amount
- Remaining amount
- Percentage
- Period
- Active/archived state

Budget spending should be derived from financial records where applicable.

---

## 12. Recurring Transactions

Recurring transactions contain:

- Name
- Amount
- Currency
- Frequency
- Next run date
- Transaction type
- Category
- Source account
- Destination account where applicable
- Description
- Active state

Processing due recurring transactions creates normal financial transactions.

Recurring execution must validate that referenced categories/accounts are still available.

---

## 13. Ownership

Every user-owned record must be associated with the authenticated user.

RPC functions must derive identity from authentication rather than trusting arbitrary client input.

---

## 14. SECURITY DEFINER

A `SECURITY DEFINER` function must:

1. Authenticate the caller.
2. Validate ownership.
3. Validate referenced records.
4. Validate financial relationships.
5. Prevent unauthorized mutation.

---

## 15. Financial Integrity Principle

Never solve a financial data problem by simply deleting evidence.

When possible:

```text
Original financial event
        ↓
Auditable reversal/correction
        ↓
Corrected financial state


