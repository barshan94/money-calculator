"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  account_type: "asset" | "liability";
};

export default function BuyMoreInvestmentPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const investmentId = params.id as string;

  const [investment, setInvestment] =
    useState<Investment | null>(null);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] =
    useState("");

  const [purchaseDate, setPurchaseDate] =
    useState(
      new Date().toISOString().slice(0, 10),
    );

  const [accountId, setAccountId] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data,
        error,
      } = await supabase
        .from("investments")
        .select(
          "id, name, currency, quantity, purchase_price, invested_amount, status",
        )
        .eq("id", investmentId)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setInvestment({
        ...data,
        quantity:
          data.quantity !== null
            ? Number(data.quantity)
            : null,
        purchase_price:
          data.purchase_price !== null
            ? Number(data.purchase_price)
            : null,
        invested_amount:
          Number(data.invested_amount),
      });

      const {
        data: accountData,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, name, currency, account_type",
        )
        .eq("is_archived", false)
        .eq("is_system", false)
        .eq("currency", data.currency)
        .in("account_type", [
          "asset",
          "liability",
        ])
        .order("name");

      if (accountError) {
        setMessage(accountError.message);
        setLoading(false);
        return;
      }

      setAccounts(accountData ?? []);
      setLoading(false);
    }

    void loadData();
  }, [investmentId, supabase]);

  useEffect(() => {
    const qty = Number(quantity);
    const price = Number(purchasePrice);

    if (
      qty > 0 &&
      price > 0
    ) {
      setAmount(
        (qty * price).toFixed(2),
      );
    }
  }, [quantity, purchasePrice]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!investment) return;

    setMessage("");

    const investedAmount =
      Number(amount);

    const buyQuantity =
      Number(quantity);

    const buyPrice =
      Number(purchasePrice);

   if (
  !Number.isFinite(investedAmount) ||
  investedAmount <= 0
) {
  setMessage(
    "Enter a valid investment amount.",
  );
  return;
}

if (
  !Number.isFinite(buyQuantity) ||
  buyQuantity <= 0
) {
  setMessage(
    "Enter a valid quantity.",
  );
  return;
}

if (
  !Number.isFinite(buyPrice) ||
  buyPrice <= 0
) {
  setMessage(
    "Enter a valid purchase price.",
  );
  return;
}

    setSaving(true);

    const {
      error,
    } = await supabase.rpc(
      "buy_investment",
      {
        p_investment_id:
          investmentId,

        p_amount:
          investedAmount,

        p_quantity:
          buyQuantity,

        p_purchase_price:
          buyPrice,

        p_purchase_date:
          purchaseDate,

        p_source_account_id:
          accountId,

        p_description:
          description.trim() ||
          null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(
      `/investments/${investmentId}`,
    );

    router.refresh();
  }

  if (loading) {
    return (
      <main>
        <h1>Buy More</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (!investment) {
    return (
      <main>
        <h1>Buy More</h1>
        <p>
          {message ||
            "Investment not found."}
        </p>
      </main>
    );
  }

  if (investment.status !== "active") {
    return (
      <main>
        <h1>Buy More</h1>

        <p>
          This investment is no longer
          active.
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      <a
        href={`/investments/${investmentId}`}
        style={{
          display: "inline-block",
          marginBottom: 20,
          color: "var(--muted)",
          textDecoration: "none",
          fontSize: 13,
        }}
      >
        ← Back to Investment
      </a>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--card)",
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              margin: "0 0 5px",
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 700,
            }}
          >
            Add to holding
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
            }}
          >
            Buy More
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            {investment.name}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background:
                "var(--background)",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 10,
                color: "var(--muted)",
              }}
            >
              Current Quantity
            </span>

            <strong>
              {investment.quantity ===
              null
                ? "—"
                : investment.quantity.toLocaleString(
                    "en-BD",
                  )}
            </strong>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background:
                "var(--background)",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 10,
                color: "var(--muted)",
              }}
            >
              Average Cost
            </span>

            <strong>
              {investment.currency}{" "}
              {investment.purchase_price ===
              null
                ? "—"
                : investment.purchase_price.toLocaleString(
                    "en-BD",
                    {
                      minimumFractionDigits: 2,
                    },
                  )}
            </strong>
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: 18,
              padding: 12,
              borderRadius: 9,
              background:
                "rgba(220, 38, 38, 0.08)",
              color: "var(--danger)",
              fontSize: 12,
            }}
          >
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 17,
          }}
        >
          <div>
            <label>Quantity</label>

            <input
              type="number"
              min="0.00000001"
              step="0.00000001"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value,
                )
              }
              placeholder="e.g. 20"
              required
              style={{
                width: "100%",
                marginTop: 6,
              }}
            />
          </div>

          <div>
            <label>
              Purchase Price per Unit
            </label>

            <input
              type="number"
              min="0.00000001"
              step="0.00000001"
              value={purchasePrice}
              onChange={(event) =>
                setPurchasePrice(
                  event.target.value,
                )
              }
              placeholder="e.g. 110"
              required
              style={{
                width: "100%",
                marginTop: 6,
              }}
            />
          </div>

          <div>
            <label>
              Total Investment Amount
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              required
              style={{
                width: "100%",
                marginTop: 6,
              }}
            />

            <small
              style={{
                display: "block",
                marginTop: 5,
                color: "var(--muted)",
                fontSize: 10,
              }}
            >
              Quantity × purchase price
            </small>
          </div>

          <div>
            <label>Paid From</label>

            <select
              value={accountId}
              onChange={(event) =>
                setAccountId(
                  event.target.value,
                )
              }
              required
              style={{
                width: "100%",
                marginTop: 6,
              }}
            >
              <option value="">
                Select account
              </option>

              {accounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label>Purchase Date</label>

            <input
              type="date"
              value={purchaseDate}
              onChange={(event) =>
                setPurchaseDate(
                  event.target.value,
                )
              }
              required
              style={{
                width: "100%",
                marginTop: 6,
              }}
            />
          </div>

          <div>
            <label>Description</label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Optional"
              rows={3}
              style={{
                width: "100%",
                marginTop: 6,
                resize: "vertical",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 5,
              padding: "11px 16px",
              border: 0,
              borderRadius: 9,
              background:
                "var(--primary)",
              color: "white",
              fontWeight: 700,
              cursor: saving
                ? "default"
                : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Processing..."
              : "Buy More"}
          </button>
        </form>
      </section>
    </main>
  );
}

