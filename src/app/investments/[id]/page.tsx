import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Activity = {
  id: string;
  activity_type: "buy" | "sell";
  quantity: number | null;
  unit_price: number | null;
  total_amount: number;
  cost_basis: number;
  realized_profit_loss: number;
  activity_date: string;
  description: string | null;
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null) {
  if (!date) return "—";

  const value = new Date(`${date}T00:00:00`);

  if (Number.isNaN(value.getTime())) return "—";

  return value.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}

export default async function InvestmentDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="investment-detail-page">
        <div className="investment-empty">
          <h1>Sign in required</h1>
          <p>Please sign in to view this investment.</p>
        </div>
      </main>
    );
  }

  const { data: investment, error } = await supabase
    .from("investment_performance")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !investment) {
    return (
      <main className="investment-detail-page">
        <Link
          href="/investments"
          className="investment-back"
        >
          ← Back to Investments
        </Link>

        <div className="investment-empty">
          <h1>Investment not found</h1>
          <p>
            This investment does not exist or you do not
            have access to it.
          </p>
        </div>
      </main>
    );
  }

  const { data: activities } = await supabase
    .from("investment_activity")
    .select(
      "id,activity_type,quantity,unit_price,total_amount,cost_basis,realized_profit_loss,activity_date,description",
    )
    .eq("investment_id", investment.id)
    .eq("user_id", user.id)
    .order("activity_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  const activityHistory: Activity[] =
    activities ?? [];

  const invested = Number(
    investment.invested_amount ?? 0,
  );

  const currentValue = Number(
    investment.current_value ?? 0,
  );

  const quantity =
    investment.quantity === null
      ? null
      : Number(investment.quantity);

  const purchasePrice =
    investment.purchase_price === null
      ? null
      : Number(investment.purchase_price);

  const realizedProfitLoss = Number(
    investment.realized_profit_loss ?? 0,
  );

  const unrealizedProfitLoss = Number(
    investment.unrealized_profit_loss ??
      currentValue - invested,
  );

  const totalProfitLoss = Number(
    investment.total_profit_loss ??
      realizedProfitLoss + unrealizedProfitLoss,
  );

  const totalProfitLossPercent =
    invested > 0
      ? (totalProfitLoss / invested) * 100
      : 0;

  const unrealizedProfitLossPercent =
    invested > 0
      ? (unrealizedProfitLoss / invested) * 100
      : 0;

  const isActive =
    investment.status === "active" &&
    (quantity === null || quantity > 0);

  return (
    <main className="investment-detail-page">
      <Link
        href="/investments"
        className="investment-back"
      >
        ← Back to Investments
      </Link>

      <div className="investment-header">
        <div>
          <div className="investment-eyebrow">
            Investment
          </div>

          <div className="investment-title-row">
            <h1>{investment.name}</h1>

            <span
              className={
                investment.status === "active"
                  ? "investment-status active"
                  : "investment-status"
              }
            >
              {investment.status}
            </span>
          </div>

          <p className="investment-subtitle">
            {String(investment.investment_type)
              .replace("_", " ")
              .replace(/\b\w/g, (letter: string) =>
                letter.toUpperCase(),
              )}
          </p>
        </div>

        <div className="investment-actions">
          {isActive && (
            <Link
              href={`/investments/${investment.id}/buy`}
              className="investment-buy-button"
            >
              + Buy More
            </Link>
          )}

          <Link
            href={`/investments/${investment.id}/edit`}
            className="investment-secondary-button"
          >
            Edit
          </Link>

          {isActive && (
            <Link
              href={`/investments/${investment.id}/sell`}
              className="investment-sell-button"
            >
              Sell
            </Link>
          )}
        </div>
      </div>

      <section className="investment-performance-grid">
        <div className="investment-performance-card featured">
          <span>Current Value</span>

          <strong>
            {formatAmount(
              currentValue,
              investment.currency,
            )}
          </strong>

          <small>
            {quantity !== null
              ? `${formatNumber(quantity)} units`
              : "Current holding"}
          </small>
        </div>

        <div className="investment-performance-card">
          <span>Remaining Cost</span>

          <strong>
            {formatAmount(
              invested,
              investment.currency,
            )}
          </strong>

          <small>
            {purchasePrice !== null
              ? `Avg. cost ${formatAmount(
                  purchasePrice,
                  investment.currency,
                )}`
              : "Total remaining cost"}
          </small>
        </div>

        <div className="investment-performance-card">
          <span>Unrealized P/L</span>

          <strong
            className={
              unrealizedProfitLoss > 0
                ? "profit"
                : unrealizedProfitLoss < 0
                  ? "loss"
                  : ""
            }
          >
            {unrealizedProfitLoss >= 0 ? "+" : ""}
            {formatAmount(
              unrealizedProfitLoss,
              investment.currency,
            )}
          </strong>

          <small>
            {unrealizedProfitLossPercent >= 0
              ? "+"
              : ""}
            {unrealizedProfitLossPercent.toFixed(2)}%
          </small>
        </div>

        <div className="investment-performance-card">
          <span>Realized P/L</span>

          <strong
            className={
              realizedProfitLoss > 0
                ? "profit"
                : realizedProfitLoss < 0
                  ? "loss"
                  : ""
            }
          >
            {realizedProfitLoss >= 0 ? "+" : ""}
            {formatAmount(
              realizedProfitLoss,
              investment.currency,
            )}
          </strong>

          <small>
            From completed sales
          </small>
        </div>
      </section>

      <section className="investment-total-card">
        <div>
          <span>Total Profit / Loss</span>

          <strong
            className={
              totalProfitLoss > 0
                ? "profit"
                : totalProfitLoss < 0
                  ? "loss"
                  : ""
            }
          >
            {totalProfitLoss >= 0 ? "+" : ""}
            {formatAmount(
              totalProfitLoss,
              investment.currency,
            )}
          </strong>
        </div>

        <div className="investment-total-percent">
          <span>Total Return</span>

          <strong>
            {totalProfitLossPercent >= 0
              ? "+"
              : ""}
            {totalProfitLossPercent.toFixed(2)}%
          </strong>
        </div>
      </section>

      <section className="investment-info-grid">
        <div className="investment-info-card">
          <h2>Financial Details</h2>

          <div className="investment-info-row">
            <span>Remaining Cost</span>
            <strong>
              {formatAmount(
                invested,
                investment.currency,
              )}
            </strong>
          </div>

          <div className="investment-info-row">
            <span>Current Value</span>
            <strong>
              {formatAmount(
                currentValue,
                investment.currency,
              )}
            </strong>
          </div>

          <div className="investment-info-row">
            <span>Quantity</span>
            <strong>
              {quantity === null
                ? "—"
                : formatNumber(quantity)}
            </strong>
          </div>

          <div className="investment-info-row">
            <span>Average Purchase Price</span>
            <strong>
              {purchasePrice === null
                ? "—"
                : formatAmount(
                    purchasePrice,
                    investment.currency,
                  )}
            </strong>
          </div>
        </div>

        <div className="investment-info-card">
          <h2>Investment Information</h2>

          <div className="investment-info-row">
            <span>Type</span>
            <strong>
              {String(investment.investment_type)
                .replace("_", " ")
                .replace(/\b\w/g, (letter: string) =>
                  letter.toUpperCase(),
                )}
            </strong>
          </div>

          <div className="investment-info-row">
            <span>Currency</span>
            <strong>{investment.currency}</strong>
          </div>

          <div className="investment-info-row">
            <span>Purchase Date</span>
            <strong>
              {formatDate(investment.purchase_date)}
            </strong>
          </div>

          <div className="investment-info-row">
            <span>Status</span>
            <strong>
              {investment.status}
            </strong>
          </div>
        </div>
      </section>

      {investment.description && (
        <section className="investment-description">
          <h2>Description</h2>
          <p>{investment.description}</p>
        </section>
      )}

      <section className="investment-history">
        <div className="investment-history-header">
          <div>
            <h2>Investment Activity</h2>
            <p>
              Complete history of buys and sales.
            </p>
          </div>

          <span>
            {activityHistory.length}{" "}
            {activityHistory.length === 1
              ? "activity"
              : "activities"}
          </span>
        </div>

        {activityHistory.length === 0 ? (
          <div className="investment-history-empty">
            No investment activity recorded.
          </div>
        ) : (
          <div className="investment-history-list">
            {activityHistory.map((activity) => {
              const isBuy =
                activity.activity_type === "buy";

              const activityProfitLoss =
                Number(
                  activity.realized_profit_loss ?? 0,
                );

              return (
                <div
                  key={activity.id}
                  className="investment-history-row"
                >
                  <div className="history-main">
                    <span
                      className={
                        isBuy
                          ? "history-type buy"
                          : "history-type sell"
                      }
                    >
                      {isBuy ? "BUY" : "SELL"}
                    </span>

                    <div>
                      <strong>
                        {isBuy
                          ? "Purchased"
                          : "Sold"}{" "}
                        {activity.quantity === null
                          ? ""
                          : formatNumber(
                              Number(
                                activity.quantity,
                              ),
                            )}
                        {activity.quantity !==
                          null && " units"}
                      </strong>

                      <small>
                        {formatDate(
                          activity.activity_date,
                        )}
                        {activity.description
                          ? ` • ${activity.description}`
                          : ""}
                      </small>
                    </div>
                  </div>

                  <div className="history-detail">
                    <span>Unit Price</span>
                    <strong>
                      {activity.unit_price === null
                        ? "—"
                        : formatAmount(
                            Number(
                              activity.unit_price,
                            ),
                            investment.currency,
                          )}
                    </strong>
                  </div>

                  <div className="history-detail">
                    <span>Total</span>
                    <strong>
                      {formatAmount(
                        Number(
                          activity.total_amount,
                        ),
                        investment.currency,
                      )}
                    </strong>
                  </div>

                  {!isBuy && (
                    <div className="history-detail">
                      <span>Realized P/L</span>
                      <strong
                        className={
                          activityProfitLoss > 0
                            ? "profit"
                            : activityProfitLoss <
                                0
                              ? "loss"
                              : ""
                        }
                      >
                        {activityProfitLoss >= 0
                          ? "+"
                          : ""}
                        {formatAmount(
                          activityProfitLoss,
                          investment.currency,
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .investment-detail-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px 0 50px;
        }

        .investment-back {
          display: inline-block;
          margin-bottom: 24px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }

        .investment-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .investment-eyebrow {
          margin-bottom: 6px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          text-transform: uppercase;
        }

        .investment-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .investment-title-row h1 {
          margin: 0;
          font-size: 28px;
        }

        .investment-subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        .investment-status {
          padding: 5px 9px;
          border-radius: 999px;
          background: var(--muted-background);
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .investment-status.active {
          background: #f0fdf4;
          color: var(--success);
        }

        .investment-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .investment-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .investment-buy-button {
          background: var(--primary);
          color: white;
        }

        .investment-secondary-button {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
        }

        .investment-sell-button {
          background: var(--danger);
          color: white;
        }

        .investment-performance-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .investment-performance-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .investment-performance-card span {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
        }

        .investment-performance-card strong {
          display: block;
          font-size: 18px;
        }

        .investment-performance-card small {
          display: block;
          margin-top: 5px;
          color: var(--muted);
          font-size: 10px;
        }

        .investment-performance-card.featured strong {
          font-size: 22px;
        }

        .profit {
          color: var(--success) !important;
        }

        .loss {
          color: var(--danger) !important;
        }

        .investment-total-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 14px;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .investment-total-card span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 11px;
        }

        .investment-total-card strong {
          font-size: 22px;
        }

        .investment-total-percent {
          text-align: right;
        }

        .investment-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 28px;
        }

        .investment-info-card,
        .investment-description {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .investment-info-card h2,
        .investment-description h2 {
          margin: 0 0 14px;
          font-size: 14px;
        }

        .investment-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }

        .investment-info-row:last-child {
          border-bottom: 0;
        }

        .investment-info-row span {
          color: var(--muted);
          font-size: 11px;
        }

        .investment-info-row strong {
          font-size: 12px;
          text-align: right;
        }

        .investment-description {
          margin-top: 14px;
        }

        .investment-description p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .investment-history {
          margin-top: 28px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
          overflow: hidden;
        }

        .investment-history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border-bottom: 1px solid var(--border);
        }

        .investment-history-header h2 {
          margin: 0;
          font-size: 15px;
        }

        .investment-history-header p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .investment-history-header > span {
          color: var(--muted);
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }

        .investment-history-list {
          display: flex;
          flex-direction: column;
        }

        .investment-history-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          align-items: center;
          gap: 18px;
          padding: 15px 18px;
          border-bottom: 1px solid var(--border);
        }

        .investment-history-row:last-child {
          border-bottom: 0;
        }

        .history-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .history-main > div {
          min-width: 0;
        }

        .history-type {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 38px;
          padding: 5px 6px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 800;
        }

        .history-type.buy {
          background: #f0fdf4;
          color: var(--success);
        }

        .history-type.sell {
          background: #fef2f2;
          color: var(--danger);
        }

        .history-main strong {
          display: block;
          font-size: 12px;
        }

        .history-main small {
          display: block;
          margin-top: 4px;
          color: var(--muted);
          font-size: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .history-detail span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
        }

        .history-detail strong {
          font-size: 12px;
        }

        .investment-history-empty {
          padding: 28px;
          color: var(--muted);
          text-align: center;
          font-size: 12px;
        }

        .investment-empty {
          padding: 40px 20px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
        }

        .investment-empty h1 {
          margin: 0;
          font-size: 20px;
        }

        .investment-empty p {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .investment-performance-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .investment-header {
            flex-direction: column;
          }

          .investment-history-row {
            grid-template-columns: 2fr 1fr 1fr;
          }

          .investment-history-row .history-detail:last-child {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .investment-detail-page {
            padding: 18px 0 40px;
          }

          .investment-title-row h1 {
            font-size: 23px;
          }

          .investment-actions {
            width: 100%;
          }

          .investment-actions a {
            flex: 1;
          }

          .investment-performance-grid {
            grid-template-columns: 1fr 1fr;
          }

          .investment-performance-card {
            padding: 14px;
          }

          .investment-performance-card strong {
            font-size: 15px;
          }

          .investment-performance-card.featured strong {
            font-size: 18px;
          }

          .investment-total-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .investment-total-percent {
            text-align: left;
          }

          .investment-info-grid {
            grid-template-columns: 1fr;
          }

          .investment-history-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .investment-history-row {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 14px;
          }

          .history-main {
            grid-column: 1 / -1;
          }

          .investment-history-row .history-detail:last-child {
            display: block;
          }
        }
      `}</style>
    </main>
  );
}


