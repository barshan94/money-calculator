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

  return options.includes(parsed) ? parsed : fallback;
}

function formatMoney(
  amount: number,
  currency: string,
): string {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatMonth(monthIndex: number): string {
  const date = new Date();

  date.setMonth(date.getMonth() + monthIndex);

  return date.toLocaleDateString("en-BD", {
    month: "short",
    year: "numeric",
  });
}

function getChangeClass(amount: number): string {
  if (amount > 0) return "positive";
  if (amount < 0) return "negative";
  return "neutral";
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
    <main className="forecast-page">
      <div className="forecast-shell">
        <Link
          href="/reports"
          className="back-link"
        >
          ← Back to Reports
        </Link>

        <header className="page-header">
          <div>
            <span className="eyebrow">
              Financial Intelligence
            </span>

            <h1>Net-Worth Forecast</h1>

            <p className="page-description">
              A transparent mathematical projection of future
              net worth based on average historical monthly
              changes.
            </p>
          </div>
        </header>

        <div className="disclaimer">
          <strong>Projection, not prediction:</strong>{" "}
          this calculation does not forecast investment returns,
          inflation, or market performance.
        </div>

        <ForecastSettings
          lookbackMonths={lookbackMonths}
          forecastMonths={forecastMonths}
          basePath="/reports/net-worth-forecast"
        />

        {forecasts.length === 0 ? (
          <section className="empty-state card">
            <div className="empty-icon">◎</div>

            <h2>No forecast available</h2>

            <p>
              More than one valid historical net-worth value is
              required to calculate a forecast.
            </p>

            <Link
              href="/reports"
              className="button-link"
            >
              Back to Reports
            </Link>
          </section>
        ) : (
          <div className="forecast-list">
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

              const changeClass =
                getChangeClass(projectedChange);

              const monthlyChangeClass =
                getChangeClass(
                  averageMonthlyChange,
                );

              return (
                <section
                  key={forecast.currency}
                  className="currency-section"
                >
                  <div className="currency-heading">
                    <div>
                      <span className="eyebrow">
                        Forecast Currency
                      </span>

                      <h2>
                        {forecast.currency} Net Worth
                      </h2>

                      <p>
                        Based on the selected{" "}
                        {lookbackMonths}-month historical
                        period.
                      </p>
                    </div>
                  </div>

                  <div className="metric-grid">
                    <article className="metric-card card">
                      <span className="metric-label">
                        Projected End Net Worth
                      </span>

                      <strong className="metric-value">
                        {formatMoney(
                          lastProjected.projectedNetWorth,
                          forecast.currency,
                        )}
                      </strong>
                    </article>

                    <article className="metric-card card">
                      <span className="metric-label">
                        Forecast Change
                      </span>

                      <strong
                        className={`metric-value ${changeClass}`}
                      >
                        {projectedChange >= 0
                          ? "+"
                          : ""}
                        {formatMoney(
                          projectedChange,
                          forecast.currency,
                        )}
                      </strong>
                    </article>

                    <article className="metric-card card">
                      <span className="metric-label">
                        Avg. Monthly Change
                      </span>

                      <strong
                        className={`metric-value ${monthlyChangeClass}`}
                      >
                        {averageMonthlyChange >= 0
                          ? "+"
                          : ""}
                        {formatMoney(
                          averageMonthlyChange,
                          forecast.currency,
                        )}
                      </strong>
                    </article>

                    <article className="metric-card card">
                      <span className="metric-label">
                        Historical Lookback
                      </span>

                      <strong className="metric-value">
                        {lookbackMonths} months
                      </strong>
                    </article>
                  </div>

                  <section className="report-section card">
                    <div className="section-heading">
                      <div>
                        <h3>
                          Projected Net Worth
                        </h3>

                        <p>
                          Projected trajectory across the
                          selected forecast horizon.
                        </p>
                      </div>
                    </div>

                    <div className="chart-wrapper">
                      <NetWorthForecastChart
                        currency={forecast.currency}
                        data={chartData}
                      />
                    </div>
                  </section>

                  <section className="report-section">
                    <div className="section-heading">
                      <div>
                        <h3>Monthly Projection</h3>

                        <p>
                          Projected net worth and monthly
                          change for each forecast period.
                        </p>
                      </div>
                    </div>

                    <div className="monthly-grid">
                      {forecast.months.map(
                        (month) => {
                          const monthChangeClass =
                            getChangeClass(
                              month.projectedChange,
                            );

                          return (
                            <article
                              key={month.monthIndex}
                              className="monthly-card card"
                            >
                              <span className="month-label">
                                {formatMonth(
                                  month.monthIndex,
                                )}
                              </span>

                              <strong className="month-value">
                                {formatMoney(
                                  month.projectedNetWorth,
                                  forecast.currency,
                                )}
                              </strong>

                              <span
                                className={`monthly-change ${monthChangeClass}`}
                              >
                                Monthly change:{" "}
                                {month.projectedChange >=
                                0
                                  ? "+"
                                  : ""}
                                {formatMoney(
                                  month.projectedChange,
                                  forecast.currency,
                                )}
                              </span>
                            </article>
                          );
                        },
                      )}
                    </div>
                  </section>

                  <section className="methodology card">
                    <h3>Methodology</h3>

                    <p>
                      The forecast starts from the latest
                      historical net worth and applies the
                      average month-to-month net-worth change
                      observed during the selected lookback
                      period.
                    </p>

                    <p className="methodology-note">
                      It does not assume a fixed investment
                      return, inflation rate, or market
                      performance.
                    </p>
                  </section>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .forecast-page {
          min-height: 100vh;
          padding: 24px 16px 56px;
        }

        .forecast-shell {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: inherit;
          text-decoration: none;
          opacity: 0.78;
          font-weight: 600;
        }

        .back-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .back-link:focus-visible,
        .button-link:focus-visible {
          outline: 3px solid
            var(--ring, rgba(59, 130, 246, 0.35));
          outline-offset: 3px;
          border-radius: 6px;
        }

        .page-header {
          margin-top: 20px;
          margin-bottom: 20px;
        }

        .eyebrow {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          line-height: 1.4;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.62;
        }

        .page-header h1,
        .currency-heading h2 {
          margin: 0;
        }

        .page-description {
          max-width: 760px;
          margin: 10px 0 0;
          line-height: 1.65;
          opacity: 0.76;
        }

        .disclaimer {
          margin-bottom: 20px;
          padding: 14px 16px;
          border: 1px solid var(--border, #ddd);
          border-radius: 10px;
          background: var(
            --surface-muted,
            #f3f4f6
          );
          line-height: 1.55;
          font-size: 14px;
        }

        .forecast-list {
          display: grid;
          gap: 40px;
          margin-top: 24px;
        }

        .currency-section {
          display: grid;
          gap: 24px;
        }

        .currency-heading p,
        .section-heading p {
          margin: 6px 0 0;
          opacity: 0.68;
          line-height: 1.5;
        }

        .metric-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .metric-card {
          min-width: 0;
          padding: 18px;
        }

        .metric-label {
          display: block;
          margin-bottom: 9px;
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.68;
        }

        .metric-value {
          display: block;
          font-size: 20px;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .positive {
          color: var(
            --success,
            #16803c
          );
        }

        .negative {
          color: var(
            --destructive,
            #c62828
          );
        }

        .neutral {
          opacity: 0.8;
        }

        .report-section {
          min-width: 0;
        }

        .report-section.card {
          padding: 18px;
        }

        .section-heading {
          margin-bottom: 16px;
        }

        .section-heading h3 {
          margin: 0;
        }

        .chart-wrapper {
          width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .monthly-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(180px, 1fr)
            );
          gap: 12px;
        }

        .monthly-card {
          min-width: 0;
          padding: 16px;
        }

        .month-label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          opacity: 0.68;
        }

        .month-value {
          display: block;
          margin-bottom: 7px;
          font-size: 17px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .monthly-change {
          display: block;
          font-size: 13px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .methodology {
          padding: 18px;
          line-height: 1.6;
        }

        .methodology h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }

        .methodology p {
          margin: 0;
        }

        .methodology-note {
          margin-top: 10px !important;
          opacity: 0.68;
          font-size: 14px;
        }

        .empty-state {
          margin-top: 24px;
          padding: 32px 20px;
          text-align: center;
        }

        .empty-icon {
          margin-bottom: 10px;
          font-size: 28px;
          opacity: 0.55;
        }

        .empty-state h2 {
          margin: 0 0 8px;
        }

        .empty-state p {
          max-width: 560px;
          margin: 0 auto 20px;
          line-height: 1.6;
          opacity: 0.7;
        }

        .button-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 16px;
          border-radius: 8px;
          background: var(
            --primary,
            #111827
          );
          color: white;
          text-decoration: none;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .metric-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .forecast-page {
            padding: 18px 12px 40px;
          }

          .page-header {
            margin-top: 14px;
            margin-bottom: 16px;
          }

          .page-header h1 {
            font-size: 28px;
            line-height: 1.2;
          }

          .page-description {
            font-size: 14px;
          }

          .disclaimer {
            padding: 12px 14px;
            font-size: 13px;
          }

          .forecast-list {
            gap: 32px;
            margin-top: 20px;
          }

          .currency-section {
            gap: 18px;
          }

          .metric-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .metric-card {
            padding: 15px;
          }

          .metric-value {
            font-size: 19px;
          }

          .report-section.card,
          .methodology {
            padding: 15px;
          }

          .monthly-grid {
            grid-template-columns: 1fr;
          }

          .monthly-card {
            padding: 15px;
          }

          .button-link {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .forecast-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .page-header h1 {
            font-size: 25px;
          }

          .metric-label {
            font-size: 12px;
          }

          .metric-value {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  );
}

