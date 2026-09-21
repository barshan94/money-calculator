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

function formatMonth(
  monthIndex: number,
) {
  const date = new Date();

  date.setDate(1);
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

  const scenarios =
    await getWhatIfScenario({
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
          What-if Simulation
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 760,
            opacity: 0.8,
          }}
        >
          Explore how a hypothetical change in income or
          expenses would affect your monthly surplus over
          the selected period.
        </p>
      </header>

      <section
        style={{
          border:
            "1px solid var(--border-color, #e5e7eb)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 8,
          }}
        >
          Scenario settings
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: 20,
            opacity: 0.75,
          }}
        >
          Positive income changes increase income.
          Negative expense changes reduce expenses.
        </p>

        <form
          method="get"
          action="/reports/what-if"
          style={{
            display: "grid",
            gap: 16,
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
                gap: 8,
              }}
            >
              <span>
                Monthly income change
              </span>

              <input
                name="incomeChange"
                type="number"
                step="0.01"
                defaultValue={incomeChange}
                style={{
                  minHeight: 42,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border-color, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span>
                Monthly expense change
              </span>

              <input
                name="expenseChange"
                type="number"
                step="0.01"
                defaultValue={expenseChange}
                style={{
                  minHeight: 42,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border-color, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span>
                Forecast horizon
              </span>

              <select
                name="months"
                defaultValue={months}
                style={{
                  minHeight: 42,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border-color, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              >
                {HORIZON_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option} months
                    </option>
                  ),
                )}
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span>
                Historical lookback
              </span>

              <select
                name="lookback"
                defaultValue={lookback}
                style={{
                  minHeight: 42,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border:
                    "1px solid var(--border-color, #d1d5db)",
                  background: "inherit",
                  color: "inherit",
                }}
              >
                {LOOKBACK_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option} months
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <div>
            <button
              type="submit"
              style={{
                minHeight: 42,
                padding: "8px 16px",
                borderRadius: 8,
                border:
                  "1px solid var(--border-color, #d1d5db)",
                cursor: "pointer",
              }}
            >
              Run Simulation
            </button>
          </div>
        </form>
      </section>

      {scenarios.length === 0 ? (
        <section
          style={{
            border:
              "1px solid var(--border-color, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2>
            No simulation available
          </h2>

          <p
            style={{
              marginBottom: 0,
              opacity: 0.75,
            }}
          >
            There is not enough usable historical
            financial data to build this scenario.
          </p>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
          }}
        >
          {scenarios.map((item) => {
            const scenario = item.scenario;

            const chartData =
              scenario.months.map(
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
                  gap: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      marginBottom: 6,
                    }}
                  >
                    {item.currency}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      opacity: 0.75,
                    }}
                  >
                    {lookback}-month historical
                    baseline with a {months}-month
                    scenario horizon.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <small>
                      Baseline monthly net
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 21,
                      }}
                    >
                      {formatMoney(
                        scenario.baselineNet,
                        item.currency,
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <small>
                      Scenario monthly net
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 21,
                      }}
                    >
                      {formatMoney(
                        scenario.scenarioNet,
                        item.currency,
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <small>
                      Monthly net difference
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 21,
                      }}
                    >
                      {formatChange(
                        item.currency,
                        scenario.monthlyNetDifference,
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      border:
                        "1px solid var(--border-color, #e5e7eb)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <small>
                      {months}-month difference
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: 21,
                      }}
                    >
                      {formatChange(
                        item.currency,
                        scenario.cumulativeNetDifference,
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    border:
                      "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: 16,
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
                    <div>
                      <small>
                        Baseline income
                      </small>

                      <div>
                        {formatMoney(
                          scenario.baselineIncome,
                          item.currency,
                        )}
                      </div>
                    </div>

                    <div>
                      <small>
                        Scenario income
                      </small>

                      <div>
                        {formatMoney(
                          scenario.scenarioIncome,
                          item.currency,
                        )}
                      </div>
                    </div>

                    <div>
                      <small>
                        Baseline expenses
                      </small>

                      <div>
                        {formatMoney(
                          scenario.baselineExpenses,
                          item.currency,
                        )}
                      </div>
                    </div>

                    <div>
                      <small>
                        Scenario expenses
                      </small>

                      <div>
                        {formatMoney(
                          scenario.scenarioExpenses,
                          item.currency,
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    border:
                      "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                      marginBottom: 16,
                    }}
                  >
                    Net Difference Visualization
                  </h3>

                  <WhatIfScenarioChart
                    currency={item.currency}
                    data={chartData}
                  />
                </div>

                <div
                  style={{
                    border:
                      "1px solid var(--border-color, #e5e7eb)",
                    borderRadius: 12,
                    padding: 20,
                  }}
                >
                  <h3
                    style={{
                      marginTop: 0,
                    }}
                  >
                    Scenario by Month
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {scenario.months.map(
                      (month) => (
                        <article
                          key={`${item.currency}-${month.monthIndex}`}
                          style={{
                            border:
                              "1px solid var(--border-color, #e5e7eb)",
                            borderRadius: 10,
                            padding: 16,
                          }}
                        >
                          <h4
                            style={{
                              marginTop: 0,
                              marginBottom: 14,
                            }}
                          >
                            {formatMonth(
                              month.monthIndex,
                            )}
                          </h4>

                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                            }}
                          >
                            <div>
                              <small>
                                Income
                              </small>

                              <div>
                                {formatMoney(
                                  month.scenarioIncome,
                                  item.currency,
                                )}
                              </div>
                            </div>

                            <div>
                              <small>
                                Expenses
                              </small>

                              <div>
                                {formatMoney(
                                  month.scenarioExpenses,
                                  item.currency,
                                )}
                              </div>
                            </div>

                            <div>
                              <small>
                                Monthly net
                              </small>

                              <div>
                                {formatMoney(
                                  month.scenarioNet,
                                  item.currency,
                                )}
                              </div>
                            </div>

                            <div>
                              <small>
                                Cumulative net
                              </small>

                              <div>
                                {formatMoney(
                                  month.cumulativeNet,
                                  item.currency,
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </div>

                <Link
                  href={buildUrl(
                    0,
                    0,
                    months,
                    lookback,
                  )}
                >
                  Reset scenario
                </Link>
              </section>
            );
          })}
        </div>
      )}

      <section
        style={{
          marginTop: 32,
          border:
            "1px solid var(--border-color, #e5e7eb)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2>
          Methodology
        </h2>

        <p>
          The baseline monthly income and expenses are
          calculated from the average of the selected
          historical lookback period.
        </p>

        <p>
          The scenario then applies the income and expense
          changes equally to each projected month.
        </p>

        <p>
          Positive income changes increase projected income.
          Negative expense changes reduce projected expenses.
        </p>

        <p
          style={{
            marginBottom: 0,
          }}
        >
          This is a hypothetical planning simulation. It is
          not a prediction or guarantee of future financial
          results.
        </p>
      </section>
    </main>
  );
}
