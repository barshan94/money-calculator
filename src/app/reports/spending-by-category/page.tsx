import Link from "next/link";
import { getCategoryExpenseReport } from "@/lib/finance/get-category-expense-report";
import SpendingByCategoryChart from "@/components/reports/spending-by-category-chart";

type SpendingItem = {
  category: string;
  amount: number;
};

function formatMoney(amount: number) {
  return `BDT ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function SpendingByCategoryPage() {
  const report: SpendingItem[] =
    await getCategoryExpenseReport("BDT");

  const total = report.reduce(
    (sum, item) => sum + Number(item.amount),
    0,
  );

  const topCategory =
    report.length > 0
      ? [...report].sort((a, b) => b.amount - a.amount)[0]
      : null;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 48px",
      }}
    >
      <header
        style={{
          marginBottom: "28px",
        }}
      >
        <Link
          href="/reports"
          style={{
            display: "inline-block",
            marginBottom: "12px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          ← Back to Reports
        </Link>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 5vw, 36px)",
            lineHeight: 1.15,
          }}
        >
          Spending by Category
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            maxWidth: "720px",
            color: "var(--muted-foreground, #666)",
            lineHeight: 1.6,
          }}
        >
          See where your expenses are going and how much each
          category contributes to total spending.
        </p>
      </header>

      {report.length === 0 ? (
        <section
          className="card"
          style={{
            padding: "36px 20px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            No expense data available
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: "560px",
              color: "var(--muted-foreground, #666)",
              lineHeight: 1.6,
            }}
          >
            Add categorized expense transactions to see your
            spending distribution.
          </p>

          <Link
            href="/transactions/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              marginTop: "16px",
              padding: "0 16px",
              borderRadius: "8px",
              border: "1px solid var(--border, #ddd)",
              textDecoration: "none",
            }}
          >
            Add an Expense →
          </Link>
        </section>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              marginBottom: "28px",
            }}
          >
            <MetricCard
              label="Total Expenses"
              value={formatMoney(total)}
            />

            <MetricCard
              label="Categories"
              value={String(report.length)}
            />

            <MetricCard
              label="Largest Category"
              value={topCategory?.category ?? "—"}
              secondaryValue={
                topCategory
                  ? formatMoney(Number(topCategory.amount))
                  : undefined
              }
            />
          </section>

          <section
            className="card"
            style={{
              padding: "20px",
              marginBottom: "28px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                Spending Distribution
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Distribution of expenses across your categories.
              </p>
            </div>

            <div
              style={{
                width: "100%",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div
                style={{
                  minWidth: "520px",
                }}
              >
                <SpendingByCategoryChart data={report} />
              </div>
            </div>
          </section>

          <section>
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                Category Breakdown
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "14px",
                  color:
                    "var(--muted-foreground, #666)",
                }}
              >
                Amount and percentage of total expenses for each
                category.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px",
              }}
            >
              {report.map((item) => {
                const amount = Number(item.amount);

                const percentage =
                  total > 0
                    ? (amount / total) * 100
                    : 0;

                const safePercentage = Math.min(
                  100,
                  Math.max(0, percentage),
                );

                return (
                  <article
                    className="card"
                    key={item.category}
                    style={{
                      minWidth: 0,
                      padding: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "12px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "17px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.category}
                      </h3>

                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "13px",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {percentage.toFixed(1)}%
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "14px 0 16px",
                        fontSize: "22px",
                        fontWeight: 700,
                        lineHeight: 1.3,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {formatMoney(amount)}
                    </p>

                    <div
                      aria-label={`${item.category} accounts for ${percentage.toFixed(1)} percent of total expenses`}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Number(
                        safePercentage.toFixed(1),
                      )}
                      style={{
                        width: "100%",
                        height: "8px",
                        borderRadius: "999px",
                        background:
                          "var(--border, #ddd)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${safePercentage}%`,
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
        </>
      )}

      <style>{`
        a:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 3px;
        }

        @media (max-width: 600px) {
          main {
            padding: 18px 12px 36px !important;
          }

          .card {
            padding: 16px !important;
          }

          a {
            -webkit-tap-highlight-color: transparent;
          }
        }

        @media (max-width: 420px) {
          main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>
    </main>
  );
}

function MetricCard({
  label,
  value,
  secondaryValue,
}: {
  label: string;
  value: string;
  secondaryValue?: string;
}) {
  return (
    <div
      className="card"
      style={{
        minWidth: 0,
        padding: "18px",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "15px",
        }}
      >
        {label}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: "21px",
          fontWeight: 700,
          lineHeight: 1.3,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </p>

      {secondaryValue && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "13px",
            color: "var(--muted-foreground, #666)",
          }}
        >
          {secondaryValue}
        </p>
      )}
    </div>
  );
}

