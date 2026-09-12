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

type Repayment = {
  transaction_id: string;
  transaction_date: string;
  amount: number;
  account_id: string;
  account_name: string;
  description: string | null;
  status: "posted" | "cancelled";
};

type Account = {
  id: string;
  name: string;
  currency: string;
};

function toDatetimeLocal(
  timestamp: string,
) {
  const date = new Date(timestamp);

  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

export default function EditLoanRepaymentPage() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const router = useRouter();
  const params = useParams();

  const loanId = params.id as string;
  const transactionId =
    params.transaction_id as string;

  const [loan, setLoan] =
    useState<Loan | null>(null);

  const [repayment, setRepayment] =
    useState<Repayment | null>(null);

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [amount, setAmount] =
    useState("");

  const [accountId, setAccountId] =
    useState("");

  const [paymentDatetime, setPaymentDatetime] =
    useState("");

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
          "id, person_name, loan_type, currency, principal_amount, status",
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
        data: repaymentData,
        error: repaymentError,
      } = await supabase.rpc(
        "get_loan_repayments",
        {
          p_loan_id: loanId,
        },
      );

      if (repaymentError) {
        setMessage(
          repaymentError.message,
        );
        return;
      }

      const foundRepayment = (
        repaymentData ?? []
      ).find(
        (item: Repayment) =>
          item.transaction_id ===
          transactionId,
      );

      if (!foundRepayment) {
        setMessage(
          "Loan repayment not found.",
        );
        return;
      }

      if (
        foundRepayment.status !==
        "posted"
      ) {
        setMessage(
          "This repayment has already been cancelled.",
        );
        return;
      }

      setRepayment(
        foundRepayment,
      );

      setAmount(
        Number(
          foundRepayment.amount,
        ).toString(),
      );

      setAccountId(
        foundRepayment.account_id,
      );

      setPaymentDatetime(
        toDatetimeLocal(
          foundRepayment.transaction_date,
        ),
      );

      setDescription(
        foundRepayment.description ??
          "",
      );

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
        setMessage(
          accountError.message,
        );
        return;
      }

      setAccounts(
        accountData ?? [],
      );
    }

    loadData();
  }, [
    loanId,
    transactionId,
    supabase,
  ]);

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
        "update_loan_repayment",
        {
          p_transaction_id:
            transactionId,
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

    router.push(
      `/loans/${loanId}`,
    );
    router.refresh();
  }

  if (!loan || !repayment) {
    return (
      <main>
        <h1>
          Edit Repayment
        </h1>

        {message && (
          <p>{message}</p>
        )}
      </main>
    );
  }

  return (
    <main>
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

      <h1>
        Edit Repayment
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
        <p>{message}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Repayment Amount
          </label>

          <input
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
          <label>
            Payment Date & Time
          </label>

          <input
            type="datetime-local"
            value={
              paymentDatetime
            }
            onChange={(event) =>
              setPaymentDatetime(
                event.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label>
            {loan.loan_type === "lent"
              ? "Receive Into"
              : "Pay From"}
          </label>

          <select
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

            {accounts.map(
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
        </div>

        <div>
          <label>
            Description
          </label>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Optional"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/loans/${loanId}`,
              )
            }
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}