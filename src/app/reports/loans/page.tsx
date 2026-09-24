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

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
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
          Loans Report
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: "720px",
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          Track money you have lent, money you owe, and your
          outstanding loan position.
        </p>
      </header>

      {loans.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No loans available</h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: "560px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Create a loan to start tracking outstanding lent or
            borrowed money.
          </p>

          <Link
            href="/loans"
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
            Go to Loans →
          </Link>
        </section>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: "32px",
              marginBottom: "32px",
            }}
          >
            {Array.from(totals.entries()).map(
              ([currency, total]) => {
                const netPosition =
                  total.lent - total.borrowed;

                return (
                  <section
                    key={currency}
                    style={{
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "21px",
                        }}
                      >
                        {currency} Loans
                      </h2>

                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: "14px",
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
                        gap: "14px",
                      }}
                    >
                      <MetricCard
                        label="Outstanding Lent"
                        value={formatAmount(
                          total.lent,
                          currency,
                        )}
                        description="Still owed to you."
                      />

                      <MetricCard
                        label="Outstanding Borrowed"
                        value={formatAmount(
                          total.borrowed,
                          currency,
                        )}
                        description="Still owed by you."
                      />

                      <MetricCard
                        label="Net Position"
                        value={formatAmount(
                          netPosition,
                          currency,
                        )}
                        description="Lent minus borrowed."
                      />
                    </div>
                  </section>
                );
              },
            )}
          </div>

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                Loan Details
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Current outstanding balances for each active loan.
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
              {loans.map((loan) => (
                <Link
                  href={`/loans/${loan.id}`}
                  key={loan.id}
                  style={{
                    display: "block",
                    minWidth: 0,
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <article
                    className="card"
                    style={{
                      height: "100%",
                      minWidth: 0,
                      padding: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                        marginBottom: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "17px",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {loan.person_name}
                        </h3>

                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "5px",
                            fontSize: "13px",
                            textTransform: "capitalize",
                            color:
                              "var(--muted-foreground, #666)",
                          }}
                        >
                          {loan.loan_type}
                        </span>
                      </div>

                      <strong
                        style={{
                          fontSize: "17px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {formatAmount(
                          loan.remaining_amount,
                          loan.currency,
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <DetailRow
                        label="Status"
                        value={statusLabel(loan.status)}
                      />

                      <DetailRow
                        label="Principal"
                        value={formatAmount(
                          loan.principal_amount,
                          loan.currency,
                        )}
                      />

                      <DetailRow
                        label="Repaid"
                        value={formatAmount(
                          loan.repaid_amount,
                          loan.currency,
                        )}
                      />

                      <DetailRow
                        label="Remaining"
                        value={formatAmount(
                          loan.remaining_amount,
                          loan.currency,
                        )}
                        strong
                      />

                      <hr
                        style={{
                          width: "100%",
                          border: 0,
                          borderTop:
                            "1px solid var(--border, #ddd)",
                          margin: "4px 0",
                        }}
                      />

                      <DetailRow
                        label="Start Date"
                        value={formatDate(
                          loan.start_datetime,
                        )}
                      />

                      {loan.due_date && (
                        <DetailRow
                          label="Due Date"
                          value={formatDate(loan.due_date)}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "16px",
                        paddingTop: "12px",
                        borderTop:
                          "1px solid var(--border, #ddd)",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      View loan details →
                    </div>
                  </article>
                </Link>
              ))}
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
  description,
}: {
  label: string;
  value: string;
  description: string;
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
          fontSize: "23px",
          fontWeight: 700,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>

      <p
        style={{
          margin: "6px 0 0",
          fontSize: "13px",
          color: "var(--muted-foreground, #666)",
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: "var(--muted-foreground, #666)",
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: strong ? "15px" : "14px",
          fontWeight: strong ? 700 : 600,
          textTransform:
            label === "Status" ? "capitalize" : undefined,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </span>
    </div>
  );
}

