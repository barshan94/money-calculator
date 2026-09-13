import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    filter?: string;
    type?: string;
    sort?: string;
  }>;
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-BD",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function formatPercent(
  currentValue: number,
  investedAmount: number,
) {
  if (investedAmount <= 0) return 0;

  return (
    ((currentValue - investedAmount) /
      investedAmount) *
    100
  );
}

export default async function InvestmentsPage({
  searchParams,
}: Props) {
  const {
    filter = "active",
    type = "all",
    sort = "newest",
  } = await searchParams;

  const supabase = await createClient();

  const {
    data: investments,
    error,
  } = await supabase
    .from("investment_performance")
    .select(
      `
        id,
        name,
        investment_type,
        currency,
        quantity,
        purchase_price,
        invested_amount,
        current_value,
        purchase_date,
        created_at,
        description,
        status,
        archived_at,
        realized_profit_loss,
        unrealized_profit_loss,
        total_profit_loss
      `,
    );

  if (error) {
    return (
      <main>
        <div className="investment-error">
          Unable to load investments.
        </div>
      </main>
    );
  }

  const allInvestments = investments ?? [];

  const filteredInvestments = allInvestments.filter(
    (investment) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "active"
            ? investment.status === "active" &&
              !investment.archived_at
            : filter === "sold"
              ? investment.status === "sold" &&
                !investment.archived_at
              : filter === "archived"
                ? investment.archived_at
                : true;

      const matchesType =
        type === "all" ||
        investment.investment_type === type;

      return matchesFilter && matchesType;
    },
  );

  const sortedInvestments = [
    ...filteredInvestments,
  ].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );

      case "highest":
        return (
          Number(b.current_value) -
          Number(a.current_value)
        );

      case "lowest":
        return (
          Number(a.current_value) -
          Number(b.current_value)
        );

      case "profit-high":
        return (
          Number(b.total_profit_loss) -
          Number(a.total_profit_loss)
        );

      case "profit-low":
        return (
          Number(a.total_profit_loss) -
          Number(b.total_profit_loss)
        );

      case "name-az":
        return a.name.localeCompare(b.name);

      case "name-za":
        return b.name.localeCompare(a.name);

      case "newest":
      default:
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
    }
  });

  const activeInvestments =
    allInvestments.filter(
      (investment) =>
        investment.status === "active" &&
        !investment.archived_at,
    );

  const soldInvestments =
    allInvestments.filter(
      (investment) =>
        investment.status === "sold" &&
        !investment.archived_at,
    );

  const archivedInvestments =
    allInvestments.filter(
      (investment) => investment.archived_at,
    );

  return (
    <main>
      <div className="investment-page-header">
        <div>
          <p className="investment-eyebrow">
            Wealth & portfolio
          </p>

          <h1>Investments</h1>

          <p className="investment-subtitle">
            Track your investments, performance,
            purchases and sales.
          </p>
        </div>

        <Link
          href="/investments/new"
          className="investment-primary-button"
        >
          + New Investment
        </Link>
      </div>

      <section className="investment-summary-grid">
        <div className="investment-summary-card">
          <span>Active Investments</span>
          <strong>
            {activeInvestments.length}
          </strong>
        </div>

        <div className="investment-summary-card">
          <span>Sold Investments</span>
          <strong>
            {soldInvestments.length}
          </strong>
        </div>

        <div className="investment-summary-card">
          <span>Archived</span>
          <strong>
            {archivedInvestments.length}
          </strong>
        </div>

        <div className="investment-summary-card">
          <span>Total Investments</span>
          <strong>
            {allInvestments.length}
          </strong>
        </div>
      </section>

      <section className="investment-section">
        <div className="investment-section-header">
          <div>
            <h2>Investment Portfolio</h2>

            <p>
              {sortedInvestments.length} investment
              {sortedInvestments.length === 1
                ? ""
                : "s"} shown
            </p>
          </div>

          <form
            method="GET"
            className="investment-filter-form"
          >
            <label htmlFor="investment-filter">
              Status
            </label>

            <select
              id="investment-filter"
              name="filter"
              defaultValue={filter}
            >
              <option value="active">
                Active
              </option>

              <option value="sold">
                Sold
              </option>

              <option value="archived">
                Archived
              </option>

              <option value="all">
                All
              </option>
            </select>

            <label htmlFor="investment-type">
              Type
            </label>

            <select
              id="investment-type"
              name="type"
              defaultValue={type}
            >
              <option value="all">
                All types
              </option>

              <option value="stock">
                Stock
              </option>

              <option value="crypto">
                Crypto
              </option>

              <option value="mutual_fund">
                Mutual Fund
              </option>

              <option value="bond">
                Bond
              </option>

              <option value="fixed_deposit">
                Fixed Deposit
              </option>

              <option value="other">
                Other
              </option>
            </select>

            <label htmlFor="investment-sort">
              Sort
            </label>

            <select
              id="investment-sort"
              name="sort"
              defaultValue={sort}
            >
              <option value="newest">
                Newest first
              </option>

              <option value="oldest">
                Oldest first
              </option>

              <option value="highest">
                Highest value
              </option>

              <option value="lowest">
                Lowest value
              </option>

              <option value="profit-high">
                Highest profit
              </option>

              <option value="profit-low">
                Lowest profit
              </option>

              <option value="name-az">
                Name A–Z
              </option>

              <option value="name-za">
                Name Z–A
              </option>
            </select>

            <button
              type="submit"
              className="investment-form-button"
            >
              Apply
            </button>

            <Link
              href="/investments"
              className="investment-form-button investment-reset-button"
            >
              Reset
            </Link>
          </form>
        </div>

        {sortedInvestments.length === 0 ? (
          <div className="investment-empty">
            <h3>No investments found</h3>

            <p>
              Try another filter or create a new
              investment.
            </p>
          </div>
        ) : (
          <div className="investment-list">
            {sortedInvestments.map(
              (investment) => {
                const investedAmount =
                  Number(
                    investment.invested_amount,
                  );

                const currentValue =
                  Number(
                    investment.current_value,
                  );

                const totalProfit =
                  Number(
                    investment.total_profit_loss,
                  );

                const returnPercent =
                  formatPercent(
                    currentValue,
                    investedAmount,
                  );

                return (
                  <article
                    key={investment.id}
                    className="investment-card"
                  >
                    <div className="investment-card-top">
                      <div>
                        <Link
                          href={`/investments/${investment.id}`}
                          className="investment-name"
                        >
                          {investment.name}
                        </Link>

                        <span className="investment-type">
                          {investment.investment_type.replace(
                            "_",
                            " ",
                          )}
                        </span>
                      </div>

                      <span
                        className={`investment-status investment-status-${investment.status}`}
                      >
                        {investment.archived_at
                          ? "Archived"
                          : investment.status ===
                              "sold"
                            ? "Sold"
                            : "Active"}
                      </span>
                    </div>

                    <div className="investment-date">
                      Purchased{" "}
                      {formatDate(
                        investment.purchase_date,
                      )}
                    </div>

                    <div className="investment-financial">
                      <div>
                        <span>
                          Current Value
                        </span>

                        <strong>
                          {formatAmount(
                            currentValue,
                            investment.currency,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Invested</span>

                        <strong>
                          {formatAmount(
                            investedAmount,
                            investment.currency,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Total P/L</span>

                        <strong>
                          {totalProfit >= 0
                            ? "+"
                            : ""}
                          {formatAmount(
                            totalProfit,
                            investment.currency,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="investment-extra">
                      <span>
                        Quantity:{" "}
                        {Number(
                          investment.quantity ?? 1,
                        ).toLocaleString(
                          "en-BD",
                        )}
                      </span>

                      <span>
                        Return:{" "}
                        {returnPercent >= 0
                          ? "+"
                          : ""}
                        {returnPercent.toFixed(
                          2,
                        )}
                        %
                      </span>
                    </div>

                    <div className="investment-card-footer">
                      <Link
                        href={`/investments/${investment.id}`}
                        className="investment-view-button"
                      >
                        View
                      </Link>

                      {!investment.archived_at && (
                        <form
                          action={`/investments/${investment.id}/archive`}
                          method="POST"
                        >
                          <button
                            type="submit"
                            className="investment-archive-button"
                          >
                            Archive
                          </button>
                        </form>
                      )}

                      {investment.archived_at && (
                        <>
                          <form
                            action={`/investments/${investment.id}/unarchive`}
                            method="POST"
                          >
                            <button
                              type="submit"
                              className="investment-unarchive-button"
                            >
                              Unarchive
                            </button>
                          </form>

                          <form
                            action={`/investments/${investment.id}/delete`}
                            method="POST"
                          >
                            <button
                              type="submit"
                              className="investment-delete-button"
                            >
                              Delete
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <style>{`
        .investment-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }

        .investment-eyebrow {
          margin: 0 0 6px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .investment-page-header h1 {
          margin: 0;
        }

        .investment-subtitle {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .investment-primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 16px;
          border-radius: 8px;
          background: var(--primary);
          color: white;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .investment-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 32px;
        }

        .investment-summary-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .investment-summary-card span {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
        }

        .investment-summary-card strong {
          font-size: 27px;
        }

        .investment-section {
          margin-top: 32px;
        }

        .investment-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 14px;
        }

        .investment-section-header h2 {
          margin: 0;
          font-size: 15px !important;
          font-weight: 700 !important;
        }

        .investment-section-header p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .investment-filter-form {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .investment-filter-form label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
        }

        .investment-filter-form select {
          min-width: 125px;
          height: 34px;
          padding: 0 9px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          color: var(--foreground);
          font-size: 11px;
          box-sizing: border-box;
        }

        .investment-form-button {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  width: 72px !important;
  min-width: 72px !important;
  height: 34px !important;
  min-height: 34px !important;
  padding: 0 !important;
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}

.investment-form-button[type="submit"] {
  background: var(--primary);
  color: white;
}

.investment-reset-button {
  background: var(--card);
  color: var(--foreground);
}


        .investment-reset-button {
          background: var(--card);
          color: var(--foreground);
        }

        .investment-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .investment-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .investment-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .investment-name {
          display: block;
          color: var(--foreground);
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
        }

        .investment-type {
          display: block;
          margin-top: 3px;
          color: var(--muted);
          font-size: 11px;
          text-transform: capitalize;
        }

        .investment-status {
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .investment-status-active {
          background: #f0fdf4;
          color: var(--success);
        }

        .investment-status-sold {
          background: var(--muted-background);
          color: var(--muted);
        }

        .investment-status-cancelled {
          background: #fef2f2;
          color: var(--danger);
        }

        .investment-date {
          margin-top: 12px;
          color: var(--muted);
          font-size: 10px;
        }

        .investment-financial {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 14px;
          margin-top: 22px;
        }

        .investment-financial span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
        }

        .investment-financial strong {
          font-size: 13px;
        }

        .investment-financial > div:first-child strong {
          font-size: 19px;
        }

        .investment-extra {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 16px;
          color: var(--muted);
          font-size: 10px;
        }

        .investment-card-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .investment-card-footer form {
          margin: 0;
        }

        .investment-view-button,
        .investment-archive-button,
        .investment-unarchive-button,
        .investment-delete-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 7px 11px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          box-sizing: border-box;
        }

        .investment-view-button {
          color: var(--foreground);
          border: 1px solid var(--border);
        }

        .investment-archive-button,
        .investment-unarchive-button {
          border: 0;
          background: var(--primary);
          color: white;
        }

        .investment-delete-button {
          border: 1px solid var(--danger);
          background: transparent;
          color: var(--danger);
        }

        .investment-empty,
        .investment-error {
          padding: 30px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
          color: var(--muted);
        }

        .investment-empty h3 {
          margin: 0;
          color: var(--foreground);
          font-size: 15px;
        }

        .investment-empty p {
          margin: 6px 0 0;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .investment-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .investment-list {
            grid-template-columns: 1fr;
          }

          .investment-section-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .investment-page-header {
            flex-direction: column;
          }

          .investment-primary-button {
            width: 100%;
          }

          .investment-summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .investment-summary-card {
            padding: 14px;
          }

          .investment-summary-card strong {
            font-size: 23px;
          }

          .investment-filter-form {
            display: grid;
            grid-template-columns: auto 1fr;
            width: 100%;
          }

          .investment-filter-form select {
            width: 100%;
            min-width: 0;
          }

          .investment-financial {
            grid-template-columns: 1fr 1fr;
          }

          .investment-financial > div:first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </main>
  );
}

