"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Deposit = {
  id: string;
  name: string;
  currency: string;
  principal_amount: number;
  status: string;
};

type Account = {
  id: string;
  name: string;
  currency: string;
};

export default function WithdrawDepositPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const depositId = params.id as string;

  const [deposit, setDeposit] =
    useState<Deposit | null>(null);
  const [accounts, setAccounts] =
    useState<Account[]>([]);
  const [receivedAmount, setReceivedAmount] =
    useState("");
  const [accountId, setAccountId] = useState("");
  const [withdrawalDate, setWithdrawalDate] =
    useState(
      new Date().toISOString().slice(0, 10),
    );
  const [description, setDescription] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
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
          "id, name, currency, principal_amount, status",
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

      const normalizedDeposit: Deposit = {
        id: data.id,
        name: data.name,
        currency: data.currency,
        principal_amount: Number(
          data.principal_amount,
        ),
        status: data.status,
      };

      setDeposit(normalizedDeposit);

      const {
        data: accountData,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select("id, name, currency")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .eq("is_system", false)
        .eq("account_type", "asset")
        .eq("currency", data.currency)
        .order("name");

      if (accountError) {
        setMessage(accountError.message);
        setLoading(false);
        return;
      }

      setAccounts(accountData ?? []);
      setLoading(false);
    }

    void loadData();
  }, [depositId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!deposit || saving) {
      return;
    }

    setMessage("");

    const amount = Number(receivedAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessage(
        "Enter a valid received amount.",
      );
      return;
    }

    if (amount < deposit.principal_amount) {
      setMessage(
        "Received amount cannot be less than the principal.",
      );
      return;
    }

    if (!accountId) {
      setMessage(
        "Select a destination account.",
      );
      return;
    }

    if (!withdrawalDate) {
      setMessage(
        "Select a withdrawal date.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "withdraw_deposit",
      {
        p_deposit_id: depositId,
        p_destination_account_id: accountId,
        p_received_amount: amount,
        p_withdrawal_date: withdrawalDate,
        p_description:
          description.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/deposits");
    router.refresh();
  }

  const formatMoney = (amount: number) =>
    amount.toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (loading) {
    return (
      <main className="withdraw-deposit-page">
        <style>{`
          .withdraw-loading {
            max-width: 850px;
            margin: 0 auto;
          }

          .withdraw-loading h1 {
            margin: 0;
            color: #0f172a;
            font-size: 30px;
          }

          .withdraw-loading p {
            margin-top: 8px;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>

        <div className="withdraw-loading">
          <h1>Withdraw Deposit</h1>
          <p>Loading deposit...</p>
        </div>
      </main>
    );
  }

  if (!deposit) {
    return (
      <main className="withdraw-deposit-page">
        <style>{`
          .withdraw-state {
            max-width: 850px;
            margin: 0 auto;
          }

          .withdraw-state h1 {
            margin: 0 0 10px;
            color: #0f172a;
            font-size: 30px;
          }

          .withdraw-state p {
            margin: 0 0 18px;
            color: #64748b;
            font-size: 14px;
          }

          .withdraw-state a {
            display: inline-flex;
            align-items: center;
            min-height: 40px;
            padding: 0 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #334155;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
          }
        `}</style>

        <div className="withdraw-state">
          <h1>Withdraw Deposit</h1>
          <p>
            {message || "Deposit not found."}
          </p>
          <Link href="/deposits">
            ← Back to Deposits
          </Link>
        </div>
      </main>
    );
  }

  if (deposit.status !== "active") {
    return (
      <main className="withdraw-deposit-page">
        <style>{`
          .withdraw-state {
            max-width: 850px;
            margin: 0 auto;
          }

          .withdraw-state h1 {
            margin: 0 0 10px;
            color: #0f172a;
            font-size: 30px;
          }

          .withdraw-state p {
            margin: 0 0 18px;
            color: #64748b;
            font-size: 14px;
          }

          .withdraw-state a {
            display: inline-flex;
            align-items: center;
            min-height: 40px;
            padding: 0 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #334155;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
          }
        `}</style>

        <div className="withdraw-state">
          <h1>Withdraw Deposit</h1>
          <p>
            This deposit is no longer active and cannot
            be withdrawn.
          </p>
          <Link href={`/deposits/${depositId}`}>
            ← Back to Deposit
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="withdraw-deposit-page">
      <style>{`
        .withdraw-deposit-page {
          max-width: 850px;
          margin: 0 auto;
        }

        .withdraw-back {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          margin-bottom: 16px;
          color: #475569;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .withdraw-back:hover {
          color: #0f172a;
        }

        .withdraw-header {
          margin-bottom: 20px;
        }

        .withdraw-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1.2;
        }

        .withdraw-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .withdraw-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .withdraw-summary-card {
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #fff;
          padding: 16px;
        }

        .withdraw-summary-label {
          margin-bottom: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .withdraw-summary-value {
          color: #0f172a;
          font-size: 18px;
          font-weight: 700;
        }

        .withdraw-form {
          display: grid;
          gap: 16px;
        }

        .withdraw-section {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 20px;
        }

        .withdraw-section h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 17px;
        }

        .withdraw-section-description {
          margin: 0 0 18px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .withdraw-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .withdraw-field {
          min-width: 0;
        }

        .withdraw-field-full {
          grid-column: 1 / -1;
        }

        .withdraw-field label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .withdraw-field input,
        .withdraw-field select,
        .withdraw-field textarea {
          box-sizing: border-box;
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #0f172a;
          font: inherit;
          font-size: 14px;
          outline: none;
        }

        .withdraw-field input,
        .withdraw-field select {
          min-height: 42px;
          padding: 0 11px;
        }

        .withdraw-field textarea {
          min-height: 100px;
          padding: 10px 11px;
          resize: vertical;
          line-height: 1.5;
        }

        .withdraw-field input:focus,
        .withdraw-field select:focus,
        .withdraw-field textarea:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.12);
        }

        .withdraw-field select:disabled {
          background: #f8fafc;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .withdraw-help {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
        }

        .withdraw-warning {
          margin-top: 8px;
          border-radius: 8px;
          background: #fffbeb;
          color: #92400e;
          padding: 9px 11px;
          font-size: 12px;
          line-height: 1.45;
        }

        .withdraw-error {
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          color: #991b1b;
          padding: 11px 13px;
          font-size: 13px;
          line-height: 1.45;
        }

        .withdraw-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          padding-top: 2px;
        }

        .withdraw-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 17px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .withdraw-button:hover {
          background: #f8fafc;
        }

        .withdraw-submit {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
          cursor: pointer;
        }

        .withdraw-submit:hover {
          background: #1e293b;
        }

        .withdraw-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 650px) {
          .withdraw-header h1 {
            font-size: 26px;
          }

          .withdraw-summary {
            grid-template-columns: 1fr;
          }

          .withdraw-section {
            padding: 16px;
          }

          .withdraw-fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .withdraw-field-full {
            grid-column: auto;
          }

          .withdraw-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .withdraw-button {
            width: 100%;
            padding: 0 10px;
          }
        }

        @media (max-width: 400px) {
          .withdraw-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Link
        href={`/deposits/${depositId}`}
        className="withdraw-back"
      >
        ← Back to Deposit
      </Link>

      <header className="withdraw-header">
        <h1>Withdraw Deposit</h1>
        <p>
          Close this deposit and record the amount
          received into one of your active accounts.
        </p>
      </header>

      <div className="withdraw-summary">
        <div className="withdraw-summary-card">
          <div className="withdraw-summary-label">
            Deposit
          </div>
          <div className="withdraw-summary-value">
            {deposit.name}
          </div>
        </div>

        <div className="withdraw-summary-card">
          <div className="withdraw-summary-label">
            Principal
          </div>
          <div className="withdraw-summary-value">
            {deposit.currency}{" "}
            {formatMoney(
              deposit.principal_amount,
            )}
          </div>
        </div>
      </div>

      {message && (
        <div
          className="withdraw-error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="withdraw-form"
      >
        <section className="withdraw-section">
          <h2>Withdrawal Details</h2>
          <p className="withdraw-section-description">
            Enter what you actually received and where
            the money should be recorded.
          </p>

          <div className="withdraw-fields">
            <div className="withdraw-field">
              <label htmlFor="received-amount">
                Received Amount
              </label>

              <input
                id="received-amount"
                type="number"
                min={deposit.principal_amount}
                step="0.01"
                inputMode="decimal"
                value={receivedAmount}
                onChange={(event) =>
                  setReceivedAmount(
                    event.target.value,
                  )
                }
                placeholder={formatMoney(
                  deposit.principal_amount,
                )}
                required
              />

              <p className="withdraw-help">
                Must be at least the original principal.
                A higher amount records the additional
                return received.
              </p>
            </div>

            <div className="withdraw-field">
              <label htmlFor="receive-account">
                Receive Into
              </label>

              <select
                id="receive-account"
                value={accountId}
                onChange={(event) =>
                  setAccountId(event.target.value)
                }
                disabled={accounts.length === 0}
                required
              >
                <option value="">
                  {accounts.length === 0
                    ? "No eligible accounts"
                    : "Select account"}
                </option>

                {accounts.map((account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                  </option>
                ))}
              </select>

              {accounts.length === 0 && (
                <div className="withdraw-warning">
                  No active {deposit.currency} asset
                  accounts are available. Create or
                  activate a matching account before
                  withdrawing this deposit.
                </div>
              )}
            </div>

            <div className="withdraw-field">
              <label htmlFor="withdrawal-date">
                Withdrawal Date
              </label>

              <input
                id="withdrawal-date"
                type="date"
                value={withdrawalDate}
                onChange={(event) =>
                  setWithdrawalDate(
                    event.target.value,
                  )
                }
                required
              />
            </div>
          </div>
        </section>

        <section className="withdraw-section">
          <h2>Notes</h2>
          <p className="withdraw-section-description">
            Optionally record information about the
            withdrawal or maturity.
          </p>

          <div className="withdraw-fields">
            <div className="withdraw-field withdraw-field-full">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Optional withdrawal notes"
              />
            </div>
          </div>
        </section>

        <div className="withdraw-actions">
          <Link
            href={`/deposits/${depositId}`}
            className="withdraw-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="withdraw-button withdraw-submit"
            disabled={
              saving || accounts.length === 0
            }
          >
            {saving
              ? "Processing..."
              : "Withdraw Deposit"}
          </button>
        </div>
      </form>
    </main>
  );
}

