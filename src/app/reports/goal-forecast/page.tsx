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

function getProgressPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

export default async function GoalForecastPage() {
  const goals = await getGoalForecasts();

  const completedCount = goals.filter(
    (goal) => goal.forecast.isCompleted,
  ).length;

  const pastDueCount = goals.filter(
    (goal) =>
      !goal.forecast.isCompleted &&
      goal.forecast.isPastDue,
  ).length;

  const activeCount =
    goals.length - completedCount - pastDueCount;

  return (
    <main className="goal-forecast-page">
      <div className="goal-forecast-shell">
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

            <h1>Goal Forecast</h1>

            <p className="page-description">
              See the contribution pace required to reach
              each active goal by its target date.
            </p>
          </div>

          <Link
            href="/goals"
            className="primary-link"
          >
            View Goals
          </Link>
        </header>

        {goals.length > 0 && (
          <div className="summary-grid">
            <article className="summary-card card">
              <span>Goals Forecasted</span>
              <strong>{goals.length}</strong>
            </article>

            <article className="summary-card card">
              <span>On Track / Active</span>
              <strong>{activeCount}</strong>
            </article>

            <article className="summary-card card">
              <span>Completed</span>
              <strong className="positive">
                {completedCount}
              </strong>
            </article>

            <article className="summary-card card">
              <span>Past Due</span>
              <strong
                className={
                  pastDueCount > 0
                    ? "negative"
                    : "neutral"
                }
              >
                {pastDueCount}
              </strong>
            </article>
          </div>
        )}

        {goals.length === 0 ? (
          <section className="empty-state card">
            <div className="empty-icon">◎</div>

            <h2>No forecast available</h2>

            <p>
              There are no active goals with a valid target
              date available for forecasting.
            </p>

            <Link
              href="/goals"
              className="primary-link"
            >
              View Goals
            </Link>
          </section>
        ) : (
          <section className="goal-list">
            {goals.map((goal) => {
              const forecast = goal.forecast;
              const progressPercent =
                getProgressPercent(
                  forecast.progressPercent,
                );

              const status =
                forecast.isCompleted
                  ? "completed"
                  : forecast.isPastDue
                    ? "past-due"
                    : "active";

              return (
                <article
                  key={goal.id}
                  className="goal-card card"
                >
                  <div className="goal-header">
                    <div className="goal-title">
                      <div className="goal-name-row">
                        <h2>{goal.name}</h2>

                        <span
                          className={`status-badge ${status}`}
                        >
                          {forecast.isCompleted
                            ? "Completed"
                            : forecast.isPastDue
                              ? "Past due"
                              : "Active"}
                        </span>
                      </div>

                      <p>
                        {goal.goalType} ·{" "}
                        {goal.currency}
                      </p>
                    </div>

                    <strong className="progress-value">
                      {forecast.progressPercent.toFixed(1)}%
                      <span> complete</span>
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${status}`}
                      style={{
                        width: `${progressPercent}%`,
                      }}
                      role="progressbar"
                      aria-valuenow={progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${goal.name} progress`}
                    />
                  </div>

                  <div className="details-grid">
                    <div className="detail">
                      <span>Current</span>
                      <strong>
                        {formatAmount(
                          goal.currency,
                          goal.currentAmount,
                        )}
                      </strong>
                    </div>

                    <div className="detail">
                      <span>Target</span>
                      <strong>
                        {formatAmount(
                          goal.currency,
                          goal.targetAmount,
                        )}
                      </strong>
                    </div>

                    <div className="detail">
                      <span>Remaining</span>
                      <strong>
                        {formatAmount(
                          goal.currency,
                          forecast.remainingAmount,
                        )}
                      </strong>
                    </div>

                    <div className="detail">
                      <span>Target date</span>
                      <strong>
                        {formatDate(
                          goal.targetDate,
                        )}
                      </strong>
                    </div>

                    <div className="detail">
                      <span>Days remaining</span>
                      <strong>
                        {forecast.daysRemaining}
                      </strong>
                    </div>

                    <div className="detail">
                      <span>Months remaining</span>
                      <strong>
                        {forecast.monthsRemaining}
                      </strong>
                    </div>

                    <div className="detail highlight">
                      <span>
                        Required monthly
                      </span>

                      <strong>
                        {formatContribution(
                          goal.currency,
                          forecast.requiredMonthlyContribution,
                        )}
                      </strong>
                    </div>

                    <div className="detail highlight">
                      <span>
                        Required daily
                      </span>

                      <strong>
                        {formatContribution(
                          goal.currency,
                          forecast.requiredDailyContribution,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    className={`forecast-message ${status}`}
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
                        You need to contribute
                        approximately{" "}
                        <strong>
                          {formatContribution(
                            goal.currency,
                            forecast.requiredMonthlyContribution,
                          )}
                        </strong>{" "}
                        per month to reach the target by
                        the target date.
                      </span>
                    )}
                  </div>

                  <div className="goal-actions">
                    <Link
                      href={`/goals/${goal.id}`}
                      className="secondary-link"
                    >
                      Open Goal →
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="methodology card">
          <h2>Methodology</h2>

          <p>
            The forecast compares the current goal amount
            with the target amount and target date.
          </p>

          <p>
            Required monthly contribution is the remaining
            amount divided by the remaining calendar
            months. Required daily contribution is the
            remaining amount divided by the remaining days.
          </p>

          <p>
            This version does not estimate an achievement
            probability because the current goal model
            stores the current progress snapshot rather
            than a historical contribution series.
          </p>

          <p className="methodology-note">
            These figures are planning estimates, not
            guarantees of future income or investment
            returns.
          </p>
        </section>
      </div>

      <style>{`
        .goal-forecast-page {
          min-height: 100vh;
          padding: 24px 16px 56px;
        }

        .goal-forecast-shell {
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
          font-weight: 600;
          opacity: 0.78;
        }

        .back-link:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .back-link:focus-visible,
        .primary-link:focus-visible,
        .secondary-link:focus-visible {
          outline: 3px solid
            var(--ring, rgba(59, 130, 246, 0.35));
          outline-offset: 3px;
          border-radius: 6px;
        }

        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-top: 20px;
          margin-bottom: 24px;
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

        .page-header h1 {
          margin: 0;
        }

        .page-description {
          max-width: 720px;
          margin: 10px 0 0;
          line-height: 1.6;
          opacity: 0.74;
        }

        .primary-link {
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
          white-space: nowrap;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .summary-card {
          min-width: 0;
          padding: 16px;
        }

        .summary-card span {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
          opacity: 0.68;
        }

        .summary-card strong {
          font-size: 21px;
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

        .goal-list {
          display: grid;
          gap: 18px;
        }

        .goal-card {
          min-width: 0;
          padding: 20px;
        }

        .goal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .goal-title {
          min-width: 0;
        }

        .goal-name-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
        }

        .goal-name-row h2 {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .goal-title p {
          margin: 6px 0 0;
          font-size: 14px;
          opacity: 0.68;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-badge.active {
          background: var(
            --surface-muted,
            #f3f4f6
          );
        }

        .status-badge.completed {
          color: var(--success, #16803c);
          background: var(
            --success-background,
            #ecfdf3
          );
        }

        .status-badge.past-due {
          color: var(--destructive, #c62828);
          background: var(
            --destructive-background,
            #fef2f2
          );
        }

        .progress-value {
          flex-shrink: 0;
          font-size: 18px;
          text-align: right;
        }

        .progress-value span {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.62;
        }

        .progress-track {
          width: 100%;
          height: 10px;
          overflow: hidden;
          margin-bottom: 20px;
          border-radius: 999px;
          background: var(
            --surface-muted,
            #e5e7eb
          );
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--primary, #111827);
        }

        .progress-fill.completed {
          background: var(--success, #16803c);
        }

        .progress-fill.past-due {
          background: var(--destructive, #c62828);
        }

        .details-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 1px;
          overflow: hidden;
          border: 1px solid var(--border, #ddd);
          border-radius: 10px;
          background: var(--border, #ddd);
        }

        .detail {
          min-width: 0;
          padding: 13px;
          background: var(--card, white);
        }

        .detail span {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          line-height: 1.4;
          opacity: 0.62;
        }

        .detail strong {
          display: block;
          overflow-wrap: anywhere;
          line-height: 1.4;
        }

        .detail.highlight {
          background: var(
            --surface-muted,
            #f8f9fa
          );
        }

        .forecast-message {
          margin-top: 18px;
          padding: 13px 14px;
          border-radius: 9px;
          line-height: 1.55;
          font-size: 14px;
        }

        .forecast-message.active {
          background: var(
            --surface-muted,
            #f3f4f6
          );
        }

        .forecast-message.completed {
          color: var(--success, #16803c);
          background: var(
            --success-background,
            #ecfdf3
          );
        }

        .forecast-message.past-due {
          color: var(--destructive, #c62828);
          background: var(
            --destructive-background,
            #fef2f2
          );
        }

        .goal-actions {
          margin-top: 16px;
        }

        .secondary-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          color: inherit;
          font-weight: 600;
          text-decoration: none;
        }

        .secondary-link:hover {
          text-decoration: underline;
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

        .methodology {
          margin-top: 32px;
          padding: 20px;
          line-height: 1.6;
        }

        .methodology h2 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 18px;
        }

        .methodology p {
          margin: 0 0 10px;
        }

        .methodology-note {
          margin-bottom: 0 !important;
          opacity: 0.68;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .details-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .goal-forecast-page {
            padding: 18px 12px 40px;
          }

          .page-header {
            align-items: stretch;
            flex-direction: column;
            margin-top: 14px;
          }

          .page-header h1 {
            font-size: 28px;
            line-height: 1.2;
          }

          .page-description {
            font-size: 14px;
          }

          .primary-link {
            width: 100%;
          }

          .summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .summary-card {
            padding: 14px;
          }

          .summary-card strong {
            font-size: 19px;
          }

          .goal-list {
            gap: 14px;
          }

          .goal-card {
            padding: 15px;
          }

          .goal-header {
            flex-direction: column;
            gap: 10px;
          }

          .progress-value {
            text-align: left;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .detail {
            padding: 12px;
          }

          .methodology {
            padding: 15px;
          }

          .empty-state .primary-link {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .goal-forecast-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .page-header h1 {
            font-size: 25px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .goal-name-row h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}

