"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  category_type: "expense";
};

type BudgetPeriod = "weekly" | "monthly" | "yearly";

function getLocalToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 10);
}

export default function NewBudgetPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [period, setPeriod] =
    useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = useState(getLocalToday);
  const [endDate, setEndDate] = useState("");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setLoadingCategories(true);

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, category_type")
        .eq("category_type", "expense")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
        setLoadingCategories(false);
        return;
      }

      setCategories(data ?? []);
      setLoadingCategories(false);
    }

    void fetchCategories();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

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
      "create_budget",
      {
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
            New Budget
          </h1>

          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Set a spending limit for an expense category and
            track how much remains available.
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
                Choose what spending this budget will monitor.
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
                disabled={saving || loadingCategories}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : "Select category"}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>

              {categories.length === 0 &&
                !loadingCategories &&
                !message && (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                    No active expense categories found. Create
                    an expense category before creating a
                    budget.
                  </p>
                )}

              {selectedCategory && (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Tracking spending under{" "}
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
                Set the amount and period for this spending
                limit.
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
                Define when this budget starts and optionally
                when it ends.
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
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Leave empty if the budget should continue
                  without a fixed end date.
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
              disabled={
                saving ||
                loadingCategories ||
                categories.length === 0
              }
              aria-busy={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: "var(--primary)",
              }}
            >
              {saving ? "Creating..." : "Create Budget"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

