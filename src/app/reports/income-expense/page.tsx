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
      <header style={{ marginBottom: "28px" }}>
        <Link
          href="/reports"
          style={{
            display: "inline-block",
            marginBottom: "12px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          ← Back to Reports
        </Link>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 5vw, 36px)",
            lineHeight: 1.15,
          }}
        >
          Income vs Expenses
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: "720px",
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          Review your monthly income, expenses, and net financial
          result.
        </p>
      </header>

      {report.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            No financial data available yet
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: "560px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Add income or expense transactions to generate this
            report.
          </p>

          <Link
            href="/transactions/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              marginTop: "16px",
              padding: "0 16px",
              borderRadius: "8px",
              border: "1px solid var(--border, #ddd)",
              textDecoration: "none",
            }}
          >
            Add Transaction →
          </Link>
        </section>
      ) : (
        <>
          <section style={{ marginBottom: "32px" }}>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                Overall Summary
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Combined results across the analyzed months.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              <MetricCard
                label="Total Income"
                value={formatMoney(totalIncome)}
              />

              <MetricCard
                label="Total Expenses"
                value={formatMoney(totalExpenses)}
              />

              <MetricCard
                label="Net Result"
                value={formatMoney(totalNet)}
              />
            </div>
          </section>

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                Monthly Breakdown
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Income, expenses, and net result for each month.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
              }}
            >
              {report.map((item) => (
                <article
                  className="card"
                  key={item.month}
                  style={{
                    minWidth: 0,
                    padding: "18px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 18px",
                      fontSize: "17px",
                    }}
                  >
                    {item.month}
                  </h3>

                  <MetricRow
                    label="Income"
                    value={formatMoney(item.income)}
                  />

                  <MetricRow
                    label="Expenses"
                    value={formatMoney(item.expenses)}
                  />

                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop:
                        "1px solid var(--border, #ddd)",
                    }}
                  >
                    <MetricRow
                      label="Net Result"
                      value={formatMoney(item.net)}
                      strong
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <style>{`
        a:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 3px;
        }

        @media (max-width: 600px) {
          main {
            padding: 18px 12px 36px !important;
          }

          .card {
            padding: 16px !important;
          }

          a {
            -webkit-tap-highlight-color: transparent;
          }
        }

        @media (max-width: 420px) {
          main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="card"
      style={{
        minWidth: 0,
        padding: "18px",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "15px",
        }}
      >
        {label}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 700,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function MetricRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: "var(--muted-foreground, #666)",
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: strong ? "17px" : "15px",
          fontWeight: strong ? 700 : 600,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}

