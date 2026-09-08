import LoanWhatsAppButton from "@/components/loans/loan-whatsapp-button";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LoanDetailPage({
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

  const loans = await getLoanBalances();

  const loan = loans.find(
    (item) => item.id === id,
  );

  if (!loan) {
    notFound();
  }

  return (
    <main>
      <Link href="/loans">
        ← Back to Loans
      </Link>

      <h1>{loan.person_name}</h1>

      <p>
        {loan.loan_type === "lent"
          ? "You lent money"
          : "You borrowed money"}
      </p>

      <section>
        <h2>Outstanding</h2>

        <p>
          {loan.currency}{" "}
          {loan.remaining_amount.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>
      </section>

      <section>
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

        <p>Status: {loan.status}</p>
      </section>

      {loan.status === "active" &&
        loan.remaining_amount > 0 && (
          <Link href={`/loans/${loan.id}/repay`}>
            Record Repayment
          </Link>
        )}

        {loan.whatsapp_number &&
  loan.status === "active" &&
  loan.remaining_amount > 0 && (
    <LoanWhatsAppButton
      personName={loan.person_name}
      phoneNumber={loan.whatsapp_number}
      currency={loan.currency}
      remainingAmount={loan.remaining_amount}
    />
  )}
    </main>
  );
}