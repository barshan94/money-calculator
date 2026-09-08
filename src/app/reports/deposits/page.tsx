import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DepositReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: deposits, error } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, maturity_amount, interest_rate, start_date, maturity_date, status",
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
      principal: number;
      maturity: number;
    }
  >();

  for (const deposit of deposits ?? []) {
    const total = totals.get(deposit.currency) ?? {
      principal: 0,
      maturity: 0,
    };

    total.principal += Number(deposit.principal_amount);
    total.maturity += Number(
      deposit.maturity_amount ?? deposit.principal_amount,
    );

    totals.set(deposit.currency, total);
  }

  return (
    <main>
      <Link href="/reports">
        ← Back to Reports
      </Link>

      <h1>Deposits Report</h1>

      {Array.from(totals.entries()).map(
        ([currency, total]) => (
          <section key={currency}>
            <h2>{currency}</h2>

            <div className="card-grid">
              <div className="card">
                <h3>Total Principal</h3>
                <p>
                  {currency}{" "}
                  {total.principal.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Expected Maturity</h3>
                <p>
                  {currency}{" "}
                  {total.maturity.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="card">
                <h3>Expected Interest</h3>
                <p>
                  {currency}{" "}
                  {(total.maturity - total.principal).toLocaleString(
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

      {(deposits ?? []).length === 0 ? (
        <p>No deposits available.</p>
      ) : (
        <section>
          <h2>Deposit Details</h2>

          {(deposits ?? []).map((deposit) => (
            <div className="card" key={deposit.id}>
              <h3>{deposit.name}</h3>

              <p>Type: {deposit.deposit_type}</p>
              <p>Status: {deposit.status}</p>

              <p>
                Principal: {deposit.currency}{" "}
                {Number(
                  deposit.principal_amount,
                ).toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              <p>
                Maturity: {deposit.currency}{" "}
                {Number(
                  deposit.maturity_amount ??
                    deposit.principal_amount,
                ).toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>

              {deposit.interest_rate !== null && (
                <p>
                  Interest Rate:{" "}
                  {Number(deposit.interest_rate).toFixed(2)}%
                </p>
              )}

              {deposit.maturity_date && (
                <p>
                  Maturity Date:{" "}
                  {new Date(
                    deposit.maturity_date,
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