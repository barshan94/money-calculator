"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccountType = "asset" | "liability";

type LiquidityClass =
  | "immediate"
  | "near_liquid"
  | "receivable"
  | "long_term";

export default function NewAccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("asset");

  const [currency, setCurrency] = useState("BDT");

  const [liquidityClass, setLiquidityClass] =
    useState<LiquidityClass>("immediate");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

    const { error } = await supabase.rpc(
      "create_account",
      {
        p_name: trimmedName,
        p_account_type: accountType,
        p_currency: currency,
        p_liquidity_class:
          accountType === "asset"
            ? liquidityClass
            : "immediate",
      },
    );

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
            "Unable to create the account.",
        );
      }

      setSaving(false);
      return;
    }

    router.push("/accounts");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/accounts"
          className="muted"
          style={{ fontSize: 14 }}
        >
          ← Accounts
        </Link>

        <h1 style={{ marginTop: 12, marginBottom: 0 }}>
          New Account
        </h1>

        <p className="muted">
          Add a bank, cash, wallet, loan, or other
          financial account.
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
              placeholder="e.g. Savings Account"
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
              onChange={(event) => {
                const value =
                  event.target.value as AccountType;

                setAccountType(value);

                if (value === "liability") {
                  setLiquidityClass("immediate");
                }
              }}
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

          {accountType === "asset" && (
            <div>
              <label
                htmlFor="liquidity-class"
                style={{
                  display: "block",
                  marginBottom: 7,
                  fontWeight: 600,
                }}
              >
                Availability
              </label>

              <select
                id="liquidity-class"
                value={liquidityClass}
                onChange={(event) =>
                  setLiquidityClass(
                    event.target
                      .value as LiquidityClass,
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
                <option value="immediate">
                  Available now — cash, bank, wallet
                </option>

                <option value="near_liquid">
                  Near liquid — accessible investments/deposits
                </option>

                <option value="receivable">
                  Money to receive — money owed to you
                </option>

                <option value="long_term">
                  Long term — land, property, restricted assets
                </option>
              </select>

              <p
                className="muted"
                style={{
                  marginTop: 7,
                  marginBottom: 0,
                  fontSize: 13,
                }}
              >
                This determines how the account appears
                in your liquidity report.
              </p>
            </div>
          )}

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
            }}
          >
            <Link
              href="/accounts"
              style={{
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontWeight: 600,
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
                ? "Creating..."
                : "Create Account"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

