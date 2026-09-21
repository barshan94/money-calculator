export type WhatIfScenarioInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  incomeChange: number;
  expenseChange: number;
  months: number;
};

export type WhatIfScenarioMonth = {
  monthIndex: number;
  scenarioIncome: number;
  scenarioExpenses: number;
  scenarioNet: number;
  cumulativeNet: number;
};

export type WhatIfScenarioResult = {
  baselineIncome: number;
  baselineExpenses: number;
  baselineNet: number;
  scenarioIncome: number;
  scenarioExpenses: number;
  scenarioNet: number;
  monthlyNetDifference: number;
  cumulativeNetDifference: number;
  months: WhatIfScenarioMonth[];
};

export function calculateWhatIfScenario(
  input: WhatIfScenarioInput,
): WhatIfScenarioResult | null {
  if (
    !Number.isFinite(input.monthlyIncome) ||
    input.monthlyIncome < 0 ||
    !Number.isFinite(input.monthlyExpenses) ||
    input.monthlyExpenses < 0 ||
    !Number.isFinite(input.incomeChange) ||
    !Number.isFinite(input.expenseChange) ||
    !Number.isInteger(input.months) ||
    input.months <= 0
  ) {
    return null;
  }

  const baselineNet =
    input.monthlyIncome -
    input.monthlyExpenses;

  const scenarioIncome =
    input.monthlyIncome +
    input.incomeChange;

  const scenarioExpenses =
    input.monthlyExpenses +
    input.expenseChange;

  if (
    scenarioIncome < 0 ||
    scenarioExpenses < 0
  ) {
    return null;
  }

  const scenarioNet =
    scenarioIncome -
    scenarioExpenses;

  const monthlyNetDifference =
    scenarioNet - baselineNet;

  const months = Array.from(
    { length: input.months },
    (_, index) => ({
      monthIndex: index + 1,
      scenarioIncome,
      scenarioExpenses,
      scenarioNet,
      cumulativeNet:
        scenarioNet * (index + 1),
    }),
  );

  return {
    baselineIncome: input.monthlyIncome,
    baselineExpenses: input.monthlyExpenses,
    baselineNet,
    scenarioIncome,
    scenarioExpenses,
    scenarioNet,
    monthlyNetDifference,
    cumulativeNetDifference:
      monthlyNetDifference * input.months,
    months,
  };
}
