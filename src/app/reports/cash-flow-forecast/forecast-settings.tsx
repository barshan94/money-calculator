"use client";

type Props = {
  lookbackMonths: number;
  forecastMonths: number;
  basePath?: string;
};

const LOOKBACK_OPTIONS = [3, 6, 12];
const HORIZON_OPTIONS = [3, 6, 12];

export default function ForecastSettings({
  lookbackMonths,
  forecastMonths,
  basePath = "/reports/cash-flow-forecast",
}: Props) {
  function updateSettings(
    nextLookback: number,
    nextHorizon: number,
  ) {
    const params = new URLSearchParams();

    params.set("lookback", String(nextLookback));
    params.set("horizon", String(nextHorizon));

    window.location.href =
      `${basePath}?${params.toString()}`;
  }

  return (
    <section
      style={{
        border: "1px solid var(--border-color, #e5e7eb)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 8,
        }}
      >
        Forecast settings
      </h2>

      <p
        style={{
          marginTop: 0,
          marginBottom: 16,
          opacity: 0.75,
        }}
      >
        Adjust how much historical data is used and how far ahead
        the forecast extends.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          <span>Historical lookback</span>

          <select
            value={lookbackMonths}
            onChange={(event) =>
              updateSettings(
                Number(event.target.value),
                forecastMonths,
              )
            }
            style={{
              minHeight: 42,
              padding: "8px 10px",
              borderRadius: 8,
              border:
                "1px solid var(--border-color, #d1d5db)",
              background: "inherit",
              color: "inherit",
            }}
          >
            {LOOKBACK_OPTIONS.map((months) => (
              <option key={months} value={months}>
                {months} months
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          <span>Forecast horizon</span>

          <select
            value={forecastMonths}
            onChange={(event) =>
              updateSettings(
                lookbackMonths,
                Number(event.target.value),
              )
            }
            style={{
              minHeight: 42,
              padding: "8px 10px",
              borderRadius: 8,
              border:
                "1px solid var(--border-color, #d1d5db)",
              background: "inherit",
              color: "inherit",
            }}
          >
            {HORIZON_OPTIONS.map((months) => (
              <option key={months} value={months}>
                {months} months
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

