"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditGoalPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const goalId = params.id as string;

  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadGoal() {
      const { data, error } = await supabase
        .from("goals")
        .select(
          "name, goal_type, target_amount, target_date, description, status",
        )
        .eq("id", goalId)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.status !== "active") {
        setMessage("This goal is no longer active.");
        setLoading(false);
        return;
      }

      setName(data.name);
      setGoalType(data.goal_type);
      setTargetAmount(String(data.target_amount));
      setTargetDate(data.target_date ?? "");
      setDescription(data.description ?? "");

      setLoading(false);
    }

    loadGoal();
  }, [goalId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

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
    setMessage("");

    const { error } = await supabase.rpc("update_goal", {
      p_goal_id: goalId,
      p_name: name.trim(),
      p_goal_type: goalType,
      p_target_amount: amount,
      p_target_date: targetDate || null,
      p_description: description.trim() || null,
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
      <main>
        <h1>Edit Goal</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Goal</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Goal Name</label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Goal Type</label>

          <select
            value={goalType}
            onChange={(event) =>
              setGoalType(event.target.value)
            }
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
          <label>Target Amount</label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={(event) =>
              setTargetAmount(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Target Date</label>

          <input
            type="date"
            value={targetDate}
            onChange={(event) =>
              setTargetDate(event.target.value)
            }
          />
        </div>

        <div>
          <label>Description</label>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </main>
  );
}