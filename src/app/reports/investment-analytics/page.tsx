import Link from "next/link";

import { getInvestmentAnalytics } from "@/lib/intelligence/get-investment-analytics";
import { formatMoney } from "@/lib/finance/format-money";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

export default async function InvestmentAnalyticsPage() {
  const analyticsByCurrency = await getInvestmentAnalytics();

  const currencies = Object.keys(analyticsByCurrency);

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Investment Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Descriptive analytics calculated from your existing investment
            records.
          </p>
        </div>

        <Link
          href="/investments"
          className="inline-flex w-fit items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          View Investments
        </Link>
      </div>

      {currencies.length === 0 ? (
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">No investment data yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Add an investment to begin viewing investment analytics.
          </p>
        </section>
      ) : (
        currencies.map((currency) => {
          const analytics = analyticsByCurrency[currency];

          return (
            <section
              key={currency}
              className="space-y-6 rounded-xl border bg-gray-50 p-5"
            >
              <div>
                <h2 className="text-2xl font-semibold">
                  {currency} Investments
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Portfolio and profit/loss analytics for this currency.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  label="Total Invested"
                  value={formatMoney(
                    analytics.totalInvested,
                    currency,
                  )}
                />

                <MetricCard
                  label="Current Portfolio Value"
                  value={formatMoney(
                    analytics.currentPortfolioValue,
                    currency,
                  )}
                />

                <MetricCard
                  label="Total Profit / Loss"
                  value={formatMoney(
                    analytics.totalProfitLoss,
                    currency,
                  )}
                />

                <MetricCard
                  label="Overall Return"
                  value={`${analytics.overallReturnPercentage.toFixed(2)}%`}
                />

                <MetricCard
                  label="Realized Profit / Loss"
                  value={formatMoney(
                    analytics.realizedProfitLoss,
                    currency,
                  )}
                />

                <MetricCard
                  label="Unrealized Profit / Loss"
                  value={formatMoney(
                    analytics.unrealizedProfitLoss,
                    currency,
                  )}
                />

                <MetricCard
                  label="Active Investments"
                  value={analytics.activeInvestmentCount.toString()}
                />

                <MetricCard
                  label="Largest Investment"
                  value={
                    analytics.largestInvestment
                      ? analytics.largestInvestment.name
                      : "None"
                  }
                />

                <MetricCard
                  label="Largest Concentration"
                  value={`${analytics.largestInvestmentConcentrationPercentage.toFixed(2)}%`}
                />
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">
                  Allocation by Investment Type
                </h3>

                {analytics.allocationByType.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">
                    No active investment allocation data is available.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {analytics.allocationByType.map((allocation) => (
                      <div
                        key={allocation.investmentType}
                        className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0"
                      >
                        <span className="font-medium">
                          {allocation.investmentType}
                        </span>

                        <span className="text-sm text-gray-600">
                          {formatMoney(
                            allocation.currentValue,
                            currency,
                          )}{" "}
                          ·{" "}
                          {allocation.percentage.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">Methodology</h3>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p>
                    Total invested and profit/loss values are calculated from
                    the existing investment performance records.
                  </p>
                  <p>
                    Current portfolio value, allocation, active investment
                    count, and concentration use active, non-archived
                    investments.
                  </p>
                  <p>
                    Investment types are grouped separately for allocation
                    analysis.
                  </p>
                  <p>
                    These metrics describe recorded financial data and do not
                    provide investment recommendations or predictions.
                  </p>
                </div>
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}

