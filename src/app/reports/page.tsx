import Link from "next/link";

import MonthlyNetWorthChart from "@/components/reports/monthly-net-worth-chart";
import { getMonthlyNetWorth } from "@/lib/finance/get-monthly-net-worth";
import { getReportsSummary } from "@/lib/finance/get-reports-summary";

export default async function ReportsPage() {
  const [summary, monthlyNetWorth] =
    await Promise.all([
      getReportsSummary(),
      getMonthlyNetWorth(),
    ]);

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <Link href="/">
          ← Back to Dashboard
        </Link>
      </div>

      <header
        style={{
          marginBottom: "32px",
        }}
      >
        <h1>Reports</h1>

        <p
          style={{
            opacity: 0.75,
          }}
        >
          Review your financial activity, trends,
          forecasts, and financial intelligence.
        </p>
      </header>

      <section
        style={{
          marginBottom: "32px",
        }}
      >
        <h2>Financial Overview</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {summary.map((item) => (
            <div
              key={item.currency}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <h3>{item.currency}</h3>

              <p>
                Income: {item.totalIncome}
              </p>

              <p>
                Expenses: {item.totalExpenses}
              </p>

              <p>
                Net: {item.net}
              </p>

              <p>
                Transactions: {item.transactionCount}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Monthly Net Worth</h2>

        {monthlyNetWorth.length === 0 ? (
          <p
            style={{
              opacity: 0.75,
            }}
          >
            No monthly net-worth data is available yet.
          </p>
        ) : (
          <div style={{ marginTop: "24px" }}>
            <MonthlyNetWorthChart
              data={monthlyNetWorth}
            />
          </div>
        )}
      </section>

      <section>
        <h2>Detailed Reports</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          {[
            ["Income vs Expenses", "/reports/income-expense"],
            [
              "Income & Expense Trends",
              "/reports/income-expense-trends",
            ],
            ["Cash-Flow Forecast", "/reports/cash-flow-forecast"],
            ["Net-Worth Forecast", "/reports/net-worth-forecast"],
            ["Goal Forecast", "/reports/goal-forecast"],
            [
              "Budget Intelligence",
              "/reports/budget-intelligence",
            ],
            [
              "Liquidity & Risk Warnings",
              "/reports/liquidity-risk",
            ],
            ["What-if Simulation", "/reports/what-if"],
            ["Spending by Category", "/reports/spending-by-category"],
            ["Account Balances", "/reports/account-balances"],
            ["Monthly Trends", "/reports/monthly-trends"],
            ["Investments", "/reports/investments"],
            ["Loans", "/reports/loans"],
            ["Deposits", "/reports/deposits"],
            ["Goals", "/reports/goals"],
            ["Liquidity", "/reports/liquidity"],
            ["Financial Health", "/reports/financial-health"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "block",
                padding: "18px",
                border: "1px solid #ddd",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {label}

              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontSize: "13px",
                  opacity: 0.65,
                }}
              >
                View report →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
