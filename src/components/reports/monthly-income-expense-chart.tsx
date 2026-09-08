"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyData = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

type Props = {
  data: MonthlyData[];
};

export default function MonthlyIncomeExpenseChart({
  data,
}: Props) {
  return (
    <div
      className="card"
      style={{
        width: "100%",
        height: 420,
      }}
    >
      <h2>Income vs Expenses</h2>

      <ResponsiveContainer
        width="100%"
        height="90%"
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip
            formatter={(value) =>
              `BDT ${Number(value).toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                }
              )}`
            }
          />

          <Legend />

          <Bar
  dataKey="income"
  name="Income"
  fill="#22c55e"
/>

<Bar
  dataKey="expenses"
  name="Expenses"
  fill="#ef4444"
/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}