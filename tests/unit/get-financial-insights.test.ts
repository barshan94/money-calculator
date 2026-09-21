import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFinancialHealth: vi.fn(),
  getIncomeExpenseTrends: vi.fn(),
  getCashFlowForecast: vi.fn(),
  getNetWorthForecast: vi.fn(),
  getGoalForecasts: vi.fn(),
  getBudgetIntelligence: vi.fn(),
  getLiquidityRiskWarnings: vi.fn(),
}));

vi.mock("@/lib/intelligence/get-financial-health", () => ({
  getFinancialHealth: mocks.getFinancialHealth,
}));

vi.mock("@/lib/intelligence/get-income-expense-trends", () => ({
  getIncomeExpenseTrends: mocks.getIncomeExpenseTrends,
}));

vi.mock("@/lib/intelligence/get-cash-flow-forecast", () => ({
  getCashFlowForecast: mocks.getCashFlowForecast,
}));

vi.mock("@/lib/intelligence/get-net-worth-forecast", () => ({
  getNetWorthForecast: mocks.getNetWorthForecast,
}));

vi.mock("@/lib/intelligence/get-goal-forecasts", () => ({
  getGoalForecasts: mocks.getGoalForecasts,
}));

vi.mock("@/lib/intelligence/get-budget-intelligence", () => ({
  getBudgetIntelligence: mocks.getBudgetIntelligence,
}));

vi.mock("@/lib/intelligence/get-liquidity-risk-warnings", () => ({
  getLiquidityRiskWarnings: mocks.getLiquidityRiskWarnings,
}));

import { getFinancialInsights } from "@/lib/intelligence/get-financial-insights";

describe("getFinancialInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getFinancialHealth.mockResolvedValue([
      {
        currency: "BDT",
        metrics: {
          averageMonthlyIncome: 10000,
          averageMonthlyExpenses: 6000,
          averageMonthlySurplus: 4000,
          savingsRate: 40,
          expenseRatio: 60,
          liquidCoverageMonths: 2,
          receivableDependency: 20,
          recurringExpenseBurden: 30,
        },
      },
      {
        currency: "USD",
        metrics: {
          averageMonthlyIncome: 1000,
          averageMonthlyExpenses: 700,
          averageMonthlySurplus: 300,
          savingsRate: 30,
          expenseRatio: 70,
          liquidCoverageMonths: 3,
          receivableDependency: 10,
          recurringExpenseBurden: 20,
        },
      },
    ]);

    mocks.getIncomeExpenseTrends.mockResolvedValue([
      {
        currency: "BDT",
        trends: {
          monthsAnalyzed: 6,
          averageIncome: 10000,
          averageExpenses: 6000,
          averageNet: 4000,
          latestIncome: 11000,
          latestExpenses: 6500,
          latestNet: 4500,
          incomeChange: 10,
          expenseChange: 5,
          netChange: 12.5,
          incomeDirection: "up",
          expenseDirection: "up",
          netDirection: "up",
        },
      },
      {
        currency: "USD",
        trends: {
          monthsAnalyzed: 6,
          averageIncome: 1000,
          averageExpenses: 700,
          averageNet: 300,
          latestIncome: 1000,
          latestExpenses: 700,
          latestNet: 300,
          incomeChange: 0,
          expenseChange: 0,
          netChange: 0,
          incomeDirection: "stable",
          expenseDirection: "stable",
          netDirection: "stable",
        },
      },
    ]);

    mocks.getCashFlowForecast.mockResolvedValue([
      {
        currency: "BDT",
        months: [
          {
            monthIndex: 1,
            projectedIncome: 10000,
            projectedExpenses: 6000,
            projectedNet: 4000,
          },
        ],
      },
      {
        currency: "USD",
        months: [
          {
            monthIndex: 1,
            projectedIncome: 1000,
            projectedExpenses: 700,
            projectedNet: 300,
          },
        ],
      },
    ]);

    mocks.getNetWorthForecast.mockResolvedValue([
      {
        currency: "BDT",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 50000,
            projectedChange: 1000,
          },
        ],
      },
      {
        currency: "USD",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 5000,
            projectedChange: 200,
          },
        ],
      },
    ]);

    mocks.getGoalForecasts.mockResolvedValue([
      {
        id: "goal-bdt-1",
        name: "Emergency Fund",
        goalType: "savings",
        currency: "BDT",
        targetAmount: 100000,
        currentAmount: 50000,
        targetDate: "2027-01-01",
        forecast: {
          progressPercent: 50,
          remainingAmount: 50000,
          daysRemaining: 100,
          monthsRemaining: 4,
          requiredMonthlyContribution: 12500,
          requiredDailyContribution: 500,
          isCompleted: false,
          isPastDue: true,
        },
      },
      {
        id: "goal-usd-1",
        name: "USD Goal",
        goalType: "savings",
        currency: "USD",
        targetAmount: 5000,
        currentAmount: 5000,
        targetDate: "2027-01-01",
        forecast: {
          progressPercent: 100,
          remainingAmount: 0,
          daysRemaining: 100,
          monthsRemaining: 4,
          requiredMonthlyContribution: 0,
          requiredDailyContribution: 0,
          isCompleted: true,
          isPastDue: false,
        },
      },
    ]);

    mocks.getBudgetIntelligence.mockResolvedValue([
      {
        id: "budget-bdt-1",
        categoryId: "category-1",
        categoryName: "Food",
        amount: 5000,
        spent: 6000,
        remaining: -1000,
        percentage: 120,
        currency: "BDT",
        period: "monthly",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        isActive: true,
        intelligence: {
          elapsedDays: 20,
          remainingDays: 10,
          currentDailySpending: 300,
          projectedSpending: 9000,
          projectedDifference: 4000,
          status: "projected_over_budget",
        },
      },
      {
        id: "budget-usd-1",
        categoryId: "category-2",
        categoryName: "Transport",
        amount: 500,
        spent: 300,
        remaining: 200,
        percentage: 60,
        currency: "USD",
        period: "monthly",
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        isActive: true,
        intelligence: {
          elapsedDays: 20,
          remainingDays: 10,
          currentDailySpending: 15,
          projectedSpending: 450,
          projectedDifference: -50,
          status: "on_track",
        },
      },
    ]);

    mocks.getLiquidityRiskWarnings.mockResolvedValue([
      {
        currency: "BDT",
        warnings: [
          {
            severity: "warning",
            title: "High receivable dependency",
            message:
              "Receivables represent a large share of total assets.",
            value: 60,
            threshold: 50,
            type: "high_receivable_dependency",
          },
        ],
      },
      {
        currency: "USD",
        warnings: [],
      },
    ]);
  });

  it("combines existing intelligence modules by currency", async () => {
    const results = await getFinancialInsights();

    expect(results).toHaveLength(2);

    const bdt = results.find(
      (result) => result.currency === "BDT",
    );

    const usd = results.find(
      (result) => result.currency === "USD",
    );

    expect(bdt).toBeDefined();
    expect(usd).toBeDefined();

    expect(bdt?.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "health",
          title: "Positive average monthly surplus",
          value: 4000,
          unit: "currency",
        }),
        expect.objectContaining({
          type: "trend",
          title: "Income is increasing",
        }),
        expect.objectContaining({
          type: "trend",
          title: "Expenses are increasing",
        }),
        expect.objectContaining({
          type: "trend",
          title: "Net cash flow is improving",
        }),
        expect.objectContaining({
          type: "risk",
          title: "High receivable dependency",
          value: 60,
          unit: "percent",
        }),
        expect.objectContaining({
          type: "budget",
          title: "Budgets are projected to exceed their limits",
          value: 1,
          unit: "count",
        }),
        expect.objectContaining({
          type: "goal",
          title: "Goals are past due",
          value: 1,
          unit: "count",
        }),
      ]),
    );

    expect(usd?.insights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "health",
          title: "Positive average monthly surplus",
          value: 300,
          unit: "currency",
        }),
        expect.objectContaining({
          type: "goal",
          title: "Goals completed",
          value: 1,
          unit: "count",
        }),
      ]),
    );

    expect(usd?.insights).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Income is increasing",
        }),
      ]),
    );
  });

  it("uses the standard six-month forecast configuration", async () => {
    await getFinancialInsights();

    expect(
      mocks.getCashFlowForecast,
    ).toHaveBeenCalledWith({
      lookbackMonths: 6,
      months: 6,
    });

    expect(
      mocks.getNetWorthForecast,
    ).toHaveBeenCalledWith({
      lookbackMonths: 6,
      months: 6,
    });
  });

  it("filters goals and budgets to the matching currency", async () => {
    const results = await getFinancialInsights();

    const bdt = results.find(
      (result) => result.currency === "BDT",
    );

    const usd = results.find(
      (result) => result.currency === "USD",
    );

    expect(
      bdt?.insights.filter(
        (insight) => insight.type === "goal",
      ),
    ).toHaveLength(1);

    expect(
      usd?.insights.filter(
        (insight) => insight.type === "goal",
      ),
    ).toHaveLength(1);

    expect(
      bdt?.insights.filter(
        (insight) => insight.type === "budget",
      ),
    ).toHaveLength(1);

    expect(
      usd?.insights.filter(
        (insight) => insight.type === "budget",
      ),
    ).toHaveLength(0);
  });

  it("includes currencies discovered from different intelligence modules", async () => {
    mocks.getFinancialHealth.mockResolvedValue([
      {
        currency: "BDT",
        metrics: {
          averageMonthlyIncome: 10000,
          averageMonthlyExpenses: 6000,
          averageMonthlySurplus: 4000,
          savingsRate: 40,
          expenseRatio: 60,
          liquidCoverageMonths: 2,
          receivableDependency: 20,
          recurringExpenseBurden: 30,
        },
      },
    ]);

    mocks.getIncomeExpenseTrends.mockResolvedValue([
      {
        currency: "EUR",
        trends: {
          monthsAnalyzed: 6,
          averageIncome: 2000,
          averageExpenses: 1500,
          averageNet: 500,
          latestIncome: 2000,
          latestExpenses: 1500,
          latestNet: 500,
          incomeChange: 0,
          expenseChange: 0,
          netChange: 0,
          incomeDirection: "stable",
          expenseDirection: "stable",
          netDirection: "stable",
        },
      },
    ]);

    mocks.getCashFlowForecast.mockResolvedValue([]);
    mocks.getNetWorthForecast.mockResolvedValue([]);
    mocks.getGoalForecasts.mockResolvedValue([]);
    mocks.getBudgetIntelligence.mockResolvedValue([]);
    mocks.getLiquidityRiskWarnings.mockResolvedValue([]);

    const results = await getFinancialInsights();

    expect(
      results.map((result) => result.currency),
    ).toEqual(
      expect.arrayContaining(["BDT", "EUR"]),
    );
  });

  it("returns an empty result when no intelligence module provides currencies", async () => {
    mocks.getFinancialHealth.mockResolvedValue([]);
    mocks.getIncomeExpenseTrends.mockResolvedValue([]);
    mocks.getCashFlowForecast.mockResolvedValue([]);
    mocks.getNetWorthForecast.mockResolvedValue([]);
    mocks.getGoalForecasts.mockResolvedValue([]);
    mocks.getBudgetIntelligence.mockResolvedValue([]);
    mocks.getLiquidityRiskWarnings.mockResolvedValue([]);

    const results = await getFinancialInsights();

    expect(results).toEqual([]);
  });
});
