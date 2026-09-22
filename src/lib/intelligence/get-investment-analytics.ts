import { createClient } from "@/lib/supabase/server";
import {
  calculateInvestmentAnalytics,
  type InvestmentAnalytics,
  type InvestmentAnalyticsInput,
} from "@/lib/intelligence/calculate-investment-analytics";

export async function getInvestmentAnalytics(): Promise<
  Record<string, InvestmentAnalytics>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase
    .from("investment_performance")
    .select(
      `
        id,
        name,
        investment_type,
        currency,
        invested_amount,
        current_value,
        realized_profit_loss,
        unrealized_profit_loss,
        total_profit_loss,
        status,
        archived_at
      `,
    )
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const investmentsByCurrency =
    new Map<
      string,
      InvestmentAnalyticsInput[]
    >();

  for (const investment of data ?? []) {
    const currency = investment.currency;

    const parsedInvestment: InvestmentAnalyticsInput =
      {
        id: investment.id,
        name: investment.name,
        investmentType:
          investment.investment_type,
        investedAmount: Number(
          investment.invested_amount ?? 0,
        ),
        currentValue: Number(
          investment.current_value ?? 0,
        ),
        realizedProfitLoss: Number(
          investment.realized_profit_loss ?? 0,
        ),
        unrealizedProfitLoss: Number(
          investment.unrealized_profit_loss ?? 0,
        ),
        totalProfitLoss: Number(
          investment.total_profit_loss ?? 0,
        ),
        status: investment.status,
        archivedAt: investment.archived_at,
      };

    const currencyInvestments =
      investmentsByCurrency.get(currency) ?? [];

    currencyInvestments.push(parsedInvestment);

    investmentsByCurrency.set(
      currency,
      currencyInvestments,
    );
  }

  const analytics: Record<
    string,
    InvestmentAnalytics
  > = {};

  for (const [
    currency,
    investments,
  ] of investmentsByCurrency.entries()) {
    analytics[currency] =
      calculateInvestmentAnalytics(
        investments,
      );
  }

  return analytics;
}

