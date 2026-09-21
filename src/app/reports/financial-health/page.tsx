import { getFinancialHealth } from "@/lib/intelligence/get-financial-health";
import { formatMoney } from "@/lib/finance/format-money";

function formatPercentage(value: number | null): string {
  if (value === null) {
    return "Not available";
  }

  return `${value.toFixed(1)}%`;
}

function formatMonths(value: number | null): string {
  if (value === null) {
    return "Not available";
  }

  return `${value.toFixed(1)} months`;
}

export default async function FinancialHealthPage() {
  const health = await getFinancialHealth();

  return (
    <main>
      <div className="page-header">
        <div>
          <h1>Financial Health</h1>
          <p>
            Transparent indicators based on your actual financial
            history, liquidity, and recurring commitments.
          </p>
        </div>
      </div>

      {health.length === 0 ? (
        <section className="card">
          <h2>No financial data yet</h2>
          <p>
            Add income, expenses, accounts, or recurring
            transactions to generate financial health indicators.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {health.map(({ currency, metrics }) => (
            <section className="card" key={currency}>
              <div className="mb-6">
                <h2>{currency}</h2>
                <p>
                  Based on {metrics.monthsOfHistory} month
                  {metrics.monthsOfHistory === 1 ? "" : "s"} of
                  recorded history.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Avg. monthly income"
                  value={
                    metrics.averageMonthlyIncome === null
                      ? "Not available"
                      : formatMoney(
                          metrics.averageMonthlyIncome,
                          currency,
                        )
                  }
                />

                <MetricCard
                  label="Avg. monthly expenses"
                  value={
                    metrics.averageMonthlyExpenses === null
                      ? "Not available"
                      : formatMoney(
                          metrics.averageMonthlyExpenses,
                          currency,
                        )
                  }
                />

                <MetricCard
                  label="Avg. monthly surplus"
                  value={
                    metrics.averageMonthlySurplus === null
                      ? "Not available"
                      : formatMoney(
                          metrics.averageMonthlySurplus,
                          currency,
                        )
                  }
                />

                <MetricCard
                  label="Savings rate"
                  value={formatPercentage(
                    metrics.savingsRate,
                  )}
                />

                <MetricCard
                  label="Expense ratio"
                  value={formatPercentage(
                    metrics.expenseRatio,
                  )}
                />

                <MetricCard
                  label="Liquid coverage"
                  value={formatMonths(
                    metrics.liquidCoverageMonths,
                  )}
                />

                <MetricCard
                  label="Receivable dependency"
                  value={formatPercentage(
                    metrics.receivableDependency,
                  )}
                />

                <MetricCard
                  label="Recurring expense burden"
                  value={formatPercentage(
                    metrics.recurringExpenseBurden,
                  )}
                />
              </div>

              <div className="mt-6 space-y-3">
                <Explanation
                  title="Savings rate"
                  text="Average monthly surplus divided by average monthly income. A negative value means average expenses exceed average income."
                />

                <Explanation
                  title="Expense ratio"
                  text="Average monthly expenses divided by average monthly income."
                />

                <Explanation
                  title="Liquid coverage"
                  text="Current immediately liquid assets divided by average monthly expenses. It estimates how many months of average expenses current liquid assets could cover."
                />

                <Explanation
                  title="Receivable dependency"
                  text="Receivables as a percentage of total assets. It shows how much of your recorded assets are money expected from others."
                />

                <Explanation
                  title="Recurring expense burden"
                  text="Monthly-equivalent recurring expenses divided by average monthly income. Transfers are excluded."
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-sm opacity-70">{label}</p>
      <p className="mt-2 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function Explanation({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm opacity-70">{text}</p>
    </div>
  );
}

