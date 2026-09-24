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
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 500px",
          }}
        >
          <Link
            href="/reports"
            style={{
              display: "inline-block",
              marginBottom: "12px",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            ← Back to Reports
          </Link>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 5vw, 36px)",
              lineHeight: 1.15,
            }}
          >
            Goals Report
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              maxWidth: "700px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Track your savings targets and progress toward each
            goal.
          </p>
        </div>
      </header>

      {!hasGoals ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>No goals available</h2>

          <p
            style={{
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Create a financial goal to start tracking your
            progress.
          </p>

          <Link
            href="/goals/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              marginTop: "12px",
              padding: "0 16px",
              borderRadius: "8px",
              border: "1px solid var(--border, #ddd)",
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
                    flexWrap: "wrap",
                  }}
                >
                  <h2 style={{ margin: 0 }}>{currency}</h2>

                  <span
                    style={{
                      fontSize: "12px",
                      padding: "4px 8px",
                      border: "1px solid var(--border, #ddd)",
                      borderRadius: "999px",
                      color:
                        "var(--muted-foreground, #666)",
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
                  <MetricCard
                    label="Total Target"
                    value={formatMoney(
                      total.target,
                      currency,
                    )}
                  />

                  <MetricCard
                    label="Total Saved"
                    value={formatMoney(
                      total.current,
                      currency,
                    )}
                  />

                  <MetricCard
                    label="Remaining"
                    value={formatMoney(
                      remaining,
                      currency,
                    )}
                  />

                  <div
                    className="card"
                    style={{
                      minWidth: 0,
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
                        marginTop: "12px",
                      }}
                    />
                  </div>
                </div>
              </section>
            );
          })}

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>Goal Details</h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Select a goal to view its details and update its
                progress.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "14px",
              }}
            >
              {(goals ?? []).map((goal) => {
                const target = Number(goal.target_amount);
                const current = Number(goal.current_amount);

                const percentage =
                  target > 0
                    ? Math.min(
                        (current / target) * 100,
                        100,
                      )
                    : 0;

                const remaining = Math.max(
                  target - current,
                  0,
                );

                const completed = percentage >= 100;

                return (
                  <Link
                    href={`/goals/${goal.id}`}
                    key={goal.id}
                    style={{
                      display: "block",
                      minWidth: 0,
                      padding: "18px",
                      border:
                        "1px solid var(--border, #ddd)",
                      borderRadius: "12px",
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
                          lineHeight: 1.35,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {goal.name}
                      </h3>

                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "12px",
                          padding: "4px 8px",
                          border:
                            "1px solid var(--border, #ddd)",
                          borderRadius: "999px",
                          whiteSpace: "nowrap",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        {goal.currency}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "12px 0 4px",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
                      }}
                    >
                      {goal.goal_type} · {goal.status}
                    </p>

                    <div style={{ marginTop: "16px" }}>
                      <p
                        style={{
                          margin: "0 0 5px",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Progress
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: "20px",
                          fontWeight: 700,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {formatMoney(
                          current,
                          goal.currency,
                        )}
                      </p>

                      <p
                        style={{
                          margin: "4px 0 12px",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        of{" "}
                        {formatMoney(
                          target,
                          goal.currency,
                        )}
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
                          alignItems: "flex-start",
                          gap: "12px",
                          marginTop: "8px",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          {percentage.toFixed(1)}% complete
                        </span>

                        <span>
                          {completed
                            ? "Target reached"
                            : `${formatMoney(
                                remaining,
                                goal.currency,
                              )} left`}
                        </span>
                      </div>
                    </div>

                    {goal.target_date && (
                      <div
                        style={{
                          marginTop: "16px",
                          paddingTop: "14px",
                          borderTop:
                            "1px solid var(--border, #ddd)",
                          fontSize: "13px",
                          color:
                            "var(--muted-foreground, #666)",
                        }}
                      >
                        Target:{" "}
                        {formatDate(goal.target_date)}
                      </div>
                    )}

                    <p
                      style={{
                        margin: "14px 0 0",
                        fontSize: "13px",
                        color:
                          "var(--muted-foreground, #666)",
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

      <style>{`
        a:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 3px;
        }

        @media (max-width: 600px) {
          main {
            padding: 18px 12px 36px !important;
          }

          .card {
            padding: 16px !important;
          }

          h2 {
            font-size: 21px;
          }

          a {
            -webkit-tap-highlight-color: transparent;
          }
        }

        @media (max-width: 420px) {
          main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="card"
      style={{
        minWidth: 0,
        padding: "18px",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "15px",
          lineHeight: 1.4,
        }}
      >
        {label}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: 700,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>
    </div>
  );
}

