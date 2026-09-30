# Financial Model

This document explains how Money Calculator models personal finances. Every concept here maps directly to database tables and RPC functions in the actual implementation.

## Core concepts

### Accounts

An account represents a financial bucket that holds money. Every financial event moves money between accounts.

**Account types:**

| Type | Description | Examples |
|---|---|---|
| `asset` | Holds money you own | Bank, bKash, Cash, Salary |
| `liability` | Money you owe | Credit card, borrowed funds |
| `income` | Source of income (system) | Salary income, Gain on Asset Sale |
| `expense` | Category of spending (system) | Food, Transport, Loss on Asset Sale |

**System accounts** (`is_system = true`) are created automatically by RPCs. Examples:
- `Money Lent / Receivable` — tracks outstanding loans you gave
- `Money Borrowed / Payable` — tracks outstanding loans you received
- `Long-Term Assets` — tracks the cost basis of land and property
- `Gain on Long-Term Asset Sale` — records profit when selling an asset
- `Loss on Long-Term Asset Sale` — records loss when selling an asset

System accounts are not displayed as regular accounts — they are accounting constructs that make the double-entry ledger balance.

### Transactions and double-entry bookkeeping

Every financial event is recorded as a **transaction** with at least two **transaction entries** (lines). The entries must always balance:

```
Sum of all DEBIT entries = Sum of all CREDIT entries
```

This is the double-entry accounting principle. It means money never appears or disappears — it always moves from one account to another.

**Example: Recording a ৳5,000 salary**

```
Transaction: "Salary received"
  DEBIT  Bank account          ৳5,000   ← money arrives in Bank
  CREDIT Salary income account ৳5,000   ← income is recorded
```

**Example: Spending ৳500 on food**

```
Transaction: "Food expense"
  CREDIT Bank account     ৳500   ← money leaves Bank
  DEBIT  Food expense     ৳500   ← expense is recorded
```

The `validate_transaction_balance` RPC is called before any transaction is committed to ensure debits equal credits.

### Transaction status

| Status | Meaning |
|---|---|
| `posted` | Active and affecting balances |
| `voided` | Cancelled; a reversal transaction exists |

Transactions are never deleted. When a transaction is reversed, a new transaction is created with the same entries in opposite directions. The original transaction is marked `voided`.

### Account balance

An account's balance is derived from its transaction entries:

```
Balance = Opening balance
        + Sum of all DEBIT entries
        - Sum of all CREDIT entries
```

For asset accounts, a positive balance means money is present. The `get_account_balances` RPC calculates this for all of the user's accounts.

---

## Loans

### Overview

Loans track money you have lent to others (`loan_type = 'lent'`) or borrowed from others (`loan_type = 'borrowed'`).

### Loan creation

When a loan is created via `create_loan_with_transaction`:

```
DEBIT  Money Lent / Receivable   ৳X   ← asset: you are owed money
CREDIT Bank (or source account)  ৳X   ← money left your account
```

For a borrowed loan:
```
DEBIT  Bank (destination account)  ৳X   ← money arrived
CREDIT Money Borrowed / Payable    ৳X   ← liability: you owe money
```

### Repayment

When a repayment is recorded:

```
-- For a lent loan (collecting repayment):
DEBIT  Bank account              ৳X   ← money received
CREDIT Money Lent / Receivable   ৳X   ← reduces the receivable

-- For a borrowed loan (making repayment):
DEBIT  Money Borrowed / Payable  ৳X   ← reduces the liability
CREDIT Bank account              ৳X   ← money leaves
```

### Loan balance

```
Remaining = Principal - Sum of valid repayments
```

A loan is `settled` when remaining = 0. Repayments can be cancelled (reversed) — cancelled repayments do not count toward the remaining balance.

### Repayment reversal

Cancelling a repayment uses `loan_transaction_role = 'repayment_reversal'` and `reversal_of_id` to link the reversal to the original. The original repayment remains in the database for audit purposes.

---

## Long-term assets

### Overview

Long-term assets (land, property) are tracked with their cost basis:

```
Cost basis = Purchase price + Acquisition cost
```

### Asset purchase

When an asset is created via `create_long_term_asset`:

```
DEBIT  Long-Term Assets account  cost_basis   ← asset recorded at cost
CREDIT Bank (source account)     cost_basis   ← money left your account
```

### Asset sale

When an asset is sold via `sell_long_term_asset`:

```
-- Always:
DEBIT  Bank (destination)        sale_price   ← proceeds received
CREDIT Long-Term Assets          cost_basis   ← cost basis removed

-- If sale_price > cost_basis (gain):
CREDIT Gain on Long-Term Asset Sale   (sale_price - cost_basis)

-- If sale_price < cost_basis (loss):
DEBIT  Loss on Long-Term Asset Sale   (cost_basis - sale_price)
```

The transaction always balances because:
- Gain scenario: debits = sale_price, credits = cost_basis + gain = sale_price ✓
- Loss scenario: debits = sale_price + loss = cost_basis, credits = cost_basis ✓

After sale, the asset is marked `status = 'sold'` and `archived_at` is set.

---

## Net worth

```
Net Worth = Total Assets - Total Liabilities
```

Assets include:
- Cash, Bank, bKash balances
- Money lent (receivable)
- Deposits
- Investments (at current value)
- Long-term assets (at cost basis)

Liabilities include:
- Money borrowed (payable)
- Outstanding obligations

The `get_monthly_net_worth` RPC calculates net worth per month for trend analysis.

---

## Tuition

Tuition tracks expected monthly income from students.

Each student has a `monthly_fee` and a `due_day`. Each month, a payment record can be:

| Status | Meaning |
|---|---|
| `paid` | Full monthly fee received |
| `partial` | Some amount received, remainder outstanding |
| `unpaid` | Nothing received this month |

Tuition income is tracked separately from general transactions. Unpaid tuition does **not** appear as available cash — it is expected income only.

---

## Donations

The donation system tracks a 1% obligation on eligible income:

```
Donation target = Eligible income × 1%
Remaining       = Target - Amount donated
Surplus         = Amount donated - Target (if over)
```

---

## Investments and deposits

**Investments** track financial instruments (stocks, gold, mutual funds, FDR, DPS). Each investment records:
- Purchase cost
- Current value (updated manually)
- Gain/loss = Current value - Purchase cost

**Deposits** are fixed-term deposits with a principal and optional withdrawal. Withdrawals reduce the deposit balance and credit the destination account.

---

## Budgets and goals

**Budgets** set a spending limit per category per period. Budget progress is calculated by comparing the budget amount against actual spending in the relevant category.

**Goals** track savings targets with a target amount, current amount, and optional target date. Progress is `(current / target) × 100`.

---

## Recurring transactions

Recurring transactions define expected future financial events (salary, rent, subscriptions). They are processed by the `process_all_due_recurring_transactions` RPC, called via the cron endpoint. When due, they create real posted transactions in the ledger.

---

## Key accounting identity

The system enforces one fundamental rule on every transaction:

```
Σ debit entries = Σ credit entries
```

This is checked by `validate_transaction_balance` before any transaction is committed. If this check fails, the entire operation is rolled back and an error is raised.
