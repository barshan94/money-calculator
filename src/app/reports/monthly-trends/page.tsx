import Link from "next/link";
import MonthlyIncomeExpenseChart from "@/components/reports/monthly-income-expense-chart";
import { getMonthlyIncomeExpense } from "@/lib/finance/get-monthly-income-expense";

export default async function MonthlyTrendsPage() {
  const report = await getMonthlyIncomeExpense("BDT");

  return (
    <main>
      <Link href="/reports">← Back to Reports</Link>

      <h1>Monthly Trends</h1>

      {report.length === 0 ? (
        <p>No financial data available yet.</p>
      ) : (
        <>
          <MonthlyIncomeExpenseChart
            data={report}
          />

          <section>
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
          </section>
        </>
      )}
    </main>
  );
}