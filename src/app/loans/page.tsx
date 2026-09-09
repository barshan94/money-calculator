import Link from "next/link";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";
import { createClient } from "@/lib/supabase/server";
import LoanWhatsAppButton from "@/components/loans/loan-whatsapp-button";

type LoanReliability = {
  loan_id: string;
  person_name: string;
  loan_type: string;
  principal_amount: number;
  due_date: string;
  final_payment_date: string | null;
  days_late: number | null;
  reliability_score: number | null;
  reliability_rating: string | null;
};

function formatAmount(
  amount: number,
  currency: string,
) {
  return `${currency} ${amount.toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 2,
    },
  )}`;
}

function reliabilityBadgeClass(
  rating: string | null,
) {
  if (
    rating === "Excellent" ||
    rating === "Reliable"
  ) {
    return "badge-success";
  }

  if (rating === "Sometimes late") {
    return "badge-warning";
  }

  return "badge-danger";
}

export default async function LoansPage() {
  const loans = await getLoanBalances();

  const supabase = await createClient();

  const {
    data: reliabilityData,
    error: reliabilityError,
  } = await supabase.rpc(
    "get_loan_reliability",
  );

  const reliability =
    reliabilityError
      ? []
      : ((reliabilityData as LoanReliability[]) ??
        []);

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
                <Link
                  href={`/loans/${loan.id}`}
                >
                  {loan.person_name}
                </Link>
              </h3>

              <p>
                {loan.loan_type === "lent"
                  ? "You lent"
                  : "You borrowed"}
              </p>

              <p>
                Outstanding:{" "}
                {formatAmount(
                  loan.remaining_amount,
                  loan.currency,
                )}
              </p>

              <p>
                Principal:{" "}
                {formatAmount(
                  loan.principal_amount,
                  loan.currency,
                )}
              </p>

              <p>
                Repaid:{" "}
                {formatAmount(
                  loan.repaid_amount,
                  loan.currency,
                )}
              </p>

              <Link
                href={`/loans/${loan.id}/repay`}
              >
                Repay
              </Link>

              {loan.whatsapp_number && (
                <LoanWhatsAppButton
                  personName={loan.person_name}
                  phoneNumber={loan.whatsapp_number}
                  currency={loan.currency}
                  remainingAmount={
                    loan.remaining_amount
                  }
                />
              )}
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Loan Reliability</h2>

        <p>
          Reliability is based on the final repayment
          date compared with the saved loan due date.
        </p>

        {reliability.length === 0 ? (
          <p>
            No loan reliability data available yet.
          </p>
        ) : (
          <div>
            {reliability.map(
              (loan, index) => (
                <div key={loan.loan_id}>
                  <p>
                    <strong>
                      #{index + 1}{" "}
                      {loan.person_name}
                    </strong>
                  </p>

                  <p>
                    {loan.loan_type === "lent"
                      ? "You lent"
                      : "You borrowed"}
                  </p>

                  <p>
                    Principal:{" "}
                    {formatAmount(
                      loan.principal_amount,
                      "BDT",
                    )}
                  </p>

                  <p>
                    Due:{" "}
                    {new Date(
                      `${loan.due_date}T00:00:00`,
                    ).toLocaleDateString(
                      "en-BD",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>

                  <p>
                    Final repayment:{" "}
                    {loan.final_payment_date
                      ? new Date(
                          `${loan.final_payment_date}T00:00:00`,
                        ).toLocaleDateString(
                          "en-BD",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "Not repaid yet"}
                  </p>

                  <p>
                    Days late:{" "}
                    {loan.days_late === null
                      ? "—"
                      : loan.days_late}
                  </p>

                  <p>
                    Score:{" "}
                    {loan.reliability_score ===
                    null
                      ? "—"
                      : `${loan.reliability_score}/100`}
                  </p>

                  <p
                    className={reliabilityBadgeClass(
                      loan.reliability_rating,
                    )}
                  >
                    {loan.reliability_rating ??
                      "Pending"}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}