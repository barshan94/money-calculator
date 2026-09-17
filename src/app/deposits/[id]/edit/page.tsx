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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("deposits")
        .select(
          "name, principal_amount, interest_rate, maturity_amount, maturity_date, description, status",
        )
        .eq("id", depositId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setMessage(
          error?.message ?? "Deposit not found.",
        );
        setLoading(false);
        return;
      }

      if (data.status !== "active") {
        setMessage(
          "This deposit is no longer active.",
        );
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
  }, [depositId, supabase]);

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
      setMessage(
        "Deposit name cannot be empty.",
      );
      return;
    }

    if (
      rate !== null &&
      (!Number.isFinite(rate) || rate < 0)
    ) {
      setMessage(
        "Enter a valid non-negative interest rate.",
      );
      return;
    }

    if (
      maturity !== null &&
      (!Number.isFinite(maturity) || maturity < 0)
    ) {
      setMessage(
        "Enter a valid maturity amount.",
      );
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

    const { error } = await supabase.rpc(
      "update_deposit",
      {
        p_deposit_id: depositId,
        p_name: name.trim(),
        p_interest_rate: rate,
        p_maturity_amount: maturity,
        p_maturity_date: maturityDate || null,
        p_description: description.trim() || null,
      },
    );

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
          <label htmlFor="deposit-name">
            Deposit Name
          </label>

          <input
            id="deposit-name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="principal">
            Principal Amount
          </label>

          <input
            id="principal"
            value={principal.toFixed(2)}
            disabled
          />
        </div>

        <div>
          <label htmlFor="interest-rate">
            Interest Rate %
          </label>

          <input
            id="interest-rate"
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
          <label htmlFor="maturity-amount">
            Maturity Amount
          </label>

          <input
            id="maturity-amount"
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
          <label htmlFor="maturity-date">
            Maturity Date
          </label>

          <input
            id="maturity-date"
            type="date"
            value={maturityDate}
            onChange={(event) =>
              setMaturityDate(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="description">
            Description
          </label>

          <textarea
            id="description"
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