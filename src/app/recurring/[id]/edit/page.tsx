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

type Category = {
  id: string;
  name: string;
  category_type: "income" | "expense";
};

type Account = {
  id: string;
  name: string;
  account_type: "asset" | "liability";
};

type TransactionType = "expense" | "income" | "transfer";
type Frequency = "daily" | "weekly" | "monthly" | "yearly";

function getLocalDateString() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatFrequency(frequency: Frequency) {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
  }
}

export default function EditRecurringTransactionPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const recurringId = params.id as string;
  const today = getLocalDateString();

  const [type, setType] =
    useState<TransactionType>("expense");

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [frequency, setFrequency] =
    useState<Frequency>("monthly");
  const [nextRunDate, setNextRunDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] =
    useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const [
        recurringResult,
        categoriesResult,
        accountsResult,
      ] = await Promise.all([
        supabase
          .from("recurring_transactions")
          .select(`
            id,
            name,
            transaction_type,
            amount,
            currency,
            frequency,
            next_run_date,
            category_id,
            source_account_id,
            destination_account_id,
            description
          `)
          .eq("id", recurringId)
          .eq("is_active", true)
          .single(),

        supabase
          .from("categories")
          .select("id, name, category_type")
          .eq("is_archived", false)
          .order("name"),

        supabase
          .from("accounts")
          .select("id, name, account_type")
          .eq("is_archived", false)
          .eq("is_system", false)
          .order("name"),
      ]);

      if (cancelled) {
        return;
      }

      if (recurringResult.error || !recurringResult.data) {
        setMessage(
          recurringResult.error?.message ??
            "Unable to find this recurring transaction.",
        );
        setLoading(false);
        return;
      }

      if (categoriesResult.error) {
        setMessage(
          `Failed to load categories: ${categoriesResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      if (accountsResult.error) {
        setMessage(
          `Failed to load accounts: ${accountsResult.error.message}`,
        );
        setLoading(false);
        return;
      }

      const item = recurringResult.data;

      setType(item.transaction_type as TransactionType);
      setName(item.name);
      setAmount(String(item.amount));
      setCurrency(item.currency);
      setFrequency(item.frequency as Frequency);
      setNextRunDate(item.next_run_date);
      setCategoryId(item.category_id ?? "");
      setSourceAccountId(item.source_account_id ?? "");
      setDestinationAccountId(
        item.destination_account_id ?? "",
      );
      setDescription(item.description ?? "");

      setCategories(categoriesResult.data ?? []);
      setAccounts(accountsResult.data ?? []);

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [recurringId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setMessage("");

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const numericAmount = Number(amount);

    if (!trimmedName) {
      setMessage("Enter a name.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage("Enter a valid amount greater than zero.");
      return;
    }

    if (!nextRunDate) {
      setMessage("Select the next run date.");
      return;
    }

    if (nextRunDate < today) {
      setMessage("Next run date cannot be in the past.");
      return;
    }

    if (type !== "transfer" && !categoryId) {
      setMessage("Select a category.");
      return;
    }

    if (
      (type === "expense" || type === "transfer") &&
      !sourceAccountId
    ) {
      setMessage("Select the source account.");
      return;
    }

    if (
      (type === "income" || type === "transfer") &&
      !destinationAccountId
    ) {
      setMessage("Select the destination account.");
      return;
    }

    if (
      type === "transfer" &&
      sourceAccountId === destinationAccountId
    ) {
      setMessage(
        "Source and destination accounts must be different.",
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "update_recurring_transaction",
      {
        p_recurring_id: recurringId,
        p_name: trimmedName,
        p_transaction_type: type,
        p_amount: numericAmount,
        p_currency: currency,
        p_frequency: frequency,
        p_next_run_date: nextRunDate,
        p_category_id:
          type === "transfer" ? null : categoryId,
        p_source_account_id:
          type === "income" ? null : sourceAccountId,
        p_destination_account_id:
          type === "expense"
            ? null
            : destinationAccountId,
        p_description: trimmedDescription || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/recurring");
    router.refresh();
  }

  const visibleCategories = categories.filter(
    (category) => category.category_type === type,
  );

  const typeLabel =
    type === "expense"
      ? "Expense"
      : type === "income"
        ? "Income"
        : "Transfer";

  if (loading) {
    return (
      <main className="recurring-edit-page">
        <style>{`
          .recurring-edit-page {
            max-width: 780px;
            margin: 0 auto;
            padding: 24px 16px 48px;
          }

          .recurring-loading {
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            background: #fff;
            padding: 24px;
          }

          .recurring-loading h1 {
            margin: 0;
            color: #0f172a;
            font-size: clamp(25px, 5vw, 32px);
          }

          .recurring-loading p {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 14px;
          }

          @media (max-width: 600px) {
            .recurring-edit-page {
              padding: 18px 12px 36px;
            }
          }
        `}</style>

        <div className="recurring-loading">
          <h1>Edit Recurring Transaction</h1>
          <p>Loading recurring transaction...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="recurring-edit-page">
      <style>{`
        .recurring-edit-page {
          max-width: 780px;
          margin: 0 auto;
          padding: 24px 16px 48px;
        }

        .recurring-back {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          margin-bottom: 12px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .recurring-back:hover {
          color: #0f172a;
        }

        .recurring-header {
          margin-bottom: 20px;
        }

        .recurring-header h1 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(26px, 5vw, 34px);
          line-height: 1.2;
        }

        .recurring-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .recurring-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 16px;
        }

        .recurring-summary-item {
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #f8fafc;
        }

        .recurring-summary-label {
          display: block;
          margin-bottom: 4px;
          color: #64748b;
          font-size: 11px;
        }

        .recurring-summary-value {
          display: block;
          overflow: hidden;
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .recurring-alert {
          margin-bottom: 16px;
          padding: 12px 13px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fef2f2;
          color: #991b1b;
          font-size: 14px;
          line-height: 1.45;
        }

        .recurring-form {
          display: grid;
          gap: 16px;
        }

        .recurring-section {
          display: grid;
          gap: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
        }

        .recurring-section-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
        }

        .recurring-section-header p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
        }

        .recurring-field {
          min-width: 0;
        }

        .recurring-label {
          display: block;
          margin-bottom: 7px;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .recurring-input,
        .recurring-select,
        .recurring-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #0f172a;
          font: inherit;
          font-size: 14px;
          outline: none;
        }

        .recurring-input,
        .recurring-select {
          min-height: 44px;
          padding: 10px 11px;
        }

        .recurring-textarea {
          min-height: 100px;
          padding: 10px 11px;
          resize: vertical;
        }

        .recurring-input:focus,
        .recurring-select:focus,
        .recurring-textarea:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.12);
        }

        .recurring-input:disabled,
        .recurring-select:disabled,
        .recurring-textarea:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .recurring-grid-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .recurring-type-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .recurring-type-option {
          position: relative;
          min-width: 0;
        }

        .recurring-type-option input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .recurring-type-button {
          display: flex;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          color: #334155;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
        }

        .recurring-type-button:hover {
          border-color: #94a3b8;
        }

        .recurring-type-option input:focus-visible
          + .recurring-type-button {
          outline: 3px solid rgba(100, 116, 139, 0.18);
          outline-offset: 2px;
        }

        .recurring-type-option input:checked
          + .recurring-type-button {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
        }

        .recurring-help {
          margin: 6px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.45;
        }

        .recurring-warning {
          margin: 0;
          padding: 10px 11px;
          border: 1px solid #fde68a;
          border-radius: 8px;
          background: #fffbeb;
          color: #92400e;
          font-size: 12px;
          line-height: 1.45;
        }

        .recurring-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .recurring-submit,
        .recurring-cancel {
          min-height: 44px;
          padding: 10px 17px;
          border-radius: 8px;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .recurring-submit {
          border: 1px solid #0f172a;
          background: #0f172a;
          color: #fff;
        }

        .recurring-submit:hover:not(:disabled) {
          background: #1e293b;
        }

        .recurring-cancel {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
        }

        .recurring-cancel:hover:not(:disabled) {
          background: #f8fafc;
        }

        .recurring-submit:disabled,
        .recurring-cancel:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        @media (max-width: 680px) {
          .recurring-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .recurring-grid-two {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .recurring-edit-page {
            padding: 18px 12px 36px;
          }

          .recurring-section {
            padding: 14px;
          }

          .recurring-type-grid {
            grid-template-columns: 1fr;
          }

          .recurring-type-button {
            min-height: 44px;
          }

          .recurring-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .recurring-submit,
          .recurring-cancel {
            width: 100%;
          }
        }

        @media (max-width: 390px) {
          .recurring-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Link
        href="/recurring"
        className="recurring-back"
      >
        ← Back to Recurring Transactions
      </Link>

      <header className="recurring-header">
        <h1>Edit Recurring Transaction</h1>

        <p>
          Update the schedule, amount, accounts, or other
          details.
        </p>

        <div className="recurring-summary" aria-label="Current schedule summary">
          <div className="recurring-summary-item">
            <span className="recurring-summary-label">
              Type
            </span>
            <strong className="recurring-summary-value">
              {typeLabel}
            </strong>
          </div>

          <div className="recurring-summary-item">
            <span className="recurring-summary-label">
              Amount
            </span>
            <strong className="recurring-summary-value">
              {currency} {amount || "0"}
            </strong>
          </div>

          <div className="recurring-summary-item">
            <span className="recurring-summary-label">
              Frequency
            </span>
            <strong className="recurring-summary-value">
              {formatFrequency(frequency)}
            </strong>
          </div>

          <div className="recurring-summary-item">
            <span className="recurring-summary-label">
              Next Run
            </span>
            <strong className="recurring-summary-value">
              {nextRunDate || "Not set"}
            </strong>
          </div>
        </div>
      </header>

      {message && (
        <div className="recurring-alert" role="alert">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="recurring-form"
      >
        <section className="recurring-section">
          <div className="recurring-section-header">
            <h2>Transaction Details</h2>
            <p>
              Update what this recurring transaction
              represents.
            </p>
          </div>

          <div className="recurring-field">
            <label
              htmlFor="name"
              className="recurring-label"
            >
              Name
            </label>

            <input
              id="name"
              className="recurring-input"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              disabled={saving}
              autoComplete="off"
            />
          </div>

          <div className="recurring-field">
            <span className="recurring-label">
              Transaction Type
            </span>

            <div className="recurring-type-grid">
              {(
                [
                  ["expense", "Expense"],
                  ["income", "Income"],
                  ["transfer", "Transfer"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="recurring-type-option"
                >
                  <input
                    type="radio"
                    name="transactionType"
                    value={value}
                    checked={type === value}
                    onChange={() => {
                      setType(value);
                      setCategoryId("");
                      setSourceAccountId("");
                      setDestinationAccountId("");
                    }}
                    disabled={saving}
                  />

                  <span className="recurring-type-button">
                    {label}
                  </span>
                </label>
              ))}
            </div>

            <p className="recurring-help">
              Changing the transaction type clears the
              current category and account selections.
            </p>
          </div>
        </section>

        <section className="recurring-section">
          <div className="recurring-section-header">
            <h2>Schedule & Amount</h2>
            <p>
              Set how much runs and when the next transaction
              should occur.
            </p>
          </div>

          <div className="recurring-grid-two">
            <div className="recurring-field">
              <label
                htmlFor="amount"
                className="recurring-label"
              >
                Amount
              </label>

              <input
                id="amount"
                className="recurring-input"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                required
                disabled={saving}
              />
            </div>

            <div className="recurring-field">
              <label
                htmlFor="currency"
                className="recurring-label"
              >
                Currency
              </label>

              <select
                id="currency"
                className="recurring-select"
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value)
                }
                disabled={saving}
              >
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="recurring-grid-two">
            <div className="recurring-field">
              <label
                htmlFor="frequency"
                className="recurring-label"
              >
                Frequency
              </label>

              <select
                id="frequency"
                className="recurring-select"
                value={frequency}
                onChange={(event) =>
                  setFrequency(
                    event.target.value as Frequency,
                  )
                }
                disabled={saving}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="recurring-field">
              <label
                htmlFor="nextRunDate"
                className="recurring-label"
              >
                Next Run Date
              </label>

              <input
                id="nextRunDate"
                className="recurring-input"
                type="date"
                min={today}
                value={nextRunDate}
                onChange={(event) =>
                  setNextRunDate(event.target.value)
                }
                required
                disabled={saving}
              />

              <p className="recurring-help">
                Future runs will continue according to the
                selected frequency.
              </p>
            </div>
          </div>
        </section>

        {type !== "transfer" && (
          <section className="recurring-section">
            <div className="recurring-section-header">
              <h2>Category</h2>
              <p>
                Categorize this recurring income or expense.
              </p>
            </div>

            <div className="recurring-field">
              <label
                htmlFor="category"
                className="recurring-label"
              >
                Category
              </label>

              <select
                id="category"
                className="recurring-select"
                value={categoryId}
                onChange={(event) =>
                  setCategoryId(event.target.value)
                }
                required
                disabled={saving}
              >
                <option value="">
                  Select category
                </option>

                {visibleCategories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>

              {visibleCategories.length === 0 && (
                <p className="recurring-warning">
                  No active {type} categories are available.
                  Create or activate a category before
                  saving this schedule.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="recurring-section">
          <div className="recurring-section-header">
            <h2>Accounts</h2>
            <p>
              Choose where money comes from and/or where it
              goes.
            </p>
          </div>

          {(type === "expense" || type === "transfer") && (
            <div className="recurring-field">
              <label
                htmlFor="sourceAccount"
                className="recurring-label"
              >
                Source Account
              </label>

              <select
                id="sourceAccount"
                className="recurring-select"
                value={sourceAccountId}
                onChange={(event) =>
                  setSourceAccountId(event.target.value)
                }
                required
                disabled={saving}
              >
                <option value="">
                  Select source account
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
            </div>
          )}

          {(type === "income" || type === "transfer") && (
            <div className="recurring-field">
              <label
                htmlFor="destinationAccount"
                className="recurring-label"
              >
                Destination Account
              </label>

              <select
                id="destinationAccount"
                className="recurring-select"
                value={destinationAccountId}
                onChange={(event) =>
                  setDestinationAccountId(event.target.value)
                }
                required
                disabled={saving}
              >
                <option value="">
                  Select destination account
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
            </div>
          )}

          {accounts.length === 0 && (
            <p className="recurring-warning">
              No active non-system accounts are available.
              You need an account before this recurring
              transaction can run.
            </p>
          )}

          {type === "transfer" &&
            sourceAccountId &&
            destinationAccountId &&
            sourceAccountId === destinationAccountId && (
              <p className="recurring-warning">
                Source and destination must be different
                accounts.
              </p>
            )}
        </section>

        <section className="recurring-section">
          <div className="recurring-section-header">
            <h2>Notes</h2>
            <p>
              Add optional information about this recurring
              schedule.
            </p>
          </div>

          <div className="recurring-field">
            <label
              htmlFor="description"
              className="recurring-label"
            >
              Description
            </label>

            <textarea
              id="description"
              className="recurring-textarea"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              disabled={saving}
              placeholder="Optional notes..."
            />
          </div>
        </section>

        <div className="recurring-actions">
          <button
            type="submit"
            className="recurring-submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            className="recurring-cancel"
            onClick={() => router.push("/recurring")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

