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
        setMessage(
          "This investment is no longer active.",
        );
        setLoading(false);
        return;
      }

      setName(data.name);
      setCurrentValue(String(data.current_value));
      setDescription(data.description ?? "");

      setLoading(false);
    }

    loadInvestment();
  }, [investmentId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const value = Number(currentValue);

    if (!name.trim()) {
      setMessage(
        "Investment name cannot be empty.",
      );
      return;
    }

    if (!Number.isFinite(value) || value < 0) {
      setMessage(
        "Enter a valid current value.",
      );
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

    const { error: metadataError } =
      await supabase.rpc(
        "update_investment",
        {
          p_investment_id: investmentId,
          p_name: name.trim(),
          p_description:
            description.trim() || null,
        },
      );

    if (metadataError) {
      setMessage(metadataError.message);
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
          <label htmlFor="investment-name">
            Investment Name
          </label>

          <input
            id="investment-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="current-value">
            Current Value
          </label>

          <input
            id="current-value"
            type="number"
            min="0"
            step="0.01"
            value={currentValue}
            onChange={(event) =>
              setCurrentValue(
                event.target.value,
              )
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
              setDescription(
                event.target.value,
              )
            }
          />
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </form>
    </main>
  );
}

