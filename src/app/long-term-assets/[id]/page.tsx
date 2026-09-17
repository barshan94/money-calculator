"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  name: string;
  asset_type: string;
  currency: string;
  purchase_date: string;
  purchase_price: number;
  acquisition_cost: number;
  current_value: number;
  description: string | null;
  status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  purchase_transaction_id: string | null;
};

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAssetType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function LongTermAssetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAsset() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
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
          created_at,
          updated_at,
          purchase_transaction_id
        `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      setMessage(error?.message || "Asset not found.");
      setAsset(null);
      setLoading(false);
      return;
    }

    setAsset(data as Asset);
    setLoading(false);
  }

  useEffect(() => {
    loadAsset();
  }, [id]);

  const costBasis = useMemo(() => {
    if (!asset) return 0;

    return (
      Number(asset.purchase_price) +
      Number(asset.acquisition_cost)
    );
  }, [asset]);

  const valueChange = asset
    ? Number(asset.current_value) - costBasis
    : 0;

  const canManage =
    asset?.status === "active" && !asset.archived_at;

  if (loading) {
    return (
      <main className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Long-Term Assets</div>
            <h1>Asset Details</h1>
            <p>Loading asset...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!asset) {
    return (
      <main className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Long-Term Assets</div>
            <h1>Asset Details</h1>
            <p>{message || "Asset not found."}</p>
          </div>
        </div>

        <Link href="/long-term-assets" className="button secondary">
          Back to Assets
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Long-Term Assets</div>
          <h1>{asset.name}</h1>
          <p>
            {formatAssetType(asset.asset_type)} ·{" "}
            {asset.currency}
          </p>
        </div>

        <div className="header-actions">
          <Link
            href="/long-term-assets"
            className="button secondary"
          >
            Back
          </Link>

          {canManage && (
            <Link
              href={`/long-term-assets/${id}/edit`}
              className="button primary"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <section className="hero-card">
        <div>
          <span>Current Value</span>
          <strong className="hero-value">
            {formatMoney(
              Number(asset.current_value),
              asset.currency
            )}
          </strong>
        </div>

        <div
          className={
            valueChange >= 0 ? "change positive" : "change negative"
          }
        >
          <span>
            {valueChange >= 0 ? "Value Gain" : "Value Loss"}
          </span>

          <strong>
            {formatMoney(
              Math.abs(valueChange),
              asset.currency
            )}
          </strong>
        </div>

        <div>
          <span>Status</span>
          <strong>
            <span className={`status ${asset.status}`}>
              {asset.status}
            </span>
          </strong>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div>
            <h2>Financial Details</h2>
            <p>Purchase and valuation information.</p>
          </div>
        </div>

        <div className="details-grid">
          <div className="detail">
            <span>Purchase Price</span>
            <strong>
              {formatMoney(
                Number(asset.purchase_price),
                asset.currency
              )}
            </strong>
          </div>

          <div className="detail">
            <span>Acquisition Cost</span>
            <strong>
              {formatMoney(
                Number(asset.acquisition_cost),
                asset.currency
              )}
            </strong>
          </div>

          <div className="detail">
            <span>Cost Basis</span>
            <strong>
              {formatMoney(costBasis, asset.currency)}
            </strong>
          </div>

          <div className="detail">
            <span>Current Value</span>
            <strong>
              {formatMoney(
                Number(asset.current_value),
                asset.currency
              )}
            </strong>
          </div>

          <div className="detail">
            <span>Purchase Date</span>
            <strong>{asset.purchase_date}</strong>
          </div>

          <div className="detail">
            <span>Currency</span>
            <strong>{asset.currency}</strong>
          </div>
        </div>
      </section>

      {asset.description && (
        <section className="section">
          <div className="section-title">
            <div>
              <h2>Description</h2>
            </div>
          </div>

          <div className="description">
            {asset.description}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-title">
          <div>
            <h2>Ledger Reference</h2>
            <p>Original purchase transaction information.</p>
          </div>
        </div>

        <div className="ledger-card">
          <span>Purchase Transaction ID</span>

          <strong>
            {asset.purchase_transaction_id || "Not available"}
          </strong>
        </div>
      </section>

      {canManage && (
        <section className="section">
          <div className="section-title">
            <div>
              <h2>Asset Actions</h2>
              <p>Manage valuation and lifecycle.</p>
            </div>
          </div>

          <div className="action-grid">
            <Link
              href={`/long-term-assets/${id}/value`}
              className="action-card"
            >
              <strong>Update Value</strong>
              <span>
                Record the latest estimated market value.
              </span>
            </Link>

            <Link
              href={`/long-term-assets/${id}/sell`}
              className="action-card"
            >
              <strong>Sell Asset</strong>
              <span>
                Record a sale and receive the proceeds.
              </span>
            </Link>

            <Link
              href={`/long-term-assets/${id}/cancel`}
              className="action-card danger-card"
            >
              <strong>Cancel Asset</strong>
              <span>
                Reverse the original purchase through the ledger.
              </span>
            </Link>
          </div>
        </section>
      )}

      {asset.status === "sold" && (
        <section className="notice">
          <strong>This asset has been sold.</strong>
          <p>
            It is archived and no longer available for valuation,
            editing, selling, or cancellation.
          </p>
        </section>
      )}

      {asset.status === "cancelled" && (
        <section className="notice cancelled-notice">
          <strong>This asset has been cancelled.</strong>
          <p>
            The original purchase transaction was reversed through
            the ledger.
          </p>
        </section>
      )}

      {message && <div className="error">{message}</div>}

      <style jsx>{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px;
        }

        .page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          margin-bottom: 6px;
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
        }

        .page-header p {
          margin: 8px 0 0;
          color: var(--muted);
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 7px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }

        .primary {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .secondary {
          background: var(--card);
          color: inherit;
        }

        .hero-card {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 16px;
          padding: 22px;
          margin-bottom: 20px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .hero-card > div {
          min-width: 0;
        }

        .hero-card span:not(.status) {
          display: block;
          margin-bottom: 7px;
          color: var(--muted);
          font-size: 13px;
        }

        .hero-value {
          display: block;
          font-size: 30px;
        }

        .change strong {
          font-size: 18px;
        }

        .positive strong {
          color: var(--success);
        }

        .negative strong {
          color: var(--danger);
        }

        .status {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .status.active {
          background: #f0fdf4;
          color: var(--success);
        }

        .status.sold {
          background: var(--muted-background);
          color: var(--muted);
        }

        .status.cancelled {
          background: #fef2f2;
          color: var(--danger);
        }

        .section {
          margin-bottom: 20px;
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .section-title {
          margin-bottom: 18px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 18px;
        }

        .section-title p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .detail span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 12px;
        }

        .detail strong {
          font-size: 15px;
        }

        .description {
          color: inherit;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .ledger-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: var(--background);
        }

        .ledger-card span {
          color: var(--muted);
          font-size: 13px;
        }

        .ledger-card strong {
          max-width: 65%;
          overflow-wrap: anywhere;
          font-size: 13px;
          font-family: monospace;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .action-card {
          display: block;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          color: inherit;
          text-decoration: none;
        }

        .action-card:hover {
          border-color: var(--primary);
        }

        .action-card strong {
          display: block;
          margin-bottom: 6px;
          font-size: 15px;
        }

        .action-card span {
          display: block;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.45;
        }

        .danger-card strong {
          color: var(--danger);
        }

        .notice {
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--background);
        }

        .notice strong {
          display: block;
          margin-bottom: 5px;
        }

        .notice p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .cancelled-notice strong {
          color: var(--danger);
        }

        .error {
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--danger);
          font-size: 14px;
        }

        @media (max-width: 800px) {
          .page {
            padding: 20px;
          }

          .hero-card {
            grid-template-columns: 1fr 1fr;
          }

          .details-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 16px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .button {
            flex: 1;
          }

          h1 {
            font-size: 26px;
          }

          .hero-card,
          .details-grid {
            grid-template-columns: 1fr;
          }

          .hero-value {
            font-size: 26px;
          }

          .ledger-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .ledger-card strong {
            max-width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

