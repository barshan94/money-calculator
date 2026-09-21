import Link from "next/link";
import { getIncomeExpenseTrends } from "@/lib/intelligence/get-income-expense-trends";

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

function directionLabel(
  direction:
    | "up"
    | "down"
    | "stable"
    | "insufficient-data",
): string {
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

function directionStyle(
  direction:
    | "up"
    | "down"
    | "stable"
    | "insufficient-data",
) {
  if (direction === "up") {
    return {
      color: "#15803d",
      background: "#dcfce7",
    };
  }

  if (direction === "down") {
    return {
      color: "#b91c1c",
      background: "#fee2e2",
    };
  }

  return {
    color: "inherit",
    background: "var(--surface-muted, #f3f4f6)",
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
      style={{
        border: "1px solid var(--border-color, #e5e7eb)",
        borderRadius: 12,
        padding: 16,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 13,
          opacity: 0.7,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          opacity: 0.65,
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
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Link href="/reports">← Back to Reports</Link>

        <h1
          style={{
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Income & Expense Trends
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 760,
            opacity: 0.75,
            lineHeight: 1.6,
          }}
        >
          See how your income, expenses, and monthly net result
          are changing based on your recorded financial history.
        </p>
      </div>

      {results.length === 0 ? (
        <section
          style={{
            border: "1px solid var(--border-color, #e5e7eb)",
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Not enough data
          </h2>

          <p style={{ marginBottom: 0 }}>
            There is not enough historical income and expense
            data to calculate a trend yet.
          </p>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 32,
          }}
        >
          {results.map(({ currency, trends }) => (
            <section
              key={currency}
              style={{
                border: "1px solid var(--border-color, #e5e7eb)",
                borderRadius: 16,
                padding: 20,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 22,
                    }}
                  >
                    {currency}
                  </h2>

                  <p
                    style={{
                      margin: "6px 0 0",
                      opacity: 0.7,
                      fontSize: 13,
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
                  gap: 12,
                  marginBottom: 24,
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
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                Month-to-month movement
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  {
                    label: "Income",
                    change: trends.incomeChange,
                    direction: trends.incomeDirection,
                  },
                  {
                    label: "Expenses",
                    change: trends.expenseChange,
                    direction: trends.expenseDirection,
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
                      border: "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginBottom: 8,
                      }}
                    >
                      {item.label}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
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
                          borderRadius: 999,
                          padding: "4px 8px",
                          fontSize: 12,
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
                        fontSize: 12,
                        opacity: 0.65,
                        lineHeight: 1.5,
                      }}
                    >
                      Compared with the previous
                      analyzed month.
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
          marginTop: 24,
          padding: 16,
          borderRadius: 12,
          background:
            "var(--surface-muted, #f3f4f6)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong>How to read this:</strong>{" "}
        Trends describe changes in your recorded financial
        history. They are descriptive indicators, not
        predictions of future income or expenses.
      </section>
    </main>
  );
}

