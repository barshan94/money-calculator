import Link from "next/link";
import { getLiquidityRiskWarnings } from "@/lib/intelligence/get-liquidity-risk-warnings";

function formatMetric(
  type: string,
  value: number,
) {
  if (type === "low_liquid_coverage") {
    return `${value.toFixed(1)} months`;
  }

  return `${value.toFixed(1)}%`;
}

function severityLabel(
  severity: "warning" | "critical",
) {
  return severity === "critical"
    ? "Critical"
    : "Warning";
}

export default async function LiquidityRiskPage() {
  const results =
    await getLiquidityRiskWarnings();

  const totalWarnings = results.reduce(
    (total, item) =>
      total + item.warnings.length,
    0,
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-[var(--primary)]">
            Financial intelligence
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Liquidity & Risk Warnings
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Review rule-based warnings based on liquidity,
            receivables, and recurring financial commitments.
          </p>
        </div>

        <Link
          href="/reports/liquidity"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]"
        >
          View Liquidity
        </Link>
      </div>

      {results.length === 0 ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-sm)]">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            No liquidity data available
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Add financial data to generate liquidity risk
            indicators.
          </p>
        </section>
      ) : (
        <div className="grid gap-6">
          {results.map((result) => (
            <section
              key={result.currency}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    {result.currency} Risk Review
                  </h2>

                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Based on current financial-health metrics.
                  </p>
                </div>

                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {result.warnings.length}{" "}
                  {result.warnings.length === 1
                    ? "warning"
                    : "warnings"}
                </span>
              </div>

              {result.warnings.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] p-4">
                  <p className="text-sm font-semibold text-[var(--success)]">
                    No defined liquidity risk warnings
                  </p>

                  <p className="mt-1 text-sm text-[var(--muted)]">
                    The available metrics are currently within
                    the thresholds used by this report.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {result.warnings.map((warning) => (
                    <article
                      key={warning.type}
                      className="rounded-lg border border-[var(--border)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            {warning.title}
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                            {warning.message}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            warning.severity === "critical"
                              ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                              : "bg-[var(--warning-soft)] text-[var(--warning)]"
                          }`}
                        >
                          {severityLabel(
                            warning.severity,
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-[var(--muted)]">
                            Current value
                          </p>

                          <p className="mt-1 font-semibold text-[var(--foreground)]">
                            {formatMetric(
                              warning.type,
                              warning.value,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-[var(--muted)]">
                            Threshold
                          </p>

                          <p className="mt-1 font-semibold text-[var(--foreground)]">
                            {formatMetric(
                              warning.type,
                              warning.threshold,
                            )}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Methodology
        </h2>

        <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted)]">
          <p>
            Liquidity coverage is compared with a one-month
            threshold using immediate liquid assets and average
            monthly expenses.
          </p>

          <p>
            Receivable dependency is measured as receivables
            divided by total assets. A value above 50% produces
            a warning.
          </p>

          <p>
            Recurring expense burden is measured as recurring
            monthly expenses divided by average monthly income.
            A value above 50% produces a warning.
          </p>

          <p className="mb-0">
            These are rule-based indicators, not predictions,
            financial advice, or a guarantee of future liquidity.
          </p>
        </div>
      </section>

      <p className="mt-4 text-xs text-[var(--muted)]">
        {totalWarnings} total warning
        {totalWarnings === 1 ? "" : "s"} across the
        available currencies.
      </p>
    </main>
  );
}
