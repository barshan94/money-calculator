export type InvestmentAnalyticsInput = {
  id: string;
  name: string;
  investmentType: string;
  investedAmount: number;
  currentValue: number;
  realizedProfitLoss: number;
  unrealizedProfitLoss: number;
  totalProfitLoss: number;
  status: string;
  archivedAt: string | null;
};

export type InvestmentTypeAllocation = {
  investmentType: string;
  currentValue: number;
  percentage: number;
};

export type InvestmentAnalytics = {
  totalInvested: number;
  currentPortfolioValue: number;
  totalProfitLoss: number;
  overallReturnPercentage: number;
  realizedProfitLoss: number;
  unrealizedProfitLoss: number;

  activeInvestmentCount: number;

  allocationByType: InvestmentTypeAllocation[];

  largestInvestment: {
    id: string;
    name: string;
    investmentType: string;
    currentValue: number;
  } | null;

  largestInvestmentConcentrationPercentage: number;
};

function isValidInvestment(
  investment: InvestmentAnalyticsInput,
): boolean {
  return (
    Number.isFinite(investment.investedAmount) &&
    Number.isFinite(investment.currentValue) &&
    Number.isFinite(investment.realizedProfitLoss) &&
    Number.isFinite(investment.unrealizedProfitLoss) &&
    Number.isFinite(investment.totalProfitLoss)
  );
}

function isActiveInvestment(
  investment: InvestmentAnalyticsInput,
): boolean {
  return (
    investment.status === "active" &&
    investment.archivedAt === null
  );
}

export function calculateInvestmentAnalytics(
  investments: InvestmentAnalyticsInput[],
): InvestmentAnalytics {
  const validInvestments = investments.filter(
    isValidInvestment,
  );

  let totalInvested = 0;
  let totalProfitLoss = 0;
  let realizedProfitLoss = 0;
  let unrealizedProfitLoss = 0;

  const activeInvestments = validInvestments.filter(
    isActiveInvestment,
  );

  let currentPortfolioValue = 0;

  for (const investment of validInvestments) {
    totalInvested += investment.investedAmount;
    totalProfitLoss += investment.totalProfitLoss;
    realizedProfitLoss += investment.realizedProfitLoss;
    unrealizedProfitLoss += investment.unrealizedProfitLoss;
  }

  for (const investment of activeInvestments) {
    currentPortfolioValue += investment.currentValue;
  }

  const overallReturnPercentage =
    totalInvested > 0
      ? (totalProfitLoss / totalInvested) * 100
      : 0;

  const allocationMap = new Map<string, number>();

  for (const investment of activeInvestments) {
    const currentValue = investment.currentValue;

    allocationMap.set(
      investment.investmentType,
      (allocationMap.get(
        investment.investmentType,
      ) ?? 0) + currentValue,
    );
  }

  const allocationByType: InvestmentTypeAllocation[] =
    Array.from(allocationMap.entries())
      .map(([investmentType, currentValue]) => ({
        investmentType,
        currentValue,
        percentage:
          currentPortfolioValue > 0
            ? (currentValue /
                currentPortfolioValue) *
              100
            : 0,
      }))
      .sort(
        (a, b) =>
          b.currentValue - a.currentValue,
      );

  let largestInvestment:
    InvestmentAnalytics["largestInvestment"] =
    null;

  for (const investment of activeInvestments) {
    if (
      largestInvestment === null ||
      investment.currentValue >
        largestInvestment.currentValue
    ) {
      largestInvestment = {
        id: investment.id,
        name: investment.name,
        investmentType:
          investment.investmentType,
        currentValue: investment.currentValue,
      };
    }
  }

  const largestInvestmentConcentrationPercentage =
    largestInvestment !== null &&
    currentPortfolioValue > 0
      ? (largestInvestment.currentValue /
          currentPortfolioValue) *
        100
      : 0;

  return {
    totalInvested,
    currentPortfolioValue,
    totalProfitLoss,
    overallReturnPercentage,
    realizedProfitLoss,
    unrealizedProfitLoss,
    activeInvestmentCount:
      activeInvestments.length,
    allocationByType,
    largestInvestment,
    largestInvestmentConcentrationPercentage,
  };
}

