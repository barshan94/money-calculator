import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function InvestmentsPage() {
  const supabase = await createClient();

  const { data: investments, error } = await supabase
    .from("investments")
    .select(
      "id, name, investment_type, currency, invested_amount, current_value, purchase_date, status",
    )
    .eq("status", "active")
    .order("purchase_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items = investments ?? [];

  const totalInvested = items.reduce(
    (sum, investment) =>
      sum + Number(investment.invested_amount),
    0,
  );

  const totalValue = items.reduce(
    (sum, investment) =>
      sum + Number(investment.current_value),
    0,
  );

  const profitLoss = totalValue - totalInvested;

  return (
    <main>
      <div>
        <h1>Investments</h1>

        <Link href="/investments/new">
          + New Investment
        </Link>
      </div>

      <section>
        <div>
          <h2>Total Invested</h2>
          <p>
            ৳
            {totalInvested.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <h2>Current Value</h2>
          <p>
            ৳
            {totalValue.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <h2>Profit / Loss</h2>
          <p>
            ৳
            {profitLoss.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </section>

      <section>
        <h2>Your Investments</h2>

        {items.length === 0 ? (
          <p>No investments yet.</p>
        ) : (
          <div>
            {items.map((investment) => {
              const invested = Number(
                investment.invested_amount,
              );

              const value = Number(
                investment.current_value,
              );

              const profit = value - invested;

              return (
                <Link
                  key={investment.id}
                  href={`/investments/${investment.id}`}
                >
                  <div>
                    <h3>{investment.name}</h3>

                    <p>
                      {investment.investment_type}
                    </p>

                    <p>
                      Current Value:{" "}
                      {investment.currency}{" "}
                      {value.toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                      })}
                    </p>

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
                      {profit.toLocaleString("en-BD", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}