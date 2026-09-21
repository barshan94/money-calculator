import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/finance/get-liquidity-summary", () => ({
  getLiquiditySummary: vi.fn(),
}));

vi.mock("../../src/lib/finance/get-monthly-income-expense", () => ({
  getMonthlyIncomeExpense: vi.fn(),
}));

vi.mock("../../src/lib/finance/get-recurring-transactions", () => ({
  getRecurringTransactions: vi.fn(),
}));

import { getLiquiditySummary } from "../../src/lib/finance/get-liquidity-summary";
import { getMonthlyIncomeExpense } from "../../src/lib/finance/get-monthly-income-expense";
import { getRecurringTransactions } from "../../src/lib/finance/get-recurring-transactions";
import { getFinancialHealth } from "../../src/lib/intelligence/get-financial-health";

describe("getFinancialHealth", () => {
  it("combines historical, liquidity, and recurring data per currency", async () => {
    vi.mocked(getLiquiditySummary).mockResolvedValue([
      {
        currency: "BDT",
        totalAssets: 100000,
        immediateLiquid: 60000,
        nearLiquid: 10000,
        receivables: 5000,
        longTerm: 25000,
        totalLiquidAndReceivable: 75000,
      },
    ]);

    vi.mocked(getMonthlyIncomeExpense).mockResolvedValue([
      {
        month: "2026-07",
        income: 50000,
        expenses: 30000,
        net: 20000,
      },
      {
        month: "2026-08",
        income: 60000,
        expenses: 40000,
        net: 20000,
      },
    ]);

    vi.mocked(getRecurringTransactions).mockResolvedValue([
      {
        id: "expense-1",
        name: "Rent",
        transactionType: "expense",
        amount: 10000,
        currency: "BDT",
        frequency: "monthly",
        nextRunDate: "2026-10-01",
      },
      {
        id: "expense-2",
        name: "Insurance",
        transactionType: "expense",
        amount: 12000,
        currency: "BDT",
        frequency: "yearly",
        nextRunDate: "2027-01-01",
      },
      {
        id: "transfer-1",
        name: "Savings Transfer",
        transactionType: "transfer",
        amount: 5000,
        currency: "BDT",
        frequency: "monthly",
        nextRunDate: "2026-10-01",
      },
    ]);

    const result = await getFinancialHealth();

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("BDT");

    expect(
      result[0].metrics.averageMonthlyIncome,
    ).toBe(55000);

    expect(
      result[0].metrics.averageMonthlyExpenses,
    ).toBe(35000);

    expect(
      result[0].metrics.averageMonthlySurplus,
    ).toBe(20000);

    expect(
      result[0].metrics.liquidCoverageMonths,
    ).toBeCloseTo(60000 / 35000, 4);

    expect(
      result[0].metrics.recurringExpenseBurden,
    ).toBeCloseTo(
      (11000 / 55000) * 100,
      4,
    );
  });

  it("keeps currencies separate", async () => {
    vi.mocked(getLiquiditySummary).mockResolvedValue([
      {
        currency: "BDT",
        totalAssets: 100000,
        immediateLiquid: 50000,
        nearLiquid: 0,
        receivables: 0,
        longTerm: 50000,
        totalLiquidAndReceivable: 50000,
      },
      {
        currency: "USD",
        totalAssets: 2000,
        immediateLiquid: 1000,
        nearLiquid: 0,
        receivables: 0,
        longTerm: 1000,
        totalLiquidAndReceivable: 1000,
      },
    ]);

    vi.mocked(getMonthlyIncomeExpense).mockImplementation(
      async (currency) => {
        if (currency === "USD") {
          return [
            {
              month: "2026-08",
              income: 1000,
              expenses: 400,
              net: 600,
            },
          ];
        }

        return [
          {
            month: "2026-08",
            income: 50000,
            expenses: 30000,
            net: 20000,
          },
        ];
      },
    );

    vi.mocked(getRecurringTransactions).mockResolvedValue([
      {
        id: "bdt-expense",
        name: "BDT Expense",
        transactionType: "expense",
        amount: 10000,
        currency: "BDT",
        frequency: "monthly",
        nextRunDate: "2026-10-01",
      },
      {
        id: "usd-expense",
        name: "USD Expense",
        transactionType: "expense",
        amount: 120,
        currency: "USD",
        frequency: "monthly",
        nextRunDate: "2026-10-01",
      },
    ]);

    const result = await getFinancialHealth();

    expect(result).toHaveLength(2);

    const bdt = result.find(
      (item) => item.currency === "BDT",
    );
    const usd = result.find(
      (item) => item.currency === "USD",
    );

    expect(bdt?.metrics.averageMonthlyIncome).toBe(50000);
    expect(bdt?.metrics.averageMonthlyExpenses).toBe(30000);
    expect(bdt?.metrics.recurringExpenseBurden).toBeCloseTo(
      20,
      4,
    );

    expect(usd?.metrics.averageMonthlyIncome).toBe(1000);
    expect(usd?.metrics.averageMonthlyExpenses).toBe(400);
    expect(usd?.metrics.recurringExpenseBurden).toBeCloseTo(
      12,
      4,
    );
  });
});

