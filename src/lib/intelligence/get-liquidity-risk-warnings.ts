import { getFinancialHealth } from "./get-financial-health";
import {
  calculateLiquidityRiskWarnings,
  type LiquidityRiskWarning,
} from "./calculate-liquidity-risk-warnings";

export type LiquidityRiskWarnings = {
  currency: string;
  warnings: LiquidityRiskWarning[];
};

export async function getLiquidityRiskWarnings(): Promise<
  LiquidityRiskWarnings[]
> {
  const financialHealth =
    await getFinancialHealth();

  return financialHealth.map((item) => ({
    currency: item.currency,
    warnings:
      calculateLiquidityRiskWarnings({
        liquidCoverageMonths:
          item.metrics.liquidCoverageMonths,
        receivableDependency:
          item.metrics.receivableDependency,
        recurringExpenseBurden:
          item.metrics.recurringExpenseBurden,
      }),
  }));
}
