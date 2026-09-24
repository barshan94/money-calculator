import Link from "next/link";
import { getFinancialInsights } from "@/lib/intelligence/get-financial-insights";

type Severity = "info" | "warning" | "critical";

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

function severityStyle(severity: Severity) {
  if (severity === "critical") {
    return {
      border:
        "1px solid var(--destructive-border, #dc2626)",
      background:
        "var(--destructive-muted, #fef2f2)",
    };
  }

  if (severity === "warning") {
    return {
      border:
        "1px solid var(--warning-border, #d97706)",
      background:
        "var(--warning-muted, #fffbeb)",
    };
  }

  return {
    border:
      "1px solid var(--info-border, #2563eb)",
    background:
      "var(--info-muted, #eff6ff)",
  };
}

function severityLabel(severity: Severity) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}

export default async function FinancialInsightsPage() {
  const results = await getFinancialInsights();

  const totalInsights = results.reduce(
    (sum, result) => sum + result.insights.length,
    0,
  );

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <Link
          href="/reports"
          style={{
            display: "inline-block",
            marginBottom: 12,
            textDecoration: "none",
            fontSize: 14,
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
          Financial Insights
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: 760,
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          Deterministic insights generated from your existing
          financial health, trends, forecasts, goals, budgets,
          and liquidity data.
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
            No insights available
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: 560,
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            There is not enough financial data to generate
            insights yet.
          </p>
        </section>
      ) : (
        <>
          <section
            className="card"
            style={{
              marginBottom: 24,
              padding: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              <SummaryCard
                label="Currencies analyzed"
                value={String(results.length)}
              />

              <SummaryCard
                label="Total insights"
                value={String(totalInsights)}
              />
            </div>
          </section>

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
                style={{
                  minWidth: 0,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 22,
                      }}
                    >
                      {result.currency}
                    </h2>

                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      Insights based on available financial
                      data.
                    </p>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 30,
                      padding: "0 10px",
                      borderRadius: 999,
                      background:
                        "var(--surface-muted, #f3f4f6)",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {result.insights.length}{" "}
                    {result.insights.length === 1
                      ? "insight"
                      : "insights"}
                  </span>
                </div>

                {result.insights.length === 0 ? (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background:
                        "var(--surface-muted, #f3f4f6)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color:
                          "var(--muted-foreground, #666)",
                        lineHeight: 1.6,
                      }}
                    >
                      No notable conditions were detected by
                      the current rules.
                    </p>
                  </div>
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
                              minWidth: 0,
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
                              <div
                                style={{
                                  minWidth: 0,
                                  flex: "1 1 260px",
                                }}
                              >
                                <strong
                                  style={{
                                    display: "block",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {insight.title}
                                </strong>

                                <p
                                  style={{
                                    margin: "8px 0 0",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {insight.message}
                                </p>
                              </div>

                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  minHeight: 28,
                                  padding: "0 9px",
                                  borderRadius: 999,
                                  background:
                                    "rgba(255,255,255,0.65)",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {severityLabel(
                                  insight.severity,
                                )}
                              </span>
                            </div>

                            {value !== null && (
                              <div
                                style={{
                                  marginTop: 14,
                                  paddingTop: 12,
                                  borderTop:
                                    "1px solid rgba(0,0,0,0.08)",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  overflowWrap: "anywhere",
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
        </>
      )}

      <section
        className="card"
        style={{
          marginTop: 24,
          padding: 20,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontSize: 19,
          }}
        >
          Methodology
        </h2>

        <p
          style={{
            marginBottom: 0,
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.7,
          }}
        >
          These insights are produced from explicit,
          deterministic rules using existing financial
          calculations. They do not predict guaranteed
          outcomes, assign a financial health score, or
          recommend investments.
        </p>
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: 16,
        border:
          "1px solid var(--border, #ddd)",
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--muted-foreground, #666)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

