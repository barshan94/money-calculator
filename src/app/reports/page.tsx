import MonthlyNetWorthChart from "@/components/reports/monthly-net-worth-chart";
import { getMonthlyNetWorth } from "@/lib/finance/get-monthly-net-worth";
import { getReportsSummary } from "@/lib/finance/get-reports-summary";

const REPORT_GROUPS = [
  {
    title: "Cash Flow",
    description: "Understand income, expenses, spending patterns, and future cash flow.",
    reports: [
      ["Income vs Expenses", "/reports/income-expense"],
      ["Income & Expense Trends", "/reports/income-expense-trends"],
      ["Cash-Flow Forecast", "/reports/cash-flow-forecast"],
      ["Spending by Category", "/reports/spending-by-category"],
      ["Monthly Trends", "/reports/monthly-trends"],
    ],
  },
  {
    title: "Wealth & Net Worth",
    description: "Track your assets, liabilities, balances, and projected net worth.",
    reports: [
      ["Net-Worth Forecast", "/reports/net-worth-forecast"],
      ["Account Balances", "/reports/account-balances"],
      ["Liquidity", "/reports/liquidity"],
      ["Liquidity & Risk Warnings", "/reports/liquidity-risk"],
      ["Financial Health", "/reports/financial-health"],
    ],
  },
  {
    title: "Planning & Goals",
    description: "Review your budgets, goals, and financial planning progress.",
    reports: [
      ["Goal Forecast", "/reports/goal-forecast"],
      ["Goals", "/reports/goals"],
      ["Budget Intelligence", "/reports/budget-intelligence"],
      ["What-if Simulation", "/reports/what-if"],
      ["Financial Insights", "/reports/financial-insights"],
    ],
  },
  {
    title: "Investments",
    description: "Review investment positions and investment performance.",
    reports: [
      ["Investments", "/reports/investments"],
      ["Investment Analytics", "/reports/investment-analytics"],
      ["Deposits", "/reports/deposits"],
    ],
  },
  {
    title: "Loans",
    description: "Monitor money lent, money borrowed, and loan balances.",
    reports: [
      ["Loans", "/reports/loans"],
    ],
  },
] as const;

function formatMoney(value: number) {
  return value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function ReportsPage() {
  const summary = await getReportsSummary();

  const currencies = Array.from(
    new Set([
      ...Object.keys(summary.income),
      ...Object.keys(summary.expenses),
      ...Object.keys(summary.assets),
      ...Object.keys(summary.liabilities),
    ]),
  );

  const monthlyNetWorthByCurrency = await Promise.all(
    currencies.map(async (currency) => ({
      currency,
      data: await getMonthlyNetWorth(currency),
    })),
  );

  const hasSummaryData = currencies.length > 0;

  return (
    <main className="reports-page">
      <header className="reports-header">
        <div>
          <a className="back-link" href="/dashboard">
            ← Dashboard
          </a>

          <h1>Reports</h1>

          <p className="page-description">
            Review your financial position, cash flow, planning progress,
            investments, and other financial activity.
          </p>
        </div>
      </header>

      {!hasSummaryData ? (
        <section className="card empty-state">
          <div className="empty-icon" aria-hidden="true">
            📊
          </div>

          <h2>No report data yet</h2>

          <p>
            Add financial activity such as income, expenses, accounts, or
            other transactions to start generating reports.
          </p>

          <div className="empty-actions">
            <a className="primary-button" href="/transactions/new">
              Add Transaction
            </a>

            <a className="secondary-button" href="/accounts">
              View Accounts
            </a>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="overview-heading">
            <div className="section-heading">
              <div>
                <h2 id="overview-heading">Financial Overview</h2>
                <p>
                  Current income, expenses, assets, liabilities, and net
                  position by currency.
                </p>
              </div>
            </div>

            <div className="summary-grid">
              {currencies.map((currency) => {
                const income = summary.income[currency] ?? 0;
                const expenses = summary.expenses[currency] ?? 0;
                const assets = summary.assets[currency] ?? 0;
                const liabilities = summary.liabilities[currency] ?? 0;
                const net = income - expenses;

                return (
                  <section key={currency} className="card currency-card">
                    <div className="currency-card-header">
                      <h3>{currency}</h3>

                      <span
                        className={`net-badge ${
                          net >= 0 ? "positive" : "negative"
                        }`}
                      >
                        {net >= 0 ? "Net positive" : "Net negative"}
                      </span>
                    </div>

                    <div className="metric-list">
                      <div className="metric-row">
                        <span>Income</span>
                        <strong>{formatMoney(income)}</strong>
                      </div>

                      <div className="metric-row">
                        <span>Expenses</span>
                        <strong>{formatMoney(expenses)}</strong>
                      </div>

                      <div className="metric-row emphasis">
                        <span>Net</span>
                        <strong
                          className={net >= 0 ? "positive-text" : "negative-text"}
                        >
                          {formatMoney(net)}
                        </strong>
                      </div>

                      <div className="metric-row">
                        <span>Assets</span>
                        <strong>{formatMoney(assets)}</strong>
                      </div>

                      <div className="metric-row">
                        <span>Liabilities</span>
                        <strong>{formatMoney(liabilities)}</strong>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <section
            className="charts-section"
            aria-labelledby="net-worth-heading"
          >
            <div className="section-heading">
              <div>
                <h2 id="net-worth-heading">Net-Worth History</h2>
                <p>
                  Monthly net-worth movement based on the selected currency.
                </p>
              </div>
            </div>

            <div className="chart-stack">
              {monthlyNetWorthByCurrency.map((item) => (
                <div key={item.currency} className="chart-card card">
                  <div className="chart-card-header">
                    <h3>{item.currency} Net Worth</h3>
                  </div>

                  <div className="chart-wrapper">
                    <MonthlyNetWorthChart
                      currency={item.currency}
                      data={item.data}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section
        className="detailed-reports"
        aria-labelledby="detailed-reports-heading"
      >
        <div className="section-heading">
          <div>
            <h2 id="detailed-reports-heading">Detailed Reports</h2>
            <p>
              Choose a report category to explore a specific part of your
              finances.
            </p>
          </div>
        </div>

        <div className="report-groups">
          {REPORT_GROUPS.map((group) => (
            <section key={group.title} className="card report-group">
              <div className="report-group-header">
                <div>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>

                <span className="report-count">
                  {group.reports.length}{" "}
                  {group.reports.length === 1 ? "report" : "reports"}
                </span>
              </div>

              <div className="report-links">
                {group.reports.map(([label, href]) => (
                  <a key={href} href={href} className="report-link">
                    <span>{label}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <style>{`
        .reports-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px 56px;
        }

        .reports-header {
          margin-bottom: 28px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          margin-bottom: 10px;
          color: var(--muted-foreground, #666);
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 600;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .reports-header h1 {
          margin: 0;
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          line-height: 1.15;
        }

        .page-description {
          max-width: 760px;
          margin: 10px 0 0;
          color: var(--muted-foreground, #666);
          line-height: 1.6;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin: 28px 0 14px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 1.35rem;
        }

        .section-heading p {
          margin: 5px 0 0;
          color: var(--muted-foreground, #666);
          line-height: 1.5;
          font-size: 0.94rem;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(260px, 1fr)
          );
          gap: 16px;
        }

        .currency-card {
          padding: 18px;
        }

        .currency-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .currency-card-header h3 {
          margin: 0;
          font-size: 1.15rem;
        }

        .net-badge,
        .report-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          padding: 4px 9px;
          border-radius: 999px;
          background: var(--surface-muted, #f3f4f6);
          color: var(--muted-foreground, #666);
          font-size: 0.76rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .net-badge.positive {
          color: var(--success, #15803d);
        }

        .net-badge.negative {
          color: var(--danger, #b91c1c);
        }

        .metric-list {
          display: grid;
          gap: 0;
        }

        .metric-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border, #ddd);
        }

        .metric-row:last-child {
          border-bottom: 0;
        }

        .metric-row span {
          color: var(--muted-foreground, #666);
        }

        .metric-row strong {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .metric-row.emphasis {
          margin: 2px -6px;
          padding: 10px 6px;
          border-radius: 8px;
          background: var(--surface-muted, #f3f4f6);
        }

        .positive-text {
          color: var(--success, #15803d);
        }

        .negative-text {
          color: var(--danger, #b91c1c);
        }

        .charts-section {
          margin-top: 30px;
        }

        .chart-stack {
          display: grid;
          gap: 18px;
        }

        .chart-card {
          padding: 18px;
          overflow: hidden;
        }

        .chart-card-header {
          margin-bottom: 12px;
        }

        .chart-card-header h3 {
          margin: 0;
          font-size: 1.05rem;
        }

        .chart-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .detailed-reports {
          margin-top: 32px;
        }

        .report-groups {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(320px, 1fr)
          );
          gap: 16px;
        }

        .report-group {
          padding: 18px;
        }

        .report-group-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .report-group-header h3 {
          margin: 0;
          font-size: 1.08rem;
        }

        .report-group-header p {
          margin: 5px 0 0;
          color: var(--muted-foreground, #666);
          line-height: 1.5;
          font-size: 0.88rem;
        }

        .report-links {
          display: grid;
          gap: 8px;
        }

        .report-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid var(--border, #ddd);
          border-radius: 9px;
          color: inherit;
          text-decoration: none;
          transition:
            background-color 0.15s ease,
            border-color 0.15s ease;
        }

        .report-link:hover {
          background: var(--surface-muted, #f3f4f6);
        }

        .report-link span:last-child {
          color: var(--muted-foreground, #666);
          font-size: 1.05rem;
        }

        .empty-state {
          padding: 32px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 2rem;
          margin-bottom: 10px;
        }

        .empty-state h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .empty-state p {
          max-width: 560px;
          margin: 8px auto 0;
          color: var(--muted-foreground, #666);
          line-height: 1.6;
        }

        .empty-actions {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .primary-button,
        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 9px 16px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
        }

        .primary-button {
          background: var(--primary, #111827);
          color: var(--primary-foreground, #fff);
        }

        .secondary-button {
          border: 1px solid var(--border, #ddd);
          color: inherit;
          background: transparent;
        }

        a:focus-visible {
          outline: 3px solid var(--ring, #2563eb);
          outline-offset: 2px;
        }

        @media (max-width: 700px) {
          .reports-page {
            padding: 18px 12px 40px;
          }

          .reports-header {
            margin-bottom: 20px;
          }

          .section-heading {
            align-items: flex-start;
            margin-top: 24px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .report-groups {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .reports-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .currency-card,
          .chart-card,
          .report-group {
            padding: 14px;
          }

          .currency-card-header,
          .report-group-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .net-badge,
          .report-count {
            align-self: flex-start;
          }

          .metric-row {
            gap: 10px;
          }

          .metric-row strong {
            max-width: 58%;
            overflow-wrap: anywhere;
          }

          .empty-actions {
            flex-direction: column;
          }

          .primary-button,
          .secondary-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

