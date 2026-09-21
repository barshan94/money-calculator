import { createClient } from "@/lib/supabase/server";
import {
  calculateGoalForecast,
  type GoalForecast,
} from "./calculate-goal-forecast";

export type GoalForecastItem = {
  id: string;
  name: string;
  goalType: string;
  currency: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  forecast: GoalForecast;
};

export async function getGoalForecasts(
  asOfDate?: string,
): Promise<GoalForecastItem[]> {
  const supabase = await createClient();

  const { data: goals, error } = await supabase
    .from("goals")
    .select(
      "id, name, goal_type, currency, target_amount, current_amount, target_date, status",
    )
    .eq("status", "active")
    .order("target_date", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const items: GoalForecastItem[] = [];

  for (const goal of goals ?? []) {
    if (!goal.target_date) {
      continue;
    }

    const targetAmount = Number(
      goal.target_amount,
    );

    const currentAmount = Number(
      goal.current_amount,
    );

    const forecast = calculateGoalForecast({
      targetAmount,
      currentAmount,
      targetDate: goal.target_date,
      asOfDate,
    });

    if (!forecast) {
      continue;
    }

    items.push({
      id: goal.id,
      name: goal.name,
      goalType: goal.goal_type,
      currency: goal.currency,
      targetAmount,
      currentAmount,
      targetDate: goal.target_date,
      forecast,
    });
  }

  return items;
}

