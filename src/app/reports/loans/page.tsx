import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LoanReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "id, person_name, loan_type, principal_amount, currency, start_date, due_date, status",
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<
    string,
    {
      lent: number;
      borrowed: number;
    }
  >();

  for (const loan of loans ?? []) {
    const total = totals.get(loan.currency) ?? {
      lent: 0,
      borrowed: 0,
    };

    if (loan.loan_type === "lent") {
      total.lent += Number(loan.principal_amount);
    } else {
      total.borrowed += Number(loan.principal_amount);
    }

    totals.set(loan.currency, total);
  }

  return (
    <main>
      <Link href="/reports">
        ← Back to Reports
      </Link>

      <h1>Loans Report</h1>

      {Array.from(totals.entries()).map(
        ([currency, total]) => (
          <section key={currency}>
            <h2>{currency}</h2>

            <div className="card-grid">
              <div className="card">
                <h3>Total Lent</h3>
                <p>
                  {currency}{" "}
                  {total.lent.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Total Borrowed</h3>
                <p>
                  {currency}{" "}
                  {total.borrowed.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Net Position</h3>
                <p>
                  {currency}{" "}
                  {(total.lent - total.borrowed).toLocaleString(
                    "en-BD",
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
                </p>
              </div>
            </div>
          </section>
        ),
      )}

      {(loans ?? []).length === 0 ? (
        <p>No loans available.</p>
      ) : (
        <section>
          <h2>Loan Details</h2>

          {(loans ?? []).map((loan) => (
            <div className="card" key={loan.id}>
              <h3>{loan.person_name}</h3>

              <p>Type: {loan.loan_type}</p>
              <p>Status: {loan.status}</p>

              <p>
                Principal: {loan.currency}{" "}
                {Number(
                  loan.principal_amount,
                ).toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                Start Date:{" "}
                {new Date(
                  loan.start_date,
                ).toLocaleDateString()}
              </p>

              {loan.due_date && (
                <p>
                  Due Date:{" "}
                  {new Date(
                    loan.due_date,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}