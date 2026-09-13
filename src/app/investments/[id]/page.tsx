import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvestmentDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: investment, error } =
    await supabase
      .from("investments")
      .select(
        "id, name, investment_type, currency, quantity, purchase_price, invested_amount, current_value, purchase_date, description, status",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

  if (error || !investment) {
    notFound();
  }

  const invested = Number(
    investment.invested_amount,
  );

  const currentValue = Number(
    investment.current_value,
  );

  const profitLoss =
    currentValue - invested;

  const profitLossPercent =
    invested > 0
      ? (profitLoss / invested) * 100
      : 0;

  const quantity =
    investment.quantity !== null
      ? Number(investment.quantity)
      : null;

  const purchasePrice =
    investment.purchase_price !== null
      ? Number(investment.purchase_price)
      : null;

  const isProfit = profitLoss >= 0;

  const purchaseDate = new Date(
    `${investment.purchase_date}T00:00:00`,
  );

  const formattedPurchaseDate =
    purchaseDate.toLocaleDateString(
      "en-BD",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/investments"
          className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
        >
          ← Back to Investments
        </Link>

        {/* Header */}
        <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor:
                      "rgba(59, 130, 246, 0.10)",
                    color:
                      "var(--primary)",
                  }}
                >
                  {investment.investment_type}
                </span>

                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor:
                      investment.status ===
                      "active"
                        ? "rgba(22, 163, 74, 0.10)"
                        : "rgba(107, 114, 128, 0.10)",
                    color:
                      investment.status ===
                      "active"
                        ? "#16a34a"
                        : "var(--muted-foreground)",
                  }}
                >
                  {investment.status}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {investment.name}
              </h1>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Investment portfolio details and performance
              </p>
            </div>

            {investment.status ===
              "active" && (
              <div className="grid grid-cols-2 gap-2 sm:w-auto">
                <Link
                  href={`/investments/${investment.id}/edit`}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]"
                >
                  Edit
                </Link>

                <Link
                  href={`/investments/${investment.id}/sell`}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{
                    backgroundColor:
                      "var(--primary)",
                  }}
                >
                  Sell
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Performance */}
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Current Value
            </p>

            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {investment.currency}{" "}
              {currentValue.toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                },
              )}
            </p>

            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Current portfolio value
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Invested
            </p>

            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {investment.currency}{" "}
              {invested.toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                },
              )}
            </p>

            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Original capital
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Profit / Loss
            </p>

            <p
              className="mt-2 text-2xl font-bold"
              style={{
                color: isProfit
                  ? "#16a34a"
                  : "var(--danger)",
              }}
            >
              {isProfit ? "+" : "-"}
              {investment.currency}{" "}
              {Math.abs(
                profitLoss,
              ).toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                },
              )}
            </p>

            <p
              className="mt-1 text-xs font-semibold"
              style={{
                color: isProfit
                  ? "#16a34a"
                  : "var(--danger)",
              }}
            >
              {isProfit ? "+" : ""}
              {profitLossPercent.toFixed(
                2,
              )}
              % return
            </p>
          </div>
        </section>

        {/* Performance bar */}
        <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Investment Performance
              </h2>

              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Return compared with original capital
              </p>
            </div>

            <strong
              className="text-sm"
              style={{
                color: isProfit
                  ? "#16a34a"
                  : "var(--danger)",
              }}
            >
              {isProfit ? "+" : ""}
              {profitLossPercent.toFixed(
                2,
              )}
              %
            </strong>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(
                  Math.max(
                    Math.abs(
                      profitLossPercent,
                    ),
                    2,
                  ),
                  100,
                )}%`,
                backgroundColor:
                  isProfit
                    ? "#16a34a"
                    : "var(--danger)",
              }}
            />
          </div>
        </section>

        {/* Financial Details */}
        <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Financial Details
            </h2>

            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Capital and valuation information
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-y-0">
            <div className="px-5 py-4 sm:border-r sm:border-[var(--border)] sm:px-6">
              <p className="text-xs text-[var(--muted-foreground)]">
                Original Investment
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {investment.currency}{" "}
                {invested.toLocaleString(
                  "en-BD",
                  {
                    minimumFractionDigits: 2,
                  },
                )}
              </p>
            </div>

            <div className="px-5 py-4 sm:px-6">
              <p className="text-xs text-[var(--muted-foreground)]">
                Current Value
              </p>

              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {investment.currency}{" "}
                {currentValue.toLocaleString(
                  "en-BD",
                  {
                    minimumFractionDigits: 2,
                  },
                )}
              </p>
            </div>

            {quantity !== null && (
              <div className="border-t border-[var(--border)] px-5 py-4 sm:border-r sm:px-6">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Quantity
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {quantity.toLocaleString(
                    "en-BD",
                  )}
                </p>
              </div>
            )}

            {purchasePrice !== null && (
              <div className="border-t border-[var(--border)] px-5 py-4 sm:px-6">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Purchase Price
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {investment.currency}{" "}
                  {purchasePrice.toLocaleString(
                    "en-BD",
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Investment Information */}
        <section className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Investment Information
            </h2>
          </div>

          <div className="divide-y divide-[var(--border)]">
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <span className="text-xs text-[var(--muted-foreground)]">
                Investment Type
              </span>

              <strong className="text-sm capitalize text-[var(--foreground)]">
                {investment.investment_type}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <span className="text-xs text-[var(--muted-foreground)]">
                Purchase Date
              </span>

              <strong className="text-sm text-[var(--foreground)]">
                {formattedPurchaseDate}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <span className="text-xs text-[var(--muted-foreground)]">
                Currency
              </span>

              <strong className="text-sm text-[var(--foreground)]">
                {investment.currency}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <span className="text-xs text-[var(--muted-foreground)]">
                Status
              </span>

              <strong
                className="text-sm capitalize"
                style={{
                  color:
                    investment.status ===
                    "active"
                      ? "#16a34a"
                      : "var(--muted-foreground)",
                }}
              >
                {investment.status}
              </strong>
            </div>
          </div>
        </section>

        {/* Description */}
        {investment.description && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              Description
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
              {investment.description}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
