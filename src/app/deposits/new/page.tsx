"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, currency, account_type")
        .eq("is_archived", false)
        .eq("is_system", false)
        .order("name");

      if (error) {
        setMessage(error.message);
        return;
      }

      setAccounts(data ?? []);

      setStartDate(
        new Date().toISOString().slice(0, 10),
      );
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

    if (!principalAmount || principalAmount <= 0) {
      setMessage("Enter a valid principal amount.");
      return;
    }

    if (rate !== null && rate < 0) {
      setMessage("Interest rate cannot be negative.");
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
    <main>
      <h1>New Deposit</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Deposit Name</label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="e.g. DBBL FDR"
            required
          />
        </div>

        <div>
          <label>Deposit Type</label>

          <select
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
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label>Principal Amount</label>

          <input
            type="number"
            min="0.01"
            step="0.01"
            value={principal}
            onChange={(event) =>
              setPrincipal(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Currency</label>

          <select
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

        <div>
          <label>Interest Rate %</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={interestRate}
            onChange={(event) =>
              setInterestRate(event.target.value)
            }
            placeholder="Optional"
          />
        </div>

        <div>
          <label>Maturity Amount</label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={maturityAmount}
            onChange={(event) =>
              setMaturityAmount(event.target.value)
            }
            placeholder="Optional"
          />
        </div>

        <div>
          <label>Source Account</label>

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

            {availableAccounts.map((account) => (
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
          <label>Start Date</label>

          <input
            type="date"
            value={startDate}
            onChange={(event) =>
              setStartDate(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label>Maturity Date</label>

          <input
            type="date"
            value={maturityDate}
            onChange={(event) =>
              setMaturityDate(event.target.value)
            }
          />
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
          {saving ? "Saving..." : "Save Deposit"}
        </button>
      </form>
    </main>
  );
}