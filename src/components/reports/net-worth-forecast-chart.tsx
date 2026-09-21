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

type NetWorthForecastChartProps = {
  currency: string;
  data: {
    month: string;
    projectedNetWorth: number;
  }[];
};

export default function NetWorthForecastChart({
  currency,
  data,
}: NetWorthForecastChartProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "clamp(300px, 65vw, 420px)",
      }}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 20,
            left: 10,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="month"
            angle={-35}
            textAnchor="end"
            height={65}
            interval={0}
          />

          <YAxis
            width={80}
            tickFormatter={(value) =>
              Number(value).toLocaleString(
                "en-BD",
              )
            }
          />

          <Tooltip
            formatter={(value) => [
              `${currency} ${Number(value).toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}`,
              "Projected Net Worth",
            ]}
          />

          <Line
            type="monotone"
            dataKey="projectedNetWorth"
            name="Projected Net Worth"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

