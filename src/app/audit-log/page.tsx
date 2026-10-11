import Link from "next/link";

import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/finance/format-money";

type AuditEventType =
  | "transaction"
  | "reversal"
  | "asset_cancelled"
  | "tuition_payment";

type AuditEvent = {
  id: string;
  happened_at: string;
  type: AuditEventType;
  title: string;
  description: string;
  related_transaction_id?: string;
  related_asset_id?: string;
  currency?: string;
  amount?: number;
};

function formatDateTimeBD(value: string) {
  return new Date(value).toLocaleString("en-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function typeBadgeClass(type: AuditEventType) {
  switch (type) {
    case "reversal":
      return "badge badge-neutral";
    case "asset_cancelled":
      return "badge badge-warning";
    case "tuition_payment":
      return "badge badge-info";
    case "transaction":
    default:
      return "badge badge-neutral";
  }
}

export default async function AuditLogPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [
    transactionsResult,
    tuitionPaymentsResult,
    longTermAssetsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, description, transaction_type, status, reversal_of_id, created_at, loan_id, amount_currency, amount_total",
      )
      .eq("user_id", user.id)
      .in("status", ["posted", "voided"])
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("tuition_payments")
      .select("transaction_id")
      .eq("user_id", user.id)
      .limit(250),

    supabase
      .from("long_term_assets")
      .select(
        "id, name, asset_type, currency, status, archived_at, purchase_transaction_id",
      )
      .eq("user_id", user.id)
      .not("archived_at", "is", null)
      .limit(250),
  ]);

  if (transactionsResult.error) {
    throw new Error(
      transactionsResult.error.message,
    );
  }

  if (tuitionPaymentsResult.error) {
    throw new Error(
      tuitionPaymentsResult.error.message,
    );
  }

  if (longTermAssetsResult.error) {
    throw new Error(
      longTermAssetsResult.error.message,
    );
  }

  const transactions =
    (transactionsResult.data ?? []) as Array<{
      id: string;
      transaction_date: string;
      description: string | null;
      transaction_type: string;
      status: "posted" | "voided";
      reversal_of_id: string | null;
      created_at: string;
      loan_id: string | null;
      // optional convenience columns (if present in your schema)
      amount_currency?: string | null;
      amount_total?: number | null;
    }>;

  const tuitionPayments =
    (tuitionPaymentsResult.data ?? []) as Array<{
      transaction_id: string;
    }>;

  const tuitionTransactionIds = new Set(
    tuitionPayments.map(
      (tp) => tp.transaction_id,
    ),
  );

  const longTermAssets =
    (longTermAssetsResult.data ?? []) as Array<{
      id: string;
      name: string;
      asset_type: string;
      currency: string;
      status: string;
      archived_at: string | null;
      purchase_transaction_id: string | null;
    }>;

  const events: AuditEvent[] = [];

  for (const tx of transactions) {
    const baseTitle = tx.description ?? "Transaction";
    const isReversal =
      tx.reversal_of_id !== null && tx.status === "posted";

    const isVoided = tx.status === "voided";

    const isTuition = tuitionTransactionIds.has(tx.id);

    const happenedAt = tx.transaction_date || tx.created_at;

    if (isReversal) {
      events.push({
        id: `reversal-${tx.id}`,
        happened_at: happenedAt,
        type: "reversal",
        title: `Reversal: ${baseTitle}`,
        description:
          "This entry reverses the financial effect of a previous transaction.",
        related_transaction_id: tx.reversal_of_id ?? undefined,
      });
    } else if (isVoided) {
      events.push({
        id: `void-${tx.id}`,
        happened_at: happenedAt,
        type: "transaction",
        title: `Voided: ${baseTitle}`,
        description:
          "This transaction was voided to correct its financial impact. A reversal transaction preserves the audit trail.",
        related_transaction_id: tx.id,
      });
    } else {
      events.push({
        id: `tx-${tx.id}`,
        happened_at: happenedAt,
        type: isTuition
          ? "tuition_payment"
          : "transaction",
        title: isTuition
          ? `Tuition payment: ${baseTitle}`
          : baseTitle,
        description: isTuition
          ? "Tuition payment recorded (see Tuition section for collection status)."
          : "Financial ledger entry recorded.",
        related_transaction_id: tx.id,
        currency:
          tx.amount_currency ?? undefined,
        amount:
          typeof tx.amount_total === "number"
            ? tx.amount_total
            : undefined,
      });
    }
  }

  for (const asset of longTermAssets) {
    if (!asset.archived_at) continue;

    events.push({
      id: `asset-cancel-${asset.id}`,
      happened_at: asset.archived_at,
      type: "asset_cancelled",
      title: `Asset cancelled: ${asset.name}`,
      description:
        "Cancelling reverses the original purchase transaction through the ledger and archives the asset for auditability.",
      related_asset_id: asset.id,
      related_transaction_id:
        asset.purchase_transaction_id ?? undefined,
      currency: asset.currency,
    });
  }

  // Sort newest first
  events.sort(
    (a, b) =>
      new Date(b.happened_at).getTime() -
      new Date(a.happened_at).getTime(),
  );

  return (
    <div className="audit-log-page">
      <div className="audit-log-container">
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/dashboard"
            className="muted"
            style={{ fontSize: 14 }}
          >
            ← Dashboard
          </Link>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <div>
              <p
                className="muted"
                style={{
                  margin: "0 0 6px",
                  fontSize: 14,
                }}
              >
                Audit Log
              </p>
              <h1 style={{ marginBottom: 6 }}>
                Financial history timeline
              </h1>
              <p className="muted" style={{ margin: 0 }}>
                A chronological view of ledger events (voids, reversals, and cancellations).
              </p>
            </div>
          </div>
        </div>

        {events.length === 0 ? (
          <section
            style={{
              padding: 48,
              border: "1px dashed #cbd5e1",
              borderRadius: 12,
            }}
          >
            <p className="muted" style={{ margin: 0 }}>
              No audit events found.
            </p>
          </section>
        ) : (
          <section>
            <div style={{ display: "grid", gap: 10 }}>
              {events.map((event) => {
                const relatedTx =
                  event.related_transaction_id;

                return (
                  <div
                    key={event.id}
                    className="card"
                    style={{
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          marginBottom: 6,
                        }}
                      >
                        <span className={typeBadgeClass(event.type)} style={{ flexShrink: 0 }}>
                          {event.type.replaceAll("_", " ")}
                        </span>

                        <div style={{ fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {relatedTx ? (
                            <Link
                              href={`/transactions/${relatedTx}`}
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                              }}
                            >
                              {event.title}
                            </Link>
                          ) : (
                            event.title
                          )}
                        </div>
                      </div>

                      <div className="muted" style={{ fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {event.description}
                      </div>

                      <div className="muted" style={{ marginTop: 8, fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {formatDateTimeBD(event.happened_at)}
                      </div>
                    </div>

                    {typeof event.amount === "number" && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <strong style={{ fontSize: 16 }}>
                          {formatMoney(
                            event.amount,
                            event.currency ?? "BDT",
                          )}
                        </strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <style>{`
        .audit-log-page {
          min-height: 100vh;
          background: var(--background);
          padding: 32px 36px 48px;
        }

        .audit-log-container {
          max-width: 1152px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .audit-log-page {
            padding: 28px 24px 40px;
          }
        }

        @media (max-width: 768px) {
          .audit-log-page {
            padding: 24px 16px 40px;
          }
        }

        @media (max-width: 480px) {
          .audit-log-page {
            padding: 20px 12px 36px;
          }
        }
      `}</style>
    </div>
  );
}
