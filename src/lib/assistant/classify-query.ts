export type AssistantTopic =
  | "net_worth"
  | "cash_flow"
  | "loans"
  | "income_expense"
  | "accounts"
  | "goals"
  | "budgets"
  | "insights"
  | "deposits"
  | "investments"
  | "unknown";

/**
 * Maps a plain-English query to the financial module it should be
 * answered from. Pure / deterministic so it can be unit-tested without
 * a database.
 */
export function classifyQuery(query: string): AssistantTopic {
  const q = query.toLowerCase();

  if (q.includes("net worth") || q.includes("networth") || q.includes("worth")) {
    return "net_worth";
  }
  if (q.includes("cash flow") || q.includes("cashflow")) {
    return "cash_flow";
  }
  if (
    q.includes("loan") ||
    q.includes("lend") ||
    q.includes("lent") ||
    q.includes("borrow") ||
    q.includes("owe")
  ) {
    return "loans";
  }
  if (
    q.includes("income") ||
    q.includes("expense") ||
    q.includes("spend") ||
    q.includes("profit") ||
    q.includes("earn")
  ) {
    return "income_expense";
  }
  if (
    q.includes("deposit") ||
    q.includes("deposits")
  ) {
    return "deposits";
  }
  if (
    q.includes("account") ||
    q.includes("balance") ||
    q.includes("asset")
  ) {
    return "accounts";
  }
  if (q.includes("goal")) {
    return "goals";
  }
  if (q.includes("budget")) {
    return "budgets";
  }
  if (
    q.includes("insight") ||
    q.includes("health") ||
    q.includes("trend") ||
    q.includes("forecast")
  ) {
    return "insights";
  }
  if (q.includes("investment")) {
    return "investments";
  }

  return "unknown";
}