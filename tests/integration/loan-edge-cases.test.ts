import { beforeAll, describe, expect, it } from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const email =
  process.env.PLAYWRIGHT_TEST_EMAIL!;
const password =
  process.env.PLAYWRIGHT_TEST_PASSWORD!;

let supabase: SupabaseClient;

beforeAll(async () => {
  supabase = createClient(
    supabaseUrl,
    supabaseKey,
  );

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  expect(error).toBeNull();
});

async function getBDTAssetAccount() {
  const { data, error } =
    await supabase
      .from("accounts")
      .select("id, currency")
      .eq("currency", "BDT")
      .eq("account_type", "asset")
      .eq("is_system", false)
      .eq("is_archived", false)
      .limit(1)
      .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data;
}

async function getArchivedAccount() {
  const { data, error } =
    await supabase
      .from("accounts")
      .select("id, currency")
      .eq("is_archived", true)
      .eq("is_system", false)
      .limit(1)
      .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data;
}

async function getSystemBDTAccount() {
  const { data, error } =
    await supabase
      .from("accounts")
      .select("id, currency")
      .eq("is_system", true)
      .eq("currency", "BDT")
      .limit(1)
      .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data;
}

async function getNonBDTAccount() {
  const { data, error } =
    await supabase
      .from("accounts")
      .select("id, currency")
      .neq("currency", "BDT")
      .eq("is_system", false)
      .eq("is_archived", false)
      .limit(1)
      .single();

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data;
}

async function createLoan(
  accountId: string,
  name: string,
  loanType: "lent" | "borrowed" = "lent",
) {
  const { data, error } =
    await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name: name,
        p_loan_type: loanType,
        p_principal_amount: 100,
        p_currency: "BDT",
        p_start_datetime:
          new Date().toISOString(),
        p_source_account_id: accountId,
        p_due_date: null,
        p_description:
          "Loan edge-case test",
        p_whatsapp_number: null,
      },
    );

  expect(error).toBeNull();
  expect(data).toBeTruthy();

  return data as string;
}

async function repay(
  loanId: string,
  accountId: string,
  amount = 20,
) {
  return await supabase.rpc(
    "record_loan_repayment",
    {
      p_loan_id: loanId,
      p_amount: amount,
      p_account_id: accountId,
      p_payment_datetime:
        new Date().toISOString(),
      p_description:
        "Loan repayment edge-case test",
    },
  );
}

async function cancelLoan(
  loanId: string,
) {
  return await supabase.rpc(
    "cancel_loan",
    {
      p_loan_id: loanId,
    },
  );
}

describe("loan repayment account edge cases", () => {
  it("rejects repayment into an archived account", async () => {
    const source =
      await getBDTAssetAccount();

    const archived =
      await getArchivedAccount();

    const loanId = await createLoan(
      source.id,
      `Archived Repayment ${Date.now()}`,
    );

    try {
      const result = await repay(
        loanId,
        archived.id,
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("rejects repayment into a system account", async () => {
    const source =
      await getBDTAssetAccount();

    const system =
      await getSystemBDTAccount();

    const loanId = await createLoan(
      source.id,
      `System Repayment ${Date.now()}`,
    );

    try {
      const result = await repay(
        loanId,
        system.id,
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("rejects repayment into a wrong-currency account", async () => {
    const source =
      await getBDTAssetAccount();

    const wrongCurrency =
      await getNonBDTAccount();

    const loanId = await createLoan(
      source.id,
      `Currency Repayment ${Date.now()}`,
    );

    try {
      const result = await repay(
        loanId,
        wrongCurrency.id,
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("accepts repayment into a valid BDT asset account", async () => {
    const source =
      await getBDTAssetAccount();

    const destination =
      await getBDTAssetAccount();

    const loanId = await createLoan(
      source.id,
      `Valid Repayment Account ${Date.now()}`,
    );

    try {
      const result = await repay(
        loanId,
        destination.id,
        20,
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("accepts repayment for a borrowed loan into a valid BDT asset account", async () => {
    const source =
      await getBDTAssetAccount();

    const destination =
      await getBDTAssetAccount();

    const loanId = await createLoan(
      source.id,
      `Borrowed Valid Repayment ${Date.now()}`,
      "borrowed",
    );

    try {
      const result = await repay(
        loanId,
        destination.id,
        20,
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });

  it("rejects repayment using an invalid account id", async () => {
    const source =
      await getBDTAssetAccount();

    const loanId = await createLoan(
      source.id,
      `Invalid Account Repayment ${Date.now()}`,
    );

    try {
      const result =
        await repay(
          loanId,
          "00000000-0000-0000-0000-000000000000",
        );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    } finally {
      await cancelLoan(loanId);
    }
  });
});
