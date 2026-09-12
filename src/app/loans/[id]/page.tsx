import Link from "next/link";
import { notFound } from "next/navigation";
import CancelLoanButton from "@/components/loans/cancel-loan-button";
import LoanWhatsAppButton from "@/components/loans/loan-whatsapp-button";
import CancelRepaymentButton from "./repayments/CancelRepaymentButton";

import { createClient } from "@/lib/supabase/server";
import { getLoanBalances } from "@/lib/finance/get-loan-balances";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Repayment = {
  transaction_id: string;
  transaction_date: string | null;
  amount: number;
  account_id: string;
  account_name: string;
  description: string | null;
  status: "posted" | "cancelled";
};

type LoanDetails = {
  id: string;
  person_name: string;
  loan_type: "lent" | "borrowed";
  principal_amount: number;
  currency: string;
  status: "active" | "settled" | "cancelled";
  whatsapp_number: string | null;
  start_date: string;
  start_datetime: string | null;
  due_date: string | null;
};

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "No due date";
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(timestamp: string | null) {
  if (!timestamp) {
    return "Unknown date";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatPaymentDate(timestamp: string | null | undefined) {
  return formatDateTime(timestamp ?? null);
}

export default async function LoanDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const loans = await getLoanBalances();

  const balance = loans.find((item) => item.id === id);

  if (!balance) {
    notFound();
  }

  const { data: loanData, error: loanError } = await supabase
    .from("loans")
    .select(`
      id,
      person_name,
      loan_type,
      principal_amount,
      currency,
      status,
      whatsapp_number,
      start_date,
      start_datetime,
      due_date
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (loanError || !loanData) {
    notFound();
  }

  const loan = loanData as LoanDetails;

  const {
    data: repaymentData,
    error: repaymentError,
  } = await supabase.rpc("get_loan_repayments", {
    p_loan_id: id,
  });

  const repayments: Repayment[] = repaymentError
    ? []
    : ((repaymentData as Repayment[]) ?? []);

  const principal = Number(balance.principal_amount);
  const repaid = Number(balance.repaid_amount);
  const remaining = Number(balance.remaining_amount);

  const repaymentPercentage =
    principal > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((repaid / principal) * 100),
          ),
        )
      : 0;

  const canEdit = loan.status !== "cancelled";

  const canCancel =
    loan.status === "active" &&
    repayments.every(
      (repayment) => repayment.status === "cancelled",
    );

  return (
    <main>
      <div className="loan-detail-header">
        <Link href="/loans" className="loan-detail-back">
          ← Back to Loans
        </Link>

        <div className="loan-detail-title-row">
          <div>
            <p className="loan-detail-eyebrow">
              Loan account
            </p>

            <h1>{loan.person_name}</h1>

            <p className="loan-detail-type">
              {loan.loan_type === "lent"
                ? "You lent money"
                : "You borrowed money"}
            </p>
          </div>

          <span
            className={`loan-detail-status ${
              loan.status === "settled"
                ? "loan-detail-success"
                : loan.status === "cancelled"
                  ? "loan-detail-danger"
                  : "loan-detail-neutral"
            }`}
          >
            {loan.status}
          </span>
        </div>
      </div>

      <section className="loan-detail-hero">
        <span>Outstanding</span>

        <strong>
          {formatAmount(remaining, loan.currency)}
        </strong>

        <div className="loan-detail-progress">
          <div className="loan-detail-progress-track">
            <div
              className="loan-detail-progress-fill"
              style={{
                width: `${repaymentPercentage}%`,
              }}
            />
          </div>

          <span>{repaymentPercentage}% repaid</span>
        </div>
      </section>

      <section className="loan-detail-summary">
        <div>
          <span>Principal</span>
          <strong>
            {formatAmount(principal, loan.currency)}
          </strong>
        </div>

        <div>
          <span>Repaid</span>
          <strong>
            {formatAmount(repaid, loan.currency)}
          </strong>
        </div>

        <div>
          <span>Remaining</span>
          <strong>
            {formatAmount(remaining, loan.currency)}
          </strong>
        </div>
      </section>

      <section className="loan-detail-info-grid">
        <div className="loan-detail-info-card">
          <span>Status</span>
          <strong>{loan.status}</strong>
        </div>

        <div className="loan-detail-info-card">
          <span>Due</span>

          <strong>
            {loan.due_date
              ? formatDate(loan.due_date)
              : "No due date"}
          </strong>
        </div>

        <div className="loan-detail-info-card">
          <span>Started</span>

          <strong>
            {formatDateTime(loan.start_datetime)}
          </strong>
        </div>
      </section>

      {canEdit && (
        <section className="loan-detail-management">
          <Link
            href={`/loans/${loan.id}/edit`}
            className="loan-detail-secondary-button"
          >
            Edit Loan
          </Link>

          {canCancel && (
            <CancelLoanButton loanId={loan.id} />
          )}
        </section>
      )}

      {loan.status === "active" && remaining > 0 && (
        <section className="loan-detail-actions">
          <Link
            href={`/loans/${loan.id}/repay`}
            className="loan-detail-primary-button"
          >
            Record Repayment
          </Link>

          {loan.whatsapp_number && (
            <LoanWhatsAppButton
              personName={loan.person_name}
              phoneNumber={loan.whatsapp_number}
              currency={loan.currency}
              remainingAmount={remaining}
            />
          )}
        </section>
      )}

      {loan.status === "active" &&
        !canCancel &&
        repayments.some(
          (repayment) => repayment.status === "posted",
        ) && (
          <p className="loan-detail-note">
            Cancel active repayments first if you want
            to cancel this loan.
          </p>
        )}

      <section className="loan-detail-history">
        <div className="loan-detail-section-header">
          <div>
            <h2>Repayment History</h2>

            <p>
              {repayments.length} repayment
              {repayments.length === 1 ? "" : "s"} recorded
            </p>
          </div>
        </div>

        {repaymentError ? (
          <div className="loan-detail-empty">
            Unable to load repayment history.
          </div>
        ) : repayments.length === 0 ? (
          <div className="loan-detail-empty">
            No repayments recorded yet.
          </div>
        ) : (
          <div className="loan-repayment-list">
            {repayments.map((repayment) => {
              const cancelled =
                repayment.status === "cancelled";

              return (
                <div
                  key={repayment.transaction_id}
                  className={`loan-repayment-row ${
                    cancelled
                      ? "loan-repayment-cancelled"
                      : ""
                  }`}
                >
                  <div className="loan-repayment-main">
                    <div>
                      <strong>
                        {formatPaymentDate(
                          repayment.transaction_date,
                        )}
                      </strong>

                      <span>Repayment</span>
                    </div>

                    <strong className="loan-repayment-amount">
                      {formatAmount(
                        Number(repayment.amount),
                        loan.currency,
                      )}
                    </strong>
                  </div>

                  <div className="loan-repayment-meta">
                    <span>
                      → {repayment.account_name}
                    </span>

                    <span>
                      {cancelled
                        ? "↩ Cancelled"
                        : "Posted"}
                    </span>
                  </div>

                  {repayment.description && (
                    <p className="loan-repayment-description">
                      {repayment.description}
                    </p>
                  )}

                  {!cancelled && (
                    <div className="loan-repayment-actions">
                      <Link
                        href={`/loans/${loan.id}/repayments/${repayment.transaction_id}/edit`}
                      >
                        Edit
                      </Link>

                      <CancelRepaymentButton
                        transactionId={
                          repayment.transaction_id
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .loan-detail-header {
          margin-bottom: 24px;
        }

        .loan-detail-cancel-button {
          display: inline-flex;
          padding: 10px 15px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: transparent;
          color: var(--danger);
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .loan-detail-cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loan-detail-back {
          display: inline-block;
          margin-bottom: 20px;
          color: var(--muted);
          text-decoration: none;
          font-size: 12px;
        }

        .loan-detail-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .loan-detail-eyebrow {
          margin: 0 0 5px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          color: var(--muted);
        }

        .loan-detail-title-row h1 {
          margin: 0;
        }

        .loan-detail-type {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 12px;
        }

        .loan-detail-status,
        .loan-detail-neutral,
        .loan-detail-warning,
        .loan-detail-danger,
        .loan-detail-success {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 10px;
          font-weight: 700;
        }

        .loan-detail-neutral {
          background: var(--muted-background);
          color: var(--muted);
        }

        .loan-detail-warning {
          color: #c2410c;
          background: #fff7ed;
        }

        .loan-detail-danger {
          color: var(--danger);
          background: #fef2f2;
        }

        .loan-detail-success {
          color: var(--success);
          background: #f0fdf4;
        }

        .loan-detail-hero {
          padding: 24px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--card);
        }

        .loan-detail-hero > span {
          display: block;
          color: var(--muted);
          font-size: 12px;
          margin-bottom: 5px;
        }

        .loan-detail-hero > strong {
          display: block;
          font-size: 30px;
          line-height: 1.15;
        }

        .loan-detail-progress {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
        }

        .loan-detail-progress-track {
          flex: 1;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--muted-background);
        }

        .loan-detail-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: var(--primary);
        }

        .loan-detail-progress > span {
          color: var(--muted);
          font-size: 10px;
          white-space: nowrap;
        }

        .loan-detail-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 14px;
        }

        .loan-detail-summary > div,
        .loan-detail-info-card {
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .loan-detail-summary span,
        .loan-detail-info-card span {
          display: block;
          margin-bottom: 6px;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-detail-summary strong {
          font-size: 16px;
        }

        .loan-detail-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 14px;
        }

        .loan-detail-info-card strong {
          display: block;
          font-size: 13px;
        }

        .loan-detail-management,
        .loan-detail-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
        }

        .loan-detail-primary-button,
        .loan-detail-secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 15px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        .loan-detail-primary-button {
          background: var(--primary);
          color: white;
        }

        .loan-detail-secondary-button {
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
        }

        .loan-detail-note {
          margin: 10px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-detail-history {
          margin-top: 34px;
        }

        .loan-detail-section-header {
          margin-bottom: 14px;
        }

        .loan-detail-section-header h2 {
          margin: 0;
          font-size: 15px !important;
          font-weight: 700 !important;
        }

        .loan-detail-section-header p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-repayment-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .loan-repayment-row {
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .loan-repayment-cancelled {
          opacity: 0.65;
        }

        .loan-repayment-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .loan-repayment-main > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .loan-repayment-main strong {
          font-size: 13px;
        }

        .loan-repayment-main span {
          color: var(--muted);
          font-size: 10px;
        }

        .loan-repayment-amount {
          font-size: 16px !important;
        }

        .loan-repayment-meta {
          display: flex;
          gap: 14px;
          margin-top: 9px;
          color: var(--muted);
          font-size: 10px;
        }

        .loan-repayment-description {
          margin: 9px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .loan-repayment-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }

        .loan-repayment-actions a {
          color: var(--foreground);
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .loan-detail-empty {
          padding: 24px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          color: var(--muted);
          text-align: center;
          font-size: 12px;
        }

        @media (max-width: 700px) {
          .loan-detail-title-row {
            flex-direction: column;
          }

          .loan-detail-status {
            align-self: flex-start;
          }

          .loan-detail-summary,
          .loan-detail-info-grid {
            grid-template-columns: 1fr;
          }

          .loan-detail-management,
          .loan-detail-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .loan-detail-primary-button,
          .loan-detail-secondary-button {
            width: 100%;
          }

          .loan-detail-hero > strong {
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}