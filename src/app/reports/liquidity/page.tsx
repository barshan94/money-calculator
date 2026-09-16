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
  return Math.min(100, Math.max(0, (value / total) * 100));
}

export default async function LiquidityPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_liquidity_summary");

  const liquidity = error
    ? []
    : ((data as LiquiditySummary[]) ?? []);

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
          <h1 style={{ marginBottom: 8 }}>Liquidity</h1>

          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "var(--muted-foreground, #666)",
            }}
          >
            Understand how much of your wealth is available now,
            accessible later, owed to you, or tied up long term.
          </p>
        </div>

        <Link href="/reports">← Reports</Link>
      </header>

      {error ? (
        <section className="card">
          <h2>Unable to load liquidity</h2>
          <p>{error.message}</p>
        </section>
      ) : liquidity.length === 0 ? (
        <section className="card">
          <h2>No liquidity data yet</h2>

          <p>
            Add asset accounts and transactions to see your liquidity
            position.
          </p>

          <Link href="/accounts/new">Create an account →</Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 40 }}>
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

            return (
              <section
                key={summary.currency}
                style={{
                  display: "grid",
                  gap: 20,
                }}
              >
                <div>
                  <h2 style={{ marginBottom: 4 }}>
                    {summary.currency} Liquidity
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted-foreground, #666)",
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
                    gap: 16,
                  }}
                >
                  <div className="card">
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      Total Assets
                    </p>

                    <p
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        margin: "8px 0 0",
                      }}
                    >
                      {formatAmount(
                        summary.total_assets,
                        summary.currency,
                      )}
                    </p>
                  </div>

                  <div className="card">
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      Available Now
                    </p>

                    <p
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        margin: "8px 0",
                      }}
                    >
                      {formatAmount(
                        summary.immediate_liquid,
                        summary.currency,
                      )}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: "var(--muted-foreground, #666)",
                      }}
                    >
                      {availablePercentage.toFixed(1)}% of assets
                    </p>
                  </div>

                  <div className="card">
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      Near Liquid
                    </p>

                    <p
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        margin: "8px 0",
                      }}
                    >
                      {formatAmount(
                        summary.near_liquid,
                        summary.currency,
                      )}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: "var(--muted-foreground, #666)",
                      }}
                    >
                      {nearLiquidPercentage.toFixed(1)}% of assets
                    </p>
                  </div>

                  <div className="card">
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      Money to Receive
                    </p>

                    <p
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        margin: "8px 0",
                      }}
                    >
                      {formatAmount(
                        summary.receivables,
                        summary.currency,
                      )}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color: "var(--muted-foreground, #666)",
                      }}
                    >
                      {receivablePercentage.toFixed(1)}% of assets
                    </p>
                  </div>
                </div>

                <div className="card">
                  <h2 style={{ marginBottom: 20 }}>
                    Where Your Assets Are
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: 18,
                    }}
                  >
                    {[
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
                    ].map((item) => (
                      <div key={item.label}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 16,
                            marginBottom: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>{item.label}</span>

                          <strong>
                            {formatAmount(
                              item.amount,
                              summary.currency,
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "var(--border, #ddd)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${item.percentage}%`,
                              height: "100%",
                              background:
                                "currentColor",
                              opacity: 0.75,
                            }}
                          />
                        </div>

                        <small
                          style={{
                            display: "block",
                            marginTop: 4,
                            color:
                              "var(--muted-foreground, #666)",
                          }}
                        >
                          {item.percentage.toFixed(1)}%
                        </small>
                      </div>
                    ))}

                    <hr />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
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
                </div>

                <div className="card">
                  <h2 style={{ marginBottom: 16 }}>
                    Liquidity Interpretation
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Available now</strong> represents money
                      that is normally accessible without selling an
                      asset or waiting for repayment.
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Total assets</strong> represents everything
                      you own in this currency, regardless of how quickly
                      you can access it.
                    </p>

                    <p style={{ margin: 0 }}>
                      <strong>Money to receive</strong> is still an asset,
                      but it should not be treated the same as cash when
                      planning immediate spending.
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
