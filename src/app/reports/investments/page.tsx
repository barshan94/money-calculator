import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function InvestmentReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: investments, error } = await supabase
    .from("investments")
    .select(
      "id, name, investment_type, currency, invested_amount, current_value, status",
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<
    string,
    {
      invested: number;
      current: number;
    }
  >();

  for (const investment of investments ?? []) {
    const total = totals.get(investment.currency) ?? {
      invested: 0,
      current: 0,
    };

    total.invested += Number(investment.invested_amount);
    total.current += Number(investment.current_value);

    totals.set(investment.currency, total);
  }

  const hasInvestments = (investments ?? []).length > 0;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 500px",
          }}
        >
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
            Investments Report
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              maxWidth: "720px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Track invested capital, current values, and unrealized
            gain or loss.
          </p>
        </div>
      </header>

      {!hasInvestments ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            No investments available
          </h2>

          <p
            style={{
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Create an investment to start tracking its
            performance.
          </p>

          <Link
            href="/investments/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              marginTop: "12px",
              padding: "0 16px",
              borderRadius: "8px",
              border: "1px solid var(--border, #ddd)",
              textDecoration: "none",
            }}
          >
            Create Investment →
          </Link>
        </section>
      ) : (
        <>
          {Array.from(totals.entries()).map(([currency, total]) => {
            const gainLoss = total.current - total.invested;

            const returnPercentage =
              total.invested > 0
                ? (gainLoss / total.invested) * 100
                : 0;

            return (
              <section
                key={currency}
                style={{
                  marginBottom: "36px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <h2 style={{ margin: 0 }}>{currency}</h2>

                  <span
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      border: "1px solid var(--border, #ddd)",
                      borderRadius: "999px",
                      color:
                        "var(--muted-foreground, #666)",
                    }}
                  >
                    Currency
                  </span>
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
                    label="Total Invested"
                    value={formatMoney(
                      total.invested,
                      currency,
                    )}
                  />

                  <MetricCard
                    label="Current Value"
                    value={formatMoney(
                      total.current,
                      currency,
                    )}
                  />

                  <MetricCard
                    label="Gain / Loss"
                    value={formatMoney(
                      gainLoss,
                      currency,
                    )}
                    secondary={`${returnPercentage.toFixed(
                      2,
                    )}% return`}
                  />
                </div>
              </section>
            );
          })}

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>Investments</h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Select an investment to view its full details and
                performance.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
              }}
            >
              {(investments ?? []).map((investment) => {
                const invested = Number(
                  investment.invested_amount,
                );

                const current = Number(
                  investment.current_value,
                );

                const gainLoss = current - invested;

                const returnPercentage =
                  invested > 0
                    ? (gainLoss / invested) * 100
                    : 0;

                return (
                  <Link
                    href={`/investments/${investment.id}`}
                    key={investment.id}
                    style={{
                      display: "block",
                      minWidth: 0,
                      padding: "18px",
                      border:
                        "1px solid var(--border, #ddd)",
                      borderRadius: "12px",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                          lineHeight: 1.35,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {investment.name}
                      </h3>

                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "12px",
                          padding: "4px 8px",
                          border:
                            "1px solid var(--border, #ddd)",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        {investment.currency}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "12px 0 4px",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      {investment.investment_type} ·{" "}
                      {investment.status}
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gap: "14px",
                        marginTop: "16px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: "13px",
                            color:
                              "var(--muted-foreground, #666)",
                          }}
                        >
                          Invested
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize: "19px",
                            fontWeight: 600,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {formatMoney(
                            invested,
                            investment.currency,
                          )}
                        </p>
                      </div>

                      <div>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: "13px",
                            color:
                              "var(--muted-foreground, #666)",
                          }}
                        >
                          Current Value
                        </p>

                        <p
                          style={{
                            margin: 0,
                            fontSize: "21px",
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {formatMoney(
                            current,
                            investment.currency,
                          )}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "16px",
                        paddingTop: "14px",
                        borderTop:
                          "1px solid var(--border, #ddd)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        Gain / Loss:{" "}
                        <strong>
                          {formatMoney(
                            gainLoss,
                            investment.currency,
                          )}
                        </strong>
                      </p>

                      <p
                        style={{
                          margin: "5px 0 0",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        {returnPercentage.toFixed(2)}% return
                      </p>
                    </div>

                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      View investment →
                    </p>
                  </Link>
                );
              })}
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

          h2 {
            font-size: 21px;
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
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
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
          lineHeight: 1.4,
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

      {secondary && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "13px",
            color: "var(--muted-foreground, #666)",
          }}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}

