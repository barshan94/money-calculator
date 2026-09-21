"use client";

type WhatIfChartMonth = {
  month: string;
  baselineNet: number;
  scenarioNet: number;
};

type Props = {
  currency: string;
  data: WhatIfChartMonth[];
};

export default function WhatIfScenarioChart({
  currency,
  data,
}: Props) {
  const maxValue = Math.max(
    ...data.map((item) =>
      Math.max(
        Math.abs(item.baselineNet),
        Math.abs(item.scenarioNet),
      ),
    ),
    1,
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      {data.map((item) => {
        const baselineWidth =
          (Math.abs(item.baselineNet) /
            maxValue) *
          100;

        const scenarioWidth =
          (Math.abs(item.scenarioNet) /
            maxValue) *
          100;

        return (
          <div
            key={item.month}
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <strong
              style={{
                fontSize: 14,
              }}
            >
              {item.month}
            </strong>

            <div
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "110px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    opacity: 0.7,
                  }}
                >
                  Baseline
                </span>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background:
                      "var(--muted-background, #f1f5f9)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${baselineWidth}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        "var(--border-color, #94a3b8)",
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {currency}{" "}
                  {item.baselineNet.toLocaleString(
                    "en-BD",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "110px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    opacity: 0.7,
                  }}
                >
                  Scenario
                </span>

                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background:
                      "var(--muted-background, #f1f5f9)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${scenarioWidth}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        "var(--foreground, #111827)",
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {currency}{" "}
                  {item.scenarioNet.toLocaleString(
                    "en-BD",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
