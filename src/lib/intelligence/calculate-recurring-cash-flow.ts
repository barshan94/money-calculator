export type RecurringCashFlowInput = {
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
};

export type RecurringCashFlowTotals = {
  monthlyIncome: number;
  monthlyExpenses: number;
};

function normalizeToMonthly(
  amount: number,
  frequency: RecurringCashFlowInput["frequency"],
): number {
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  switch (frequency) {
    case "daily":
      return (amount * 365) / 12;

    case "weekly":
      return (amount * 52) / 12;

    case "monthly":
      return amount;

    case "yearly":
      return amount / 12;

    default:
      return 0;
  }
}

export function calculateRecurringCashFlow(
  transactions: RecurringCashFlowInput[],
): RecurringCashFlowTotals {
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const transaction of transactions) {
    const monthlyAmount = normalizeToMonthly(
      transaction.amount,
      transaction.frequency,
    );

    if (transaction.transactionType === "income") {
      monthlyIncome += monthlyAmount;
    }

    if (transaction.transactionType === "expense") {
      monthlyExpenses += monthlyAmount;
    }
  }

  return {
    monthlyIncome,
    monthlyExpenses,
  };
}
