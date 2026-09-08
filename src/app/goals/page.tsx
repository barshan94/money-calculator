import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <main>
      <div>
        <h1>Goals</h1>

        <Link href="/goals/new">
          + New Goal
        </Link>
      </div>

      {items.length === 0 ? (
        <p>No active goals.</p>
      ) : (
        <section>
          {items.map((goal) => {
            const target = Number(goal.target_amount);
            const current = Number(goal.current_amount);

            const percentage =
              target > 0
                ? Math.min((current / target) * 100, 100)
                : 0;

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
              >
                <div>
                  <h2>{goal.name}</h2>

                  <p>{goal.goal_type}</p>

                  <p>
                    {goal.currency}{" "}
                    {current.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    /{" "}
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

                  {goal.target_date && (
                    <p>
                      Target:{" "}
                      {new Date(
                        goal.target_date,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}