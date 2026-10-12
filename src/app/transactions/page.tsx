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
  account_type: "asset" | "liability" | "income" | "expense";
  currency: string;
};

type TransactionSummary = {
  label: string;
  amount: number;
  direction: "income" | "expense" | "transfer" | "neutral";
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

  const { sort = "newest", filter = "all" } = await searchParams;

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
      .in("status", ["posted", "voided"])
      .order("created_at", { ascending: false }),

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
      .select("id, name, account_type, currency")
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

  const entries = (entriesResult.data ?? []) as Entry[];
  const categories = (categoriesResult.data ?? []) as Category[];
  const accounts = (accountsResult.data ?? []) as Account[];

  // Reversal tracking
  const originalTransactions = allTransactions.filter(
    (transaction) => transaction.reversal_of_id === null,
  );

  const reversedTransactionIds = new Set(
    allTransactions
      .filter((transaction) => transaction.reversal_of_id !== null)
      .map((transaction) => transaction.reversal_of_id as string),
  );

  function getAccountName(accountId: string) {
    return (
      accounts.find((account) => account.id === accountId)?.name ??
      "Unknown account"
    );
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return null;

    return (
      categories.find((category) => category.id === categoryId)?.name ??
      null
    );
  }

  function getTransactionSummary(
    transactionId: string,
  ): TransactionSummary {
    const transactionEntries = entries.filter(
      (entry) => entry.transaction_id === transactionId,
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
      (account) => account.id === debitEntry.account_id,
    );

    const creditAccount = accounts.find(
      (account) => account.id === creditEntry.account_id,
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
      label: `${getAccountName(creditEntry.account_id)} → ${getAccountName(
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

  // Build transaction summaries
  const transactions: TransactionWithSummary[] =
    originalTransactions.map((transaction) => ({
      ...transaction,
      summary: getTransactionSummary(transaction.id),
      isReversed: reversedTransactionIds.has(transaction.id),
    }));

  // Filter
  let filteredTransactions = [...transactions];

  switch (filter) {
    case "income":
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.summary.direction === "income",
      );
      break;

    case "expense":
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.summary.direction === "expense",
      );
      break;

    case "transfer":
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.summary.direction === "transfer",
      );
      break;

    case "opening":
      filteredTransactions = filteredTransactions.filter(
        (transaction) =>
          transaction.transaction_type === "opening_balance",
      );
      break;

    case "reversed":
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.isReversed,
      );
      break;

    case "all":
    default:
      break;
  }

  // Sort
  filteredTransactions.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(a.transaction_date).getTime() -
          new Date(b.transaction_date).getTime()
        );

      case "highest-amount":
        return Number(b.summary.amount) - Number(a.summary.amount);

      case "lowest-amount":
        return Number(a.summary.amount) - Number(b.summary.amount);

      case "description-az":
        return (a.description ?? a.summary.label)
          .toLowerCase()
          .localeCompare(
            (b.description ?? b.summary.label).toLowerCase(),
          );

      case "description-za":
        return (b.description ?? b.summary.label)
          .toLowerCase()
          .localeCompare(
            (a.description ?? a.summary.label).toLowerCase(),
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
        .mc-transactions-page,
        .mc-transactions-page * {
          box-sizing: border-box;
        }

        .mc-transactions-page {
          width: 100%;
          min-width: 0;
          max-width: 100%;
        }

        .mc-transactions-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          width: 100%;
          min-width: 0;
          margin-bottom: 24px;
        }

        .mc-transactions-heading {
          flex: 1 1 220px;
          min-width: 0;
        }

        .mc-transactions-heading h1 {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .mc-transactions-eyebrow {
          margin: 0 0 6px;
          font-size: 14px;
        }

        .mc-transactions-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          max-width: 100%;
          padding: 10px 16px;
          border-radius: 8px;
          background: var(--primary);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          text-align: center;
          overflow-wrap: anywhere;
        }

        .mc-transactions-add:hover {
          opacity: 0.9;
        }

        .mc-export-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .mc-export-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          color: #fff;
          background: var(--primary);
          transition: opacity 120ms ease;
        }

        .mc-export-button:hover {
          opacity: 0.9;
        }

        @media (max-width: 520px) {
          .mc-export-button {
            width: 100%;
          }
        }

        .mc-transaction-controls {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr)
            auto;
          align-items: end;
          gap: 12px;
          width: 100%;
          min-width: 0;
          margin: 0 0 20px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .mc-transaction-control {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .mc-transaction-control label {
          font-size: 12px;
          line-height: 1.4;
          font-weight: 600;
        }

        .mc-transaction-control select {
          display: block;
          width: 100%;
          min-width: 0;
          height: 42px;
          padding: 0 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font: inherit;
          font-size: 14px;
        }

        .mc-transaction-control select:focus-visible,
        .mc-transaction-apply:focus-visible,
        .mc-transaction-reset:focus-visible,
        .mc-transactions-add:focus-visible,
        .mc-transaction-card:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 3px;
        }

        .mc-transaction-control-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .mc-transaction-apply,
        .mc-transaction-reset {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 14px;
          border-radius: 8px;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
          cursor: pointer;
        }

        .mc-transaction-apply {
          border: 1px solid var(--primary);
          background: var(--primary);
          color: #fff;
        }

        .mc-transaction-reset {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--foreground);
          text-decoration: none;
        }

        .mc-transaction-apply:hover,
        .mc-transaction-reset:hover {
          opacity: 0.85;
        }

        .mc-transaction-count {
          margin: 0 0 12px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .mc-transaction-list {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          width: 100%;
          min-width: 0;
        }

        .mc-transaction-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          padding: 16px;
          text-decoration: none;
          overflow: hidden;
        }

        .mc-transaction-main {
          min-width: 0;
          max-width: 100%;
        }

        .mc-transaction-title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          min-width: 0;
        }

        .mc-transaction-title {
          min-width: 0;
          max-width: 100%;
          font-size: 15px;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .mc-transaction-badge {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          max-width: 100%;
          padding: 3px 7px;
          border-radius: 5px;
          background: var(--background);
          color: var(--muted);
          font-size: 10px;
          line-height: 1.4;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .mc-transaction-meta {
          margin: 6px 0 0;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .mc-transaction-description {
          margin: 5px 0 0;
          font-size: 13px;
          line-height: 1.5;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .mc-transaction-amount {
          min-width: 0;
          max-width: 100%;
          text-align: right;
        }

        .mc-transaction-amount strong {
          display: block;
          font-size: 15px;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
          font-variant-numeric: tabular-nums;
        }

        .mc-transaction-direction {
          margin: 4px 0 0;
          font-size: 11px;
          text-transform: capitalize;
          overflow-wrap: anywhere;
        }

        .mc-transaction-empty {
          width: 100%;
          min-width: 0;
          padding: 28px 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          text-align: center;
        }

        .mc-transaction-empty h2 {
          margin-top: 0;
          overflow-wrap: anywhere;
        }

        .mc-transaction-empty p {
          overflow-wrap: anywhere;
        }

        .mc-transaction-empty-action {
          margin-top: 8px;
        }

        @media (max-width: 760px) {
          .mc-transaction-controls {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
            padding: 14px;
          }

          .mc-transaction-control-actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            width: 100%;
          }

          .mc-transaction-apply,
          .mc-transaction-reset {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 520px) {
          .mc-transactions-header {
            gap: 12px;
            margin-bottom: 20px;
          }

          .mc-transactions-heading {
            flex-basis: 100%;
          }

          .mc-transactions-add {
            width: 100%;
          }

          .mc-transaction-card {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
            padding: 14px;
          }

          .mc-transaction-amount {
            padding-top: 10px;
            border-top: 1px solid var(--border);
            text-align: left;
          }

          .mc-transaction-amount strong {
            font-size: 16px;
          }

          .mc-transaction-badge {
            white-space: normal;
          }
        }

        @media (max-width: 360px) {
          .mc-transaction-controls {
            padding: 10px;
          }

          .mc-transaction-card {
            padding: 12px;
          }

          .mc-transaction-control-actions {
            gap: 6px;
          }

          .mc-transaction-apply,
          .mc-transaction-reset {
            padding: 0 8px;
            font-size: 13px;
          }
        }

        @media (prefers-reduced-motion: no-preference) {
          .mc-transaction-card,
          .mc-transactions-add,
          .mc-transaction-apply,
          .mc-transaction-reset {
            transition: opacity 120ms ease;
          }
        }
      `}</style>

      <main className="mc-transactions-page">
        <header className="mc-transactions-header">
          <div className="mc-transactions-heading">
            <p className="muted mc-transactions-eyebrow">
              Your financial activity
            </p>

            <h1>Transactions</h1>
          </div>

          <Link
            href="/transactions/new"
            className="mc-transactions-add"
          >
            + Add Transaction
          </Link>
        </header>

        <div className="mc-export-buttons">
          <a
            href="/api/export?format=csv&page=1&size=50"
            download
            className="mc-export-button"
          >
            Export CSV
          </a>
          <a
            href="/api/export?format=excel&page=1&size=50"
            download
            className="mc-export-button"
          >
            Export Excel
          </a>
        </div>

        {transactions.length === 0 ? (
          <section className="mc-transaction-empty">
            <h2>No transactions yet</h2>

            <p className="muted">
              Record your first income, expense, transfer, investment,
              loan, or other financial activity.
            </p>

            <Link
              href="/transactions/new"
              className="mc-transactions-add mc-transaction-empty-action"
            >
              Add Transaction
            </Link>
          </section>
        ) : (
          <>
            <form
              method="GET"
              className="mc-transaction-controls"
            >
              <div className="mc-transaction-control">
                <label htmlFor="filter">Filter</label>

                <select
                  id="filter"
                  name="filter"
                  defaultValue={filter}
                >
                  <option value="all">All transactions</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                  <option value="opening">Opening balance</option>
                  <option value="reversed">Reversed</option>
                </select>
              </div>

              <div className="mc-transaction-control">
                <label htmlFor="sort">Sort</label>

                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="highest-amount">Highest amount</option>
                  <option value="lowest-amount">Lowest amount</option>
                  <option value="description-az">Description A–Z</option>
                  <option value="description-za">Description Z–A</option>
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

            <p className="muted mc-transaction-count">
              {filteredTransactions.length} of {transactions.length}{" "}
              transactions
            </p>

            {filteredTransactions.length === 0 ? (
              <section className="mc-transaction-empty">
                <h2>No matching transactions</h2>

                <p className="muted">
                  Try changing your filter or reset the transaction list.
                </p>

                <Link
                  href="/transactions"
                  className="mc-transactions-add mc-transaction-empty-action"
                >
                  Reset filters
                </Link>
              </section>
            ) : (
              <div className="mc-transaction-list">
                {filteredTransactions.map((transaction) => {
                  const summary = transaction.summary;

                  const amountColor =
                    summary.direction === "income"
                      ? "var(--success)"
                      : summary.direction === "expense"
                        ? "var(--danger)"
                        : "var(--foreground)";

                  const prefix =
                    summary.direction === "income"
                      ? "+"
                      : summary.direction === "expense"
                        ? "−"
                        : "";

                  return (
                    <Link
                      key={transaction.id}
                      href={`/transactions/${transaction.id}`}
                      className="card mc-transaction-card"
                      style={{
                        opacity: transaction.isReversed ? 0.72 : 1,
                      }}
                    >
                      <div className="mc-transaction-main">
                        <div className="mc-transaction-title-row">
                          <strong
                            className="mc-transaction-title"
                            style={{
                              textDecoration: transaction.isReversed
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {summary.label}
                          </strong>

                          {transaction.transaction_type ===
                            "opening_balance" && (
                            <span className="mc-transaction-badge">
                              Opening balance
                            </span>
                          )}

                          {transaction.isReversed && (
                            <span className="mc-transaction-badge">
                              ↩ Reversed
                            </span>
                          )}
                        </div>

                        <p className="muted mc-transaction-meta">
                          {new Date(
                            transaction.transaction_date,
                          ).toLocaleDateString("en-BD", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {" · "}
                          {new Date(
                            transaction.created_at,
                          ).toLocaleTimeString("en-BD", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>

                        {transaction.description && (
                          <p className="muted mc-transaction-description">
                            {transaction.description}
                          </p>
                        )}
                      </div>

                      <div className="mc-transaction-amount">
                        <strong
                          style={{
                            color: transaction.isReversed
                              ? "var(--muted)"
                              : amountColor,
                            textDecoration: transaction.isReversed
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {prefix}
                          {formatMoney(summary.amount, summary.currency)}
                        </strong>

                        <p className="muted mc-transaction-direction">
                          {summary.direction}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

