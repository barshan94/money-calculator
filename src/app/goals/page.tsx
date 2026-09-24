import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDateInfo(date: string | null) {
  if (!date) {
    return {
      label: "No target date",
      className: "goal-date-neutral",
    };
  }

  const target = new Date(`${date}T00:00:00`);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(target.getTime())) {
    return {
      label: "Target date unavailable",
      className: "goal-date-neutral",
    };
  }

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    const days = Math.abs(diffDays);

    return {
      label: `${days} day${days === 1 ? "" : "s"} overdue`,
      className: "goal-date-overdue",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      className: "goal-date-today",
    };
  }

  if (diffDays === 1) {
    return {
      label: "1 day remaining",
      className: "goal-date-soon",
    };
  }

  if (diffDays <= 30) {
    return {
      label: `${diffDays} days remaining`,
      className: "goal-date-soon",
    };
  }

  return {
    label: `${Math.ceil(diffDays / 30)} month${
      Math.ceil(diffDays / 30) === 1 ? "" : "s"
    } remaining`,
    className: "goal-date-neutral",
  };
}

function formatGoalType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function GoalsPage() {
  const supabase = await createClient();

  const { data: goals, error } = await supabase
    .from("goals")
    .select(
      "id, name, goal_type, currency, target_amount, current_amount, target_date, status",
    )
    .eq("status", "active")
    .order("target_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const items = goals ?? [];

  const totalGoals = items.length;

  const completedGoals = items.filter((goal) => {
    const target = Number(goal.target_amount);
    const current = Number(goal.current_amount);

    return target > 0 && current >= target;
  }).length;

  const dueSoonGoals = items.filter((goal) => {
    if (!goal.target_date) {
      return false;
    }

    const target = new Date(`${goal.target_date}T00:00:00`);
    const today = new Date();

    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (target.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return diffDays >= 0 && diffDays <= 30;
  }).length;

  return (
    <main className="goals-page">
      <style>{`
        .goals-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .goals-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .goals-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 5vw, 34px);
          line-height: 1.2;
        }

        .goals-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .goals-primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid #0f172a;
          border-radius: 8px;
          background: #0f172a;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        .goals-primary-button:hover {
          background: #1e293b;
        }

        .goals-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }

        .goals-summary-card {
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #fff;
          padding: 15px 16px;
        }

        .goals-summary-label {
          margin-bottom: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .goals-summary-value {
          color: #0f172a;
          font-size: 22px;
          font-weight: 700;
        }

        .goals-summary-note {
          margin-top: 4px;
          color: #94a3b8;
          font-size: 11px;
        }

        .goals-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(min(100%, 330px), 1fr));
          gap: 16px;
        }

        .goal-card {
          display: flex;
          flex-direction: column;
          min-width: 0;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
          color: inherit;
          text-decoration: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            transform 0.15s ease;
        }

        .goal-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
          transform: translateY(-1px);
        }

        .goal-card:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        .goal-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .goal-card-title {
          min-width: 0;
        }

        .goal-card-title h2 {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .goal-type {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-top: 7px;
          padding: 3px 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 10px;
          font-weight: 700;
        }

        .goal-percentage {
          flex-shrink: 0;
          color: #0f172a;
          font-size: 17px;
          font-weight: 700;
        }

        .goal-amounts {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-top: 20px;
        }

        .goal-current {
          color: #0f172a;
          font-size: 20px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .goal-target {
          color: #64748b;
          font-size: 12px;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .goal-progress-track {
          width: 100%;
          height: 9px;
          margin-top: 10px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .goal-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #2563eb;
          transition: width 0.2s ease;
        }

        .goal-progress-complete {
          background: #16a34a;
        }

        .goal-meta {
          display: grid;
          gap: 8px;
          margin-top: 17px;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
        }

        .goal-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .goal-meta-label {
          color: #64748b;
          font-size: 12px;
        }

        .goal-meta-value {
          min-width: 0;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .goal-date {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .goal-date-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .goal-date-soon {
          background: #fff7ed;
          color: #9a3412;
        }

        .goal-date-today {
          background: #fef2f2;
          color: #991b1b;
        }

        .goal-date-overdue {
          background: #fef2f2;
          color: #991b1b;
        }

        .goal-remaining {
          color: #64748b;
          font-size: 12px;
        }

        .goals-empty {
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          padding: 48px 20px;
          text-align: center;
        }

        .goals-empty h2 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 20px;
        }

        .goals-empty p {
          max-width: 520px;
          margin: 0 auto 18px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 760px) {
          .goals-header {
            flex-direction: column;
          }

          .goals-primary-button {
            width: 100%;
          }

          .goals-summary {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 500px) {
          .goals-page {
            padding: 18px 12px 36px;
          }

          .goals-summary {
            grid-template-columns: 1fr;
          }

          .goal-card {
            padding: 15px;
          }

          .goal-card-header {
            flex-direction: column;
          }

          .goal-percentage {
            font-size: 16px;
          }

          .goal-amounts {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .goal-target {
            text-align: left;
          }
        }
      `}</style>

      <header className="goals-header">
        <div>
          <h1>Goals</h1>
          <p>
            Track your savings targets and financial
            milestones.
          </p>
        </div>

        <Link
          href="/goals/new"
          className="goals-primary-button"
        >
          + New Goal
        </Link>
      </header>

      {items.length > 0 && (
        <section
          className="goals-summary"
          aria-label="Goals summary"
        >
          <div className="goals-summary-card">
            <div className="goals-summary-label">
              Active Goals
            </div>
            <div className="goals-summary-value">
              {totalGoals}
            </div>
            <div className="goals-summary-note">
              Currently tracking
            </div>
          </div>

          <div className="goals-summary-card">
            <div className="goals-summary-label">
              Near Deadline
            </div>
            <div className="goals-summary-value">
              {dueSoonGoals}
            </div>
            <div className="goals-summary-note">
              Due within 30 days
            </div>
          </div>

          <div className="goals-summary-card">
            <div className="goals-summary-label">
              Target Reached
            </div>
            <div className="goals-summary-value">
              {completedGoals}
            </div>
            <div className="goals-summary-note">
              Current amount meets target
            </div>
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div className="goals-empty">
          <h2>No active goals</h2>

          <p>
            Create a goal to track savings targets,
            purchases, investments, or other financial
            milestones.
          </p>

          <Link
            href="/goals/new"
            className="goals-primary-button"
          >
            Create your first goal
          </Link>
        </div>
      ) : (
        <section className="goals-grid">
          {items.map((goal) => {
            const target = Number(goal.target_amount);
            const current = Number(goal.current_amount);

            const percentage =
              target > 0
                ? Math.min(
                    Math.max((current / target) * 100, 0),
                    100,
                  )
                : 0;

            const remaining = Math.max(
              target - current,
              0,
            );

            const dateInfo = getDateInfo(
              goal.target_date,
            );

            const isComplete =
              target > 0 && current >= target;

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="goal-card"
              >
                <div className="goal-card-header">
                  <div className="goal-card-title">
                    <h2>{goal.name}</h2>

                    <span className="goal-type">
                      {formatGoalType(goal.goal_type)}
                    </span>
                  </div>

                  <strong className="goal-percentage">
                    {percentage.toFixed(1)}%
                  </strong>
                </div>

                <div className="goal-amounts">
                  <div className="goal-current">
                    {formatMoney(current, goal.currency)}
                  </div>

                  <div className="goal-target">
                    of{" "}
                    {formatMoney(
                      target,
                      goal.currency,
                    )}
                  </div>
                </div>

                <div
                  className="goal-progress-track"
                  aria-label={`${percentage.toFixed(
                    1,
                  )}% complete`}
                >
                  <div
                    className={`goal-progress-fill ${
                      isComplete
                        ? "goal-progress-complete"
                        : ""
                    }`}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <div className="goal-meta">
                  <div className="goal-meta-row">
                    <span className="goal-meta-label">
                      Remaining
                    </span>

                    <span className="goal-meta-value">
                      {isComplete
                        ? "Target reached"
                        : formatMoney(
                            remaining,
                            goal.currency,
                          )}
                    </span>
                  </div>

                  <div className="goal-meta-row">
                    <span className="goal-meta-label">
                      Target date
                    </span>

                    <span className="goal-meta-value">
                      {goal.target_date
                        ? formatDate(
                            goal.target_date,
                          )
                        : "No target date"}
                    </span>
                  </div>

                  <div className="goal-meta-row">
                    <span className="goal-meta-label">
                      Schedule
                    </span>

                    <span
                      className={`goal-date ${dateInfo.className}`}
                    >
                      {dateInfo.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

