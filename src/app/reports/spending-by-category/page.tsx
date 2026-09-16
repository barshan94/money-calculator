import Link from "next/link";
import { getCategoryExpenseReport } from "@/lib/finance/get-category-expense-report";
import SpendingByCategoryChart from "@/components/reports/spending-by-category-chart";

type SpendingItem = {
  category: string;
  amount: number;
};

function formatAmount(amount: number) {
  return `BDT ${Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function SpendingByCategoryPage() {
  const report: SpendingItem[] =
    await getCategoryExpenseReport("BDT");

  const total = report.reduce(
    (sum: number, item: SpendingItem) =>
      sum + item.amount,
    0,
  );

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>
            Spending by Category
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "var(--muted-foreground, #666)",
            }}
          >
            See where your expenses are going and how much each
            category contributes to your total spending.
          </p>
        </div>

        <Link href="/reports">← Reports</Link>
      </header>

      {report.length === 0 ? (
        <section className="card">
          <h2>No expense data available yet</h2>

          <p>
            Add expense transactions with categories to see your
            spending breakdown.
          </p>

          <Link href="/transactions/new">
            Add an expense →
          </Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 32 }}>
          <section
            className="card"
            style={{
              textAlign: "center",
              padding: "28px 20px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
              }}
            >
              Total Expenses
            </p>

            <p
              style={{
                fontSize: 32,
                fontWeight: 700,
                margin: "8px 0 0",
              }}
            >
              {formatAmount(total)}
            </p>
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 4 }}>
              Spending Distribution
            </h2>

            <p
              style={{
                marginTop: 0,
                color: "var(--muted-foreground, #666)",
              }}
            >
              Expense distribution across your categories.
            </p>

            <div style={{ marginTop: 24 }}>
              <SpendingByCategoryChart data={report} />
            </div>
          </section>

          <section>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 4 }}>
                Category Breakdown
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "var(--muted-foreground, #666)",
                }}
              >
                Amount and percentage of total expenses.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {report.map((item: SpendingItem) => {
                const percentage =
                  total > 0
                    ? (item.amount / total) * 100
                    : 0;

                return (
                  <article
                    className="card"
                    key={item.category}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        marginBottom: 16,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                        }}
                      >
                        {item.category}
                      </h3>

                      <strong
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {percentage.toFixed(1)}%
                      </strong>
                    </div>

                    <p
                      style={{
                        fontSize: 24,
                        fontWeight: 700,
                        margin: "0 0 16px",
                      }}
                    >
                      {formatAmount(item.amount)}
                    </p>

                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 999,
                        background:
                          "var(--border, #ddd)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, percentage),
                          )}%`,
                          height: "100%",
                          background: "currentColor",
                          opacity: 0.75,
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
