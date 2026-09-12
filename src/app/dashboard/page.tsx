import Link from "next/link";

import { getAccountBalances } from "@/lib/finance/get-account-balances";
import { getFinancialSummary } from "@/lib/finance/get-financial-summary";
import { formatMoney } from "@/lib/finance/format-money";

export default async function DashboardPage() {
  const [accounts, summary] = await Promise.all([
    getAccountBalances(),
    getFinancialSummary(),
  ]);

  const bdtSummary = summary.BDT ?? {
    income: 0,
    expense: 0,
    profit: 0,
  };

  const balancesByCurrency = accounts.reduce(
    (result, account) => {
      if (!result[account.currency]) {
        result[account.currency] = {
          assets: 0,
          liabilities: 0,
        };
      }

      if (account.account_type === "asset") {
        result[account.currency].assets += account.balance;
      }

      if (account.account_type === "liability") {
        result[account.currency].liabilities += account.balance;
      }

      return result;
    },
    {} as Record<
      string,
      {
        assets: number;
        liabilities: number;
      }
    >,
  );

  const moneyAccounts = accounts.filter(
    (account) =>
      account.account_type === "asset" ||
      account.account_type === "liability",
  );

  return (
    <>
      <style>{`
        /* =====================================================
           DASHBOARD
        ===================================================== */

        .mc-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 30px;
        }

        .mc-dashboard-eyebrow {
          margin: 0 0 5px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.3;
          font-weight: 500;
        }

        .mc-dashboard-title {
          margin: 0;
          font-size: 32px;
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -0.03em;
        }

        /* =====================================================
           SECTION HEADERS
        ===================================================== */

        .mc-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .mc-section-title {
          margin: 0 !important;
          padding: 0 !important;

          color: var(--foreground);

          font-size: 15px !important;
          line-height: 1.3 !important;
          font-weight: 700 !important;

          letter-spacing: -0.01em !important;
        }

        .mc-view-all {
          display: inline-flex;
          align-items: center;
          gap: 3px;

          color: var(--primary);

          font-size: 11px;
          line-height: 1;
          font-weight: 600;

          white-space: nowrap;

          text-decoration: none;
        }

        .mc-view-all:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        /* =====================================================
           MONTHLY OVERVIEW
        ===================================================== */

        .mc-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .mc-overview-card {
          min-width: 0;
          padding: 20px;
        }

        .mc-card-label {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 500;
        }

        .mc-overview-value {
          margin: 8px 0 0;

          font-size: 25px;
          line-height: 1.2;
          font-weight: 700;

          letter-spacing: -0.025em;
        }

        /* =====================================================
           NET WORTH
        ===================================================== */

        .mc-net-worth-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(220px, 1fr)
          );
          gap: 16px;
        }

        .mc-net-worth-card {
          min-width: 0;
          padding: 20px;
        }

        .mc-net-worth-label {
          margin: 0;

          color: var(--muted);

          font-size: 12px;
          line-height: 1.3;
          font-weight: 600;
        }

        .mc-net-worth-value {
          margin: 6px 0 0;

          font-size: 26px;
          line-height: 1.2;
          font-weight: 700;

          letter-spacing: -0.025em;
        }

        .mc-net-worth-details {
          display: grid;
          gap: 6px;

          margin-top: 14px;

          color: var(--muted);

          font-size: 13px;
          line-height: 1.4;
        }

        /* =====================================================
           ACCOUNTS
        ===================================================== */

        .mc-accounts-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(220px, 1fr)
          );
          gap: 12px;
        }

        .mc-account-card {
          display: block;

          min-width: 0;

          padding: 17px;
        }

        .mc-account-inner {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          gap: 14px;
        }

        .mc-account-name {
          min-width: 0;
        }

        .mc-account-name strong {
          display: block;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mc-account-type {
          margin: 5px 0 0;

          color: var(--muted);

          font-size: 13px;

          text-transform: capitalize;
        }

        .mc-account-balance {
          flex-shrink: 0;

          font-weight: 700;

          white-space: nowrap;
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {
          .mc-dashboard-header {
            flex-direction: column;
            align-items: stretch;

            gap: 16px;

            margin-bottom: 24px;
          }

          .mc-dashboard-title {
            font-size: 27px;
          }

          .mc-dashboard-action {
            width: 100%;
          }

          .mc-dashboard-action a {
            width: 100%;
            box-sizing: border-box;

            justify-content: center;
          }

          .mc-overview-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .mc-overview-card {
            padding: 16px;
          }

          .mc-overview-value {
            font-size: 23px;
          }

          .mc-net-worth-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .mc-net-worth-card {
            padding: 16px;
          }

          .mc-net-worth-value {
            font-size: 24px;
          }

          .mc-accounts-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .mc-account-card {
            padding: 16px;
          }

          .mc-section-header {
            margin-bottom: 12px;
          }

          .mc-section-title {
            font-size: 15px !important;
          }

          .mc-view-all {
            font-size: 11px;
          }
        }

        @media (max-width: 380px) {
          .mc-account-inner {
            gap: 8px;
          }

          .mc-account-balance {
            font-size: 14px;
          }
        }
      `}</style>

      <div>
        {/* Dashboard Header */}

        <div className="mc-dashboard-header">
          <div>
            <p className="mc-dashboard-eyebrow">
              Financial overview
            </p>

            <h1 className="mc-dashboard-title">
              Dashboard
            </h1>
          </div>

          <div className="mc-dashboard-action">
            <Link
              href="/transactions/new"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "11px 16px",
                borderRadius: 8,
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              + Add Transaction
            </Link>
          </div>
        </div>

        {/* Monthly Overview */}

        <section>
          <div className="mc-section-header">
            <h2 className="mc-section-title">
              Monthly Overview
            </h2>
          </div>

          <div className="mc-overview-grid">
            <div className="card mc-overview-card">
              <p className="mc-card-label">
                Income
              </p>

              <h3 className="mc-overview-value">
                {formatMoney(
                  bdtSummary.income,
                  "BDT",
                )}
              </h3>
            </div>

            <div className="card mc-overview-card">
              <p className="mc-card-label">
                Expenses
              </p>

              <h3 className="mc-overview-value">
                {formatMoney(
                  bdtSummary.expense,
                  "BDT",
                )}
              </h3>
            </div>

            <div className="card mc-overview-card">
              <p className="mc-card-label">
                Net Income
              </p>

              <h3
                className="mc-overview-value"
                style={{
                  color:
                    bdtSummary.profit >= 0
                      ? "var(--success)"
                      : "var(--danger)",
                }}
              >
                {formatMoney(
                  bdtSummary.profit,
                  "BDT",
                )}
              </h3>
            </div>
          </div>
        </section>

        {/* Net Worth */}

        <section>
          <div className="mc-section-header">
            <h2 className="mc-section-title">
              Net Worth
            </h2>
          </div>

          <div className="mc-net-worth-grid">
            {Object.entries(balancesByCurrency).map(
              ([currency, balance]) => {
                const netWorth =
                  balance.assets -
                  balance.liabilities;

                return (
                  <div
                    key={currency}
                    className="card mc-net-worth-card"
                  >
                    <p className="mc-net-worth-label">
                      {currency} Net Worth
                    </p>

                    <h3 className="mc-net-worth-value">
                      {formatMoney(
                        netWorth,
                        currency,
                      )}
                    </h3>

                    <div className="mc-net-worth-details">
                      <span>
                        Assets:{" "}
                        {formatMoney(
                          balance.assets,
                          currency,
                        )}
                      </span>

                      <span>
                        Liabilities:{" "}
                        {formatMoney(
                          balance.liabilities,
                          currency,
                        )}
                      </span>
                    </div>
                  </div>
                );
              },
            )}

            {Object.keys(balancesByCurrency)
              .length === 0 && (
              <p className="muted">
                No accounts yet.
              </p>
            )}
          </div>
        </section>

        {/* Accounts */}

        <section>
          <div className="mc-section-header">
            <h2 className="mc-section-title">
              Accounts
            </h2>

            <Link
              href="/accounts"
              className="mc-view-all"
            >
              View all →
            </Link>
          </div>

          {moneyAccounts.length === 0 ? (
            <p className="muted">
              No accounts available.
            </p>
          ) : (
            <div className="mc-accounts-grid">
              {moneyAccounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="card mc-account-card"
                >
                  <div className="mc-account-inner">
                    <div className="mc-account-name">
                      <strong>
                        {account.name}
                      </strong>

                      <p className="mc-account-type">
                        {account.account_type}
                      </p>
                    </div>

                    <span className="mc-account-balance">
                      {formatMoney(
                        account.balance,
                        account.currency,
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}