import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/finance/get-account-balances", () => ({
  getAccountBalances: vi.fn(),
}));

vi.mock("../../src/lib/finance/get-monthly-income-expense", () => ({
  getMonthlyIncomeExpense: vi.fn(),
}));

vi.mock("../../src/lib/finance/get-recurring-transactions", () => ({
  getRecurringTransactions: vi.fn(),
}));

import { getAccountBalances } from "../../src/lib/finance/get-account-balances";
import { getMonthlyIncomeExpense } from "../../src/lib/finance/get-monthly-income-expense";
import { getRecurringTransactions } from "../../src/lib/finance/get-recurring-transactions";
import { getCashFlowForecast } from "../../src/lib/intelligence/get-cash-flow-forecast";

const mockedGetAccountBalances = vi.mocked(getAccountBalances);
const mockedGetMonthlyIncomeExpense = vi.mocked(
  getMonthlyIncomeExpense,
);
const mockedGetRecurringTransactions = vi.mocked(
  getRecurringTransactions,
);

describe("getCashFlowForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a forecast for currencies discovered from accounts", async () => {
    mockedGetAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "BDT Account",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
      {
        id: "account-usd",
        name: "USD Account",
        account_type: "asset",
        currency: "USD",
        debitTotal: 500,
        creditTotal: 0,
        balance: 500,
        is_archived: false,
      },
    ]);

    mockedGetRecurringTransactions.mockResolvedValue([]);

    mockedGetMonthlyIncomeExpense.mockImplementation(
      async (currency) => {
        if (currency === "BDT") {
          return [
            {
              month: "2026-07",
              income: 10000,
              expenses: 4000,
              net: 6000,
            },
          ];
        }

        return [
          {
            month: "2026-07",
            income: 500,
            expenses: 200,
            net: 300,
          },
        ];
      },
    );

    const result = await getCashFlowForecast({
      lookbackMonths: 1,
      months: 2,
      startDate: "2026-09-01",
    });

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.currency).sort()).toEqual([
      "BDT",
      "USD",
    ]);

    const bdt = result.find((item) => item.currency === "BDT");
    const usd = result.find((item) => item.currency === "USD");

    expect(bdt?.months[0].projectedIncome).toBe(10000);
    expect(bdt?.months[0].projectedExpenses).toBe(4000);
    expect(bdt?.months[0].projectedNet).toBe(6000);

    expect(usd?.months[0].projectedIncome).toBe(500);
    expect(usd?.months[0].projectedExpenses).toBe(200);
    expect(usd?.months[0].projectedNet).toBe(300);
  });

  it("includes recurring cash flow in the correct forecast months", async () => {
    mockedGetAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "BDT Account",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
    ]);

    mockedGetRecurringTransactions.mockResolvedValue([
      {
        id: "recurring-income",
        name: "Salary",
        transactionType: "income",
        amount: 20000,
        currency: "BDT",
        frequency: "monthly",
        nextRunDate: "2026-09-05",
      },
      {
        id: "recurring-expense",
        name: "Yearly Fee",
        transactionType: "expense",
        amount: 120000,
        currency: "BDT",
        frequency: "yearly",
        nextRunDate: "2026-10-15",
      },
    ]);

    mockedGetMonthlyIncomeExpense.mockResolvedValue([
      {
        month: "2026-08",
        income: 30000,
        expenses: 10000,
        net: 20000,
      },
    ]);

    const result = await getCashFlowForecast({
      lookbackMonths: 1,
      months: 3,
      startDate: "2026-09-01",
    });

    expect(result).toHaveLength(1);

    expect(result[0].months).toEqual([
      {
        monthIndex: 1,
        projectedIncome: 50000,
        projectedExpenses: 10000,
        projectedNet: 40000,
      },
      {
        monthIndex: 2,
        projectedIncome: 50000,
        projectedExpenses: 130000,
        projectedNet: -80000,
      },
      {
        monthIndex: 3,
        projectedIncome: 50000,
        projectedExpenses: 10000,
        projectedNet: 40000,
      },
    ]);
  });

  it("keeps recurring cash flow isolated by currency", async () => {
    mockedGetAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "BDT Account",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
    ]);

    mockedGetRecurringTransactions.mockResolvedValue([
      {
        id: "usd-expense",
        name: "USD Expense",
        transactionType: "expense",
        amount: 100,
        currency: "USD",
        frequency: "monthly",
        nextRunDate: "2026-09-10",
      },
    ]);

    mockedGetMonthlyIncomeExpense.mockImplementation(
      async (currency) => {
        if (currency === "BDT") {
          return [
            {
              month: "2026-08",
              income: 10000,
              expenses: 4000,
              net: 6000,
            },
          ];
        }

        return [
          {
            month: "2026-08",
            income: 500,
            expenses: 200,
            net: 300,
          },
        ];
      },
    );

    const result = await getCashFlowForecast({
      lookbackMonths: 1,
      months: 1,
      startDate: "2026-09-01",
    });

    const bdt = result.find((item) => item.currency === "BDT");
    const usd = result.find((item) => item.currency === "USD");

    expect(bdt).toBeDefined();
    expect(usd).toBeDefined();

    expect(bdt?.months[0].projectedIncome).toBe(10000);
    expect(bdt?.months[0].projectedExpenses).toBe(4000);
    expect(bdt?.months[0].projectedNet).toBe(6000);

    expect(usd?.months[0].projectedIncome).toBe(500);
    expect(usd?.months[0].projectedExpenses).toBe(300);
    expect(usd?.months[0].projectedNet).toBe(200);
  });

  it("skips a currency when there is no usable historical baseline", async () => {
    mockedGetAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "BDT Account",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
      {
        id: "account-usd",
        name: "USD Account",
        account_type: "asset",
        currency: "USD",
        debitTotal: 500,
        creditTotal: 0,
        balance: 500,
        is_archived: false,
      },
    ]);

    mockedGetRecurringTransactions.mockResolvedValue([]);

    mockedGetMonthlyIncomeExpense.mockImplementation(
      async (currency) => {
        if (currency === "BDT") {
          return [
            {
              month: "2026-08",
              income: 10000,
              expenses: 4000,
              net: 6000,
            },
          ];
        }

        return [];
      },
    );

    const result = await getCashFlowForecast({
      lookbackMonths: 1,
      months: 1,
      startDate: "2026-09-01",
    });

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("BDT");
  });
});

