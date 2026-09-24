import Link from "next/link";

import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { getDashboardSummary } from "@/lib/finance/get-dashboard-summary";
import { getFinancialSummary } from "@/lib/finance/get-financial-summary";
import { formatMoney } from "@/lib/finance/format-money";
import { getMonthlyNetWorth } from "@/lib/finance/get-monthly-net-worth";
import { getCashFlowForecast } from "@/lib/intelligence/get-cash-flow-forecast";
import { getFinancialInsights } from "@/lib/intelligence/get-financial-insights";
import type {
  FinancialInsight,
  FinancialInsightSeverity,
} from "@/lib/intelligence/calculate-financial-insights";

function formatInsightValue(
  insight: FinancialInsight,
  currency: string,
) {
  if (insight.value === undefined) {
    return null;
  }

  switch (insight.unit) {
    case "currency":
      return formatMoney(insight.value, currency);

    case "percent":
      return `${insight.value.toFixed(1)}%`;

    case "months":
      return `${insight.value.toFixed(1)} months`;

    case "days":
      return `${insight.value.toFixed(0)} days`;

    case "count":
      return insight.value.toFixed(0);

    default:
      return insight.value.toString();
  }
}

function severityLabel(
  severity: FinancialInsightSeverity,
) {
  switch (severity) {
    case "critical":
      return "Critical";

    case "warning":
      return "Warning";

    case "info":
      return "Info";
  }
}

function calculateGoalProgress(
  current: number,
  target: number,
) {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(target)
  ) {
    return 0;
  }

  if (target <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (current / target) * 100),
  );
}

export default async function DashboardPage() {
  const [
    accounts,
    summary,
    dashboard,
    financialInsights,
    cashFlowForecast,
  ] = await Promise.all([
    getAccountBalances(),
    getFinancialSummary(),
    getDashboardSummary(),
    getFinancialInsights(),
    getCashFlowForecast({
      lookbackMonths: 6,
      months: 6,
    }),
  ]);

  const netWorthCurrencies = [
    ...new Set(
      accounts.map((account) => account.currency),
    ),
  ];

  const netWorthHistory = await Promise.all(
    netWorthCurrencies.map(async (currency) => ({
      currency,
      history: await getMonthlyNetWorth(currency),
    })),
  );

  const netWorthByCurrency = netWorthHistory
    .map(({ currency, history }) => {
      const latest =
        history.length > 0
          ? history[history.length - 1]
          : null;

      return {
        currency,
        netWorth: latest?.net_worth ?? null,
      };
    })
    .filter(
      (
        item,
      ): item is {
        currency: string;
        netWorth: number;
      } => item.netWorth !== null,
    );

  const bdtOverview =
    summary.BDT ?? {
      income: 0,
      expense: 0,
      profit: 0,
    };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              Personal finance
            </p>

            <h1>Dashboard</h1>

            <p className="dashboard-subtitle">
              Your financial activity, position, and
              planning overview.
            </p>
          </div>
        </header>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2>Monthly Overview</h2>

              <p>
                Current financial activity in BDT.
              </p>
            </div>

            <Link href="/transactions">
              View transactions →
            </Link>
          </div>

          <div className="dashboard-overview-grid">
            <div className="dashboard-overview-card">
              <span>Income</span>

              <strong>
                {formatMoney(
                  bdtOverview.income,
                  "BDT",
                )}
              </strong>
            </div>

            <div className="dashboard-overview-card">
              <span>Expenses</span>

              <strong>
                {formatMoney(
                  bdtOverview.expense,
                  "BDT",
                )}
              </strong>
            </div>

            <div className="dashboard-overview-card">
              <span>Net</span>

              <strong>
                {formatMoney(
                  bdtOverview.profit,
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
                Current balances across major financial
                areas.
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
                {formatMoney(
                  dashboard.loansLent.BDT ?? 0,
                  "BDT",
                )}
              </strong>
            </Link>

            <Link
              href="/loans"
              className="dashboard-metric-card"
            >
              <span>Money Borrowed</span>

              <strong>
                {formatMoney(
                  dashboard.loansBorrowed.BDT ?? 0,
                  "BDT",
                )}
              </strong>
            </Link>

            <Link
              href="/deposits"
              className="dashboard-metric-card"
            >
              <span>Deposits</span>

              <strong>
                {formatMoney(
                  dashboard.deposits.BDT ?? 0,
                  "BDT",
                )}
              </strong>
            </Link>

            <Link
              href="/investments"
              className="dashboard-metric-card"
            >
              <span>Investments</span>

              <strong>
                {formatMoney(
                  dashboard.investments.BDT ?? 0,
                  "BDT",
                )}
              </strong>
            </Link>

            <Link
              href="/goals"
              className="dashboard-metric-card"
            >
              <span>Active Goals</span>

              <strong>
                {dashboard.goals.count}
              </strong>
            </Link>

            <Link
              href="/budgets"
              className="dashboard-metric-card"
            >
              <span>Budgets</span>

              <strong>
                {dashboard.budgets.count}
              </strong>
            </Link>

            <Link
              href="/recurring"
              className="dashboard-metric-card"
            >
              <span>Recurring</span>

              <strong>
                {dashboard.recurring.count}
              </strong>
            </Link>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2>Financial Insights</h2>

              <p>
                Deterministic observations from your
                financial history and current data.
              </p>
            </div>

            <Link href="/reports/financial-insights">
              View insights →
            </Link>
          </div>

          {financialInsights.length === 0 ? (
            <p className="dashboard-empty">
              No financial insights are available yet.
            </p>
          ) : (
            <div className="dashboard-insights-groups">
              {financialInsights.map(
                ({ currency, insights }) => (
                  <div
                    className="dashboard-insights-group"
                    key={currency}
                  >
                    <div className="dashboard-insights-group-header">
                      <h3>{currency}</h3>
                    </div>

                    {insights.length === 0 ? (
                      <p className="dashboard-empty">
                        No notable insights for this
                        currency.
                      </p>
                    ) : (
                      <div className="dashboard-insights-grid">
                        {insights.map(
                          (insight, index) => {
                            const value =
                              formatInsightValue(
                                insight,
                                currency,
                              );

                            return (
                              <article
                                className={`dashboard-insight-card dashboard-insight-${insight.severity}`}
                                key={`${currency}-${insight.type}-${index}`}
                              >
                                <div className="dashboard-insight-card-header">
                                  <span className="dashboard-insight-severity">
                                    {severityLabel(
                                      insight.severity,
                                    )}
                                  </span>

                                  <span className="dashboard-insight-type">
                                    {insight.type}
                                  </span>
                                </div>

                                <h3>
                                  {insight.title}
                                </h3>

                                <p>
                                  {insight.message}
                                </p>

                                {value !== null ? (
                                  <strong>
                                    {value}
                                  </strong>
                                ) : null}
                              </article>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2>Cash Flow Forecast</h2>

              <p>
                Six-month projection using the existing
                cash-flow methodology.
              </p>
            </div>

            <Link href="/reports/cash-flow-forecast">
              View forecast →
            </Link>
          </div>

          {cashFlowForecast.length === 0 ? (
            <p className="dashboard-empty">
              Not enough financial history to generate a
              cash-flow forecast.
            </p>
          ) : (
            <div className="dashboard-cash-flow-groups">
              {cashFlowForecast.map(
                ({ currency, months }) => {
                  const nextMonth = months[0];

                  if (!nextMonth) {
                    return null;
                  }

                  return (
                    <div
                      className="dashboard-cash-flow-group"
                      key={currency}
                    >
                      <div className="dashboard-cash-flow-summary">
                        <div className="dashboard-cash-flow-summary-card">
                          <span>
                            Next projected income
                          </span>

                          <strong>
                            {formatMoney(
                              nextMonth.projectedIncome,
                              currency,
                            )}
                          </strong>
                        </div>

                        <div className="dashboard-cash-flow-summary-card">
                          <span>
                            Next projected expenses
                          </span>

                          <strong>
                            {formatMoney(
                              nextMonth.projectedExpenses,
                              currency,
                            )}
                          </strong>
                        </div>

                        <div className="dashboard-cash-flow-summary-card">
                          <span>
                            Next projected net
                          </span>

                          <strong>
                            {formatMoney(
                              nextMonth.projectedNet,
                              currency,
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="dashboard-cash-flow-table-wrapper">
                        <table className="dashboard-cash-flow-table">
                          <thead>
                            <tr>
                              <th scope="col">
                                Period
                              </th>

                              <th scope="col">
                                Income
                              </th>

                              <th scope="col">
                                Expenses
                              </th>

                              <th scope="col">
                                Net
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {months.map((month) => (
                              <tr
                                key={`${currency}-${month.monthIndex}`}
                              >
                                <td>
                                  Month{" "}
                                  {month.monthIndex}
                                </td>

                                <td>
                                  {formatMoney(
                                    month.projectedIncome,
                                    currency,
                                  )}
                                </td>

                                <td>
                                  {formatMoney(
                                    month.projectedExpenses,
                                    currency,
                                  )}
                                </td>

                                <td>
                                  {formatMoney(
                                    month.projectedNet,
                                    currency,
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2>Goals & Budgets Overview</h2>

              <p>
                Progress across your active goals and
                budgets.
              </p>
            </div>
          </div>

          <div className="dashboard-planning-grid">
            <div className="dashboard-planning-card">
              <div className="dashboard-planning-card-header">
                <div>
                  <span className="dashboard-planning-label">
                    Goals
                  </span>

                  <strong>
                    {dashboard.goals.count} active
                  </strong>
                </div>

                <Link href="/goals">
                  View goals →
                </Link>
              </div>

              {dashboard.goals.count === 0 ? (
                <p className="dashboard-empty">
                  No active goals yet.
                </p>
              ) : (
                <div className="dashboard-planning-currency-list">
                  {Object.keys(
                    dashboard.goals.totalTarget,
                  )
                    .sort()
                    .map((currency) => {
                      const target =
                        dashboard.goals.totalTarget[
                          currency
                        ] ?? 0;

                      const current =
                        dashboard.goals.totalCurrent[
                          currency
                        ] ?? 0;

                      const progress =
                        calculateGoalProgress(
                          current,
                          target,
                        );

                      return (
                        <div
                          className="dashboard-goal-summary"
                          key={currency}
                        >
                          <div className="dashboard-goal-summary-header">
                            <span>{currency}</span>

                            <strong>
                              {progress.toFixed(1)}%
                            </strong>
                          </div>

                          <div
                            className="dashboard-progress-track"
                            aria-label={`${currency} goal progress ${progress.toFixed(1)} percent`}
                          >
                            <div
                              className="dashboard-progress-fill"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                          <div className="dashboard-goal-summary-values">
                            <span>
                              Current{" "}
                              {formatMoney(
                                current,
                                currency,
                              )}
                            </span>

                            <span>
                              Target{" "}
                              {formatMoney(
                                target,
                                currency,
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="dashboard-planning-card">
              <div className="dashboard-planning-card-header">
                <div>
                  <span className="dashboard-planning-label">
                    Budgets
                  </span>

                  <strong>
                    {dashboard.budgets.count} active
                  </strong>
                </div>

                <Link href="/budgets">
                  View budgets →
                </Link>
              </div>

              {dashboard.budgets.count === 0 ? (
                <p className="dashboard-empty">
                  No active budgets yet.
                </p>
              ) : (
                <div className="dashboard-budget-summary">
                  <div className="dashboard-budget-summary-row">
                    <span>
                      Active budgets
                    </span>

                    <strong>
                      {dashboard.budgets.count}
                    </strong>
                  </div>

                  <div className="dashboard-budget-summary-row">
                    <span>
                      Currently over budget
                    </span>

                    <strong>
                      {dashboard.budgets.overBudget}
                    </strong>
                  </div>

                  <p className="dashboard-planning-note">
                    Budget status is based on the
                    existing budget-progress data.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <div>
              <h2>Net Worth</h2>

              <p>
                Current financial position by currency.
              </p>
            </div>

            <Link href="/reports/net-worth-forecast">
              View forecast →
            </Link>
          </div>

          {netWorthByCurrency.length === 0 ? (
            <p className="dashboard-empty">
              No net-worth data available yet.
            </p>
          ) : (
            <div className="dashboard-net-worth-grid">
              {netWorthByCurrency.map(
                ({ currency, netWorth }) => (
                  <div
                    className="dashboard-net-worth-card"
                    key={currency}
                  >
                    <span>{currency}</span>

                    <strong>
                      {formatMoney(
                        netWorth,
                        currency,
                      )}
                    </strong>
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

              <p>
                Current balances in your active
                accounts.
              </p>
            </div>

            <Link href="/accounts">
              View accounts →
            </Link>
          </div>

          {accounts.length === 0 ? (
            <p className="dashboard-empty">
              No active accounts found.
            </p>
          ) : (
            <div className="dashboard-accounts-list">
              {accounts
                .slice(0, 8)
                .map((account) => (
                  <div
                    className="dashboard-account-row"
                    key={account.id}
                  >
                    <div>
                      <strong>
                        {account.name}
                      </strong>

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
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .dashboard-page {
          min-height: 100vh;
          padding: 32px 20px 64px;
        }

        .dashboard-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 32px;
        }

        .dashboard-eyebrow {
          margin: 0 0 6px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.6;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.05;
        }

        .dashboard-subtitle {
          max-width: 680px;
          margin: 10px 0 0;
          opacity: 0.68;
        }

        .dashboard-section {
          margin-top: 28px;
          padding: 22px;
          border: 1px solid rgba(
            127,
            127,
            127,
            0.2
          );
          border-radius: 18px;
        }

        .dashboard-section-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .dashboard-section-header h2 {
          margin: 0;
          font-size: 21px;
        }

        .dashboard-section-header p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.65;
        }

        .dashboard-section-header a {
          flex-shrink: 0;
          font-size: 14px;
        }

        .dashboard-overview-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-overview-card,
        .dashboard-metric-card,
        .dashboard-net-worth-card,
        .dashboard-planning-card {
          border: 1px solid rgba(
            127,
            127,
            127,
            0.18
          );
          border-radius: 14px;
          padding: 16px;
        }

        .dashboard-overview-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dashboard-overview-card span,
        .dashboard-metric-card span,
        .dashboard-net-worth-card span {
          font-size: 13px;
          opacity: 0.65;
        }

        .dashboard-overview-card strong {
          font-size: 23px;
        }

        .dashboard-metrics-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-metric-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-decoration: none;
        }

        .dashboard-metric-card:hover {
          transform: translateY(-1px);
        }

        .dashboard-metric-card strong {
          font-size: 20px;
        }

        .dashboard-insights-groups {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dashboard-insights-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dashboard-insights-group-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .dashboard-insights-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-insight-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 150px;
          padding: 16px;
          border: 1px solid rgba(
            127,
            127,
            127,
            0.18
          );
          border-radius: 14px;
        }

        .dashboard-insight-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .dashboard-insight-severity,
        .dashboard-insight-type {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.65;
        }

        .dashboard-insight-card h3 {
          margin: 0;
          font-size: 16px;
        }

        .dashboard-insight-card p {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          opacity: 0.72;
        }

        .dashboard-insight-card strong {
          margin-top: auto;
          font-size: 17px;
        }

        .dashboard-insight-warning,
        .dashboard-insight-critical {
          border-color: rgba(
            180,
            100,
            60,
            0.35
          );
        }

        .dashboard-insight-info {
          border-color: rgba(
            90,
            130,
            180,
            0.3
          );
        }

        .dashboard-cash-flow-groups {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dashboard-cash-flow-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dashboard-cash-flow-summary {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-cash-flow-summary-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dashboard-cash-flow-summary-card span {
          font-size: 13px;
          opacity: 0.65;
        }

        .dashboard-cash-flow-summary-card strong {
          font-size: 20px;
        }

        .dashboard-cash-flow-table-wrapper {
          overflow-x: auto;
          border: 1px solid rgba(
            127,
            127,
            127,
            0.25
          );
          border-radius: 14px;
        }

        .dashboard-cash-flow-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
        }

        .dashboard-cash-flow-table th,
        .dashboard-cash-flow-table td {
          padding: 12px 14px;
          text-align: right;
          border-bottom: 1px solid
            rgba(127, 127, 127, 0.15);
          white-space: nowrap;
        }

        .dashboard-cash-flow-table th:first-child,
        .dashboard-cash-flow-table td:first-child {
          text-align: left;
        }

        .dashboard-cash-flow-table th {
          font-size: 12px;
          opacity: 0.65;
        }

        .dashboard-cash-flow-table tr:last-child td {
          border-bottom: 0;
        }

        .dashboard-planning-grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-planning-card {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .dashboard-planning-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .dashboard-planning-card-header > div {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dashboard-planning-card-header a {
          flex-shrink: 0;
          font-size: 14px;
        }

        .dashboard-planning-label {
          font-size: 13px;
          opacity: 0.6;
        }

        .dashboard-planning-card-header strong {
          font-size: 20px;
        }

        .dashboard-planning-currency-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .dashboard-goal-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dashboard-goal-summary-header,
        .dashboard-goal-summary-values,
        .dashboard-budget-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .dashboard-goal-summary-header {
          font-size: 14px;
        }

        .dashboard-goal-summary-values {
          font-size: 12px;
          opacity: 0.65;
        }

        .dashboard-progress-track {
          width: 100%;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(
            127,
            127,
            127,
            0.15
          );
        }

        .dashboard-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: currentColor;
        }

        .dashboard-budget-summary {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .dashboard-budget-summary-row {
          padding-bottom: 12px;
          border-bottom: 1px solid
            rgba(127, 127, 127, 0.15);
        }

        .dashboard-budget-summary-row:last-of-type {
          border-bottom: 0;
        }

        .dashboard-planning-note {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.62;
        }

        .dashboard-net-worth-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 14px;
        }

        .dashboard-net-worth-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dashboard-net-worth-card strong {
          font-size: 21px;
        }

        .dashboard-accounts-list {
          display: flex;
          flex-direction: column;
        }

        .dashboard-account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid
            rgba(127, 127, 127, 0.15);
        }

        .dashboard-account-row:first-child {
          padding-top: 0;
        }

        .dashboard-account-row:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .dashboard-account-row > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .dashboard-account-row > div span {
          font-size: 12px;
          opacity: 0.6;
        }

        .dashboard-account-row > strong {
          flex-shrink: 0;
        }

        .dashboard-empty {
          margin: 0;
          font-size: 14px;
          opacity: 0.65;
        }

        @media (max-width: 1000px) {
          .dashboard-metrics-grid {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            );
          }

          .dashboard-insights-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        @media (max-width: 900px) {
          .dashboard-overview-grid,
          .dashboard-metrics-grid,
          .dashboard-cash-flow-summary {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .dashboard-net-worth-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .dashboard-planning-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .dashboard-page {
            padding: 24px 14px 48px;
          }

          .dashboard-section {
            padding: 16px;
            border-radius: 15px;
          }

          .dashboard-section-header {
            flex-direction: column;
          }

          .dashboard-section-header a {
            align-self: flex-start;
          }

          .dashboard-overview-grid,
          .dashboard-metrics-grid,
          .dashboard-insights-grid,
          .dashboard-cash-flow-summary,
          .dashboard-net-worth-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-account-row {
            align-items: flex-start;
          }

          .dashboard-account-row > strong {
            text-align: right;
          }

          .dashboard-goal-summary-values {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}

