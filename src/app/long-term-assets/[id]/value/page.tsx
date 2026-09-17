"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Asset = {
  id: string;
  name: string;
  current_value: number;
  currency: string;
  status: string;
  archived_at: string | null;
};

export default function UpdateLongTermAssetValuePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAsset() {
      const { data, error } = await supabase
        .from("long_term_assets")
        .select(
          "id, name, current_value, currency, status, archived_at"
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage(error?.message || "Asset not found.");
        setLoading(false);
        return;
      }

      setAsset(data);
      setValue(String(data.current_value));
      setLoading(false);
    }

    loadAsset();
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const newValue = Number(value);

    if (!Number.isFinite(newValue) || newValue < 0) {
      setMessage("Enter a valid value greater than or equal to 0.");
      return;
    }

    if (!asset || asset.status !== "active" || asset.archived_at) {
      setMessage("Only active assets can be revalued.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_long_term_asset_value",
      {
        p_asset_id: id,
        p_current_value: newValue,
      }
    );

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
      <div className="page-container">
        <div className="page-header">
          <p className="eyebrow">Long-Term Assets</p>
          <h1>Update Value</h1>
        </div>

        <div className="form-card">
          <p className="muted">Loading asset...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="page-container">
        <div className="page-header">
          <p className="eyebrow">Long-Term Assets</p>
          <h1>Update Value</h1>
        </div>

        <div className="form-card">
          <p className="error-message">
            {message || "Asset not found."}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push("/long-term-assets")}
          >
            Back to Assets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <p className="eyebrow">Long-Term Assets</p>
        <h1>Update Value</h1>
        <p className="subtitle">
          Update the current market value of {asset.name}.
        </p>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="asset-summary">
          <div>
            <span className="summary-label">Asset</span>
            <strong>{asset.name}</strong>
          </div>

          <div>
            <span className="summary-label">Current Value</span>
            <strong>
              {Number(asset.current_value).toLocaleString()}{" "}
              {asset.currency}
            </strong>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="value">New Current Value</label>
          <input
            id="value"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter current value"
            required
            disabled={saving || asset.status !== "active"}
          />
        </div>

        <p className="form-note">
          Updating the value changes the asset valuation only. It does not
          create a cash transaction or change your account balance.
        </p>

        {message && <p className="error-message">{message}</p>}

        {asset.status !== "active" || asset.archived_at ? (
          <p className="error-message">
            This asset is no longer active and cannot be revalued.
          </p>
        ) : null}

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push(`/long-term-assets/${id}`)}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={
              saving ||
              asset.status !== "active" ||
              Boolean(asset.archived_at)
            }
          >
            {saving ? "Saving..." : "Update Value"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .page-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 28px 20px 48px;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .eyebrow {
          margin: 0 0 6px;
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
        }

        .subtitle {
          margin: 8px 0 0;
          color: var(--muted);
          font-size: 14px;
        }

        .form-card {
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .asset-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--muted-background);
        }

        .asset-summary div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .summary-label {
          color: var(--muted);
          font-size: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label {
          font-size: 13px;
          font-weight: 600;
        }

        input {
          width: 100%;
          min-height: 40px;
          box-sizing: border-box;
          padding: 9px 11px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font: inherit;
        }

        input:focus {
          outline: 2px solid color-mix(
            in srgb,
            var(--primary) 25%,
            transparent
          );
          border-color: var(--primary);
        }

        .form-note {
          margin: 12px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .error-message {
          margin: 14px 0 0;
          color: var(--danger);
          font-size: 13px;
        }

        .muted {
          color: var(--muted);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 24px;
        }

        button {
          min-height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .primary-button {
          border: 1px solid var(--primary);
          background: var(--primary);
          color: white;
        }

        .secondary-button {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
        }

        @media (max-width: 640px) {
          .page-container {
            padding: 22px 14px 36px;
          }

          h1 {
            font-size: 26px;
          }

          .asset-summary {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .form-actions button {
            width: 100%;
          }
        }
      `}
      </style>
    </div>
  );
}

