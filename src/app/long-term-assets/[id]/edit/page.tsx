"use client";

import { FormEvent, useEffect, useState } from "react";
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

export default function EditLongTermAssetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("land");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
            archived_at
          `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage(error?.message || "Asset not found.");
        setLoading(false);
        return;
      }

      const loadedAsset = data as Asset;

      setAsset(loadedAsset);
      setName(loadedAsset.name);
      setAssetType(loadedAsset.asset_type);
      setDescription(loadedAsset.description || "");

      setLoading(false);
    }

    loadAsset();
  }, [id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!asset) {
      setMessage("Asset not found.");
      return;
    }

    if (asset.status !== "active" || asset.archived_at) {
      setMessage("Only active, unarchived assets can be edited.");
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage("Asset name is required.");
      return;
    }

    if (trimmedName.length > 150) {
      setMessage("Asset name must be 150 characters or fewer.");
      return;
    }

    if (
      ![
        "land",
        "property",
        "commercial_property",
        "other",
      ].includes(assetType)
    ) {
      setMessage("Select a valid asset type.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("update_long_term_asset", {
      p_asset_id: id,
      p_name: trimmedName,
      p_asset_type: assetType,
      p_purchase_date: asset.purchase_date,
      p_purchase_price: Number(asset.purchase_price),
      p_acquisition_cost: Number(asset.acquisition_cost),
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
            <h1>Edit Asset</h1>
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
            <h1>Edit Asset</h1>
            <p>{message || "Asset not found."}</p>
          </div>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={() => router.push("/long-term-assets")}
        >
          Back
        </button>
      </main>
    );
  }

  const canEdit = asset.status === "active" && !asset.archived_at;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Long-Term Assets</div>
          <h1>Edit Asset</h1>
          <p>Update the descriptive information for this asset.</p>
        </div>
      </div>

      <section className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Asset Name</span>
              <input
                type="text"
                value={name}
                maxLength={150}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Family Land"
                disabled={saving || !canEdit}
              />
            </label>

            <label>
              <span>Asset Type</span>
              <select
                value={assetType}
                onChange={(event) => setAssetType(event.target.value)}
                disabled={saving || !canEdit}
              >
                <option value="land">Land</option>
                <option value="property">Property</option>
                <option value="commercial_property">
                  Commercial Property
                </option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="full">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Optional description"
                rows={5}
                disabled={saving || !canEdit}
              />
            </label>
          </div>

          <div className="read-only">
            <strong>Financial details are locked</strong>
            <p>
              Purchase price, acquisition cost, purchase date, currency,
              and current value are not editable here. This keeps the
              original purchase transaction and ledger history consistent.
            </p>
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

            <button
              type="submit"
              className="primary"
              disabled={saving || !canEdit}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <style jsx>{`
        .page {
          padding: 28px;
          max-width: 900px;
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
          min-height: 110px;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: var(--primary);
        }

        .read-only {
          margin-top: 22px;
          padding: 15px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--background);
        }

        .read-only strong {
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .read-only p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
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

        @media (max-width: 600px) {
          .page {
            padding: 16px;
          }

          h1 {
            font-size: 26px;
          }

          .form-grid {
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

