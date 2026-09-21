import { describe, expect, it } from "vitest";
import {
  calculateFinancialInsights,
  type FinancialInsightsInput,
} from "@/lib/intelligence/calculate-financial-insights";

function createInput(
  overrides: Partial<FinancialInsightsInput> = {},
): FinancialInsightsInput {
  return {
    averageMonthlyIncome: 10000,
    averageMonthlyExpenses: 6000,
    averageMonthlySurplus: 4000,
    savingsRate: 40,
    expenseRatio: 60,

    incomeDirection: "stable",
    expenseDirection: "stable",
    netDirection: "stable",

    latestNet: 4000,

    projectedCashFlowNet: 4000,
    projectedNetWorthChange: 1000,

    goalCount: 2,
    goalsPastDue: 0,
    goalsCompleted: 0,

    budgetCount: 2,
    budgetsAtRisk: 0,
    budgetsProjectedOver: 0,

    riskWarnings: [],

    ...overrides,
  };
}

describe("calculateFinancialInsights", () => {
  it("reports a positive average monthly surplus", () => {
    const insights = calculateFinancialInsights(
      createInput(),
    );

    expect(insights).toContainEqual({
      type: "health",
      severity: "info",
      title: "Positive average monthly surplus",
      message:
        "Average monthly income is higher than average monthly expenses.",
      value: 4000,
      unit: "currency",
    });
  });

  it("reports an average monthly deficit as critical", () => {
    const insights = calculateFinancialInsights(
      createInput({
        averageMonthlySurplus: -1000,
        savingsRate: -10,
      }),
    );

    expect(insights).toContainEqual(
      expect.objectContaining({
        type: "health",
        severity: "critical",
        title: "Average monthly deficit",
        value: -1000,
        unit: "currency",
      }),
    );

    expect(insights).toContainEqual(
      expect.objectContaining({
        type: "health",
        severity: "critical",
        title: "Negative savings rate",
        value: -10,
        unit: "percent",
      }),
    );
  });

  it("reports income, expense, and net trends", () => {
    const insights = calculateFinancialInsights(
      createInput({
        incomeDirection: "up",
        expenseDirection: "down",
        netDirection: "up",
      }),
    );

    expect(
      insights.map((insight) => insight.title),
    ).toEqual(
      expect.arrayContaining([
        "Income is increasing",
        "Expenses are decreasing",
        "Net cash flow is improving",
      ]),
    );
  });

  it("converts existing risk warnings into insights", () => {
    const insights = calculateFinancialInsights(
      createInput({
        riskWarnings: [
          {
            type: "low_liquid_coverage",
            severity: "critical",
            title: "Low liquidity coverage",
            message:
              "Immediate liquid funds cover less than one month of average expenses.",
            value: 0.5,
            threshold: 1,
          },
          {
            type: "high_receivable_dependency",
            severity: "warning",
            title: "High receivable dependency",
            message:
              "More than half of total assets are represented by receivables.",
            value: 60,
            threshold: 50,
          },
        ],
      }),
    );

    expect(
      insights.filter(
        (insight) => insight.type === "risk",
      ),
    ).toEqual([
      {
        type: "risk",
        severity: "critical",
        title: "Low liquidity coverage",
        message:
          "Immediate liquid funds cover less than one month of average expenses.",
        value: 0.5,
        unit: "months",
      },
      {
        type: "risk",
        severity: "warning",
        title: "High receivable dependency",
        message:
          "More than half of total assets are represented by receivables.",
        value: 60,
        unit: "percent",
      },
    ]);
  });

  it("reports budget attention states", () => {
    const projectedOver = calculateFinancialInsights(
      createInput({
        budgetsProjectedOver: 2,
      }),
    );

    expect(projectedOver).toContainEqual(
      expect.objectContaining({
        type: "budget",
        severity: "warning",
        value: 2,
        unit: "count",
      }),
    );

    const atRisk = calculateFinancialInsights(
      createInput({
        budgetsAtRisk: 1,
      }),
    );

    expect(atRisk).toContainEqual(
      expect.objectContaining({
        type: "budget",
        severity: "warning",
        value: 1,
        unit: "count",
      }),
    );
  });

  it("reports goal status", () => {
    const insights = calculateFinancialInsights(
      createInput({
        goalsPastDue: 1,
        goalsCompleted: 2,
      }),
    );

    expect(insights).toContainEqual(
      expect.objectContaining({
        type: "goal",
        severity: "warning",
        title: "Goals are past due",
        value: 1,
        unit: "count",
      }),
    );

    expect(insights).toContainEqual(
      expect.objectContaining({
        type: "goal",
        severity: "info",
        title: "Goals completed",
        value: 2,
        unit: "count",
      }),
    );
  });

  it("reports negative forecast conditions", () => {
    const insights = calculateFinancialInsights(
      createInput({
        projectedCashFlowNet: -500,
        projectedNetWorthChange: -1000,
      }),
    );

    expect(insights).toContainEqual(
      expect.objectContaining({
        type: "forecast",
        severity: "warning",
        title: "Projected negative cash flow",
        value: -500,
        unit: "currency",
      }),
    );

    expect(insights).toContainEqual(
      expect.objectContaining({
        type: "forecast",
        severity: "warning",
        title: "Projected net-worth decline",
        value: -1000,
        unit: "currency",
      }),
    );
  });

  it("does not create trend insights for stable or insufficient data", () => {
    const insights = calculateFinancialInsights(
      createInput({
        incomeDirection: "stable",
        expenseDirection: "insufficient-data",
        netDirection: "stable",
      }),
    );

    expect(
      insights.filter(
        (insight) => insight.type === "trend",
      ),
    ).toEqual([]);
  });
});
