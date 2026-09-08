"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  account_type: "asset" | "liability";
  currency: string;
};

export default function OpeningBalancePage() {
  const supabase = createClient();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, account_type, currency")
       .eq("is_archived", false)
.eq("is_system", false)
.in("account_type", ["asset", "liability"])
        .order("name");

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setAccounts(data ?? []);
      setLoading(false);
    }

    loadAccounts();
  }, [supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const numericAmount = Number(amount);

    if (!accountId) {
      setMessage("Select an account.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_opening_balance",
      {
        p_account_id: accountId,
        p_amount: numericAmount,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setAmount("");
    setAccountId("");
    setMessage("Opening balance saved successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main>
        <p>Loading accounts...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Opening Balance</h1>

      <p>
        Enter the amount that already existed in an
        account when you started using Money Calculator.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Account</label>

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
          <label>Starting amount</label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            required
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Opening Balance"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}