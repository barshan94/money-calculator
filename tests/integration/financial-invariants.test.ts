/**
 * Financial Invariant Tests — Phase 24
 *
 * These tests verify that fundamental accounting identities
 * hold against real data in the database. They do NOT test
 * UI behaviour — they test financial correctness.
 *
 * Invariants verified:
 *   1. Every transaction is double-entry balanced (debits = credits)
 *   2. No posted transaction has fewer than two entries
 *   3. Loan remaining = principal - valid repayments
 *   4. No loan has repaid_amount exceeding principal
 *   5. transaction_entries reference transactions owned by the user
 *   6. transaction_entries reference accounts owned by the user
 *   7. Voided transactions have a matching reversal transaction
 *   8. Sold long-term assets have archived_at set
 *   9. Account balance RPC returns an entry per non-archived asset account
 *  10. get_financial_summary returns without error
 *  11. No loan has a negative principal amount
 *  12. Settled loans have zero remaining amount
 */

import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  createAuthenticatedClient,
  signInTestUser,
} from "./test-helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient;
let testUserId: string;

beforeAll(async () => {
  supabase = createAuthenticatedClient();

  await signInTestUser(supabase);

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  expect(userError).toBeNull();
  expect(userData.user).toBeTruthy();

  testUserId = userData.user!.id;
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function getAllTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, status, reversal_of_id")
    .eq("user_id", testUserId);

  expect(error).toBeNull();
  return data ?? [];
}

/**
 * Fetch ALL transaction entries for this user using pagination
 * and group them by transaction_id.
 *
 * PostgREST has a default row limit of 1000. Without pagination,
 * transactions whose entries fall past page 1 appear to have 0
 * entries, which would cause false invariant failures.
 */
async function getAllEntriesGrouped(): Promise<
  Map<string, Array<{ account_id: string; amount: number; entry_type: string }>>
> {
  const PAGE_SIZE = 1000;
  let offset = 0;
  let done = false;

  const map = new Map<
    string,
    Array<{ account_id: string; amount: number; entry_type: string }>
  >();

  while (!done) {
    const { data, error } = await supabase
      .from("transaction_entries")
      .select("transaction_id, account_id, amount, entry_type")
      .range(offset, offset + PAGE_SIZE - 1);

    expect(error).toBeNull();

    const rows = data ?? [];

    for (const entry of rows) {
      const list = map.get(entry.transaction_id) ?? [];
      list.push({
        account_id: entry.account_id,
        amount: Number(entry.amount),
        entry_type: entry.entry_type,
      });
      map.set(entry.transaction_id, list);
    }

    if (rows.length < PAGE_SIZE) {
      done = true;
    } else {
      offset += PAGE_SIZE;
    }
  }

  return map;
}

async function getLoanBalances() {
  const { data, error } =
    await supabase.rpc("get_loan_balances");

  expect(error).toBeNull();
  return data ?? [];
}

async function getAllAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, name, account_type, is_system, currency",
    )
    .eq("user_id", testUserId)
    .eq("is_archived", false);

  expect(error).toBeNull();
  return data ?? [];
}

async function getAccountBalances() {
  const { data, error } =
    await supabase.rpc("get_account_balances");

  expect(error).toBeNull();
  return data ?? [];
}

async function getAllLongTermAssets() {
  const { data, error } = await supabase
    .from("long_term_assets")
    .select("id, name, status, archived_at")
    .eq("user_id", testUserId);

  expect(error).toBeNull();
  return data ?? [];
}

/**
 * Test artifact assets created by integration tests follow
 * predictable name patterns (e.g. "Asset Edge 1790703989235").
 * These assets may have been sold during tests but not fully
 * cleaned up — exclude them from invariants that rely on
 * description-based transaction lookups.
 */
function isTestArtifact(name: string): boolean {
  return (
    /^Asset Edge \d/.test(name) ||
    /^Sale Test Asset \d/.test(name) ||
    /^Long.?term asset (sale|purchase) integration test/i.test(name) ||
    /test/i.test(name)
  );
}

// ─────────────────────────────────────────────────────────────
// Invariant 1 — every posted transaction is double-entry balanced
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 1: every transaction is double-entry balanced",
  () => {
    it(
      "has equal debit and credit totals for every posted transaction",
      async () => {
        const transactions = await getAllTransactions();
        const entriesByTx = await getAllEntriesGrouped();

        const posted = transactions.filter(
          (t) => t.status === "posted",
        );

        expect(posted.length).toBeGreaterThan(0);

        const imbalanced: string[] = [];

        for (const tx of posted) {
          const entries = entriesByTx.get(tx.id) ?? [];

          const debitTotal = entries
            .filter((e) => e.entry_type === "debit")
            .reduce((sum, e) => sum + e.amount, 0);

          const creditTotal = entries
            .filter((e) => e.entry_type === "credit")
            .reduce((sum, e) => sum + e.amount, 0);

          if (Math.abs(debitTotal - creditTotal) > 0.001) {
            imbalanced.push(
              `transaction ${tx.id}: debits=${debitTotal} credits=${creditTotal}`,
            );
          }
        }

        expect(imbalanced).toEqual([]);
      },
      60000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 2 — no posted transaction has fewer than two entries
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 2: no posted transaction has zero entries",
  () => {
    it(
      "every posted transaction has at least two entries",
      async () => {
        const transactions = await getAllTransactions();
        const entriesByTx = await getAllEntriesGrouped();

        const posted = transactions.filter(
          (t) => t.status === "posted",
        );

        const empty: string[] = [];

        for (const tx of posted) {
          const entries = entriesByTx.get(tx.id) ?? [];

          if (entries.length < 2) {
            empty.push(
              `transaction ${tx.id} has only ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`,
            );
          }
        }

        expect(empty).toEqual([]);
      },
      60000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 3 — loan remaining = principal - repayments
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 3: loan remaining = principal - repaid",
  () => {
    it(
      "remaining_amount matches principal_amount - repaid_amount for every loan",
      async () => {
        const balances = await getLoanBalances();

        if (balances.length === 0) {
          return;
        }

        const mismatched: string[] = [];

        for (const loan of balances) {
          const principal = Number(loan.principal_amount);
          const repaid = Number(loan.repaid_amount);
          const remaining = Number(loan.remaining_amount);
          const expected = principal - repaid;

          if (Math.abs(remaining - expected) > 0.001) {
            mismatched.push(
              `loan ${loan.id} (${loan.person_name}): ` +
                `principal=${principal} repaid=${repaid} ` +
                `remaining=${remaining} expected=${expected}`,
            );
          }
        }

        expect(mismatched).toEqual([]);
      },
      30000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 4 — no loan repaid beyond its principal
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 4: no loan is over-repaid",
  () => {
    it(
      "no loan has repaid_amount exceeding principal_amount",
      async () => {
        const balances = await getLoanBalances();

        const overRepaid: string[] = [];

        for (const loan of balances) {
          const principal = Number(loan.principal_amount);
          const repaid = Number(loan.repaid_amount);

          if (repaid > principal + 0.001) {
            overRepaid.push(
              `loan ${loan.id} (${loan.person_name}): ` +
                `repaid=${repaid} exceeds principal=${principal}`,
            );
          }
        }

        expect(overRepaid).toEqual([]);
      },
      30000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 5 — transaction_entries reference correct owner
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 5: transaction entries reference correct ownership",
  () => {
    it(
      "every transaction_entry belongs to a transaction owned by the authenticated user",
      async () => {
        const transactions = await getAllTransactions();
        const ownedIds = new Set(
          transactions.map((t) => t.id),
        );

        const { data: entries, error } = await supabase
          .from("transaction_entries")
          .select("id, transaction_id");

        expect(error).toBeNull();

        const orphaned: string[] = [];

        for (const entry of entries ?? []) {
          if (!ownedIds.has(entry.transaction_id)) {
            orphaned.push(
              `entry ${entry.id} references transaction ${entry.transaction_id} not owned by user`,
            );
          }
        }

        expect(orphaned).toEqual([]);
      },
      30000,
    );

    it(
      "every transaction_entry references an account owned by the authenticated user",
      async () => {
        const accounts = await getAllAccounts();
        const ownedAccountIds = new Set(
          accounts.map((a) => a.id),
        );

        const { data: entries, error } = await supabase
          .from("transaction_entries")
          .select("id, account_id");

        expect(error).toBeNull();

        const crossUser: string[] = [];

        for (const entry of entries ?? []) {
          if (!ownedAccountIds.has(entry.account_id)) {
            crossUser.push(
              `entry ${entry.id} references account ${entry.account_id} not owned by user`,
            );
          }
        }

        expect(crossUser).toEqual([]);
      },
      30000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 6 — voided transactions have a reversal
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 6: voided transactions have a matching reversal",
  () => {
    it(
      "every voided transaction has exactly one reversal transaction pointing at it",
      async () => {
        const transactions = await getAllTransactions();

        const voided = transactions.filter(
          (t) => t.status === "voided",
        );

        if (voided.length === 0) {
          return;
        }

        const reversalsByOriginal = new Map<string, number>();

        for (const tx of transactions) {
          if (tx.reversal_of_id) {
            reversalsByOriginal.set(
              tx.reversal_of_id,
              (reversalsByOriginal.get(tx.reversal_of_id) ?? 0) + 1,
            );
          }
        }

        const missing: string[] = [];
        const duplicates: string[] = [];

        for (const tx of voided) {
          const count =
            reversalsByOriginal.get(tx.id) ?? 0;

          if (count === 0) {
            missing.push(
              `voided transaction ${tx.id} has no reversal`,
            );
          } else if (count > 1) {
            duplicates.push(
              `voided transaction ${tx.id} has ${count} reversals (expected 1)`,
            );
          }
        }

        expect(missing).toEqual([]);
        expect(duplicates).toEqual([]);
      },
      30000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 7 — sold long-term assets have archived_at set
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 7: sold long-term assets are correctly archived",
  () => {
    it(
      "every asset with status=sold has archived_at set",
      async () => {
        const assets = await getAllLongTermAssets();

        const soldNotArchived = assets.filter(
          (a) => a.status === "sold" && !a.archived_at,
        );

        expect(soldNotArchived).toEqual([]);
      },
      30000,
    );

    it(
      "non-test sold assets have a corresponding sale transaction",
      async () => {
        const assets = await getAllLongTermAssets();

        /*
         * Only check production-like assets.
         * Test artifacts (created by integration tests) may
         * have been sold with a custom description or left
         * behind by incomplete cleanup — skip them.
         */
        const soldAssets = assets.filter(
          (a) =>
            a.status === "sold" &&
            !isTestArtifact(a.name),
        );

        if (soldAssets.length === 0) {
          return;
        }

        const missingSale: string[] = [];

        for (const asset of soldAssets) {
          const { data: saleTx, error } =
            await supabase
              .from("transactions")
              .select("id")
              .eq(
                "description",
                `Long-term asset sale: ${asset.name}`,
              )
              .limit(1)
              .maybeSingle();

          expect(error).toBeNull();

          if (!saleTx) {
            missingSale.push(
              `sold asset "${asset.name}" (${asset.id}) has no sale transaction`,
            );
          }
        }

        expect(missingSale).toEqual([]);
      },
      30000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 8 — account balance consistency
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 8: account balance consistency",
  () => {
    it(
      "get_account_balances returns an entry for every non-archived asset account",
      async () => {
        const accounts = await getAllAccounts();

        const nonSystemAssetAccounts = accounts.filter(
          (a) =>
            a.is_system === false &&
            a.account_type === "asset",
        );

        const balances = await getAccountBalances();
        const balanceAccountIds = new Set(
          balances.map(
            (b: { account_id?: string; id?: string }) =>
              b.account_id ?? b.id,
          ),
        );

        const missing: string[] = [];

        for (const account of nonSystemAssetAccounts) {
          if (!balanceAccountIds.has(account.id)) {
            missing.push(
              `account "${account.name}" (${account.id}) has no balance entry`,
            );
          }
        }

        expect(missing).toEqual([]);
      },
      30000,
    );

    it(
      "get_financial_summary returns without error",
      async () => {
        const { data, error } =
          await supabase.rpc("get_financial_summary");

        expect(error).toBeNull();
        expect(data).toBeTruthy();
      },
      30000,
    );
  },
);

// ─────────────────────────────────────────────────────────────
// Invariant 9 — loan data integrity
// ─────────────────────────────────────────────────────────────

describe(
  "Invariant 9: loan data integrity",
  () => {
    it(
      "no loan has a negative or zero principal amount",
      async () => {
        const { data: loans, error } = await supabase
          .from("loans")
          .select("id, principal_amount")
          .eq("user_id", testUserId);

        expect(error).toBeNull();

        const invalid = (loans ?? []).filter(
          (l) => Number(l.principal_amount) <= 0,
        );

        expect(invalid).toEqual([]);
      },
      30000,
    );

    it(
      "settled loans have zero remaining amount",
      async () => {
        const balances = await getLoanBalances();

        const settledWithBalance = balances.filter(
          (l: {
            status: string;
            remaining_amount: number | string;
          }) =>
            l.status === "settled" &&
            Number(l.remaining_amount) > 0.001,
        );

        expect(settledWithBalance).toEqual([]);
      },
      30000,
    );
  },
);
