import Link from "next/link";
import { getReportsSummary } from "@/lib/finance/get-reports-summary";
import { getMonthlyNetWorth } from "@/lib/finance/get-monthly-net-worth";
import MonthlyNetWorthChart from "@/components/reports/monthly-net-worth-chart";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              marginBottom: "10px",
              textDecoration: "none",
            }}
          >
            ← Back to Dashboard
          </Link>

          <h1 style={{ margin: 0 }}>Reports & Analytics</h1>

          <p
            style={{
              margin: "8px 0 0",
              opacity: 0.7,
            }}
          >
            Track your financial position, income, expenses, and progress.
          </p>
        </div>
      </div>

      {currencies.length === 0 && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No financial data yet</h2>
          <p style={{ opacity: 0.7 }}>
            Start adding accounts and transactions to see your financial
            reports here.
          </p>

          <Link
            href="/transactions/new"
            style={{
              display: "inline-block",
              marginTop: "12px",
              textDecoration: "none",
            }}
          >
            Add a Transaction →
          </Link>
        </section>
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
          <section
            key={currency}
            style={{
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0 }}>{currency}</h2>

              <span
                style={{
                  fontSize: "13px",
                  padding: "4px 8px",
                  borderRadius: "999px",
                  border: "1px solid #ddd",
                  opacity: 0.75,
                }}
              >
                Currency
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
                  Total Income
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(income, currency)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
                  Total Expenses
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(expenses, currency)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
                  Net Result
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(netResult, currency)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
                  Total Assets
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(assets, currency)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
                  Total Liabilities
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(liabilities, currency)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
                  Net Worth
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(netWorth, currency)}
                </p>
              </div>
            </div>

            {monthlyNetWorth.length > 0 && (
              <div
                style={{
                  marginTop: "24px",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "20px",
                  overflow: "hidden",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Net Worth Trend</h3>

                <MonthlyNetWorthChart data={monthlyNetWorth} />
              </div>
            )}
          </section>
        );
      })}

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
            ["Spending by Category", "/reports/spending-by-category"],
            ["Account Balances", "/reports/account-balances"],
            ["Monthly Trends", "/reports/monthly-trends"],
            ["Investments", "/reports/investments"],
            ["Loans", "/reports/loans"],
            ["Deposits", "/reports/deposits"],
            ["Goals", "/reports/goals"],
            ["Liquidity", "/reports/liquidity"],
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

