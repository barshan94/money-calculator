import Link from "next/link";
import { ArchiveRecurringButton } from "@/components/recurring/archive-recurring-button";
import { RunRecurringButton } from "@/components/recurring/run-recurring-button";
import { ProcessDueButton } from "@/components/recurring/process-due-button";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

type TransactionType = "expense" | "income" | "transfer";

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFrequency(frequency: string) {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return frequency;
  }
}

function getTypeInfo(type: string) {
  switch (type as TransactionType) {
    case "income":
      return {
        label: "Income",
        className: "recurring-type-income",
      };
    case "expense":
      return {
        label: "Expense",
        className: "recurring-type-expense",
      };
    case "transfer":
      return {
        label: "Transfer",
        className: "recurring-type-transfer",
      };
    default:
      return {
        label: type,
        className: "recurring-type-transfer",
      };
  }
}

function getNextRunInfo(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(target.getTime())) {
    return {
      label: "Scheduled",
      className: "recurring-status-neutral",
    };
  }

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    const days = Math.abs(diffDays);

    return {
      label: `${days} day${days === 1 ? "" : "s"} overdue`,
      className: "recurring-status-overdue",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      className: "recurring-status-today",
    };
  }

  if (diffDays === 1) {
    return {
      label: "Tomorrow",
      className: "recurring-status-soon",
    };
  }

  if (diffDays <= 7) {
    return {
      label: `In ${diffDays} days`,
      className: "recurring-status-soon",
    };
  }

  return {
    label: "Scheduled",
    className: "recurring-status-neutral",
  };
}

export default async function RecurringTransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: recurring, error } = await supabase
    .from("recurring_transactions")
    .select(`
      id,
      name,
      transaction_type,
      amount,
      currency,
      frequency,
      next_run_date,
      description,
      categories (
        name
      ),
      source_account:accounts!recurring_transactions_source_account_id_fkey (
        name
      ),
      destination_account:accounts!recurring_transactions_destination_account_id_fkey (
        name
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("next_run_date");

  if (error) {
    throw new Error(error.message);
  }

  const items = recurring ?? [];

  const dueCount = items.filter((item) => {
    const target = new Date(
      `${item.next_run_date}T00:00:00`,
    );
    const today = new Date();

    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return target.getTime() <= today.getTime();
  }).length;

  const incomeCount = items.filter(
    (item) => item.transaction_type === "income",
  ).length;

  const expenseCount = items.filter(
    (item) => item.transaction_type === "expense",
  ).length;

  const transferCount = items.filter(
    (item) => item.transaction_type === "transfer",
  ).length;

  return (
    <main className="recurring-page">
      <style>{`
        .recurring-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .recurring-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .recurring-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 5vw, 34px);
          line-height: 1.2;
        }

        .recurring-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .recurring-header-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
          gap: 9px;
        }

        .recurring-primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid #0f172a;
          border-radius: 8px;
          background: #0f172a;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        .recurring-primary-button:hover {
          background: #1e293b;
        }

        .recurring-summary {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 22px;
        }

        .recurring-summary-card {
          min-width: 0;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #fff;
          padding: 14px;
        }

        .recurring-summary-label {
          margin-bottom: 6px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .recurring-summary-value {
          color: #0f172a;
          font-size: 21px;
          font-weight: 700;
        }

        .recurring-summary-note {
          margin-top: 4px;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.4;
        }

        .recurring-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(min(100%, 320px), 1fr));
          gap: 16px;
        }

        .recurring-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
        }

        .recurring-card:hover {
          border-color: #cbd5e1;
        }

        .recurring-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .recurring-card-title {
          min-width: 0;
        }

        .recurring-card-title h2 {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .recurring-type-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-top: 6px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .recurring-type-income {
          background: #ecfdf5;
          color: #047857;
        }

        .recurring-type-expense {
          background: #fef2f2;
          color: #b91c1c;
        }

        .recurring-type-transfer {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .recurring-amount {
          flex-shrink: 0;
          color: #0f172a;
          font-size: 17px;
          font-weight: 700;
          white-space: nowrap;
        }

        .recurring-next-run {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 9px;
          background: #f8fafc;
          padding: 11px 12px;
        }

        .recurring-next-run-label {
          color: #64748b;
          font-size: 12px;
        }

        .recurring-next-run-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          min-width: 0;
        }

        .recurring-next-run-date {
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          text-align: right;
        }

        .recurring-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .recurring-status-overdue {
          background: #fef2f2;
          color: #991b1b;
        }

        .recurring-status-today {
          background: #fff7ed;
          color: #9a3412;
        }

        .recurring-status-soon {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .recurring-status-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .recurring-details {
          display: grid;
          gap: 8px;
          font-size: 13px;
        }

        .recurring-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .recurring-detail-label {
          flex-shrink: 0;
          color: #64748b;
        }

        .recurring-detail-value {
          min-width: 0;
          color: #334155;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .recurring-description {
          margin: 0;
          border-radius: 8px;
          background: #f8fafc;
          padding: 11px;
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .recurring-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 8px;
          padding-top: 4px;
          border-top: 1px solid #e2e8f0;
        }

        .recurring-action-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          background: #fff;
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .recurring-action-link:hover {
          background: #f8fafc;
        }

        .recurring-empty {
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          padding: 44px 20px;
          text-align: center;
        }

        .recurring-empty h2 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 20px;
        }

        .recurring-empty p {
          max-width: 520px;
          margin: 0 auto 18px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .recurring-summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .recurring-header {
            flex-direction: column;
          }

          .recurring-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .recurring-primary-button {
            flex: 1;
          }

          .recurring-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 500px) {
          .recurring-page {
            padding: 18px 12px 36px;
          }

          .recurring-header-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .recurring-primary-button {
            width: 100%;
          }

          .recurring-summary {
            grid-template-columns: 1fr;
          }

          .recurring-card {
            padding: 15px;
          }

          .recurring-card-header {
            flex-direction: column;
          }

          .recurring-amount {
            font-size: 16px;
          }

          .recurring-next-run {
            align-items: flex-start;
          }

          .recurring-next-run-right {
            align-items: flex-end;
          }

          .recurring-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .recurring-action-link {
            width: 100%;
          }
        }
      `}</style>

      <header className="recurring-header">
        <div>
          <h1>Recurring Transactions</h1>
          <p>
            Manage scheduled income, expenses, and
            transfers.
          </p>
        </div>

        <div className="recurring-header-actions">
          <ProcessDueButton />

          <Link
            href="/recurring/new"
            className="recurring-primary-button"
          >
            + New Recurring Transaction
          </Link>
        </div>
      </header>

      {items.length > 0 && (
        <section
          className="recurring-summary"
          aria-label="Recurring transaction summary"
        >
          <div className="recurring-summary-card">
            <div className="recurring-summary-label">
              Active
            </div>
            <div className="recurring-summary-value">
              {items.length}
            </div>
            <div className="recurring-summary-note">
              Scheduled transactions
            </div>
          </div>

          <div className="recurring-summary-card">
            <div className="recurring-summary-label">
              Due
            </div>
            <div className="recurring-summary-value">
              {dueCount}
            </div>
            <div className="recurring-summary-note">
              Today or overdue
            </div>
          </div>

          <div className="recurring-summary-card">
            <div className="recurring-summary-label">
              Income
            </div>
            <div className="recurring-summary-value">
              {incomeCount}
            </div>
            <div className="recurring-summary-note">
              Active income schedules
            </div>
          </div>

          <div className="recurring-summary-card">
            <div className="recurring-summary-label">
              Expense
            </div>
            <div className="recurring-summary-value">
              {expenseCount}
            </div>
            <div className="recurring-summary-note">
              Active expense schedules
            </div>
          </div>

          <div className="recurring-summary-card">
            <div className="recurring-summary-label">
              Transfer
            </div>
            <div className="recurring-summary-value">
              {transferCount}
            </div>
            <div className="recurring-summary-note">
              Account-to-account schedules
            </div>
          </div>
        </section>
      )}

      {items.length > 0 ? (
        <div className="recurring-grid">
          {items.map((item) => {
            const category = Array.isArray(item.categories)
              ? item.categories[0]
              : item.categories;

            const source = Array.isArray(
              item.source_account,
            )
              ? item.source_account[0]
              : item.source_account;

            const destination = Array.isArray(
              item.destination_account,
            )
              ? item.destination_account[0]
              : item.destination_account;

            const runInfo = getNextRunInfo(
              item.next_run_date,
            );

            const typeInfo = getTypeInfo(
              item.transaction_type,
            );

            return (
              <section
                key={item.id}
                className="recurring-card"
              >
                <div className="recurring-card-header">
                  <div className="recurring-card-title">
                    <h2>{item.name}</h2>

                    <span
                      className={`recurring-type-badge ${typeInfo.className}`}
                    >
                      {typeInfo.label}
                    </span>
                  </div>

                  <strong className="recurring-amount">
                    {formatMoney(
                      Number(item.amount),
                      item.currency,
                    )}
                  </strong>
                </div>

                <div className="recurring-next-run">
                  <span className="recurring-next-run-label">
                    Next run
                  </span>

                  <div className="recurring-next-run-right">
                    <div className="recurring-next-run-date">
                      {formatDate(item.next_run_date)}
                    </div>

                    <span
                      className={`recurring-status ${runInfo.className}`}
                    >
                      {runInfo.label}
                    </span>
                  </div>
                </div>

                <div className="recurring-details">
                  <div className="recurring-detail-row">
                    <span className="recurring-detail-label">
                      Frequency
                    </span>

                    <strong className="recurring-detail-value">
                      {formatFrequency(item.frequency)}
                    </strong>
                  </div>

                  {category && (
                    <div className="recurring-detail-row">
                      <span className="recurring-detail-label">
                        Category
                      </span>

                      <span className="recurring-detail-value">
                        {category.name}
                      </span>
                    </div>
                  )}

                  {source && (
                    <div className="recurring-detail-row">
                      <span className="recurring-detail-label">
                        From
                      </span>

                      <span className="recurring-detail-value">
                        {source.name}
                      </span>
                    </div>
                  )}

                  {destination && (
                    <div className="recurring-detail-row">
                      <span className="recurring-detail-label">
                        To
                      </span>

                      <span className="recurring-detail-value">
                        {destination.name}
                      </span>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="recurring-description">
                    {item.description}
                  </p>
                )}

                <div className="recurring-actions">
                  <Link
                    href={`/recurring/${item.id}/edit`}
                    className="recurring-action-link"
                  >
                    Edit
                  </Link>

                  <RunRecurringButton
                    recurringId={item.id}
                  />

                  <ArchiveRecurringButton
                    recurringId={item.id}
                  />
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="recurring-empty">
          <h2>No recurring transactions yet</h2>

          <p>
            Create a recurring transaction to automate
            regular income, expenses, or transfers.
          </p>

          <Link
            href="/recurring/new"
            className="recurring-primary-button"
          >
            Create one
          </Link>
        </div>
      )}
    </main>
  );
}

