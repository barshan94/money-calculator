import { createClient } from "@supabase/supabase-js";

/**
 * Runs once before the whole Playwright suite.
 *
 * The E2E specs (tuition, investments, budgets) create rows tagged with an
 * "E2E ..." prefix but never delete them, so every CI run left its test
 * data behind permanently. Over many runs this made list-reload queries
 * (get_tuition_reliability, get_budget_progress, the students/investments
 * list fetches) slow enough to blow past the 15s `toBeVisible` timeouts
 * used throughout the specs — producing intermittent, spreading failures
 * that had nothing to do with the feature under test.
 *
 * This uses the Supabase service role key (already present in CI secrets)
 * to bypass RLS and delete prior E2E-tagged rows before the suite starts,
 * so every run begins from a clean, fast baseline.
 */
export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[global-setup] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping E2E data cleanup.",
    );
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // tuition_payments.transaction_id and investment_activity.transaction_id
  // are ON DELETE SET NULL toward transactions, not CASCADE. So deleting
  // tuition_students/investments alone (which cascades their payments/
  // activity rows) leaves the underlying transactions + transaction_entries
  // rows permanently orphaned — every payment and cancellation ever
  // recorded in CI. We collect those transaction ids first, then delete
  // the transactions explicitly (transaction_entries cascades from that).

  const orphanTransactionIds = new Set<string>();

  // 1. Tuition students — collect linked transaction ids before deleting.
  {
    const { data: students, error: studentLookupError } = await supabase
      .from("tuition_students")
      .select("id")
      .like("student_name", "E2E Student %");

    if (studentLookupError) {
      console.error(
        "[global-setup] Failed to look up E2E tuition_students:",
        studentLookupError.message,
      );
    } else {
      const studentIds = (students ?? []).map((s) => s.id);

      if (studentIds.length > 0) {
        const { data: payments, error: paymentLookupError } = await supabase
          .from("tuition_payments")
          .select("transaction_id")
          .in("student_id", studentIds);

        if (paymentLookupError) {
          console.error(
            "[global-setup] Failed to look up tuition_payments transactions:",
            paymentLookupError.message,
          );
        } else {
          for (const p of payments ?? []) {
            if (p.transaction_id) orphanTransactionIds.add(p.transaction_id);
          }
        }
      }

      const { error, count } = await supabase
        .from("tuition_students")
        .delete({ count: "exact" })
        .like("student_name", "E2E Student %");

      if (error) {
        console.error(
          "[global-setup] Failed to clean up tuition_students:",
          error.message,
        );
      } else {
        console.log(
          `[global-setup] Deleted ${count ?? 0} leftover tuition_students row(s).`,
        );
      }
    }
  }

  // 2. Investments — collect linked transaction ids before deleting.
  {
    const { data: investments, error: investmentLookupError } = await supabase
      .from("investments")
      .select("id")
      .like("name", "E2E Investment %");

    if (investmentLookupError) {
      console.error(
        "[global-setup] Failed to look up E2E investments:",
        investmentLookupError.message,
      );
    } else {
      const investmentIds = (investments ?? []).map((i) => i.id);

      if (investmentIds.length > 0) {
        const { data: activity, error: activityLookupError } = await supabase
          .from("investment_activity")
          .select("transaction_id")
          .in("investment_id", investmentIds);

        if (activityLookupError) {
          console.error(
            "[global-setup] Failed to look up investment_activity transactions:",
            activityLookupError.message,
          );
        } else {
          for (const a of activity ?? []) {
            if (a.transaction_id) orphanTransactionIds.add(a.transaction_id);
          }
        }
      }

      const { error, count } = await supabase
        .from("investments")
        .delete({ count: "exact" })
        .like("name", "E2E Investment %");

      if (error) {
        console.error(
          "[global-setup] Failed to clean up investments:",
          error.message,
        );
      } else {
        console.log(
          `[global-setup] Deleted ${count ?? 0} leftover investments row(s).`,
        );
      }
    }
  }

  // 3. Delete the orphaned ledger transactions (e.g. original payment
  // transactions AND the reversal transactions cancel_tuition_payment
  // creates, which point back via reversal_of_id). transaction_entries
  // cascades automatically since that FK is ON DELETE CASCADE.
  if (orphanTransactionIds.size > 0) {
    const ids = Array.from(orphanTransactionIds);

    // Include any reversal transactions that point at the ones we found,
    // since reversal_of_id -> transactions is ON DELETE SET NULL too.
    const { data: reversals, error: reversalLookupError } = await supabase
      .from("transactions")
      .select("id")
      .in("reversal_of_id", ids);

    if (reversalLookupError) {
      console.error(
        "[global-setup] Failed to look up reversal transactions:",
        reversalLookupError.message,
      );
    } else {
      for (const r of reversals ?? []) ids.push(r.id);
    }

    const { error, count } = await supabase
      .from("transactions")
      .delete({ count: "exact" })
      .in("id", ids);

    if (error) {
      console.error(
        "[global-setup] Failed to clean up orphaned transactions:",
        error.message,
      );
    } else {
      console.log(
        `[global-setup] Deleted ${count ?? 0} leftover transactions row(s) (and cascaded transaction_entries).`,
      );
    }
  } else {
    console.log(
      "[global-setup] No orphaned E2E transactions found to clean up.",
    );
  }

  // 3. Budgets — not named themselves; they hang off the fixture
  // "E2E Expense *" categories, so look up those category ids first.
  // Budgets are a leaf table (no FK children), so a direct delete is safe
  // and doesn't need to go through archive_budget/delete_budget.
  {
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .like("name", "E2E Expense %");

    if (categoryError) {
      console.error(
        "[global-setup] Failed to look up E2E expense categories:",
        categoryError.message,
      );
    } else {
      const categoryIds = (categories ?? []).map((c) => c.id);

      if (categoryIds.length > 0) {
        const { error, count } = await supabase
          .from("budgets")
          .delete({ count: "exact" })
          .in("category_id", categoryIds);

        if (error) {
          console.error(
            "[global-setup] Failed to clean up budgets:",
            error.message,
          );
        } else {
          console.log(
            `[global-setup] Deleted ${count ?? 0} leftover budgets row(s).`,
          );
        }
      } else {
        console.log(
          "[global-setup] No E2E expense categories found — skipping budgets cleanup.",
        );
      }
    }
  }
}


