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

function formatAmount(
  amount: number,
  currency: string,
) {
  return `${currency} ${Number(amount).toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

export default async function LiquidityPage() {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_liquidity_summary",
  );

  const liquidity =
    error
      ? []
      : ((data as LiquiditySummary[]) ?? []);

  return (
    <main>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1>Liquidity</h1>

          <p>
            Understand how much of your wealth is
            available now, accessible later, or
            tied up elsewhere.
          </p>
        </div>

        <Link href="/reports">
          ← Reports
        </Link>
      </div>

      {error ? (
        <section className="card">
          <h2>Unable to load liquidity</h2>
          <p>{error.message}</p>
        </section>
      ) : liquidity.length === 0 ? (
        <section className="card">
          <h2>No liquidity data yet</h2>

          <p>
            Add asset accounts and transactions to
            see your liquidity position.
          </p>
        </section>
      ) : (
        liquidity.map((summary) => (
          <section
            key={summary.currency}
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <div className="card">
                <h3>Total Assets</h3>

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
                <h3>Available Now</h3>

                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    margin: "8px 0 0",
                  }}
                >
                  {formatAmount(
                    summary.immediate_liquid,
                    summary.currency,
                  )}
                </p>

                <p>
                  Money you can normally access
                  immediately.
                </p>
              </div>

              <div className="card">
                <h3>Near Liquid</h3>

                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    margin: "8px 0 0",
                  }}
                >
                  {formatAmount(
                    summary.near_liquid,
                    summary.currency,
                  )}
                </p>

                <p>
                  Assets that may require some time
                  or action to access.
                </p>
              </div>

              <div className="card">
                <h3>Money to Receive</h3>

                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    margin: "8px 0 0",
                  }}
                >
                  {formatAmount(
                    summary.receivables,
                    summary.currency,
                  )}
                </p>

                <p>
                  Money currently owed to you.
                </p>
              </div>
            </div>

            <div className="card">
              <h2>Where Your Assets Are</h2>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                  }}
                >
                  <span>
                    Available now
                  </span>

                  <strong>
                    {formatAmount(
                      summary.immediate_liquid,
                      summary.currency,
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                  }}
                >
                  <span>
                    Near liquid
                  </span>

                  <strong>
                    {formatAmount(
                      summary.near_liquid,
                      summary.currency,
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                  }}
                >
                  <span>
                    Money to receive
                  </span>

                  <strong>
                    {formatAmount(
                      summary.receivables,
                      summary.currency,
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                  }}
                >
                  <span>
                    Long term
                  </span>

                  <strong>
                    {formatAmount(
                      summary.long_term,
                      summary.currency,
                    )}
                  </strong>
                </div>

                <hr />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                  }}
                >
                  <strong>
                    Total assets
                  </strong>

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
              <h2>Liquidity Interpretation</h2>

              <p>
                <strong>
                  Available now
                </strong>{" "}
                tells you how much money is readily
                accessible without selling or waiting
                for another person to repay you.
              </p>

              <p>
                <strong>
                  Total assets
                </strong>{" "}
                tells you how much you own overall.
                These two numbers can be very
                different.
              </p>

              <p>
                For example, money lent to someone is
                still your asset, but it is not
                immediately spendable cash.
              </p>
            </div>
          </section>
        ))
      )}
    </main>
  );
}