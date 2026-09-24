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

  // 1. Tuition students — tuition_payments cascades on delete (FK CASCADE).
  {
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

  // 2. Investments — investment_activity cascades on delete (FK CASCADE).
  {
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



