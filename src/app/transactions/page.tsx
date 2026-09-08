import Link from "next/link";

import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

type Transaction = {
  id: string;
  transaction_date: string;
  description: string | null;
  transaction_type: "normal" | "opening_balance";
  status: "posted" | "voided";
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

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [
    transactionsResult,
    entriesResult,
    categoriesResult,
    accounts,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, description, transaction_type, status",
      )
      .eq("user_id", user.id)
      .eq("status", "posted")
      .order("transaction_date", {
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

    getAccountBalances(),
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

  const transactions =
    (transactionsResult.data ?? []) as Transaction[];

  const entries =
    (entriesResult.data ?? []) as Entry[];

  const categories =
    (categoriesResult.data ?? []) as Category[];

  function getAccountName(accountId: string) {
    return (
      accounts.find(
        (account) => account.id === accountId,
      )?.name ?? "Unknown account"
    );
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return null;

    return (
      categories.find(
        (category) => category.id === categoryId,
      )?.name ?? null
    );
  }

  function getTransactionSummary(
    transactionId: string,
  ) {
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
        direction: "neutral" as const,
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
        direction: "expense" as const,
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
        direction: "income" as const,
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
      direction: "transfer" as const,
      currency:
        debitAccount?.currency ??
        creditAccount?.currency ??
        "BDT",
    };
  }

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

      <section>
        {transactions.length === 0 ? (
          <div
            style={{
              padding: "28px 0",
              textAlign: "center",
            }}
          >
            <h2>No transactions yet</h2>

            <p className="muted">
              Record your first income, expense, transfer,
              investment, loan, or other financial activity.
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
        ) : (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {transactions.map((transaction) => {
              const summary =
                getTransactionSummary(transaction.id);

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
                  className="card"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: 17,
                    transition:
                      "border-color .15s ease, transform .15s ease",
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
                            background: "#f1f5f9",
                            color: "var(--muted)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Opening balance
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
                      ).toLocaleDateString("en-BD", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>

                    {transaction.description && (
                      <p
                        className="muted"
                        style={{
                          margin: "4px 0 0",
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {transaction.description}
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
                        color: amountColor,
                        fontSize: 16,
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
                        textTransform: "capitalize",
                      }}
                    >
                      {summary.direction}
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