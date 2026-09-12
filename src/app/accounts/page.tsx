import Link from "next/link";

import { ArchiveAccountButton } from "@/components/accounts/archive-account-button";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { formatMoney } from "@/lib/finance/format-money";

type SearchParams = {
  sort?: string;
  filter?: string;
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const accounts = await getAccountBalances();

  const { sort = "name-az", filter = "all" } = await searchParams;

  const userAccounts = accounts.filter(
    (account) =>
      account.account_type === "asset" ||
      account.account_type === "liability",
  );

  const currencies = Array.from(
    new Set(userAccounts.map((account) => account.currency)),
  ).sort();

  // ---------------------------------------------------------
  // FILTER
  // ---------------------------------------------------------

  let filteredAccounts = [...userAccounts];

  if (filter === "asset") {
    filteredAccounts = filteredAccounts.filter(
      (account) => account.account_type === "asset",
    );
  } else if (filter === "liability") {
    filteredAccounts = filteredAccounts.filter(
      (account) => account.account_type === "liability",
    );
  } else if (
    filter !== "all" &&
    currencies.includes(filter)
  ) {
    filteredAccounts = filteredAccounts.filter(
      (account) => account.currency === filter,
    );
  }

  // ---------------------------------------------------------
  // SORT
  // ---------------------------------------------------------

  filteredAccounts.sort((a, b) => {
    switch (sort) {
      case "name-za":
        return b.name.localeCompare(a.name);

      case "highest-balance":
        return Number(b.balance) - Number(a.balance);

      case "lowest-balance":
        return Number(a.balance) - Number(b.balance);

      case "newest":
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );

      case "oldest":
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );

      case "name-az":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <>
      <style>{`
        /* =====================================================
           ACCOUNTS FILTER / SORT
        ===================================================== */

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
          line-height: 1.3;
          font-weight: 600;
        }

        .mc-account-control select {
          width: 100%;
          height: 40px;
          box-sizing: border-box;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--background);
          color: var(--foreground);
          font: inherit;
          font-size: 14px;
        }

        .mc-account-control-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mc-account-apply,
        .mc-account-reset {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          box-sizing: border-box;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .mc-account-apply {
          padding: 0 16px;
          border: 0;
          background: var(--primary);
          color: #fff;
          cursor: pointer;
        }

        .mc-account-reset {
          padding: 0 14px;
          border: 1px solid var(--border);
          color: var(--foreground);
          text-decoration: none;
        }

        @media (max-width: 700px) {
          .mc-account-controls {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 14px;
          }

          .mc-account-control {
            width: 100%;
            min-width: 0;
          }

          .mc-account-control select {
            width: 100%;
          }

          .mc-account-control-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
            gap: 8px;
          }

          .mc-account-apply,
          .mc-account-reset {
            width: 100%;
          }
        }
      `}</style>

      <div>
        {/* Header */}

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
          <>
            {/* Filter / Sort */}

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
                  <option value="all">
                    All accounts
                  </option>

                  <option value="asset">
                    Assets
                  </option>

                  <option value="liability">
                    Liabilities
                  </option>

                  {currencies.map((currency) => (
                    <option
                      key={currency}
                      value={currency}
                    >
                      {currency}
                    </option>
                  ))}
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

                  <option value="newest">
                    Newest
                  </option>

                  <option value="oldest">
                    Oldest
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

            {/* Result count */}

            <p
              className="muted"
              style={{
                margin: "0 0 14px",
                fontSize: 13,
              }}
            >
              {filteredAccounts.length} of{" "}
              {userAccounts.length} accounts
            </p>

            {/* Account Grid */}

            {filteredAccounts.length === 0 ? (
              <section>
                <h2>No matching accounts</h2>

                <p className="muted">
                  Try changing your filter or reset the
                  account list.
                </p>

                <Link
                  href="/accounts"
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
                  Reset filters
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
                {filteredAccounts.map((account) => (
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

                    <div
                      style={{
                        margin: "24px 0",
                      }}
                    >
                      <p
                        className="muted"
                        style={{
                          margin: "0 0 5px",
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
                        borderTop:
                          "1px solid var(--border)",
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
          </>
        )}
      </div>
    </>
  );
}