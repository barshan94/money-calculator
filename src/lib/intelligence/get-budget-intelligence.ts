import {
  getBudgetProgress,
  type BudgetProgress,
} from "@/lib/finance/get-budget-progress";
import {
  calculateBudgetIntelligence,
  type BudgetIntelligence,
} from "./calculate-budget-intelligence";

export type BudgetIntelligenceItem =
  BudgetProgress & {
    intelligence: BudgetIntelligence;
  };

export async function getBudgetIntelligence(
  asOfDate?: string,
): Promise<BudgetIntelligenceItem[]> {
  const budgets = await getBudgetProgress();

  const activeBudgets = budgets.filter(
    (budget) =>
      budget.isActive &&
      budget.endDate !== null,
  );

  const results: BudgetIntelligenceItem[] = [];

  for (const budget of activeBudgets) {
    const intelligence =
      calculateBudgetIntelligence({
        amount: budget.amount,
        spent: budget.spent,
        startDate: budget.startDate,
        endDate: budget.endDate!,
        asOfDate,
      });

    if (!intelligence) {
      continue;
    }

    results.push({
      ...budget,
      intelligence,
    });
  }

  return results;
}
