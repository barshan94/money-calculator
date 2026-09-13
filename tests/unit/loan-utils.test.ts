
import { describe, expect, it } from "vitest";

function repaymentPercent(
  repaid: number,
  principal: number,
) {
  if (principal <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (repaid / principal) * 100),
  );
}

function remainingAmount(
  principal: number,
  repaid: number,
) {
  return Math.max(0, principal - repaid);
}

describe("loan calculations", () => {
  it("calculates remaining loan amount", () => {
    expect(
      remainingAmount(1000, 300),
    ).toBe(700);
  });

  it("does not allow remaining amount below zero", () => {
    expect(
      remainingAmount(1000, 1200),
    ).toBe(0);
  });

  it("calculates repayment percentage", () => {
    expect(
      repaymentPercent(250, 1000),
    ).toBe(25);
  });

  it("caps repayment percentage at 100", () => {
    expect(
      repaymentPercent(1200, 1000),
    ).toBe(100);
  });

  it("handles zero principal", () => {
    expect(
      repaymentPercent(100, 0),
    ).toBe(0);
  });
});