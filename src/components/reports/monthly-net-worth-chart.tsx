"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyNetWorth = {
  month: string;
  assets: number;
  liabilities: number;
  net_worth: number;
};

type Props = {
  currency: string;
  data: MonthlyNetWorth[];
};

export default function MonthlyNetWorthChart({
  currency,
  data,
}: Props) {
  const chartData = data.map((item) => ({
    ...item,
    month: new Date(
      item.month,
    ).toLocaleDateString("en-BD", {
      month: "short",
      year: "numeric",
    }),
  }));

  return (
    <div
      className="card"
      style={{
        width: "100%",
        height: 450,
      }}
    >
      <h2>
        Net Worth Trend ({currency})
      </h2>

      <ResponsiveContainer
        width="100%"
        height="90%"
      >
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip
            formatter={(value) =>
              `${currency} ${Number(
                value,
              ).toLocaleString("en-BD", {
                minimumFractionDigits: 2,
              })}`
            }
          />

          <Line
            type="monotone"
            dataKey="net_worth"
            name="Net Worth"
            stroke="#3b82f6"
            strokeWidth={3}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
