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
        <h1 style={{ margin: 0 }}>Account Balances</h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.7,
          }}
        >
          Overview of your current active account balances.
        </p>
      </div>

      {visibleBalances.length === 0 ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No accounts available</h2>

          <p style={{ opacity: 0.7 }}>
            Create an active account to see its balance here.
          </p>

          <Link
            href="/accounts/new"
            style={{
              display: "inline-block",
              marginTop: "12px",
              textDecoration: "none",
            }}
          >
            Create Account →
          </Link>
        </section>
      ) : (
        <>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "28px",
              overflow: "hidden",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Balance Overview</h2>

            <AccountBalancesChart data={chartData} />
          </section>

          <section>
            <h2>Accounts</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginTop: "16px",
              }}
            >
              {visibleBalances.map((account) => (
                <Link
                  href={`/accounts/${account.id}`}
                  key={account.id}
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
                      {account.name}
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
                      {account.currency}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "12px 0 4px",
                      fontSize: "13px",
                      opacity: 0.65,
                    }}
                  >
                    {account.account_type}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "23px",
                      fontWeight: 700,
                    }}
                  >
                    {formatMoney(account.balance, account.currency)}
                  </p>

                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: "13px",
                      opacity: 0.6,
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
    </main>
  );
}

