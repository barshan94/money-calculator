import Link from "next/link";
import MonthlyIncomeExpenseChart from "@/components/reports/monthly-income-expense-chart";
import { getMonthlyIncomeExpense } from "@/lib/finance/get-monthly-income-expense";

function formatAmount(amount: number) {
  return `BDT ${Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function MonthlyTrendsPage() {
  const report = await getMonthlyIncomeExpense("BDT");

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>Monthly Trends</h1>

          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "var(--muted-foreground, #666)",
            }}
          >
            Track how your income, expenses, and monthly net
            position change over time.
          </p>
        </div>

        <Link href="/reports">← Reports</Link>
      </header>

      {report.length === 0 ? (
        <section className="card">
          <h2>No financial data available yet</h2>

          <p>
            Add income and expense transactions to start building
            your monthly trend.
          </p>

          <Link href="/transactions/new">
            Add a transaction →
          </Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 32 }}>
          <section className="card">
            <h2 style={{ marginBottom: 4 }}>
              Income & Expense Trend
            </h2>

            <p
              style={{
                marginTop: 0,
                color: "var(--muted-foreground, #666)",
              }}
            >
              Monthly financial activity in BDT.
            </p>

            <div style={{ marginTop: 24 }}>
              <MonthlyIncomeExpenseChart data={report} />
            </div>
          </section>

          <section>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 4 }}>
                Monthly Breakdown
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "var(--muted-foreground, #666)",
                }}
              >
                Detailed income, expenses, and net amount for
                each month.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {report.map((item) => {
                const isPositive = item.net >= 0;

                return (
                  <article
                    className="card"
                    key={item.month}
                  >
                    <h3
                      style={{
                        marginTop: 0,
                        marginBottom: 20,
                      }}
                    >
                      {item.month}
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span>Income</span>

                        <strong>
                          {formatAmount(item.income)}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span>Expenses</span>

                        <strong>
                          {formatAmount(item.expenses)}
                        </strong>
                      </div>

                      <hr />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <strong>Net</strong>

                        <strong>
                          {formatAmount(item.net)}
                        </strong>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        {isPositive
                          ? "Income exceeded expenses."
                          : "Expenses exceeded income."}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

