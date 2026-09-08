import Link from "next/link";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";

export default async function LoansPage() {
  const loans = await getLoanBalances();

  const activeLoans = loans.filter(
    (loan) =>
      loan.status === "active" &&
      loan.remaining_amount > 0,
  );

  return (
    <main>
      <h1>Loans</h1>

      <Link href="/loans/new">
        + New Loan
      </Link>

      <section>
        <h2>Active Loans</h2>

        {activeLoans.length === 0 ? (
          <p>No active loans.</p>
        ) : (
          activeLoans.map((loan) => (
            <div key={loan.id}>
              <h3>
  <Link href={`/loans/${loan.id}`}>
    {loan.person_name}
  </Link>
</h3>

              <p>
                {loan.loan_type === "lent"
                  ? "You lent"
                  : "You borrowed"}
              </p>

              <p>
                Outstanding: {loan.currency}{" "}
                {loan.remaining_amount.toLocaleString(
                  "en-BD",
                  {
                    minimumFractionDigits: 2,
                  },
                )}
              </p>

              <p>
                Principal: {loan.currency}{" "}
                {loan.principal_amount.toLocaleString(
                  "en-BD",
                  {
                    minimumFractionDigits: 2,
                  },
                )}
              </p>

              <p>
                Repaid: {loan.currency}{" "}
                {loan.repaid_amount.toLocaleString(
                  "en-BD",
                  {
                    minimumFractionDigits: 2,
                  },
                )}
              </p>

              <Link href={`/loans/${loan.id}/repay`}>
                Repay
              </Link>
            </div>
          ))
        )}
      </section>
    </main>
  );
}