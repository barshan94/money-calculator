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

export default function NewBudgetPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [period, setPeriod] = useState<
    "weekly" | "monthly" | "yearly"
  >("monthly");

  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, category_type")
        .eq("category_type", "expense")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
        return;
      }

      setCategories(data ?? []);
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

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mb-6">
        <Link
          href="/budgets"
          className="text-sm font-medium text-[var(--primary)] hover:opacity-80"
        >
          ← Back to Budgets
        </Link>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="mb-6">
          <p className="mb-1 text-sm font-medium text-[var(--primary)]">
            Financial planning
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            New Budget
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Set a spending limit for an expense category.
          </p>
        </div>

        {message && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-5"
        >
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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
            >
              <option value="">
                Select category
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

            {categories.length === 0 && !message && (
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                No active expense categories found.
              </p>
            )}
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
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
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
                Period
              </label>

              <select
                id="period"
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.target.value as
                      | "weekly"
                      | "monthly"
                      | "yearly",
                  )
                }
                disabled={saving}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
              >
                <option value="weekly">
                  Weekly
                </option>
                <option value="monthly">
                  Monthly
                </option>
                <option value="yearly">
                  Yearly
                </option>
              </select>
            </div>
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="end-date"
                className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              >
                End Date
                <span className="ml-1 font-normal text-[var(--muted)]">
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
              />
            </div>
          </div>

          <div className="mt-2 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/budgets"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:opacity-80"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: "var(--primary)",
              }}
            >
              {saving
                ? "Creating..."
                : "Create Budget"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}