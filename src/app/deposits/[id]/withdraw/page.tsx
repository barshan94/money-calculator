"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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

  if (loading) {
    return (
      <main>
        <h1>Withdraw Deposit</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (!deposit) {
    return (
      <main>
        <h1>Withdraw Deposit</h1>
        <p>
          {message || "Deposit not found."}
        </p>
      </main>
    );
  }

  if (deposit.status !== "active") {
    return (
      <main>
        <h1>Withdraw Deposit</h1>
        <p>
          This deposit is no longer active.
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Withdraw Deposit</h1>

      <p>{deposit.name}</p>

      <p>
        Principal: {deposit.currency}{" "}
        {deposit.principal_amount.toLocaleString(
          "en-BD",
          {
            minimumFractionDigits: 2,
          },
        )}
      </p>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="received-amount">
            Received Amount
          </label>

          <input
            id="received-amount"
            type="number"
            min={deposit.principal_amount}
            step="0.01"
            value={receivedAmount}
            onChange={(event) =>
              setReceivedAmount(
                event.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="receive-account">
            Receive Into
          </label>

          <select
            id="receive-account"
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

        <div>
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
          />
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Processing..."
            : "Withdraw Deposit"}
        </button>
      </form>
    </main>
  );
}

