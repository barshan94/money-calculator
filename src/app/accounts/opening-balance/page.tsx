"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  account_type: "asset" | "liability";
  currency: string;
};

export default function OpeningBalancePage() {
  const supabase = createClient();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>(
    [],
  );
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/accounts");
        return;
      }

      const { data, error } = await supabase
        .from("accounts")
        .select(
          "id, name, account_type, currency",
        )
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .eq("is_system", false)
        .in("account_type", [
          "asset",
          "liability",
        ])
        .order("name");

      if (cancelled) {
        return;
      }

      if (error) {
        setMessage(
          error.message ||
            "Unable to load accounts.",
        );
        setLoading(false);
        return;
      }

      setAccounts(data ?? []);
      setLoading(false);
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");

    const numericAmount = Number(amount);

    if (!accountId) {
      setMessage("Select an account.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage(
        "Enter a valid amount greater than zero.",
      );
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
            "Unable to save the opening balance.",
        );
      }

      setSaving(false);
      return;
    }

    setAmount("");
    setAccountId("");
    setMessage(
      "Opening balance saved successfully.",
    );
    setSaving(false);
  }

  const selectedAccount = accounts.find(
    (account) => account.id === accountId,
  );

  if (loading) {
    return (
      <main style={{ maxWidth: 600 }}>
        <p className="muted">
          Loading accounts...
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/accounts"
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Accounts
        </Link>

        <h1
          style={{
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          Opening Balance
        </h1>

        <p className="muted">
          Enter the amount that already existed in an
          account when you started using Money
          Calculator.
        </p>
      </div>

      {accounts.length === 0 ? (
        <section>
          <p className="muted">
            No active accounts are available for an
            opening balance.
          </p>

          <Link
            href="/accounts/new"
            style={{
              display: "inline-block",
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 8,
              background: "var(--primary)",
              color: "#fff",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create Account
          </Link>
        </section>
      ) : (
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
                htmlFor="account"
                style={{
                  display: "block",
                  marginBottom: 7,
                  fontWeight: 600,
                }}
              >
                Account
              </label>

              <select
                id="account"
                value={accountId}
                onChange={(event) =>
                  setAccountId(
                    event.target.value,
                  )
                }
                required
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border:
                    "1px solid var(--border)",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <option value="">
                  Select account
                </option>

                {accounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name} ·{" "}
                    {account.currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="starting-amount"
                style={{
                  display: "block",
                  marginBottom: 7,
                  fontWeight: 600,
                }}
              >
                Starting amount
              </label>

              <input
                id="starting-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                required
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border:
                    "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />

              {selectedAccount && (
                <p
                  className="muted"
                  style={{
                    marginTop: 7,
                    marginBottom: 0,
                    fontSize: 13,
                  }}
                >
                  Currency:{" "}
                  {selectedAccount.currency}
                </p>
              )}

              <p
                className="muted"
                style={{
                  marginTop: 5,
                  marginBottom: 0,
                  fontSize: 13,
                }}
              >
                This creates a single opening-balance
                transaction for the selected account.
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
                href="/accounts"
                style={{
                  padding: "10px 14px",
                  border:
                    "1px solid var(--border)",
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
                  : "Save Opening Balance"}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

