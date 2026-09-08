"use client";

import {
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SpendingItem = {
  category: string;
  amount: number;
};

type Props = {
  data: SpendingItem[];
};

export default function SpendingByCategoryChart({
  data,
}: Props) {
  return (
    <div
      className="card"
      style={{
        width: "100%",
        height: 450,
      }}
    >
      <h2>Where Your Money Goes</h2>

      <ResponsiveContainer
        width="100%"
        height="90%"
      >
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            cx="50%"
            cy="45%"
            outerRadius={130}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
            }
          />

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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}