import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LiquiditySummary = {
  currency: string;
  total_assets: number;
  immediate_liquid: number;
  near_liquid: number;
  receivables: number;
  long_term: number;
  total_liquid_and_receivable: number;
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getPercentage(value: number, total: number) {
  if (!total || total <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (value / total) * 100),
  );
}

export default async function LiquidityPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_liquidity_summary",
  );

  const liquidity = error
    ? []
    : ((data as LiquiditySummary[]) ?? []);

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
          marginBottom: "28px",
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
          Liquidity
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: "720px",
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          Understand how much of your wealth is available now,
          accessible later, owed to you, or tied up long term.
        </p>
      </header>

      {error ? (
        <section
          className="card"
          role="alert"
          style={{
            padding: "24px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Unable to load liquidity
          </h2>

          <p
            style={{
              marginBottom: 0,
              color: "var(--muted-foreground, #666)",
              overflowWrap: "anywhere",
            }}
          >
            {error.message}
          </p>
        </section>
      ) : liquidity.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            No liquidity data yet
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: "560px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Add asset accounts and transactions to see your
            liquidity position.
          </p>

          <Link
            href="/accounts/new"
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
            Create an Account →
          </Link>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "36px",
          }}
        >
          {liquidity.map((summary) => {
            const availablePercentage = getPercentage(
              summary.immediate_liquid,
              summary.total_assets,
            );

            const nearLiquidPercentage = getPercentage(
              summary.near_liquid,
              summary.total_assets,
            );

            const receivablePercentage = getPercentage(
              summary.receivables,
              summary.total_assets,
            );

            const longTermPercentage = getPercentage(
              summary.long_term,
              summary.total_assets,
            );

            const sections = [
              {
                label: "Available now",
                amount: summary.immediate_liquid,
                percentage: availablePercentage,
              },
              {
                label: "Near liquid",
                amount: summary.near_liquid,
                percentage: nearLiquidPercentage,
              },
              {
                label: "Money to receive",
                amount: summary.receivables,
                percentage: receivablePercentage,
              },
              {
                label: "Long term",
                amount: summary.long_term,
                percentage: longTermPercentage,
              },
            ];

            return (
              <section
                key={summary.currency}
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "21px",
                    }}
                  >
                    {summary.currency} Liquidity
                  </h2>

                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: "14px",
                      color:
                        "var(--muted-foreground, #666)",
                    }}
                  >
                    Asset availability by liquidity level.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <MetricCard
                    label="Total Assets"
                    value={formatAmount(
                      summary.total_assets,
                      summary.currency,
                    )}
                  />

                  <MetricCard
                    label="Available Now"
                    value={formatAmount(
                      summary.immediate_liquid,
                      summary.currency,
                    )}
                    secondary={`${availablePercentage.toFixed(1)}% of assets`}
                  />

                  <MetricCard
                    label="Near Liquid"
                    value={formatAmount(
                      summary.near_liquid,
                      summary.currency,
                    )}
                    secondary={`${nearLiquidPercentage.toFixed(1)}% of assets`}
                  />

                  <MetricCard
                    label="Money to Receive"
                    value={formatAmount(
                      summary.receivables,
                      summary.currency,
                    )}
                    secondary={`${receivablePercentage.toFixed(1)}% of assets`}
                  />
                </div>

                <section
                  className="card"
                  style={{
                    padding: "20px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "20px",
                    }}
                  >
                    Where Your Assets Are
                  </h2>

                  <p
                    style={{
                      margin: "6px 0 20px",
                      fontSize: "14px",
                      color:
                        "var(--muted-foreground, #666)",
                    }}
                  >
                    Distribution of your assets by accessibility.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gap: "18px",
                    }}
                  >
                    {sections.map((item) => (
                      <div key={item.label}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "baseline",
                            gap: "12px",
                            marginBottom: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                            }}
                          >
                            {item.label}
                          </span>

                          <strong
                            style={{
                              fontSize: "14px",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {formatAmount(
                              item.amount,
                              summary.currency,
                            )}
                          </strong>
                        </div>

                        <div
                          role="progressbar"
                          aria-label={`${item.label}: ${item.percentage.toFixed(1)} percent of assets`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Number(
                            item.percentage.toFixed(1),
                          )}
                          style={{
                            height: "8px",
                            borderRadius: "999px",
                            background:
                              "var(--border, #ddd)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${item.percentage}%`,
                              height: "100%",
                              background: "currentColor",
                              opacity: 0.75,
                            }}
                          />
                        </div>

                        <small
                          style={{
                            display: "block",
                            marginTop: "5px",
                            fontSize: "12px",
                            color:
                              "var(--muted-foreground, #666)",
                          }}
                        >
                          {item.percentage.toFixed(1)}%
                        </small>
                      </div>
                    ))}

                    <hr
                      style={{
                        width: "100%",
                        border: 0,
                        borderTop:
                          "1px solid var(--border, #ddd)",
                        margin: "2px 0",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "baseline",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>Total assets</strong>

                      <strong>
                        {formatAmount(
                          summary.total_assets,
                          summary.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </section>

                <section
                  className="card"
                  style={{
                    padding: "20px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "20px",
                    }}
                  >
                    Liquidity Interpretation
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      marginTop: "16px",
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Available now</strong> represents
                      money that is normally accessible without
                      selling an asset or waiting for repayment.
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Total assets</strong> represents
                      everything you own in this currency,
                      regardless of how quickly you can access it.
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Money to receive</strong> is still
                      an asset, but it should not be treated the
                      same as cash when planning immediate
                      spending.
                    </p>
                  </div>
                </section>
              </section>
            );
          })}
        </div>
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
      <p
        style={{
          margin: 0,
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "8px 0 0",
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

