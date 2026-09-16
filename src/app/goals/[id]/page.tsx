import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CancelGoalButton from "@/components/goals/cancel-goal-button";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function GoalDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: goal, error } = await supabase
    .from("goals")
    .select(
      "id, name, goal_type, currency, target_amount, current_amount, target_date, description, status",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !goal) {
    notFound();
  }

  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);

  const remaining = Math.max(target - current, 0);

  const percentage =
    target > 0
      ? Math.min((current / target) * 100, 100)
      : 0;

  return (
    <main>
      <Link href="/goals">
        ← Back to Goals
      </Link>

      <h1>{goal.name}</h1>

      <p>{goal.goal_type}</p>

      <section>
        <h2>Progress</h2>

        <p>
          {goal.currency}{" "}
          {current.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
          {" / "}
          {target.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>

        <progress
          value={percentage}
          max="100"
        />

        <p>
          {percentage.toFixed(1)}% complete
        </p>

        <p>
          Remaining: {goal.currency}{" "}
          {remaining.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>
      </section>

      <section>
        {goal.target_date && (
          <p>
            Target Date:{" "}
            {new Date(
              goal.target_date,
            ).toLocaleDateString()}
          </p>
        )}

        {goal.description && (
          <p>
            Description: {goal.description}
          </p>
        )}

        <p>Status: {goal.status}</p>
      </section>

{goal.status === "active" && (
  <section>
    <Link href={`/goals/${goal.id}/edit`}>
      Edit Goal
    </Link>

  <Link href={`/goals/${goal.id}/progress`}>
  Update Progress
</Link>
    

    <CancelGoalButton goalId={goal.id} />
  </section>
)}
    </main>
  );
}