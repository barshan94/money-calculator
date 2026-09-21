import Link from "next/link";

import { getCashFlowForecast } from "@/lib/intelligence/get-cash-flow-forecast";
import ForecastSettings from "./forecast-settings";
import CashFlowForecastChart from "@/components/reports/cash-flow-forecast-chart";

const LOOKBACK_OPTIONS = [3, 6, 12];
const HORIZON_OPTIONS = [3, 6, 12];

type SearchParams = {
  lookback?: string;
  horizon?: string;
};

function getValidOption(
  value: string | undefined,
  options: number[],
  fallback: number,
) {
  const parsed = Number(value);

  return options.includes(parsed) ? parsed : fallback;
}

function formatMoney(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(monthIndex: number) {
  const date = new Date();

  date.setDate(1);
  date.setMonth(date.getMonth() + monthIndex);

  return date.toLocaleDateString("en-BD", {
    month: "short",
    year: "numeric",
  });
}

export default async function CashFlowForecastPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const lookbackMonths = getValidOption(
    params.lookback,
    LOOKBACK_OPTIONS,
    6,
  );

  const forecastMonths = getValidOption(
    params.horizon,
    HORIZON_OPTIONS,
    6,
  );

  const startDate = new Date().toISOString().slice(0, 10);

  const forecasts = await getCashFlowForecast({
    lookbackMonths,
    months: forecastMonths,
    startDate,
  });

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <Link href="/reports">
          ← Back to Reports
        </Link>
      </div>

      <header
        style={{
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            marginBottom: 8,
          }}
        >
          Cash-Flow Forecast
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 760,
            opacity: 0.8,
          }}
        >
          A transparent {forecastMonths}-month projection based on
          the most recent {lookbackMonths} months of income and
          expenses, plus your known recurring transactions.
        </p>
      </header>

      <ForecastSettings
        lookbackMonths={lookbackMonths}
        forecastMonths={forecastMonths}
      />

      {forecasts.length === 0 ? (
        <section
          style={{
            border: "1px solid var(--border-color, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2>No forecast available</h2>

          <p>
            There is not enough usable historical financial data to
            build a forecast yet.
          </p>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 32,
          }}
        >
          {forecasts.map((forecast) => {
            const projectedNet = forecast.months.reduce(
              (total, month) => total + month.projectedNet,
              0,
            );

            const negativeMonths = forecast.months.filter(
              (month) => month.projectedNet < 0,
            ).length;

            const chartData = forecast.months.map((month) => ({
              month: formatMonth(month.monthIndex),
              projectedIncome: month.projectedIncome,
              projectedExpenses: month.projectedExpenses,
              projectedNet: month.projectedNet,
            }));

            return (
              <section
                key={forecast.currency}
                style={{
                  display: "grid",
                  gap: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      marginBottom: 6,
                    }}
                  >
                    {forecast.currency}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      opacity: 0.75,
                    }}
                  >
                    {forecastMonths}-month outlook using a{" "}
                    {lookbackMonths}-month historical baseline.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginBottom: 6,
                      }}
                    >
                      Projected Net
                    </div>

                    <strong
                      style={{
                        fontSize: 22,
                      }}
                    >
                      {formatMoney(
                        projectedNet,
                        forecast.currency,
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginBottom: 6,
                      }}
                    >
                      Negative Months
                    </div>

                    <strong
                      style={{
                        fontSize: 22,
                      }}
                    >
                      {negativeMonths}
                    </strong>
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginBottom: 6,
                      }}
                    >
                      Historical Lookback
                    </div>

                    <strong
                      style={{
                        fontSize: 22,
                      }}
                    >
                      {lookbackMonths} months
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                    }}
                  >
                    Projected Cash Flow
                  </h3>

                  <CashFlowForecastChart
                    currency={forecast.currency}
                    data={chartData}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                  }}
                >
                  {forecast.months.map((month) => (
                    <article
                      key={`${forecast.currency}-${month.monthIndex}`}
                      style={{
                        border:
                          "1px solid var(--border-color, #e5e7eb)",
                        borderRadius: 12,
                        padding: 16,
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                          marginBottom: 16,
                        }}
                      >
                        {formatMonth(month.monthIndex)}
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              opacity: 0.7,
                            }}
                          >
                            Projected income
                          </span>

                          <strong>
                            {formatMoney(
                              month.projectedIncome,
                              forecast.currency,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              opacity: 0.7,
                            }}
                          >
                            Projected expenses
                          </span>

                          <strong>
                            {formatMoney(
                              month.projectedExpenses,
                              forecast.currency,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              opacity: 0.7,
                            }}
                          >
                            Projected net
                          </span>

                          <strong>
                            {formatMoney(
                              month.projectedNet,
                              forecast.currency,
                            )}
                          </strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section
        style={{
          marginTop: 32,
          padding: 16,
          borderRadius: 12,
          border: "1px solid var(--border-color, #e5e7eb)",
        }}
      >
        <strong>How this forecast works</strong>

        <p
          style={{
            marginBottom: 0,
            opacity: 0.8,
          }}
        >
          The baseline uses the average monthly income and expenses
          from the selected historical lookback period. Active
          recurring transactions are then added according to their
          actual scheduled dates. This is a planning estimate, not a
          guaranteed prediction.
        </p>
      </section>
    </main>
  );
}

