"use client";


import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Goal = {
  id: string;
  name: string;
  currency: string;
  target_amount: number;
  current_amount: number;
  status: "active" | "completed" | "cancelled";
};

export default function GoalProgressPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadGoal() {
      const { data, error } = await supabase
        .from("goals")
        .select(
          "id, name, currency, target_amount, current_amount, status",
        )
        .eq("id", goalId)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setGoal({
        ...data,
        target_amount: Number(data.target_amount),
        current_amount: Number(data.current_amount),
      });

      setAmount(String(data.current_amount));
      setLoading(false);
    }

    loadGoal();
  }, [goalId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!goal) return;

    setMessage("");

    const currentAmount = Number(amount);

    if (currentAmount < 0) {
      setMessage("Amount cannot be negative.");
      return;
    }

    if (currentAmount > goal.target_amount) {
      setMessage("Amount cannot exceed the target.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_goal_progress",
      {
        p_goal_id: goalId,
        p_current_amount: currentAmount,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    alert("Progress saved");
router.push(`/goals/${goalId}`);
router.refresh();
  }

  if (loading) {
    return (
      <main>
        <h1>Update Goal Progress</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (!goal) {
    return (
      <main>
        <h1>Update Goal Progress</h1>
        <p>{message || "Goal not found."}</p>
      </main>
    );
  }

  if (goal.status !== "active") {
    return (
      <main>
        <h1>Update Goal Progress</h1>
        <p>This goal is no longer active.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Update Goal Progress</h1>

      <p>{goal.name}</p>

      <p>
        Target: {goal.currency}{" "}
        {goal.target_amount.toLocaleString("en-BD", {
          minimumFractionDigits: 2,
        })}
      </p>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Current Amount</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            required
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Update Progress"}
        </button>
      </form>
    </main>
  );
}