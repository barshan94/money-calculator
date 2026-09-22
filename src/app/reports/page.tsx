import MonthlyNetWorthChart from "@/components/reports/monthly-net-worth-chart";
import { getMonthlyNetWorth } from "@/lib/finance/get-monthly-net-worth";
import { getReportsSummary } from "@/lib/finance/get-reports-summary";

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

  const monthlyNetWorthByCurrency =
    await Promise.all(
      currencies.map(async (currency) => ({
        currency,
        data: await getMonthlyNetWorth(currency),
      })),
    );

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <h1>Reports</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {currencies.map((currency) => {
          const income =
            summary.income[currency] ?? 0;

          const expenses =
            summary.expenses[currency] ?? 0;

          const assets =
            summary.assets[currency] ?? 0;

          const liabilities =
            summary.liabilities[currency] ?? 0;

          const net = income - expenses;

          return (
            <section
              key={currency}
              className="card"
            >
              <h2>{currency}</h2>

              <p>
                <strong>Income:</strong>{" "}
                {income.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                <strong>Expenses:</strong>{" "}
                {expenses.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                <strong>Net:</strong>{" "}
                {net.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                <strong>Assets:</strong>{" "}
                {assets.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                <strong>Liabilities:</strong>{" "}
                {liabilities.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </section>
          );
        })}
      </section>

      <section
        style={{
          display: "grid",
          gap: 24,
          marginTop: 32,
        }}
      >
        {monthlyNetWorthByCurrency.map(
          (item) => (
            <MonthlyNetWorthChart
              key={item.currency}
              currency={item.currency}
              data={item.data}
            />
          ),
        )}
      </section>

      <section
        className="card"
        style={{ marginTop: 32 }}
      >
        <h2>Detailed Reports</h2>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 16,
          }}
        >
          {[
            [
              "Income vs Expenses",
              "/reports/income-expense",
            ],
            [
              "Income & Expense Trends",
              "/reports/income-expense-trends",
            ],
            [
              "Cash-Flow Forecast",
              "/reports/cash-flow-forecast",
            ],
            [
              "Net-Worth Forecast",
              "/reports/net-worth-forecast",
            ],
            [
              "Goal Forecast",
              "/reports/goal-forecast",
            ],
            [
              "Budget Intelligence",
              "/reports/budget-intelligence",
            ],
            [
              "Liquidity & Risk Warnings",
              "/reports/liquidity-risk",
            ],
            [
              "What-if Simulation",
              "/reports/what-if",
            ],
            [
              "Financial Insights",
              "/reports/financial-insights",
            ],
            [
              "Spending by Category",
              "/reports/spending-by-category",
            ],
            [
              "Account Balances",
              "/reports/account-balances",
            ],
            [
              "Monthly Trends",
              "/reports/monthly-trends",
            ],
            [
              "Investments",
              "/reports/investments",
            ],
            [
              "Investment Analytics",
              "/reports/investment-analytics",
            ],
            [
              "Loans",
              "/reports/loans",
            ],
            [
              "Deposits",
              "/reports/deposits",
            ],
            [
              "Goals",
              "/reports/goals",
            ],
            [
              "Liquidity",
              "/reports/liquidity",
            ],
            [
              "Financial Health",
              "/reports/financial-health",
            ],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{
                display: "block",
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
