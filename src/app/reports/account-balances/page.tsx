import Link from "next/link";
import { getAccountBalances } from "@/lib/finance/get-account-balances";
import AccountBalancesChart from "@/components/reports/account-balances-chart";

export default async function AccountBalancesPage() {
  const balances = await getAccountBalances();

  const chartData = balances.map((account) => ({
    name: account.name,
    balance: account.balance,
  }));

  return (
    <main>
      <Link href="/reports">← Back to Reports</Link>

      <h1>Account Balances</h1>

      {balances.length === 0 ? (
        <p>No accounts available.</p>
      ) : (
        <>
          <AccountBalancesChart data={chartData} />

          <section>
            {balances.map((account) => (
              <div className="card" key={account.id}>
                <h3>{account.name}</h3>

                <p>{account.account_type}</p>

                <p>
                  {account.currency}{" "}
                  {account.balance.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}