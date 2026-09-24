"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type BudgetPeriod = "weekly" | "monthly" | "yearly";

function getLocalToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();

  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

export default function EditBudgetPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const budgetId = params.id as string;

  const [categories, setCategories] = useState<Category[]>(
    [],
  );
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
        setMessage(
          budgetResult.error?.message ||
            categoriesResult.error?.message ||
            "Unable to load budget.",
        );
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

    void load();

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
      setMessage("Enter a valid budget amount greater than 0.");
      return;
    }

    if (!startDate) {
      setMessage("Select a start date.");
      return;
    }

    if (endDate && endDate < startDate) {
      setMessage("End date cannot be before the start date.");
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

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-[var(--border)]" />
            <div className="h-8 w-48 rounded bg-[var(--border)]" />
            <div className="h-4 w-72 max-w-full rounded bg-[var(--border)]" />
            <div className="mt-8 h-12 w-full rounded-lg bg-[var(--border)]" />
            <div className="h-12 w-full rounded-lg bg-[var(--border)]" />
            <div className="h-12 w-full rounded-lg bg-[var(--border)]" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <Link
          href="/budgets"
          className="inline-flex min-h-10 items-center text-sm font-medium text-[var(--primary)] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          ← Back to Budgets
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <p className="mb-1 text-sm font-medium text-[var(--primary)]">
            Financial planning
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Edit Budget
          </h1>

          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Update the category, spending limit, period, or
            schedule for this budget.
          </p>
        </div>

        {message && (
          <div
            role="alert"
            aria-live="polite"
            className="mx-5 mt-5 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm leading-5 text-[var(--danger)] sm:mx-7"
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 p-5 sm:p-7"
        >
          <section className="grid gap-5">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Budget Details
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Choose the expense category this budget tracks.
              </p>
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select category</option>

                {selectedCategory &&
                  !categories.some(
                    (category) =>
                      category.id === selectedCategory.id,
                  ) && (
                    <option value={selectedCategory.id}>
                      {selectedCategory.name}
                    </option>
                  )}

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
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  No active expense categories are available.
                </p>
              )}

              {selectedCategory && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Current category:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {selectedCategory.name}
                  </span>
                  .
                </p>
              )}
            </div>
          </section>

          <section className="grid gap-5 border-t border-[var(--border)] pt-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Budget Limit
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Adjust the spending limit and its recurring
                period.
              </p>
            </div>

            <div>
              <label
                htmlFor="amount"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
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
                placeholder="0.00"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="currency"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Budget Period
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </section>

          <section className="grid gap-5 border-t border-[var(--border)] pt-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Schedule
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Define when this budget applies.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="start-date"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="end-date"
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  End Date{" "}
                  <span className="font-normal text-[var(--muted)]">
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
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Leave empty if there is no fixed end date.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/budgets"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || categories.length === 0}
              aria-busy={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: "var(--primary)",
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

