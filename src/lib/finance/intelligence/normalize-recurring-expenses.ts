export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export type RecurringExpenseInput = {
  amount: number;
  frequency: RecurringFrequency;
};

export function normalizeRecurringExpenseToMonthly(
  input: RecurringExpenseInput,
): number {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return 0;
  }

  switch (input.frequency) {
    case "daily":
      return (input.amount * 365) / 12;

    case "weekly":
      return (input.amount * 52) / 12;

    case "monthly":
      return input.amount;

    case "yearly":
      return input.amount / 12;

    default:
      return 0;
  }
}

export function calculateRecurringMonthlyExpenses(
  expenses: RecurringExpenseInput[],
): number {
  return expenses.reduce(
    (total, expense) =>
      total + normalizeRecurringExpenseToMonthly(expense),
    0,
  );
}

