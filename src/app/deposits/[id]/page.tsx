import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

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
      className: "deposit-detail-neutral",
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
      className: "deposit-detail-warning",
    };
  }

  if (days === 0) {
    return {
      label: "Matures today",
      className: "deposit-detail-warning",
    };
  }

  if (days <= 30) {
    return {
      label: `${days} day${days === 1 ? "" : "s"} remaining`,
      className: "deposit-detail-warning",
    };
  }

  return {
    label: `${days} days remaining`,
    className: "deposit-detail-active",
  };
}

export default async function DepositDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: deposit, error } = await supabase
    .from("deposits")
    .select(
      "id, name, deposit_type, currency, principal_amount, interest_rate, maturity_amount, start_date, maturity_date, status, description",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !deposit) {
    notFound();
  }

  const principal = Number(
    deposit.principal_amount,
  );

  const maturity = Number(
    deposit.maturity_amount ?? principal,
  );

  const expectedInterest = maturity - principal;

  const maturityInfo = getMaturityInfo(
    deposit.maturity_date,
  );

  const expectedReturn =
    principal > 0
      ? (expectedInterest / principal) * 100
      : 0;

  return (
    <main className="deposit-detail-page">
      <style>{`
        .deposit-detail-page {
          max-width: 1100px;
          margin: 0 auto;
        }

        .deposit-detail-back {
          display: inline-flex;
          align-items: center;
          min-height: 36px;
          color: #475569;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 18px;
        }

        .deposit-detail-back:hover {
          color: #0f172a;
        }

        .deposit-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .deposit-detail-heading {
          min-width: 0;
        }

        .deposit-detail-heading h1 {
          margin: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .deposit-detail-subtitle {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .deposit-detail-type {
          display: inline-flex;
          align-items: center;
          min-height: 27px;
          padding: 0 9px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
        }

        .deposit-detail-status {
          display: inline-flex;
          align-items: center;
          min-height: 27px;
          padding: 0 9px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .deposit-detail-active {
          background: #dcfce7;
          color: #166534;
        }

        .deposit-detail-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .deposit-detail-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .deposit-detail-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 0 0 auto;
        }

        .deposit-detail-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }

        .deposit-detail-action:hover {
          background: #f8fafc;
        }

        .deposit-detail-action-primary {
          border-color: #0f172a;
          background: #0f172a;
          color: #fff;
        }

        .deposit-detail-action-primary:hover {
          background: #1e293b;
        }

        .deposit-detail-hero {
          display: grid;
          grid-template-columns: 1.25fr 1fr 1fr;
          gap: 14px;
          margin-bottom: 24px;
        }

        .deposit-detail-hero-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
        }

        .deposit-detail-hero-label {
          margin: 0 0 7px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .deposit-detail-hero-value {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .deposit-detail-hero-note {
          margin: 6px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .deposit-detail-profit {
          color: #166534;
        }

        .deposit-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .deposit-detail-section {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
        }

        .deposit-detail-section-full {
          grid-column: 1 / -1;
        }

        .deposit-detail-section h2 {
          margin: 0 0 16px;
          color: #0f172a;
          font-size: 17px;
        }

        .deposit-detail-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .deposit-detail-info {
          min-width: 0;
          padding: 11px;
          border-radius: 8px;
          background: #f8fafc;
        }

        .deposit-detail-info-label {
          display: block;
          margin-bottom: 5px;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
        }

        .deposit-detail-info-value {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .deposit-detail-description {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .deposit-detail-empty-description {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .deposit-detail-maturity {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px;
          border-radius: 9px;
          background: #f8fafc;
        }

        .deposit-detail-maturity-label {
          margin: 0 0 4px;
          color: #64748b;
          font-size: 12px;
        }

        .deposit-detail-maturity-date {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
        }

        .deposit-detail-maturity-badge {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .deposit-detail-header {
            flex-direction: column;
          }

          .deposit-detail-actions {
            width: 100%;
          }

          .deposit-detail-actions .deposit-detail-action {
            flex: 1;
          }

          .deposit-detail-hero {
            grid-template-columns: 1fr 1fr;
          }

          .deposit-detail-hero-card:first-child {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 600px) {
          .deposit-detail-heading h1 {
            font-size: 25px;
          }

          .deposit-detail-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .deposit-detail-action {
            width: 100%;
            padding: 0 10px;
            font-size: 12px;
          }

          .deposit-detail-hero {
            grid-template-columns: 1fr;
          }

          .deposit-detail-hero-card:first-child {
            grid-column: auto;
          }

          .deposit-detail-grid {
            grid-template-columns: 1fr;
          }

          .deposit-detail-section-full {
            grid-column: auto;
          }

          .deposit-detail-info-grid {
            grid-template-columns: 1fr;
          }

          .deposit-detail-maturity {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 400px) {
          .deposit-detail-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Link
        href="/deposits"
        className="deposit-detail-back"
      >
        ← Back to Deposits
      </Link>

      <header className="deposit-detail-header">
        <div className="deposit-detail-heading">
          <h1>{deposit.name}</h1>

          <div className="deposit-detail-subtitle">
            <span className="deposit-detail-type">
              {formatDepositType(
                deposit.deposit_type,
              )}
            </span>

            <span
              className="deposit-detail-status"
            >
              {deposit.status}
            </span>
          </div>
        </div>

        {deposit.status === "active" && (
          <div className="deposit-detail-actions">
            <Link
              href={`/deposits/${deposit.id}/edit`}
              className="deposit-detail-action"
            >
              Edit Deposit
            </Link>

            <Link
              href={`/deposits/${deposit.id}/withdraw`}
              className="deposit-detail-action deposit-detail-action-primary"
            >
              Withdraw Deposit
            </Link>
          </div>
        )}
      </header>

      <section className="deposit-detail-hero">
        <div className="deposit-detail-hero-card">
          <p className="deposit-detail-hero-label">
            Principal
          </p>

          <p className="deposit-detail-hero-value">
            {formatMoney(
              deposit.currency,
              principal,
            )}
          </p>

          <p className="deposit-detail-hero-note">
            Original amount deposited
          </p>
        </div>

        <div className="deposit-detail-hero-card">
          <p className="deposit-detail-hero-label">
            Expected Maturity
          </p>

          <p className="deposit-detail-hero-value">
            {formatMoney(
              deposit.currency,
              maturity,
            )}
          </p>

          <p className="deposit-detail-hero-note">
            Expected amount received
          </p>
        </div>

        <div className="deposit-detail-hero-card">
          <p className="deposit-detail-hero-label">
            Expected Interest
          </p>

          <p className="deposit-detail-hero-value deposit-detail-profit">
            {formatMoney(
              deposit.currency,
              expectedInterest,
            )}
          </p>

          <p className="deposit-detail-hero-note">
            {expectedReturn.toFixed(2)}% of principal
          </p>
        </div>
      </section>

      <div className="deposit-detail-grid">
        <section className="deposit-detail-section">
          <h2>Deposit Information</h2>

          <div className="deposit-detail-info-grid">
            <div className="deposit-detail-info">
              <span className="deposit-detail-info-label">
                Deposit Type
              </span>
              <span className="deposit-detail-info-value">
                {formatDepositType(
                  deposit.deposit_type,
                )}
              </span>
            </div>

            <div className="deposit-detail-info">
              <span className="deposit-detail-info-label">
                Currency
              </span>
              <span className="deposit-detail-info-value">
                {deposit.currency}
              </span>
            </div>

            <div className="deposit-detail-info">
              <span className="deposit-detail-info-label">
                Interest Rate
              </span>
              <span className="deposit-detail-info-value">
                {deposit.interest_rate !== null
                  ? `${Number(
                      deposit.interest_rate,
                    ).toFixed(2)}%`
                  : "Not specified"}
              </span>
            </div>

            <div className="deposit-detail-info">
              <span className="deposit-detail-info-label">
                Start Date
              </span>
              <span className="deposit-detail-info-value">
                {new Date(
                  `${deposit.start_date}T00:00:00`,
                ).toLocaleDateString("en-BD", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </section>

        <section className="deposit-detail-section">
          <h2>Maturity</h2>

          <div className="deposit-detail-maturity">
            <div>
              <p className="deposit-detail-maturity-label">
                Maturity Date
              </p>

              <p className="deposit-detail-maturity-date">
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
              </p>
            </div>

            <span
              className={`deposit-detail-maturity-badge ${maturityInfo.className}`}
            >
              {maturityInfo.label}
            </span>
          </div>
        </section>

        <section className="deposit-detail-section deposit-detail-section-full">
          <h2>Description</h2>

          {deposit.description ? (
            <p className="deposit-detail-description">
              {deposit.description}
            </p>
          ) : (
            <p className="deposit-detail-empty-description">
              No description was added for this deposit.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

