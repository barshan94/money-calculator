import Link from "next/link";
import { getIncomeExpenseTrends } from "@/lib/intelligence/get-income-expense-trends";

type Direction =
  | "up"
  | "down"
  | "stable"
  | "insufficient-data";

function formatMoney(
  value: number | null,
  currency: string,
): string {
  if (value === null) {
    return "Not available";
  }

  return `${currency} ${value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercentage(
  value: number | null,
): string {
  if (value === null) {
    return "Not available";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function directionLabel(direction: Direction): string {
  switch (direction) {
    case "up":
      return "↑ Up";
    case "down":
      return "↓ Down";
    case "stable":
      return "→ Stable";
    default:
      return "Not enough data";
  }
}

function directionStyle(direction: Direction) {
  if (direction === "up") {
    return {
      color: "var(--success-foreground, #15803d)",
      background:
        "var(--success-muted, #dcfce7)",
    };
  }

  if (direction === "down") {
    return {
      color: "var(--destructive-foreground, #b91c1c)",
      background:
        "var(--destructive-muted, #fee2e2)",
    };
  }

  return {
    color: "inherit",
    background:
      "var(--surface-muted, #f3f4f6)",
  };
}

function MetricCard({
  label,
  value,
  explanation,
}: {
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <div
      className="card"
      style={{
        minWidth: 0,
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "var(--muted-foreground, #666)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "12px",
          color: "var(--muted-foreground, #666)",
          lineHeight: 1.5,
        }}
      >
        {explanation}
      </div>
    </div>
  );
}

export default async function IncomeExpenseTrendsPage() {
  const results = await getIncomeExpenseTrends();

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
          Income & Expense Trends
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: "760px",
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          See how your income, expenses, and monthly net result
          are changing based on your recorded financial history.
        </p>
      </header>

      {results.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Not enough data
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: "560px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            There is not enough historical income and expense
            data to calculate a trend yet.
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
        <div
          style={{
            display: "grid",
            gap: "28px",
          }}
        >
          {results.map(({ currency, trends }) => (
            <section
              key={currency}
              className="card"
              style={{
                minWidth: 0,
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "22px",
                    }}
                  >
                    {currency}
                  </h2>

                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "13px",
                      color:
                        "var(--muted-foreground, #666)",
                    }}
                  >
                    {trends.monthsAnalyzed} month
                    {trends.monthsAnalyzed === 1
                      ? ""
                      : "s"}{" "}
                    analyzed
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                <MetricCard
                  label="Average monthly income"
                  value={formatMoney(
                    trends.averageIncome,
                    currency,
                  )}
                  explanation="Average recorded income across the analyzed months."
                />

                <MetricCard
                  label="Average monthly expenses"
                  value={formatMoney(
                    trends.averageExpenses,
                    currency,
                  )}
                  explanation="Average recorded expenses across the analyzed months."
                />

                <MetricCard
                  label="Average monthly net"
                  value={formatMoney(
                    trends.averageNet,
                    currency,
                  )}
                  explanation="Average income remaining after recorded expenses."
                />

                <MetricCard
                  label="Latest income"
                  value={formatMoney(
                    trends.latestIncome,
                    currency,
                  )}
                  explanation="Income recorded in the latest analyzed month."
                />

                <MetricCard
                  label="Latest expenses"
                  value={formatMoney(
                    trends.latestExpenses,
                    currency,
                  )}
                  explanation="Expenses recorded in the latest analyzed month."
                />

                <MetricCard
                  label="Latest net"
                  value={formatMoney(
                    trends.latestNet,
                    currency,
                  )}
                  explanation="Latest monthly income minus expenses."
                />
              </div>

              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: "18px",
                }}
              >
                Month-to-month movement
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "12px",
                }}
              >
                {[
                  {
                    label: "Income",
                    change: trends.incomeChange,
                    direction:
                      trends.incomeDirection,
                  },
                  {
                    label: "Expenses",
                    change: trends.expenseChange,
                    direction:
                      trends.expenseDirection,
                  },
                  {
                    label: "Net",
                    change: trends.netChange,
                    direction: trends.netDirection,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      border:
                        "1px solid var(--border, #ddd)",
                      borderRadius: "12px",
                      padding: "16px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                        marginBottom: "8px",
                      }}
                    >
                      {item.label}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>
                        {formatPercentage(item.change)}
                      </strong>

                      <span
                        style={{
                          ...directionStyle(
                            item.direction,
                          ),
                          borderRadius: "999px",
                          padding: "4px 8px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {directionLabel(
                          item.direction,
                        )}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: "12px",
                        color:
                          "var(--muted-foreground, #666)",
                        lineHeight: 1.5,
                      }}
                    >
                      Compared with the previous analyzed
                      month.
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section
        style={{
          marginTop: "24px",
          padding: "16px",
          borderRadius: "12px",
          background:
            "var(--surface-muted, #f3f4f6)",
          fontSize: "13px",
          lineHeight: 1.6,
        }}
      >
        <strong>How to read this:</strong>{" "}
        Trends describe changes in your recorded financial
        history. They are descriptive indicators, not
        predictions of future income or expenses.
      </section>

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

