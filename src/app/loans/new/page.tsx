"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isContactPickerSupported,
  pickContact,
} from "@/lib/contacts/pick-contact";

type Account = {
  id: string;
  name: string;
  currency: string;
  account_type: "asset" | "liability";
};

function getLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function NewLoanPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loanType, setLoanType] =
    useState<"lent" | "borrowed">("lent");

  const [personName, setPersonName] = useState("");
  const [whatsappNumber, setWhatsappNumber] =
    useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [startDateTime, setStartDateTime] =
    useState("");
  const [dueDate, setDueDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [contactLoading, setContactLoading] =
    useState(false);

  useEffect(() => {
    async function loadAccounts() {
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
        return;
      }

      setAccounts(data ?? []);

      console.log(
        "LOAN ACCOUNTS:",
        data,
        "ERROR:",
        error,
      );

      setStartDateTime(getLocalDateTime());
    }

    void loadAccounts();
  }, [supabase]);

  const availableAccounts = accounts.filter(
    (account) => account.currency === currency,
  );

  async function chooseContact() {
    setContactLoading(true);
    setMessage("");

    try {
      const contact = await pickContact();

      if (!contact) {
        setMessage("No contact was selected.");
        return;
      }

      if (contact.name) {
        setPersonName(contact.name);
      }

      if (contact.phoneNumber) {
        setWhatsappNumber(contact.phoneNumber);
      } else {
        setMessage(
          "The selected contact has no phone number.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to select contact.",
      );
    } finally {
      setContactLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const numericAmount = Number(amount);

    if (!personName.trim()) {
      setMessage("Enter the person's name.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Enter a valid amount.");
      return;
    }

    if (!startDateTime) {
      setMessage(
        "Select the start date and time.",
      );
      return;
    }

    const startTimestamp = new Date(
      startDateTime,
    );

    if (Number.isNaN(startTimestamp.getTime())) {
      setMessage(
        "Enter a valid start date and time.",
      );
      return;
    }

    const startDate =
      startDateTime.slice(0, 10);

    if (dueDate && dueDate < startDate) {
      setMessage(
        "Due date cannot be before the start date.",
      );
      return;
    }

    if (!accountId) {
      setMessage("Select the account.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name: personName.trim(),
        p_loan_type: loanType,
        p_principal_amount: numericAmount,
        p_currency: currency,
        p_start_datetime:
          startTimestamp.toISOString(),
        p_source_account_id: accountId,
        p_due_date: dueDate || null,
        p_description:
          description.trim() || null,
        p_whatsapp_number:
          whatsappNumber.trim() || null,
      },
    );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    router.push("/loans");
    router.refresh();
  }

  return (
    <main>
      <h1>
        {loanType === "lent"
          ? "Lend Money"
          : "Borrow Money"}
      </h1>

      {message && (
        <p role="alert">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="loan-type">
            Type
          </label>

          <select
            id="loan-type"
            value={loanType}
            onChange={(event) => {
              setLoanType(
                event.target.value as
                  | "lent"
                  | "borrowed",
              );
            }}
          >
            <option value="lent">
              I am lending money
            </option>

            <option value="borrowed">
              I am borrowing money
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="loan-person">
            Person
          </label>

          <input
            id="loan-person"
            value={personName}
            onChange={(event) =>
              setPersonName(event.target.value)
            }
            placeholder="Person name"
            required
          />

          {isContactPickerSupported() && (
            <button
              type="button"
              onClick={chooseContact}
              disabled={contactLoading}
              style={{
                marginTop: 8,
              }}
            >
              {contactLoading
                ? "Selecting..."
                : "Choose from Contacts"}
            </button>
          )}
        </div>

        <div>
          <label htmlFor="loan-whatsapp">
            WhatsApp Number
          </label>

          <input
            id="loan-whatsapp"
            type="tel"
            value={whatsappNumber}
            onChange={(event) =>
              setWhatsappNumber(
                event.target.value,
              )
            }
            placeholder="Optional"
          />
        </div>

        <div>
          <label htmlFor="loan-amount">
            Amount
          </label>

          <input
            id="loan-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value)
            }
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="loan-currency">
            Currency
          </label>

          <select
            id="loan-currency"
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
          <label htmlFor="loan-account">
            {loanType === "lent"
              ? "Money From"
              : "Money Into"}
          </label>

          <select
            id="loan-account"
            value={accountId}
            onChange={(event) =>
              setAccountId(event.target.value)
            }
            required
          >
            <option value="">
              Select account
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
        </div>

        <div>
          <label htmlFor="loan-start">
            Start Date & Time
          </label>

          <input
            id="loan-start"
            type="datetime-local"
            value={startDateTime}
            onChange={(event) =>
              setStartDateTime(
                event.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="loan-due">
            Due Date (optional)
          </label>

          <input
            id="loan-due"
            type="date"
            value={dueDate}
            onChange={(event) =>
              setDueDate(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="loan-description">
            Description
          </label>

          <textarea
            id="loan-description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            placeholder="Optional"
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Loan"}
        </button>
      </form>
    </main>
  );
}