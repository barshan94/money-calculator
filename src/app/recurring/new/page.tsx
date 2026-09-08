"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const [type, setType] = useState<
    "expense" | "income" | "transfer"
  >("expense");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [frequency, setFrequency] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("monthly");

  const [nextRunDate, setNextRunDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] =
    useState("");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
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

      if (categoriesResult.error) {
        setMessage(categoriesResult.error.message);
        return;
      }

      if (accountsResult.error) {
        setMessage(accountsResult.error.message);
        return;
      }

      setCategories(categoriesResult.data ?? []);
      setAccounts(accountsResult.data ?? []);

      setNextRunDate(
        new Date().toISOString().slice(0, 10),
      );
    }

    void load();
  }, [supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const numericAmount = Number(amount);

    if (!name.trim()) {
      setMessage("Enter a name.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    if (!nextRunDate) {
      setMessage("Select the next run date.");
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
        p_name: name.trim(),
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

  return (
    <main>
      <h1>New Recurring Transaction</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Monthly Salary"
            required
          />
        </div>

        <div>
          <label>Type</label>
          <select
            value={type}
            onChange={(event) => {
              const newType = event.target.value as
                | "expense"
                | "income"
                | "transfer";

              setType(newType);
              setCategoryId("");
              setSourceAccountId("");
              setDestinationAccountId("");
            }}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div>
          <label>Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Currency</label>
          <select
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value)
            }
          >
            <option value="BDT">BDT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label>Frequency</label>
          <select
            value={frequency}
            onChange={(event) =>
              setFrequency(
                event.target.value as
                  | "daily"
                  | "weekly"
                  | "monthly"
                  | "yearly",
              )
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label>Next Run Date</label>
          <input
            type="date"
            value={nextRunDate}
            onChange={(event) =>
              setNextRunDate(event.target.value)
            }
            required
          />
        </div>

        {type !== "transfer" && (
          <div>
            <label>Category</label>
            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              required
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
          </div>
        )}

        {(type === "expense" ||
          type === "transfer") && (
          <div>
            <label>Source Account</label>
            <select
              value={sourceAccountId}
              onChange={(event) =>
                setSourceAccountId(event.target.value)
              }
              required
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

        {(type === "income" ||
          type === "transfer") && (
          <div>
            <label>Destination Account</label>
            <select
              value={destinationAccountId}
              onChange={(event) =>
                setDestinationAccountId(
                  event.target.value,
                )
              }
              required
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

        <div>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving
            ? "Creating..."
            : "Create Recurring Transaction"}
        </button>
      </form>
    </main>
  );
}