import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DepositsPage() {
  const supabase = await createClient();

  const { data: deposits, error } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, interest_rate, maturity_amount, start_date, maturity_date, status",
    )
    .eq("status", "active")
    .order("start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const items = deposits ?? [];

  const totalPrincipal = items.reduce(
    (sum, deposit) =>
      sum + Number(deposit.principal_amount),
    0,
  );

  const totalMaturity = items.reduce(
    (sum, deposit) =>
      sum +
      Number(
        deposit.maturity_amount ??
          deposit.principal_amount,
      ),
    0,
  );

  const expectedInterest =
    totalMaturity - totalPrincipal;

  return (
    <main>
      <div>
        <h1>Deposits</h1>

        <Link href="/deposits/new">
          + New Deposit
        </Link>
      </div>

      <section>
        <div>
          <h2>Total Principal</h2>
          <p>
            ৳
            {totalPrincipal.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <h2>Expected Maturity</h2>
          <p>
            ৳
            {totalMaturity.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div>
          <h2>Expected Interest</h2>
          <p>
            ৳
            {expectedInterest.toLocaleString("en-BD", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </section>

      <section>
        <h2>Active Deposits</h2>

        {items.length === 0 ? (
          <p>No active deposits.</p>
        ) : (
          <div>
            {items.map((deposit) => {
              const principal = Number(
                deposit.principal_amount,
              );

              const maturity = Number(
                deposit.maturity_amount ??
                  deposit.principal_amount,
              );

              return (
                <Link
                  key={deposit.id}
                  href={`/deposits/${deposit.id}`}
                >
                  <div>
                    <h3>{deposit.name}</h3>

                    <p>
                      {deposit.deposit_type}
                    </p>

                    <p>
                      Principal:{" "}
                      {deposit.currency}{" "}
                      {principal.toLocaleString(
                        "en-BD",
                        {
                          minimumFractionDigits: 2,
                        },
                      )}
                    </p>

                    <p>
                      Maturity:{" "}
                      {deposit.currency}{" "}
                      {maturity.toLocaleString(
                        "en-BD",
                        {
                          minimumFractionDigits: 2,
                        },
                      )}
                    </p>

                    {deposit.interest_rate !== null && (
                      <p>
                        Interest Rate:{" "}
                        {Number(
                          deposit.interest_rate,
                        ).toFixed(2)}
                        %
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
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}