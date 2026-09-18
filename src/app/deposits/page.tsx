import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DepositsPage() {
  const supabase = await createClient();
  

  const {
    data: deposits,
    error,
  } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, interest_rate, maturity_amount, start_date, maturity_date, status",
    )
    .eq("status", "active")
    .order("start_date", {
      ascending: false,
    });


  if (error) {
    throw new Error(
      `Deposits query failed: ${error.message}`,
    );
  }

  const rows = deposits ?? [];

  const totals = rows.reduce(
    (
      acc: Record<
        string,
        {
          principal: number;
          maturity: number;
        }
      >,
      deposit,
    ) => {
      const currency = deposit.currency;

      if (!acc[currency]) {
        acc[currency] = {
          principal: 0,
          maturity: 0,
        };
      }

      acc[currency].principal += Number(
        deposit.principal_amount,
      );

      acc[currency].maturity += Number(
        deposit.maturity_amount ??
          deposit.principal_amount,
      );

      return acc;
    },
    {},
  );

  return (
    <main>
      <div>
        <h1>Deposits</h1>

        <Link href="/deposits/new">
          + New Deposit
        </Link>
      </div>

      <section>
        {Object.entries(totals).length === 0 ? (
          <p>No active deposits.</p>
        ) : (
          Object.entries(totals).map(
            ([currency, total]) => {
              const interest =
                total.maturity -
                total.principal;

              return (
                <div key={currency}>
                  <h2>{currency}</h2>

                  <div>
                    <div>
                      <h3>Total Principal</h3>
                      <p>
                        {currency}{" "}
                        {total.principal.toLocaleString(
                          "en-BD",
                          {
                            minimumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>

                    <div>
                      <h3>Expected Maturity</h3>
                      <p>
                        {currency}{" "}
                        {total.maturity.toLocaleString(
                          "en-BD",
                          {
                            minimumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>

                    <div>
                      <h3>Expected Interest</h3>
                      <p>
                        {currency}{" "}
                        {interest.toLocaleString(
                          "en-BD",
                          {
                            minimumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            },
          )
        )}
      </section>

      <section>
        <h2>Active Deposits</h2>

        {rows.length === 0 ? (
          <p>No active deposits.</p>
        ) : (
          <div>
            {rows.map((deposit) => {
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

                    {deposit.interest_rate !==
                      null && (
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