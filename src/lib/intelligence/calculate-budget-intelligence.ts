export type BudgetIntelligenceInput = {
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  asOfDate?: string;
};

export type BudgetIntelligenceStatus =
  | "on_track"
  | "at_risk"
  | "projected_over_budget";

export type BudgetIntelligence = {
  elapsedDays: number;
  remainingDays: number;
  currentDailySpending: number;
  projectedSpending: number;
  projectedDifference: number;
  status: BudgetIntelligenceStatus;
};

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const AT_RISK_THRESHOLD = 0.1;

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function differenceInDays(
  start: Date,
  end: Date,
): number {
  return Math.floor(
    (end.getTime() - start.getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

export function calculateBudgetIntelligence(
  input: BudgetIntelligenceInput,
): BudgetIntelligence | null {
  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    !Number.isFinite(input.spent) ||
    input.spent < 0 ||
    !input.startDate ||
    !input.endDate
  ) {
    return null;
  }

  const startDate = parseDate(
    input.startDate,
  );

  const endDate = parseDate(
    input.endDate,
  );

  const asOfDate = parseDate(
    input.asOfDate ??
      new Date()
        .toISOString()
        .slice(0, 10),
  );

  if (
    !startDate ||
    !endDate ||
    !asOfDate ||
    endDate < startDate
  ) {
    return null;
  }

  const totalDays = differenceInDays(
    startDate,
    endDate,
  );

  if (totalDays <= 0) {
    return null;
  }

  const elapsedDays = Math.min(
    Math.max(
      differenceInDays(
        startDate,
        asOfDate,
      ),
      0,
    ),
    totalDays,
  );

  const remainingDays = Math.max(
    totalDays - elapsedDays,
    0,
  );

  const currentDailySpending =
    elapsedDays > 0
      ? input.spent / elapsedDays
      : 0;

  const projectedSpending =
    elapsedDays >= totalDays
      ? input.spent
      : currentDailySpending * totalDays;

  const projectedDifference =
    projectedSpending - input.amount;

  const threshold =
    input.amount * AT_RISK_THRESHOLD;

  let status: BudgetIntelligenceStatus;

  if (projectedDifference <= 0) {
    status = "on_track";
  } else if (
    projectedDifference <= threshold
  ) {
    status = "at_risk";
  } else {
    status = "projected_over_budget";
  }

  return {
    elapsedDays,
    remainingDays,
    currentDailySpending,
    projectedSpending,
    projectedDifference,
    status,
  };
}
