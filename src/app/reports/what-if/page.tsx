import Link from "next/link";

import WhatIfScenarioChart from "@/components/reports/what-if-scenario-chart";
import { formatMoney } from "@/lib/finance/format-money";
import { getWhatIfScenario } from "@/lib/intelligence/get-what-if-scenario";

const LOOKBACK_OPTIONS = [3, 6, 12];
const HORIZON_OPTIONS = [3, 6, 12];

type SearchParams = {
  incomeChange?: string;
  expenseChange?: string;
  months?: string;
  lookback?: string;
};

function getNumber(
  value: string | undefined,
  fallback: number,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getValidOption(
  value: string | undefined,
  options: number[],
  fallback: number,
) {
  const parsed = Number(value);

  return options.includes(parsed) ? parsed : fallback;
}

function formatChange(
  currency: string,
  value: number,
) {
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${formatMoney(value, currency)}`;
}

function formatMonth(monthIndex: number) {
  const date = new Date();

  date.setDate(1);
  date.setMonth(
    date.getMonth() + monthIndex,
  );

  return date.toLocaleDateString("en-BD", {
    month: "short",
    year: "numeric",
  });
}

function buildUrl(
  incomeChange: number,
  expenseChange: number,
  months: number,
  lookback: number,
) {
  const params = new URLSearchParams();

  params.set(
    "incomeChange",
    String(incomeChange),
  );

  params.set(
    "expenseChange",
    String(expenseChange),
  );

  params.set(
    "months",
    String(months),
  );

  params.set(
    "lookback",
    String(lookback),
  );

  return `/reports/what-if?${params.toString()}`;
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="card"
      style={{
        minWidth: 0,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--muted-foreground, #666)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          fontSize: 20,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <small
        style={{
          display: "block",
          marginBottom: 4,
          color: "var(--muted-foreground, #666)",
        }}
      >
        {label}
      </small>

      <div
        style={{
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function WhatIfPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const incomeChange = getNumber(
    params.incomeChange,
    0,
  );

  const expenseChange = getNumber(
    params.expenseChange,
    0,
  );

  const months = getValidOption(
    params.months,
    HORIZON_OPTIONS,
    6,
  );

  const lookback = getValidOption(
    params.lookback,
    LOOKBACK_OPTIONS,
    6,
  );

  const scenarios = await getWhatIfScenario({
    incomeChange,
    expenseChange,
    months,
    lookbackMonths: lookback,
  });

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <Link
          href="/reports"
          style={{
            display: "inline-block",
            marginBottom: 12,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← Back to Reports
        </Link>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 5vw, 36px)",
            lineHeight: 1.15,
          }}
        >
          What-if Simulation
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: 760,
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          Explore how a hypothetical change in income or
          expenses would affect your monthly surplus over
          the selected period.
        </p>
      </header>

      <section
        className="card"
        style={{
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 21,
            }}
          >
            Scenario Settings
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Positive income changes increase income.
            Negative expense changes reduce expenses.
          </p>
        </div>

        <form
          method="get"
          action="/reports/what-if"
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 7,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Monthly income change
              </span>

              <input
                name="incomeChange"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={incomeChange}
                aria-describedby="income-change-help"
                style={{
                  minHeight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              />

              <span
                id="income-change-help"
                style={{
                  fontSize: 12,
                  color:
                    "var(--muted-foreground, #666)",
                  lineHeight: 1.4,
                }}
              >
                Use a positive value to increase income.
              </span>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Monthly expense change
              </span>

              <input
                name="expenseChange"
                type="number"
                step="0.01"
                inputMode="decimal"
                defaultValue={expenseChange}
                aria-describedby="expense-change-help"
                style={{
                  minHeight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              />

              <span
                id="expense-change-help"
                style={{
                  fontSize: 12,
                  color:
                    "var(--muted-foreground, #666)",
                  lineHeight: 1.4,
                }}
              >
                Use a negative value to reduce expenses.
              </span>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Forecast horizon
              </span>

              <select
                name="months"
                defaultValue={months}
                style={{
                  minHeight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              >
                {HORIZON_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option} months
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Historical lookback
              </span>

              <select
                name="lookback"
                defaultValue={lookback}
                style={{
                  minHeight: 44,
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              >
                {LOOKBACK_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option} months
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <button
              type="submit"
              style={{
                minHeight: 44,
                padding: "8px 18px",
                borderRadius: 8,
                border:
                  "1px solid var(--border, #d1d5db)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Run Simulation
            </button>
          </div>
        </form>
      </section>

      {scenarios.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            No simulation available
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: 560,
              color:
                "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            There is not enough usable historical financial
            data to build this scenario.
          </p>

          <Link
            href="/transactions/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              marginTop: 16,
              padding: "0 16px",
              borderRadius: 8,
              border:
                "1px solid var(--border, #ddd)",
              textDecoration: "none",
            }}
          >
            Add Transaction →
          </Link>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 28,
          }}
        >
          {scenarios.map((item) => {
            const scenario = item.scenario;

            const chartData = scenario.months.map(
              (month) => ({
                month: formatMonth(
                  month.monthIndex,
                ),
                baselineNet:
                  scenario.baselineNet,
                scenarioNet:
                  month.scenarioNet,
              }),
            );

            return (
              <section
                key={item.currency}
                style={{
                  display: "grid",
                  gap: 18,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 23,
                    }}
                  >
                    {item.currency}
                  </h2>

                  <p
                    style={{
                      margin: "6px 0 0",
                      color:
                        "var(--muted-foreground, #666)",
                      lineHeight: 1.5,
                    }}
                  >
                    {lookback}-month historical baseline
                    with a {months}-month scenario horizon.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 12,
                  }}
                >
                  <MetricCard
                    label="Baseline monthly net"
                    value={formatMoney(
                      scenario.baselineNet,
                      item.currency,
                    )}
                  />

                  <MetricCard
                    label="Scenario monthly net"
                    value={formatMoney(
                      scenario.scenarioNet,
                      item.currency,
                    )}
                  />

                  <MetricCard
                    label="Monthly net difference"
                    value={formatChange(
                      item.currency,
                      scenario.monthlyNetDifference,
                    )}
                  />

                  <MetricCard
                    label={`${months}-month difference`}
                    value={formatChange(
                      item.currency,
                      scenario.cumulativeNetDifference,
                    )}
                  />
                </div>

                <section
                  className="card"
                  style={{
                    padding: 20,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 18px",
                      fontSize: 19,
                    }}
                  >
                    Baseline vs Scenario
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <DetailMetric
                      label="Baseline income"
                      value={formatMoney(
                        scenario.baselineIncome,
                        item.currency,
                      )}
                    />

                    <DetailMetric
                      label="Scenario income"
                      value={formatMoney(
                        scenario.scenarioIncome,
                        item.currency,
                      )}
                    />

                    <DetailMetric
                      label="Baseline expenses"
                      value={formatMoney(
                        scenario.baselineExpenses,
                        item.currency,
                      )}
                    />

                    <DetailMetric
                      label="Scenario expenses"
                      value={formatMoney(
                        scenario.scenarioExpenses,
                        item.currency,
                      )}
                    />
                  </div>
                </section>

                <section
                  className="card"
                  style={{
                    padding: 20,
                    minWidth: 0,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      fontSize: 19,
                    }}
                  >
                    Baseline vs Scenario
                  </h3>

                  <div
                    style={{
                      width: "100%",
                      minWidth: 0,
                      overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <WhatIfScenarioChart
                        currency={item.currency}
                        data={chartData}
                      />
                    </div>
                  </div>
                </section>

                <section
                  className="card"
                  style={{
                    padding: 20,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      fontSize: 19,
                    }}
                  >
                    Scenario by Month
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {scenario.months.map(
                      (month) => (
                        <article
                          key={`${item.currency}-${month.monthIndex}`}
                          style={{
                            border:
                              "1px solid var(--border, #ddd)",
                            borderRadius: 10,
                            padding: 16,
                            minWidth: 0,
                          }}
                        >
                          <h4
                            style={{
                              margin: "0 0 14px",
                              fontSize: 16,
                            }}
                          >
                            {formatMonth(
                              month.monthIndex,
                            )}
                          </h4>

                          <div
                            style={{
                              display: "grid",
                              gap: 12,
                            }}
                          >
                            <DetailMetric
                              label="Income"
                              value={formatMoney(
                                month.scenarioIncome,
                                item.currency,
                              )}
                            />

                            <DetailMetric
                              label="Expenses"
                              value={formatMoney(
                                month.scenarioExpenses,
                                item.currency,
                              )}
                            />

                            <DetailMetric
                              label="Monthly net"
                              value={formatMoney(
                                month.scenarioNet,
                                item.currency,
                              )}
                            />

                            <DetailMetric
                              label="Cumulative net"
                              value={formatMoney(
                                month.cumulativeNet,
                                item.currency,
                              )}
                            />
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </section>

                <div>
                  <Link
                    href={buildUrl(
                      0,
                      0,
                      months,
                      lookback,
                    )}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 42,
                      padding: "0 14px",
                      borderRadius: 8,
                      border:
                        "1px solid var(--border, #ddd)",
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    Reset Scenario
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section
        className="card"
        style={{
          marginTop: 32,
          padding: 20,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontSize: 20,
          }}
        >
          Methodology
        </h2>

        <div
          style={{
            display: "grid",
            gap: 12,
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0 }}>
            The baseline monthly income and expenses are
            calculated from the average of the selected
            historical lookback period.
          </p>

          <p style={{ margin: 0 }}>
            The scenario then applies the income and expense
            changes equally to each projected month.
          </p>

          <p style={{ margin: 0 }}>
            Positive income changes increase projected income.
            Negative expense changes reduce projected expenses.
          </p>

          <p style={{ margin: 0 }}>
            This is a hypothetical planning simulation. It is
            not a prediction or guarantee of future financial
            results.
          </p>
        </div>
      </section>

      <style>{`
        a:focus-visible,
        button:focus-visible,
        input:focus-visible,
        select:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 3px;
        }

        input,
        select,
        button {
          font: inherit;
        }

        @media (max-width: 600px) {
          main {
            padding: 18px 12px 36px !important;
          }

          .card {
            padding: 16px !important;
          }

          button,
          input,
          select {
            min-height: 44px !important;
          }

          a {
            -webkit-tap-highlight-color: transparent;
          }
        }

        @media (max-width: 420px) {
          main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </main>
  );
}

