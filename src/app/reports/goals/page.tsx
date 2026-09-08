import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function GoalsReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: goals, error } = await supabase
    .from("goals")
    .select(
      "id, name, goal_type, currency, target_amount, current_amount, target_date, status",
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("target_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<
    string,
    {
      target: number;
      current: number;
    }
  >();

  for (const goal of goals ?? []) {
    const total = totals.get(goal.currency) ?? {
      target: 0,
      current: 0,
    };

    total.target += Number(goal.target_amount);
    total.current += Number(goal.current_amount);

    totals.set(goal.currency, total);
  }

  return (
    <main>
      <Link href="/reports">← Back to Reports</Link>

      <h1>Goals Report</h1>

      {Array.from(totals.entries()).map(
        ([currency, total]) => {
          const remaining = Math.max(
            total.target - total.current,
            0,
          );

          const percentage =
            total.target > 0
              ? Math.min(
                  (total.current / total.target) * 100,
                  100,
                )
              : 0;

          return (
            <section key={currency}>
              <h2>{currency}</h2>

              <div className="card-grid">
                <div className="card">
                  <h3>Total Target</h3>
                  <p>
                    {currency}{" "}
                    {total.target.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="card">
                  <h3>Total Saved</h3>
                  <p>
                    {currency}{" "}
                    {total.current.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="card">
                  <h3>Remaining</h3>
                  <p>
                    {currency}{" "}
                    {remaining.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <div className="card">
                  <h3>Overall Progress</h3>
                  <p>{percentage.toFixed(1)}%</p>
                </div>
              </div>
            </section>
          );
        },
      )}

      {(goals ?? []).length === 0 ? (
        <p>No goals available.</p>
      ) : (
        <section>
          <h2>Goal Details</h2>

          {(goals ?? []).map((goal) => {
            const target = Number(goal.target_amount);
            const current = Number(goal.current_amount);

            const percentage =
              target > 0
                ? Math.min((current / target) * 100, 100)
                : 0;

            return (
              <div className="card" key={goal.id}>
                <h3>{goal.name}</h3>

                <p>Type: {goal.goal_type}</p>
                <p>Status: {goal.status}</p>

                <p>
                  Progress: {goal.currency}{" "}
                  {current.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                  {" / "}
                  {target.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>

                <p>
                  {percentage.toFixed(1)}% complete
                </p>

                <progress
                  value={percentage}
                  max="100"
                />

                {goal.target_date && (
                  <p>
                    Target Date:{" "}
                    {new Date(
                      goal.target_date,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}