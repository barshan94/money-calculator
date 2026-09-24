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

    void loadDeposit();
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
        p_description:
          description.trim() || null,
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
      <main className="edit-deposit-page">
        <style>{`
          .edit-deposit-loading {
            max-width: 900px;
            margin: 0 auto;
          }

          .edit-deposit-loading h1 {
            margin: 0;
            color: #0f172a;
            font-size: 30px;
          }

          .edit-deposit-loading p {
            margin-top: 8px;
            color: #64748b;
            font-size: 14px;
          }
        `}</style>

        <div className="edit-deposit-loading">
          <h1>Edit Deposit</h1>
          <p>Loading deposit...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-deposit-page">
      <style>{`
        .edit-deposit-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .edit-deposit-back {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          margin-bottom: 16px;
          color: #475569;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .edit-deposit-back:hover {
          color: #0f172a;
        }

        .edit-deposit-header {
          margin-bottom: 24px;
        }

        .edit-deposit-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1.2;
        }

        .edit-deposit-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .edit-deposit-form {
          display: grid;
          gap: 16px;
        }

        .edit-deposit-section {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 20px;
        }

        .edit-deposit-section h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 17px;
        }

        .edit-deposit-section-description {
          margin: 0 0 18px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .edit-deposit-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .edit-deposit-field {
          min-width: 0;
        }

        .edit-deposit-field-full {
          grid-column: 1 / -1;
        }

        .edit-deposit-field label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .edit-deposit-field input,
        .edit-deposit-field textarea {
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

        .edit-deposit-field input {
          min-height: 42px;
          padding: 0 11px;
        }

        .edit-deposit-field textarea {
          min-height: 100px;
          padding: 10px 11px;
          resize: vertical;
          line-height: 1.5;
        }

        .edit-deposit-field input:focus,
        .edit-deposit-field textarea:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.12);
        }

        .edit-deposit-field input:disabled {
          background: #f8fafc;
          color: #64748b;
          cursor: not-allowed;
        }

        .edit-deposit-help {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
        }

        .edit-deposit-error {
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          color: #991b1b;
          padding: 11px 13px;
          font-size: 13px;
          line-height: 1.45;
        }

        .edit-deposit-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
          padding-top: 2px;
        }

        .edit-deposit-button {
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

        .edit-deposit-button:hover {
          background: #f8fafc;
        }

        .edit-deposit-submit {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
          cursor: pointer;
        }

        .edit-deposit-submit:hover {
          background: #1e293b;
        }

        .edit-deposit-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 650px) {
          .edit-deposit-header h1 {
            font-size: 26px;
          }

          .edit-deposit-section {
            padding: 16px;
          }

          .edit-deposit-fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .edit-deposit-field-full {
            grid-column: auto;
          }

          .edit-deposit-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .edit-deposit-button {
            width: 100%;
            padding: 0 10px;
          }
        }

        @media (max-width: 400px) {
          .edit-deposit-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Link
        href={`/deposits/${depositId}`}
        className="edit-deposit-back"
      >
        ← Back to Deposit
      </Link>

      <header className="edit-deposit-header">
        <h1>Edit Deposit</h1>
        <p>
          Update the deposit details while keeping its
          original principal and transaction history intact.
        </p>
      </header>

      {message && (
        <div
          className="edit-deposit-error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="edit-deposit-form"
      >
        <section className="edit-deposit-section">
          <h2>Deposit Details</h2>
          <p className="edit-deposit-section-description">
            The principal amount is shown for reference
            and cannot be changed from this screen.
          </p>

          <div className="edit-deposit-fields">
            <div className="edit-deposit-field">
              <label htmlFor="deposit-name">
                Deposit Name
              </label>

              <input
                id="deposit-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
              />
            </div>

            <div className="edit-deposit-field">
              <label htmlFor="principal">
                Principal Amount
              </label>

              <input
                id="principal"
                value={principal.toFixed(2)}
                disabled
                readOnly
              />

              <p className="edit-deposit-help">
                The original principal is protected here
                because changing it would affect the
                underlying account transaction.
              </p>
            </div>
          </div>
        </section>

        <section className="edit-deposit-section">
          <h2>Return & Maturity</h2>
          <p className="edit-deposit-section-description">
            Update the expected return and maturity
            information.
          </p>

          <div className="edit-deposit-fields">
            <div className="edit-deposit-field">
              <label htmlFor="interest-rate">
                Interest Rate %
              </label>

              <input
                id="interest-rate"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={interestRate}
                onChange={(event) =>
                  setInterestRate(event.target.value)
                }
                placeholder="Optional"
              />
            </div>

            <div className="edit-deposit-field">
              <label htmlFor="maturity-amount">
                Maturity Amount
              </label>

              <input
                id="maturity-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={maturityAmount}
                onChange={(event) =>
                  setMaturityAmount(event.target.value)
                }
                placeholder="Optional"
              />

              <p className="edit-deposit-help">
                Cannot be lower than the principal amount.
              </p>
            </div>

            <div className="edit-deposit-field">
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
          </div>
        </section>

        <section className="edit-deposit-section">
          <h2>Notes</h2>
          <p className="edit-deposit-section-description">
            Add or update any information you want to keep
            with this deposit.
          </p>

          <div className="edit-deposit-fields">
            <div className="edit-deposit-field edit-deposit-field-full">
              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Optional notes about this deposit"
              />
            </div>
          </div>
        </section>

        <div className="edit-deposit-actions">
          <Link
            href={`/deposits/${depositId}`}
            className="edit-deposit-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="edit-deposit-button edit-deposit-submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

