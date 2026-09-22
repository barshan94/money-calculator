import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

import { getInvestmentAnalytics } from "@/lib/intelligence/get-investment-analytics";

describe("getInvestmentAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "test-user-id",
        },
      },
    });
  });

  it("throws when the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });

    await expect(
      getInvestmentAnalytics(),
    ).rejects.toThrow("Authentication required");

    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws when the investment query fails", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Investment query failed",
          },
        }),
      }),
    });

    await expect(
      getInvestmentAnalytics(),
    ).rejects.toThrow("Investment query failed");
  });

  it("calculates analytics separately for each currency", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({
          data: [
            {
              id: "bdt-1",
              name: "BDT Stock",
              investment_type: "stock",
              currency: "BDT",
              invested_amount: 1000,
              current_value: 1200,
              realized_profit_loss: 0,
              unrealized_profit_loss: 200,
              total_profit_loss: 200,
              status: "active",
              archived_at: null,
            },
            {
              id: "bdt-2",
              name: "BDT Gold",
              investment_type: "gold",
              currency: "BDT",
              invested_amount: 2000,
              current_value: 2500,
              realized_profit_loss: 100,
              unrealized_profit_loss: 400,
              total_profit_loss: 500,
              status: "active",
              archived_at: null,
            },
            {
              id: "usd-1",
              name: "USD Stock",
              investment_type: "stock",
              currency: "USD",
              invested_amount: 100,
              current_value: 120,
              realized_profit_loss: 0,
              unrealized_profit_loss: 20,
              total_profit_loss: 20,
              status: "active",
              archived_at: null,
            },
          ],
          error: null,
        }),
      }),
    });

    const result = await getInvestmentAnalytics();

    expect(result).toEqual({
      BDT: {
        totalInvested: 3000,
        currentPortfolioValue: 3700,
        totalProfitLoss: 700,
        overallReturnPercentage:
          (700 / 3000) * 100,
        realizedProfitLoss: 100,
        unrealizedProfitLoss: 600,
        activeInvestmentCount: 2,
        allocationByType: [
          {
            investmentType: "gold",
            currentValue: 2500,
            percentage:
              (2500 / 3700) * 100,
          },
          {
            investmentType: "stock",
            currentValue: 1200,
            percentage:
              (1200 / 3700) * 100,
          },
        ],
        largestInvestment: {
          id: "bdt-2",
          name: "BDT Gold",
          investmentType: "gold",
          currentValue: 2500,
        },
        largestInvestmentConcentrationPercentage:
          (2500 / 3700) * 100,
      },
      USD: {
        totalInvested: 100,
        currentPortfolioValue: 120,
        totalProfitLoss: 20,
        overallReturnPercentage: 20,
        realizedProfitLoss: 0,
        unrealizedProfitLoss: 20,
        activeInvestmentCount: 1,
        allocationByType: [
          {
            investmentType: "stock",
            currentValue: 120,
            percentage: 100,
          },
        ],
        largestInvestment: {
          id: "usd-1",
          name: "USD Stock",
          investmentType: "stock",
          currentValue: 120,
        },
        largestInvestmentConcentrationPercentage: 100,
      },
    });
  });

  it("uses the existing archived filter when querying Supabase", async () => {
    const mockIs = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      is: mockIs,
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
    });

    await getInvestmentAnalytics();

    expect(mockFrom).toHaveBeenCalledWith(
      "investment_performance",
    );

    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining("realized_profit_loss"),
    );

    expect(mockIs).toHaveBeenCalledWith(
      "archived_at",
      null,
    );
  });

  it("returns an empty object when there are no investments", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getInvestmentAnalytics();

    expect(result).toEqual({});
  });
});

