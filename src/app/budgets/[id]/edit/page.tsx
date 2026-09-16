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

type BudgetPeriod = "weekly" | "monthly" | "yearly";

export default function EditBudgetPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const budgetId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [period, setPeriod] =
    useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

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

      if (cancelled) return;

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

      if (
        budget.period === "weekly" ||
        budget.period === "monthly" ||
        budget.period === "yearly"
      ) {
        setPeriod(budget.period);
      }

      setStartDate(budget.start_date);
      setEndDate(budget.end_date ?? "");
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [budgetId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) return;

    setMessage("");

    const numericAmount = Number(amount);

    if (!categoryId) {
      setMessage("Select an expense category.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading budget...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/budgets")}
          disabled={saving}
          className="mb-4 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Back to Budgets
        </button>

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Edit Budget
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Update the budget amount, period, category, or dates.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <label
            htmlFor="category"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Expense Category
          </label>

          <select
            id="category"
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value)
            }
            required
            disabled={saving}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
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

          {categories.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              No active expense categories are available.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Budget Amount
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
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="currency"
              className="mb-2 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="BDT">BDT</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="period"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Period
            </label>

            <select
              id="period"
              value={period}
              onChange={(event) =>
                setPeriod(
                  event.target.value as BudgetPeriod,
                )
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="start-date"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>

            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              required
              disabled={saving}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              End Date
              <span className="ml-1 font-normal text-gray-400">
                (optional)
              </span>
            </label>

            <input
              id="end-date"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/budgets")}
            disabled={saving}
            className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}