import { describe, expect, it } from "vitest";
import {
  calculateInvestmentAnalytics,
  type InvestmentAnalyticsInput,
} from "@/lib/intelligence/calculate-investment-analytics";

function createInvestment(
  overrides: Partial<InvestmentAnalyticsInput> = {},
): InvestmentAnalyticsInput {
  return {
    id: "investment-1",
    name: "Test Investment",
    investmentType: "stock",
    investedAmount: 1000,
    currentValue: 1200,
    realizedProfitLoss: 0,
    unrealizedProfitLoss: 200,
    totalProfitLoss: 200,
    status: "active",
    archivedAt: null,
    ...overrides,
  };
}

describe("calculateInvestmentAnalytics", () => {
  it("calculates basic portfolio performance", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment(),
    ]);

    expect(result.totalInvested).toBe(1000);
    expect(result.currentPortfolioValue).toBe(1200);
    expect(result.totalProfitLoss).toBe(200);
    expect(result.overallReturnPercentage).toBe(20);
    expect(result.realizedProfitLoss).toBe(0);
    expect(result.unrealizedProfitLoss).toBe(200);
    expect(result.activeInvestmentCount).toBe(1);
  });

  it("aggregates multiple investments", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment({
        id: "investment-1",
        investedAmount: 1000,
        currentValue: 1200,
        totalProfitLoss: 200,
        unrealizedProfitLoss: 200,
      }),
      createInvestment({
        id: "investment-2",
        name: "Second Investment",
        investedAmount: 2000,
        currentValue: 1800,
        totalProfitLoss: -200,
        unrealizedProfitLoss: -200,
      }),
    ]);

    expect(result.totalInvested).toBe(3000);
    expect(result.currentPortfolioValue).toBe(3000);
    expect(result.totalProfitLoss).toBe(0);
    expect(result.overallReturnPercentage).toBe(0);
    expect(result.activeInvestmentCount).toBe(2);
  });

  it("keeps sold investments out of current portfolio value", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment({
        id: "active",
        investedAmount: 1000,
        currentValue: 1200,
        totalProfitLoss: 200,
      }),
      createInvestment({
        id: "sold",
        name: "Sold Investment",
        investedAmount: 500,
        currentValue: 700,
        realizedProfitLoss: 200,
        unrealizedProfitLoss: 0,
        totalProfitLoss: 200,
        status: "sold",
      }),
    ]);

    expect(result.totalInvested).toBe(1500);
    expect(result.currentPortfolioValue).toBe(1200);
    expect(result.totalProfitLoss).toBe(400);
    expect(result.realizedProfitLoss).toBe(200);
    expect(result.activeInvestmentCount).toBe(1);
  });

  it("excludes archived investments from the active portfolio", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment({
        id: "active",
        currentValue: 1000,
      }),
      createInvestment({
        id: "archived",
        currentValue: 5000,
        archivedAt: "2026-09-01T00:00:00.000Z",
      }),
    ]);

    expect(result.currentPortfolioValue).toBe(1000);
    expect(result.activeInvestmentCount).toBe(1);
  });

  it("calculates allocation by investment type", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment({
        id: "stock-1",
        investmentType: "stock",
        currentValue: 2000,
      }),
      createInvestment({
        id: "stock-2",
        investmentType: "stock",
        currentValue: 1000,
      }),
      createInvestment({
        id: "gold-1",
        investmentType: "gold",
        currentValue: 1000,
      }),
    ]);

    expect(result.currentPortfolioValue).toBe(4000);

    expect(result.allocationByType).toEqual([
      {
        investmentType: "stock",
        currentValue: 3000,
        percentage: 75,
      },
      {
        investmentType: "gold",
        currentValue: 1000,
        percentage: 25,
      },
    ]);
  });

  it("identifies the largest active investment and its concentration", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment({
        id: "small",
        name: "Small Investment",
        currentValue: 1000,
      }),
      createInvestment({
        id: "large",
        name: "Large Investment",
        investmentType: "gold",
        currentValue: 3000,
      }),
    ]);

    expect(result.largestInvestment).toEqual({
      id: "large",
      name: "Large Investment",
      investmentType: "gold",
      currentValue: 3000,
    });

    expect(
      result.largestInvestmentConcentrationPercentage,
    ).toBe(75);
  });

  it("returns zero return percentage when total invested amount is zero", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment({
        investedAmount: 0,
        currentValue: 500,
        totalProfitLoss: 500,
      }),
    ]);

    expect(result.overallReturnPercentage).toBe(0);
  });

  it("ignores rows containing non-finite financial values", () => {
    const result = calculateInvestmentAnalytics([
      createInvestment(),
      createInvestment({
        id: "invalid",
        investedAmount: Number.NaN,
        currentValue: 5000,
        totalProfitLoss: 5000,
      }),
    ]);

    expect(result.totalInvested).toBe(1000);
    expect(result.currentPortfolioValue).toBe(1200);
    expect(result.activeInvestmentCount).toBe(1);
  });

  it("handles an empty investment list", () => {
    const result = calculateInvestmentAnalytics([]);

    expect(result).toEqual({
      totalInvested: 0,
      currentPortfolioValue: 0,
      totalProfitLoss: 0,
      overallReturnPercentage: 0,
      realizedProfitLoss: 0,
      unrealizedProfitLoss: 0,
      activeInvestmentCount: 0,
      allocationByType: [],
      largestInvestment: null,
      largestInvestmentConcentrationPercentage: 0,
    });
  });
});

