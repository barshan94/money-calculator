"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const goalTypes = [
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

const currencies = [
  { value: "BDT", label: "BDT — Bangladeshi Taka" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

export default function NewGoalPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("savings");
  const [currency, setCurrency] = useState("BDT");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");

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

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage(
        "Target amount must be greater than zero.",
      );
      return;
    }

    if (targetDate && targetDate < localToday) {
      setMessage(
        "Target date cannot be in the past.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_goal",
      {
        p_name: trimmedName,
        p_goal_type: goalType,
        p_currency: currency,
        p_target_amount: amount,
        p_target_date: targetDate || null,
        p_description: description.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/goals");
    router.refresh();
  }

  return (
    <main className="new-goal-page">
      <style>{`
        .new-goal-page {
          max-width: 760px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .new-goal-header {
          margin-bottom: 22px;
        }

        .new-goal-back {
          display: inline-flex;
          align-items: center;
          margin-bottom: 14px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .new-goal-back:hover {
          color: #0f172a;
        }

        .new-goal-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 5vw, 34px);
          line-height: 1.2;
        }

        .new-goal-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .new-goal-form {
          display: grid;
          gap: 16px;
        }

        .new-goal-section {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
        }

        .new-goal-section-title {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.3;
        }

        .new-goal-section-description {
          margin: 5px 0 16px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .new-goal-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .new-goal-field {
          display: grid;
          gap: 7px;
        }

        .new-goal-field-full {
          grid-column: 1 / -1;
        }

        .new-goal-label {
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .new-goal-input,
        .new-goal-select,
        .new-goal-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #0f172a;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .new-goal-input,
        .new-goal-select {
          min-height: 42px;
          padding: 0 11px;
        }

        .new-goal-textarea {
          min-height: 110px;
          padding: 10px 11px;
          resize: vertical;
          line-height: 1.5;
        }

        .new-goal-input:focus,
        .new-goal-select:focus,
        .new-goal-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .new-goal-input::placeholder,
        .new-goal-textarea::placeholder {
          color: #94a3b8;
        }

        .new-goal-help {
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
        }

        .new-goal-error {
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          padding: 11px 12px;
          color: #991b1b;
          font-size: 13px;
          line-height: 1.5;
        }

        .new-goal-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 9px;
          padding-top: 2px;
        }

        .new-goal-cancel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .new-goal-cancel:hover {
          background: #f8fafc;
        }

        .new-goal-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          min-width: 125px;
          padding: 0 15px;
          border: 1px solid #0f172a;
          border-radius: 8px;
          background: #0f172a;
          color: #fff;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .new-goal-submit:hover:not(:disabled) {
          background: #1e293b;
        }

        .new-goal-submit:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .new-goal-submit:focus-visible,
        .new-goal-cancel:focus-visible,
        .new-goal-back:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        @media (max-width: 600px) {
          .new-goal-page {
            padding: 18px 12px 36px;
          }

          .new-goal-fields {
            grid-template-columns: 1fr;
          }

          .new-goal-field-full {
            grid-column: auto;
          }

          .new-goal-section {
            padding: 15px;
          }
        }

        @media (max-width: 480px) {
          .new-goal-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .new-goal-cancel,
          .new-goal-submit {
            width: 100%;
          }
        }
      `}</style>

      <header className="new-goal-header">
        <Link
          href="/goals"
          className="new-goal-back"
        >
          ← Back to Goals
        </Link>

        <h1>New Goal</h1>

        <p>
          Set a financial target and track your progress
          over time.
        </p>
      </header>

      {message && (
        <div
          className="new-goal-error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {message}
        </div>
      )}

      <form
        className="new-goal-form"
        onSubmit={handleSubmit}
      >
        <section className="new-goal-section">
          <h2 className="new-goal-section-title">
            Goal Details
          </h2>

          <p className="new-goal-section-description">
            Give your goal a clear name and choose what
            you are working toward.
          </p>

          <div className="new-goal-fields">
            <div className="new-goal-field new-goal-field-full">
              <label
                htmlFor="goal-name"
                className="new-goal-label"
              >
                Goal Name
              </label>

              <input
                id="goal-name"
                name="name"
                className="new-goal-input"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Emergency Fund"
                maxLength={150}
                autoComplete="off"
                required
              />

              <span className="new-goal-help">
                Example: Emergency Fund, New Laptop,
                Wedding Savings
              </span>
            </div>

            <div className="new-goal-field">
              <label
                htmlFor="goal-type"
                className="new-goal-label"
              >
                Goal Type
              </label>

              <select
                id="goal-type"
                name="goalType"
                className="new-goal-select"
                value={goalType}
                onChange={(event) =>
                  setGoalType(event.target.value)
                }
              >
                {goalTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="new-goal-field">
              <label
                htmlFor="goal-currency"
                className="new-goal-label"
              >
                Currency
              </label>

              <select
                id="goal-currency"
                name="currency"
                className="new-goal-select"
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value)
                }
              >
                {currencies.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="new-goal-section">
          <h2 className="new-goal-section-title">
            Target
          </h2>

          <p className="new-goal-section-description">
            Define how much you want to reach and, if
            useful, when you want to reach it.
          </p>

          <div className="new-goal-fields">
            <div className="new-goal-field">
              <label
                htmlFor="target-amount"
                className="new-goal-label"
              >
                Target Amount
              </label>

              <input
                id="target-amount"
                name="targetAmount"
                className="new-goal-input"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={targetAmount}
                onChange={(event) =>
                  setTargetAmount(event.target.value)
                }
                placeholder="100000"
                required
              />

              <span className="new-goal-help">
                Enter the total amount required to complete
                this goal.
              </span>
            </div>

            <div className="new-goal-field">
              <label
                htmlFor="target-date"
                className="new-goal-label"
              >
                Target Date
              </label>

              <input
                id="target-date"
                name="targetDate"
                className="new-goal-input"
                type="date"
                min={localToday}
                value={targetDate}
                onChange={(event) =>
                  setTargetDate(event.target.value)
                }
              />

              <span className="new-goal-help">
                Optional. Leave blank if there is no fixed
                deadline.
              </span>
            </div>
          </div>
        </section>

        <section className="new-goal-section">
          <h2 className="new-goal-section-title">
            Notes
          </h2>

          <p className="new-goal-section-description">
            Add any useful context for this goal.
          </p>

          <div className="new-goal-field">
            <label
              htmlFor="goal-description"
              className="new-goal-label"
            >
              Description
            </label>

            <textarea
              id="goal-description"
              name="description"
              className="new-goal-textarea"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Why are you saving for this goal?"
            />
          </div>
        </section>

        <div className="new-goal-actions">
          <Link
            href="/goals"
            className="new-goal-cancel"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="new-goal-submit"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Creating..." : "Create Goal"}
          </button>
        </div>
      </form>
    </main>
  );
}
