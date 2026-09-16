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
        <h1 style={{ margin: 0 }}>Investments Report</h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.7,
          }}
        >
          Track invested capital, current values, and unrealized gain or
          loss.
        </p>
      </div>

      {!hasInvestments ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No investments available</h2>

          <p style={{ opacity: 0.7 }}>
            Create an investment to start tracking its performance.
          </p>

          <Link
            href="/investments/new"
            style={{
              display: "inline-block",
              marginTop: "12px",
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
                  }}
                >
                  <h2 style={{ margin: 0 }}>{currency}</h2>

                  <span
                    style={{
                      fontSize: "13px",
                      padding: "4px 8px",
                      border: "1px solid #ddd",
                      borderRadius: "999px",
                      opacity: 0.75,
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
                      Total Invested
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(total.invested, currency)}
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
                      Current Value
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(total.current, currency)}
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
                      Gain / Loss
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(gainLoss, currency)}
                    </p>

                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: "13px",
                        opacity: 0.7,
                      }}
                    >
                      {returnPercentage.toFixed(2)}% return
                    </p>
                  </div>
                </div>
              </section>
            );
          })}

          <section>
            <h2>Investments</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
                marginTop: "16px",
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
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "18px",
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
                        }}
                      >
                        {investment.name}
                      </h3>

                      <span
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                          opacity: 0.75,
                        }}
                      >
                        {investment.currency}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "12px 0 4px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      {investment.investment_type} · {investment.status}
                    </p>

                    <div style={{ marginTop: "16px" }}>
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontSize: "13px",
                          opacity: 0.65,
                        }}
                      >
                        Invested
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "19px",
                          fontWeight: 600,
                        }}
                      >
                        {formatMoney(
                          invested,
                          investment.currency,
                        )}
                      </p>
                    </div>

                    <div style={{ marginTop: "14px" }}>
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontSize: "13px",
                          opacity: 0.65,
                        }}
                      >
                        Current Value
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "21px",
                          fontWeight: 700,
                        }}
                      >
                        {formatMoney(
                          current,
                          investment.currency,
                        )}
                      </p>
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid #ddd",
                        marginTop: "14px",
                        paddingTop: "12px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "14px",
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
                          opacity: 0.7,
                        }}
                      >
                        {returnPercentage.toFixed(2)}% return
                      </p>
                    </div>

                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: "13px",
                        opacity: 0.6,
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
    </main>
  );
}