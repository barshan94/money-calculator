"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditDepositPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const depositId = params.id as string;

  const [name, setName] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [maturityAmount, setMaturityAmount] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [description, setDescription] = useState("");

  const [principal, setPrincipal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDeposit() {
      const { data, error } = await supabase
        .from("deposits")
        .select(
          "name, principal_amount, interest_rate, maturity_amount, maturity_date, description, status",
        )
        .eq("id", depositId)
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.status !== "active") {
        setMessage("This deposit is no longer active.");
        setLoading(false);
        return;
      }

      setName(data.name);
      setPrincipal(Number(data.principal_amount));
      setInterestRate(
        data.interest_rate !== null
          ? String(data.interest_rate)
          : "",
      );
      setMaturityAmount(
        data.maturity_amount !== null
          ? String(data.maturity_amount)
          : "",
      );
      setMaturityDate(data.maturity_date ?? "");
      setDescription(data.description ?? "");

      setLoading(false);
    }

    loadDeposit();
  }, [depositId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const rate = interestRate
      ? Number(interestRate)
      : null;

    const maturity = maturityAmount
      ? Number(maturityAmount)
      : null;

    if (!name.trim()) {
      setMessage("Deposit name cannot be empty.");
      return;
    }

    if (
  rate !== null &&
  (!Number.isFinite(rate) || rate < 0)
) {
  setMessage("Enter a valid non-negative interest rate.");
  return;
}

if (
  maturity !== null &&
  (!Number.isFinite(maturity) || maturity < 0)
) {
  setMessage("Enter a valid maturity amount.");
  return;
}

if (
  maturity !== null &&
  maturity < principal
) {
  setMessage(
    "Maturity amount cannot be less than principal.",
  );
  return;
}

    setSaving(true);

    const { error } = await supabase
      .from("deposits")
      .update({
        name: name.trim(),
        interest_rate: rate,
        maturity_amount: maturity,
        maturity_date: maturityDate || null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", depositId);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/deposits/${depositId}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main>
        <h1>Edit Deposit</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Deposit</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Deposit Name</label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Principal Amount</label>

          <input
            value={principal.toFixed(2)}
            disabled
          />
        </div>

        <div>
          <label>Interest Rate %</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={interestRate}
            onChange={(event) =>
              setInterestRate(event.target.value)
            }
          />
        </div>

        <div>
          <label>Maturity Amount</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={maturityAmount}
            onChange={(event) =>
              setMaturityAmount(event.target.value)
            }
          />
        </div>

        <div>
          <label>Maturity Date</label>

          <input
            type="date"
            value={maturityDate}
            onChange={(event) =>
              setMaturityDate(event.target.value)
            }
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