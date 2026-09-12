"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  account_type: "asset" | "liability";
  currency: string;
};

type Category = {
  id: string;
  name: string;
  category_type: "income" | "expense";
  ledger_account_id: string | null;
};

type Entry = {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  entry_type: "debit" | "credit";
};

export default function EditTransactionPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();

  const transactionId = params.id as string;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] =
    useState("");
  const [description, setDescription] = useState("");

  const [type, setType] = useState<
    "expense" | "income" | "transfer"
  >("expense");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [
        transactionResult,
        entriesResult,
        accountsResult,
        categoriesResult,
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, transaction_date, description, transaction_type, status, loan_id, reversal_of_id",
          )
          .eq("id", transactionId)
          .eq("user_id", user.id)
          .single(),

        supabase
          .from("transaction_entries")
          .select(
            "id, account_id, category_id, amount, entry_type",
          )
          .eq("transaction_id", transactionId),

        supabase
          .from("accounts")
          .select(
            "id, name, account_type, currency",
          )
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .eq("is_system", false)
          .order("name"),

        supabase
          .from("categories")
          .select(
            "id, name, category_type, ledger_account_id",
          )
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .order("name"),
      ]);

      if (
        transactionResult.error ||
        !transactionResult.data ||
        entriesResult.error ||
        accountsResult.error ||
        categoriesResult.error
      ) {
        setMessage("Unable to load transaction.");
        setLoading(false);
        return;
      }

      const transaction = transactionResult.data;
      const entries = entriesResult.data as Entry[];

      /*
       * Check whether this transaction belongs to a tuition payment.
       * Tuition transactions must be edited from the Tuition section.
       */
      const {
        data: tuitionPayment,
        error: tuitionPaymentError,
      } = await supabase
        .from("tuition_payments")
        .select("id")
        .eq("transaction_id", transaction.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (tuitionPaymentError) {
        setMessage(
          "Unable to verify the transaction type.",
        );
        setLoading(false);
        return;
      }

      /*
       * Loan transactions must be edited from the Loans section.
       */
      const isTuitionPayment = !!tuitionPayment;
      const isLoanTransaction = !!transaction.loan_id;

      /*
       * A voided transaction keeps its original row and gets
       * a separate reversal transaction whose reversal_of_id
       * points back to the original transaction.
       */
      const {
        data: reversalTransaction,
        error: reversalError,
      } = await supabase
        .from("transactions")
        .select("id")
        .eq("reversal_of_id", transaction.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (reversalError) {
        setMessage(
          "Unable to verify the transaction status.",
        );
        setLoading(false);
        return;
      }

      const isVoided = !!reversalTransaction;

      /*
       * Protect cancelled transactions.
       */
      if (isVoided) {
        setMessage(
          "This transaction has already been cancelled and cannot be edited.",
        );
        setLoading(false);
        return;
      }

      /*
       * Protect special business transactions.
       */
      if (isTuitionPayment) {
        setMessage(
          "Tuition payments must be edited from the Tuition section.",
        );
        setLoading(false);
        return;
      }

      if (isLoanTransaction) {
        setMessage(
          "Loan transactions must be edited from the Loans section.",
        );
        setLoading(false);
        return;
      }

      /*
       * Protect opening balances and non-posted transactions.
       */
      if (
        transaction.status !== "posted" ||
        transaction.transaction_type ===
          "opening_balance"
      ) {
        setMessage(
          "This transaction cannot be edited.",
        );
        setLoading(false);
        return;
      }

      setAccounts(accountsResult.data ?? []);
      setCategories(categoriesResult.data ?? []);

      setDate(
        new Date(transaction.transaction_date)
          .toISOString()
          .slice(0, 10),
      );

      setDescription(
        transaction.description ?? "",
      );

      const categoryEntry = entries.find(
        (entry) => entry.category_id !== null,
      );

      if (categoryEntry?.category_id) {
        setCategoryId(categoryEntry.category_id);

        setAmount(
          String(categoryEntry.amount),
        );

        const otherEntry = entries.find(
          (entry) =>
            entry.id !== categoryEntry.id,
        );

        if (categoryEntry.entry_type === "debit") {
          setType("expense");

          if (otherEntry) {
            setSourceAccountId(
              otherEntry.account_id,
            );
          }
        } else {
          setType("income");

          if (otherEntry) {
            setDestinationAccountId(
              otherEntry.account_id,
            );
          }
        }
      } else if (entries.length === 2) {
        const debit = entries.find(
          (entry) =>
            entry.entry_type === "debit",
        );

        const credit = entries.find(
          (entry) =>
            entry.entry_type === "credit",
        );

        if (debit && credit) {
          setType("transfer");
          setAmount(String(debit.amount));
          setDestinationAccountId(
            debit.account_id,
          );
          setSourceAccountId(
            credit.account_id,
          );
        }
      }

      setLoading(false);
    }

    load();
  }, [transactionId, router, supabase]);

  const moneyAccounts = accounts.filter(
    (account) =>
      account.account_type === "asset" ||
      account.account_type === "liability",
  );

  const expenseCategories = categories.filter(
    (category) =>
      category.category_type === "expense",
  );

  const incomeCategories = categories.filter(
    (category) =>
      category.category_type === "income",
  );

  const selectedSourceAccount =
    accounts.find(
      (account) =>
        account.id === sourceAccountId,
    );

  const selectedDestinationAccount =
    accounts.find(
      (account) =>
        account.id === destinationAccountId,
    );

  const selectedCategory = categories.find(
    (category) =>
      category.id === categoryId,
  );

  const selectedCurrency =
    selectedSourceAccount?.currency ??
    selectedDestinationAccount?.currency ??
    "BDT";

  function resetTypeFields(
    newType:
      | "expense"
      | "income"
      | "transfer",
  ) {
    setType(newType);
    setCategoryId("");
    setSourceAccountId("");
    setDestinationAccountId("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const numericAmount = Number(amount);

    if (!date) {
      setMessage("Select a transaction date.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage("Enter a valid amount.");
      return;
    }

    if (
      type !== "transfer" &&
      !selectedCategory
    ) {
      setMessage("Select a category.");
      return;
    }

    if (
      type === "expense" &&
      !sourceAccountId
    ) {
      setMessage(
        "Select the account you paid from.",
      );
      return;
    }

    if (
      type === "income" &&
      !destinationAccountId
    ) {
      setMessage(
        "Select where you received the money.",
      );
      return;
    }

    if (type === "transfer") {
      if (
        !sourceAccountId ||
        !destinationAccountId
      ) {
        setMessage(
          "Select both accounts.",
        );
        return;
      }

      if (
        sourceAccountId ===
        destinationAccountId
      ) {
        setMessage(
          "Source and destination cannot be the same.",
        );
        return;
      }
    }

    if (
      type === "expense" &&
      selectedCategory?.category_type !==
        "expense"
    ) {
      setMessage("Invalid expense category.");
      return;
    }

    if (
      type === "income" &&
      selectedCategory?.category_type !==
        "income"
    ) {
      setMessage("Invalid income category.");
      return;
    }

    if (
      type !== "transfer" &&
      !selectedCategory?.ledger_account_id
    ) {
      setMessage(
        "Selected category is not properly connected.",
      );
      return;
    }

    if (
      type === "expense" &&
      selectedSourceAccount &&
      selectedCategory &&
      accounts.find(
        (account) =>
          account.id ===
          selectedCategory.ledger_account_id,
      )?.currency !==
        selectedSourceAccount.currency
    ) {
      setMessage(
        "Category and account currencies must match.",
      );
      return;
    }

    if (
      type === "income" &&
      selectedDestinationAccount &&
      selectedCategory &&
      accounts.find(
        (account) =>
          account.id ===
          selectedCategory.ledger_account_id,
      )?.currency !==
        selectedDestinationAccount.currency
    ) {
      setMessage(
        "Category and account currencies must match.",
      );
      return;
    }

    if (
      type === "transfer" &&
      selectedSourceAccount &&
      selectedDestinationAccount &&
      selectedSourceAccount.currency !==
        selectedDestinationAccount.currency
    ) {
      setMessage(
        "Source and destination must use the same currency.",
      );
      return;
    }

    setSaving(true);

    let transactionEntries: object[];

    if (type === "expense") {
      transactionEntries = [
        {
          account_id:
            selectedCategory!.ledger_account_id,
          category_id: selectedCategory!.id,
          amount: numericAmount,
          entry_type: "debit",
        },
        {
          account_id: sourceAccountId,
          category_id: null,
          amount: numericAmount,
          entry_type: "credit",
        },
      ];
    } else if (type === "income") {
      transactionEntries = [
        {
          account_id: destinationAccountId,
          category_id: null,
          amount: numericAmount,
          entry_type: "debit",
        },
        {
          account_id:
            selectedCategory!.ledger_account_id,
          category_id: selectedCategory!.id,
          amount: numericAmount,
          entry_type: "credit",
        },
      ];
    } else {
      transactionEntries = [
        {
          account_id: destinationAccountId,
          category_id: null,
          amount: numericAmount,
          entry_type: "debit",
        },
        {
          account_id: sourceAccountId,
          category_id: null,
          amount: numericAmount,
          entry_type: "credit",
        },
      ];
    }

    const { error } = await supabase.rpc(
      "update_transaction",
      {
        p_transaction_id: transactionId,
        p_transaction_date: new Date(
          `${date}T12:00:00`,
        ).toISOString(),
        p_description:
          description.trim() || null,
        p_entries: transactionEntries,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(
      `/transactions/${transactionId}`,
    );
    router.refresh();
  }

  if (loading) {
    return (
      <div>
        <section>
          <p className="muted">
            Loading transaction...
          </p>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href={`/transactions/${transactionId}`}
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Transaction
        </Link>

        <h1
          style={{
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          Edit Transaction
        </h1>

        <p className="muted">
          Update the transaction details below.
        </p>
      </div>

      <section>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          <div>
            <label
              htmlFor="transaction-type"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Transaction type
            </label>

            <select
              id="transaction-type"
              value={type}
              onChange={(event) =>
                resetTypeFields(
                  event.target.value as
                    | "expense"
                    | "income"
                    | "transfer",
                )
              }
              style={{
                width: "100%",
                padding: "11px 12px",
                border:
                  "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <option value="expense">
                Expense
              </option>
              <option value="income">
                Income
              </option>
              <option value="transfer">
                Transfer
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="transaction-date"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Date
            </label>

            <input
              id="transaction-date"
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              required
              style={{
                width: "100%",
                padding: "11px 12px",
                border:
                  "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="transaction-amount"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Amount
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                border:
                  "1px solid var(--border)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <span
                className="muted"
                style={{
                  paddingLeft: 12,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {selectedCurrency}
              </span>

              <input
                id="transaction-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                required
                style={{
                  width: "100%",
                  padding:
                    "11px 12px",
                  border: 0,
                }}
              />
            </div>
          </div>

          {type === "expense" && (
            <>
              <div>
                <label
                  htmlFor="expense-category"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  Category
                </label>

                <select
                  id="expense-category"
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value,
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <option value="">
                    Select category
                  </option>

                  {expenseCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="expense-account"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  Paid from
                </label>

                <select
                  id="expense-account"
                  value={sourceAccountId}
                  onChange={(event) =>
                    setSourceAccountId(
                      event.target.value,
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <option value="">
                    Select account
                  </option>

                  {moneyAccounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} (
                        {account.currency})
                      </option>
                    ),
                  )}
                </select>
              </div>
            </>
          )}

          {type === "income" && (
            <>
              <div>
                <label
                  htmlFor="income-category"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  Income source
                </label>

                <select
                  id="income-category"
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value,
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <option value="">
                    Select income source
                  </option>

                  {incomeCategories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="income-account"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  Received into
                </label>

                <select
                  id="income-account"
                  value={destinationAccountId}
                  onChange={(event) =>
                    setDestinationAccountId(
                      event.target.value,
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <option value="">
                    Select account
                  </option>

                  {moneyAccounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} (
                        {account.currency})
                      </option>
                    ),
                  )}
                </select>
              </div>
            </>
          )}

          {type === "transfer" && (
            <>
              <div>
                <label
                  htmlFor="transfer-source"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  From
                </label>

                <select
                  id="transfer-source"
                  value={sourceAccountId}
                  onChange={(event) =>
                    setSourceAccountId(
                      event.target.value,
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <option value="">
                    Select account
                  </option>

                  {moneyAccounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} (
                        {account.currency})
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transfer-destination"
                  style={{
                    display: "block",
                    marginBottom: 7,
                    fontWeight: 600,
                  }}
                >
                  To
                </label>

                <select
                  id="transfer-destination"
                  value={destinationAccountId}
                  onChange={(event) =>
                    setDestinationAccountId(
                      event.target.value,
                    )
                  }
                  required
                  style={{
                    width: "100%",
                    padding:
                      "11px 12px",
                    border:
                      "1px solid var(--border)",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <option value="">
                    Select account
                  </option>

                  {moneyAccounts.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name} (
                        {account.currency})
                      </option>
                    ),
                  )}
                </select>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="transaction-description"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Description
            </label>

            <input
              id="transaction-description"
              type="text"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              maxLength={500}
              placeholder="Optional description"
              style={{
                width: "100%",
                padding: "11px 12px",
                border:
                  "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>

          {message && (
            <p
              style={{
                margin: 0,
                padding: "11px 12px",
                borderRadius: 8,
                background: "#fef2f2",
                color: "var(--danger)",
                fontSize: 14,
              }}
            >
              {message}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 4,
            }}
          >
            <Link
              href={`/transactions/${transactionId}`}
              style={{
                padding: "10px 14px",
                border:
                  "1px solid var(--border)",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 16px",
                border: 0,
                borderRadius: 8,
                background:
                  "var(--primary)",
                color: "#fff",
                fontWeight: 600,
                opacity: saving
                  ? 0.7
                  : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}