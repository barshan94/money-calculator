export type LiquidityRiskInput = {
  liquidCoverageMonths: number | null;
  receivableDependency: number | null;
  recurringExpenseBurden: number | null;
};

export type LiquidityRiskSeverity =
  | "warning"
  | "critical";

export type LiquidityRiskWarningType =
  | "low_liquid_coverage"
  | "high_receivable_dependency"
  | "high_recurring_expense_burden";

export type LiquidityRiskWarning = {
  type: LiquidityRiskWarningType;
  severity: LiquidityRiskSeverity;
  title: string;
  message: string;
  value: number;
  threshold: number;
};

export function calculateLiquidityRiskWarnings(
  input: LiquidityRiskInput,
): LiquidityRiskWarning[] {
  const warnings: LiquidityRiskWarning[] = [];

  if (
    input.liquidCoverageMonths !== null &&
    Number.isFinite(input.liquidCoverageMonths) &&
    input.liquidCoverageMonths < 1
  ) {
    warnings.push({
      type: "low_liquid_coverage",
      severity: "critical",
      title: "Low liquidity coverage",
      message:
        "Immediate liquid funds cover less than one month of average expenses.",
      value: input.liquidCoverageMonths,
      threshold: 1,
    });
  }

  if (
    input.receivableDependency !== null &&
    Number.isFinite(input.receivableDependency) &&
    input.receivableDependency > 50
  ) {
    warnings.push({
      type: "high_receivable_dependency",
      severity: "warning",
      title: "High receivable dependency",
      message:
        "More than half of total assets are represented by receivables.",
      value: input.receivableDependency,
      threshold: 50,
    });
  }

  if (
    input.recurringExpenseBurden !== null &&
    Number.isFinite(input.recurringExpenseBurden) &&
    input.recurringExpenseBurden > 50
  ) {
    warnings.push({
      type: "high_recurring_expense_burden",
      severity: "warning",
      title: "High recurring expense burden",
      message:
        "Recurring monthly expenses consume more than half of average monthly income.",
      value: input.recurringExpenseBurden,
      threshold: 50,
    });
  }

  return warnings;
}
