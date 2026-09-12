import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

type SearchParams = {
  sort?: string;
  filter?: string;
};

type Transaction = {
  id: string;
  transaction_date: string;
  description: string | null;
  transaction_type: "normal" | "opening_balance";
  status: "posted" | "voided";
  created_at: string;
  reversal_of_id: string | null;
};

type Entry = {
  transaction_id: string;
  amount: number;
  entry_type: "debit" | "credit";
  account_id: string;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
  account_type:
    | "asset"
    | "liability"
    | "income"
    | "expense";
  currency: string;
};

type TransactionSummary = {
  label: string;
  amount: number;
  direction:
    | "income"
    | "expense"
    | "transfer"
    | "neutral";
  currency: string;
};

type TransactionWithSummary = Transaction & {
  summary: TransactionSummary;
  isReversed: boolean;
};

export default async function TransactionsPage({
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

  const { sort = "newest", filter = "all" } =
    await searchParams;

  const [
    transactionsResult,
    entriesResult,
    categoriesResult,
    accountsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, description, transaction_type, status, created_at, reversal_of_id",
      )
      .eq("user_id", user.id)
      .eq("status", "posted")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("transaction_entries")
      .select(
        "transaction_id, amount, entry_type, account_id, category_id",
      ),

    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id),

    supabase
      .from("accounts")
      .select(
        "id, name, account_type, currency",
      )
      .eq("user_id", user.id),
  ]);

  if (transactionsResult.error) {
    throw new Error(transactionsResult.error.message);
  }

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message);
  }

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (accountsResult.error) {
    throw new Error(accountsResult.error.message);
  }

  const allTransactions =
    (transactionsResult.data ?? []) as Transaction[];

  const entries =
    (entriesResult.data ?? []) as Entry[];

  const categories =
    (categoriesResult.data ?? []) as Category[];

  const accounts =
    (accountsResult.data ?? []) as Account[];

  // ---------------------------------------------------------
  // REVERSALS
  // ---------------------------------------------------------

  const originalTransactions =
    allTransactions.filter(
      (transaction) =>
        transaction.reversal_of_id === null,
    );

  const reversedTransactionIds = new Set(
    allTransactions
      .filter(
        (transaction) =>
          transaction.reversal_of_id !== null,
      )
      .map(
        (transaction) =>
          transaction.reversal_of_id as string,
      ),
  );

  function getAccountName(accountId: string) {
    return (
      accounts.find(
        (account) => account.id === accountId,
      )?.name ?? "Unknown account"
    );
  }

  function getCategoryName(
    categoryId: string | null,
  ) {
    if (!categoryId) return null;

    return (
      categories.find(
        (category) => category.id === categoryId,
      )?.name ?? null
    );
  }

  function getTransactionSummary(
    transactionId: string,
  ): TransactionSummary {
    const transactionEntries = entries.filter(
      (entry) =>
        entry.transaction_id === transactionId,
    );

    const categoryEntry = transactionEntries.find(
      (entry) => entry.category_id !== null,
    );

    const categoryName = getCategoryName(
      categoryEntry?.category_id ?? null,
    );

    const debitEntry = transactionEntries.find(
      (entry) => entry.entry_type === "debit",
    );

    const creditEntry = transactionEntries.find(
      (entry) => entry.entry_type === "credit",
    );

    if (!debitEntry || !creditEntry) {
      return {
        label: "Transaction",
        amount: 0,
        direction: "neutral",
        currency: "BDT",
      };
    }

    const debitAccount = accounts.find(
      (account) =>
        account.id === debitEntry.account_id,
    );

    const creditAccount = accounts.find(
      (account) =>
        account.id === creditEntry.account_id,
    );

    if (
      categoryName &&
      debitAccount?.account_type === "expense"
    ) {
      return {
        label: categoryName,
        amount: debitEntry.amount,
        direction: "expense",
        currency: debitAccount.currency,
      };
    }

    if (
      categoryName &&
      creditAccount?.account_type === "income"
    ) {
      return {
        label: categoryName,
        amount: creditEntry.amount,
        direction: "income",
        currency: creditAccount.currency,
      };
    }

    return {
      label: `${getAccountName(
        creditEntry.account_id,
      )} → ${getAccountName(
        debitEntry.account_id,
      )}`,
      amount: debitEntry.amount,
      direction: "transfer",
      currency:
        debitAccount?.currency ??
        creditAccount?.currency ??
        "BDT",
    };
  }

  // ---------------------------------------------------------
  // BUILD TRANSACTIONS
  // ---------------------------------------------------------

  const transactions: TransactionWithSummary[] =
    originalTransactions.map((transaction) => ({
      ...transaction,
      summary: getTransactionSummary(transaction.id),
      isReversed: reversedTransactionIds.has(
        transaction.id,
      ),
    }));

  // ---------------------------------------------------------
  // FILTER
  // ---------------------------------------------------------

  let filteredTransactions = [...transactions];

  switch (filter) {
    case "income":
      filteredTransactions =
        filteredTransactions.filter(
          (transaction) =>
            transaction.summary.direction ===
            "income",
        );
      break;

    case "expense":
      filteredTransactions =
        filteredTransactions.filter(
          (transaction) =>
            transaction.summary.direction ===
            "expense",
        );
      break;

    case "transfer":
      filteredTransactions =
        filteredTransactions.filter(
          (transaction) =>
            transaction.summary.direction ===
            "transfer",
        );
      break;

    case "opening":
      filteredTransactions =
        filteredTransactions.filter(
          (transaction) =>
            transaction.transaction_type ===
            "opening_balance",
        );
      break;

    case "reversed":
      filteredTransactions =
        filteredTransactions.filter(
          (transaction) => transaction.isReversed,
        );
      break;

    case "all":
    default:
      break;
  }

  // ---------------------------------------------------------
  // SORT
  // ---------------------------------------------------------

  filteredTransactions.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(a.transaction_date).getTime() -
          new Date(b.transaction_date).getTime()
        );

      case "highest-amount":
        return (
          Number(b.summary.amount) -
          Number(a.summary.amount)
        );

      case "lowest-amount":
        return (
          Number(a.summary.amount) -
          Number(b.summary.amount)
        );

      case "description-az":
        return (
          (a.description ?? a.summary.label)
            .toLowerCase()
            .localeCompare(
              (
                b.description ?? b.summary.label
              ).toLowerCase(),
            )
        );

      case "description-za":
        return (
          (b.description ?? b.summary.label)
            .toLowerCase()
            .localeCompare(
              (
                a.description ?? a.summary.label
              ).toLowerCase(),
            )
        );

      case "newest":
      default:
        return (
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
        );
    }
  });

  return (
    <>
      <style>{`
        /* =====================================================
           TRANSACTION FILTER / SORT
        ===================================================== */

        .mc-transaction-controls {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
        }

        .mc-transaction-control {
          display: grid;
          gap: 6px;
          min-width: 190px;
        }

        .mc-transaction-control label {
          font-size: 12px;
          line-height: 1.3;
          font-weight: 600;
        }

        .mc-transaction-control select {
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

        .mc-transaction-control-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mc-transaction-apply,
        .mc-transaction-reset {
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

        .mc-transaction-apply {
          padding: 0 16px;
          border: 0;
          background: var(--primary);
          color: #fff;
          cursor: pointer;
        }

        .mc-transaction-reset {
          padding: 0 14px;
          border: 1px solid var(--border);
          color: var(--foreground);
          text-decoration: none;
        }

        @media (max-width: 700px) {
          .mc-transaction-controls {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 14px;
          }

          .mc-transaction-control {
            width: 100%;
            min-width: 0;
          }

          .mc-transaction-control select {
            width: 100%;
          }

          .mc-transaction-control-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
            gap: 8px;
          }

          .mc-transaction-apply,
          .mc-transaction-reset {
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
              Your financial activity
            </p>

            <h1 style={{ marginBottom: 0 }}>
              Transactions
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

        {transactions.length === 0 ? (
          <section>
            <div
              style={{
                padding: "28px 0",
                textAlign: "center",
              }}
            >
              <h2>No transactions yet</h2>

              <p className="muted">
                Record your first income, expense,
                transfer, investment, loan, or other
                financial activity.
              </p>

              <Link
                href="/transactions/new"
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
                Add Transaction
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* Filter / Sort */}

            <form
              method="GET"
              className="mc-transaction-controls"
            >
              <div className="mc-transaction-control">
                <label htmlFor="filter">
                  Filter
                </label>

                <select
                  id="filter"
                  name="filter"
                  defaultValue={filter}
                >
                  <option value="all">
                    All transactions
                  </option>

                  <option value="income">
                    Income
                  </option>

                  <option value="expense">
                    Expense
                  </option>

                  <option value="transfer">
                    Transfer
                  </option>

                  <option value="opening">
                    Opening balance
                  </option>

                  <option value="reversed">
                    Reversed
                  </option>
                </select>
              </div>

              <div className="mc-transaction-control">
                <label htmlFor="sort">
                  Sort
                </label>

                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                >
                  <option value="newest">
                    Newest
                  </option>

                  <option value="oldest">
                    Oldest
                  </option>

                  <option value="highest-amount">
                    Highest amount
                  </option>

                  <option value="lowest-amount">
                    Lowest amount
                  </option>

                  <option value="description-az">
                    Description A–Z
                  </option>

                  <option value="description-za">
                    Description Z–A
                  </option>
                </select>
              </div>

              <div className="mc-transaction-control-actions">
                <button
                  type="submit"
                  className="mc-transaction-apply"
                >
                  Apply
                </button>

                <Link
                  href="/transactions"
                  className="mc-transaction-reset"
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
              {filteredTransactions.length} of{" "}
              {transactions.length} transactions
            </p>

            {/* Transaction List */}

            {filteredTransactions.length === 0 ? (
              <section>
                <h2>No matching transactions</h2>

                <p className="muted">
                  Try changing your filter or reset the
                  transaction list.
                </p>

                <Link
                  href="/transactions"
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
                  gap: 10,
                }}
              >
                {filteredTransactions.map(
                  (transaction) => {
                    const summary =
                      transaction.summary;

                    const amountColor =
                      summary.direction === "income"
                        ? "var(--success)"
                        : summary.direction ===
                            "expense"
                          ? "var(--danger)"
                          : "var(--foreground)";

                    const prefix =
                      summary.direction === "income"
                        ? "+"
                        : summary.direction ===
                            "expense"
                          ? "−"
                          : "";

                    return (
                      <Link
                        key={transaction.id}
                        href={`/transactions/${transaction.id}`}
                        className="card"
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: 16,
                          padding: 17,
                          opacity:
                            transaction.isReversed
                              ? 0.65
                              : 1,
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 16,
                                textDecoration:
                                  transaction.isReversed
                                    ? "line-through"
                                    : "none",
                              }}
                            >
                              {summary.label}
                            </strong>

                            {transaction.transaction_type ===
                              "opening_balance" && (
                              <span
                                style={{
                                  padding: "3px 7px",
                                  borderRadius: 5,
                                  background:
                                    "#f1f5f9",
                                  color:
                                    "var(--muted)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                Opening balance
                              </span>
                            )}

                            {transaction.isReversed && (
                              <span
                                style={{
                                  padding: "3px 7px",
                                  borderRadius: 5,
                                  background:
                                    "#f1f5f9",
                                  color:
                                    "var(--muted)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                ↩ Reversed
                              </span>
                            )}
                          </div>

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
                            )}{" "}
                            ·{" "}
                            {new Date(
                              transaction.created_at,
                            ).toLocaleTimeString(
                              "en-BD",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )}
                          </p>

                          {transaction.description && (
                            <p
                              className="muted"
                              style={{
                                margin: "4px 0 0",
                                fontSize: 13,
                                overflow: "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {
                                transaction.description
                              }
                            </p>
                          )}
                        </div>

                        <div
                          style={{
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          <strong
                            style={{
                              color:
                                transaction.isReversed
                                  ? "var(--muted)"
                                  : amountColor,
                              fontSize: 16,
                              textDecoration:
                                transaction.isReversed
                                  ? "line-through"
                                  : "none",
                            }}
                          >
                            {prefix}
                            {formatMoney(
                              summary.amount,
                              summary.currency,
                            )}
                          </strong>

                          <p
                            className="muted"
                            style={{
                              margin: "4px 0 0",
                              fontSize: 11,
                              textTransform:
                                "capitalize",
                            }}
                          >
                            {summary.direction}
                          </p>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}