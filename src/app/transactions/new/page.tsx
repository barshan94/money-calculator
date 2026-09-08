
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type TransactionType =
  | "expense"
  | "income"
  | "transfer";

export default function NewTransactionPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] =
    useState<TransactionType>("expense");

  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] =
    useState(
      new Date().toISOString().split("T")[0],
    );

  const [categoryId, setCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] =
    useState("");
  const [destinationAccountId, setDestinationAccountId] =
    useState("");

  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [accountsResult, categoriesResult] =
        await Promise.all([
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

      if (accountsResult.error) {
        setMessage(accountsResult.error.message);
        setLoading(false);
        return;
      }

      if (categoriesResult.error) {
        setMessage(categoriesResult.error.message);
        setLoading(false);
        return;
      }

      setAccounts(accountsResult.data || []);
      setCategories(categoriesResult.data || []);
      setLoading(false);
    }

    loadData();
  }, [router]);

  const moneyAccounts = accounts.filter(
    function (account) {
      return (
        account.account_type === "asset" ||
        account.account_type === "liability"
      );
    },
  );

  const expenseCategories = categories.filter(
    function (category) {
      return category.category_type === "expense";
    },
  );

  const incomeCategories = categories.filter(
    function (category) {
      return category.category_type === "income";
    },
  );

  const selectedSourceAccount = accounts.find(
    function (account) {
      return account.id === sourceAccountId;
    },
  );

  const selectedDestinationAccount = accounts.find(
    function (account) {
      return account.id === destinationAccountId;
    },
  );

  const selectedCategory = categories.find(
    function (category) {
      return category.id === categoryId;
    },
  );

  function changeType(
    newType: TransactionType,
  ) {
    setType(newType);
    setCategoryId("");
    setSourceAccountId("");
    setDestinationAccountId("");
    setMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const supabase = createClient();

    const numericAmount = Number(amount);

    if (!transactionDate) {
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
        setMessage("Select both accounts.");
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

      if (
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
    }

    if (
      type === "expense" &&
      selectedCategory &&
      selectedCategory.category_type !==
        "expense"
    ) {
      setMessage("Invalid expense category.");
      return;
    }

    if (
      type === "income" &&
      selectedCategory &&
      selectedCategory.category_type !==
        "income"
    ) {
      setMessage("Invalid income source.");
      return;
    }

    if (
      type !== "transfer" &&
      selectedCategory &&
      !selectedCategory.ledger_account_id
    ) {
      setMessage(
        "Selected category is not properly connected.",
      );
      return;
    }

    setSaving(true);

    let entries: Array<{
      account_id: string;
      category_id: string | null;
      amount: number;
      entry_type: "debit" | "credit";
    }>;

    /*
     * EXPENSE
     *
     * Expense category ledger = DEBIT
     * Actual payment account   = CREDIT
     */
    if (type === "expense") {
      entries = [
        {
          account_id:
            selectedCategory!.ledger_account_id!,
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
    }

    /*
     * INCOME
     *
     * Actual receiving account = DEBIT
     * Income category ledger    = CREDIT
     */
    else if (type === "income") {
      entries = [
        {
          account_id: destinationAccountId,
          category_id: null,
          amount: numericAmount,
          entry_type: "debit",
        },
        {
          account_id:
            selectedCategory!.ledger_account_id!,
          category_id: selectedCategory!.id,
          amount: numericAmount,
          entry_type: "credit",
        },
      ];
    }

    /*
     * TRANSFER
     *
     * Destination = DEBIT
     * Source      = CREDIT
     */
    else {
      entries = [
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

    const { data, error } = await supabase.rpc(
      "create_transaction",
      {
        p_transaction_date: new Date(
          transactionDate + "T12:00:00",
        ).toISOString(),

        p_description:
          description.trim() || null,

        p_reference: null,
        p_notes: null,
        p_entries: entries,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    if (data) {
      router.push(
        "/transactions/" + data,
      );
      router.refresh();
      return;
    }

    setAmount("");
    setCategoryId("");
    setSourceAccountId("");
    setDestinationAccountId("");
    setDescription("");

    setMessage(
      "Transaction saved successfully.",
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <section>
          <p className="muted">
            Loading accounts and categories...
          </p>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/transactions"
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Transactions
        </Link>

        <h1
          style={{
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          New Transaction
        </h1>

        <p className="muted">
          Record income, expenses, or transfers.
        </p>
      </div>

      <section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() =>
              changeType("expense")
            }
            style={{
              padding: "10px 12px",
              border:
                type === "expense"
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              borderRadius: 8,
              background:
                type === "expense"
                  ? "#eff6ff"
                  : "#fff",
              color:
                type === "expense"
                  ? "var(--primary)"
                  : "var(--foreground)",
              fontWeight: 600,
            }}
          >
            Expense
          </button>

          <button
            type="button"
            onClick={() =>
              changeType("income")
            }
            style={{
              padding: "10px 12px",
              border:
                type === "income"
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              borderRadius: 8,
              background:
                type === "income"
                  ? "#eff6ff"
                  : "#fff",
              color:
                type === "income"
                  ? "var(--primary)"
                  : "var(--foreground)",
              fontWeight: 600,
            }}
          >
            Income
          </button>

          <button
            type="button"
            onClick={() =>
              changeType("transfer")
            }
            style={{
              padding: "10px 12px",
              border:
                type === "transfer"
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              borderRadius: 8,
              background:
                type === "transfer"
                  ? "#eff6ff"
                  : "#fff",
              color:
                type === "transfer"
                  ? "var(--primary)"
                  : "var(--foreground)",
              fontWeight: 600,
            }}
          >
            Transfer
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 20,
          }}
        >
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
              value={transactionDate}
              onChange={function (event) {
                setTransactionDate(
                  event.target.value,
                );
              }}
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

            <input
              id="transaction-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={function (event) {
                setAmount(
                  event.target.value,
                );
              }}
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
                  onChange={function (event) {
                    setCategoryId(
                      event.target.value,
                    );
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
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
                    function (category) {
                      return (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      );
                    },
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
                  onChange={function (event) {
                    setSourceAccountId(
                      event.target.value,
                    );
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
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
                    function (account) {
                      return (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} (
                          {account.currency})
                        </option>
                      );
                    },
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
                  onChange={function (event) {
                    setCategoryId(
                      event.target.value,
                    );
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
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
                    function (category) {
                      return (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      );
                    },
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
                  onChange={function (event) {
                    setDestinationAccountId(
                      event.target.value,
                    );
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
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
                    function (account) {
                      return (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} (
                          {account.currency})
                        </option>
                      );
                    },
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
                  onChange={function (event) {
                    setSourceAccountId(
                      event.target.value,
                    );
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
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
                    function (account) {
                      return (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} (
                          {account.currency})
                        </option>
                      );
                    },
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
                  onChange={function (event) {
                    setDestinationAccountId(
                      event.target.value,
                    );
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
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
                    function (account) {
                      return (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name} (
                          {account.currency})
                        </option>
                      );
                    },
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
              maxLength={500}
              placeholder="Optional"
              value={description}
              onChange={function (event) {
                setDescription(
                  event.target.value,
                );
              }}
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
                background:
                  message ===
                  "Transaction saved successfully."
                    ? "#f0fdf4"
                    : "#fef2f2",
                color:
                  message ===
                  "Transaction saved successfully."
                    ? "var(--success)"
                    : "var(--danger)",
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
              href="/transactions"
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
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "Save Transaction"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
