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
};

export default function EditBudgetPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const budgetId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [period, setPeriod] = useState<
    "weekly" | "monthly" | "yearly"
  >("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const [budgetResult, categoriesResult] =
        await Promise.all([
          supabase
            .from("budgets")
            .select(
              "id, category_id, amount, currency, period, start_date, end_date",
            )
            .eq("id", budgetId)
            .single(),

          supabase
            .from("categories")
            .select("id, name")
            .eq("category_type", "expense")
            .eq("is_archived", false)
            .order("name"),
        ]);

      if (
        budgetResult.error ||
        !budgetResult.data ||
        categoriesResult.error
      ) {
        setMessage("Unable to load budget.");
        setLoading(false);
        return;
      }

      const budget = budgetResult.data;

      setCategories(categoriesResult.data ?? []);
      setCategoryId(budget.category_id);
      setAmount(String(budget.amount));
      setCurrency(budget.currency);
      setPeriod(
        budget.period as
          | "weekly"
          | "monthly"
          | "yearly",
      );
      setStartDate(budget.start_date);
      setEndDate(budget.end_date ?? "");

      setLoading(false);
    }

    load();
  }, [budgetId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const numericAmount = Number(amount);

    if (!categoryId) {
      setMessage("Select an expense category.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("Enter a valid budget amount.");
      return;
    }

    if (!startDate) {
      setMessage("Select a start date.");
      return;
    }

    if (endDate && endDate < startDate) {
      setMessage(
        "End date cannot be before the start date.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_budget",
      {
        p_budget_id: budgetId,
        p_category_id: categoryId,
        p_amount: numericAmount,
        p_currency: currency,
        p_period: period,
        p_start_date: startDate,
        p_end_date: endDate || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/budgets");
    router.refresh();
  }

  if (loading) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Budget</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Expense Category</label>

          <select
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value)
            }
            required
          >
            <option value="">Select category</option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Budget Amount</label>

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
          <label>Period</label>

          <select
            value={period}
            onChange={(event) =>
              setPeriod(
                event.target.value as
                  | "weekly"
                  | "monthly"
                  | "yearly",
              )
            }
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label>Start Date</label>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>End Date (optional)</label>

          <input
            type="date"
            value={endDate}
            onChange={(event) =>
              setEndDate(event.target.value)
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