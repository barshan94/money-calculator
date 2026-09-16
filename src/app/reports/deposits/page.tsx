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
        <h1 style={{ margin: 0 }}>Deposits Report</h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.7,
          }}
        >
          Overview of your active deposits and expected maturity values.
        </p>
      </div>

      {!hasDeposits ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No deposits available</h2>

          <p style={{ opacity: 0.7 }}>
            Create a deposit to see its details and expected returns here.
          </p>

          <Link
            href="/deposits/new"
            style={{
              display: "inline-block",
              marginTop: "12px",
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
                      Total Principal
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(total.principal, currency)}
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
                      Expected Maturity
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(total.maturity, currency)}
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
                      Expected Interest
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(expectedInterest, currency)}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}

          <section>
            <h2>Deposit Details</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
                marginTop: "16px",
              }}
            >
              {(deposits ?? []).map((deposit) => {
                const maturityAmount = Number(
                  deposit.maturity_amount ??
                    deposit.principal_amount,
                );

                return (
                  <Link
                    href={`/deposits/${deposit.id}`}
                    key={deposit.id}
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
                        {deposit.name}
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
                        {deposit.currency}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "12px 0 4px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      {deposit.deposit_type} · {deposit.status}
                    </p>

                    <div style={{ marginTop: "14px" }}>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: "13px",
                          opacity: 0.65,
                        }}
                      >
                        Principal
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          fontWeight: 700,
                        }}
                      >
                        {formatMoney(
                          Number(deposit.principal_amount),
                          deposit.currency,
                        )}
                      </p>
                    </div>

                    <div style={{ marginTop: "14px" }}>
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: "13px",
                          opacity: 0.65,
                        }}
                      >
                        Expected Maturity
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 600,
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
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "14px",
                        marginTop: "16px",
                        fontSize: "13px",
                        opacity: 0.7,
                      }}
                    >
                      {deposit.interest_rate !== null && (
                        <span>
                          Rate:{" "}
                          {Number(deposit.interest_rate).toFixed(2)}%
                        </span>
                      )}

                      {deposit.maturity_date && (
                        <span>
                          Matures: {formatDate(deposit.maturity_date)}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: "16px 0 0",
                        fontSize: "13px",
                        opacity: 0.6,
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
    </main>
  );
}

