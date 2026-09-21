import { describe, expect, it } from "vitest";
import { calculateWhatIfScenario } from "@/lib/intelligence/calculate-what-if-scenario";

describe("calculateWhatIfScenario", () => {
  it("calculates a scenario with higher income and lower expenses", () => {
    const result = calculateWhatIfScenario({
      monthlyIncome: 30000,
      monthlyExpenses: 20000,
      incomeChange: 5000,
      expenseChange: -2000,
      months: 6,
    });

    expect(result).toMatchObject({
      baselineIncome: 30000,
      baselineExpenses: 20000,
      baselineNet: 10000,
      scenarioIncome: 35000,
      scenarioExpenses: 18000,
      scenarioNet: 17000,
      monthlyNetDifference: 7000,
      cumulativeNetDifference: 42000,
    });

    expect(result?.months).toHaveLength(6);
    expect(result?.months[0]).toEqual({
      monthIndex: 1,
      scenarioIncome: 35000,
      scenarioExpenses: 18000,
      scenarioNet: 17000,
      cumulativeNet: 17000,
    });

    expect(result?.months[5].cumulativeNet).toBe(102000);
  });

  it("handles an expense increase", () => {
    const result = calculateWhatIfScenario({
      monthlyIncome: 30000,
      monthlyExpenses: 20000,
      incomeChange: 0,
      expenseChange: 3000,
      months: 3,
    });

    expect(result?.scenarioNet).toBe(7000);
    expect(result?.monthlyNetDifference).toBe(-3000);
    expect(result?.cumulativeNetDifference).toBe(-9000);
  });

  it("handles an income decrease", () => {
    const result = calculateWhatIfScenario({
      monthlyIncome: 30000,
      monthlyExpenses: 20000,
      incomeChange: -5000,
      expenseChange: 0,
      months: 4,
    });

    expect(result?.scenarioIncome).toBe(25000);
    expect(result?.scenarioNet).toBe(5000);
    expect(result?.monthlyNetDifference).toBe(-5000);
    expect(result?.cumulativeNetDifference).toBe(-20000);
  });

  it("preserves a negative scenario net", () => {
    const result = calculateWhatIfScenario({
      monthlyIncome: 10000,
      monthlyExpenses: 15000,
      incomeChange: 0,
      expenseChange: 2000,
      months: 2,
    });

    expect(result?.scenarioNet).toBe(-7000);
    expect(result?.months[1].cumulativeNet).toBe(-14000);
  });

  it("allows zero income and zero expenses", () => {
    const result = calculateWhatIfScenario({
      monthlyIncome: 0,
      monthlyExpenses: 0,
      incomeChange: 0,
      expenseChange: 0,
      months: 1,
    });

    expect(result?.scenarioNet).toBe(0);
    expect(result?.cumulativeNetDifference).toBe(0);
  });

  it("returns null when a scenario would create negative income or expenses", () => {
    expect(
      calculateWhatIfScenario({
        monthlyIncome: 10000,
        monthlyExpenses: 5000,
        incomeChange: -11000,
        expenseChange: 0,
        months: 3,
      }),
    ).toBeNull();

    expect(
      calculateWhatIfScenario({
        monthlyIncome: 10000,
        monthlyExpenses: 5000,
        incomeChange: 0,
        expenseChange: -6000,
        months: 3,
      }),
    ).toBeNull();
  });

  it("returns null for invalid configuration", () => {
    expect(
      calculateWhatIfScenario({
        monthlyIncome: 10000,
        monthlyExpenses: 5000,
        incomeChange: 0,
        expenseChange: 0,
        months: 0,
      }),
    ).toBeNull();

    expect(
      calculateWhatIfScenario({
        monthlyIncome: Number.NaN,
        monthlyExpenses: 5000,
        incomeChange: 0,
        expenseChange: 0,
        months: 3,
      }),
    ).toBeNull();
  });
});
