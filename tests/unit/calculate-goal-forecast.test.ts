import { describe, expect, it } from "vitest";
import { calculateGoalForecast } from "@/lib/intelligence/calculate-goal-forecast";

describe("calculateGoalForecast", () => {
  it("calculates progress and required pace", () => {
    const result = calculateGoalForecast({
      targetAmount: 12000,
      currentAmount: 3000,
      targetDate: "2027-01-01",
      asOfDate: "2026-07-01",
    });

    expect(result.progressPercent).toBe(25);
    expect(result.remainingAmount).toBe(9000);
    expect(result.monthsRemaining).toBe(6);
    expect(result.requiredMonthlyContribution).toBe(1500);
    expect(result.requiredDailyContribution).toBe(
      9000 / 184,
    );
    expect(result.isCompleted).toBe(false);
    expect(result.isPastDue).toBe(false);
  });

  it("recognizes a completed goal", () => {
    const result = calculateGoalForecast({
      targetAmount: 10000,
      currentAmount: 10000,
      targetDate: "2027-01-01",
      asOfDate: "2026-07-01",
    });

    expect(result.progressPercent).toBe(100);
    expect(result.remainingAmount).toBe(0);
    expect(result.requiredMonthlyContribution).toBe(0);
    expect(result.requiredDailyContribution).toBe(0);
    expect(result.isCompleted).toBe(true);
    expect(result.isPastDue).toBe(false);
  });

  it("recognizes a past-due goal", () => {
    const result = calculateGoalForecast({
      targetAmount: 10000,
      currentAmount: 4000,
      targetDate: "2026-06-01",
      asOfDate: "2026-07-01",
    });

    expect(result.remainingAmount).toBe(6000);
    expect(result.monthsRemaining).toBe(0);
    expect(result.requiredMonthlyContribution).toBeNull();
    expect(result.requiredDailyContribution).toBeNull();
    expect(result.isCompleted).toBe(false);
    expect(result.isPastDue).toBe(true);
  });

  it("handles an invalid configuration", () => {
    const result = calculateGoalForecast({
      targetAmount: 0,
      currentAmount: 100,
      targetDate: "2027-01-01",
      asOfDate: "2026-07-01",
    });

    expect(result).toBeNull();
  });

  it("clamps progress to the target", () => {
    const result = calculateGoalForecast({
      targetAmount: 10000,
      currentAmount: 12000,
      targetDate: "2027-01-01",
      asOfDate: "2026-07-01",
    });

    expect(result?.progressPercent).toBe(100);
    expect(result?.remainingAmount).toBe(0);
    expect(result?.isCompleted).toBe(true);
  });

  it("handles a same-day target", () => {
    const result = calculateGoalForecast({
      targetAmount: 10000,
      currentAmount: 4000,
      targetDate: "2026-07-01",
      asOfDate: "2026-07-01",
    });

    expect(result?.monthsRemaining).toBe(0);
    expect(result?.requiredMonthlyContribution).toBeNull();
    expect(result?.requiredDailyContribution).toBeNull();
    expect(result?.isPastDue).toBe(false);
  });
});
