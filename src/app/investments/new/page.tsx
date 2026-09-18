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

export default function NewInvestmentPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [investmentType, setInvestmentType] =
    useState("stock");
  const [currency, setCurrency] = useState("BDT");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] =
    useState("");
  const [purchaseDate, setPurchaseDate] =
    useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, currency, account_type")
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
    (account) => account.currency === currency,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const investedAmount = parseFloat(amount);

    if (!name.trim()) {
      setMessage("Enter the investment name.");
      return;
    }

    if (
      !Number.isFinite(investedAmount) ||
      investedAmount <= 0
    ) {
      setMessage("Enter a valid investment amount.");
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

    /*
     * If quantity is not supplied, treat the investment
     * as one unit.
     *
     * If purchase price is not supplied, the entire
     * invested amount becomes the price of that unit.
     */
    const finalQuantity = quantity.trim()
      ? Number(quantity)
      : 1;

    const finalPurchasePrice =
      purchasePrice.trim()
        ? Number(purchasePrice)
        : investedAmount / finalQuantity;

    if (
      !Number.isFinite(finalQuantity) ||
      finalQuantity <= 0
    ) {
      setMessage("Enter a valid quantity.");
      return;
    }

    if (
      !Number.isFinite(finalPurchasePrice) ||
      finalPurchasePrice <= 0
    ) {
      setMessage("Enter a valid purchase price.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_investment",
      {
        p_name: name.trim(),
        p_investment_type: investmentType,
        p_currency: currency,
        p_invested_amount: investedAmount,
        p_purchase_date: purchaseDate,
        p_source_account_id: accountId,
        p_quantity: finalQuantity,
        p_purchase_price: finalPurchasePrice,
        p_description:
          description.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/investments");
    router.refresh();
  }

  return (
    <main>
      <h1>New Investment</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="investment-name">
            Investment Name
          </label>

          <input
            id="investment-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. Grameenphone"
            required
          />
        </div>

        <div>
          <label htmlFor="investment-type">
            Investment Type
          </label>

          <select
            id="investment-type"
            value={investmentType}
            onChange={(event) =>
              setInvestmentType(event.target.value)
            }
          >
            <option value="stock">Stock</option>
            <option value="crypto">Crypto</option>
            <option value="mutual_fund">
              Mutual Fund
            </option>
            <option value="bond">Bond</option>
            <option value="fixed_deposit">
              Fixed Deposit
            </option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="invested-amount">
            Invested Amount
          </label>

          <input
            id="invested-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="investment-currency">
            Currency
          </label>

          <select
            id="investment-currency"
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
          <label htmlFor="investment-quantity">
            Quantity (optional)
          </label>

          <input
            id="investment-quantity"
            type="number"
            min="0.00000001"
            step="0.00000001"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            placeholder="Leave empty = 1"
          />
        </div>

        <div>
          <label htmlFor="purchase-price">
            Purchase Price (optional)
          </label>

          <input
            id="purchase-price"
            type="number"
            min="0.00000001"
            step="0.00000001"
            value={purchasePrice}
            onChange={(event) =>
              setPurchasePrice(event.target.value)
            }
            placeholder="Leave empty = amount ÷ quantity"
          />
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
          <label htmlFor="investment-description">
            Description
          </label>

          <textarea
            id="investment-description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Optional"
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Investment"}
        </button>
      </form>
    </main>
  );
}

