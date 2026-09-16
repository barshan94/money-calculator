import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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

  const hasGoals = (goals ?? []).length > 0;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <Link
        href="/reports"
        style={{
          display: "inline-block",
          marginBottom: "12px",
          textDecoration: "none",
        }}
      >
        ← Back to Reports
      </Link>

      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: 0 }}>Goals Report</h1>

        <p
          style={{
            margin: "8px 0 0",
            opacity: 0.7,
          }}
        >
          Track your savings targets and progress toward each goal.
        </p>
      </div>

      {!hasGoals ? (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "32px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No goals available</h2>

          <p style={{ opacity: 0.7 }}>
            Create a financial goal to start tracking your progress.
          </p>

          <Link
            href="/goals/new"
            style={{
              display: "inline-block",
              marginTop: "12px",
              textDecoration: "none",
            }}
          >
            Create Goal →
          </Link>
        </section>
      ) : (
        <>
          {Array.from(totals.entries()).map(([currency, total]) => {
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
              <section
                key={currency}
                style={{
                  marginBottom: "36px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <h2 style={{ margin: 0 }}>{currency}</h2>

                  <span
                    style={{
                      fontSize: "13px",
                      padding: "4px 8px",
                      border: "1px solid #ddd",
                      borderRadius: "999px",
                      opacity: 0.75,
                    }}
                  >
                    Currency
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "18px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                      }}
                    >
                      Total Target
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(total.target, currency)}
                    </p>
                  </div>

                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "18px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                      }}
                    >
                      Total Saved
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(total.current, currency)}
                    </p>
                  </div>

                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "18px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                      }}
                    >
                      Remaining
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(remaining, currency)}
                    </p>
                  </div>

                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "18px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                      }}
                    >
                      Overall Progress
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 700,
                      }}
                    >
                      {percentage.toFixed(1)}%
                    </p>

                    <progress
                      value={percentage}
                      max={100}
                      style={{
                        width: "100%",
                        marginTop: "10px",
                      }}
                    />
                  </div>
                </div>
              </section>
            );
          })}

          <section>
            <h2>Goal Details</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
                marginTop: "16px",
              }}
            >
              {(goals ?? []).map((goal) => {
                const target = Number(goal.target_amount);
                const current = Number(goal.current_amount);

                const percentage =
                  target > 0
                    ? Math.min((current / target) * 100, 100)
                    : 0;

                const remaining = Math.max(
                  target - current,
                  0,
                );

                return (
                  <Link
                    href={`/goals/${goal.id}`}
                    key={goal.id}
                    style={{
                      display: "block",
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "18px",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                        }}
                      >
                        {goal.name}
                      </h3>

                      <span
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          border: "1px solid #ddd",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                          opacity: 0.75,
                        }}
                      >
                        {goal.currency}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "12px 0 4px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      {goal.goal_type} · {goal.status}
                    </p>

                    <p
                      style={{
                        margin: "14px 0 6px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      Progress
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "19px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(current, goal.currency)}
                    </p>

                    <p
                      style={{
                        margin: "4px 0 12px",
                        fontSize: "13px",
                        opacity: 0.65,
                      }}
                    >
                      of {formatMoney(target, goal.currency)}
                    </p>

                    <progress
                      value={percentage}
                      max={100}
                      style={{
                        width: "100%",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginTop: "8px",
                        fontSize: "13px",
                        opacity: 0.7,
                      }}
                    >
                      <span>{percentage.toFixed(1)}% complete</span>

                      <span>
                        {formatMoney(
                          remaining,
                          goal.currency,
                        )}{" "}
                        left
                      </span>
                    </div>

                    {goal.target_date && (
                      <p
                        style={{
                          margin: "14px 0 0",
                          fontSize: "13px",
                          opacity: 0.7,
                        }}
                      >
                        Target: {formatDate(goal.target_date)}
                      </p>
                    )}

                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: "13px",
                        opacity: 0.6,
                      }}
                    >
                      View goal →
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

