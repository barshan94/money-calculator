"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  currency: string;
  account_type: "asset" | "liability";
};

export default function NewLongTermAssetPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("land");
  const [currency, setCurrency] = useState("BDT");
  const [purchasePrice, setPurchasePrice] =
    useState("");
  const [acquisitionCost, setAcquisitionCost] =
    useState("");
  const [purchaseDate, setPurchaseDate] =
    useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<Account[]>(
    [],
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      const { data, error } = await supabase
        .from("accounts")
        .select(
          "id, name, currency, account_type",
        )
        .eq("is_archived", false)
        .eq("is_system", false)
        .order("name");

      if (error) {
        setMessage(error.message);
        return;
      }

      setAccounts(data ?? []);

      setPurchaseDate(
        new Date().toISOString().slice(0, 10),
      );
    }

    void loadAccounts();
  }, [supabase]);

  const availableAccounts = accounts.filter(
    (account) =>
      account.currency === currency &&
      (account.account_type === "asset" ||
        account.account_type === "liability"),
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const price = Number(purchasePrice);

    const extraCost = acquisitionCost.trim()
      ? Number(acquisitionCost)
      : 0;

    if (!name.trim()) {
      setMessage("Enter the asset name.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setMessage(
        "Enter a valid purchase price.",
      );
      return;
    }

    if (
      !Number.isFinite(extraCost) ||
      extraCost < 0
    ) {
      setMessage(
        "Enter a valid acquisition cost.",
      );
      return;
    }

    if (!purchaseDate) {
      setMessage("Select the purchase date.");
      return;
    }

    if (!accountId) {
      setMessage("Select the source account.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_long_term_asset",
      {
        p_name: name.trim(),
        p_asset_type: assetType,
        p_currency: currency,
        p_purchase_date: purchaseDate,
        p_purchase_price: price,
        p_acquisition_cost: extraCost,
        p_current_value:
          price + extraCost,
        p_source_account_id: accountId,
        p_description:
          description.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/long-term-assets");
    router.refresh();
  }

  return (
    <main>
      <div className="long-term-asset-form-header">
        <div>
          <p className="long-term-asset-eyebrow">
            Wealth & long-term holdings
          </p>

          <h1>New Long-Term Asset</h1>

          <p className="long-term-asset-subtitle">
            Record land, property or another
            long-term asset.
          </p>
        </div>
      </div>

      {message && (
        <div
          className="long-term-asset-form-message"
          role="alert"
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="long-term-asset-form"
      >
        <div>
          <label htmlFor="asset-name">
            Asset Name
          </label>

          <input
            id="asset-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Family Land"
            maxLength={150}
            required
          />
        </div>

        <div>
          <label htmlFor="asset-type">
            Asset Type
          </label>

          <select
            id="asset-type"
            value={assetType}
            onChange={(event) =>
              setAssetType(event.target.value)
            }
          >
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
        </div>

        <div>
          <label htmlFor="purchase-price">
            Purchase Price
          </label>

          <input
            id="purchase-price"
            type="number"
            min="0.01"
            step="0.01"
            value={purchasePrice}
            onChange={(event) =>
              setPurchasePrice(event.target.value)
            }
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="acquisition-cost">
            Acquisition Cost
          </label>

          <input
            id="acquisition-cost"
            type="number"
            min="0"
            step="0.01"
            value={acquisitionCost}
            onChange={(event) =>
              setAcquisitionCost(
                event.target.value,
              )
            }
            placeholder="Registration, legal fees, etc."
          />

          <p className="long-term-asset-field-hint">
            Optional costs directly related to
            acquiring the asset.
          </p>
        </div>

        <div>
          <label htmlFor="asset-currency">
            Currency
          </label>

          <select
            id="asset-currency"
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setAccountId("");
            }}
          >
            <option value="BDT">BDT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div>
          <label htmlFor="paid-from">
            Paid From
          </label>

          <select
            id="paid-from"
            value={accountId}
            onChange={(event) =>
              setAccountId(event.target.value)
            }
            required
          >
            <option value="">
              Select account
            </option>

            {availableAccounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>

          <p className="long-term-asset-field-hint">
            Only accounts using the selected
            currency are shown.
          </p>
        </div>

        <div>
          <label htmlFor="purchase-date">
            Purchase Date
          </label>

          <input
            id="purchase-date"
            type="date"
            value={purchaseDate}
            onChange={(event) =>
              setPurchaseDate(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="asset-description">
            Description
          </label>

          <textarea
            id="asset-description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Optional"
            rows={4}
          />
        </div>

        <div className="long-term-asset-form-note">
          <strong>Initial value</strong>

          <p>
            The asset will initially be valued at
            its purchase price plus acquisition
            costs. You can update its market value
            later from the asset details.
          </p>
        </div>

        <div className="long-term-asset-form-actions">
          <button
            type="submit"
            disabled={saving}
            className="long-term-asset-save-button"
          >
            {saving
              ? "Saving..."
              : "Save Asset"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/long-term-assets")
            }
            className="long-term-asset-cancel-button"
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>

      <style>{`
        .long-term-asset-form-header {
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

        .long-term-asset-form-header h1 {
          margin: 0;
        }

        .long-term-asset-subtitle {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .long-term-asset-form {
          max-width: 760px;
          display: grid;
          gap: 18px;
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .long-term-asset-form label {
          display: block;
          margin-bottom: 7px;
          color: var(--foreground);
          font-size: 12px;
          font-weight: 700;
        }

        .long-term-asset-form input,
        .long-term-asset-form select,
        .long-term-asset-form textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--card);
          color: var(--foreground);
          font: inherit;
          font-size: 13px;
        }

        .long-term-asset-form input,
        .long-term-asset-form select {
          height: 40px;
          padding: 0 11px;
        }

        .long-term-asset-form textarea {
          min-height: 100px;
          padding: 10px 11px;
          resize: vertical;
        }

        .long-term-asset-form input:focus,
        .long-term-asset-form select:focus,
        .long-term-asset-form textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .long-term-asset-field-hint {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 10px;
        }

        .long-term-asset-form-message {
          max-width: 760px;
          margin-bottom: 16px;
          padding: 12px 14px;
          border: 1px solid var(--danger);
          border-radius: 8px;
          color: var(--danger);
          background: var(--card);
          font-size: 12px;
        }

        .long-term-asset-form-note {
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--muted-background);
        }

        .long-term-asset-form-note strong {
          font-size: 12px;
        }

        .long-term-asset-form-note p {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.5;
        }

        .long-term-asset-form-actions {
          display: flex;
          gap: 10px;
          padding-top: 4px;
        }

        .long-term-asset-save-button,
        .long-term-asset-cancel-button {
          min-height: 36px;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .long-term-asset-save-button {
          border: 0;
          background: var(--primary);
          color: white;
        }

        .long-term-asset-cancel-button {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
        }

        .long-term-asset-save-button:disabled,
        .long-term-asset-cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .long-term-asset-form {
            padding: 16px;
          }

          .long-term-asset-form-actions {
            flex-direction: column;
          }

          .long-term-asset-save-button,
          .long-term-asset-cancel-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

