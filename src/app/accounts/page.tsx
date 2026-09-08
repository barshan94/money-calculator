import Link from "next/link";
import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { formatMoney } from "@/lib/finance/format-money";

export default async function AccountsPage() {
  const accounts = await getAccountBalances();

  const userAccounts = accounts.filter(
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
          flexWrap: "wrap",
          marginBottom: 28,
        }}
      >
        <div>
          <p
            className="muted"
            style={{ margin: "0 0 6px", fontSize: 14 }}
          >
            Manage your money
          </p>

          <h1 style={{ marginBottom: 0 }}>
            Accounts
          </h1>
        </div>

        <Link
          href="/accounts/new"
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
          + New Account
        </Link>
      </div>

      {userAccounts.length === 0 ? (
        <section>
          <h2>No accounts yet</h2>

          <p className="muted">
            Create your first bank, cash, mobile wallet,
            investment, or liability account.
          </p>

          <Link
            href="/accounts/new"
            style={{
              display: "inline-flex",
              marginTop: 8,
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--primary)",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Create Account
          </Link>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {userAccounts.map((account) => (
            <div
              key={account.id}
              className="card"
              style={{ padding: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <Link
                    href={`/accounts/${account.id}`}
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {account.name}
                  </Link>

                  <p
                    className="muted"
                    style={{
                      margin: "5px 0 0",
                      fontSize: 13,
                      textTransform: "capitalize",
                    }}
                  >
                    {account.account_type}
                  </p>
                </div>

                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#f1f5f9",
                  }}
                >
                  {account.currency}
                </span>
              </div>

              <div style={{ margin: "24px 0" }}>
                <p
                  className="muted"
                  style={{
                    margin: "0 0 5px",
                    fontSize: 13,
                  }}
                >
                  Current balance
                </p>

                <strong style={{ fontSize: 25 }}>
                  {formatMoney(
                    account.balance,
                    account.currency,
                  )}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  paddingTop: 14,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <Link
                  href={`/accounts/${account.id}`}
                  style={{
                    color: "var(--primary)",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  View details →
                </Link>

                <ArchiveAccountButton
                  accountId={account.id}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}