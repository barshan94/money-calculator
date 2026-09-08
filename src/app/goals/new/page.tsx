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

    if (amount <= 0) {
      setMessage("Target amount must be greater than zero.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("create_goal", {
      p_name: name.trim(),
      p_goal_type: goalType,
      p_currency: currency,
      p_target_amount: amount,
      p_target_date: targetDate || null,
      p_description: description.trim() || null,
    });

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
          <label>Goal Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emergency Fund"
            required
          />
        </div>

        <div>
          <label>Goal Type</label>

          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value)}
          >
            <option value="savings">Savings</option>
            <option value="emergency_fund">
              Emergency Fund
            </option>
            <option value="donation">Donation</option>
            <option value="investment">Investment</option>
            <option value="debt_repayment">
              Debt Repayment
            </option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label>Currency</label>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="BDT">BDT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label>Target Amount</label>

          <input
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
          <label>Target Date</label>

          <input
            type="date"
            value={targetDate}
            onChange={(e) =>
              setTargetDate(e.target.value)
            }
          />
        </div>

        <div>
          <label>Description</label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Goal"}
        </button>
      </form>
    </main>
  );
}