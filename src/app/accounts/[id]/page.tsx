import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { createClient } from "@/lib/supabase/server";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { formatMoney } from "@/lib/finance/format-money";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const accounts = await getAccountBalances();

  const account = accounts.find(
    (item) => item.id === id,
  );

  if (!account) {
    notFound();
  }

  const { data: openingBalanceEntry, error: openingError } =
    await supabase
      .from("transaction_entries")
      .select(`
        id,
        transactions!inner (
          id,
          transaction_type,
          status,
          user_id
        )
      `)
      .eq("account_id", id)
      .eq(
        "transactions.transaction_type",
        "opening_balance",
      )
      .eq("transactions.status", "posted")
      .eq("transactions.user_id", user.id)
      .limit(1)
      .maybeSingle();

  if (openingError) {
    throw new Error(openingError.message);
  }

  const hasOpeningBalance =
    !!openingBalanceEntry;

  const { data: entries, error: entriesError } =
    await supabase
      .from("transaction_entries")
      .select(`
        id,
        amount,
        entry_type,
        transaction_id,
        transactions!inner (
          id,
          transaction_date,
          description,
          status,
          user_id
        )
      `)
      .eq("account_id", id)
      .eq("transactions.status", "posted")
      .eq("transactions.user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/accounts"
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Accounts
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <div>
            <h1 style={{ marginBottom: 6 }}>
              {account.name}
            </h1>

            <p
              className="muted"
              style={{
                margin: 0,
                textTransform: "capitalize",
              }}
            >
              {account.account_type} ·{" "}
              {account.currency}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/accounts/${account.id}/edit`}
              style={{
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Edit Account
            </Link>

            {!hasOpeningBalance && (
              <Link
                href={`/accounts/${account.id}/opening-balance`}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--primary)",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Add Opening Balance
              </Link>
            )}

            <ArchiveAccountButton
              accountId={account.id}
            />
          </div>
        </div>
      </div>

      <section>
        <p
          className="muted"
          style={{ margin: "0 0 6px", fontSize: 14 }}
        >
          Current balance
        </p>

        <strong style={{ fontSize: 32 }}>
          {formatMoney(
            account.balance,
            account.currency,
          )}
        </strong>
      </section>

      <section>
        <h2>Account Information</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <div className="card" style={{ padding: 16 }}>
            <p
              className="muted"
              style={{ margin: "0 0 5px", fontSize: 13 }}
            >
              Type
            </p>

            <strong
              style={{ textTransform: "capitalize" }}
            >
              {account.account_type}
            </strong>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <p
              className="muted"
              style={{ margin: "0 0 5px", fontSize: 13 }}
            >
              Currency
            </p>

            <strong>{account.currency}</strong>
          </div>
        </div>
      </section>

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
            Transactions
          </h2>

          <Link
            href="/transactions/new"
            style={{
              color: "var(--primary)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + Add transaction
          </Link>
        </div>

        {!entries || entries.length === 0 ? (
          <p className="muted">
            No transactions yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {entries.map((entry) => {
              const transaction = Array.isArray(
                entry.transactions,
              )
                ? entry.transactions[0]
                : entry.transactions;

              if (!transaction) return null;

              const isDebit =
                entry.entry_type === "debit";

              return (
                <Link
                  key={entry.id}
                  href={`/transactions/${transaction.id}`}
                  className="card"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                  }}
                >
                  <div>
                    <strong>
                      {transaction.description ||
                        "Transaction"}
                    </strong>

                    <p
                      className="muted"
                      style={{
                        margin: "5px 0 0",
                        fontSize: 13,
                      }}
                    >
                      {new Date(
                        transaction.transaction_date,
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <strong
                      style={{
                        color: isDebit
                          ? "var(--danger)"
                          : "var(--success)",
                      }}
                    >
                      {isDebit ? "−" : "+"}
                      {formatMoney(
                        Number(entry.amount),
                        account.currency,
                      )}
                    </strong>

                    <p
                      className="muted"
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {entry.entry_type}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}