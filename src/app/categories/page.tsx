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

    if (trimmedName.length > 100) {
      setError("Category name cannot exceed 100 characters.");
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
    <main className="categories-page">
      <div className="categories-container">
        <header className="categories-header">
          <a className="back-link" href="/dashboard">
            ← Dashboard
          </a>

          <h1>Categories</h1>

          <p>
            Manage income and expense categories used by your transactions.
          </p>
        </header>

        <section className="card section-card" aria-labelledby="create-heading">
          <div className="section-heading">
            <div>
              <h2 id="create-heading">Create Category</h2>
              <p>Add a category for future transactions.</p>
            </div>
          </div>

          <div className="create-grid">
            <div>
              <label htmlFor="category-name">Category name</label>

              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createCategory();
                  }
                }}
                placeholder="e.g. Salary"
                maxLength={100}
                disabled={creating}
              />
            </div>

            <div>
              <label htmlFor="category-type">Type</label>

              <select
                id="category-type"
                value={categoryType}
                onChange={(event) =>
                  setCategoryType(
                    event.target.value as "income" | "expense",
                  )
                }
                disabled={creating}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => void createCategory()}
              disabled={creating}
              className="primary-button"
            >
              {creating ? "Creating..." : "Create Category"}
            </button>
          </div>

          {error && (
            <p className="error-message" role="alert" aria-live="polite">
              {error}
            </p>
          )}
        </section>

        <section className="card section-card" aria-labelledby="filter-heading">
          <div className="section-heading">
            <div>
              <h2 id="filter-heading">Filter & Sort</h2>
              <p>Choose how active categories should be displayed.</p>
            </div>
          </div>

          <div className="filter-grid">
            <div>
              <label htmlFor="category-filter">Filter</label>

              <select
                id="category-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as Filter)
                }
              >
                <option value="all">All Categories</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>

            <div>
              <label htmlFor="category-sort">Sort</label>

              <select
                id="category-sort"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as Sort)
                }
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
              className="primary-button"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="secondary-button"
            >
              Reset
            </button>
          </div>
        </section>

        <div className="result-summary">
          Showing{" "}
          <strong>{filteredActiveCategories.length}</strong>{" "}
          active categor
          {filteredActiveCategories.length === 1 ? "y" : "ies"}
        </div>

        {loading ? (
          <section className="card loading-state" aria-live="polite">
            Loading categories...
          </section>
        ) : filteredActiveCategories.length === 0 ? (
          <section className="card empty-state">
            <div className="empty-icon" aria-hidden="true">
              🗂️
            </div>

            <h2>No matching active categories</h2>

            <p>
              {activeCategories.length === 0
                ? "Create your first category to organize income and expenses."
                : "Try changing the filter or sort options."}
            </p>

            {activeCategories.length === 0 && (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("category-name")
                    ?.focus()
                }
                className="secondary-button empty-action"
              >
                Create a Category
              </button>
            )}
          </section>
        ) : (
          <div className="category-columns">
            {(appliedFilter === "all" || appliedFilter === "income") && (
              <CategorySection
                title="Income"
                count={incomeCategories.length}
                tone="income"
                emptyText="No income categories found."
                categories={incomeCategories}
              />
            )}

            {(appliedFilter === "all" || appliedFilter === "expense") && (
              <CategorySection
                title="Expenses"
                count={expenseCategories.length}
                tone="expense"
                emptyText="No expense categories found."
                categories={expenseCategories}
              />
            )}
          </div>
        )}

        {archivedCategories.length > 0 && (
          <section className="card section-card archived-section">
            <div className="section-heading">
              <div>
                <h2>Archived</h2>
                <p>
                  Archived categories remain preserved for existing
                  transactions but are unavailable for new transactions.
                </p>
              </div>

              <span className="count-badge neutral">
                {archivedCategories.length}
              </span>
            </div>

            <div className="category-list">
              {archivedCategories.map((category) => (
                <div key={category.id} className="category-item archived-item">
                  <div className="category-info">
                    <span className="category-name">{category.name}</span>

                    <span
                      className={`type-badge ${
                        category.category_type === "income"
                          ? "income"
                          : "expense"
                      }`}
                    >
                      {category.category_type === "income"
                        ? "Income"
                        : "Expense"}
                    </span>
                  </div>

                  <div className="archived-actions">
                    <DeleteCategoryButton categoryId={category.id} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .categories-page {
          min-height: 100vh;
          background: var(--background);
          padding: 24px 16px 48px;
        }

        .categories-container {
          max-width: 1152px;
          margin: 0 auto;
        }

        .categories-header {
          margin-bottom: 24px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          min-height: 40px;
          margin-bottom: 8px;
          color: var(--muted-foreground);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .categories-header h1 {
          margin: 0;
          color: var(--foreground);
          font-size: clamp(1.8rem, 4vw, 2.25rem);
          line-height: 1.2;
        }

        .categories-header p {
          margin: 6px 0 0;
          color: var(--muted-foreground);
          line-height: 1.55;
        }

        .section-card {
          padding: 20px;
          margin-bottom: 18px;
        }

        .section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .section-heading h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 1.05rem;
        }

        .section-heading p {
          margin: 4px 0 0;
          color: var(--muted-foreground);
          font-size: 0.86rem;
          line-height: 1.5;
        }

        .create-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px auto;
          gap: 12px;
          align-items: end;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto;
          gap: 12px;
          align-items: end;
        }

        label {
          display: block;
          margin-bottom: 6px;
          color: var(--foreground);
          font-size: 0.8rem;
          font-weight: 600;
        }

        input,
        select {
          width: 100%;
          min-height: 44px;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          padding: 9px 12px;
          font-size: 0.9rem;
          outline: none;
        }

        input:focus,
        select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px color-mix(
            in srgb,
            var(--primary) 20%,
            transparent
          );
        }

        input:disabled,
        select:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        button {
          font: inherit;
        }

        .primary-button,
        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          border-radius: 8px;
          padding: 9px 16px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            opacity 0.15s ease,
            background-color 0.15s ease;
        }

        .primary-button {
          border: 1px solid var(--primary);
          background: var(--primary);
          color: white;
        }

        .secondary-button {
          border: 1px solid var(--border);
          background: var(--background);
          color: var(--foreground);
        }

        .primary-button:hover:not(:disabled) {
          opacity: 0.88;
        }

        .secondary-button:hover:not(:disabled) {
          background: var(--muted);
        }

        button:focus-visible,
        a:focus-visible {
          outline: 3px solid var(--primary);
          outline-offset: 2px;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .error-message {
          margin: 12px 0 0;
          color: var(--danger);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .result-summary {
          margin: 2px 0 12px;
          color: var(--muted-foreground);
          font-size: 0.85rem;
        }

        .result-summary strong {
          color: var(--foreground);
        }

        .loading-state,
        .empty-state {
          padding: 32px 20px;
          text-align: center;
        }

        .loading-state {
          color: var(--muted-foreground);
        }

        .empty-icon {
          margin-bottom: 8px;
          font-size: 2rem;
        }

        .empty-state h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 1.1rem;
        }

        .empty-state p {
          max-width: 520px;
          margin: 7px auto 0;
          color: var(--muted-foreground);
          line-height: 1.55;
          font-size: 0.9rem;
        }

        .empty-action {
          margin-top: 16px;
        }

        .category-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .category-section {
          padding: 20px;
        }

        .category-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .category-section-header h2 {
          margin: 0;
          color: var(--foreground);
          font-size: 1.05rem;
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          min-height: 28px;
          padding: 4px 9px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .count-badge.income {
          background: var(--success-soft);
          color: var(--success);
        }

        .count-badge.expense {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .count-badge.neutral {
          background: var(--muted);
          color: var(--muted-foreground);
        }

        .category-list {
          display: grid;
          gap: 10px;
        }

        .category-item {
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 12px;
        }

        .category-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .category-name {
          min-width: 0;
          overflow: hidden;
          color: var(--foreground);
          font-size: 0.9rem;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .type-badge {
          flex-shrink: 0;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .type-badge.income {
          background: var(--success-soft);
          color: var(--success);
        }

        .type-badge.expense {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .category-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
        }

        .archived-section {
          margin-top: 18px;
        }

        .archived-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .archived-actions {
          flex-shrink: 0;
          width: 120px;
        }

        @media (max-width: 760px) {
          .categories-page {
            padding: 18px 12px 40px;
          }

          .create-grid,
          .filter-grid {
            grid-template-columns: 1fr;
          }

          .category-columns {
            grid-template-columns: 1fr;
          }

          .create-grid .primary-button,
          .filter-grid .primary-button,
          .filter-grid .secondary-button {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .categories-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .section-card,
          .category-section {
            padding: 15px;
          }

          .section-heading {
            flex-direction: column;
            gap: 8px;
          }

          .category-info {
            align-items: flex-start;
          }

          .category-actions {
            grid-template-columns: 1fr;
          }

          .archived-item {
            align-items: stretch;
            flex-direction: column;
          }

          .archived-actions {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

function CategorySection({
  title,
  count,
  tone,
  emptyText,
  categories,
}: {
  title: string;
  count: number;
  tone: "income" | "expense";
  emptyText: string;
  categories: Category[];
}) {
  return (
    <section className="card category-section">
      <div className="category-section-header">
        <h2>{title}</h2>

        <span className={`count-badge ${tone}`}>{count}</span>
      </div>

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>{emptyText}</p>
        </div>
      ) : (
        <div className="category-list">
          {categories.map((category) => (
            <div key={category.id} className="category-item">
              <div className="category-info">
                <span className="category-name">{category.name}</span>

                <span className={`type-badge ${tone}`}>
                  {tone === "income" ? "Income" : "Expense"}
                </span>
              </div>

              <div className="category-actions">
                <EditCategoryButton
                  categoryId={category.id}
                  initialName={category.name}
                  initialType={category.category_type}
                />

                <ArchiveCategoryButton categoryId={category.id} />

                <DeleteCategoryButton categoryId={category.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
