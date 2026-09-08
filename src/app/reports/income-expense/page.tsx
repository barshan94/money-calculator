import Link from "next/link";
import { getMonthlyIncomeExpense } from "@/lib/finance/get-monthly-income-expense";

export default async function IncomeExpenseReportPage() {
  const report = await getMonthlyIncomeExpense("BDT");

  return (
    <main>
      <Link href="/reports">← Back to Reports</Link>

      <h1>Income vs Expenses</h1>

      <section>
        <h2>Monthly Breakdown</h2>

        {report.length === 0 ? (
          <p>No financial data available yet.</p>
        ) : (
          <div className="card-grid">
            {report.map((item) => (
              <div className="card" key={item.month}>
                <h3>{item.month}</h3>

                <p>
                  Income: BDT{" "}
                  {item.income.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>

                <p>
                  Expenses: BDT{" "}
                  {item.expenses.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>

                <p>
                  Net: BDT{" "}
                  {item.net.toLocaleString("en-BD", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}