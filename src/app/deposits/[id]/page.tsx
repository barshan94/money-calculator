import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";


type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DepositDetailPage({
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

  const { data: deposit, error } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, interest_rate, maturity_amount, start_date, maturity_date, status, description",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !deposit) {
    notFound();
  }

  const principal = Number(
    deposit.principal_amount,
  );

  const maturity = Number(
    deposit.maturity_amount ?? principal,
  );

  const expectedInterest = maturity - principal;

  return (
    <main>
      <Link href="/deposits">
        ← Back to Deposits
      </Link>

      <h1>{deposit.name}</h1>

      <p>{deposit.deposit_type}</p>

      <section>
        <h2>Principal</h2>

        <p>
          {deposit.currency}{" "}
          {principal.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>
      </section>

      <section>
        <p>
          Expected Maturity:{" "}
          {deposit.currency}{" "}
          {maturity.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>

        <p>
          Expected Interest:{" "}
          {deposit.currency}{" "}
          {expectedInterest.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>

        {deposit.interest_rate !== null && (
          <p>
            Interest Rate:{" "}
            {Number(deposit.interest_rate).toFixed(2)}%
          </p>
        )}

        <p>
          Start Date:{" "}
          {new Date(
            deposit.start_date,
          ).toLocaleDateString()}
        </p>

        {deposit.maturity_date && (
          <p>
            Maturity Date:{" "}
            {new Date(
              deposit.maturity_date,
            ).toLocaleDateString()}
          </p>
        )}

        {deposit.description && (
          <p>
            Description: {deposit.description}
          </p>
        )}

        <p>Status: {deposit.status}</p>
      </section>

{deposit.status === "active" && (
  <section>
    <Link href={`/deposits/${deposit.id}/edit`}>
      Edit Deposit
    </Link>

    <Link href={`/deposits/${deposit.id}/withdraw`}>
      Withdraw Deposit
    </Link>
  </section>
)}
    </main>
  );
}