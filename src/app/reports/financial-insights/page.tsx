import { getFinancialInsights } from "@/lib/intelligence/get-financial-insights";

function formatValue(
  value: number | undefined,
  unit: string | undefined,
) {
  if (value === undefined) {
    return null;
  }

  if (unit === "percent") {
    return `${value.toFixed(1)}%`;
  }

  if (unit === "months") {
    return `${value.toFixed(2)} months`;
  }

  if (unit === "days") {
    return `${value.toFixed(0)} days`;
  }

  if (unit === "count") {
    return `${value.toFixed(0)}`;
  }

  return value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function severityStyle(
  severity: "info" | "warning" | "critical",
) {
  if (severity === "critical") {
    return {
      border: "1px solid #dc2626",
      background: "#fef2f2",
    };
  }

  if (severity === "warning") {
    return {
      border: "1px solid #d97706",
      background: "#fffbeb",
    };
  }

  return {
    border: "1px solid #2563eb",
    background: "#eff6ff",
  };
}

export default async function FinancialInsightsPage() {
  const results = await getFinancialInsights();

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1>Financial Insights</h1>

        <p>
          Deterministic insights generated from your existing
          financial health, trends, forecasts, goals, budgets,
          and liquidity data.
        </p>
      </div>

      {results.length === 0 ? (
        <section className="card">
          <h2>No insights available</h2>
          <p>
            There is not enough financial data to generate
            insights yet.
          </p>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
          }}
        >
          {results.map((result) => (
            <section
              key={result.currency}
              className="card"
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0 }}>
                  {result.currency}
                </h2>

                <span>
                  {result.insights.length}{" "}
                  {result.insights.length === 1
                    ? "insight"
                    : "insights"}
                </span>
              </div>

              {result.insights.length === 0 ? (
                <p>
                  No notable conditions were detected by
                  the current rules.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {result.insights.map(
                    (insight, index) => {
                      const value = formatValue(
                        insight.value,
                        insight.unit,
                      );

                      return (
                        <article
                          key={`${result.currency}-${insight.type}-${index}`}
                          style={{
                            ...severityStyle(
                              insight.severity,
                            ),
                            borderRadius: 10,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "flex-start",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <strong>
                                {insight.title}
                              </strong>

                              <p
                                style={{
                                  margin:
                                    "8px 0 0",
                                }}
                              >
                                {insight.message}
                              </p>
                            </div>

                            <span
                              style={{
                                fontWeight: 600,
                                textTransform:
                                  "capitalize",
                              }}
                            >
                              {insight.severity}
                            </span>
                          </div>

                          {value !== null && (
                            <div
                              style={{
                                marginTop: 12,
                                fontWeight: 600,
                              }}
                            >
                              Value: {value}
                            </div>
                          )}
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section
        className="card"
        style={{ marginTop: 24 }}
      >
        <h2>Methodology</h2>

        <p>
          These insights are produced from explicit,
          deterministic rules using existing financial
          calculations. They do not predict guaranteed
          outcomes, assign a financial health score, or
          recommend investments.
        </p>
      </section>
    </main>
  );
}
