import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvestmentDetailPage({
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

  const { data: investment, error } = await supabase
    .from("investments")
    .select(
      "id, name, investment_type, currency, quantity, purchase_price, invested_amount, current_value, purchase_date, description, status",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !investment) {
    notFound();
  }

  const invested = Number(
    investment.invested_amount,
  );

  const currentValue = Number(
    investment.current_value,
  );

  const profitLoss = currentValue - invested;

  const profitLossPercent =
    invested > 0
      ? (profitLoss / invested) * 100
      : 0;

  return (
    <main>
      <Link href="/investments">
        ← Back to Investments
      </Link>

      <h1>{investment.name}</h1>

      <p>{investment.investment_type}</p>

      <section>
        <h2>Current Value</h2>

        <p>
          {investment.currency}{" "}
          {currentValue.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>
      </section>

      <section>
        <p>
          Invested:{" "}
          {investment.currency}{" "}
          {invested.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>

        <p>
          Profit / Loss:{" "}
          {investment.currency}{" "}
          {profitLoss.toLocaleString("en-BD", {
            minimumFractionDigits: 2,
          })}
        </p>

        <p>
          Return: {profitLossPercent.toFixed(2)}%
        </p>

        {investment.quantity !== null && (
          <p>
            Quantity:{" "}
            {Number(investment.quantity).toLocaleString()}
          </p>
        )}

        {investment.purchase_price !== null && (
          <p>
            Purchase Price:{" "}
            {investment.currency}{" "}
            {Number(
              investment.purchase_price,
            ).toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        )}

        <p>
          Purchase Date:{" "}
          {new Date(
            investment.purchase_date,
          ).toLocaleDateString()}
        </p>

        {investment.description && (
          <p>
            Description: {investment.description}
          </p>
        )}

        <p>Status: {investment.status}</p>

        {investment.status === "active" && (
  <>
    <Link href={`/investments/${investment.id}/edit`}>
      Edit Investment
    </Link>

    <Link href={`/investments/${investment.id}/sell`}>
      Sell Investment
    </Link>
  </>
)}
      </section>
    </main>
  );
}
