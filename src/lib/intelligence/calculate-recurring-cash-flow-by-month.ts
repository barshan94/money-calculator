export type RecurringCashFlowByMonthInput = {
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
};

export type MonthlyRecurringCashFlow = {
  monthIndex: number;
  monthlyIncome: number;
  monthlyExpenses: number;
};

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function daysInMonth(
  year: number,
  month: number,
): number {
  return new Date(year, month + 1, 0).getDate();
}

function addFrequency(
  date: Date,
  frequency: RecurringCashFlowByMonthInput["frequency"],
): Date {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  const originalDay = date.getDate();

  if (frequency === "monthly") {
    const targetYear =
      date.getFullYear() +
      Math.floor((date.getMonth() + 1) / 12);

    const targetMonth =
      (date.getMonth() + 1) % 12;

    const lastDay = daysInMonth(
      targetYear,
      targetMonth,
    );

    return new Date(
      targetYear,
      targetMonth,
      Math.min(originalDay, lastDay),
    );
  }

  const targetYear = date.getFullYear() + 1;
  const lastDay = daysInMonth(
    targetYear,
    date.getMonth(),
  );

  return new Date(
    targetYear,
    date.getMonth(),
    Math.min(originalDay, lastDay),
  );
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

export function calculateRecurringCashFlowByMonth(
  transactions: RecurringCashFlowByMonthInput[],
  startDate: string,
  months: number,
): MonthlyRecurringCashFlow[] {
  if (!Number.isInteger(months) || months <= 0) {
    return [];
  }

  const forecastStart = parseDate(startDate);

  if (!forecastStart) {
    return [];
  }

  const results = Array.from(
    { length: months },
    (_, index) => ({
      monthIndex: index + 1,
      monthlyIncome: 0,
      monthlyExpenses: 0,
    }),
  );

  const forecastMonthKeys = results.map(
    (_, index) => {
      const month = new Date(forecastStart);
      month.setDate(1);
      month.setMonth(
        month.getMonth() + index,
      );
      return monthKey(month);
    },
  );

  for (const transaction of transactions) {
    if (
      !Number.isFinite(transaction.amount) ||
      transaction.amount < 0 ||
      transaction.transactionType === "transfer"
    ) {
      continue;
    }

    const nextRun = parseDate(
      transaction.nextRunDate,
    );

    if (!nextRun) {
      continue;
    }

    let occurrence = nextRun;

    while (occurrence < forecastStart) {
      occurrence = addFrequency(
        occurrence,
        transaction.frequency,
      );
    }

    for (
      let index = 0;
      index < months;
      index += 1
    ) {
      const forecastMonth =
        forecastMonthKeys[index];

      while (
        monthKey(occurrence) === forecastMonth
      ) {
        if (transaction.transactionType === "income") {
          results[index].monthlyIncome +=
            transaction.amount;
        }

        if (
          transaction.transactionType === "expense"
        ) {
          results[index].monthlyExpenses +=
            transaction.amount;
        }

        occurrence = addFrequency(
          occurrence,
          transaction.frequency,
        );
      }

      if (
        occurrence <
        new Date(
          `${forecastMonth}-01T00:00:00`,
        )
      ) {
        continue;
      }
    }
  }

  return results;
}
