"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EditCategoryButton } from "@/components/categories/edit-category-button";
import { ArchiveCategoryButton } from "@/components/categories/archive-category-button";
import { DeleteCategoryButton } from "@/components/categories/delete-category-button";

type Category = {
  id: string;
  name: string;
  category_type: "income" | "expense";
  is_archived: boolean;
  created_at?: string;
};

type Filter = "all" | "income" | "expense";
type Sort = "az" | "za" | "newest" | "oldest";

export default function CategoriesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [categoryType, setCategoryType] =
    useState<"income" | "expense">("income");
  const [creating, setCreating] = useState(false);

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const [appliedFilter, setAppliedFilter] = useState<Filter>("all");
  const [appliedSort, setAppliedSort] = useState<Sort>("newest");

  async function loadCategories() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setCategories([]);
    } else {
      setCategories((data ?? []) as Category[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadCategories();
  }, [supabase]);

  async function createCategory() {
    if (creating) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setCreating(true);
    setError("");

    const { error } = await supabase.rpc("create_category", {
      p_name: trimmedName,
      p_category_type: categoryType,
    });

    if (error) {
      setError(error.message);
      setCreating(false);
      return;
    }

    setName("");
    setCategoryType("income");
    setCreating(false);

    await loadCategories();
  }

  function applyFilters() {
    setAppliedFilter(filter);
    setAppliedSort(sort);
  }

  function resetFilters() {
    setFilter("all");
    setSort("newest");
    setAppliedFilter("all");
    setAppliedSort("newest");
  }

  const activeCategories = useMemo(
    () => categories.filter((category) => !category.is_archived),
    [categories],
  );

  const archivedCategories = useMemo(
    () => categories.filter((category) => category.is_archived),
    [categories],
  );

  const filteredActiveCategories = useMemo(() => {
    let result = [...activeCategories];

    if (appliedFilter !== "all") {
      result = result.filter(
        (category) => category.category_type === appliedFilter,
      );
    }

    result.sort((a, b) => {
      if (appliedSort === "az") {
        return a.name.localeCompare(b.name);
      }

      if (appliedSort === "za") {
        return b.name.localeCompare(a.name);
      }

      if (appliedSort === "oldest") {
        return (
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime()
        );
      }

      return (
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
      );
    });

    return result;
  }, [activeCategories, appliedFilter, appliedSort]);

  const incomeCategories = useMemo(
    () =>
      filteredActiveCategories.filter(
        (category) => category.category_type === "income",
      ),
    [filteredActiveCategories],
  );

  const expenseCategories = useMemo(
    () =>
      filteredActiveCategories.filter(
        (category) => category.category_type === "expense",
      ),
    [filteredActiveCategories],
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Categories
          </h1>

          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Manage income and expense categories for your transactions.
          </p>
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Create Category
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <div>
              <label
                htmlFor="category-name"
                className="sr-only"
              >
                Category name
              </label>

              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Category name"
                maxLength={100}
                disabled={creating}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="category-type"
                className="sr-only"
              >
                Category type
              </label>

              <select
                id="category-type"
                value={categoryType}
                onChange={(event) =>
                  setCategoryType(
                    event.target.value as "income" | "expense",
                  )
                }
                disabled={creating}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <button
              type="button"
              onClick={createCategory}
              disabled={creating}
              className="h-10 rounded-lg px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {creating ? "Creating..." : "Create Category"}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <div>
              <label
                htmlFor="category-filter"
                className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]"
              >
                Filter
              </label>

              <select
                id="category-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as Filter)
                }
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              >
                <option value="all">All Categories</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="category-sort"
                className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]"
              >
                Sort
              </label>

              <select
                id="category-sort"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as Sort)
                }
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">Name A-Z</option>
                <option value="za">Name Z-A</option>
              </select>
            </div>

            <button
              type="button"
              onClick={applyFilters}
              className="h-10 rounded-lg px-5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Apply
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
            >
              Reset
            </button>
          </div>
        </section>

        <div className="text-sm text-[var(--muted-foreground)]">
          Showing{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {filteredActiveCategories.length}
          </span>{" "}
          active categor
          {filteredActiveCategories.length === 1 ? "y" : "ies"}
        </div>

        {loading ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            Loading categories...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {(appliedFilter === "all" || appliedFilter === "income") && (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    Income
                  </h2>

                  <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
                    {incomeCategories.length}
                  </span>
                </div>

                {incomeCategories.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                    No income categories found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomeCategories.map((category) => (
                      <div
                        key={category.id}
                        className="rounded-lg border border-[var(--border)] px-4 py-3"
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                            {category.name}
                          </span>

                          <span className="shrink-0 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
                            Income
                          </span>
                        </div>

                        <div className="mt-3 grid w-full grid-cols-3 gap-2">
                          <EditCategoryButton
                            categoryId={category.id}
                            initialName={category.name}
                            initialType={category.category_type}
                          />

                          <ArchiveCategoryButton
                            categoryId={category.id}
                          />

                          <DeleteCategoryButton
                            categoryId={category.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {(appliedFilter === "all" || appliedFilter === "expense") && (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    Expenses
                  </h2>

                  <span className="rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--danger)]">
                    {expenseCategories.length}
                  </span>
                </div>

                {expenseCategories.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                    No expense categories found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expenseCategories.map((category) => (
                      <div
                        key={category.id}
                        className="rounded-lg border border-[var(--border)] px-4 py-3"
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                            {category.name}
                          </span>

                          <span className="shrink-0 rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--danger)]">
                            Expense
                          </span>
                        </div>

                        <div className="mt-3 grid w-full grid-cols-3 gap-2">
                          <EditCategoryButton
                            categoryId={category.id}
                            initialName={category.name}
                            initialType={category.category_type}
                          />

                          <ArchiveCategoryButton
                            categoryId={category.id}
                          />

                          <DeleteCategoryButton
                            categoryId={category.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {archivedCategories.length > 0 && (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Archived
                </h2>

                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Archived categories are no longer available for new
                  transactions.
                </p>
              </div>

              <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                {archivedCategories.length}
              </span>
            </div>

            <div className="space-y-3">
              {archivedCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-lg border border-[var(--border)] px-4 py-3"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                      {category.name}
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        category.category_type === "income"
                          ? "bg-[var(--success-soft)] text-[var(--success)]"
                          : "bg-[var(--danger-soft)] text-[var(--danger)]"
                      }`}
                    >
                      {category.category_type === "income"
                        ? "Income"
                        : "Expense"}
                    </span>
                  </div>

                  <div className="mt-3 grid w-full grid-cols-1">
                    <DeleteCategoryButton categoryId={category.id} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}