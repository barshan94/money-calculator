"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AccountBalance = {
  name: string;
  balance: number;
};

type Props = {
  data: AccountBalance[];
};

export default function AccountBalancesChart({
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
      <h2>Account Balances</h2>

      <ResponsiveContainer
        width="100%"
        height="90%"
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="name"
          />

          <YAxis />

          <Tooltip
            formatter={(value) =>
              `BDT ${Number(value).toLocaleString(
                "en-BD",
                {
                  minimumFractionDigits: 2,
                },
              )}`
            }
          />

          <Bar
            dataKey="balance"
            name="Balance"
            fill="#3b82f6"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}