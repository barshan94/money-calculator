import Link from "next/link";
import { getBudgetProgress } from "@/lib/finance/get-budget-progress";
import { formatMoney } from "@/lib/finance/format-money";
import { ArchiveBudgetButton } from "@/components/budgets/archive-budget-button";
import { DeleteBudgetButton } from "@/components/budgets/delete-budget-button";

export default async function BudgetsPage() {
  const budgets = await getBudgetProgress();

  const activeBudgets = budgets.filter(
    (budget) => budget.isActive,
  );

  const archivedBudgets = budgets.filter(
    (budget) => !budget.isActive,
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--primary)]">
            Financial planning
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Budgets
          </h1>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Plan your spending and keep expenses under control.
          </p>
        </div>

        <Link
          href="/budgets/new"
          style={{
            backgroundColor: "var(--primary)",
            color: "#ffffff",
          }}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
        >
          + New Budget
        </Link>
      </div>

      {/* Active Budgets */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Active Budgets
            </h2>

            <p className="mt-1 text-xs text-[var(--muted)]">
              {activeBudgets.length} active{" "}
              {activeBudgets.length === 1 ? "budget" : "budgets"}
            </p>
          </div>
        </div>

        {activeBudgets.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-[var(--shadow-sm)]">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              No active budgets
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Create a budget to start tracking your spending.
            </p>

            <Link
              href="/budgets/new"
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
              }}
              className="mt-4 inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
            >
              Create Budget
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeBudgets.map((budget) => {
              const progress = Math.min(
                budget.percentage,
                100,
              );

              const isOverBudget =
                budget.spent > budget.amount;

              return (
                <section
                  key={budget.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
                >
                  {/* Card Header */}
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--foreground)]">
                        {budget.categoryName}
                      </h3>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {budget.period}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isOverBudget
                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                          : "bg-[var(--success-soft)] text-[var(--success)]"
                      }`}
                    >
                      {isOverBudget
                        ? "Over budget"
                        : "On track"}
                    </span>
                  </div>

                  {/* Main Amount */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-[var(--muted)]">
                      Remaining
                    </p>

                    <p
                      className={`mt-1 text-2xl font-bold ${
                        isOverBudget
                          ? "text-[var(--danger)]"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {formatMoney(
                        budget.remaining,
                        budget.currency,
                      )}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="mb-5">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)]">
                        Progress
                      </span>

                      <span className="font-semibold text-[var(--foreground)]">
                        {progress.toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverBudget
                            ? "bg-[var(--danger)]"
                            : "bg-[var(--primary)]"
                        }`}
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">
                        Budget
                      </span>

                      <span className="font-medium text-[var(--foreground)]">
                        {formatMoney(
                          budget.amount,
                          budget.currency,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">
                        Spent
                      </span>

                      <span className="font-medium text-[var(--foreground)]">
                        {formatMoney(
                          budget.spent,
                          budget.currency,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">
                        Period
                      </span>

                      <span className="font-medium capitalize text-[var(--foreground)]">
                        {budget.period}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex gap-2 border-t border-[var(--border)] pt-4">
                    <Link
                      href={`/budgets/${budget.id}/edit`}
                      className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold text-white transition hover:opacity-90"
                      style={{
                        backgroundColor: "var(--primary)",
                      }}
                    >
                      Edit
                    </Link>

                    <div className="flex-1">
                      <ArchiveBudgetButton
                        budgetId={budget.id}
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      {/* Archived Budgets */}
      {archivedBudgets.length > 0 && (
        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Archived Budgets
            </h2>

            <p className="mt-1 text-xs text-[var(--muted)]">
              Inactive budgets kept for history.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedBudgets.map((budget) => (
              <section
                key={budget.id}
                data-testid={`archived-budget-card-${budget.id}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 opacity-80 shadow-[var(--shadow-sm)]"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--foreground)]">
                      {budget.categoryName}
                    </h3>

                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                      {budget.period}
                    </p>
                  </div>

                  <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                    Archived
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">
                      Budget
                    </span>

                    <span className="font-medium text-[var(--foreground)]">
                      {formatMoney(
                        budget.amount,
                        budget.currency,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted)]">
                      Spent
                    </span>

                    <span className="font-medium text-[var(--foreground)]">
                      {formatMoney(
                        budget.spent,
                        budget.currency,
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <DeleteBudgetButton
                    budgetId={budget.id}
                  />
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
