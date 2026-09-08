import Link from "next/link";
import { getReportsSummary } from "@/lib/finance/get-reports-summary";
import { getMonthlyNetWorth } from "@/lib/finance/get-monthly-net-worth";
import MonthlyNetWorthChart from "@/components/reports/monthly-net-worth-chart";

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

  return (
    <main>
      <Link href="/dashboard">← Back to Dashboard</Link>

      <h1>Reports & Analytics</h1>

      {currencies.length === 0 && (
        <p>No financial data available yet.</p>
      )}

      {currencies.map((currency) => {
        const income = summary.income[currency] ?? 0;
        const expenses = summary.expenses[currency] ?? 0;
        const assets = summary.assets[currency] ?? 0;
        const liabilities = summary.liabilities[currency] ?? 0;

        const netResult = income - expenses;
        const netWorth = assets - liabilities;

        const monthlyNetWorth =
          monthlyNetWorthByCurrency.find(
            (item) => item.currency === currency,
          )?.data ?? [];

        return (
          <section key={currency}>
            <h2>{currency}</h2>

            <div className="card-grid">
              <div className="card">
                <h3>Total Income</h3>
                <p>
                  {currency}{" "}
                  {income.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Total Expenses</h3>
                <p>
                  {currency}{" "}
                  {expenses.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Net Result</h3>
                <p>
                  {currency}{" "}
                  {netResult.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Total Assets</h3>
                <p>
                  {currency}{" "}
                  {assets.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Total Liabilities</h3>
                <p>
                  {currency}{" "}
                  {liabilities.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Net Worth</h3>
                <p>
                  {currency}{" "}
                  {netWorth.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {monthlyNetWorth.length > 0 && (
              <MonthlyNetWorthChart
                data={monthlyNetWorth}
              />
            )}
          </section>
        );
      })}

      <section>
        <h2>Detailed Reports</h2>

        <ul>
          <li>
            <Link href="/reports/income-expense">
              Income vs Expenses
            </Link>
          </li>

          <li>
            <Link href="/reports/spending-by-category">
              Spending by Category
            </Link>
          </li>

          <li>
            <Link href="/reports/account-balances">
              Account Balances
            </Link>
          </li>

          <li>
            <Link href="/reports/monthly-trends">
              Monthly Trends
            </Link>
          </li>

          <li>
            <Link href="/reports/investments">
              Investments
            </Link>
          </li>

          <li>
            <Link href="/reports/loans">
              Loans
            </Link>
          </li>

          <li>
            <Link href="/reports/deposits">
              Deposits
            </Link>
          </li>

          <li>
            <Link href="/reports/goals">
              Goals
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}