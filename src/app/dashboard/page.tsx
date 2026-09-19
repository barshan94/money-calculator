import Link from "next/link";

import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { getDashboardSummary } from "@/lib/finance/get-dashboard-summary";
import { getFinancialSummary } from "@/lib/finance/get-financial-summary";
import { formatMoney } from "@/lib/finance/format-money";

export default async function DashboardPage() {
  const [
    accounts,
    summary,
    dashboard,
  ] = await Promise.all([
    getAccountBalances(),
    getFinancialSummary(),
    getDashboardSummary(),
  ]);

  const bdtSummary = summary.BDT ?? {
    income: 0,
    expense: 0,
    profit: 0,
  };

  const activeAccounts = accounts.filter(
    (account) => !account.is_archived,
  );

  const moneyAccounts = activeAccounts.filter(
    (account) =>
      account.account_type === "asset" ||
      account.account_type === "liability",
  );

  const currencies = Array.from(
    new Set(
      moneyAccounts.map(
        (account) => account.currency,
      ),
    ),
  );

  const balancesByCurrency = currencies.map(
    (currency) => {
      const currencyAccounts =
        moneyAccounts.filter(
          (account) =>
            account.currency === currency,
        );

      const assets = currencyAccounts
        .filter(
          (account) =>
            account.account_type === "asset",
        )
        .reduce(
          (sum, account) =>
            sum + account.balance,
          0,
        );

      const liabilities =
        currencyAccounts
          .filter(
            (account) =>
              account.account_type ===
              "liability",
          )
          .reduce(
            (sum, account) =>
              sum + account.balance,
            0,
          );

      return {
        currency,
        assets,
        liabilities,
        netWorth: assets - liabilities,
      };
    },
  );

  const formatCurrencyMap = (
    values: Record<string, number>,
  ) => {
    const entries = Object.entries(values);

    if (entries.length === 0) {
      return "—";
    }

    return entries
      .map(
        ([currency, amount]) =>
          formatMoney(amount, currency),
      )
      .join(" · ");
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            Personal finance
          </p>

          <h1>Dashboard</h1>

          <p className="dashboard-subtitle">
            Your complete financial position at a glance.
          </p>
        </div>

        <Link
          href="/transactions/new"
          className="dashboard-primary-button"
        >
          + Add Transaction
        </Link>
      </header>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Monthly Overview</h2>
            <p>Your current income and spending position.</p>
          </div>

          <Link href="/reports">
            View reports →
          </Link>
        </div>

        <div className="dashboard-overview-grid">
          <div className="dashboard-card">
            <span>Income</span>
            <strong>
              {formatMoney(
                bdtSummary.income,
                "BDT",
              )}
            </strong>
          </div>

          <div className="dashboard-card">
            <span>Expenses</span>
            <strong>
              {formatMoney(
                bdtSummary.expense,
                "BDT",
              )}
            </strong>
          </div>

          <div className="dashboard-card">
            <span>Net Income</span>
            <strong>
              {formatMoney(
                bdtSummary.profit,
                "BDT",
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Financial Position</h2>
            <p>
              Money currently distributed across
              your financial activities.
            </p>
          </div>
        </div>

        <div className="dashboard-metrics-grid">
          <Link
            href="/loans"
            className="dashboard-metric-card"
          >
            <span>Money Lent</span>
            <strong>
              {formatCurrencyMap(
                dashboard.loansLent,
              )}
            </strong>
            <small>Still owed to you</small>
          </Link>

          <Link
            href="/loans"
            className="dashboard-metric-card"
          >
            <span>Money Borrowed</span>
            <strong>
              {formatCurrencyMap(
                dashboard.loansBorrowed,
              )}
            </strong>
            <small>You still owe</small>
          </Link>

          <Link
            href="/deposits"
            className="dashboard-metric-card"
          >
            <span>Deposits</span>
            <strong>
              {formatCurrencyMap(
                dashboard.deposits,
              )}
            </strong>
            <small>Active principal</small>
          </Link>

          <Link
            href="/investments"
            className="dashboard-metric-card"
          >
            <span>Investments</span>
            <strong>
              {formatCurrencyMap(
                dashboard.investments,
              )}
            </strong>
            <small>Current value</small>
          </Link>

          <Link
            href="/goals"
            className="dashboard-metric-card"
          >
            <span>Active Goals</span>
            <strong>
              {dashboard.goals.count}
            </strong>
            <small>
              {formatCurrencyMap(
                dashboard.goals.totalCurrent,
              )}{" "}
              progress
            </small>
          </Link>

          <Link
            href="/budgets"
            className="dashboard-metric-card"
          >
            <span>Budgets</span>
            <strong>
              {dashboard.budgets.count}
            </strong>
            <small>
              {dashboard.budgets.overBudget} over
              budget
            </small>
          </Link>

          <Link
            href="/recurring"
            className="dashboard-metric-card"
          >
            <span>Recurring</span>
            <strong>
              {dashboard.recurring.count}
            </strong>
            <small>Active schedules</small>
          </Link>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Net Worth</h2>
            <p>Assets minus liabilities by currency.</p>
          </div>

          <Link href="/accounts">
            View accounts →
          </Link>
        </div>

        {balancesByCurrency.length === 0 ? (
          <p className="dashboard-empty">
            No financial accounts yet.
          </p>
        ) : (
          <div className="dashboard-net-worth-grid">
            {balancesByCurrency.map(
              (item) => (
                <div
                  key={item.currency}
                  className="dashboard-net-worth-card"
                >
                  <h3>{item.currency}</h3>

                  <div>
                    <span>Assets</span>
                    <strong>
                      {formatMoney(
                        item.assets,
                        item.currency,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Liabilities</span>
                    <strong>
                      {formatMoney(
                        item.liabilities,
                        item.currency,
                      )}
                    </strong>
                  </div>

                  <div className="dashboard-net-worth-total">
                    <span>Net Worth</span>
                    <strong>
                      {formatMoney(
                        item.netWorth,
                        item.currency,
                      )}
                    </strong>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Accounts</h2>
            <p>Your active financial accounts.</p>
          </div>

          <Link href="/accounts">
            View all →
          </Link>
        </div>

        {moneyAccounts.length === 0 ? (
          <p className="dashboard-empty">
            No active accounts yet.
          </p>
        ) : (
          <div className="dashboard-accounts-grid">
            {moneyAccounts
              .slice(0, 8)
              .map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="dashboard-account-card"
                >
                  <div>
                    <h3>{account.name}</h3>
                    <span>
                      {account.account_type}
                    </span>
                  </div>

                  <strong>
                    {formatMoney(
                      account.balance,
                      account.currency,
                    )}
                  </strong>
                </Link>
              ))}
          </div>
        )}
      </section>

      <style>{`
        .dashboard-page {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 20px 60px;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 36px;
        }

        .dashboard-eyebrow {
          margin: 0 0 6px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.65;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 36px;
          line-height: 1.1;
        }

        .dashboard-subtitle {
          margin: 8px 0 0;
          opacity: 0.7;
        }

        .dashboard-primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          border: 1px solid currentColor;
        }

        .dashboard-section {
          margin-top: 34px;
        }

        .dashboard-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .dashboard-section-header h2 {
          margin: 0;
          font-size: 22px;
        }

        .dashboard-section-header p {
          margin: 5px 0 0;
          opacity: 0.65;
          font-size: 14px;
        }

        .dashboard-section-header a {
          font-weight: 700;
          text-decoration: none;
        }

        .dashboard-overview-grid,
        .dashboard-metrics-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-metrics-grid {
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
        }

        .dashboard-card,
        .dashboard-metric-card,
        .dashboard-net-worth-card,
        .dashboard-account-card {
          border: 1px solid rgba(127, 127, 127, 0.25);
          border-radius: 14px;
          padding: 18px;
        }

        .dashboard-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dashboard-card span,
        .dashboard-metric-card span {
          font-size: 13px;
          opacity: 0.65;
        }

        .dashboard-card strong {
          font-size: 24px;
        }

        .dashboard-metric-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-decoration: none;
          min-height: 118px;
        }

        .dashboard-metric-card strong {
          font-size: 22px;
        }

        .dashboard-metric-card small {
          opacity: 0.6;
        }

        .dashboard-net-worth-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(220px, 1fr)
          );
          gap: 14px;
        }

        .dashboard-net-worth-card h3 {
          margin: 0 0 16px;
          font-size: 20px;
        }

        .dashboard-net-worth-card > div {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 8px 0;
        }

        .dashboard-net-worth-card span {
          opacity: 0.65;
        }

        .dashboard-net-worth-total {
          margin-top: 8px;
          padding-top: 14px !important;
          border-top: 1px solid
            rgba(127, 127, 127, 0.2);
        }

        .dashboard-accounts-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(220px, 1fr)
          );
          gap: 14px;
        }

        .dashboard-account-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          text-decoration: none;
        }

        .dashboard-account-card h3 {
          margin: 0 0 5px;
          font-size: 16px;
        }

        .dashboard-account-card span {
          font-size: 12px;
          opacity: 0.6;
          text-transform: capitalize;
        }

        .dashboard-account-card strong {
          white-space: nowrap;
        }

        .dashboard-empty {
          opacity: 0.65;
        }

        @media (max-width: 900px) {
          .dashboard-metrics-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 640px) {
          .dashboard-page {
            padding: 24px 16px 48px;
          }

          .dashboard-header {
            align-items: stretch;
            flex-direction: column;
            margin-bottom: 28px;
          }

          .dashboard-header h1 {
            font-size: 30px;
          }

          .dashboard-primary-button {
            width: 100%;
          }

          .dashboard-section {
            margin-top: 28px;
          }

          .dashboard-section-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .dashboard-overview-grid,
          .dashboard-metrics-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-net-worth-grid,
          .dashboard-accounts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

