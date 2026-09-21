import { describe, expect, it, vi } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { getGoalForecasts } from "@/lib/intelligence/get-goal-forecasts";

describe("getGoalForecasts", () => {
  it("returns forecast data for active goals", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "goal-1",
          name: "Emergency Fund",
          goal_type: "savings",
          currency: "BDT",
          target_amount: 12000,
          current_amount: 3000,
          target_date: "2027-01-01",
          status: "active",
        },
      ],
      error: null,
    });

    const eq = vi.fn(() => ({
      order,
    }));

    const select = vi.fn(() => ({
      eq,
    }));

    const from = vi.fn(() => ({
      select,
    }));

    mockCreateClient.mockResolvedValue({
      from,
    });

    const result = await getGoalForecasts(
      "2026-07-01",
    );

    expect(result).toHaveLength(1);

    expect(result[0]).toMatchObject({
      id: "goal-1",
      name: "Emergency Fund",
      goalType: "savings",
      currency: "BDT",
      targetAmount: 12000,
      currentAmount: 3000,
      targetDate: "2027-01-01",
    });

    expect(result[0].forecast).toMatchObject({
      progressPercent: 25,
      remainingAmount: 9000,
      monthsRemaining: 6,
      requiredMonthlyContribution: 1500,
      isCompleted: false,
      isPastDue: false,
    });
  });

  it("skips goals without a target date", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "goal-1",
          name: "No Deadline",
          goal_type: "savings",
          currency: "BDT",
          target_amount: 10000,
          current_amount: 2000,
          target_date: null,
          status: "active",
        },
      ],
      error: null,
    });

    const eq = vi.fn(() => ({
      order,
    }));

    const select = vi.fn(() => ({
      eq,
    }));

    const from = vi.fn(() => ({
      select,
    }));

    mockCreateClient.mockResolvedValue({
      from,
    });

    const result = await getGoalForecasts(
      "2026-07-01",
    );

    expect(result).toEqual([]);
  });

  it("throws when the goals query fails", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Database error",
      },
    });

    const eq = vi.fn(() => ({
      order,
    }));

    const select = vi.fn(() => ({
      eq,
    }));

    const from = vi.fn(() => ({
      select,
    }));

    mockCreateClient.mockResolvedValue({
      from,
    });

    await expect(
      getGoalForecasts("2026-07-01"),
    ).rejects.toThrow("Database error");
  });
});

