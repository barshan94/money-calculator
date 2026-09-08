"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OpeningBalancePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "create_opening_balance",
      {
        p_account_id: id,
        p_amount: numericAmount,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/accounts/${id}`);
    router.refresh();
  }

  return (
    <main>
      <h1>Add Opening Balance</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Amount</label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add Opening Balance"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}