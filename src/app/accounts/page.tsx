import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import Link from "next/link";

import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { UnarchiveAccountButton } from "@/components/accounts/unarchive-account-button";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { formatMoney } from "@/lib/finance/format-money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  sort?: string;
  filter?: string;
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: accountRows, error: accountError }, balances] =
    await Promise.all([
      supabase
        .from("accounts")
        .select(
          "id, name, account_type, currency, is_archived",
        )
        .eq("user_id", user.id)
        .eq("is_system", false)
        .in("account_type", ["asset", "liability"])
        .order("name"),
      getAccountBalances(),
    ]);

  if (accountError) {
    throw new Error(accountError.message);
  }

  const balanceMap = new Map(
    balances.map((account) => [
      account.id,
      account.balance,
    ]),
  );

  const accounts = (accountRows ?? []).map(
    (account) => ({
      ...account,
      balance: balanceMap.get(account.id) ?? 0,
    }),
  );

  const {
    sort = "name-az",
    filter = "active",
  } = await searchParams;

  const activeAccounts = accounts.filter(
    (account) => !account.is_archived,
  );

  const archivedAccounts = accounts.filter(
    (account) => account.is_archived,
  );

  const currencies = Array.from(
    new Set(
      activeAccounts.map(
        (account) => account.currency,
      ),
    ),
  ).sort();

  let filteredAccounts = [...accounts];

  switch (filter) {
    case "active":
      filteredAccounts = activeAccounts;
      break;

    case "archived":
      filteredAccounts = archivedAccounts;
      break;

    case "asset":
      filteredAccounts = activeAccounts.filter(
        (account) =>
          account.account_type === "asset",
      );
      break;

    case "liability":
      filteredAccounts = activeAccounts.filter(
        (account) =>
          account.account_type === "liability",
      );
      break;

    case "all":
    default:
      filteredAccounts = [...accounts];
      break;
  }

  if (currencies.includes(filter)) {
    filteredAccounts = activeAccounts.filter(
      (account) =>
        account.currency === filter,
    );
  }

  filteredAccounts.sort((a, b) => {
    switch (sort) {
      case "name-za":
        return b.name.localeCompare(a.name);

      case "highest-balance":
        return (
          Number(b.balance) -
          Number(a.balance)
        );

      case "lowest-balance":
        return (
          Number(a.balance) -
          Number(b.balance)
        );

      case "name-az":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <main>
      <style>{`
        .mc-account-controls {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
        }

        .mc-account-control {
          display: grid;
          gap: 6px;
          min-width: 180px;
        }

        .mc-account-control label {
          font-size: 12px;
          font-weight: 600;
        }

        .mc-account-control select {
          width: 100%;
          height: 40px;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--background);
          color: var(--foreground);
          font-size: 14px;
        }

        .mc-account-control-actions {
          display: flex;
          gap: 8px;
        }

        .mc-account-apply,
        .mc-account-reset {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          padding: 0 14px;
          box-sizing: border-box;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 600;
        }

        .mc-account-apply {
          border: 0;
          background: var(--primary);
          color: #fff;
          cursor: pointer;
        }

        .mc-account-reset {
          border: 1px solid var(--border);
          color: var(--foreground);
          text-decoration: none;
        }

        .mc-account-archived {
          opacity: 0.78;
        }

        .mc-account-archived-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--muted-background);
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .mc-account-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 700px) {
          .mc-account-controls {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mc-account-control {
            width: 100%;
            min-width: 0;
          }

          .mc-account-control-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .mc-account-apply,
          .mc-account-reset {
            width: 100%;
          }
        }
      `}</style>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <p
              className="muted"
              style={{
                margin: "0 0 6px",
                fontSize: 14,
              }}
            >
              Manage your money
            </p>

            <h1 style={{ margin: 0 }}>
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
              textDecoration: "none",
            }}
          >
            + New Account
          </Link>
        </div>

        {accounts.length === 0 ? (
          <section>
            <h2>No accounts yet</h2>

            <p className="muted">
              Create your first account.
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
                textDecoration: "none",
              }}
            >
              Create Account
            </Link>
          </section>
        ) : (
          <>
            <form
              method="GET"
              className="mc-account-controls"
            >
              <div className="mc-account-control">
                <label htmlFor="filter">
                  Filter
                </label>

                <select
                  id="filter"
                  name="filter"
                  defaultValue={filter}
                >
                  <option value="active">
                    Active accounts
                  </option>

                  <option value="archived">
                    Archived accounts
                  </option>

                  <option value="all">
                    All accounts
                  </option>

                  <option value="asset">
                    Active assets
                  </option>

                  <option value="liability">
                    Active liabilities
                  </option>

                  {currencies.map(
                    (currency) => (
                      <option
                        key={currency}
                        value={currency}
                      >
                        Active {currency}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="mc-account-control">
                <label htmlFor="sort">
                  Sort
                </label>

                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                >
                  <option value="name-az">
                    Name A–Z
                  </option>

                  <option value="name-za">
                    Name Z–A
                  </option>

                  <option value="highest-balance">
                    Highest balance
                  </option>

                  <option value="lowest-balance">
                    Lowest balance
                  </option>
                </select>
              </div>

              <div className="mc-account-control-actions">
                <button
                  type="submit"
                  className="mc-account-apply"
                >
                  Apply
                </button>

                <Link
                  href="/accounts"
                  className="mc-account-reset"
                >
                  Reset
                </Link>
              </div>
            </form>

            <p
              className="muted"
              style={{
                margin: "0 0 14px",
                fontSize: 13,
              }}
            >
              {filteredAccounts.length} accounts
            </p>

            {filteredAccounts.length === 0 ? (
              <section>
                <h2>No matching accounts</h2>

                <p className="muted">
                  Try another filter.
                </p>
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
                {filteredAccounts.map(
                  (account) => {
                    const archived =
                      account.is_archived;

                    return (
                      <div
                        key={account.id}
                        className={`card ${
                          archived
                            ? "mc-account-archived"
                            : ""
                        }`}
                        style={{
                          padding: 20,
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
                            <Link
                              href={`/accounts/${account.id}`}
                              style={{
                                fontSize: 18,
                                fontWeight: 700,
                                textDecoration:
                                  "none",
                                color:
                                  "var(--foreground)",
                              }}
                            >
                              {account.name}
                            </Link>

                            <p
                              className="muted"
                              style={{
                                margin:
                                  "5px 0 0",
                                fontSize: 13,
                                textTransform:
                                  "capitalize",
                              }}
                            >
                              {
                                account.account_type
                              }
                            </p>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection:
                                "column",
                              alignItems:
                                "flex-end",
                              gap: 5,
                            }}
                          >
                            <span
                              style={{
                                padding:
                                  "4px 8px",
                                borderRadius: 6,
                                background:
                                  "#f1f5f9",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              {
                                account.currency
                              }
                            </span>

                            {archived && (
                              <span className="mc-account-archived-badge">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            margin: "24px 0",
                          }}
                        >
                          <p
                            className="muted"
                            style={{
                              margin:
                                "0 0 5px",
                              fontSize: 13,
                            }}
                          >
                            Current balance
                          </p>

                          <strong
                            style={{
                              fontSize: 25,
                            }}
                          >
                            {formatMoney(
                              Number(
                                account.balance,
                              ),
                              account.currency,
                            )}
                          </strong>
                        </div>

                        <div className="mc-account-actions">
                          <Link
                            href={`/accounts/${account.id}`}
                            style={{
                              color:
                                "var(--primary)",
                              fontSize: 14,
                              fontWeight: 600,
                              textDecoration:
                                "none",
                            }}
                          >
                            View details →
                          </Link>

{archived ? (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      justifyContent: "flex-end",
    }}
  >
    <UnarchiveAccountButton
      accountId={account.id}
    />

    <DeleteAccountButton
      accountId={account.id}
    />
  </div>
) : (
  <ArchiveAccountButton
    accountId={account.id}
  />
)}

                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}