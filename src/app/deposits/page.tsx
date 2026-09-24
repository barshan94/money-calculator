import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatMoney(
  currency: string,
  amount: number,
) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDepositType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getMaturityInfo(
  maturityDate: string | null,
) {
  if (!maturityDate) {
    return {
      label: "No maturity date",
      className: "deposit-status-neutral",
    };
  }

  const today = new Date();
  const maturity = new Date(
    `${maturityDate}T00:00:00`,
  );

  today.setHours(0, 0, 0, 0);

  const diffMs =
    maturity.getTime() - today.getTime();

  const days = Math.ceil(
    diffMs / (1000 * 60 * 60 * 24),
  );

  if (days < 0) {
    return {
      label: "Maturity date passed",
      className: "deposit-status-warning",
    };
  }

  if (days === 0) {
    return {
      label: "Matures today",
      className: "deposit-status-warning",
    };
  }

  if (days <= 30) {
    return {
      label: `${days} day${days === 1 ? "" : "s"} remaining`,
      className: "deposit-status-warning",
    };
  }

  return {
    label: `${days} days remaining`,
    className: "deposit-status-active",
  };
}

export default async function DepositsPage() {
  const supabase = await createClient();

  const {
    data: deposits,
    error,
  } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, interest_rate, maturity_amount, start_date, maturity_date, status",
    )
    .eq("status", "active")
    .order("start_date", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Deposits query failed: ${error.message}`,
    );
  }

  const rows = deposits ?? [];

  const totals = rows.reduce(
    (
      acc: Record<
        string,
        {
          principal: number;
          maturity: number;
        }
      >,
      deposit,
    ) => {
      const currency = deposit.currency;

      if (!acc[currency]) {
        acc[currency] = {
          principal: 0,
          maturity: 0,
        };
      }

      acc[currency].principal += Number(
        deposit.principal_amount,
      );

      acc[currency].maturity += Number(
        deposit.maturity_amount ??
          deposit.principal_amount,
      );

      return acc;
    },
    {},
  );

  const totalPrincipal = rows.reduce(
    (sum, deposit) =>
      sum + Number(deposit.principal_amount),
    0,
  );

  const totalMaturity = rows.reduce(
    (sum, deposit) =>
      sum +
      Number(
        deposit.maturity_amount ??
          deposit.principal_amount,
      ),
    0,
  );

  const totalExpectedInterest =
    totalMaturity - totalPrincipal;

  return (
    <main className="deposits-page">
      <style>{`
        .deposits-page {
          max-width: 1280px;
          margin: 0 auto;
        }

        .deposits-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
        }

        .deposits-header h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.2;
        }

        .deposits-header p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .deposit-primary-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 9px;
          background: #0f172a;
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .deposit-primary-action:hover {
          background: #1e293b;
        }

        .deposit-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 30px;
        }

        .deposit-summary-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
          min-width: 0;
        }

        .deposit-summary-label {
          margin: 0 0 7px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .deposit-summary-value {
          margin: 0;
          color: #0f172a;
          font-size: 21px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .deposit-summary-note {
          margin: 6px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .deposit-section {
          margin-bottom: 30px;
        }

        .deposit-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .deposit-section-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 19px;
        }

        .deposit-count {
          color: #64748b;
          font-size: 13px;
        }

        .deposit-currency-group {
          margin-bottom: 18px;
        }

        .deposit-currency-title {
          margin: 0 0 10px;
          color: #334155;
          font-size: 15px;
        }

        .deposit-currency-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .deposit-currency-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #fff;
          padding: 15px;
        }

        .deposit-currency-card h3 {
          margin: 0 0 7px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .deposit-currency-card p {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .deposit-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .deposit-card {
          display: block;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          color: inherit;
          padding: 17px;
          text-decoration: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            transform 0.15s ease;
        }

        .deposit-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 5px 18px rgba(15, 23, 42, 0.07);
          transform: translateY(-1px);
        }

        .deposit-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .deposit-card-title {
          min-width: 0;
        }

        .deposit-card-title h3 {
          margin: 0;
          color: #0f172a;
          font-size: 17px;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }

        .deposit-card-type {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .deposit-badge {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .deposit-status-active {
          background: #dcfce7;
          color: #166534;
        }

        .deposit-status-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .deposit-status-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .deposit-financial-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }

        .deposit-financial-item {
          min-width: 0;
          padding: 11px;
          border-radius: 8px;
          background: #f8fafc;
        }

        .deposit-financial-item:first-child {
          grid-column: 1 / -1;
        }

        .deposit-financial-label {
          display: block;
          margin-bottom: 4px;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }

        .deposit-financial-value {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .deposit-profit {
          color: #166534;
        }

        .deposit-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }

        .deposit-date {
          color: #64748b;
          font-size: 12px;
        }

        .deposit-view {
          color: #2563eb;
          font-size: 12px;
          font-weight: 600;
        }

        .deposit-empty {
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          padding: 30px 20px;
          text-align: center;
        }

        .deposit-empty h3 {
          margin: 0 0 7px;
          color: #334155;
          font-size: 16px;
        }

        .deposit-empty p {
          margin: 0 0 16px;
          color: #64748b;
          font-size: 13px;
        }

        .deposit-empty-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          background: #0f172a;
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .deposit-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .deposit-currency-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .deposit-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .deposits-header {
            flex-direction: column;
            align-items: stretch;
          }

          .deposit-primary-action {
            width: 100%;
          }

          .deposit-summary-grid {
            grid-template-columns: 1fr 1fr;
          }

          .deposit-currency-grid {
            grid-template-columns: 1fr;
          }

          .deposit-card {
            padding: 15px;
          }

          .deposit-card-top {
            gap: 8px;
          }

          .deposit-financial-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 420px) {
          .deposit-summary-grid {
            grid-template-columns: 1fr;
          }

          .deposit-financial-grid {
            grid-template-columns: 1fr;
          }

          .deposit-financial-item:first-child {
            grid-column: auto;
          }

          .deposit-card-top {
            flex-direction: column;
          }

          .deposit-badge {
            align-self: flex-start;
          }
        }
      `}</style>

      <header className="deposits-header">
        <div>
          <h1>Deposits</h1>
          <p>
            Track your fixed deposits, savings, maturity
            values, and expected interest.
          </p>
        </div>

        <Link
          href="/deposits/new"
          className="deposit-primary-action"
        >
          + New Deposit
        </Link>
      </header>

      {rows.length === 0 ? (
        <section className="deposit-empty">
          <h3>No active deposits</h3>
          <p>
            You currently have no active deposits.
            Create one to start tracking its maturity
            and expected return.
          </p>

          <Link
            href="/deposits/new"
            className="deposit-empty-action"
          >
            Create Your First Deposit
          </Link>
        </section>
      ) : (
        <>
          <section className="deposit-summary-grid">
            <div className="deposit-summary-card">
              <p className="deposit-summary-label">
                Active Deposits
              </p>
              <p className="deposit-summary-value">
                {rows.length}
              </p>
              <p className="deposit-summary-note">
                Currently active
              </p>
            </div>

            <div className="deposit-summary-card">
              <p className="deposit-summary-label">
                Total Principal
              </p>
              <p className="deposit-summary-value">
                {rows.length === 1
                  ? formatMoney(
                      rows[0].currency,
                      totalPrincipal,
                    )
                  : `${Object.keys(totals).length} currencies`}
              </p>
              <p className="deposit-summary-note">
                Capital currently deposited
              </p>
            </div>

            <div className="deposit-summary-card">
              <p className="deposit-summary-label">
                Expected Interest
              </p>
              <p className="deposit-summary-value">
                {rows.length === 1
                  ? formatMoney(
                      rows[0].currency,
                      totalExpectedInterest,
                    )
                  : `${Object.keys(totals).length} currencies`}
              </p>
              <p className="deposit-summary-note">
                Based on expected maturity
              </p>
            </div>
          </section>

          <section className="deposit-section">
            <div className="deposit-section-header">
              <h2>Deposit Summary</h2>
              <span className="deposit-count">
                {Object.keys(totals).length}{" "}
                {Object.keys(totals).length === 1
                  ? "currency"
                  : "currencies"}
              </span>
            </div>

            {Object.entries(totals).map(
              ([currency, total]) => {
                const interest =
                  total.maturity -
                  total.principal;

                return (
                  <div
                    key={currency}
                    className="deposit-currency-group"
                  >
                    <h3 className="deposit-currency-title">
                      {currency}
                    </h3>

                    <div className="deposit-currency-grid">
                      <div className="deposit-currency-card">
                        <h3>Total Principal</h3>
                        <p>
                          {formatMoney(
                            currency,
                            total.principal,
                          )}
                        </p>
                      </div>

                      <div className="deposit-currency-card">
                        <h3>Expected Maturity</h3>
                        <p>
                          {formatMoney(
                            currency,
                            total.maturity,
                          )}
                        </p>
                      </div>

                      <div className="deposit-currency-card">
                        <h3>Expected Interest</h3>
                        <p className="deposit-profit">
                          {formatMoney(
                            currency,
                            interest,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </section>

          <section className="deposit-section">
            <div className="deposit-section-header">
              <h2>Active Deposits</h2>
              <span className="deposit-count">
                {rows.length}{" "}
                {rows.length === 1
                  ? "deposit"
                  : "deposits"}
              </span>
            </div>

            <div className="deposit-list">
              {rows.map((deposit) => {
                const principal = Number(
                  deposit.principal_amount,
                );

                const maturity = Number(
                  deposit.maturity_amount ??
                    deposit.principal_amount,
                );

                const expectedInterest =
                  maturity - principal;

                const maturityInfo =
                  getMaturityInfo(
                    deposit.maturity_date,
                  );

                return (
                  <Link
                    key={deposit.id}
                    href={`/deposits/${deposit.id}`}
                    className="deposit-card"
                  >
                    <div className="deposit-card-top">
                      <div className="deposit-card-title">
                        <h3>{deposit.name}</h3>
                        <p className="deposit-card-type">
                          {formatDepositType(
                            deposit.deposit_type,
                          )}
                        </p>
                      </div>

                      <span
                        className={`deposit-badge ${maturityInfo.className}`}
                      >
                        {maturityInfo.label}
                      </span>
                    </div>

                    <div className="deposit-financial-grid">
                      <div className="deposit-financial-item">
                        <span className="deposit-financial-label">
                          Principal
                        </span>
                        <span className="deposit-financial-value">
                          {formatMoney(
                            deposit.currency,
                            principal,
                          )}
                        </span>
                      </div>

                      <div className="deposit-financial-item">
                        <span className="deposit-financial-label">
                          Expected Maturity
                        </span>
                        <span className="deposit-financial-value">
                          {formatMoney(
                            deposit.currency,
                            maturity,
                          )}
                        </span>
                      </div>

                      <div className="deposit-financial-item">
                        <span className="deposit-financial-label">
                          Expected Interest
                        </span>
                        <span className="deposit-financial-value deposit-profit">
                          {formatMoney(
                            deposit.currency,
                            expectedInterest,
                          )}
                        </span>
                      </div>

                      {deposit.interest_rate !==
                        null && (
                        <div className="deposit-financial-item">
                          <span className="deposit-financial-label">
                            Interest Rate
                          </span>
                          <span className="deposit-financial-value">
                            {Number(
                              deposit.interest_rate,
                            ).toFixed(2)}
                            %
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="deposit-card-footer">
                      <span className="deposit-date">
                        Matures{" "}
                        {deposit.maturity_date
                          ? new Date(
                              `${deposit.maturity_date}T00:00:00`,
                            ).toLocaleDateString(
                              "en-BD",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "Not specified"}
                      </span>

                      <span className="deposit-view">
                        View details →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

