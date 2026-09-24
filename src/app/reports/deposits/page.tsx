import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function DepositReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: deposits, error } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, maturity_amount, interest_rate, start_date, maturity_date, status",
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<
    string,
    {
      principal: number;
      maturity: number;
    }
  >();

  for (const deposit of deposits ?? []) {
    const total = totals.get(deposit.currency) ?? {
      principal: 0,
      maturity: 0,
    };

    total.principal += Number(deposit.principal_amount);
    total.maturity += Number(
      deposit.maturity_amount ?? deposit.principal_amount,
    );

    totals.set(deposit.currency, total);
  }

  const hasDeposits = (deposits ?? []).length > 0;

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
            Deposits Report
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              maxWidth: "700px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Overview of your active deposits and expected maturity
            values.
          </p>
        </div>
      </header>

      {!hasDeposits ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No deposits available</h2>

          <p
            style={{
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Create a deposit to see its details and expected
            returns here.
          </p>

          <Link
            href="/deposits/new"
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
            Create Deposit →
          </Link>
        </section>
      ) : (
        <>
          {Array.from(totals.entries()).map(([currency, total]) => {
            const expectedInterest =
              total.maturity - total.principal;

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
                    label="Total Principal"
                    value={formatMoney(
                      total.principal,
                      currency,
                    )}
                  />

                  <MetricCard
                    label="Expected Maturity"
                    value={formatMoney(
                      total.maturity,
                      currency,
                    )}
                  />

                  <MetricCard
                    label="Expected Interest"
                    value={formatMoney(
                      expectedInterest,
                      currency,
                    )}
                  />
                </div>
              </section>
            );
          })}

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>Deposit Details</h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color:
                    "var(--muted-foreground, #666)",
                  fontSize: "14px",
                }}
              >
                Select a deposit to view its full details.
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
              {(deposits ?? []).map((deposit) => {
                const maturityAmount = Number(
                  deposit.maturity_amount ??
                    deposit.principal_amount,
                );

                const principal = Number(
                  deposit.principal_amount,
                );

                const expectedInterest =
                  maturityAmount - principal;

                return (
                  <Link
                    href={`/deposits/${deposit.id}`}
                    key={deposit.id}
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
                        {deposit.name}
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
                        {deposit.currency}
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
                      {deposit.deposit_type} ·{" "}
                      {deposit.status}
                    </p>

                    <div style={{ marginTop: "16px" }}>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Principal
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          fontWeight: 700,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {formatMoney(
                          principal,
                          deposit.currency,
                        )}
                      </p>
                    </div>

                    <div style={{ marginTop: "14px" }}>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Expected Maturity
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {formatMoney(
                          maturityAmount,
                          deposit.currency,
                        )}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "6px",
                        marginTop: "16px",
                        paddingTop: "14px",
                        borderTop:
                          "1px solid var(--border, #ddd)",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      {deposit.interest_rate !== null && (
                        <span>
                          Rate:{" "}
                          {Number(
                            deposit.interest_rate,
                          ).toFixed(2)}
                          %
                        </span>
                      )}

                      {deposit.maturity_date && (
                        <span>
                          Matures:{" "}
                          {formatDate(
                            deposit.maturity_date,
                          )}
                        </span>
                      )}

                      <span>
                        Expected interest:{" "}
                        {formatMoney(
                          expectedInterest,
                          deposit.currency,
                        )}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "16px 0 0",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      View deposit →
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
    </div>
  );
}

