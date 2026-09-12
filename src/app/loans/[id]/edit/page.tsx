"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

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

type Loan = {
  id: string;
  person_name: string;
  loan_type: "lent" | "borrowed";
  principal_amount: number;
  currency: string;
  start_datetime: string | null;
  due_date: string | null;
  description: string | null;
  whatsapp_number: string | null;
  status: "active" | "settled" | "cancelled";
};

function toDatetimeLocal(
  timestamp: string | null,
) {
  if (!timestamp) {
    const now = new Date();
    const offset =
      now.getTimezoneOffset() * 60000;

    return new Date(
      now.getTime() - offset,
    )
      .toISOString()
      .slice(0, 16);
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

export default function EditLoanPage() {
  const params = useParams<{
    id: string;
  }>();

  const loanId = params.id;

  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [loanType, setLoanType] =
    useState<"lent" | "borrowed">("lent");

  const [personName, setPersonName] =
    useState("");

  const [whatsappNumber, setWhatsappNumber] =
    useState("");

  const [amount, setAmount] = useState("");

  const [currency, setCurrency] =
    useState("BDT");

  const [startDateTime, setStartDateTime] =
    useState("");

  const [dueDate, setDueDate] =
    useState("");

  const [accountId, setAccountId] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [accounts, setAccounts] =
    useState<Account[]>([]);

  const [loan, setLoan] =
    useState<Loan | null>(null);

  const [message, setMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [contactLoading, setContactLoading] =
    useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [
        { data: loanData, error: loanError },
        { data: accountData, error: accountError },
      ] = await Promise.all([
        supabase
          .from("loans")
          .select(
            `
              id,
              person_name,
              loan_type,
              principal_amount,
              currency,
              start_datetime,
              due_date,
              description,
              whatsapp_number,
              status
            `,
          )
          .eq("id", loanId)
          .eq("user_id", user.id)
          .single(),

        supabase
          .from("accounts")
          .select(
            "id, name, currency, account_type",
          )
          .eq("is_archived", false)
          .eq("is_system", false)
          .order("name"),
      ]);

      if (loanError || !loanData) {
        setMessage(
          loanError?.message ??
            "Loan not found.",
        );
        setLoading(false);
        return;
      }

      if (accountError) {
        setMessage(accountError.message);
        setLoading(false);
        return;
      }

      const foundLoan =
        loanData as Loan;

      setLoan(foundLoan);
      setAccounts(accountData ?? []);

      setLoanType(
        foundLoan.loan_type,
      );

      setPersonName(
        foundLoan.person_name,
      );

      setWhatsappNumber(
        foundLoan.whatsapp_number ?? "",
      );

      setAmount(
        String(foundLoan.principal_amount),
      );

      setCurrency(
        foundLoan.currency,
      );

      setStartDateTime(
        toDatetimeLocal(
          foundLoan.start_datetime,
        ),
      );

      setDueDate(
        foundLoan.due_date ?? "",
      );

      setDescription(
        foundLoan.description ?? "",
      );

      /*
       * Find the original source account.
       */
      const { data: origin } =
        await supabase
          .from("transactions")
          .select("id")
          .eq("loan_id", loanId)
          .eq("user_id", user.id)
          .eq(
            "loan_transaction_role",
            "origin",
          )
          .eq("status", "posted")
          .order("created_at", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle();

      if (origin) {
        const { data: entry } =
          await supabase
            .from("transaction_entries")
            .select("account_id")
            .eq(
              "transaction_id",
              origin.id,
            )
            .in(
              "account_id",
              (accountData ?? []).map(
                (account) => account.id,
              ),
            )
            .maybeSingle();

        if (entry) {
          setAccountId(
            entry.account_id,
          );
        }
      }

      setLoading(false);
    }

    void load();
  }, [loanId, router, supabase]);

  const availableAccounts =
    accounts.filter(
      (account) =>
        account.currency === currency,
    );

  async function chooseContact() {
    setContactLoading(true);
    setMessage("");

    try {
      const contact = await pickContact();

      if (!contact) {
        setMessage(
          "No contact was selected.",
        );
        return;
      }

      if (contact.name) {
        setPersonName(contact.name);
      }

      if (contact.phoneNumber) {
        setWhatsappNumber(
          contact.phoneNumber,
        );
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

    const numericAmount =
      Number(amount);

    if (!personName.trim()) {
      setMessage(
        "Enter the person's name.",
      );
      return;
    }

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setMessage(
        "Enter a valid amount.",
      );
      return;
    }

    if (!startDateTime) {
      setMessage(
        "Select the start date and time.",
      );
      return;
    }

    const startTimestamp =
      new Date(startDateTime);

    if (
      Number.isNaN(
        startTimestamp.getTime(),
      )
    ) {
      setMessage(
        "Enter a valid start date and time.",
      );
      return;
    }

    const startDate =
      startDateTime.slice(0, 10);

    if (
      dueDate &&
      dueDate < startDate
    ) {
      setMessage(
        "Due date cannot be before the start date.",
      );
      return;
    }

    if (!accountId) {
      setMessage(
        "Select the account.",
      );
      return;
    }

    setSaving(true);

    const { error } =
      await supabase.rpc(
        "update_loan",
        {
          p_loan_id: loanId,
          p_person_name:
            personName.trim(),
          p_loan_type: loanType,
          p_principal_amount:
            numericAmount,
          p_currency: currency,
          p_start_datetime:
            startTimestamp.toISOString(),
          p_due_date:
            dueDate || null,
          p_description:
            description.trim() || null,
          p_whatsapp_number:
            whatsappNumber.trim() || null,
          p_source_account_id:
            accountId,
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

  if (loading) {
    return (
      <main>
        <p>Loading loan...</p>
      </main>
    );
  }

  if (!loan) {
    return (
      <main>
        <p>{message || "Loan not found."}</p>
      </main>
    );
  }

  if (loan.status === "cancelled") {
    return (
      <main>
        <h1>Loan Cancelled</h1>
        <p>
          Cancelled loans cannot be edited.
        </p>

        <button
          type="button"
          onClick={() =>
            router.push(
              `/loans/${loanId}`,
            )
          }
        >
          Back to Loan
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Loan</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Type</label>

          <select
            value={loanType}
            onChange={(event) =>
              setLoanType(
                event.target.value as
                  | "lent"
                  | "borrowed",
              )
            }
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
          <label>Person</label>

          <input
            value={personName}
            onChange={(event) =>
              setPersonName(
                event.target.value,
              )
            }
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
          <label>
            WhatsApp Number (optional)
          </label>

          <input
            type="tel"
            value={whatsappNumber}
            onChange={(event) =>
              setWhatsappNumber(
                event.target.value,
              )
            }
            placeholder="+8801XXXXXXXXX"
          />
        </div>

        <div>
          <label>Amount</label>

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
          <label>Currency</label>

          <select
            value={currency}
            onChange={(event) => {
              setCurrency(
                event.target.value,
              );
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
          <label>
            {loanType === "lent"
              ? "Money From"
              : "Money Into"}
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
          <label>
            Start Date & Time
          </label>

          <input
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
          <label>Due Date (optional)</label>

          <input
            type="date"
            value={dueDate}
            onChange={(event) =>
              setDueDate(
                event.target.value,
              )
            }
          />
        </div>

        <div>
          <label>Description</label>

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

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
          }}
        >
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
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}