"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Loan = {
  id: string;
  person_name: string;
  loan_type: "lent" | "borrowed";
  currency: string;
  principal_amount: number;
  status: "active" | "settled" | "cancelled";
};

type Account = {
  id: string;
  name: string;
  currency: string;
};

function getCurrentDateTime() {
  const now = new Date();

  const offset =
    now.getTimezoneOffset() * 60000;

  return new Date(
    now.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

export default function RecordLoanRepaymentPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const router = useRouter();
  const params = useParams();

  const loanId = params.id as string;

  const [loan, setLoan] =
    useState<Loan | null>(null);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [amount, setAmount] =
    useState("");

  const [accountId, setAccountId] =
    useState("");

  const [paymentDatetime, setPaymentDatetime] =
    useState(getCurrentDateTime());

  const [description, setDescription] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    async function loadData() {
      setMessage("");

      const {
        data: loanData,
        error: loanError,
      } = await supabase
        .from("loans")
        .select(
          `
            id,
            person_name,
            loan_type,
            currency,
            principal_amount,
            status
          `,
        )
        .eq("id", loanId)
        .single();

      if (loanError) {
        setMessage(loanError.message);
        return;
      }

      const loadedLoan: Loan = {
        ...loanData,
        principal_amount: Number(
          loanData.principal_amount,
        ),
      };

      setLoan(loadedLoan);

      const {
        data: accountData,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select(
          "id, name, currency",
        )
        .eq("is_archived", false)
        .eq("is_system", false)
        .eq(
          "currency",
          loadedLoan.currency,
        )
        .order("name");

      if (accountError) {
        setMessage(accountError.message);
        return;
      }

      setAccounts(accountData ?? []);
    }

    loadData();
  }, [loanId, supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const numericAmount =
      Number(amount);

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setMessage(
        "Enter a valid repayment amount.",
      );
      return;
    }

    if (!accountId) {
      setMessage(
        "Select an account.",
      );
      return;
    }

    if (!paymentDatetime) {
      setMessage(
        "Select a payment date and time.",
      );
      return;
    }

    setSaving(true);

    const paymentTimestamp =
      new Date(
        paymentDatetime,
      ).toISOString();

    const { error } =
      await supabase.rpc(
        "record_loan_repayment",
        {
          p_loan_id: loanId,
          p_amount: numericAmount,
          p_account_id: accountId,
          p_payment_datetime:
            paymentTimestamp,
          p_description:
            description.trim() || null,
        },
      );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    window.location.href =
      `/loans/${loanId}`;
  }

  if (!loan) {
    return (
      <main>
        <h1>
          Record Repayment
        </h1>

        {message && (
          <p role="alert">
            {message}
          </p>
        )}
      </main>
    );
  }

  return (
    <main>
      <div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/loans/${loanId}`,
            )
          }
          disabled={saving}
        >
          ← Back to Loan
        </button>
      </div>

      <h1>
        Record Repayment
      </h1>

      <p>
        {loan.loan_type === "lent"
          ? `${loan.person_name} is paying you`
          : `You are paying ${loan.person_name}`}
      </p>

      <p>
        Original loan:{" "}
        {loan.currency}{" "}
        {loan.principal_amount.toLocaleString(
          "en-BD",
          {
            minimumFractionDigits: 2,
          },
        )}
      </p>

      {message && (
        <p role="alert">
          {message}
        </p>
      )}

      <form
        noValidate
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="repayment-amount">
            Amount
          </label>

          <input
            id="repayment-amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="repayment-account">
            Money To
          </label>

          <select
            id="repayment-account"
            name="account"
            value={accountId}
            onChange={(event) =>
              setAccountId(
                event.target.value,
              )
            }
            required
          >
            <option value="">
              Select account
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

        <div>
          <label htmlFor="repayment-datetime">
            Payment Date & Time
          </label>

          <input
            id="repayment-datetime"
            name="paymentDatetime"
            type="datetime-local"
            value={paymentDatetime}
            onChange={(event) =>
              setPaymentDatetime(
                event.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="repayment-description">
            Description
          </label>

          <textarea
            id="repayment-description"
            name="description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
          />
        </div>

        <button
          type="submit"
          disabled={
            saving ||
            accounts.length === 0
          }
        >
          {saving
            ? "Saving..."
            : "Record Repayment"}
        </button>
      </form>
    </main>
  );
}

