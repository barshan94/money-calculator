"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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

    if (saving) {
      return;
    }

    setMessage("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_opening_balance",
      {
        p_account_id: id,
        p_amount: numericAmount,
      },
    );

    if (error) {
      const errorMessage =
        error.message?.toLowerCase() ?? "";

      if (
        errorMessage.includes("opening balance") &&
        errorMessage.includes("already")
      ) {
        setMessage(
          "This account already has an opening balance.",
        );
      } else {
        setMessage(
          error.message ||
            "Unable to add the opening balance.",
        );
      }

      setSaving(false);
      return;
    }

    router.push(`/accounts/${id}`);
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href={`/accounts/${id}`}
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Account
        </Link>

        <h1 style={{ marginTop: 12, marginBottom: 0 }}>
          Add Opening Balance
        </h1>

        <p className="muted">
          Set the starting balance for this account.
        </p>
      </div>

      <section>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          <div>
            <label
              htmlFor="opening-balance-amount"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Amount
            </label>

            <input
              id="opening-balance-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              required
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />

            <p
              className="muted"
              style={{
                marginTop: 7,
                marginBottom: 0,
                fontSize: 13,
              }}
            >
              This will create the account's initial
              opening-balance transaction.
            </p>
          </div>

          {message && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#fef2f2",
                color: "var(--danger)",
                fontSize: 14,
              }}
            >
              {message}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 4,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/accounts/${id}`}
              style={{
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 16px",
                border: 0,
                borderRadius: 8,
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? "Saving..."
                : "Add Opening Balance"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

