import Link from "next/link";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";
import LoanWhatsAppButton from "@/components/loans/loan-whatsapp-button";

type Props = {
  searchParams: Promise<{
    sort?: string;
    filter?: string;
  }>;
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(timestamp: string | null) {
  if (!timestamp) return "—";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDateValue(
  timestamp: string | null,
  fallbackDate: string | null,
) {
  const value = timestamp ?? fallbackDate;

  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function getDueTimestamp(dueDate: string | null) {
  if (!dueDate) return null;

  const timestamp = new Date(`${dueDate}T00:00:00`).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function isOverdue(
  dueDate: string | null,
  remainingAmount: number,
) {
  if (!dueDate || remainingAmount <= 0) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

function isDueSoon(
  dueDate: string | null,
  remainingAmount: number,
) {
  if (!dueDate || remainingAmount <= 0) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  const difference = Math.ceil(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return difference >= 0 && difference <= 7;
}

function getDueStatus(
  dueDate: string | null,
  remainingAmount: number,
) {
  if (!dueDate || remainingAmount <= 0) {
    return {
      label: "No due date",
      className: "loan-status-neutral",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  const difference = Math.ceil(
    (due.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (difference < 0) {
    return {
      label: `${Math.abs(difference)} days overdue`,
      className: "loan-status-danger",
    };
  }

  if (difference === 0) {
    return {
      label: "Due today",
      className: "loan-status-warning",
    };
  }

  if (difference === 1) {
    return {
      label: "Due tomorrow",
      className: "loan-status-warning",
    };
  }

  if (difference <= 7) {
    return {
      label: `Due in ${difference} days`,
      className: "loan-status-warning",
    };
  }

  return {
    label: `Due ${formatDate(dueDate)}`,
    className: "loan-status-neutral",
  };
}

export default async function LoansPage({
  searchParams,
}: Props) {
  const {
    sort = "newest",
    filter = "all",
  } = await searchParams;

  const loans = await getLoanBalances();

  const activeLoans = loans.filter(
    (loan) =>
      loan.status === "active" &&
      Number(loan.remaining_amount) > 0,
  );

  const completedLoans = loans.filter(
    (loan) =>
      loan.status === "settled" ||
      loan.status === "cancelled" ||
      Number(loan.remaining_amount) <= 0,
  );

  const overdueLoans = activeLoans.filter(
    (loan) =>
      isOverdue(
        loan.due_date,
        Number(loan.remaining_amount),
      ),
  );

  const filteredActiveLoans = activeLoans.filter(
    (loan) => {
      switch (filter) {
        case "lent":
          return loan.loan_type === "lent";

        case "borrowed":
          return loan.loan_type === "borrowed";

        case "overdue":
          return isOverdue(
            loan.due_date,
            Number(loan.remaining_amount),
          );

        case "due-soon":
          return isDueSoon(
            loan.due_date,
            Number(loan.remaining_amount),
          );

        case "no-due-date":
          return !loan.due_date;

        case "all":
        default:
          return true;
      }
    },
  );

  const sortedActiveLoans = [
    ...filteredActiveLoans,
  ].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          getDateValue(
            a.start_datetime,
            a.start_date,
          ) -
          getDateValue(
            b.start_datetime,
            b.start_date,
          )
        );

      case "highest":
        return (
          Number(b.remaining_amount) -
          Number(a.remaining_amount)
        );

      case "lowest":
        return (
          Number(a.remaining_amount) -
          Number(b.remaining_amount)
        );

      case "overdue": {
        const aOverdue = isOverdue(
          a.due_date,
          Number(a.remaining_amount),
        );

        const bOverdue = isOverdue(
          b.due_date,
          Number(b.remaining_amount),
        );

        if (aOverdue !== bOverdue) {
          return aOverdue ? -1 : 1;
        }

        const aDue = getDueTimestamp(a.due_date);
        const bDue = getDueTimestamp(b.due_date);

        if (aDue === null && bDue === null) {
          return 0;
        }

        if (aDue === null) return 1;
        if (bDue === null) return -1;

        return aDue - bDue;
      }

      case "due-earliest": {
        const aDue = getDueTimestamp(a.due_date);
        const bDue = getDueTimestamp(b.due_date);

        if (aDue === null && bDue === null) {
          return 0;
        }

        if (aDue === null) return 1;
        if (bDue === null) return -1;

        return aDue - bDue;
      }

      case "due-latest": {
        const aDue = getDueTimestamp(a.due_date);
        const bDue = getDueTimestamp(b.due_date);

        if (aDue === null && bDue === null) {
          return 0;
        }

        if (aDue === null) return 1;
        if (bDue === null) return -1;

        return bDue - aDue;
      }

      case "name-az":
        return a.person_name.localeCompare(
          b.person_name,
        );

      case "name-za":
        return b.person_name.localeCompare(
          a.person_name,
        );

      case "newest":
      default:
        return (
          getDateValue(
            b.start_datetime,
            b.start_date,
          ) -
          getDateValue(
            a.start_datetime,
            a.start_date,
          )
        );
    }
  });

  const currencies = Array.from(
    new Set(
      loans.map((loan) => loan.currency),
    ),
  );

  const lentByCurrency = currencies.map(
    (currency) => ({
      currency,
      amount: activeLoans
        .filter(
          (loan) =>
            loan.loan_type === "lent" &&
            loan.currency === currency,
        )
        .reduce(
          (sum, loan) =>
            sum +
            Number(loan.remaining_amount),
          0,
        ),
    }),
  );

  const borrowedByCurrency = currencies.map(
    (currency) => ({
      currency,
      amount: activeLoans
        .filter(
          (loan) =>
            loan.loan_type === "borrowed" &&
            loan.currency === currency,
        )
        .reduce(
          (sum, loan) =>
            sum +
            Number(loan.remaining_amount),
          0,
        ),
    }),
  );

  return (
    <main>
      <div className="loan-page-header">
        <div>
          <p className="loan-eyebrow">
            Money lent & borrowed
          </p>

          <h1>Loans</h1>

          <p className="loan-page-subtitle">
            Track what you owe, what others owe
            you, and repayment progress.
          </p>
        </div>

        <Link
          href="/loans/new"
          className="loan-primary-button"
        >
          + New Loan
        </Link>
      </div>

      <section className="loan-summary-grid">
        <div className="loan-summary-card">
          <span className="loan-summary-label">
            Money Lent
          </span>

          <div className="loan-summary-values">
            {lentByCurrency.length === 0 ? (
              <strong>—</strong>
            ) : (
              lentByCurrency.map((item) => (
                <strong key={item.currency}>
                  {formatAmount(
                    item.amount,
                    item.currency,
                  )}
                </strong>
              ))
            )}
          </div>

          <span className="loan-summary-note">
            Still owed to you
          </span>
        </div>

        <div className="loan-summary-card">
          <span className="loan-summary-label">
            Money Borrowed
          </span>

          <div className="loan-summary-values">
            {borrowedByCurrency.length === 0 ? (
              <strong>—</strong>
            ) : (
              borrowedByCurrency.map((item) => (
                <strong key={item.currency}>
                  {formatAmount(
                    item.amount,
                    item.currency,
                  )}
                </strong>
              ))
            )}
          </div>

          <span className="loan-summary-note">
            Still owed by you
          </span>
        </div>

        <div className="loan-summary-card">
          <span className="loan-summary-label">
            Active Loans
          </span>

          <strong className="loan-summary-number">
            {activeLoans.length}
          </strong>

          <span className="loan-summary-note">
            Currently outstanding
          </span>
        </div>

        <div className="loan-summary-card">
          <span className="loan-summary-label">
            Overdue
          </span>

          <strong className="loan-summary-number">
            {overdueLoans.length}
          </strong>

          <span className="loan-summary-note">
            Active loans past due
          </span>
        </div>
      </section>

      <section className="loan-section">
        <div className="loan-section-header">
          <div>
            <h2>Active Loans</h2>

            <p>
              {filteredActiveLoans.length} of{" "}
              {activeLoans.length} currently
              outstanding
            </p>
          </div>

          <form
            method="GET"
            className="loan-filter-sort-form"
          >
            <div className="loan-filter-control">
              <label htmlFor="loan-filter">
                Filter
              </label>

              <select
                id="loan-filter"
                name="filter"
                defaultValue={filter}
              >
                <option value="all">
                  All loans
                </option>

                <option value="lent">
                  You lent
                </option>

                <option value="borrowed">
                  You borrowed
                </option>

                <option value="overdue">
                  Overdue
                </option>

                <option value="due-soon">
                  Due soon — 7 days
                </option>

                <option value="no-due-date">
                  No due date
                </option>
              </select>
            </div>

            <div className="loan-filter-control">
              <label htmlFor="loan-sort">
                Sort
              </label>

              <select
                id="loan-sort"
                name="sort"
                defaultValue={sort}
              >
                <option value="newest">
                  Newest first
                </option>

                <option value="oldest">
                  Oldest first
                </option>

                <option value="highest">
                  Highest outstanding
                </option>

                <option value="lowest">
                  Lowest outstanding
                </option>

                <option value="overdue">
                  Overdue first
                </option>

                <option value="due-earliest">
                  Due date — earliest
                </option>

                <option value="due-latest">
                  Due date — latest
                </option>

                <option value="name-az">
                  Name A–Z
                </option>

                <option value="name-za">
                  Name Z–A
                </option>
              </select>
            </div>

            <div className="loan-filter-actions">
              <button type="submit">
                Apply
              </button>

              <Link
                href="/loans"
                className="loan-reset-button"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        {activeLoans.length === 0 ? (
          <div className="loan-empty-state">
            <h3>No active loans</h3>

            <p>
              Loans you lend or borrow will
              appear here.
            </p>

            <Link
              href="/loans/new"
              className="loan-secondary-button"
            >
              Create your first loan
            </Link>
          </div>
        ) : sortedActiveLoans.length === 0 ? (
          <div className="loan-empty-state">
            <h3>
              No loans match this filter
            </h3>

            <p>
              Try another filter or reset the
              loan list.
            </p>

            <Link
              href="/loans"
              className="loan-secondary-button"
            >
              Reset filters
            </Link>
          </div>
        ) : (
          <div className="loan-list">
            {sortedActiveLoans.map((loan) => {
              const dueStatus = getDueStatus(
                loan.due_date,
                Number(
                  loan.remaining_amount,
                ),
              );

              const repaymentPercent =
                Math.min(
                  100,
                  Math.max(
                    0,
                    (Number(
                      loan.repaid_amount,
                    ) /
                      Number(
                        loan.principal_amount,
                      )) *
                      100,
                  ),
                );

              return (
                <article
                  key={loan.id}
                  className="loan-card"
                >
                  <div className="loan-card-top">
                    <div>
                      <Link
                        href={`/loans/${loan.id}`}
                        className="loan-person-name"
                      >
                        {loan.person_name}
                      </Link>

                      <span className="loan-type">
                        {loan.loan_type ===
                        "lent"
                          ? "You lent"
                          : "You borrowed"}
                      </span>
                    </div>

                    <span
                      className={`loan-due-status ${dueStatus.className}`}
                    >
                      {dueStatus.label}
                    </span>
                  </div>

                  <div className="loan-card-started">
                    <span>Started</span>

                    <strong>
                      {formatDateTime(
                        loan.start_datetime,
                      )}
                    </strong>
                  </div>

                  <div className="loan-card-financial">
                    <div>
                      <span>
                        Outstanding
                      </span>

                      <strong>
                        {formatAmount(
                          Number(
                            loan.remaining_amount,
                          ),
                          loan.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Principal
                      </span>

                      <strong>
                        {formatAmount(
                          Number(
                            loan.principal_amount,
                          ),
                          loan.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Repaid
                      </span>

                      <strong>
                        {formatAmount(
                          Number(
                            loan.repaid_amount,
                          ),
                          loan.currency,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="loan-progress">
                    <div className="loan-progress-track">
                      <div
                        className="loan-progress-fill"
                        style={{
                          width: `${repaymentPercent}%`,
                        }}
                      />
                    </div>

                    <span>
                      {Math.round(
                        repaymentPercent,
                      )}
                      % repaid
                    </span>
                  </div>

                  <div className="loan-card-footer">
                    <Link
                      href={`/loans/${loan.id}`}
                      className="loan-action-link"
                    >
                      View
                    </Link>

                    <Link
                      href={`/loans/${loan.id}/repay`}
                      className="loan-action-primary"
                    >
                      Repay
                    </Link>

                    {loan.whatsapp_number && (
                      <div className="loan-whatsapp-action">
                        <LoanWhatsAppButton
                          personName={
                            loan.person_name
                          }
                          phoneNumber={
                            loan.whatsapp_number
                          }
                          currency={
                            loan.currency
                          }
                          remainingAmount={Number(
                            loan.remaining_amount,
                          )}
                        />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="loan-section">
        <div className="loan-section-header">
          <div>
            <h2>Completed Loans</h2>

            <p>
              {completedLoans.length} completed
            </p>
          </div>
        </div>

        {completedLoans.length === 0 ? (
          <div className="loan-simple-empty">
            No completed loans yet.
          </div>
        ) : (
          <div className="loan-completed-list">
            {completedLoans.map((loan) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="loan-completed-row"
              >
                <div>
                  <strong>
                    {loan.person_name}
                  </strong>

                  <span>
                    {loan.loan_type ===
                    "lent"
                      ? "You lent"
                      : "You borrowed"}
                  </span>
                </div>

                <div>
                  <span>Principal</span>

                  <strong>
                    {formatAmount(
                      Number(
                        loan.principal_amount,
                      ),
                      loan.currency,
                    )}
                  </strong>
                </div>

                <span
                  className={
                    loan.status ===
                    "cancelled"
                      ? "badge-cancelled"
                      : "badge-success"
                  }
                >
                  {loan.status ===
                  "cancelled"
                    ? "Cancelled"
                    : "Settled"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="loan-reliability-link">
        <div>
          <strong>
            Loan Reliability
          </strong>

          <span>
            See repayment history and
            reliability scores.
          </span>
        </div>

        <Link href="/loans/reliability">
          View Reliability →
        </Link>
      </section>

      <style>{`
        .loan-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .loan-eyebrow {
          margin: 0 0 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--muted);
        }

        .loan-page-header h1 {
          margin: 0;
        }

        .loan-page-subtitle {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .loan-primary-button,
        .loan-secondary-button,
        .loan-action-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 700;
        }

        .loan-primary-button {
          padding: 11px 16px;
          background: var(--primary);
          color: white;
          white-space: nowrap;
        }

        .loan-secondary-button {
          padding: 9px 13px;
          border: 1px solid var(--border);
          color: var(--foreground);
          margin-top: 12px;
        }

        .loan-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 32px;
        }

        .loan-summary-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .loan-summary-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .loan-summary-values {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .loan-summary-values strong {
          font-size: 20px;
        }

        .loan-summary-number {
          display: block;
          font-size: 28px;
          line-height: 1.1;
        }

        .loan-summary-note {
          display: block;
          margin-top: 6px;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-section {
          margin-top: 32px;
        }

        .loan-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 14px;
        }

        .loan-section-header h2 {
          margin: 0;
          font-size: 15px !important;
          font-weight: 700 !important;
        }

        .loan-section-header p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-filter-sort-form {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }

        .loan-filter-control {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .loan-filter-control label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
        }

        .loan-filter-control select {
          min-width: 150px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          color: var(--foreground);
          font-size: 11px;
          cursor: pointer;
        }

        .loan-filter-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loan-filter-actions button,
        .loan-filter-actions .loan-reset-button {
          height: 34px;
          box-sizing: border-box;
        }

        .loan-filter-actions button {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--primary);
          color: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .loan-reset-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 11px;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--foreground);
          background: var(--card);
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .loan-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .loan-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .loan-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .loan-person-name {
          display: block;
          color: var(--foreground);
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
        }

        .loan-type {
          display: block;
          margin-top: 3px;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-due-status {
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .loan-status-neutral {
          background: var(--muted-background);
          color: var(--muted);
        }

        .loan-status-warning {
          background: #fff7ed;
          color: #c2410c;
        }

        .loan-status-danger {
          background: #fef2f2;
          color: var(--danger);
        }

        .loan-card-started {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          color: var(--muted);
          font-size: 10px;
        }

        .loan-card-started strong {
          color: var(--foreground);
          font-size: 11px;
          font-weight: 600;
        }

        .loan-card-financial {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 14px;
          margin-top: 22px;
        }

        .loan-card-financial span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
        }

        .loan-card-financial strong {
          font-size: 13px;
        }

        .loan-card-financial > div:first-child strong {
          font-size: 19px;
        }

        .loan-progress {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
        }

        .loan-progress-track {
          flex: 1;
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--muted-background);
        }

        .loan-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--primary);
        }

        .loan-progress > span {
          color: var(--muted);
          font-size: 10px;
          white-space: nowrap;
        }

        /* Loan actions */
        .loan-card-footer {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
          gap: 8px;
          width: 100%;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .loan-card-footer > * {
          width: 100%;
          min-width: 0;
        }

        .loan-action-link,
        .loan-action-primary,
        .loan-whatsapp-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: 0;
          min-height: 36px;
          box-sizing: border-box;
          border-radius: 8px;
          font-size: 12px;
          text-decoration: none;
          font-weight: 700;
        }

        .loan-action-link {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
        }

        .loan-action-primary {
          padding: 7px 11px;
          background: var(--primary);
          color: white;
        }

        .loan-whatsapp-action {
          overflow: hidden;
        }

        .loan-whatsapp-action > * {
          width: 100% !important;
          min-width: 0 !important;
        }

        .loan-empty-state,
        .loan-simple-empty {
          padding: 28px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
          color: var(--muted);
        }

        .loan-empty-state h3 {
          margin: 0;
          color: var(--foreground);
          font-size: 15px;
        }

        .loan-empty-state p {
          margin: 6px 0 0;
          font-size: 12px;
        }

        .loan-completed-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .loan-completed-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr auto;
          align-items: center;
          gap: 18px;
          padding: 14px 16px;
          color: var(--foreground);
          text-decoration: none;
          border-bottom: 1px solid var(--border);
        }

        .loan-completed-row:last-child {
          border-bottom: 0;
        }

        .loan-completed-row > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .loan-completed-row span {
          color: var(--muted);
          font-size: 10px;
        }

        .loan-completed-row strong {
          font-size: 13px;
        }

        .badge-success,
        .badge-cancelled {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .badge-success {
          background: #f0fdf4;
          color: var(--success);
        }

        .badge-cancelled {
          background: #fef2f2;
          color: var(--danger);
        }

        .loan-reliability-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 32px;
          padding: 16px 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .loan-reliability-link div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .loan-reliability-link strong {
          font-size: 13px;
        }

        .loan-reliability-link span {
          color: var(--muted);
          font-size: 11px;
        }

        .loan-reliability-link a {
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .loan-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .loan-list {
            grid-template-columns: 1fr;
          }

          .loan-filter-sort-form {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .loan-page-header {
            flex-direction: column;
          }

          .loan-primary-button {
            width: 100%;
          }

          .loan-summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .loan-summary-card {
            padding: 14px;
          }

          .loan-summary-values strong {
            font-size: 16px;
          }

          .loan-summary-number {
            font-size: 24px;
          }

          .loan-section-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .loan-filter-sort-form {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            width: 100%;
          }

          .loan-filter-control {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 5px;
            width: 100%;
          }

          .loan-filter-control select {
            width: 100%;
            min-width: 0;
          }

          .loan-filter-actions {
            display: flex;
            gap: 8px;
            width: 100%;
          }

          .loan-filter-actions button,
          .loan-filter-actions .loan-reset-button {
            flex: 1;
            width: auto;
          }

          .loan-card {
            padding: 15px;
          }

          .loan-card-financial {
            grid-template-columns: 1fr 1fr;
          }

          .loan-card-financial > div:first-child {
            grid-column: 1 / -1;
          }

          .loan-card-footer {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
          }

          .loan-action-link,
          .loan-action-primary,
          .loan-whatsapp-action {
            min-height: 38px;
            font-size: 11px;
          }

          .loan-completed-row {
            grid-template-columns: 1fr auto;
          }

          .loan-completed-row > div:nth-child(2) {
            display: none;
          }

          .loan-reliability-link {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}