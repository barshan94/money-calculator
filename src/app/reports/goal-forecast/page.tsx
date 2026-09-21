import Link from "next/link";
import { formatMoney } from "@/lib/finance/format-money";
import { getGoalForecasts } from "@/lib/intelligence/get-goal-forecasts";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(
    "en-BD",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function formatAmount(
  currency: string,
  amount: number,
) {
  return formatMoney(amount, currency);
}

function formatContribution(
  currency: string,
  amount: number | null,
) {
  if (amount === null) {
    return "Not applicable";
  }

  return formatAmount(currency, amount);
}

export default async function GoalForecastPage() {
  const goals = await getGoalForecasts();

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1>Goal Forecast</h1>

          <p style={{ opacity: 0.75 }}>
            See the contribution pace required to reach
            each active goal by its target date.
          </p>
        </div>

        <Link href="/goals">
          View Goals
        </Link>
      </div>

      {goals.length === 0 ? (
        <section
          style={{
            border: "1px solid var(--border-color, #e5e7eb)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2>No forecast available</h2>

          <p style={{ opacity: 0.75 }}>
            There are no active goals with a valid target
            date available for forecasting.
          </p>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          {goals.map((goal) => {
            const forecast = goal.forecast;

            return (
              <article
                key={goal.id}
                style={{
                  border:
                    "1px solid var(--border-color, #e5e7eb)",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        marginTop: 0,
                        marginBottom: 6,
                      }}
                    >
                      {goal.name}
                    </h2>

                    <p
                      style={{
                        marginTop: 0,
                        opacity: 0.7,
                      }}
                    >
                      {goal.goalType} · {goal.currency}
                    </p>
                  </div>

                  <strong>
                    {forecast.progressPercent.toFixed(1)}%
                    {" "}complete
                  </strong>
                </div>

                <progress
                  value={forecast.progressPercent}
                  max="100"
                  style={{
                    width: "100%",
                    height: 10,
                    marginBottom: 20,
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div>
                    <small>Current</small>
                    <div>
                      {formatAmount(
                        goal.currency,
                        goal.currentAmount,
                      )}
                    </div>
                  </div>

                  <div>
                    <small>Target</small>
                    <div>
                      {formatAmount(
                        goal.currency,
                        goal.targetAmount,
                      )}
                    </div>
                  </div>

                  <div>
                    <small>Remaining</small>
                    <div>
                      {formatAmount(
                        goal.currency,
                        forecast.remainingAmount,
                      )}
                    </div>
                  </div>

                  <div>
                    <small>Target date</small>
                    <div>
                      {formatDate(goal.targetDate)}
                    </div>
                  </div>

                  <div>
                    <small>Days remaining</small>
                    <div>
                      {forecast.daysRemaining}
                    </div>
                  </div>

                  <div>
                    <small>Months remaining</small>
                    <div>
                      {forecast.monthsRemaining}
                    </div>
                  </div>

                  <div>
                    <small>Required monthly</small>
                    <div>
                      {formatContribution(
                        goal.currency,
                        forecast.requiredMonthlyContribution,
                      )}
                    </div>
                  </div>

                  <div>
                    <small>Required daily</small>
                    <div>
                      {formatContribution(
                        goal.currency,
                        forecast.requiredDailyContribution,
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    padding: 12,
                    borderRadius: 8,
                    background:
                      "var(--muted-background, #f5f5f5)",
                  }}
                >
                  {forecast.isCompleted ? (
                    <strong>
                      Goal completed.
                    </strong>
                  ) : forecast.isPastDue ? (
                    <strong>
                      Goal is past its target date.
                    </strong>
                  ) : (
                    <span>
                      You need to contribute approximately{" "}
                      <strong>
                        {formatContribution(
                          goal.currency,
                          forecast.requiredMonthlyContribution,
                        )}
                      </strong>{" "}
                      per month to reach the target by the
                      target date.
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 16 }}>
                  <Link href={`/goals/${goal.id}`}>
                    Open goal
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
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
        <h2>Methodology</h2>

        <p>
          The forecast compares the current goal amount
          with the target amount and target date.
        </p>

        <p>
          Required monthly contribution is the remaining
          amount divided by the remaining calendar months.
          Required daily contribution is the remaining
          amount divided by the remaining days.
        </p>

        <p>
          This version does not estimate an achievement
          probability because the current goal model stores
          the current progress snapshot rather than a
          historical contribution series.
        </p>

        <p style={{ marginBottom: 0 }}>
          These figures are planning estimates, not
          guarantees of future income or investment returns.
        </p>
      </section>
    </main>
  );
}

