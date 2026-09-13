import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    filter?: string;
    sort?: string;
  }>;
};

type Investment = {
  id: string;
  name: string;
  investment_type: string;
  currency: string;
  invested_amount: number | string;
  current_value: number | string;
  purchase_date: string;
  status: string;
};

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
  })}`;
}

function getProfit(
  investment: Investment,
) {
  return (
    Number(investment.current_value) -
    Number(investment.invested_amount)
  );
}

export default async function InvestmentsPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const filter = params.filter ?? "all";
  const sort = params.sort ?? "newest";

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("investments")
    .select(
      "id, name, investment_type, currency, invested_amount, current_value, purchase_date, status",
    )
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []) as Investment[];

  const investmentTypes = Array.from(
    new Set(
      items
        .map((investment) => investment.investment_type)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const filteredItems = items.filter((investment) => {
    if (filter === "all") {
      return true;
    }

    return investment.investment_type === filter;
  });

  const sortedItems = [...filteredItems].sort(
    (a, b) => {
      const aInvested = Number(
        a.invested_amount,
      );

      const bInvested = Number(
        b.invested_amount,
      );

      const aValue = Number(
        a.current_value,
      );

      const bValue = Number(
        b.current_value,
      );

      const aProfit =
        aValue - aInvested;

      const bProfit =
        bValue - bInvested;

      switch (sort) {
        case "oldest":
          return (
            new Date(a.purchase_date).getTime() -
            new Date(b.purchase_date).getTime()
          );

        case "highest-value":
          return bValue - aValue;

        case "lowest-value":
          return aValue - bValue;

        case "highest-profit":
          return bProfit - aProfit;

        case "lowest-profit":
          return aProfit - bProfit;

        case "name-az":
          return a.name.localeCompare(b.name);

        case "name-za":
          return b.name.localeCompare(a.name);

        case "newest":
        default:
          return (
            new Date(b.purchase_date).getTime() -
            new Date(a.purchase_date).getTime()
          );
      }
    },
  );

  const totalInvested =
    filteredItems.reduce(
      (sum, investment) =>
        sum +
        Number(investment.invested_amount),
      0,
    );

  const totalValue =
    filteredItems.reduce(
      (sum, investment) =>
        sum +
        Number(investment.current_value),
      0,
    );

  const profitLoss =
    totalValue - totalInvested;

  const profitLossPercent =
    totalInvested > 0
      ? (profitLoss / totalInvested) * 100
      : 0;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              Portfolio
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Investments
            </h1>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Track your invested money and portfolio performance.
            </p>
          </div>

          <Link
            href="/investments/new"
            className="inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
            style={{
              backgroundColor:
                "var(--primary)",
            }}
          >
            + New Investment
          </Link>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Total Invested
            </p>

            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              ৳
              {totalInvested.toLocaleString(
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
              Current Value
            </p>

            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              ৳
              {totalValue.toLocaleString(
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

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Profit / Loss
            </p>

            <p
              className="mt-2 text-2xl font-bold"
              style={{
                color:
                  profitLoss > 0
                    ? "#16a34a"
                    : profitLoss < 0
                      ? "var(--danger)"
                      : "var(--foreground)",
              }}
            >
              {profitLoss >= 0
                ? "+"
                : "-"}
              ৳
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
              className="mt-1 text-xs font-medium"
              style={{
                color:
                  profitLoss > 0
                    ? "#16a34a"
                    : profitLoss < 0
                      ? "var(--danger)"
                      : "var(--muted-foreground)",
              }}
            >
              {profitLoss >= 0
                ? "+"
                : ""}
              {profitLossPercent.toFixed(
                2,
              )}
              % return
            </p>
          </div>
        </section>

        <form
          method="GET"
          className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label
                htmlFor="filter"
                className="mb-1.5 block text-xs font-semibold text-[var(--muted-foreground)]"
              >
                Filter
              </label>

              <select
                id="filter"
                name="filter"
                defaultValue={filter}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
              >
                <option value="all">
                  All investments
                </option>

                {investmentTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="sort"
                className="mb-1.5 block text-xs font-semibold text-[var(--muted-foreground)]"
              >
                Sort
              </label>

              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
              >
                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="highest-value">
                  Highest current value
                </option>

                <option value="lowest-value">
                  Lowest current value
                </option>

                <option value="highest-profit">
                  Highest profit
                </option>

                <option value="lowest-profit">
                  Lowest profit
                </option>

                <option value="name-az">
                  Name A–Z
                </option>

                <option value="name-za">
                  Name Z–A
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{
                  backgroundColor:
                    "var(--primary)",
                }}
              >
                Apply
              </button>

              <Link
                href="/investments"
                className="flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]"
              >
                Reset
              </Link>
            </div>
          </div>
        </form>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">
              Your Investments
            </h2>

            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Showing{" "}
              {sortedItems.length} of{" "}
              {items.length} active{" "}
              {items.length === 1
                ? "investment"
                : "investments"}
            </p>
          </div>

          {sortedItems.length === 0 ? (
            <div className="px-5 py-12 text-center sm:px-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--background)] text-xl">
                📈
              </div>

              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                No investments found
              </h3>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Try changing your filter
                or add a new investment.
              </p>

              <Link
                href="/investments/new"
                className="mt-5 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{
                  backgroundColor:
                    "var(--primary)",
                }}
              >
                + Add Investment
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {sortedItems.map(
                (investment) => {
                  const invested =
                    Number(
                      investment.invested_amount,
                    );

                  const value =
                    Number(
                      investment.current_value,
                    );

                  const profit =
                    value - invested;

                  const returnPercent =
                    invested > 0
                      ? (profit /
                          invested) *
                        100
                      : 0;

                  return (
                    <Link
                      key={investment.id}
                      href={`/investments/${investment.id}`}
                      className="block px-5 py-5 transition hover:bg-[var(--background)] sm:px-6"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
                              {investment.name}
                            </h3>

                            <p className="mt-1 text-xs capitalize text-[var(--muted-foreground)]">
                              {
                                investment.investment_type
                              }
                            </p>
                          </div>

                          <span
                            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                            style={{
                              backgroundColor:
                                profit >=
                                0
                                  ? "rgba(22, 163, 74, 0.10)"
                                  : "rgba(220, 38, 38, 0.10)",
                              color:
                                profit >=
                                0
                                  ? "#16a34a"
                                  : "var(--danger)",
                            }}
                          >
                            {profit >=
                            0
                              ? "PROFIT"
                              : "LOSS"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                              Current Value
                            </p>

                            <p className="mt-1 text-sm font-bold text-[var(--foreground)]">
                              {formatMoney(
                                value,
                                investment.currency,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                              Invested
                            </p>

                            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                              {formatMoney(
                                invested,
                                investment.currency,
                              )}
                            </p>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                              Profit / Loss
                            </p>

                            <p
                              className="mt-1 text-sm font-semibold"
                              style={{
                                color:
                                  profit >=
                                  0
                                    ? "#16a34a"
                                    : "var(--danger)",
                              }}
                            >
                              {profit >=
                              0
                                ? "+"
                                : "-"}
                              {formatMoney(
                                Math.abs(
                                  profit,
                                ),
                                investment.currency,
                              )}

                              <span className="ml-1 text-xs">
                                (
                                {returnPercent >=
                                0
                                  ? "+"
                                  : ""}
                                {returnPercent.toFixed(
                                  2,
                                )}
                                %)
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

