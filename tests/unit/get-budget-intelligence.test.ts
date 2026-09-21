import { describe, expect, it, vi } from "vitest";

const {
  mockGetBudgetProgress,
} = vi.hoisted(() => ({
  mockGetBudgetProgress: vi.fn(),
}));

vi.mock(
  "@/lib/finance/get-budget-progress",
  () => ({
    getBudgetProgress:
      mockGetBudgetProgress,
  }),
);

import { getBudgetIntelligence } from "@/lib/intelligence/get-budget-intelligence";

describe("getBudgetIntelligence", () => {
  it("returns intelligence for active budgets with end dates", async () => {
    mockGetBudgetProgress.mockResolvedValue([
      {
        id: "budget-1",
        categoryId: "category-1",
        categoryName: "Food",
        amount: 10000,
        spent: 5000,
        remaining: 5000,
        percentage: 50,
        currency: "BDT",
        period: "monthly",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        isActive: true,
      },
    ]);

    const result = await getBudgetIntelligence(
      "2026-07-16",
    );

    expect(result).toHaveLength(1);

    expect(result[0]).toMatchObject({
      id: "budget-1",
      categoryName: "Food",
      amount: 10000,
      spent: 5000,
      currency: "BDT",
      endDate: "2026-07-31",
    });

    expect(result[0].intelligence).toMatchObject({
      elapsedDays: 15,
      remainingDays: 15,
      projectedSpending: 10000,
      projectedDifference: 0,
      status: "on_track",
    });
  });

  it("skips inactive budgets", async () => {
    mockGetBudgetProgress.mockResolvedValue([
      {
        id: "budget-1",
        categoryId: "category-1",
        categoryName: "Food",
        amount: 10000,
        spent: 5000,
        remaining: 5000,
        percentage: 50,
        currency: "BDT",
        period: "monthly",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        isActive: false,
      },
    ]);

    const result = await getBudgetIntelligence(
      "2026-07-16",
    );

    expect(result).toEqual([]);
  });

  it("skips active budgets without an end date", async () => {
    mockGetBudgetProgress.mockResolvedValue([
      {
        id: "budget-1",
        categoryId: "category-1",
        categoryName: "Food",
        amount: 10000,
        spent: 5000,
        remaining: 5000,
        percentage: 50,
        currency: "BDT",
        period: "monthly",
        startDate: "2026-07-01",
        endDate: null,
        isActive: true,
      },
    ]);

    const result = await getBudgetIntelligence(
      "2026-07-16",
    );

    expect(result).toEqual([]);
  });

  it("throws when budget progress loading fails", async () => {
    mockGetBudgetProgress.mockRejectedValue(
      new Error("Budget query failed"),
    );

    await expect(
      getBudgetIntelligence("2026-07-16"),
    ).rejects.toThrow("Budget query failed");
  });
});
