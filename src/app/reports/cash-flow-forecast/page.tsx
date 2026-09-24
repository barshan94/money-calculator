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

function formatMoney(
  value: number,
  currency: string,
) {
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

function getChangeClass(value: number) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
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

  const startDate = new Date()
    .toISOString()
    .slice(0, 10);

  const forecasts = await getCashFlowForecast({
    lookbackMonths,
    months: forecastMonths,
    startDate,
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
          <span className="eyebrow">
            Financial Intelligence
          </span>

          <h1>Cash-Flow Forecast</h1>

          <p className="page-description">
            A transparent {forecastMonths}-month projection
            based on the most recent {lookbackMonths} months
            of income and expenses, plus known recurring
            transactions.
          </p>
        </header>

        <div className="disclaimer">
          <strong>Planning estimate:</strong>{" "}
          this forecast is based on historical cash flow and
          scheduled recurring transactions. It is not a
          guaranteed prediction.
        </div>

        <ForecastSettings
          lookbackMonths={lookbackMonths}
          forecastMonths={forecastMonths}
        />

        {forecasts.length === 0 ? (
          <section className="empty-state card">
            <div className="empty-icon">◎</div>

            <h2>No forecast available</h2>

            <p>
              There is not enough usable historical financial
              data to build a forecast yet.
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
              const projectedNet =
                forecast.months.reduce(
                  (total, month) =>
                    total + month.projectedNet,
                  0,
                );

              const negativeMonths =
                forecast.months.filter(
                  (month) => month.projectedNet < 0,
                ).length;

              const positiveMonths =
                forecast.months.filter(
                  (month) => month.projectedNet > 0,
                ).length;

              const chartData =
                forecast.months.map((month) => ({
                  month: formatMonth(
                    month.monthIndex,
                  ),
                  projectedIncome:
                    month.projectedIncome,
                  projectedExpenses:
                    month.projectedExpenses,
                  projectedNet:
                    month.projectedNet,
                }));

              return (
                <section
                  key={forecast.currency}
                  className="currency-section"
                >
                  <div className="currency-heading">
                    <span className="eyebrow">
                      Forecast Currency
                    </span>

                    <h2>{forecast.currency}</h2>

                    <p>
                      {forecastMonths}-month outlook
                      using a {lookbackMonths}-month
                      historical baseline.
                    </p>
                  </div>

                  <div className="metric-grid">
                    <article className="metric-card card">
                      <span className="metric-label">
                        Projected Net
                      </span>

                      <strong
                        className={`metric-value ${getChangeClass(
                          projectedNet,
                        )}`}
                      >
                        {projectedNet >= 0
                          ? "+"
                          : ""}
                        {formatMoney(
                          projectedNet,
                          forecast.currency,
                        )}
                      </strong>
                    </article>

                    <article className="metric-card card">
                      <span className="metric-label">
                        Negative Months
                      </span>

                      <strong
                        className={`metric-value ${
                          negativeMonths > 0
                            ? "negative"
                            : "neutral"
                        }`}
                      >
                        {negativeMonths}
                      </strong>

                      <span className="metric-note">
                        of {forecast.months.length} forecast
                        months
                      </span>
                    </article>

                    <article className="metric-card card">
                      <span className="metric-label">
                        Positive Months
                      </span>

                      <strong
                        className={`metric-value ${
                          positiveMonths > 0
                            ? "positive"
                            : "neutral"
                        }`}
                      >
                        {positiveMonths}
                      </strong>

                      <span className="metric-note">
                        of {forecast.months.length} forecast
                        months
                      </span>
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
                          Projected Cash Flow
                        </h3>

                        <p>
                          Income, expenses, and resulting
                          monthly net cash flow.
                        </p>
                      </div>
                    </div>

                    <div className="chart-wrapper">
                      <CashFlowForecastChart
                        currency={forecast.currency}
                        data={chartData}
                      />
                    </div>
                  </section>

                  <section className="report-section">
                    <div className="section-heading">
                      <div>
                        <h3>
                          Monthly Projection
                        </h3>

                        <p>
                          Review the projected income,
                          expenses, and net amount for
                          each month.
                        </p>
                      </div>
                    </div>

                    <div className="monthly-grid">
                      {forecast.months.map(
                        (month) => (
                          <article
                            key={`${forecast.currency}-${month.monthIndex}`}
                            className="monthly-card card"
                          >
                            <span className="month-label">
                              {formatMonth(
                                month.monthIndex,
                              )}
                            </span>

                            <div className="monthly-row">
                              <span>
                                Projected income
                              </span>

                              <strong>
                                {formatMoney(
                                  month.projectedIncome,
                                  forecast.currency,
                                )}
                              </strong>
                            </div>

                            <div className="monthly-row">
                              <span>
                                Projected expenses
                              </span>

                              <strong>
                                {formatMoney(
                                  month.projectedExpenses,
                                  forecast.currency,
                                )}
                              </strong>
                            </div>

                            <div className="monthly-row monthly-net">
                              <span>
                                Projected net
                              </span>

                              <strong
                                className={getChangeClass(
                                  month.projectedNet,
                                )}
                              >
                                {month.projectedNet >=
                                0
                                  ? "+"
                                  : ""}
                                {formatMoney(
                                  month.projectedNet,
                                  forecast.currency,
                                )}
                              </strong>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                </section>
              );
            })}
          </div>
        )}

        <section className="methodology card">
          <h2>How this forecast works</h2>

          <p>
            The baseline uses the average monthly income
            and expenses from the selected historical
            lookback period. Active recurring transactions
            are then added according to their actual
            scheduled dates.
          </p>

          <p className="methodology-note">
            This is a planning estimate, not a guaranteed
            prediction. Actual future cash flow may differ
            from the projection.
          </p>
        </section>
      </div>

      <style>{`
        .forecast-page {
          min-height: 100vh;
          padding: 24px 16px 56px;
        }

        .forecast-shell {
          width: 100%;
          max-width: 1200px;
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
          margin-bottom: 18px;
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
          max-width: 780px;
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

        .metric-note {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          opacity: 0.62;
        }

        .positive {
          color: var(--success, #16803c);
        }

        .negative {
          color: var(--destructive, #c62828);
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
              minmax(220px, 1fr)
            );
          gap: 12px;
        }

        .monthly-card {
          min-width: 0;
          padding: 16px;
        }

        .month-label {
          display: block;
          margin-bottom: 14px;
          font-size: 14px;
          font-weight: 700;
          opacity: 0.72;
        }

        .monthly-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 0;
          border-bottom: 1px solid
            var(--border, #ddd);
        }

        .monthly-row:last-child {
          border-bottom: 0;
        }

        .monthly-row span {
          font-size: 13px;
          opacity: 0.68;
        }

        .monthly-row strong {
          text-align: right;
          overflow-wrap: anywhere;
        }

        .monthly-net {
          margin-top: 3px;
          padding-top: 12px;
          font-weight: 700;
        }

        .monthly-net span {
          opacity: 0.9;
          font-weight: 700;
        }

        .methodology {
          margin-top: 32px;
          padding: 18px;
          line-height: 1.6;
        }

        .methodology h2 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 18px;
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
          background: var(--primary, #111827);
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

          .monthly-row {
            gap: 8px;
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

          .monthly-row {
            display: grid;
            gap: 4px;
          }

          .monthly-row strong {
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}

