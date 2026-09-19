"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const amount = Number(targetAmount);

    if (!name.trim()) {
      setMessage("Goal name is required.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage(
        "Target amount must be greater than zero.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_goal",
      {
        p_name: name.trim(),
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
    <main>
      <h1>New Goal</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="goal-name">
            Goal Name
          </label>

          <input
            id="goal-name"
            name="name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Emergency Fund"
            required
          />
        </div>

        <div>
          <label htmlFor="goal-type">
            Goal Type
          </label>

          <select
            id="goal-type"
            name="goalType"
            value={goalType}
            onChange={(e) =>
              setGoalType(e.target.value)
            }
          >
            <option value="savings">
              Savings
            </option>

            <option value="emergency_fund">
              Emergency Fund
            </option>

            <option value="donation">
              Donation
            </option>

            <option value="investment">
              Investment
            </option>

            <option value="debt_repayment">
              Debt Repayment
            </option>

            <option value="other">
              Other
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="goal-currency">
            Currency
          </label>

          <select
            id="goal-currency"
            name="currency"
            value={currency}
            onChange={(e) =>
              setCurrency(e.target.value)
            }
          >
            <option value="BDT">BDT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label htmlFor="target-amount">
            Target Amount
          </label>

          <input
            id="target-amount"
            name="targetAmount"
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={(e) =>
              setTargetAmount(e.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="target-date">
            Target Date
          </label>

          <input
            id="target-date"
            name="targetDate"
            type="date"
            value={targetDate}
            onChange={(e) =>
              setTargetDate(e.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="goal-description">
            Description
          </label>

          <textarea
            id="goal-description"
            name="description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Creating..."
            : "Create Goal"}
        </button>
      </form>
    </main>
  );
}