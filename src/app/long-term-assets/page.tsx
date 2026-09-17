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

function formatAssetType(type: string) {
  return type.replace("_", " ");
}

function formatPercent(
  currentValue: number,
  costBasis: number,
) {
  if (costBasis <= 0) return 0;

  return (
    ((currentValue - costBasis) /
      costBasis) *
    100
  );
}

export default async function LongTermAssetsPage({
  searchParams,
}: Props) {
  const {
    filter = "active",
    type = "all",
    sort = "newest",
  } = await searchParams;

  const supabase = await createClient();

  const {
    data: assets,
    error,
  } = await supabase
    .from("long_term_assets")
    .select(
      `
        id,
        name,
        asset_type,
        currency,
        purchase_date,
        purchase_price,
        acquisition_cost,
        current_value,
        description,
        status,
        archived_at,
        created_at
      `,
    );

  if (error) {
    return (
      <main>
        <div className="long-term-asset-error">
          Unable to load long-term assets.
        </div>
      </main>
    );
  }

  const allAssets = assets ?? [];

  const filteredAssets = allAssets.filter((asset) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? asset.status === "active" &&
            !asset.archived_at
          : filter === "sold"
            ? asset.status === "sold" &&
              !asset.archived_at
            : filter === "cancelled"
              ? asset.status === "cancelled"
              : filter === "archived"
                ? !!asset.archived_at
                : true;

    const matchesType =
      type === "all" ||
      asset.asset_type === type;

    return matchesFilter && matchesType;
  });

  const sortedAssets = [...filteredAssets].sort(
    (a, b) => {
      const aCost =
        Number(a.purchase_price) +
        Number(a.acquisition_cost);

      const bCost =
        Number(b.purchase_price) +
        Number(b.acquisition_cost);

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

        case "cost-high":
          return bCost - aCost;

        case "cost-low":
          return aCost - bCost;

        case "value-growth-high":
          return (
            Number(b.current_value) -
            bCost -
            (Number(a.current_value) - aCost)
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
    },
  );

  const activeAssets = allAssets.filter(
    (asset) =>
      asset.status === "active" &&
      !asset.archived_at,
  );

  const soldAssets = allAssets.filter(
    (asset) =>
      asset.status === "sold" &&
      !asset.archived_at,
  );

  const cancelledAssets = allAssets.filter(
    (asset) => asset.status === "cancelled",
  );

  const archivedAssets = allAssets.filter(
    (asset) => asset.archived_at,
  );

  return (
    <main>
      <div className="long-term-asset-page-header">
        <div>
          <p className="long-term-asset-eyebrow">
            Wealth & long-term holdings
          </p>

          <h1>Long-Term Assets</h1>

          <p className="long-term-asset-subtitle">
            Track land, property and other long-term
            assets outside your trading portfolio.
          </p>
        </div>

        <Link
          href="/long-term-assets/new"
          className="long-term-asset-primary-button"
        >
          + New Asset
        </Link>
      </div>

      <section className="long-term-asset-summary-grid">
        <div className="long-term-asset-summary-card">
          <span>Active Assets</span>
          <strong>
            {activeAssets.length}
          </strong>
        </div>

        <div className="long-term-asset-summary-card">
          <span>Sold Assets</span>
          <strong>
            {soldAssets.length}
          </strong>
        </div>

        <div className="long-term-asset-summary-card">
          <span>Cancelled</span>
          <strong>
            {cancelledAssets.length}
          </strong>
        </div>

        <div className="long-term-asset-summary-card">
          <span>Total Assets</span>
          <strong>
            {allAssets.length}
          </strong>
        </div>
      </section>

      <section className="long-term-asset-section">
        <div className="long-term-asset-section-header">
          <div>
            <h2>Asset Portfolio</h2>

            <p>
              {sortedAssets.length} asset
              {sortedAssets.length === 1
                ? ""
                : "s"} shown
            </p>
          </div>

          <form
            method="GET"
            className="long-term-asset-filter-form"
          >
            <label htmlFor="asset-filter">
              Status
            </label>

            <select
              id="asset-filter"
              name="filter"
              defaultValue={filter}
            >
              <option value="active">
                Active
              </option>

              <option value="sold">
                Sold
              </option>

              <option value="cancelled">
                Cancelled
              </option>

              <option value="archived">
                Archived
              </option>

              <option value="all">
                All
              </option>
            </select>

            <label htmlFor="asset-type">
              Type
            </label>

            <select
              id="asset-type"
              name="type"
              defaultValue={type}
            >
              <option value="all">
                All types
              </option>

              <option value="land">
                Land
              </option>

              <option value="property">
                Property
              </option>

              <option value="commercial_property">
                Commercial Property
              </option>

              <option value="other">
                Other
              </option>
            </select>

            <label htmlFor="asset-sort">
              Sort
            </label>

            <select
              id="asset-sort"
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

              <option value="cost-high">
                Highest cost
              </option>

              <option value="cost-low">
                Lowest cost
              </option>

              <option value="value-growth-high">
                Highest growth
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
              className="long-term-asset-form-button"
            >
              Apply
            </button>

            <Link
              href="/long-term-assets"
              className="long-term-asset-form-button long-term-asset-reset-button"
            >
              Reset
            </Link>
          </form>
        </div>

        {sortedAssets.length === 0 ? (
          <div className="long-term-asset-empty">
            <h3>No long-term assets found</h3>

            <p>
              Try another filter or create a new
              long-term asset.
            </p>
          </div>
        ) : (
          <div className="long-term-asset-list">
            {sortedAssets.map((asset) => {
              const purchasePrice =
                Number(asset.purchase_price);

              const acquisitionCost =
                Number(asset.acquisition_cost);

              const costBasis =
                purchasePrice +
                acquisitionCost;

              const currentValue =
                Number(asset.current_value);

              const valueChange =
                currentValue - costBasis;

              const returnPercent =
                formatPercent(
                  currentValue,
                  costBasis,
                );

              return (
                <article
                  key={asset.id}
                  className="long-term-asset-card"
                >
                  <div className="long-term-asset-card-top">
                    <div>
                      <Link
                        href={`/long-term-assets/${asset.id}`}
                        className="long-term-asset-name"
                      >
                        {asset.name}
                      </Link>

                      <span className="long-term-asset-type">
                        {formatAssetType(
                          asset.asset_type,
                        )}
                      </span>
                    </div>

                    <span
                      className={`long-term-asset-status long-term-asset-status-${asset.status}`}
                    >
                      {asset.archived_at
                        ? "Archived"
                        : asset.status === "sold"
                          ? "Sold"
                          : asset.status ===
                              "cancelled"
                            ? "Cancelled"
                            : "Active"}
                    </span>
                  </div>

                  <div className="long-term-asset-date">
                    Purchased{" "}
                    {formatDate(
                      asset.purchase_date,
                    )}
                  </div>

                  <div className="long-term-asset-financial">
                    <div>
                      <span>
                        Current Value
                      </span>

                      <strong>
                        {formatAmount(
                          currentValue,
                          asset.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Cost Basis</span>

                      <strong>
                        {formatAmount(
                          costBasis,
                          asset.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Value Change</span>

                      <strong>
                        {valueChange >= 0
                          ? "+"
                          : ""}
                        {formatAmount(
                          valueChange,
                          asset.currency,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="long-term-asset-extra">
                    <span>
                      Purchase:{" "}
                      {formatAmount(
                        purchasePrice,
                        asset.currency,
                      )}
                    </span>

                    <span>
                      Growth:{" "}
                      {returnPercent >= 0
                        ? "+"
                        : ""}
                      {returnPercent.toFixed(
                        2,
                      )}
                      %
                    </span>
                  </div>

                  <div className="long-term-asset-card-footer">
                    <Link
                      href={`/long-term-assets/${asset.id}`}
                      className="long-term-asset-view-button"
                    >
                      View
                    </Link>

                    {asset.status ===
                        "active" &&
                      !asset.archived_at && (
                        <Link
                          href={`/long-term-assets/${asset.id}/edit`}
                          className="long-term-asset-action-button"
                        >
                          Edit
                        </Link>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .long-term-asset-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 28px;
        }

        .long-term-asset-eyebrow {
          margin: 0 0 6px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .long-term-asset-page-header h1 {
          margin: 0;
        }

        .long-term-asset-subtitle {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .long-term-asset-primary-button {
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

        .long-term-asset-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 32px;
        }

        .long-term-asset-summary-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .long-term-asset-summary-card span {
          display: block;
          margin-bottom: 8px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
        }

        .long-term-asset-summary-card strong {
          font-size: 27px;
        }

        .long-term-asset-section {
          margin-top: 32px;
        }

        .long-term-asset-section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 14px;
        }

        .long-term-asset-section-header h2 {
          margin: 0;
          font-size: 15px !important;
          font-weight: 700 !important;
        }

        .long-term-asset-section-header p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .long-term-asset-filter-form {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .long-term-asset-filter-form label {
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
        }

        .long-term-asset-filter-form select {
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

        .long-term-asset-form-button {
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

        .long-term-asset-form-button[type="submit"] {
          background: var(--primary);
          color: white;
        }

        .long-term-asset-reset-button {
          background: var(--card);
          color: var(--foreground);
        }

        .long-term-asset-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .long-term-asset-card {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .long-term-asset-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .long-term-asset-name {
          display: block;
          color: var(--foreground);
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
        }

        .long-term-asset-type {
          display: block;
          margin-top: 3px;
          color: var(--muted);
          font-size: 11px;
          text-transform: capitalize;
        }

        .long-term-asset-status {
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .long-term-asset-status-active {
          background: #f0fdf4;
          color: var(--success);
        }

        .long-term-asset-status-sold {
          background: var(--muted-background);
          color: var(--muted);
        }

        .long-term-asset-status-cancelled {
          background: #fef2f2;
          color: var(--danger);
        }

        .long-term-asset-date {
          margin-top: 12px;
          color: var(--muted);
          font-size: 10px;
        }

        .long-term-asset-financial {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 14px;
          margin-top: 22px;
        }

        .long-term-asset-financial span {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 10px;
        }

        .long-term-asset-financial strong {
          font-size: 13px;
        }

        .long-term-asset-financial > div:first-child strong {
          font-size: 19px;
        }

        .long-term-asset-extra {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 16px;
          color: var(--muted);
          font-size: 10px;
        }

        .long-term-asset-card-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
        }

        .long-term-asset-view-button,
        .long-term-asset-action-button {
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

        .long-term-asset-view-button {
          color: var(--foreground);
          border: 1px solid var(--border);
        }

        .long-term-asset-action-button {
          border: 0;
          background: var(--primary);
          color: white;
        }

        .long-term-asset-empty,
        .long-term-asset-error {
          padding: 30px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
          color: var(--muted);
        }

        .long-term-asset-empty h3 {
          margin: 0;
          color: var(--foreground);
          font-size: 15px;
        }

        .long-term-asset-empty p {
          margin: 6px 0 0;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .long-term-asset-summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .long-term-asset-list {
            grid-template-columns: 1fr;
          }

          .long-term-asset-section-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}

