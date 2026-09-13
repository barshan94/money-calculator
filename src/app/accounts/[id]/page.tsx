
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { UnarchiveAccountButton } from "@/components/accounts/unarchive-account-button";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import { createClient } from "@/lib/supabase/server";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { formatMoney } from "@/lib/finance/format-money";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatLiquidityClass(
  value: string | null,
) {
  switch (value) {
    case "immediate":
      return "Available now";

    case "near_liquid":
      return "Near liquid";

    case "receivable":
      return "Money to receive";

    case "long_term":
      return "Long term";

    default:
      return "—";
  }
}

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

  const {
    data: accountRow,
    error: accountError,
  } = await supabase
    .from("accounts")
    .select(`
      id,
      name,
      account_type,
      currency,
      liquidity_class,
      is_archived,
      is_system
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError || !accountRow) {
    notFound();
  }

  const accounts = await getAccountBalances();

  const balanceAccount = accounts.find(
    (item) => item.id === id,
  );

  const balance = balanceAccount
    ? Number(balanceAccount.balance)
    : 0;

  const {
    data: openingBalanceEntry,
    error: openingError,
  } = await supabase
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

  const {
    data: entries,
    error: entriesError,
  } = await supabase
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

  const archived = accountRow.is_archived;

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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  opacity: archived ? 0.75 : 1,
                }}
              >
                {accountRow.name}
              </h1>

              {archived && (
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    background:
                      "var(--muted-background)",
                    color: "var(--muted)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Archived
                </span>
              )}
            </div>

            <p
              className="muted"
              style={{
                margin: "6px 0 0",
                textTransform: "capitalize",
              }}
            >
              {accountRow.account_type} ·{" "}
              {accountRow.currency}
            </p>
          </div>

          {!accountRow.is_system && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {!archived && (
                <>
                  <Link
                    href={`/accounts/${accountRow.id}/edit`}
                    style={{
                      padding: "10px 14px",
                      border:
                        "1px solid var(--border)",
                      borderRadius: 8,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Edit Account
                  </Link>

                  {!hasOpeningBalance && (
                    <Link
                      href={`/accounts/${accountRow.id}/opening-balance`}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background:
                          "var(--primary)",
                        color: "#fff",
                        fontWeight: 600,
                        textDecoration:
                          "none",
                      }}
                    >
                      Add Opening Balance
                    </Link>
                  )}

                  <ArchiveAccountButton
                    accountId={accountRow.id}
                  />
                </>
              )}

              {archived && (
                <>
                  <UnarchiveAccountButton
                    accountId={accountRow.id}
                  />

                  <DeleteAccountButton
                    accountId={accountRow.id}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <section>
        <div
          className="muted"
          style={{
            marginBottom: 6,
            fontSize: 14,
          }}
        >
          Current balance
        </div>

        <strong
          style={{
            fontSize: 32,
            opacity: archived ? 0.75 : 1,
          }}
        >
          {formatMoney(
            balance,
            accountRow.currency,
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
          <div
            className="card"
            style={{ padding: 16 }}
          >
            <p
              className="muted"
              style={{
                margin: "0 0 5px",
                fontSize: 13,
              }}
            >
              Type
            </p>

            <strong
              style={{
                textTransform: "capitalize",
              }}
            >
              {accountRow.account_type}
            </strong>
          </div>

          <div
            className="card"
            style={{ padding: 16 }}
          >
            <p
              className="muted"
              style={{
                margin: "0 0 5px",
                fontSize: 13,
              }}
            >
              Currency
            </p>

            <strong>
              {accountRow.currency}
            </strong>
          </div>

          <div
            className="card"
            style={{ padding: 16 }}
          >
            <p
              className="muted"
              style={{
                margin: "0 0 5px",
                fontSize: 13,
              }}
            >
              Availability
            </p>

            <strong>
              {accountRow.account_type ===
              "asset"
                ? formatLiquidityClass(
                    accountRow.liquidity_class,
                  )
                : "—"}
            </strong>
          </div>

          <div
            className="card"
            style={{ padding: 16 }}
          >
            <p
              className="muted"
              style={{
                margin: "0 0 5px",
                fontSize: 13,
              }}
            >
              Status
            </p>

            <strong>
              {archived
                ? "Archived"
                : "Active"}
            </strong>
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
          <div>
            <h2 style={{ margin: 0 }}>
              Transactions
            </h2>

            <p
              className="muted"
              style={{
                margin: "4px 0 0",
                fontSize: 12,
              }}
            >
              {entries?.length ?? 0} posted{" "}
              {entries?.length === 1
                ? "transaction"
                : "transactions"}
            </p>
          </div>

          {!archived && (
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
          )}
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
              const transaction =
                Array.isArray(
                  entry.transactions,
                )
                  ? entry.transactions[0]
                  : entry.transactions;

              if (!transaction) {
                return null;
              }

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
                    textDecoration: "none",
                    color:
                      "var(--foreground)",
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
                      ).toLocaleDateString(
                        "en-BD",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    <strong
                      style={{
                        color: isDebit
                          ? "var(--danger)"
                          : "var(--success)",
                      }}
                    >
                      {isDebit
                        ? "−"
                        : "+"}
                      {formatMoney(
                        Number(
                          entry.amount,
                        ),
                        accountRow.currency,
                      )}
                    </strong>

                    <p
                      className="muted"
                      style={{
                        margin:
                          "4px 0 0",
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