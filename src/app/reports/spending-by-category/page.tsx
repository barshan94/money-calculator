import Link from "next/link";
import { getCategoryExpenseReport } from "@/lib/finance/get-category-expense-report";
import SpendingByCategoryChart from "@/components/reports/spending-by-category-chart";

type SpendingItem = {
  category: string;
  amount: number;
};

export default async function SpendingByCategoryPage() {
  const report: SpendingItem[] =
    await getCategoryExpenseReport("BDT");

  const total = report.reduce(
    (sum: number, item: SpendingItem) =>
      sum + item.amount,
    0,
  );

  return (
    <main>
      <Link href="/reports">← Back to Reports</Link>

      <h1>Spending by Category</h1>

      <p>
        Total Expenses: BDT{" "}
        {total.toLocaleString("en-BD", {
          minimumFractionDigits: 2,
        })}
      </p>

      {report.length === 0 ? (
        <p>No expense data available yet.</p>
      ) : (
        <>
          <SpendingByCategoryChart data={report} />

          <section>
            {report.map((item: SpendingItem) => {
              const percentage =
                total > 0
                  ? (item.amount / total) * 100
                  : 0;

              return (
                <div className="card" key={item.category}>
                  <h3>{item.category}</h3>

                  <p>
                    BDT{" "}
                    {item.amount.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </p>

                  <p>{percentage.toFixed(1)}%</p>

                  <progress
                    value={percentage}
                    max="100"
                  />
                </div>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}