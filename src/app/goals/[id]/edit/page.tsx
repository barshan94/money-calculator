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

const GOAL_TYPES = [
  { value: "savings", label: "Savings" },
  {
    value: "emergency_fund",
    label: "Emergency Fund",
  },
  { value: "donation", label: "Donation" },
  {
    value: "investment",
    label: "Investment",
  },
  {
    value: "debt_repayment",
    label: "Debt Repayment",
  },
  { value: "other", label: "Other" },
];

function getLocalToday() {
  const date = new Date();
  const offset =
    date.getTimezoneOffset() * 60 * 1000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .split("T")[0];
}

export default function EditGoalPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const router = useRouter();
  const params = useParams();

  const goalId = params.id as string;

  const [name, setName] = useState("");
  const [goalType, setGoalType] =
    useState("savings");
  const [targetAmount, setTargetAmount] =
    useState("");
  const [targetDate, setTargetDate] =
    useState("");
  const [description, setDescription] =
    useState("");

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
            "name, goal_type, target_amount, target_date, description, status",
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

      if (data.status !== "active") {
        setMessage(
          "This goal is no longer active and cannot be edited.",
        );
        setLoading(false);
        return;
      }

      setName(data.name);
      setGoalType(data.goal_type);
      setTargetAmount(
        String(data.target_amount),
      );
      setTargetDate(
        data.target_date ?? "",
      );
      setDescription(
        data.description ?? "",
      );

      setLoading(false);
    }

    loadGoal();
  }, [goalId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = name.trim();
    const amount = Number(targetAmount);

    if (!trimmedName) {
      setMessage("Goal name is required.");
      return;
    }

    if (trimmedName.length > 150) {
      setMessage(
        "Goal name must be 150 characters or fewer.",
      );
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessage(
        "Target amount must be greater than zero.",
      );
      return;
    }

    if (
      targetDate &&
      targetDate < getLocalToday()
    ) {
      setMessage(
        "Target date cannot be in the past.",
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } =
      await supabase.rpc("update_goal", {
        p_goal_id: goalId,
        p_name: trimmedName,
        p_goal_type: goalType,
        p_target_amount: amount,
        p_target_date:
          targetDate || null,
        p_description:
          description.trim() || null,
      });

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
      <main className="goal-edit-page">
        <div className="goal-edit-container">
          <div className="page-header">
            <div>
              <div className="skeleton skeleton-small" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
            </div>
          </div>

          <section className="card loading-card">
            <p>Loading goal...</p>
          </section>
        </div>

        <style>{`
          .goal-edit-page {
            min-height: 100%;
            padding: 24px;
          }

          .goal-edit-container {
            max-width: 760px;
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
            margin-bottom: 16px;
          }

          .skeleton-title {
            width: 240px;
            height: 32px;
            margin-bottom: 10px;
          }

          .skeleton-text {
            width: 320px;
            height: 18px;
          }

          .loading-card {
            margin-top: 24px;
            padding: 24px;
          }

          @keyframes pulse {
            50% {
              opacity: 0.5;
            }
          }

          @media (max-width: 600px) {
            .goal-edit-page {
              padding: 16px;
            }
          }
        `}</style>
      </main>
    );
  }

  if (message && !name) {
    return (
      <main className="goal-edit-page">
        <div className="goal-edit-container">
          <Link
            href="/goals"
            className="back-link"
          >
            ← Back to Goals
          </Link>

          <section className="card error-card">
            <div className="status-icon">!</div>

            <h1>Unable to Edit Goal</h1>

            <p>{message}</p>

            <Link
              href="/goals"
              className="secondary-button"
            >
              Return to Goals
            </Link>
          </section>
        </div>

        <style>{`
          .goal-edit-page {
            min-height: 100%;
            padding: 24px;
          }

          .goal-edit-container {
            max-width: 760px;
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

          .error-card {
            padding: 32px;
            text-align: center;
          }

          .status-icon {
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

          .error-card h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          .error-card p {
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
            .goal-edit-page {
              padding: 16px;
            }

            .error-card {
              padding: 24px 18px;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="goal-edit-page">
      <div className="goal-edit-container">
        <Link
          href={`/goals/${goalId}`}
          className="back-link"
        >
          ← Back to Goal
        </Link>

        <header className="page-header">
          <div>
            <p className="eyebrow">
              Goal Management
            </p>

            <h1>Edit Goal</h1>

            <p className="subtitle">
              Update the target and details of
              your active goal.
            </p>
          </div>
        </header>

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
          className="goal-form"
        >
          <section className="form-section">
            <div className="section-heading">
              <h2>Goal Details</h2>
              <p>
                Keep the goal name and purpose
                easy to recognize.
              </p>
            </div>

            <div className="field">
              <label htmlFor="goal-name">
                Goal Name
              </label>

              <input
                id="goal-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                maxLength={150}
                required
              />

              <span className="help">
                Maximum 150 characters.
              </span>
            </div>

            <div className="field">
              <label htmlFor="goal-type">
                Goal Type
              </label>

              <select
                id="goal-type"
                name="goalType"
                value={goalType}
                onChange={(event) =>
                  setGoalType(
                    event.target.value,
                  )
                }
              >
                {GOAL_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <h2>Target</h2>
              <p>
                Adjust how much you want to
                achieve and by when.
              </p>
            </div>

            <div className="field">
              <label htmlFor="target-amount">
                Target Amount
              </label>

              <input
                id="target-amount"
                name="targetAmount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={targetAmount}
                onChange={(event) =>
                  setTargetAmount(
                    event.target.value,
                  )
                }
                required
              />
            </div>

            <div className="field">
              <label htmlFor="target-date">
                Target Date
              </label>

              <input
                id="target-date"
                name="targetDate"
                type="date"
                min={getLocalToday()}
                value={targetDate}
                onChange={(event) =>
                  setTargetDate(
                    event.target.value,
                  )
                }
              />

              <span className="help">
                Leave empty if the goal has no
                deadline.
              </span>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <h2>Notes</h2>
              <p>
                Add optional information that
                helps explain the goal.
              </p>
            </div>

            <div className="field">
              <label htmlFor="goal-description">
                Description
              </label>

              <textarea
                id="goal-description"
                name="description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                rows={5}
                maxLength={1000}
                placeholder="Add a note about this goal..."
              />

              <span className="help">
                Optional. Maximum 1,000 characters.
              </span>
            </div>
          </section>

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
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .goal-edit-page {
          min-height: 100%;
          padding: 24px;
        }

        .goal-edit-container {
          max-width: 760px;
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
          line-height: 1.6;
          opacity: 0.7;
        }

        .message {
          margin-bottom: 20px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fef2f2;
          color: #991b1b;
          line-height: 1.5;
        }

        .goal-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .form-section {
          padding: 22px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: white;
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
          margin-top: 18px;
        }

        .field:first-of-type {
          margin-top: 0;
        }

        .field label {
          font-size: 14px;
          font-weight: 650;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: white;
          color: inherit;
          font: inherit;
          padding: 11px 12px;
          outline: none;
        }

        .field input,
        .field select {
          min-height: 44px;
        }

        .field textarea {
          resize: vertical;
          min-height: 120px;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: currentColor;
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.08);
        }

        .help {
          font-size: 12px;
          line-height: 1.4;
          opacity: 0.6;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-bottom: 12px;
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
          .goal-edit-page {
            padding: 16px;
          }

          .page-header h1 {
            font-size: 27px;
          }

          .form-section {
            padding: 18px;
            border-radius: 14px;
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
          .goal-edit-page {
            padding: 12px;
          }

          .form-section {
            padding: 15px;
          }
        }
      `}</style>
    </main>
  );
}
