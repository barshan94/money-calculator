"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Investment = {
  id: string;
  name: string;
  currency: string;
  quantity: number | null;
  purchase_price: number | null;
  invested_amount: number;
  status: string;
};

type Account = {
  id: string;
  name: string;
  currency: string;
  account_type: string;
};

export default function SellInvestmentPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const investmentId = params.id as string;

  const [investment, setInvestment] =
    useState<Investment | null>(null);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: investmentData,
        error: investmentError,
      } = await supabase
        .from("investments")
        .select(
          "id,name,currency,quantity,purchase_price,invested_amount,status",
        )
        .eq("id", investmentId)
        .maybeSingle();

      if (investmentError || !investmentData) {
        setError("Investment not found.");
        setLoading(false);
        return;
      }

      setInvestment(investmentData);

      const { data: accountData } = await supabase
        .from("accounts")
        .select(
          "id,name,currency,account_type",
        )
        .eq("currency", investmentData.currency)
        .eq("is_archived", false)
        .eq("is_system", false)
        .in("account_type", [
          "asset",
          "liability",
        ])
        .order("name");

      setAccounts(accountData ?? []);

      setLoading(false);
    }

    loadData();
  }, [investmentId]);

  const heldQuantity = Number(
    investment?.quantity ?? 0,
  );

  const sellQuantity = Number(quantity || 0);
  const price = Number(salePrice || 0);

  const totalReceived =
    sellQuantity > 0 && price > 0
      ? sellQuantity * price
      : 0;

  const averageCost =
    investment && heldQuantity > 0
      ? Number(investment.invested_amount) /
        heldQuantity
      : 0;

  const costBasis =
    sellQuantity > 0
      ? sellQuantity * averageCost
      : 0;

  const estimatedProfitLoss =
    totalReceived - costBasis;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!investment) return;

    if (heldQuantity <= 0) {
      setError(
        "This investment has no remaining quantity.",
      );
      return;
    }

    if (
  !Number.isFinite(sellQuantity) ||
  sellQuantity <= 0
) {
  setError(
    "Enter a valid quantity to sell.",
  );
  return;
}

    if (sellQuantity > heldQuantity) {
      setError(
        `You only have ${heldQuantity.toLocaleString(
          "en-BD",
        )} units available.`,
      );
      return;
    }

    if (
  !Number.isFinite(price) ||
  price <= 0
) {
  setError(
    "Enter a valid sale price.",
  );
  return;
}

    if (!accountId) {
      setError(
        "Select the account receiving the money.",
      );
      return;
    }

    if (!saleDate) {
      setError("Select a sale date.");
      return;
    }

    setSaving(true);

    const { error: rpcError } =
      await supabase.rpc(
        "sell_investment",
        {
          p_investment_id: investment.id,
          p_quantity: sellQuantity,
          p_sale_price: price,
          p_destination_account_id:
            accountId,
          p_sale_date: saleDate,
          p_description:
            description.trim() || null,
        },
      );

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    router.push(
      `/investments/${investment.id}`,
    );
    router.refresh();
  }

  if (loading) {
    return (
      <main className="sell-page">
        <div className="sell-loading">
          Loading investment...
        </div>
      </main>
    );
  }

  if (!investment) {
    return (
      <main className="sell-page">
        <div className="sell-error-box">
          {error || "Investment not found."}
        </div>
      </main>
    );
  }

  if (
    investment.status !== "active" ||
    heldQuantity <= 0
  ) {
    return (
      <main className="sell-page">
        <a
          href={`/investments/${investment.id}`}
          className="sell-back"
        >
          ← Back to Investment
        </a>

        <div className="sell-empty">
          <h1>Nothing to sell</h1>

          <p>
            This investment has no remaining
            quantity.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="sell-page">
      <a
        href={`/investments/${investment.id}`}
        className="sell-back"
      >
        ← Back to Investment
      </a>

      <div className="sell-header">
        <div>
          <p className="sell-eyebrow">
            Investment
          </p>

          <h1>Sell Investment</h1>

          <p>
            Sell all or part of your current
            holding.
          </p>
        </div>
      </div>

      <section className="sell-summary">
        <div>
          <span>Investment</span>
          <strong>{investment.name}</strong>
        </div>

        <div>
          <span>Available Quantity</span>
          <strong>
            {heldQuantity.toLocaleString(
              "en-BD",
            )}
          </strong>
        </div>

        <div>
          <span>Average Cost</span>
          <strong>
            {investment.currency}{" "}
            {averageCost.toLocaleString(
              "en-BD",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            )}
          </strong>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="sell-form"
      >
        <div className="sell-field">
          <label htmlFor="quantity">
            Quantity to Sell
          </label>

          <input
            id="quantity"
            type="number"
            min="0.00000001"
            step="any"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            placeholder={`Maximum ${heldQuantity}`}
            required
          />

          <small>
            You can sell any amount up to{" "}
            {heldQuantity.toLocaleString(
              "en-BD",
            )}{" "}
            units.
          </small>
        </div>

        <div className="sell-field">
          <label htmlFor="salePrice">
            Sale Price Per Unit
          </label>

          <div className="sell-input-prefix">
            <span>
              {investment.currency}
            </span>

            <input
              id="salePrice"
              type="number"
              min="0.00000001"
              step="any"
              value={salePrice}
              onChange={(event) =>
                setSalePrice(
                  event.target.value,
                )
              }
              placeholder="e.g. 130"
              required
            />
          </div>
        </div>

        <div className="sell-calculation">
          <div>
            <span>Total Received</span>
            <strong>
              {investment.currency}{" "}
              {totalReceived.toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </strong>
          </div>

          <div>
            <span>Estimated Cost Basis</span>
            <strong>
              {investment.currency}{" "}
              {costBasis.toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </strong>
          </div>

          <div>
            <span>Estimated Profit / Loss</span>

            <strong
              className={
                estimatedProfitLoss > 0
                  ? "profit"
                  : estimatedProfitLoss < 0
                    ? "loss"
                    : ""
              }
            >
              {estimatedProfitLoss >= 0
                ? "+"
                : ""}
              {investment.currency}{" "}
              {estimatedProfitLoss.toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}
            </strong>
          </div>
        </div>

        <div className="sell-field">
          <label htmlFor="account">
            Receive Money Into
          </label>

          <select
            id="account"
            value={accountId}
            onChange={(event) =>
              setAccountId(event.target.value)
            }
            required
          >
            <option value="">
              Select account
            </option>

            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sell-field">
          <label htmlFor="saleDate">
            Sale Date
          </label>

          <input
            id="saleDate"
            type="date"
            value={saleDate}
            onChange={(event) =>
              setSaleDate(event.target.value)
            }
            required
          />
        </div>

        <div className="sell-field">
          <label htmlFor="description">
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Optional note"
            rows={3}
          />
        </div>

        {error && (
          <div className="sell-error-box">
            {error}
          </div>
        )}

        <div className="sell-actions">
          <a
            href={`/investments/${investment.id}`}
            className="sell-cancel"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Selling..."
              : "Confirm Sale"}
          </button>
        </div>
      </form>

      <style>{`
        .sell-page {
          max-width: 760px;
          margin: 0 auto;
          padding: 24px 0 50px;
        }

        .sell-back {
          display: inline-block;
          margin-bottom: 24px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }

        .sell-header {
          margin-bottom: 24px;
        }

        .sell-eyebrow {
          margin: 0 0 5px;
          color: var(--muted);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          text-transform: uppercase;
        }

        .sell-header h1 {
          margin: 0;
          font-size: 26px;
        }

        .sell-header p:last-child {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        .sell-summary {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .sell-summary > div {
          padding: 15px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
        }

        .sell-summary span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 10px;
        }

        .sell-summary strong {
          font-size: 14px;
        }

        .sell-form {
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .sell-field {
          margin-bottom: 17px;
        }

        .sell-field label {
          display: block;
          margin-bottom: 7px;
          color: var(--foreground);
          font-size: 11px;
          font-weight: 700;
        }

        .sell-field input,
        .sell-field select,
        .sell-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 11px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font: inherit;
          font-size: 12px;
        }

        .sell-field textarea {
          resize: vertical;
        }

        .sell-field small {
          display: block;
          margin-top: 5px;
          color: var(--muted);
          font-size: 10px;
        }

        .sell-input-prefix {
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
        }

        .sell-input-prefix span {
          padding-left: 11px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
        }

        .sell-input-prefix input {
          border: 0;
          border-radius: 0;
        }

        .sell-input-prefix input:focus {
          outline: none;
        }

        .sell-calculation {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 20px 0;
          padding: 15px;
          border-radius: 10px;
          background: var(--muted-background);
        }

        .sell-calculation span {
          display: block;
          margin-bottom: 5px;
          color: var(--muted);
          font-size: 10px;
        }

        .sell-calculation strong {
          font-size: 13px;
        }

        .profit {
          color: var(--success) !important;
        }

        .loss {
          color: var(--danger) !important;
        }

        .sell-error-box {
          margin-bottom: 16px;
          padding: 11px 13px;
          border: 1px solid var(--danger);
          border-radius: 8px;
          background: #fef2f2;
          color: var(--danger);
          font-size: 11px;
        }

        .sell-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 22px;
        }

        .sell-actions a,
        .sell-actions button {
          min-height: 40px;
          padding: 0 15px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .sell-cancel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          color: var(--foreground);
        }

        .sell-actions button {
          border: 0;
          background: var(--danger);
          color: white;
        }

        .sell-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .sell-loading,
        .sell-empty {
          padding: 35px 20px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
        }

        .sell-empty h1 {
          margin: 0;
          font-size: 20px;
        }

        .sell-empty p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        @media (max-width: 600px) {
          .sell-page {
            padding: 18px 0 40px;
          }

          .sell-summary {
            grid-template-columns: 1fr;
          }

          .sell-form {
            padding: 15px;
          }

          .sell-calculation {
            grid-template-columns: 1fr;
          }

          .sell-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .sell-actions a,
          .sell-actions button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

