import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  getAccountBalances: vi.fn(),
  getMonthlyIncomeExpense: vi.fn(),
  calculateWhatIfScenario: vi.fn(),
}));

vi.mock(
  "../../src/lib/finance/get-account-balances",
  () => ({
    getAccountBalances:
      mocks.getAccountBalances,
  }),
);

vi.mock(
  "../../src/lib/finance/get-monthly-income-expense",
  () => ({
    getMonthlyIncomeExpense:
      mocks.getMonthlyIncomeExpense,
  }),
);

vi.mock(
  "../../src/lib/intelligence/calculate-what-if-scenario",
  () => ({
    calculateWhatIfScenario:
      mocks.calculateWhatIfScenario,
  }),
);

import {
  getWhatIfScenario,
} from "../../src/lib/intelligence/get-what-if-scenario";

describe("getWhatIfScenario", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.calculateWhatIfScenario.mockImplementation(
      (input) => ({
        baselineIncome:
          input.monthlyIncome,
        baselineExpenses:
          input.monthlyExpenses,
        baselineNet:
          input.monthlyIncome -
          input.monthlyExpenses,
        scenarioIncome:
          input.monthlyIncome +
          input.incomeChange,
        scenarioExpenses:
          input.monthlyExpenses +
          input.expenseChange,
        scenarioNet:
          input.monthlyIncome +
          input.incomeChange -
          input.monthlyExpenses -
          input.expenseChange,
        monthlyNetDifference:
          input.incomeChange -
          input.expenseChange,
        cumulativeNetDifference:
          (input.incomeChange -
            input.expenseChange) *
          input.months,
        months: [],
      }),
    );
  });

  it("builds scenarios for each account currency", async () => {
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
              month: "2026-07",
              income: 10000,
              expenses: 4000,
              net: 6000,
            },
            {
              month: "2026-08",
              income: 12000,
              expenses: 5000,
              net: 7000,
            },
          ];
        }

        return [
          {
            month: "2026-07",
            income: 100,
            expenses: 40,
            net: 60,
          },
          {
            month: "2026-08",
            income: 120,
            expenses: 50,
            net: 70,
          },
        ];
      },
    );

    const result = await getWhatIfScenario({
      incomeChange: 5000,
      expenseChange: -1000,
      months: 6,
    });

    expect(result).toHaveLength(2);

    expect(result.map((item) => item.currency)).toEqual([
      "BDT",
      "USD",
    ]);

    expect(
      mocks.calculateWhatIfScenario,
    ).toHaveBeenCalledWith({
      monthlyIncome: 11000,
      monthlyExpenses: 4500,
      incomeChange: 5000,
      expenseChange: -1000,
      months: 6,
    });

    expect(
      mocks.calculateWhatIfScenario,
    ).toHaveBeenCalledWith({
      monthlyIncome: 110,
      monthlyExpenses: 45,
      incomeChange: 5000,
      expenseChange: -1000,
      months: 6,
    });
  });

  it("uses the configured lookback period", async () => {
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
    ]);

    mocks.getMonthlyIncomeExpense.mockResolvedValue([
      {
        month: "2026-01",
        income: 5000,
        expenses: 2000,
        net: 3000,
      },
      {
        month: "2026-02",
        income: 6000,
        expenses: 3000,
        net: 3000,
      },
      {
        month: "2026-03",
        income: 9000,
        expenses: 5000,
        net: 4000,
      },
    ]);

    await getWhatIfScenario({
      incomeChange: 1000,
      expenseChange: 500,
      months: 3,
      lookbackMonths: 2,
    });

    expect(
      mocks.calculateWhatIfScenario,
    ).toHaveBeenCalledWith({
      monthlyIncome: 7500,
      monthlyExpenses: 4000,
      incomeChange: 1000,
      expenseChange: 500,
      months: 3,
    });
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
      async (currency: string) =>
        currency === "BDT"
          ? [
              {
                month: "2026-09",
                income: 10000,
                expenses: 2000,
                net: 8000,
              },
            ]
          : [],
    );

    const result = await getWhatIfScenario({
      incomeChange: 1000,
      expenseChange: 500,
      months: 3,
    });

    expect(result).toHaveLength(1);
    expect(result[0].currency).toBe("BDT");
  });

  it("ignores invalid historical values", async () => {
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
    ]);

    mocks.getMonthlyIncomeExpense.mockResolvedValue([
      {
        month: "2026-07",
        income: Number.NaN,
        expenses: 4000,
        net: Number.NaN,
      },
      {
        month: "2026-08",
        income: 12000,
        expenses: 5000,
        net: 7000,
      },
    ]);

    await getWhatIfScenario({
      incomeChange: 2000,
      expenseChange: -500,
      months: 3,
    });

    expect(
      mocks.calculateWhatIfScenario,
    ).toHaveBeenCalledWith({
      monthlyIncome: 12000,
      monthlyExpenses: 5000,
      incomeChange: 2000,
      expenseChange: -500,
      months: 3,
    });
  });
});
