"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
};

type Account = {
  id: string;
  name: string;
  currency: string;
  account_type: string;
  is_system: boolean;
  is_archived: boolean;
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

export default function SellLongTermAssetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const { data: assetData, error: assetError } = await supabase
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
            archived_at
          `
        )
        .eq("id", id)
        .single();

      if (assetError || !assetData) {
        setMessage(assetError?.message || "Asset not found.");
        setLoading(false);
        return;
      }

      setAsset(assetData as Asset);

      const today = new Date().toISOString().slice(0, 10);
      setSaleDate(today);
      setSalePrice(String(Number(assetData.current_value)));

      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select(
          "id, name, currency, account_type, is_system, is_archived"
        )
        .eq("currency", assetData.currency)
        .eq("is_archived", false)
        .eq("is_system", false)
        .in("account_type", ["asset", "liability"])
        .order("name", { ascending: true });

      if (accountError) {
        setMessage(accountError.message);
      } else {
        setAccounts((accountData || []) as Account[]);
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  const costBasis = useMemo(() => {
    if (!asset) return 0;
    return Number(asset.purchase_price) + Number(asset.acquisition_cost);
  }, [asset]);

  const saleAmount = Number(salePrice);
  const estimatedGainLoss = Number.isFinite(saleAmount)
    ? saleAmount - costBasis
    : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!asset) {
      setMessage("Asset not found.");
      return;
    }

    if (asset.status !== "active" || asset.archived_at) {
      setMessage("Only active, unarchived assets can be sold.");
      return;
    }

    if (!salePrice.trim()) {
      setMessage("Enter the sale price.");
      return;
    }

    const price = Number(salePrice);

    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Sale price must be greater than 0.");
      return;
    }

    if (!saleDate) {
      setMessage("Select the sale date.");
      return;
    }

    if (!destinationAccountId) {
      setMessage("Select the account receiving the sale proceeds.");
      return;
    }

    const destinationAccount = accounts.find(
      (account) => account.id === destinationAccountId
    );

    if (!destinationAccount) {
      setMessage("Selected destination account is invalid.");
      return;
    }

    if (destinationAccount.currency !== asset.currency) {
      setMessage("Destination account currency must match the asset currency.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("sell_long_term_asset", {
      p_asset_id: id,
      p_sale_price: price,
      p_sale_date: saleDate,
      p_destination_account_id: destinationAccountId,
      p_description: description.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
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
            <h1>Sell Asset</h1>
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
            <h1>Sell Asset</h1>
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

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Long-Term Assets</div>
          <h1>Sell Asset</h1>
          <p>
            Record the sale of <strong>{asset.name}</strong>.
          </p>
        </div>
      </div>

      <section className="summary-grid">
        <div className="summary-card">
          <span>Asset</span>
          <strong>{asset.name}</strong>
        </div>

        <div className="summary-card">
          <span>Cost Basis</span>
          <strong>
            {formatMoney(costBasis, asset.currency)}
          </strong>
        </div>

        <div className="summary-card">
          <span>Current Value</span>
          <strong>
            {formatMoney(Number(asset.current_value), asset.currency)}
          </strong>
        </div>

        <div className="summary-card">
          <span>Type</span>
          <strong>{formatAssetType(asset.asset_type)}</strong>
        </div>
      </section>

      <section className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Sale Price</span>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </label>

            <label>
              <span>Sale Date</span>
              <input
                type="date"
                value={saleDate}
                onChange={(event) => setSaleDate(event.target.value)}
                disabled={saving}
              />
            </label>

            <label className="full">
              <span>Deposit To</span>
              <select
                value={destinationAccountId}
                onChange={(event) =>
                  setDestinationAccountId(event.target.value)
                }
                disabled={saving}
              >
                <option value="">
                  Select destination account
                </option>

                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {account.currency}
                  </option>
                ))}
              </select>
            </label>

            <label className="full">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Optional sale details"
                rows={4}
                disabled={saving}
              />
            </label>
          </div>

          <div className="estimate">
            <div>
              <span>Cost Basis</span>
              <strong>
                {formatMoney(costBasis, asset.currency)}
              </strong>
            </div>

            <div>
              <span>Sale Price</span>
              <strong>
                {Number.isFinite(saleAmount)
                  ? formatMoney(saleAmount, asset.currency)
                  : formatMoney(0, asset.currency)}
              </strong>
            </div>

            <div>
              <span>
                {estimatedGainLoss >= 0
                  ? "Estimated Gain"
                  : "Estimated Loss"}
              </span>
              <strong>
                {formatMoney(
                  Math.abs(estimatedGainLoss),
                  asset.currency
                )}
              </strong>
            </div>
          </div>

          {message && <div className="message">{message}</div>}

          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() => router.push(`/long-term-assets/${id}`)}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Selling..." : "Sell Asset"}
            </button>
          </div>
        </form>
      </section>

      <style jsx>{`
        .page {
          padding: 28px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
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

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .summary-card {
          border: 1px solid var(--border);
          background: var(--card);
          border-radius: 12px;
          padding: 18px;
        }

        .summary-card span {
          display: block;
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 7px;
        }

        .summary-card strong {
          display: block;
          font-size: 18px;
          line-height: 1.3;
        }

        .form-card {
          border: 1px solid var(--border);
          background: var(--card);
          border-radius: 12px;
          padding: 22px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label.full {
          grid-column: 1 / -1;
        }

        label span {
          font-size: 13px;
          font-weight: 600;
        }

        input,
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--border);
          background: var(--background);
          color: inherit;
          border-radius: 8px;
          padding: 10px 12px;
          font: inherit;
          outline: none;
        }

        input,
        select {
          height: 40px;
        }

        textarea {
          resize: vertical;
          min-height: 96px;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: var(--primary);
        }

        .estimate {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 22px;
          padding: 16px;
          border-radius: 10px;
          background: var(--background);
          border: 1px solid var(--border);
        }

        .estimate div {
          min-width: 0;
        }

        .estimate span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 5px;
        }

        .estimate strong {
          font-size: 16px;
        }

        .message {
          margin-top: 18px;
          padding: 11px 13px;
          border-radius: 8px;
          border: 1px solid var(--border);
          color: var(--danger);
          background: var(--background);
          font-size: 14px;
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

        .primary {
          color: white;
          background: var(--primary);
          border-color: var(--primary);
        }

        .secondary {
          background: var(--card);
          color: inherit;
        }

        @media (max-width: 900px) {
          .page {
            padding: 20px;
          }

          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 16px;
          }

          h1 {
            font-size: 26px;
          }

          .summary-grid,
          .form-grid,
          .estimate {
            grid-template-columns: 1fr;
          }

          label.full {
            grid-column: auto;
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

