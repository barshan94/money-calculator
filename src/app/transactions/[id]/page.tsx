import Link from "next/link";
import { notFound } from "next/navigation";

import { VoidTransactionButton } from "@/components/transactions/void-transaction-button";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TransactionDetailPage({
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

  const { data: transaction, error: transactionError } =
    await supabase
      .from("transactions")
      .select(
        "id, transaction_date, description, reference, notes, transaction_type, status",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

  if (transactionError || !transaction) {
    notFound();
  }

  const { data: entries, error: entriesError } =
    await supabase
      .from("transaction_entries")
      .select(
        "id, account_id, category_id, amount, entry_type",
      )
      .eq("transaction_id", transaction.id);

  if (entriesError) {
    throw new Error(entriesError.message);
  }

  const accountIds = [
    ...new Set(
      (entries ?? []).map(
        (entry) => entry.account_id,
      ),
    ),
  ];

  const categoryIds = [
    ...new Set(
      (entries ?? [])
        .map((entry) => entry.category_id)
        .filter(Boolean),
    ),
  ];

  const [accountsResult, categoriesResult] =
    await Promise.all([
      accountIds.length > 0
        ? supabase
            .from("accounts")
            .select(
              "id, name, account_type, currency",
            )
            .in("id", accountIds)
            .eq("user_id", user.id)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      categoryIds.length > 0
        ? supabase
            .from("categories")
            .select(
              "id, name, category_type",
            )
            .in("id", categoryIds)
            .eq("user_id", user.id)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (accountsResult.error) {
    throw new Error(accountsResult.error.message);
  }

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  const accounts = accountsResult.data ?? [];
  const categories = categoriesResult.data ?? [];

  function getAccount(accountId: string) {
    return accounts.find(
      (account) => account.id === accountId,
    );
  }

  function getCategory(categoryId: string | null) {
    if (!categoryId) return null;

    return categories.find(
      (category) => category.id === categoryId,
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/transactions"
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Transactions
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
            <p
              className="muted"
              style={{
                margin: "0 0 6px",
                fontSize: 14,
              }}
            >
              Transaction details
            </p>

            <h1 style={{ marginBottom: 6 }}>
              {transaction.description ||
                "Transaction"}
            </h1>

            <p
              className="muted"
              style={{ margin: 0 }}
            >
              {new Date(
                transaction.transaction_date,
              ).toLocaleDateString("en-BD", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {transaction.status === "posted" &&
            transaction.transaction_type !==
              "opening_balance" && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={`/transactions/${transaction.id}/edit`}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  Edit
                </Link>

                <VoidTransactionButton
                  transactionId={transaction.id}
                />
              </div>
            )}
        </div>
      </div>

      {transaction.status === "voided" && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 8,
            background: "#fef2f2",
            color: "var(--danger)",
            fontWeight: 600,
          }}
        >
          This transaction has been voided.
        </div>
      )}

      {transaction.transaction_type ===
        "opening_balance" && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 8,
            background: "#f1f5f9",
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          Opening balance
        </div>
      )}

      <section>
        <h2>Details</h2>

        {entries && entries.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {entries.map((entry) => {
              const account = getAccount(
                entry.account_id,
              );

              const category = getCategory(
                entry.category_id,
              );

              const isDebit =
                entry.entry_type === "debit";

              return (
                <div
                  key={entry.id}
                  className="card"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 16,
                    padding: 17,
                  }}
                >
                  <div>
                    <p
                      className="muted"
                      style={{
                        margin: "0 0 5px",
                        fontSize: 12,
                        textTransform:
                          "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      {isDebit
                        ? "Debit"
                        : "Credit"}
                    </p>

                    <strong>
                      {category?.name ??
                        account?.name ??
                        "Unknown account"}
                    </strong>

                    {category &&
                      account &&
                      category.name !==
                        account.name && (
                        <p
                          className="muted"
                          style={{
                            margin: "4px 0 0",
                            fontSize: 13,
                          }}
                        >
                          {account.name}
                        </p>
                      )}
                  </div>

                  <strong
                    style={{
                      fontSize: 17,
                      whiteSpace: "nowrap",
                      color: isDebit
                        ? "var(--danger)"
                        : "var(--success)",
                    }}
                  >
                    {formatMoney(
                      Number(entry.amount),
                      account?.currency ?? "BDT",
                    )}
                  </strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            No transaction entries found.
          </p>
        )}
      </section>

      {(transaction.reference ||
        transaction.notes) && (
        <section>
          <h2>Additional Information</h2>

          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            {transaction.reference && (
              <div>
                <p
                  className="muted"
                  style={{
                    margin: "0 0 4px",
                    fontSize: 13,
                  }}
                >
                  Reference
                </p>

                <strong>
                  {transaction.reference}
                </strong>
              </div>
            )}

            {transaction.notes && (
              <div>
                <p
                  className="muted"
                  style={{
                    margin: "0 0 4px",
                    fontSize: 13,
                  }}
                >
                  Notes
                </p>

                <p style={{ margin: 0 }}>
                  {transaction.notes}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}