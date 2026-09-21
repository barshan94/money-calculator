import Link from "next/link";
import { formatMoney } from "@/lib/finance/format-money";
import { getBudgetIntelligence } from "@/lib/intelligence/get-budget-intelligence";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-BD",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function statusLabel(
  status:
    | "on_track"
    | "at_risk"
    | "projected_over_budget",
) {
  if (status === "on_track") {
    return "On track";
  }

  if (status === "at_risk") {
    return "At risk";
  }

  return "Projected over budget";
}

export default async function BudgetIntelligencePage() {
  const budgets = await getBudgetIntelligence();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--primary)]">
            Financial intelligence
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Budget Intelligence
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            See where current spending pace is projected to take each
            active budget by the end of its period.
          </p>
        </div>

        <Link
          href="/budgets"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]"
        >
          View Budgets
        </Link>
      </div>

      {budgets.length === 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            No budget forecast available
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            There are no active budgets with a defined end date
            available for projection.
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {budgets.map((budget) => {
            const intelligence = budget.intelligence;

            const utilization = Math.min(
              Math.max(budget.percentage, 0),
              100,
            );

            const differenceIsPositive =
              intelligence.projectedDifference > 0;

            return (
              <article
                key={budget.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--foreground)]">
                      {budget.categoryName}
                    </h2>

                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                      {budget.period} · Ends{" "}
                      {formatDate(budget.endDate!)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      intelligence.status === "projected_over_budget"
                        ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : intelligence.status === "at_risk"
                          ? "bg-[var(--warning-soft)] text-[var(--warning)]"
                          : "bg-[var(--success-soft)] text-[var(--success)]"
                    }`}
                  >
                    {statusLabel(intelligence.status)}
                  </span>
                </div>

                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">
                      Current utilization
                    </span>

                    <span className="font-semibold text-[var(--foreground)]">
                      {utilization.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{
                        width: `${utilization}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Budget
                    </p>

                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {formatMoney(
                        budget.amount,
                        budget.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Spent
                    </p>

                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {formatMoney(
                        budget.spent,
                        budget.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Daily spending pace
                    </p>

                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {formatMoney(
                        intelligence.currentDailySpending,
                        budget.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Days remaining
                    </p>

                    <p className="mt-1 font-semibold text-[var(--foreground)]">
                      {intelligence.remainingDays}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Projected spending
                    </p>

                    <p
                      className={`mt-1 font-semibold ${
                        intelligence.projectedSpending >
                        budget.amount
                          ? "text-[var(--danger)]"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {formatMoney(
                        intelligence.projectedSpending,
                        budget.currency,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--muted)]">
                      Projected difference
                    </p>

                    <p
                      className={`mt-1 font-semibold ${
                        differenceIsPositive
                          ? "text-[var(--danger)]"
                          : "text-[var(--success)]"
                      }`}
                    >
                      {differenceIsPositive ? "+" : ""}
                      {formatMoney(
                        intelligence.projectedDifference,
                        budget.currency,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-sm text-[var(--muted)]">
                    {intelligence.status === "on_track"
                      ? "At the current spending pace, this budget is projected to remain within its limit."
                      : intelligence.status === "at_risk"
                        ? "At the current spending pace, this budget is projected to exceed its limit slightly."
                        : "At the current spending pace, this budget is projected to exceed its limit significantly."}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Methodology
        </h2>

        <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted)]">
          <p>
            The current spending amount is divided by the elapsed
            days in the budget period to estimate the current daily
            spending pace.
          </p>

          <p>
            That daily pace is then projected across the full budget
            period. The projected amount is compared with the budget
            limit.
          </p>

          <p>
            A projection at or below the budget is marked on track.
            A projection above the budget by up to 10% is marked at
            risk. A projection above 10% is marked projected over
            budget.
          </p>

          <p className="mb-0">
            These are planning projections based on current spending
            behavior, not guarantees of future spending.
          </p>
        </div>
      </section>
    </main>
  );
}
