import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAccountBalances,
  mockGetMonthlyNetWorth,
} = vi.hoisted(() => ({
  mockGetAccountBalances: vi.fn(),
  mockGetMonthlyNetWorth: vi.fn(),
}));

vi.mock("../../src/lib/finance/get-account-balances", () => ({
  getAccountBalances: mockGetAccountBalances,
}));

vi.mock("../../src/lib/finance/get-monthly-net-worth", () => ({
  getMonthlyNetWorth: mockGetMonthlyNetWorth,
}));

import { getNetWorthForecast } from "../../src/lib/intelligence/get-net-worth-forecast";

describe("getNetWorthForecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("discovers currencies from account balances and forecasts each currency", async () => {
    mockGetAccountBalances.mockResolvedValue([
      {
        currency: "BDT",
      },
      {
        currency: "USD",
      },
    ]);

    mockGetMonthlyNetWorth
      .mockResolvedValueOnce([
        {
          month: "2026-01",
          assets: 100000,
          liabilities: 20000,
          net_worth: 80000,
        },
        {
          month: "2026-02",
          assets: 120000,
          liabilities: 20000,
          net_worth: 100000,
        },
      ])
      .mockResolvedValueOnce([
        {
          month: "2026-01",
          assets: 1000,
          liabilities: 200,
          net_worth: 800,
        },
        {
          month: "2026-02",
          assets: 1200,
          liabilities: 200,
          net_worth: 1000,
        },
      ]);

    const result = await getNetWorthForecast({
      lookbackMonths: 2,
      months: 2,
    });

    expect(result).toEqual([
      {
        currency: "BDT",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 120000,
            projectedChange: 20000,
          },
          {
            monthIndex: 2,
            projectedNetWorth: 140000,
            projectedChange: 20000,
          },
        ],
      },
      {
        currency: "USD",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 1200,
            projectedChange: 200,
          },
          {
            monthIndex: 2,
            projectedNetWorth: 1400,
            projectedChange: 200,
          },
        ],
      },
    ]);

    expect(mockGetMonthlyNetWorth).toHaveBeenCalledTimes(2);

    expect(
      mockGetMonthlyNetWorth,
    ).toHaveBeenNthCalledWith(1, "BDT");

    expect(
      mockGetMonthlyNetWorth,
    ).toHaveBeenNthCalledWith(2, "USD");
  });

  it("keeps currencies isolated", async () => {
    mockGetAccountBalances.mockResolvedValue([
      {
        currency: "BDT",
      },
      {
        currency: "USD",
      },
    ]);

    mockGetMonthlyNetWorth
      .mockResolvedValueOnce([
        {
          month: "2026-01",
          assets: 100000,
          liabilities: 0,
          net_worth: 100000,
        },
        {
          month: "2026-02",
          assets: 110000,
          liabilities: 0,
          net_worth: 110000,
        },
      ])
      .mockResolvedValueOnce([
        {
          month: "2026-01",
          assets: 500,
          liabilities: 0,
          net_worth: 500,
        },
        {
          month: "2026-02",
          assets: 450,
          liabilities: 0,
          net_worth: 450,
        },
      ]);

    const result = await getNetWorthForecast({
      lookbackMonths: 2,
      months: 1,
    });

    expect(result).toEqual([
      {
        currency: "BDT",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 120000,
            projectedChange: 10000,
          },
        ],
      },
      {
        currency: "USD",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 400,
            projectedChange: -50,
          },
        ],
      },
    ]);
  });

  it("skips currencies without sufficient net-worth history", async () => {
    mockGetAccountBalances.mockResolvedValue([
      {
        currency: "BDT",
      },
      {
        currency: "USD",
      },
    ]);

    mockGetMonthlyNetWorth
      .mockResolvedValueOnce([
        {
          month: "2026-01",
          assets: 100000,
          liabilities: 0,
          net_worth: 100000,
        },
        {
          month: "2026-02",
          assets: 110000,
          liabilities: 0,
          net_worth: 110000,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getNetWorthForecast({
      lookbackMonths: 2,
      months: 2,
    });

    expect(result).toEqual([
      {
        currency: "BDT",
        months: [
          {
            monthIndex: 1,
            projectedNetWorth: 120000,
            projectedChange: 10000,
          },
          {
            monthIndex: 2,
            projectedNetWorth: 130000,
            projectedChange: 10000,
          },
        ],
      },
    ]);
  });
});

