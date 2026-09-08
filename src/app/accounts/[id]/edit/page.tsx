"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditAccountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<
    "asset" | "liability"
  >("asset");
  const [currency, setCurrency] = useState("BDT");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const { data, error } = await supabase
        .from("accounts")
        .select("name, account_type, currency, is_system")
        .eq("id", id)
        .single();

      if (error || !data || data.is_system) {
        router.push("/accounts");
        return;
      }

      setName(data.name);
      setAccountType(data.account_type);
      setCurrency(data.currency);
      setLoading(false);
    }

    loadAccount();
  }, [id, router, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Enter an account name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("update_account", {
      p_account_id: id,
      p_name: name,
      p_account_type: accountType,
      p_currency: currency,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/accounts/${id}`);
    router.refresh();
  }

  if (loading) {
    return <main>Loading...</main>;
  }

  return (
    <main>
      <h1>Edit Account</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Account name</label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div>
          <label>Account type</label>

          <select
            value={accountType}
            onChange={(event) =>
              setAccountType(
                event.target.value as "asset" | "liability",
              )
            }
          >
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
          </select>
        </div>

        <div>
          <label>Currency</label>

          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            <option value="BDT">BDT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}