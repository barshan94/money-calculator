import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccountBalances: vi.fn(),
  getMonthlyIncomeExpense: vi.fn(),
}));

vi.mock(
  "../../src/lib/finance/get-account-balances",
  () => ({
    getAccountBalances: mocks.getAccountBalances,
  }),
);

vi.mock(
  "../../src/lib/finance/get-monthly-income-expense",
  () => ({
    getMonthlyIncomeExpense:
      mocks.getMonthlyIncomeExpense,
  }),
);

import {
  getIncomeExpenseTrends,
} from "../../src/lib/intelligence/get-income-expense-trends";

describe("getIncomeExpenseTrends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds trends for currencies discovered from accounts", async () => {
    mocks.getAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "Bank BDT",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
      {
        id: "account-usd",
        name: "Bank USD",
        account_type: "asset",
        currency: "USD",
        debitTotal: 100,
        creditTotal: 0,
        balance: 100,
        is_archived: false,
      },
    ]);

    mocks.getMonthlyIncomeExpense.mockImplementation(
      async (currency: string) => {
        if (currency === "BDT") {
          return [
            {
              month: "2026-08",
              income: 10000,
              expenses: 4000,
              net: 6000,
            },
            {
              month: "2026-09",
              income: 12000,
              expenses: 5000,
              net: 7000,
            },
          ];
        }

        return [
          {
            month: "2026-08",
            income: 100,
            expenses: 40,
            net: 60,
          },
          {
            month: "2026-09",
            income: 120,
            expenses: 50,
            net: 70,
          },
        ];
      },
    );

    const result = await getIncomeExpenseTrends();

    expect(result).toHaveLength(2);

    expect(result.map((item) => item.currency)).toEqual([
      "BDT",
      "USD",
    ]);

    expect(result[0].trends.latestIncome).toBe(12000);
    expect(result[0].trends.incomeChange).toBe(20);

    expect(result[1].trends.latestIncome).toBe(120);
    expect(result[1].trends.incomeChange).toBe(20);

    expect(
      mocks.getMonthlyIncomeExpense,
    ).toHaveBeenCalledWith("BDT");

    expect(
      mocks.getMonthlyIncomeExpense,
    ).toHaveBeenCalledWith("USD");
  });

  it("keeps currencies isolated", async () => {
    mocks.getAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "Bank BDT",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
      {
        id: "account-usd",
        name: "Bank USD",
        account_type: "asset",
        currency: "USD",
        debitTotal: 100,
        creditTotal: 0,
        balance: 100,
        is_archived: false,
      },
    ]);

    mocks.getMonthlyIncomeExpense.mockImplementation(
      async (currency: string) => {
        if (currency === "BDT") {
          return [
            {
              month: "2026-09",
              income: 10000,
              expenses: 2000,
              net: 8000,
            },
          ];
        }

        return [
          {
            month: "2026-09",
            income: 500,
            expenses: 100,
            net: 400,
          },
        ];
      },
    );

    const result = await getIncomeExpenseTrends();

    const bdt = result.find(
      (item) => item.currency === "BDT",
    );

    const usd = result.find(
      (item) => item.currency === "USD",
    );

    expect(bdt?.trends.latestIncome).toBe(10000);
    expect(usd?.trends.latestIncome).toBe(500);
  });

  it("skips currencies without historical data", async () => {
    mocks.getAccountBalances.mockResolvedValue([
      {
        id: "account-bdt",
        name: "Bank BDT",
        account_type: "asset",
        currency: "BDT",
        debitTotal: 10000,
        creditTotal: 0,
        balance: 10000,
        is_archived: false,
      },
      {
        id: "account-usd",
        name: "Bank USD",
        account_type: "asset",
        currency: "USD",
        debitTotal: 100,
        creditTotal: 0,
        balance: 100,
        is_archived: false,
      },
    ]);

    mocks.getMonthlyIncomeExpense.mockImplementation(
      async (currency: string) => {
        if (currency === "BDT") {
          return [
            {
              month: "2026-09",
              income: 10000,
              expenses: 2000,
              net: 8000,
            },
          ];
        }

        return [];
      },
    );

    const result = await getIncomeExpenseTrends();

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("BDT");
  });
});

