import Link from "next/link";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";

export default async function LoanReportPage() {
  const allLoans = await getLoanBalances();

  const loans = allLoans.filter(
    (loan) => loan.status !== "cancelled",
  );

  const totals = new Map<
    string,
    {
      lent: number;
      borrowed: number;
    }
  >();

  for (const loan of loans) {
    const total = totals.get(loan.currency) ?? {
      lent: 0,
      borrowed: 0,
    };

    if (loan.loan_type === "lent") {
      total.lent += loan.remaining_amount;
    } else {
      total.borrowed += loan.remaining_amount;
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
                <h3>Outstanding Lent</h3>
                <p>
                  {currency}{" "}
                  {total.lent.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Outstanding Borrowed</h3>
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

      {loans.length === 0 ? (
        <p>No loans available.</p>
      ) : (
        <section>
          <h2>Loan Details</h2>

          {loans.map((loan) => (
            <div className="card" key={loan.id}>
              <h3>{loan.person_name}</h3>

              <p>Type: {loan.loan_type}</p>
              <p>Status: {loan.status}</p>

              <p>
                Principal: {loan.currency}{" "}
                {loan.principal_amount.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                Repaid: {loan.currency}{" "}
                {loan.repaid_amount.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                Remaining: {loan.currency}{" "}
                {loan.remaining_amount.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                Start Date:{" "}
                {loan.start_datetime
                  ? new Date(
                      loan.start_datetime,
                    ).toLocaleDateString()
                  : "—"}
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

