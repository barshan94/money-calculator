import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function InvestmentReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: investments, error } = await supabase
    .from("investments")
    .select(
      "id, name, investment_type, currency, invested_amount, current_value, status",
    )
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<
    string,
    {
      invested: number;
      current: number;
    }
  >();

  for (const investment of investments ?? []) {
    const current = totals.get(investment.currency) ?? {
      invested: 0,
      current: 0,
    };

    current.invested += Number(investment.invested_amount);
    current.current += Number(investment.current_value);

    totals.set(investment.currency, current);
  }

  return (
    <main>
      <Link href="/reports">← Back to Reports</Link>

      <h1>Investments Report</h1>

      {Array.from(totals.entries()).map(
        ([currency, total]) => {
          const gainLoss =
            total.current - total.invested;

          return (
            <section key={currency}>
              <h2>{currency}</h2>

              <div className="card-grid">
                <div className="card">
                  <h3>Total Invested</h3>
                  <p>
                    {currency}{" "}
                    {total.invested.toLocaleString(
                      "en-BD",
                      {
                        minimumFractionDigits: 2,
                      },
                    )}
                  </p>
                </div>

                <div className="card">
                  <h3>Current Value</h3>
                  <p>
                    {currency}{" "}
                    {total.current.toLocaleString(
                      "en-BD",
                      {
                        minimumFractionDigits: 2,
                      },
                    )}
                  </p>
                </div>

                <div className="card">
                  <h3>Gain / Loss</h3>
                  <p>
                    {currency}{" "}
                    {gainLoss.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </section>
          );
        },
      )}

      {(investments ?? []).length === 0 && (
        <p>No investments available.</p>
      )}

      <section>
        <h2>Investments</h2>

        {(investments ?? []).map((investment) => (
          <div className="card" key={investment.id}>
            <h3>{investment.name}</h3>

            <p>Type: {investment.investment_type}</p>
            <p>Status: {investment.status}</p>

            <p>
              Invested: {investment.currency}{" "}
              {Number(
                investment.invested_amount,
              ).toLocaleString("en-BD", {
                minimumFractionDigits: 2,
              })}
            </p>

            <p>
              Current: {investment.currency}{" "}
              {Number(
                investment.current_value,
              ).toLocaleString("en-BD", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}