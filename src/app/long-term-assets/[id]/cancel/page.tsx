"use client";

import { useEffect, useState } from "react";
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

export default function CancelLongTermAssetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
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
            purchase_transaction_id
          `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage(error?.message || "Asset not found.");
        setLoading(false);
        return;
      }

      setAsset(data as Asset);
      setLoading(false);
    }

    loadAsset();
  }, [id]);

  async function handleCancel() {
    if (!asset) {
      setMessage("Asset not found.");
      return;
    }

    if (asset.status !== "active" || asset.archived_at) {
      setMessage("Only active, unarchived assets can be cancelled.");
      return;
    }

    if (!asset.purchase_transaction_id) {
      setMessage("This asset has no purchase transaction to reverse.");
      return;
    }

    const confirmed = window.confirm(
      `Cancel "${asset.name}"?\n\nThe original purchase transaction will be reversed through the ledger and the asset will be archived as cancelled.`
    );

    if (!confirmed) {
      return;
    }

    setCancelling(true);
    setMessage("");

    const { error } = await supabase.rpc("cancel_long_term_asset", {
      p_asset_id: id,
    });

    if (error) {
      setMessage(error.message);
      setCancelling(false);
      return;
    }

    router.push(`/long-term-assets/${id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Long-Term Assets</div>
            <h1>Cancel Asset</h1>
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
            <h1>Cancel Asset</h1>
            <p>{message || "Asset not found."}</p>
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => router.push("/long-term-assets")}
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  const costBasis =
    Number(asset.purchase_price) + Number(asset.acquisition_cost);

  const canCancel =
    asset.status === "active" &&
    !asset.archived_at &&
    Boolean(asset.purchase_transaction_id);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Long-Term Assets</div>
          <h1>Cancel Asset</h1>
          <p>
            Cancel <strong>{asset.name}</strong> and reverse its original
            purchase transaction.
          </p>
        </div>
      </div>

      <section className="warning">
        <div className="warning-icon">!</div>
        <div>
          <strong>This action affects the financial ledger.</strong>
          <p>
            Cancelling this asset will reverse the original purchase
            transaction instead of deleting it. The original transaction
            remains in the audit trail, and the asset will be marked as
            cancelled and archived.
          </p>
        </div>
      </section>

      <section className="summary-card">
        <div className="summary-top">
          <div>
            <span className="label">Asset</span>
            <h2>{asset.name}</h2>
          </div>

          <span className="status">{asset.status}</span>
        </div>

        <div className="details-grid">
          <div>
            <span>Type</span>
            <strong>{formatAssetType(asset.asset_type)}</strong>
          </div>

          <div>
            <span>Purchase Date</span>
            <strong>{asset.purchase_date}</strong>
          </div>

          <div>
            <span>Purchase Price</span>
            <strong>
              {formatMoney(
                Number(asset.purchase_price),
                asset.currency
              )}
            </strong>
          </div>

          <div>
            <span>Acquisition Cost</span>
            <strong>
              {formatMoney(
                Number(asset.acquisition_cost),
                asset.currency
              )}
            </strong>
          </div>

          <div>
            <span>Cost Basis</span>
            <strong>
              {formatMoney(costBasis, asset.currency)}
            </strong>
          </div>

          <div>
            <span>Current Value</span>
            <strong>
              {formatMoney(
                Number(asset.current_value),
                asset.currency
              )}
            </strong>
          </div>
        </div>

        {asset.description && (
          <div className="description">
            <span>Description</span>
            <p>{asset.description}</p>
          </div>
        )}
      </section>

      {!canCancel && (
        <div className="message">
          This asset cannot be cancelled because it is no longer active,
          is archived, or has no purchase transaction.
        </div>
      )}

      {message && <div className="message error">{message}</div>}

      <div className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() => router.push(`/long-term-assets/${id}`)}
          disabled={cancelling}
        >
          Back
        </button>

        <button
          type="button"
          className="danger"
          onClick={handleCancel}
          disabled={!canCancel || cancelling}
        >
          {cancelling ? "Cancelling..." : "Cancel Asset"}
        </button>
      </div>

      <style jsx>{`
        .page {
          padding: 28px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .eyebrow {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
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

        .warning {
          display: flex;
          gap: 14px;
          padding: 16px;
          margin-bottom: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--background);
        }

        .warning-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fef2f2;
          color: var(--danger);
          font-weight: 800;
        }

        .warning strong {
          display: block;
          margin-bottom: 5px;
        }

        .warning p {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.55;
        }

        .summary-card {
          border: 1px solid var(--border);
          background: var(--card);
          border-radius: 12px;
          padding: 20px;
        }

        .summary-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
        }

        .label {
          display: block;
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 5px;
        }

        h2 {
          margin: 0;
          font-size: 21px;
        }

        .status {
          padding: 5px 9px;
          border-radius: 999px;
          background: #f0fdf4;
          color: var(--success);
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          padding-top: 18px;
        }

        .details-grid span,
        .description > span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 5px;
        }

        .details-grid strong {
          font-size: 15px;
        }

        .description {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--border);
        }

        .description p {
          margin: 0;
          line-height: 1.55;
        }

        .message {
          margin-top: 18px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--muted);
          font-size: 14px;
        }

        .message.error {
          color: var(--danger);
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        button {
          min-height: 38px;
          padding: 8px 15px;
          border-radius: 8px;
          border: 1px solid var(--border);
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .secondary {
          background: var(--card);
          color: inherit;
        }

        .danger {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }

        @media (max-width: 700px) {
          .page {
            padding: 18px;
          }

          h1 {
            font-size: 26px;
          }

          .details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .details-grid {
            grid-template-columns: 1fr;
          }

          .actions {
            flex-direction: column-reverse;
          }

          button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

