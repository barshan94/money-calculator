"use client";


import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditInvestmentPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const investmentId = params.id as string;

  const [name, setName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadInvestment() {
      const { data, error } = await supabase
        .from("investments")
        .select(
          "name, current_value, description, status",
        )
        .eq("id", investmentId)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.status !== "active") {
        setMessage("This investment is no longer active.");
        setLoading(false);
        return;
      }

      setName(data.name);
      setCurrentValue(String(data.current_value));
      setDescription(data.description ?? "");

      setLoading(false);
    }

    loadInvestment();
  }, [investmentId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const value = Number(currentValue);

    if (!name.trim()) {
      setMessage("Investment name cannot be empty.");
      return;
    }

    if (value < 0) {
      setMessage("Current value cannot be negative.");
      return;
    }

    setSaving(true);

    const { error: valueError } =
      await supabase.rpc(
        "update_investment_value",
        {
          p_investment_id: investmentId,
          p_current_value: value,
        },
      );

    if (valueError) {
      setMessage(valueError.message);
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("investments")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", investmentId);

    if (updateError) {
      setMessage(updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/investments/${investmentId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main>
        <h1>Edit Investment</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Investment</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Investment Name</label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Current Value</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={currentValue}
            onChange={(event) =>
              setCurrentValue(event.target.value)
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
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </main>
  );
}