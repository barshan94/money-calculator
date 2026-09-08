import Link from "next/link";
import { getBudgetProgress } from "@/lib/finance/get-budget-progress";
import { formatMoney } from "@/lib/finance/format-money";
import { ArchiveBudgetButton } from "@/components/budgets/archive-budget-button";

export default async function BudgetsPage() {
  const budgets = await getBudgetProgress();

  return (
    <main>
      <div>
        <h1>Budgets</h1>

        <Link href="/budgets/new">
          + New Budget
        </Link>
      </div>

      {budgets.length === 0 ? (
        <p>No budgets yet.</p>
      ) : (
        <div>
          {budgets.map((budget) => (
            <section key={budget.id}>
              <h2>{budget.categoryName}</h2>

              <p>
                Budget:{" "}
                {formatMoney(
                  budget.amount,
                  budget.currency,
                )}
              </p>

              <p>
                Spent:{" "}
                {formatMoney(
                  budget.spent,
                  budget.currency,
                )}
              </p>

              <p>
                Remaining:{" "}
                {formatMoney(
                  budget.remaining,
                  budget.currency,
                )}
              </p>

              <p>
                Progress:{" "}
                {Math.min(
                  budget.percentage,
                  100,
                ).toFixed(1)}
                %
              </p>

              <p>Period: {budget.period}</p>

              <div>
                <Link
                  href={`/budgets/${budget.id}/edit`}
                >
                  Edit
                </Link>

                <ArchiveBudgetButton
                  budgetId={budget.id}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}