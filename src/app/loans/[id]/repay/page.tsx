
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

export default function RepayLoanPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();

  const loanId = params.id as string;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("loans")
        .select(
          "id, person_name, loan_type, currency, principal_amount, status",
        )
        .eq("id", loanId)
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setLoan({
        ...data,
        principal_amount: Number(data.principal_amount),
      });

      const {
        data: accountData,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select("id, name, currency")
        .eq("is_archived", false)
        .eq("is_system", false)
        .eq("currency", data.currency)
        .order("name");

      if (accountError) {
        setMessage(accountError.message);
        return;
      }

      setAccounts(accountData ?? []);
    }

    loadData();
  }, [loanId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid repayment amount.");
      return;
    }

    if (!accountId) {
      setMessage("Select an account.");
      return;
    }

    if (!paymentDate) {
      setMessage("Select a payment date.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
  "record_loan_repayment",
  {
    p_loan_id: loanId,
    p_amount: numericAmount,
    p_account_id: accountId,
    p_payment_date: paymentDate,
    p_description:
      description.trim() || null,
  },
);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push(`/loans/${loanId}`);
    router.refresh();
  }

  if (!loan) {
    return (
      <main>
        <h1>Record Repayment</h1>

        {message && <p>{message}</p>}
      </main>
    );
  }

  if (loan.status !== "active") {
    return (
      <main>
        <h1>Record Repayment</h1>

        <p>This loan is no longer active.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Record Repayment</h1>

      <p>
        {loan.loan_type === "lent"
          ? `${loan.person_name} is paying you`
          : `You are paying ${loan.person_name}`}
      </p>

      <p>
        Original amount: {loan.currency}{" "}
        {loan.principal_amount.toLocaleString("en-BD", {
          minimumFractionDigits: 2,
        })}
      </p>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Repayment Amount</label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Payment Date</label>

          <input
            type="date"
            value={paymentDate}
            onChange={(event) =>
              setPaymentDate(event.target.value)
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
              setAccountId(event.target.value)
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
          <label>Description</label>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Optional"
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving
            ? "Saving..."
            : "Record Repayment"}
        </button>
      </form>
    </main>
  );
}
