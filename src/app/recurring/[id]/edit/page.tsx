"use client";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
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

type TransactionType = "expense" | "income" | "transfer";
type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export default function EditRecurringTransactionPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const recurringId = params.id as string;

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const [recurringResult, categoriesResult, accountsResult] =
        await Promise.all([
          supabase
            .from("recurring_transactions")
            .select(`
              id,
              name,
              transaction_type,
              amount,
              currency,
              frequency,
              next_run_date,
              category_id,
              source_account_id,
              destination_account_id,
              description
            `)
            .eq("id", recurringId)
            .eq("is_active", true)
            .single(),

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

      if (
        recurringResult.error ||
        !recurringResult.data ||
        categoriesResult.error ||
        accountsResult.error
      ) {
        setMessage("Unable to load recurring transaction.");
        setLoading(false);
        return;
      }

      const item = recurringResult.data;

      setType(item.transaction_type as TransactionType);
      setName(item.name);
      setAmount(String(item.amount));
      setCurrency(item.currency);
      setFrequency(item.frequency as Frequency);
      setNextRunDate(item.next_run_date);
      setCategoryId(item.category_id ?? "");
      setSourceAccountId(item.source_account_id ?? "");
      setDestinationAccountId(
        item.destination_account_id ?? "",
      );
      setDescription(item.description ?? "");

      setCategories(categoriesResult.data ?? []);
      setAccounts(accountsResult.data ?? []);

      setLoading(false);
    }

    load();
  }, [recurringId]);

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
      "update_recurring_transaction",
      {
        p_recurring_id: recurringId,
        p_name: name,
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
        p_description: description || null,
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
      <main>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Recurring Transaction</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Type</label>

          <select
            value={type}
            onChange={(event) => {
              const newType =
                event.target.value as TransactionType;

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
                event.target.value as Frequency,
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
              <option value="">
                Select category
              </option>

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
              <option value="">
                Select account
              </option>

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
              <option value="">
                Select account
              </option>

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
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </main>
  );
}