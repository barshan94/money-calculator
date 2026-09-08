import Link from "next/link";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { getFinancialSummary } from "@/lib/finance/get-financial-summary";
import { formatMoney } from "@/lib/finance/format-money";

export default async function DashboardPage() {
  const [accounts, summary] = await Promise.all([
    getAccountBalances(),
    getFinancialSummary(),
  ]);

  const bdtSummary = summary.BDT ?? {
    income: 0,
    expense: 0,
    profit: 0,
  };

  const balancesByCurrency = accounts.reduce(
    (result, account) => {
      if (!result[account.currency]) {
        result[account.currency] = {
          assets: 0,
          liabilities: 0,
        };
      }

      if (account.account_type === "asset") {
        result[account.currency].assets += account.balance;
      }

      if (account.account_type === "liability") {
        result[account.currency].liabilities += account.balance;
      }

      return result;
    },
    {} as Record<
      string,
      {
        assets: number;
        liabilities: number;
      }
    >,
  );

  const moneyAccounts = accounts.filter(
    (account) =>
      account.account_type === "asset" ||
      account.account_type === "liability",
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 28,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 6px",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            Financial overview
          </p>

          <h1 style={{ marginBottom: 0 }}>
            Dashboard
          </h1>
        </div>

        <Link
          href="/transactions/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "11px 16px",
            borderRadius: 8,
            background: "var(--primary)",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          + Add Transaction
        </Link>
      </div>

      {/* BDT summary */}

      <section>
        <h2>Monthly Overview</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <div className="card" style={{ padding: 18 }}>
            <p className="muted" style={{ margin: 0 }}>
              Income
            </p>

            <h3 style={{ marginTop: 8, fontSize: 24 }}>
              {formatMoney(bdtSummary.income, "BDT")}
            </h3>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <p className="muted" style={{ margin: 0 }}>
              Expenses
            </p>

            <h3 style={{ marginTop: 8, fontSize: 24 }}>
              {formatMoney(bdtSummary.expense, "BDT")}
            </h3>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <p className="muted" style={{ margin: 0 }}>
              Net Income
            </p>

            <h3
              style={{
                marginTop: 8,
                fontSize: 24,
                color:
                  bdtSummary.profit >= 0
                    ? "var(--success)"
                    : "var(--danger)",
              }}
            >
              {formatMoney(bdtSummary.profit, "BDT")}
            </h3>
          </div>
        </div>
      </section>

      {/* Currency balances */}

      <section>
        <h2>Net Worth</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {Object.entries(balancesByCurrency).map(
            ([currency, balance]) => {
              const netWorth =
                balance.assets -
                balance.liabilities;

              return (
                <div
                  key={currency}
                  className="card"
                  style={{ padding: 18 }}
                >
                  <p
                    className="muted"
                    style={{ margin: 0 }}
                  >
                    {currency} Net Worth
                  </p>

                  <h3
                    style={{
                      marginTop: 8,
                      fontSize: 24,
                    }}
                  >
                    {formatMoney(
                      netWorth,
                      currency,
                    )}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gap: 5,
                      marginTop: 14,
                      fontSize: 14,
                    }}
                  >
                    <span>
                      Assets:{" "}
                      {formatMoney(
                        balance.assets,
                        currency,
                      )}
                    </span>

                    <span>
                      Liabilities:{" "}
                      {formatMoney(
                        balance.liabilities,
                        currency,
                      )}
                    </span>
                  </div>
                </div>
              );
            },
          )}

          {Object.keys(balancesByCurrency).length ===
            0 && (
            <p className="muted">
              No accounts yet.
            </p>
          )}
        </div>
      </section>

      {/* Accounts */}

      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>
            Accounts
          </h2>

          <Link
            href="/accounts"
            style={{
              color: "var(--primary)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            View all
          </Link>
        </div>

        {moneyAccounts.length === 0 ? (
          <p className="muted">
            No accounts available.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {moneyAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="card"
                style={{
                  display: "block",
                  padding: 16,
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
                  <div>
                    <strong>
                      {account.name}
                    </strong>

                    <p
                      className="muted"
                      style={{
                        margin: "5px 0 0",
                        fontSize: 13,
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {account.account_type}
                    </p>
                  </div>

                  <span
                    style={{
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatMoney(
                      account.balance,
                      account.currency,
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}