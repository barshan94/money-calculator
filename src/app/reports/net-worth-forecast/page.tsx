import Link from "next/link";
import { getNetWorthForecast } from "@/lib/intelligence/get-net-worth-forecast";
import NetWorthForecastChart from "@/components/reports/net-worth-forecast-chart";
import ForecastSettings from "../cash-flow-forecast/forecast-settings";

const LOOKBACK_OPTIONS = [3, 6, 12];
const HORIZON_OPTIONS = [3, 6, 12];

type SearchParams = {
  lookback?: string;
  horizon?: string;
};

function parseOption(
  value: string | undefined,
  options: number[],
  fallback: number,
): number {
  const parsed = Number(value);

  return options.includes(parsed)
    ? parsed
    : fallback;
}

function formatMoney(
  amount: number,
  currency: string,
): string {
  return `${currency} ${amount.toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatMonth(
  monthIndex: number,
): string {
  const date = new Date();
  date.setMonth(
    date.getMonth() + monthIndex,
  );

  return date.toLocaleDateString(
    "en-BD",
    {
      month: "short",
      year: "numeric",
    },
  );
}

export default async function NetWorthForecastPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const lookbackMonths = parseOption(
    params.lookback,
    LOOKBACK_OPTIONS,
    6,
  );

  const forecastMonths = parseOption(
    params.horizon,
    HORIZON_OPTIONS,
    6,
  );

  const forecasts = await getNetWorthForecast({
    lookbackMonths,
    months: forecastMonths,
  });

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <Link href="/reports">
        ← Back to Reports
      </Link>

      <header
        style={{
          marginTop: 24,
          marginBottom: 24,
        }}
      >
        <h1>Net-Worth Forecast</h1>

        <p
          style={{
            maxWidth: 760,
            opacity: 0.8,
          }}
        >
          A transparent projection of future net worth based
          on the average monthly change in your historical
          net worth. This is a mathematical projection, not
          a prediction of investment returns or market
          performance.
        </p>
      </header>

      <ForecastSettings
        lookbackMonths={lookbackMonths}
        forecastMonths={forecastMonths}
        basePath="/reports/net-worth-forecast"
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
            More than one valid historical net-worth value
            is required to calculate a forecast.
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
            const firstProjected =
              forecast.months[0];

            const lastProjected =
              forecast.months[
                forecast.months.length - 1
              ];

            const startingNetWorth =
              firstProjected.projectedNetWorth -
              firstProjected.projectedChange;

            const projectedChange =
              lastProjected.projectedNetWorth -
              startingNetWorth;

            const averageMonthlyChange =
              forecast.months.reduce(
                (total, month) =>
                  total + month.projectedChange,
                0,
              ) / forecast.months.length;

            const chartData =
              forecast.months.map((month) => ({
                month: formatMonth(
                  month.monthIndex,
                ),
                projectedNetWorth:
                  month.projectedNetWorth,
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
                  <h2>
                    {forecast.currency} Net Worth
                  </h2>

                  <p
                    style={{
                      opacity: 0.75,
                      marginTop: 4,
                    }}
                  >
                    Based on the selected{" "}
                    {lookbackMonths}-month historical
                    period.
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
                  <article
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 8,
                      }}
                    >
                      Projected End Net Worth
                    </div>

                    <strong>
                      {formatMoney(
                        lastProjected.projectedNetWorth,
                        forecast.currency,
                      )}
                    </strong>
                  </article>

                  <article
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 8,
                      }}
                    >
                      Forecast Change
                    </div>

                    <strong>
                      {formatMoney(
                        projectedChange,
                        forecast.currency,
                      )}
                    </strong>
                  </article>

                  <article
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 8,
                      }}
                    >
                      Avg. Monthly Change
                    </div>

                    <strong>
                      {formatMoney(
                        averageMonthlyChange,
                        forecast.currency,
                      )}
                    </strong>
                  </article>

                  <article
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        opacity: 0.7,
                        marginBottom: 8,
                      }}
                    >
                      Historical Lookback
                    </div>

                    <strong>
                      {lookbackMonths} months
                    </strong>
                  </article>
                </div>

                <section
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
                    }}
                  >
                    Projected Net Worth
                  </h3>

                  <NetWorthForecastChart
                    currency={forecast.currency}
                    data={chartData}
                  />
                </section>

                <section>
                  <h3>Monthly Projection</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {forecast.months.map(
                      (month) => (
                        <article
                          key={month.monthIndex}
                          style={{
                            border:
                              "1px solid var(--border-color, #e5e7eb)",
                            borderRadius: 12,
                            padding: 16,
                          }}
                        >
                          <div
                            style={{
                              opacity: 0.7,
                              marginBottom: 8,
                            }}
                          >
                            {formatMonth(
                              month.monthIndex,
                            )}
                          </div>

                          <strong
                            style={{
                              display: "block",
                              marginBottom: 6,
                            }}
                          >
                            {formatMoney(
                              month.projectedNetWorth,
                              forecast.currency,
                            )}
                          </strong>

                          <span
                            style={{
                              opacity: 0.75,
                              fontSize: 14,
                            }}
                          >
                            Monthly change:{" "}
                            {formatMoney(
                              month.projectedChange,
                              forecast.currency,
                            )}
                          </span>
                        </article>
                      ),
                    )}
                  </div>
                </section>

                <section
                  style={{
                    border:
                      "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <h3>Methodology</h3>

                  <p
                    style={{
                      marginBottom: 0,
                    }}
                  >
                    The forecast starts from the latest
                    historical net worth and applies the
                    average month-to-month net-worth change
                    observed during the selected lookback
                    period. It does not assume a fixed
                    investment return, inflation rate, or
                    market performance.
                  </p>
                </section>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

