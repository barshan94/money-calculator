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
  invested_amount: number;
  status: string;
};

type Account = {
  id: string;
  name: string;
  currency: string;
};

export default function SellInvestmentPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const investmentId = params.id as string;

  const [investment, setInvestment] =
    useState<Investment | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("investments")
        .select(
          "id, name, currency, invested_amount, status",
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
        invested_amount: Number(data.invested_amount),
      });

      const { data: accountData, error: accountError } =
        await supabase
          .from("accounts")
          .select("id, name, currency")
          .eq("is_archived", false)
          .eq("is_system", false)
          .eq("account_type", "asset")
          .eq("currency", data.currency)
          .order("name");

      if (accountError) {
        setMessage(accountError.message);
        setLoading(false);
        return;
      }

      setAccounts(accountData ?? []);
      setLoading(false);
    }

    loadData();
  }, [investmentId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!investment) return;

    setMessage("");

    const amount = Number(receivedAmount);

    if (amount < 0) {
      setMessage("Received amount cannot be negative.");
      return;
    }

    if (!accountId) {
      setMessage("Select an account.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "sell_investment",
      {
        p_investment_id: investmentId,
        p_received_amount: amount,
        p_destination_account_id: accountId,
        p_sale_date: saleDate,
        p_description:
          description.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/investments/${investmentId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main>
        <h1>Sell Investment</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (!investment) {
    return (
      <main>
        <h1>Sell Investment</h1>
        <p>{message || "Investment not found."}</p>
      </main>
    );
  }

  if (investment.status !== "active") {
    return (
      <main>
        <h1>Sell Investment</h1>
        <p>This investment is no longer active.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Sell Investment</h1>

      <p>{investment.name}</p>

      <p>
        Invested: {investment.currency}{" "}
        {investment.invested_amount.toLocaleString(
          "en-BD",
          {
            minimumFractionDigits: 2,
          },
        )}
      </p>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Amount Received</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={receivedAmount}
            onChange={(event) =>
              setReceivedAmount(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Receive Into</label>

          <select
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

        <div>
          <label>Sale Date</label>

          <input
            type="date"
            value={saleDate}
            onChange={(event) =>
              setSaleDate(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Description</label>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Processing..." : "Sell Investment"}
        </button>
      </form>
    </main>
  );
}