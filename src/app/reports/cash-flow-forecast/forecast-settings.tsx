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
      className="forecast-settings card"
      aria-labelledby="forecast-settings-title"
    >
      <div className="settings-heading">
        <div>
          <span className="settings-eyebrow">
            Customize
          </span>

          <h2 id="forecast-settings-title">
            Forecast Settings
          </h2>

          <p>
            Choose how much historical data is used and
            how far ahead the forecast extends.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <label className="settings-field">
          <span>
            Historical lookback
          </span>

          <select
            value={lookbackMonths}
            onChange={(event) =>
              updateSettings(
                Number(event.target.value),
                forecastMonths,
              )
            }
          >
            {LOOKBACK_OPTIONS.map((months) => (
              <option
                key={months}
                value={months}
              >
                {months} months
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>
            Forecast horizon
          </span>

          <select
            value={forecastMonths}
            onChange={(event) =>
              updateSettings(
                lookbackMonths,
                Number(event.target.value),
              )
            }
          >
            {HORIZON_OPTIONS.map((months) => (
              <option
                key={months}
                value={months}
              >
                {months} months
              </option>
            ))}
          </select>
        </label>
      </div>

      <style>{`
        .forecast-settings {
          margin-bottom: 24px;
          padding: 18px;
        }

        .settings-eyebrow {
          display: block;
          margin-bottom: 5px;
          font-size: 11px;
          line-height: 1.4;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.58;
        }

        .settings-heading h2 {
          margin: 0;
          font-size: 18px;
        }

        .settings-heading p {
          margin: 6px 0 0;
          max-width: 680px;
          line-height: 1.5;
          font-size: 14px;
          opacity: 0.68;
        }

        .settings-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 18px;
        }

        .settings-field {
          display: grid;
          gap: 8px;
        }

        .settings-field > span {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.78;
        }

        .settings-field select {
          width: 100%;
          min-height: 44px;
          padding: 8px 10px;
          border: 1px solid
            var(--border, #d1d5db);
          border-radius: 8px;
          background: inherit;
          color: inherit;
          font: inherit;
        }

        .settings-field select:focus-visible {
          outline: 3px solid
            var(--ring, rgba(59, 130, 246, 0.35));
          outline-offset: 2px;
        }

        @media (max-width: 600px) {
          .forecast-settings {
            padding: 15px;
          }

          .settings-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .settings-field select {
            min-height: 46px;
          }
        }
      `}</style>
    </section>
  );
}

