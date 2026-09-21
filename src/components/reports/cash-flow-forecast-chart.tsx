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

type ForecastData = {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedNet: number;
};

type Props = {
  currency: string;
  data: ForecastData[];
};

function formatMoney(value: number, currency: string) {
  return `${currency} ${Number(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CashFlowForecastChart({
  currency,
  data,
}: Props) {
  return (
    <div
      style={{
        width: "100%",
        height: "clamp(300px, 65vw, 420px)",
        minWidth: 0,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            left: 0,
            bottom: 24,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="month"
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
            tick={{
              fontSize: 11,
            }}
          />

          <YAxis
            width={60}
            tick={{
              fontSize: 11,
            }}
            tickFormatter={(value) =>
              Number(value).toLocaleString("en-BD", {
                notation: "compact",
                maximumFractionDigits: 1,
              })
            }
          />

          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value), currency),
              name,
            ]}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 8,
            }}
          />

          <Bar
            dataKey="projectedIncome"
            name="Projected income"
            fill="#22c55e"
          />

          <Bar
            dataKey="projectedExpenses"
            name="Projected expenses"
            fill="#ef4444"
          />

          <Bar
            dataKey="projectedNet"
            name="Projected net"
            fill="#3b82f6"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

