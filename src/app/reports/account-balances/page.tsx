import Link from "next/link";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import AccountBalancesChart from "@/components/reports/account-balances-chart";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AccountBalancesPage() {
  const balances = await getAccountBalances();

  const visibleBalances = balances.filter(
    (account) => !account.is_archived,
  );

  const chartData = visibleBalances.map((account) => ({
    name: account.name,
    balance: account.balance,
  }));

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
        <div style={{ minWidth: 0, flex: "1 1 500px" }}>
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
            Account Balances
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              maxWidth: "680px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Overview of your current active account balances.
          </p>
        </div>
      </header>

      {visibleBalances.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No accounts available</h2>

          <p
            style={{
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Create an active account to see its balance here.
          </p>

          <Link
            href="/accounts/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              marginTop: "12px",
              padding: "0 16px",
              borderRadius: "8px",
              textDecoration: "none",
              border: "1px solid var(--border, #ddd)",
            }}
          >
            Create Account →
          </Link>
        </section>
      ) : (
        <>
          <section
            className="card"
            style={{
              marginBottom: "28px",
              padding: "20px",
              overflow: "hidden",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <h2 style={{ margin: 0 }}>Balance Overview</h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "var(--muted-foreground, #666)",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                Current balances across your active accounts.
              </p>
            </div>

            <div
              style={{
                width: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <AccountBalancesChart data={chartData} />
            </div>
          </section>

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>Accounts</h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "var(--muted-foreground, #666)",
                  fontSize: "14px",
                }}
              >
                Select an account to view its details and transactions.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
              }}
            >
              {visibleBalances.map((account) => (
                <Link
                  href={`/accounts/${account.id}`}
                  key={account.id}
                  style={{
                    display: "block",
                    minWidth: 0,
                    padding: "18px",
                    border: "1px solid var(--border, #ddd)",
                    borderRadius: "12px",
                    textDecoration: "none",
                    transition:
                      "border-color 0.15s ease, transform 0.15s ease",
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
                      {account.name}
                    </h3>

                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "12px",
                        padding: "4px 8px",
                        border: "1px solid var(--border, #ddd)",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      {account.currency}
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
                    {account.account_type}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "23px",
                      fontWeight: 700,
                      lineHeight: 1.25,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {formatMoney(
                      account.balance,
                      account.currency,
                    )}
                  </p>

                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: "13px",
                      color:
                        "var(--muted-foreground, #666)",
                    }}
                  >
                    View account →
                  </p>
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

          section.card {
            padding: 16px !important;
          }

          h2 {
            font-size: 21px;
          }

          article,
          a {
            -webkit-tap-highlight-color: transparent;
          }
        }

        @media (max-width: 420px) {
          main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          section.card {
            padding: 14px !important;
          }
        }
      `}</style>
    </main>
  );
}

