import { createClient } from '@/lib/supabase/server';
import { getFinancialSummary } from '@/lib/finance/get-financial-summary';
import { getLoanBalances } from '@/lib/finance/get-loan-balances';
import { getAccountBalances } from '@/lib/finance/get-account-balances';
import { getDashboardSummary } from '@/lib/finance/get-dashboard-summary';
import { getFinancialInsights } from '@/lib/intelligence/get-financial-insights';
import { getNetWorthForecast } from '@/lib/intelligence/get-net-worth-forecast';
import { getCashFlowForecast } from '@/lib/intelligence/get-cash-flow-forecast';
import { formatMoney } from '@/lib/finance/format-money';
import { classifyQuery } from '@/lib/assistant/classify-query';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { query } = await request.json() as { query?: string };

  if (!query?.trim()) {
    return new Response(JSON.stringify({ error: 'Query required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const topic = classifyQuery(query);

  try {
    let answer: string;

    switch (topic) {
      case "net_worth": {
        const forecast = await getNetWorthForecast({ lookbackMonths: 6, months: 6 });
        const latest = forecast[0]?.months[0]?.projectedNetWorth ?? 0;
        const currency = forecast[0]?.currency ?? 'BDT';
        const nextChange = forecast[0]?.months[1]?.projectedChange ?? 0;
        answer = `Your current net worth is ${formatMoney(latest, currency)}. The forecast projects ${nextChange > 0 ? 'growth' : 'decline'} next month.`;
        break;
      }

      case "cash_flow": {
        const forecast = await getCashFlowForecast({ lookbackMonths: 6, months: 6 });
        const net = forecast[0]?.months[0]?.projectedNet ?? 0;
        const currency = forecast[0]?.currency ?? 'BDT';
        answer = `Projected monthly cash flow: ${formatMoney(net, currency)} (${net >= 0 ? 'positive' : 'negative'}).`;
        break;
      }

      case "loans": {
        const loans = await getLoanBalances();
        const lent = loans.filter(l => l.loan_type === 'lent' && l.status === 'active' && Number(l.remaining_amount) > 0);
        const borrowed = loans.filter(l => l.loan_type === 'borrowed' && l.status === 'active' && Number(l.remaining_amount) > 0);
        const lentTotal = lent.reduce((s, l) => s + Number(l.remaining_amount), 0);
        const borrowedTotal = borrowed.reduce((s, l) => s + Number(l.remaining_amount), 0);
        const currency = lent[0]?.currency ?? borrowed[0]?.currency ?? 'BDT';
        answer = `You are owed ${formatMoney(lentTotal, currency)} across ${lent.length} lent loans. You owe ${formatMoney(borrowedTotal, currency)} across ${borrowed.length} borrowed loans.`;
        break;
      }

      case "income_expense": {
        const summary = await getFinancialSummary();
        const totalIncome = Object.values(summary).reduce((s, c) => s + c.income, 0);
        const totalExpense = Object.values(summary).reduce((s, c) => s + c.expense, 0);
        const profit = totalIncome - totalExpense;
        const currency = Object.keys(summary)[0] ?? 'BDT';
        answer = `All-time: Income ${formatMoney(totalIncome, currency)}, Expenses ${formatMoney(totalExpense, currency)}, Net ${formatMoney(profit, currency)}.`;
        break;
      }

      case "accounts": {
        const accounts = await getAccountBalances();
        const assets = accounts.filter(a => a.account_type === 'asset' && !a.is_archived);
        const liabilities = accounts.filter(a => a.account_type === 'liability' && !a.is_archived);
        const assetTotal = assets.reduce((s, a) => s + Number(a.balance), 0);
        const liabilityTotal = liabilities.reduce((s, a) => s + Number(a.balance), 0);
        const currency = assets[0]?.currency ?? liabilities[0]?.currency ?? 'BDT';
        answer = `Total assets: ${formatMoney(assetTotal, currency)}. Total liabilities: ${formatMoney(liabilityTotal, currency)}. Net: ${formatMoney(assetTotal - liabilityTotal, currency)}.`;
        break;
      }

      case "goals": {
        const dash = await getDashboardSummary();
        const currency = Object.keys(dash.goals.totalTarget)[0] ?? 'BDT';
        answer = `Active goals: ${dash.goals.count}. Target: ${formatMoney(dash.goals.totalTarget[currency] ?? 0, currency)}. Current: ${formatMoney(dash.goals.totalCurrent[currency] ?? 0, currency)}.`;
        break;
      }

      case "budgets": {
        const dash = await getDashboardSummary();
        answer = `Active budgets: ${dash.budgets.count}. Over budget: ${dash.budgets.overBudget}.`;
        break;
      }

      case "insights": {
        const insights = await getFinancialInsights();
        const allInsights = insights.flatMap(i => i.insights);
        const critical = allInsights.filter(i => i.severity === 'critical');
        const warnings = allInsights.filter(i => i.severity === 'warning');
        if (critical.length) {
          answer = `Critical: ${critical.map(c => c.title).join(', ')}.`;
        } else if (warnings.length) {
          answer = `Warnings: ${warnings.map(w => w.title).join(', ')}.`;
        } else {
          answer = `No critical issues. ${allInsights.length} informational insights available.`;
        }
        break;
      }

      case "deposits": {
        const dash = await getDashboardSummary();
        const total = Object.values(dash.deposits).reduce((s, v) => s + v, 0);
        const currency = Object.keys(dash.deposits)[0] ?? 'BDT';
        answer = `Active deposits total: ${formatMoney(total, currency)}.`;
        break;
      }

      case "investments": {
        const dash = await getDashboardSummary();
        const total = Object.values(dash.investments).reduce((s, v) => s + v, 0);
        const currency = Object.keys(dash.investments)[0] ?? 'BDT';
        answer = `Active investments total: ${formatMoney(total, currency)}.`;
        break;
      }

      default:
        answer = `I can answer questions about: net worth, cash flow, loans, income/expenses, account balances, goals, budgets, deposits, investments, or financial insights. Try asking "What is my net worth?" or "Show me my loans."`;
    }

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Assistant error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process query' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}