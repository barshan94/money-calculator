import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

describe("Goal edge cases", () => {
  let supabase: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
    const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    userId = data.user.id;
  });

  async function createTestGoal() {
    const { data, error } = await supabase.rpc("create_goal", {
      p_name: `Test Goal ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "BDT",
      p_target_amount: 10000,
      p_target_date: "2099-12-31",
      p_description: "Integration test",
    });

    if (error) throw error;

    return data as string;
  }

  it("rejects NaN target amount", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `NaN Goal ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "BDT",
      p_target_amount: Number.NaN,
      p_target_date: "2099-12-31",
    });

    expect(error).toBeTruthy();
  });

  it("rejects infinite target amount", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `Infinity Goal ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "BDT",
      p_target_amount: Number.POSITIVE_INFINITY,
      p_target_date: "2099-12-31",
    });

    expect(error).toBeTruthy();
  });

  it("rejects zero target amount", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `Zero Goal ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "BDT",
      p_target_amount: 0,
      p_target_date: "2099-12-31",
    });

    expect(error).toBeTruthy();
  });

  it("rejects negative target amount", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `Negative Goal ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "BDT",
      p_target_amount: -100,
      p_target_date: "2099-12-31",
    });

    expect(error).toBeTruthy();
  });

  it("rejects invalid goal type", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `Invalid Type ${Date.now()}`,
      p_goal_type: "invalid",
      p_currency: "BDT",
      p_target_amount: 10000,
      p_target_date: "2099-12-31",
    });

    expect(error).toBeTruthy();
  });

  it("rejects invalid currency", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `Invalid Currency ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "XYZ",
      p_target_amount: 10000,
      p_target_date: "2099-12-31",
    });

    expect(error).toBeTruthy();
  });

  it("rejects a past target date", async () => {
    const { error } = await supabase.rpc("create_goal", {
      p_name: `Past Date ${Date.now()}`,
      p_goal_type: "savings",
      p_currency: "BDT",
      p_target_amount: 10000,
      p_target_date: "2020-01-01",
    });

    expect(error).toBeTruthy();
  });

  it("rejects zero and negative progress", async () => {
    const goalId = await createTestGoal();

    const zero = await supabase.rpc("update_goal_progress", {
      p_goal_id: goalId,
      p_current_amount: -1,
    });

    expect(zero.error).toBeTruthy();
  });

  it("rejects progress above target", async () => {
    const goalId = await createTestGoal();

    const { error } = await supabase.rpc(
      "update_goal_progress",
      {
        p_goal_id: goalId,
        p_current_amount: 10001,
      },
    );

    expect(error).toBeTruthy();
  });

  it("rejects NaN and infinite progress", async () => {
    const goalId = await createTestGoal();

    const nanResult = await supabase.rpc(
      "update_goal_progress",
      {
        p_goal_id: goalId,
        p_current_amount: Number.NaN,
      },
    );

    expect(nanResult.error).toBeTruthy();

    const infinityResult = await supabase.rpc(
      "update_goal_progress",
      {
        p_goal_id: goalId,
        p_current_amount: Number.POSITIVE_INFINITY,
      },
    );

    expect(infinityResult.error).toBeTruthy();
  });

  it("prevents lowering target below current progress", async () => {
    const goalId = await createTestGoal();

    const progress = await supabase.rpc(
      "update_goal_progress",
      {
        p_goal_id: goalId,
        p_current_amount: 5000,
      },
    );

    expect(progress.error).toBeNull();

    const { error } = await supabase.rpc("update_goal", {
      p_goal_id: goalId,
      p_name: "Updated Goal",
      p_goal_type: "savings",
      p_target_amount: 4000,
      p_target_date: "2099-12-31",
      p_description: "Should fail",
    });

    expect(error).toBeTruthy();
  });

  it("completes a goal when progress reaches target", async () => {
    const goalId = await createTestGoal();

    const { error } = await supabase.rpc(
      "update_goal_progress",
      {
        p_goal_id: goalId,
        p_current_amount: 10000,
      },
    );

    expect(error).toBeNull();

    const { data, error: fetchError } = await supabase
      .from("goals")
      .select("current_amount, target_amount, status")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    expect(fetchError).toBeNull();
    expect(data?.current_amount).toBe(10000);
    expect(data?.target_amount).toBe(10000);
    expect(data?.status).toBe("completed");


});

  it("rejects NaN and infinite target amounts when updating", async () => {
    const goalId = await createTestGoal();

    const nanResult = await supabase.rpc("update_goal", {
      p_goal_id: goalId,
      p_name: "Updated Goal",
      p_goal_type: "savings",
      p_target_amount: Number.NaN,
      p_target_date: "2099-12-31",
    });

    expect(nanResult.error).toBeTruthy();

    const infinityResult = await supabase.rpc("update_goal", {
      p_goal_id: goalId,
      p_name: "Updated Goal",
      p_goal_type: "savings",
      p_target_amount: Number.POSITIVE_INFINITY,
      p_target_date: "2099-12-31",
    });

    expect(infinityResult.error).toBeTruthy();
  });

  it("rejects a past target date when updating", async () => {
    const goalId = await createTestGoal();

    const { error } = await supabase.rpc("update_goal", {
      p_goal_id: goalId,
      p_name: "Updated Goal",
      p_goal_type: "savings",
      p_target_amount: 10000,
      p_target_date: "2020-01-01",
    });

    expect(error).toBeTruthy();
  });

});
