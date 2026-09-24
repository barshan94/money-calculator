"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Account = {
  id: string;
  name: string;
  currency: string;
  account_type: "asset" | "liability";
};

export default function NewDepositPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [depositType, setDepositType] =
    useState("fixed_deposit");
  const [currency, setCurrency] = useState("BDT");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [maturityAmount, setMaturityAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] =
    useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      setAccountsLoading(true);

      const { data, error } = await supabase
        .from("accounts")
        .select(
          "id, name, currency, account_type",
        )
        .eq("is_archived", false)
        .eq("is_system", false)
        .order("name");

      if (error) {
        setMessage(error.message);
        setAccountsLoading(false);
        return;
      }

      setAccounts(data ?? []);

      setStartDate(
        new Date().toISOString().slice(0, 10),
      );

      setAccountsLoading(false);
    }

    void loadAccounts();
  }, [supabase]);

  const availableAccounts = accounts.filter(
    (account) => account.currency === currency,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const principalAmount = Number(principal);

    const rate = interestRate
      ? Number(interestRate)
      : null;

    const maturity = maturityAmount
      ? Number(maturityAmount)
      : null;

    if (!name.trim()) {
      setMessage("Enter the deposit name.");
      return;
    }

    if (
      !Number.isFinite(principalAmount) ||
      principalAmount <= 0
    ) {
      setMessage("Enter a valid principal amount.");
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
      maturity < principalAmount
    ) {
      setMessage(
        "Maturity amount cannot be less than principal.",
      );
      return;
    }

    if (!startDate) {
      setMessage("Select the start date.");
      return;
    }

    if (
      maturityDate &&
      maturityDate < startDate
    ) {
      setMessage(
        "Maturity date cannot be before start date.",
      );
      return;
    }

    if (!accountId) {
      setMessage("Select the source account.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_deposit",
      {
        p_name: name.trim(),
        p_deposit_type: depositType,
        p_currency: currency,
        p_principal_amount: principalAmount,
        p_interest_rate: rate,
        p_maturity_amount: maturity,
        p_start_date: startDate,
        p_maturity_date: maturityDate || null,
        p_source_account_id: accountId,
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

  return (
    <main className="new-deposit-page">
      <style>{`
        .new-deposit-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .new-deposit-back {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          margin-bottom: 16px;
          color: #475569;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .new-deposit-back:hover {
          color: #0f172a;
        }

        .new-deposit-header {
          margin-bottom: 24px;
        }

        .new-deposit-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1.2;
        }

        .new-deposit-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .new-deposit-form {
          display: grid;
          gap: 16px;
        }

        .new-deposit-section {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 20px;
        }

        .new-deposit-section h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 17px;
        }

        .new-deposit-section-description {
          margin: 0 0 18px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .new-deposit-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .new-deposit-field {
          min-width: 0;
        }

        .new-deposit-field-full {
          grid-column: 1 / -1;
        }

        .new-deposit-field label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .new-deposit-field input,
        .new-deposit-field select,
        .new-deposit-field textarea {
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

        .new-deposit-field input,
        .new-deposit-field select {
          min-height: 42px;
          padding: 0 11px;
        }

        .new-deposit-field textarea {
          min-height: 100px;
          padding: 10px 11px;
          resize: vertical;
          line-height: 1.5;
        }

        .new-deposit-field input:focus,
        .new-deposit-field select:focus,
        .new-deposit-field textarea:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.12);
        }

        .new-deposit-field input:disabled,
        .new-deposit-field select:disabled {
          background: #f8fafc;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .new-deposit-help {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.4;
        }

        .new-deposit-error {
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          color: #991b1b;
          padding: 11px 13px;
          font-size: 13px;
          line-height: 1.45;
        }

        .new-deposit-account-warning {
          margin-top: 8px;
          border-radius: 8px;
          background: #fffbeb;
          color: #92400e;
          padding: 9px 11px;
          font-size: 12px;
          line-height: 1.45;
        }

        .new-deposit-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
          padding-top: 2px;
        }

        .new-deposit-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 17px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .new-deposit-button:hover {
          background: #f8fafc;
        }

        .new-deposit-submit {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
          cursor: pointer;
        }

        .new-deposit-submit:hover {
          background: #1e293b;
        }

        .new-deposit-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 650px) {
          .new-deposit-header h1 {
            font-size: 26px;
          }

          .new-deposit-section {
            padding: 16px;
          }

          .new-deposit-fields {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .new-deposit-field-full {
            grid-column: auto;
          }

          .new-deposit-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .new-deposit-button {
            width: 100%;
            padding: 0 10px;
          }
        }

        @media (max-width: 400px) {
          .new-deposit-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Link
        href="/deposits"
        className="new-deposit-back"
      >
        ← Back to Deposits
      </Link>

      <header className="new-deposit-header">
        <h1>New Deposit</h1>
        <p>
          Record a deposit, track its expected maturity,
          and keep the source account balance accurate.
        </p>
      </header>

      {message && (
        <div
          className="new-deposit-error"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="new-deposit-form"
      >
        <section className="new-deposit-section">
          <h2>Deposit Details</h2>
          <p className="new-deposit-section-description">
            Basic information about the deposit.
          </p>

          <div className="new-deposit-fields">
            <div className="new-deposit-field new-deposit-field-full">
              <label htmlFor="deposit-name">
                Deposit Name
              </label>

              <input
                id="deposit-name"
                name="depositName"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. DBBL FDR"
                required
              />
            </div>

            <div className="new-deposit-field">
              <label htmlFor="deposit-type">
                Deposit Type
              </label>

              <select
                id="deposit-type"
                name="depositType"
                value={depositType}
                onChange={(event) =>
                  setDepositType(event.target.value)
                }
              >
                <option value="fixed_deposit">
                  Fixed Deposit
                </option>
                <option value="savings">
                  Savings
                </option>
                <option value="security_deposit">
                  Security Deposit
                </option>
                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div className="new-deposit-field">
              <label htmlFor="deposit-currency">
                Currency
              </label>

              <select
                id="deposit-currency"
                name="currency"
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                  setAccountId("");
                }}
              >
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </section>

        <section className="new-deposit-section">
          <h2>Financial Details</h2>
          <p className="new-deposit-section-description">
            Enter the amount deposited and expected
            return.
          </p>

          <div className="new-deposit-fields">
            <div className="new-deposit-field">
              <label htmlFor="principal-amount">
                Principal Amount
              </label>

              <input
                id="principal-amount"
                name="principalAmount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={principal}
                onChange={(event) =>
                  setPrincipal(event.target.value)
                }
                placeholder="e.g. 100000"
                required
              />

              <p className="new-deposit-help">
                The amount moved from your source account
                into the deposit.
              </p>
            </div>

            <div className="new-deposit-field">
              <label htmlFor="interest-rate">
                Interest Rate %
              </label>

              <input
                id="interest-rate"
                name="interestRate"
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

              <p className="new-deposit-help">
                Enter the stated rate if one is available.
              </p>
            </div>

            <div className="new-deposit-field">
              <label htmlFor="maturity-amount">
                Maturity Amount
              </label>

              <input
                id="maturity-amount"
                name="maturityAmount"
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

              <p className="new-deposit-help">
                Expected amount received when the deposit
                matures.
              </p>
            </div>

            <div className="new-deposit-field">
              <label htmlFor="source-account">
                Source Account
              </label>

              <select
                id="source-account"
                name="sourceAccount"
                value={accountId}
                onChange={(event) =>
                  setAccountId(event.target.value)
                }
                disabled={
                  accountsLoading ||
                  availableAccounts.length === 0
                }
                required
              >
                <option value="">
                  {accountsLoading
                    ? "Loading accounts..."
                    : "Select account"}
                </option>

                {availableAccounts.map(
                  (account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name}
                    </option>
                  ),
                )}
              </select>

              {!accountsLoading &&
                availableAccounts.length ===
                  0 && (
                  <div className="new-deposit-account-warning">
                    No active {currency} accounts are
                    available. Create or activate a
                    matching account first.
                  </div>
                )}
            </div>
          </div>
        </section>

        <section className="new-deposit-section">
          <h2>Dates & Notes</h2>
          <p className="new-deposit-section-description">
            Set the deposit period and add any useful
            information.
          </p>

          <div className="new-deposit-fields">
            <div className="new-deposit-field">
              <label htmlFor="start-date">
                Start Date
              </label>

              <input
                id="start-date"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                required
              />
            </div>

            <div className="new-deposit-field">
              <label htmlFor="maturity-date">
                Maturity Date
              </label>

              <input
                id="maturity-date"
                name="maturityDate"
                type="date"
                value={maturityDate}
                min={startDate || undefined}
                onChange={(event) =>
                  setMaturityDate(event.target.value)
                }
              />

              <p className="new-deposit-help">
                Optional. If provided, it cannot be before
                the start date.
              </p>
            </div>

            <div className="new-deposit-field new-deposit-field-full">
              <label htmlFor="deposit-description">
                Description
              </label>

              <textarea
                id="deposit-description"
                name="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Optional notes about this deposit"
              />
            </div>
          </div>
        </section>

        <div className="new-deposit-actions">
          <Link
            href="/deposits"
            className="new-deposit-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="new-deposit-button new-deposit-submit"
            disabled={
              saving ||
              accountsLoading ||
              availableAccounts.length === 0
            }
          >
            {saving
              ? "Saving..."
              : "Save Deposit"}
          </button>
        </div>
      </form>
    </main>
  );
}

