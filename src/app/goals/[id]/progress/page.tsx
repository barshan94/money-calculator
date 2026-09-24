"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Goal = {
  id: string;
  name: string;
  currency: string;
  target_amount: number;
  current_amount: number;
  status:
    | "active"
    | "completed"
    | "cancelled";
};

function formatMoney(
  amount: number,
  currency: string,
) {
  return `${currency} ${amount.toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

export default function GoalProgressPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const router = useRouter();
  const params = useParams();

  const goalId = params.id as string;

  const [goal, setGoal] =
    useState<Goal | null>(null);
  const [amount, setAmount] = useState("");

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadGoal() {
      const { data, error } =
        await supabase
          .from("goals")
          .select(
            "id, name, currency, target_amount, current_amount, status",
          )
          .eq("id", goalId)
          .single();

      if (error || !data) {
        setMessage(
          error?.message ||
            "Goal could not be found.",
        );
        setLoading(false);
        return;
      }

      setGoal({
        ...data,
        target_amount: Number(
          data.target_amount,
        ),
        current_amount: Number(
          data.current_amount,
        ),
      });

      setAmount(
        String(data.current_amount),
      );
      setLoading(false);
    }

    loadGoal();
  }, [goalId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!goal || saving) return;

    setMessage("");

    const currentAmount = Number(amount);

    if (
      !Number.isFinite(currentAmount) ||
      currentAmount < 0
    ) {
      setMessage(
        "Current amount cannot be negative.",
      );
      return;
    }

    if (
      currentAmount > goal.target_amount
    ) {
      setMessage(
        "Current amount cannot exceed the target.",
      );
      return;
    }

    setSaving(true);

    const { error } =
      await supabase.rpc(
        "update_goal_progress",
        {
          p_goal_id: goalId,
          p_current_amount:
            currentAmount,
        },
      );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/goals/${goalId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="progress-page">
        <div className="progress-container">
          <div className="skeleton skeleton-small" />
          <div className="skeleton skeleton-title" />

          <section className="card loading-card">
            <p>Loading goal...</p>
          </section>
        </div>

        <style>{`
          .progress-page {
            min-height: 100%;
            padding: 24px;
          }

          .progress-container {
            max-width: 680px;
            margin: 0 auto;
          }

          .skeleton {
            border-radius: 8px;
            background: #e5e7eb;
            animation: pulse 1.5s ease-in-out infinite;
          }

          .skeleton-small {
            width: 120px;
            height: 18px;
            margin-bottom: 20px;
          }

          .skeleton-title {
            width: 280px;
            height: 32px;
            margin-bottom: 24px;
          }

          .loading-card {
            padding: 24px;
          }

          @keyframes pulse {
            50% {
              opacity: 0.5;
            }
          }

          @media (max-width: 600px) {
            .progress-page {
              padding: 16px;
            }
          }
        `}</style>
      </main>
    );
  }

  if (!goal) {
    return (
      <main className="progress-page">
        <div className="progress-container">
          <Link
            href="/goals"
            className="back-link"
          >
            ← Back to Goals
          </Link>

          <section className="card state-card">
            <div className="state-icon">!</div>

            <h1>Goal Not Found</h1>

            <p>
              {message ||
                "The requested goal could not be found."}
            </p>

            <Link
              href="/goals"
              className="secondary-button"
            >
              Return to Goals
            </Link>
          </section>
        </div>

        <style>{`
          .progress-page {
            min-height: 100%;
            padding: 24px;
          }

          .progress-container {
            max-width: 680px;
            margin: 0 auto;
          }

          .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: inherit;
            text-decoration: none;
          }

          .back-link:hover {
            text-decoration: underline;
          }

          .card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            background: white;
          }

          .state-card {
            padding: 32px;
            text-align: center;
          }

          .state-icon {
            width: 42px;
            height: 42px;
            margin: 0 auto 16px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            background: #fef2f2;
            color: #b91c1c;
            font-weight: 700;
          }

          .state-card h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          .state-card p {
            margin: 0 auto 20px;
            max-width: 520px;
            line-height: 1.6;
          }

          .secondary-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 16px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            color: inherit;
            text-decoration: none;
            font-weight: 600;
          }

          .secondary-button:hover {
            background: #f9fafb;
          }

          @media (max-width: 600px) {
            .progress-page {
              padding: 16px;
            }

            .state-card {
              padding: 24px 18px;
            }
          }
        `}</style>
      </main>
    );
  }

  if (goal.status !== "active") {
    return (
      <main className="progress-page">
        <div className="progress-container">
          <Link
            href={`/goals/${goalId}`}
            className="back-link"
          >
            ← Back to Goal
          </Link>

          <section className="card state-card">
            <div className="state-icon">✓</div>

            <h1>Goal Is Not Active</h1>

            <p>
              This goal is already{" "}
              <strong>{goal.status}</strong> and
              its progress cannot be updated.
            </p>

            <Link
              href={`/goals/${goalId}`}
              className="secondary-button"
            >
              View Goal
            </Link>
          </section>
        </div>

        <style>{`
          .progress-page {
            min-height: 100%;
            padding: 24px;
          }

          .progress-container {
            max-width: 680px;
            margin: 0 auto;
          }

          .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: inherit;
            text-decoration: none;
          }

          .back-link:hover {
            text-decoration: underline;
          }

          .card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            background: white;
          }

          .state-card {
            padding: 32px;
            text-align: center;
          }

          .state-icon {
            width: 42px;
            height: 42px;
            margin: 0 auto 16px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            background: #f0fdf4;
            color: #15803d;
            font-weight: 700;
          }

          .state-card h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          .state-card p {
            margin: 0 auto 20px;
            max-width: 520px;
            line-height: 1.6;
          }

          .secondary-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 16px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            color: inherit;
            text-decoration: none;
            font-weight: 600;
          }

          .secondary-button:hover {
            background: #f9fafb;
          }

          @media (max-width: 600px) {
            .progress-page {
              padding: 16px;
            }

            .state-card {
              padding: 24px 18px;
            }
          }
        `}</style>
      </main>
    );
  }

  const target = goal.target_amount;
  const current = Number(amount) || 0;
  const remaining = Math.max(
    target - current,
    0,
  );
  const percentage =
    target > 0
      ? Math.min(
          (current / target) * 100,
          100,
        )
      : 0;

  return (
    <main className="progress-page">
      <div className="progress-container">
        <Link
          href={`/goals/${goalId}`}
          className="back-link"
        >
          ← Back to Goal
        </Link>

        <header className="page-header">
          <p className="eyebrow">
            Goal Progress
          </p>

          <h1>Update Progress</h1>

          <p className="subtitle">
            {goal.name}
          </p>
        </header>

        <section className="card summary-card">
          <div className="summary-top">
            <div>
              <span className="summary-label">
                Target
              </span>

              <strong>
                {formatMoney(
                  target,
                  goal.currency,
                )}
              </strong>
            </div>

            <div className="percentage">
              {percentage.toFixed(1)}%
            </div>
          </div>

          <div
            className="progress-track"
            aria-label={`${percentage.toFixed(
              1,
            )}% complete`}
          >
            <div
              className="progress-fill"
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <div className="summary-bottom">
            <span>
              Current:{" "}
              {formatMoney(
                current,
                goal.currency,
              )}
            </span>

            <span>
              Remaining:{" "}
              {formatMoney(
                remaining,
                goal.currency,
              )}
            </span>
          </div>
        </section>

        {message && (
          <div
            className="message"
            role="alert"
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="card progress-form"
        >
          <div className="section-heading">
            <h2>Current Amount</h2>

            <p>
              Enter the total amount currently
              accumulated toward this goal.
            </p>
          </div>

          <div className="field">
            <label htmlFor="current-amount">
              Current Amount
            </label>

            <div className="amount-input">
              <span>{goal.currency}</span>

              <input
                id="current-amount"
                type="number"
                min="0"
                max={goal.target_amount}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                required
              />
            </div>

            <span className="help">
              Maximum:{" "}
              {formatMoney(
                goal.target_amount,
                goal.currency,
              )}
            </span>
          </div>

          <div className="form-actions">
            <Link
              href={`/goals/${goalId}`}
              className="cancel-button"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="save-button"
              disabled={saving}
              aria-busy={saving}
            >
              {saving
                ? "Saving..."
                : "Update Progress"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .progress-page {
          min-height: 100%;
          padding: 24px;
        }

        .progress-container {
          max-width: 680px;
          margin: 0 auto;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: inherit;
          text-decoration: none;
          font-weight: 500;
        }

        .back-link:hover {
          text-decoration: underline;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .eyebrow {
          margin: 0 0 6px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          opacity: 0.65;
        }

        .page-header h1 {
          margin: 0 0 8px;
          font-size: 32px;
          line-height: 1.2;
        }

        .subtitle {
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
          opacity: 0.7;
        }

        .card {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: white;
        }

        .summary-card {
          padding: 20px;
          margin-bottom: 18px;
        }

        .summary-top,
        .summary-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .summary-top {
          margin-bottom: 16px;
        }

        .summary-label {
          display: block;
          margin-bottom: 5px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          opacity: 0.6;
        }

        .summary-top strong {
          font-size: 20px;
        }

        .percentage {
          font-size: 22px;
          font-weight: 750;
        }

        .progress-track {
          width: 100%;
          height: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: #e5e7eb;
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #111827;
          transition: width 180ms ease;
        }

        .summary-bottom {
          margin-top: 12px;
          font-size: 13px;
          opacity: 0.7;
        }

        .message {
          margin-bottom: 18px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fef2f2;
          color: #991b1b;
          line-height: 1.5;
        }

        .progress-form {
          padding: 22px;
        }

        .section-heading {
          margin-bottom: 20px;
        }

        .section-heading h2 {
          margin: 0 0 5px;
          font-size: 19px;
        }

        .section-heading p {
          margin: 0;
          line-height: 1.5;
          font-size: 14px;
          opacity: 0.65;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          font-size: 14px;
          font-weight: 650;
        }

        .amount-input {
          display: flex;
          align-items: center;
          min-height: 46px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          overflow: hidden;
        }

        .amount-input:focus-within {
          border-color: currentColor;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
        }

        .amount-input span {
          padding: 0 12px;
          font-weight: 650;
          opacity: 0.65;
        }

        .amount-input input {
          flex: 1;
          min-width: 0;
          height: 44px;
          border: 0;
          outline: 0;
          padding: 0 12px 0 0;
          background: transparent;
          color: inherit;
          font: inherit;
        }

        .help {
          font-size: 12px;
          opacity: 0.6;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
        }

        .cancel-button,
        .save-button {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 10px;
          font: inherit;
          font-weight: 650;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          cursor: pointer;
        }

        .cancel-button {
          border: 1px solid #d1d5db;
          color: inherit;
          background: white;
        }

        .cancel-button:hover {
          background: #f9fafb;
        }

        .save-button {
          border: 1px solid transparent;
          background: #111827;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .save-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .cancel-button:focus-visible,
        .save-button:focus-visible,
        .back-link:focus-visible {
          outline: 3px solid rgba(59, 130, 246, 0.35);
          outline-offset: 2px;
        }

        @media (max-width: 600px) {
          .progress-page {
            padding: 16px;
          }

          .page-header h1 {
            font-size: 27px;
          }

          .summary-card,
          .progress-form {
            padding: 18px;
          }

          .summary-bottom {
            align-items: flex-start;
            flex-direction: column;
            gap: 5px;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .cancel-button,
          .save-button {
            width: 100%;
          }
        }

        @media (max-width: 420px) {
          .progress-page {
            padding: 12px;
          }

          .summary-card,
          .progress-form {
            padding: 15px;
          }

          .summary-top {
            align-items: flex-start;
            flex-direction: column;
          }

          .percentage {
            font-size: 20px;
          }
        }
      `}</style>
    </main>
  );
}

