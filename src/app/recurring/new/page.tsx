"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TransactionType = "expense" | "income" | "transfer";
type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type Category = {
  id: string;
  name: string;
  category_type: "income" | "expense";
};

type Account = {
  id: string;
  name: string;
  account_type: "asset" | "liability";
};

export default function NewRecurringTransactionPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [type, setType] =
    useState<TransactionType>("expense");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [frequency, setFrequency] =
    useState<Frequency>("monthly");

  const [nextRunDate, setNextRunDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] =
    useState("");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const [categoriesResult, accountsResult] =
        await Promise.all([
          supabase
            .from("categories")
            .select("id, name, category_type")
            .eq("is_archived", false)
            .order("name"),

          supabase
            .from("accounts")
            .select("id, name, account_type")
            .eq("is_archived", false)
            .eq("is_system", false)
            .order("name"),
        ]);

      if (cancelled) {
        return;
      }

      if (categoriesResult.error) {
        setMessage(
          `Failed to load categories: ${categoriesResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      if (accountsResult.error) {
        setMessage(
          `Failed to load accounts: ${accountsResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      setCategories(categoriesResult.data ?? []);
      setAccounts(accountsResult.data ?? []);
      setNextRunDate(today);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supabase, today]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");

    const trimmedName = name.trim();
    const numericAmount = Number(amount);

    if (!trimmedName) {
      setMessage("Enter a name.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }

    if (!nextRunDate) {
      setMessage("Select the next run date.");
      return;
    }

    if (nextRunDate < today) {
      setMessage("Next run date cannot be in the past.");
      return;
    }

    if (type !== "transfer" && !categoryId) {
      setMessage("Select a category.");
      return;
    }

    if (
      (type === "expense" || type === "transfer") &&
      !sourceAccountId
    ) {
      setMessage("Select the source account.");
      return;
    }

    if (
      (type === "income" || type === "transfer") &&
      !destinationAccountId
    ) {
      setMessage("Select the destination account.");
      return;
    }

    if (
      type === "transfer" &&
      sourceAccountId === destinationAccountId
    ) {
      setMessage(
        "Source and destination accounts must be different.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_recurring_transaction",
      {
        p_name: trimmedName,
        p_transaction_type: type,
        p_amount: numericAmount,
        p_currency: currency,
        p_frequency: frequency,
        p_next_run_date: nextRunDate,
        p_category_id:
          type === "transfer" ? null : categoryId,
        p_source_account_id:
          type === "income" ? null : sourceAccountId,
        p_destination_account_id:
          type === "expense"
            ? null
            : destinationAccountId,
        p_description:
          description.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/recurring");
    router.refresh();
  }

  const visibleCategories = categories.filter(
    (category) => category.category_type === type,
  );

  if (loading) {
    return (
      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "24px 16px 48px",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(24px, 5vw, 32px)",
          }}
        >
          New Recurring Transaction
        </h1>

        <p style={{ color: "#666" }}>Loading form...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(24px, 5vw, 32px)",
            lineHeight: 1.2,
          }}
        >
          New Recurring Transaction
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            color: "#666",
            fontSize: 14,
          }}
        >
          Schedule an automatic income, expense, or transfer.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          style={{
            marginBottom: 18,
            padding: 12,
            borderRadius: 8,
            background: "#fff1f1",
            border: "1px solid #f0caca",
            color: "#a00000",
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 18,
          padding: 20,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div>
          <label
            htmlFor="name"
            style={{
              display: "block",
              marginBottom: 7,
              fontWeight: 600,
            }}
          >
            Name
          </label>

          <input
            id="name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Monthly Salary"
            required
            disabled={saving}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 11,
              border: "1px solid #ccc",
              borderRadius: 7,
            }}
          />
        </div>

        <div>
          <label
            htmlFor="type"
            style={{
              display: "block",
              marginBottom: 7,
              fontWeight: 600,
            }}
          >
            Type
          </label>

          <select
            id="type"
            value={type}
            onChange={(event) => {
              const newType =
                event.target.value as TransactionType;

              setType(newType);
              setCategoryId("");
              setSourceAccountId("");
              setDestinationAccountId("");
            }}
            disabled={saving}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 11,
              border: "1px solid #ccc",
              borderRadius: 7,
              background: "#fff",
            }}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label
              htmlFor="amount"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Amount
            </label>

            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              required
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="currency"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Currency
            </label>

            <select
              id="currency"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value)
              }
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
                background: "#fff",
              }}
            >
              <option value="BDT">BDT</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <label
              htmlFor="frequency"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Frequency
            </label>

            <select
              id="frequency"
              value={frequency}
              onChange={(event) =>
                setFrequency(
                  event.target.value as Frequency,
                )
              }
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
                background: "#fff",
              }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="nextRunDate"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Next Run Date
            </label>

            <input
              id="nextRunDate"
              type="date"
              min={today}
              value={nextRunDate}
              onChange={(event) =>
                setNextRunDate(event.target.value)
              }
              required
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
              }}
            />
          </div>
        </div>

        {type !== "transfer" && (
          <div>
            <label
              htmlFor="category"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Category
            </label>

            <select
              id="category"
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              required
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
                background: "#fff",
              }}
            >
              <option value="">Select category</option>

              {visibleCategories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>

            {visibleCategories.length === 0 && (
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#777",
                  fontSize: 13,
                }}
              >
                No active {type} categories are available.
              </p>
            )}
          </div>
        )}

        {(type === "expense" || type === "transfer") && (
          <div>
            <label
              htmlFor="sourceAccount"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Source Account
            </label>

            <select
              id="sourceAccount"
              value={sourceAccountId}
              onChange={(event) =>
                setSourceAccountId(event.target.value)
              }
              required
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
                background: "#fff",
              }}
            >
              <option value="">Select account</option>

              {accounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(type === "income" || type === "transfer") && (
          <div>
            <label
              htmlFor="destinationAccount"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Destination Account
            </label>

            <select
              id="destinationAccount"
              value={destinationAccountId}
              onChange={(event) =>
                setDestinationAccountId(event.target.value)
              }
              required
              disabled={saving}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 11,
                border: "1px solid #ccc",
                borderRadius: 7,
                background: "#fff",
              }}
            >
              <option value="">Select account</option>

              {accounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                >
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {accounts.length === 0 && (
          <p
            style={{
              margin: "-6px 0 0",
              color: "#777",
              fontSize: 13,
            }}
          >
            No active non-system accounts are available.
          </p>
        )}

        <div>
          <label
            htmlFor="description"
            style={{
              display: "block",
              marginBottom: 7,
              fontWeight: 600,
            }}
          >
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={4}
            disabled={saving}
            placeholder="Optional notes..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 11,
              border: "1px solid #ccc",
              borderRadius: 7,
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            paddingTop: 4,
            borderTop: "1px solid #eee",
          }}
        >
          <button
            type="submit"
            disabled={saving}
            style={{
              minHeight: 42,
              padding: "10px 16px",
              border: 0,
              borderRadius: 8,
              background: "#111",
              color: "#fff",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.65 : 1,
            }}
          >
            {saving
              ? "Creating..."
              : "Create Recurring Transaction"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/recurring")}
            disabled={saving}
            style={{
              minHeight: 42,
              padding: "10px 16px",
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#fff",
              color: "#222",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.65 : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}