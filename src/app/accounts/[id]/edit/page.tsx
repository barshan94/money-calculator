"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccountType = "asset" | "liability";

export default function EditAccountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("asset");
  const [currency, setCurrency] = useState("BDT");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
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
          "name, account_type, currency, is_system, is_archived",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        error ||
        !data ||
        data.is_system ||
        data.is_archived
      ) {
        router.push("/accounts");
        return;
      }

      setName(data.name);
      setAccountType(data.account_type);
      setCurrency(data.currency);
      setLoading(false);
    }

    loadAccount();

    return () => {
      cancelled = true;
    };
  }, [id, router, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage("Enter an account name.");
      return;
    }

    if (trimmedName.length > 100) {
      setMessage(
        "Account name must be 100 characters or less.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc("update_account", {
      p_account_id: id,
      p_name: trimmedName,
      p_account_type: accountType,
      p_currency: currency,
    });

    if (error) {
      const errorMessage =
        error.message?.toLowerCase() ?? "";

      if (
        errorMessage.includes(
          "active account with this name already exists",
        )
      ) {
        setMessage(
          "An account with this name already exists.",
        );
      } else {
        setMessage(
          error.message ||
            "Unable to update the account.",
        );
      }

      setSaving(false);
      return;
    }

    router.push(`/accounts/${id}`);
    router.refresh();
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 600 }}>
        <p className="muted">Loading account...</p>
      </main>
    );
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
          Edit Account
        </h1>

        <p className="muted">
          Update the account name, type, or currency.
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
              htmlFor="account-name"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Account name
            </label>

            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              maxLength={100}
              required
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="account-type"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Account type
            </label>

            <select
              id="account-type"
              value={accountType}
              onChange={(event) =>
                setAccountType(
                  event.target.value as AccountType,
                )
              }
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <option value="asset">
                Asset — money you own
              </option>

              <option value="liability">
                Liability — money you owe
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="currency"
              style={{
                display: "block",
                marginBottom: 7,
                fontWeight: 600,
              }}
            >
              Currency
            </label>

            <select
              id="currency"
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value)
              }
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "#fff",
              }}
            >
              <option value="BDT">
                BDT — Bangladeshi Taka
              </option>

              <option value="USD">
                USD — US Dollar
              </option>

              <option value="EUR">
                EUR — Euro
              </option>

              <option value="GBP">
                GBP — British Pound
              </option>
            </select>
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
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
