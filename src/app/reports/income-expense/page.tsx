import Link from "next/link";
import { getMonthlyIncomeExpense } from "@/lib/finance/get-monthly-income-expense";

function formatMoney(amount: number) {
  return `BDT ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function IncomeExpenseReportPage() {
  const report = await getMonthlyIncomeExpense("BDT");

  const totalIncome = report.reduce(
    (sum, item) => sum + item.income,
    0,
  );

  const totalExpenses = report.reduce(
    (sum, item) => sum + item.expenses,
    0,
  );

  const totalNet = totalIncome - totalExpenses;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <Link
        href="/reports"
        style={{
          display: "inline-block",
          marginBottom: "12px",
          textDecoration: "none",
        }}
      >
        ← Back to Reports
      </Link>

      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: 0 }}>Income vs Expenses</h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.7,
          }}
        >
          Review your monthly income, expenses, and net financial result.
        </p>
      </div>

      {report.length === 0 ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            No financial data available yet
          </h2>

          <p style={{ opacity: 0.7 }}>
            Add some income or expense transactions to generate this
            report.
          </p>

          <Link
            href="/transactions/new"
            style={{
              display: "inline-block",
              marginTop: "12px",
              textDecoration: "none",
            }}
          >
            Add Transaction →
          </Link>
        </section>
      ) : (
        <>
          <section style={{ marginBottom: "36px" }}>
            <h2>Overall Summary</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "15px",
                  }}
                >
                  Total Income
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(totalIncome)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "15px",
                  }}
                >
                  Total Expenses
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(totalExpenses)}
                </p>
              </div>

              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "15px",
                  }}
                >
                  Net Result
                </h3>

                <p
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(totalNet)}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2>Monthly Breakdown</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
                marginTop: "16px",
              }}
            >
              {report.map((item) => (
                <div
                  className="card"
                  key={item.month}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    padding: "18px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      fontSize: "18px",
                    }}
                  >
                    {item.month}
                  </h3>

                  <div style={{ marginBottom: "12px" }}>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      Income
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        fontWeight: 600,
                      }}
                    >
                      {formatMoney(item.income)}
                    </p>
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      Expenses
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        fontWeight: 600,
                      }}
                    >
                      {formatMoney(item.expenses)}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #ddd",
                      paddingTop: "12px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      Net Result
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "21px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(item.net)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
