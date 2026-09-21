export type NetWorthForecastHistory = {
  month: string;
  netWorth: number;
};

export type NetWorthForecastInput = {
  history: NetWorthForecastHistory[];
  lookbackMonths: number;
  months: number;
};

export type NetWorthForecastMonth = {
  monthIndex: number;
  projectedNetWorth: number;
  projectedChange: number;
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0,
    ) / values.length
  );
}

export function calculateNetWorthForecast(
  input: NetWorthForecastInput,
): NetWorthForecastMonth[] {
  if (
    !Number.isInteger(input.lookbackMonths) ||
    input.lookbackMonths <= 0 ||
    !Number.isInteger(input.months) ||
    input.months <= 0
  ) {
    return [];
  }

  const validHistory = input.history.filter(
    (month) =>
      Number.isFinite(month.netWorth),
  );

  if (validHistory.length === 0) {
    return [];
  }

  const recentHistory = validHistory.slice(
    -input.lookbackMonths,
  );

  const changes: number[] = [];

  for (let index = 1; index < recentHistory.length; index += 1) {
    changes.push(
      recentHistory[index].netWorth -
        recentHistory[index - 1].netWorth,
    );
  }

  const averageMonthlyChange =
    average(changes);

  if (averageMonthlyChange === null) {
    return [];
  }

  let projectedNetWorth =
    recentHistory[recentHistory.length - 1]
      .netWorth;

  return Array.from(
    { length: input.months },
    (_, index) => {
      projectedNetWorth += averageMonthlyChange;

      return {
        monthIndex: index + 1,
        projectedNetWorth,
        projectedChange: averageMonthlyChange,
      };
    },
  );
}

