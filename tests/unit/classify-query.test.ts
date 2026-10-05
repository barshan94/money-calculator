import { describe, test, expect } from "vitest";
import { classifyQuery } from '@/lib/assistant/classify-query';

describe('assistant classify-query', () => {
  const testCases: Array<{ query: string; expected: string }> = [
    // net worth
    { query: 'What is my net worth?', expected: 'net_worth' },
    { query: 'Show me my net worth', expected: 'net_worth' },
    { query: 'How much am I worth?', expected: 'net_worth' },

    // cash flow
    { query: 'What is my cash flow?', expected: 'cash_flow' },
    { query: 'Show me cash flow', expected: 'cash_flow' },
    { query: 'Cash flow forecast', expected: 'cash_flow' },

    // loans
    { query: 'Show me my loans', expected: 'loans' },
    { query: 'How much do I owe?', expected: 'loans' },
    { query: 'Money I lent', expected: 'loans' },
    { query: 'Money borrowed', expected: 'loans' },

    // income / expense
    { query: 'Show my income', expected: 'income_expense' },
    { query: 'How much do I earn?', expected: 'income_expense' },
    { query: 'Total expenses', expected: 'income_expense' },
    { query: 'What is my profit?', expected: 'income_expense' },

    // accounts
    { query: 'Show my accounts', expected: 'accounts' },
    { query: 'What are my balances?', expected: 'accounts' },
    { query: 'Account balances', expected: 'accounts' },

    // goals
    { query: 'Show my goals', expected: 'goals' },
    { query: 'Active goals', expected: 'goals' },
    { query: 'Goal progress', expected: 'goals' },

    // budgets
    { query: 'How many budgets?', expected: 'budgets' },
    { query: 'Budget over', expected: 'budgets' },

    // insights
    { query: 'Show financial insights', expected: 'insights' },
    { query: 'What insights?', expected: 'insights' },
    { query: 'Financial health', expected: 'insights' },

    // deposits
    { query: 'Show my deposits', expected: 'deposits' },
    { query: 'Deposit balances', expected: 'deposits' },

    // investments
    { query: 'Show my investments', expected: 'investments' },
    { query: 'Investment performance', expected: 'investments' },

    // unknown
    { query: 'Hello', expected: 'unknown' },
    { query: 'How are you?', expected: 'unknown' },
    { query: '', expected: 'unknown' },
  ];

  test.each(testCases)('classifyQuery("$expected") from "$query"', ({ query, expected }) => {
    const result = classifyQuery(query);
    expect(result).toBe(expected);
  });
});