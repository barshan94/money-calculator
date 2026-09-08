import Link from "next/link";
import { ArchiveRecurringButton } from "@/components/recurring/archive-recurring-button";

import { RunRecurringButton } from "@/components/recurring/run-recurring-button";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";


import { ProcessDueButton } from "@/components/recurring/process-due-button";
export default async function RecurringTransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: recurring, error } = await supabase
    .from("recurring_transactions")
    .select(`
      id,
      name,
      transaction_type,
      amount,
      currency,
      frequency,
      next_run_date,
      description,
      categories (
        name
      ),
      source_account:accounts!recurring_transactions_source_account_id_fkey (
        name
      ),
      destination_account:accounts!recurring_transactions_destination_account_id_fkey (
        name
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("next_run_date");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main>
      <div>
        <h1>Recurring Transactions</h1>

        <ProcessDueButton />

        <Link href="/recurring/new">
          + New Recurring Transaction
        </Link>
      </div>

      {recurring && recurring.length > 0 ? (
        <div>
          {recurring.map((item) => {
            const category = Array.isArray(item.categories)
              ? item.categories[0]
              : item.categories;

            const source = Array.isArray(
              item.source_account,
            )
              ? item.source_account[0]
              : item.source_account;

            const destination = Array.isArray(
              item.destination_account,
            )
              ? item.destination_account[0]
              : item.destination_account;

            return (
              <section key={item.id}>
                <h2>{item.name}</h2>

                <p>
                  {item.transaction_type}
                </p>

                <p>
                  {formatMoney(
                    Number(item.amount),
                    item.currency,
                  )}
                </p>

                <p>
                  Every {item.frequency}
                </p>

                <p>
                  Next run: {item.next_run_date}
                </p>

                {category && (
                  <p>
                    Category: {category.name}
                  </p>
                )}

                {source && (
                  <p>
                    From: {source.name}
                  </p>
                )}

                {destination && (
                  <p>
                    To: {destination.name}
                  </p>
                )}

                {item.description && (
                  <p>{item.description}</p>
                )}

                <Link href={`/recurring/${item.id}/edit`}>
  Edit
</Link>

                <RunRecurringButton recurringId={item.id} />

                <ArchiveRecurringButton recurringId={item.id} />

              </section>
            );
          })}
        </div>
      ) : (
        <p>No recurring transactions yet.</p>
      )}
    </main>
  );
}