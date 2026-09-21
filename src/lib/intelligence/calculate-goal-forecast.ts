export type GoalForecastInput = {
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  asOfDate?: string;
};

export type GoalForecast = {
  progressPercent: number;
  remainingAmount: number;
  daysRemaining: number;
  monthsRemaining: number;
  requiredMonthlyContribution: number | null;
  requiredDailyContribution: number | null;
  isCompleted: boolean;
  isPastDue: boolean;
};

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

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

function differenceInCalendarMonths(
  start: Date,
  end: Date,
): number {
  return (
    (end.getFullYear() - start.getFullYear()) *
      12 +
    (end.getMonth() - start.getMonth())
  );
}

export function calculateGoalForecast(
  input: GoalForecastInput,
): GoalForecast | null {
  if (
    !Number.isFinite(input.targetAmount) ||
    input.targetAmount <= 0 ||
    !Number.isFinite(input.currentAmount) ||
    input.currentAmount < 0 ||
    !input.targetDate
  ) {
    return null;
  }

  const targetDate = parseDate(
    input.targetDate,
  );

  const asOfDate = parseDate(
    input.asOfDate ??
      new Date()
        .toISOString()
        .slice(0, 10),
  );

  if (!targetDate || !asOfDate) {
    return null;
  }

  const cappedCurrentAmount = Math.min(
    input.currentAmount,
    input.targetAmount,
  );

  const progressPercent =
    (cappedCurrentAmount /
      input.targetAmount) *
    100;

  const remainingAmount =
    Math.max(
      input.targetAmount -
        cappedCurrentAmount,
      0,
    );

  const isCompleted =
    remainingAmount === 0;

  const daysUntilTarget = differenceInDays(
    asOfDate,
    targetDate,
  );

  const isPastDue =
    daysUntilTarget < 0 &&
    !isCompleted;

  if (isCompleted) {
    return {
      progressPercent: 100,
      remainingAmount: 0,
      daysRemaining: Math.max(
        daysUntilTarget,
        0,
      ),
      monthsRemaining: Math.max(
        differenceInCalendarMonths(
          asOfDate,
          targetDate,
        ),
        0,
      ),
      requiredMonthlyContribution: 0,
      requiredDailyContribution: 0,
      isCompleted: true,
      isPastDue: false,
    };
  }

  if (daysUntilTarget <= 0) {
    return {
      progressPercent,
      remainingAmount,
      daysRemaining: 0,
      monthsRemaining: 0,
      requiredMonthlyContribution: null,
      requiredDailyContribution: null,
      isCompleted: false,
      isPastDue,
    };
  }

  const monthsRemaining =
    Math.max(
      differenceInCalendarMonths(
        asOfDate,
        targetDate,
      ),
      1,
    );

  return {
    progressPercent,
    remainingAmount,
    daysRemaining: daysUntilTarget,
    monthsRemaining,
    requiredMonthlyContribution:
      remainingAmount / monthsRemaining,
    requiredDailyContribution:
      remainingAmount / daysUntilTarget,
    isCompleted: false,
    isPastDue: false,
  };
}
