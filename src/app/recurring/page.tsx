import Link from "next/link";
import { ArchiveRecurringButton } from "@/components/recurring/archive-recurring-button";
import { RunRecurringButton } from "@/components/recurring/run-recurring-button";
import { ProcessDueButton } from "@/components/recurring/process-due-button";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

export default async function RecurringTransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: recurring, error } = await supabase
    .from("recurring_transactions")
    .select(`
      id,
      name,
      transaction_type,
      amount,
      currency,
      frequency,
      next_run_date,
      description,
      categories (
        name
      ),
      source_account:accounts!recurring_transactions_source_account_id_fkey (
        name
      ),
      destination_account:accounts!recurring_transactions_destination_account_id_fkey (
        name
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("next_run_date");

  if (error) {
    throw new Error(error.message);
  }

  const formatDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 34px)",
              lineHeight: 1.2,
            }}
          >
            Recurring Transactions
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
              fontSize: 14,
            }}
          >
            Manage scheduled income, expenses, and transfers.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <ProcessDueButton />

          <Link
            href="/recurring/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 42,
              padding: "10px 16px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              background: "#111",
              color: "#fff",
            }}
          >
            + New Recurring Transaction
          </Link>
        </div>
      </div>

      {recurring && recurring.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 16,
          }}
        >
          {recurring.map((item) => {
            const category = Array.isArray(item.categories)
              ? item.categories[0]
              : item.categories;

            const source = Array.isArray(item.source_account)
              ? item.source_account[0]
              : item.source_account;

            const destination = Array.isArray(
              item.destination_account,
            )
              ? item.destination_account[0]
              : item.destination_account;

            return (
              <section
                key={item.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: 18,
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 20,
                        lineHeight: 1.3,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.name}
                    </h2>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#666",
                        fontSize: 13,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.transaction_type}
                    </p>
                  </div>

                  <strong
                    style={{
                      fontSize: 18,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatMoney(
                      Number(item.amount),
                      item.currency,
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    fontSize: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ color: "#666" }}>Frequency</span>
                    <strong style={{ textTransform: "capitalize" }}>
                      Every {item.frequency}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ color: "#666" }}>Next run</span>
                    <strong>
                      {formatDate(item.next_run_date)}
                    </strong>
                  </div>

                  {category && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ color: "#666" }}>Category</span>
                      <span
                        style={{
                          textAlign: "right",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {category.name}
                      </span>
                    </div>
                  )}

                  {source && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ color: "#666" }}>From</span>
                      <span
                        style={{
                          textAlign: "right",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {source.name}
                      </span>
                    </div>
                  )}

                  {destination && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span style={{ color: "#666" }}>To</span>
                      <span
                        style={{
                          textAlign: "right",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {destination.name}
                      </span>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p
                    style={{
                      margin: 0,
                      padding: 12,
                      borderRadius: 8,
                      background: "#f7f7f7",
                      color: "#555",
                      fontSize: 14,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.description}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    paddingTop: 4,
                    borderTop: "1px solid #eee",
                  }}
                >
                  <Link
                    href={`/recurring/${item.id}/edit`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 38,
                      padding: "8px 12px",
                      borderRadius: 7,
                      border: "1px solid #ddd",
                      color: "#222",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Edit
                  </Link>

                  <RunRecurringButton recurringId={item.id} />

                  <ArchiveRecurringButton
                    recurringId={item.id}
                  />
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            border: "1px dashed #ccc",
            borderRadius: 12,
            padding: "40px 20px",
            textAlign: "center",
            background: "#fafafa",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 20,
            }}
          >
            No recurring transactions yet
          </h2>

          <p
            style={{
              margin: "0 0 18px",
              color: "#666",
            }}
          >
            Create a recurring transaction to automate regular
            income, expenses, or transfers.
          </p>

          <Link
            href="/recurring/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 40,
              padding: "9px 14px",
              borderRadius: 8,
              background: "#111",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Create one
          </Link>
        </div>
      )}
    </main>
  );
}