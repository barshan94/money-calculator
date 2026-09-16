import Link from "next/link";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";

function formatAmount(amount: number, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function LoanReportPage() {
  const allLoans = await getLoanBalances();

  const loans = allLoans.filter(
    (loan) => loan.status !== "cancelled",
  );

  const totals = new Map<
    string,
    {
      lent: number;
      borrowed: number;
    }
  >();

  for (const loan of loans) {
    const total = totals.get(loan.currency) ?? {
      lent: 0,
      borrowed: 0,
    };

    if (loan.loan_type === "lent") {
      total.lent += loan.remaining_amount;
    } else {
      total.borrowed += loan.remaining_amount;
    }

    totals.set(loan.currency, total);
  }

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
          <h1 style={{ marginBottom: 8 }}>Loans Report</h1>

          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "var(--muted-foreground, #666)",
            }}
          >
            Track money you have lent, money you owe, and your
            outstanding loan position.
          </p>
        </div>

        <Link href="/reports">← Reports</Link>
      </header>

      {loans.length === 0 ? (
        <section className="card">
          <h2>No loans available</h2>

          <p>
            Create a loan to start tracking outstanding lent or
            borrowed money.
          </p>

          <Link href="/loans">Go to Loans →</Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 40 }}>
          {Array.from(totals.entries()).map(
            ([currency, total]) => {
              const netPosition = total.lent - total.borrowed;

              return (
                <section
                  key={currency}
                  style={{
                    display: "grid",
                    gap: 16,
                  }}
                >
                  <div>
                    <h2 style={{ marginBottom: 4 }}>
                      {currency} Loans
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      Outstanding balances by loan type.
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
                        Outstanding Lent
                      </p>

                      <p
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          margin: "8px 0 0",
                        }}
                      >
                        {formatAmount(
                          total.lent,
                          currency,
                        )}
                      </p>

                      <p
                        style={{
                          marginBottom: 0,
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Still owed to you.
                      </p>
                    </div>

                    <div className="card">
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                        }}
                      >
                        Outstanding Borrowed
                      </p>

                      <p
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          margin: "8px 0 0",
                        }}
                      >
                        {formatAmount(
                          total.borrowed,
                          currency,
                        )}
                      </p>

                      <p
                        style={{
                          marginBottom: 0,
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Still owed by you.
                      </p>
                    </div>

                    <div className="card">
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                        }}
                      >
                        Net Position
                      </p>

                      <p
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          margin: "8px 0 0",
                        }}
                      >
                        {formatAmount(
                          netPosition,
                          currency,
                        )}
                      </p>

                      <p
                        style={{
                          marginBottom: 0,
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Lent minus borrowed.
                      </p>
                    </div>
                  </div>
                </section>
              );
            },
          )}

          <section>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 4 }}>
                Loan Details
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Current outstanding balances for each active
                loan.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {loans.map((loan) => (
                <Link
                  href={`/loans/${loan.id}`}
                  key={loan.id}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <article
                    className="card"
                    style={{
                      height: "100%",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin: 0,
                            marginBottom: 4,
                          }}
                        >
                          {loan.person_name}
                        </h3>

                        <span
                          style={{
                            textTransform: "capitalize",
                            color:
                              "var(--muted-foreground, #666)",
                          }}
                        >
                          {loan.loan_type}
                        </span>
                      </div>

                      <strong>
                        {formatAmount(
                          loan.remaining_amount,
                          loan.currency,
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <span>Status</span>
                        <strong
                          style={{
                            textTransform: "capitalize",
                          }}
                        >
                          {loan.status}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <span>Principal</span>

                        <strong>
                          {formatAmount(
                            loan.principal_amount,
                            loan.currency,
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <span>Repaid</span>

                        <strong>
                          {formatAmount(
                            loan.repaid_amount,
                            loan.currency,
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 12,
                        }}
                      >
                        <span>Remaining</span>

                        <strong>
                          {formatAmount(
                            loan.remaining_amount,
                            loan.currency,
                          )}
                        </strong>
                      </div>

                      <hr />

                      <div
                        style={{
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <span>Start Date</span>

                        <strong>
                          {formatDate(
                            loan.start_datetime,
                          )}
                        </strong>
                      </div>

                      {loan.due_date && (
                        <div
                          style={{
                            display: "grid",
                            gap: 4,
                          }}
                        >
                          <span>Due Date</span>

                          <strong>
                            {formatDate(loan.due_date)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

