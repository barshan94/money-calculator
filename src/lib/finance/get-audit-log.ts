import { SupabaseClient } from "@supabase/supabase-js";

export type AuditEvent = {
  id: string;
  entity_type: "transaction" | "loan" | "asset" | "tuition";
  entity_id: string;
  event_type:
    | "posted"
    | "voided"
    | "reversed"
    | "opening_balance"
    | "loan_created"
    | "loan_settled"
    | "loan_cancelled"
    | "asset_purchased"
    | "asset_sold"
    | "asset_cancelled"
    | "payment_recorded"
    | "payment_cancelled";
  description: string;
  timestamp: string;
  href: string;
  meta?: string;
};

export async function getAuditLog(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuditEvent[]> {
  const [
    transactionsResult,
    loansResult,
    assetsResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, description, transaction_type, status, reversal_of_id, loan_id, created_at, transaction_date",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("loans")
      .select(
        "id, person_name, loan_type, status, principal_amount, currency, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("long_term_assets")
      .select(
        "id, name, status, currency, purchase_price, created_at, archived_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),

    supabase
      .from("tuition_payments")
      .select("id, student_id, payment_date, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const events: AuditEvent[] = [];

  // --- Transactions ---
  for (const tx of transactionsResult.data ?? []) {
    // Skip loan-linked transactions — covered by the loans section
    if (tx.loan_id) continue;

    if (tx.reversal_of_id) {
      events.push({
        id: `tx-reversed-${tx.id}`,
        entity_type: "transaction",
        entity_id: tx.id,
        event_type: "reversed",
        description: tx.description
          ? `Transaction reversed: ${tx.description}`
          : "Transaction reversed",
        timestamp: tx.created_at,
        href: `/transactions/${tx.id}`,
      });
    } else if (tx.status === "voided") {
      events.push({
        id: `tx-voided-${tx.id}`,
        entity_type: "transaction",
        entity_id: tx.id,
        event_type: "voided",
        description: tx.description
          ? `Transaction voided: ${tx.description}`
          : "Transaction voided",
        timestamp: tx.created_at,
        href: `/transactions/${tx.id}`,
      });
    } else if (tx.transaction_type === "opening_balance") {
      events.push({
        id: `tx-ob-${tx.id}`,
        entity_type: "transaction",
        entity_id: tx.id,
        event_type: "opening_balance",
        description: "Opening balance recorded",
        timestamp: tx.created_at,
        href: `/transactions/${tx.id}`,
      });
    } else {
      events.push({
        id: `tx-posted-${tx.id}`,
        entity_type: "transaction",
        entity_id: tx.id,
        event_type: "posted",
        description: tx.description ?? "Transaction posted",
        timestamp: tx.created_at,
        href: `/transactions/${tx.id}`,
      });
    }
  }

  // --- Loans ---
  for (const loan of loansResult.data ?? []) {
    const direction = loan.loan_type === "lent" ? "Lent to" : "Borrowed from";
    const amount = `${loan.currency} ${Number(loan.principal_amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;

    events.push({
      id: `loan-created-${loan.id}`,
      entity_type: "loan",
      entity_id: loan.id,
      event_type: "loan_created",
      description: `Loan created: ${direction} ${loan.person_name}`,
      timestamp: loan.created_at,
      href: `/loans/${loan.id}`,
      meta: amount,
    });

    if (loan.status === "settled") {
      events.push({
        id: `loan-settled-${loan.id}`,
        entity_type: "loan",
        entity_id: loan.id,
        event_type: "loan_settled",
        description: `Loan settled: ${loan.person_name}`,
        timestamp: loan.created_at, // no settled_at column — best approximation
        href: `/loans/${loan.id}`,
        meta: amount,
      });
    }

    if (loan.status === "cancelled") {
      events.push({
        id: `loan-cancelled-${loan.id}`,
        entity_type: "loan",
        entity_id: loan.id,
        event_type: "loan_cancelled",
        description: `Loan cancelled: ${loan.person_name}`,
        timestamp: loan.created_at,
        href: `/loans/${loan.id}`,
        meta: amount,
      });
    }
  }

  // --- Long-term assets ---
  for (const asset of assetsResult.data ?? []) {
    const price = `${asset.currency} ${Number(asset.purchase_price).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;

    events.push({
      id: `asset-purchased-${asset.id}`,
      entity_type: "asset",
      entity_id: asset.id,
      event_type: "asset_purchased",
      description: `Asset purchased: ${asset.name}`,
      timestamp: asset.created_at,
      href: `/long-term-assets/${asset.id}`,
      meta: price,
    });

    if (asset.status === "sold") {
      events.push({
        id: `asset-sold-${asset.id}`,
        entity_type: "asset",
        entity_id: asset.id,
        event_type: "asset_sold",
        description: `Asset sold: ${asset.name}`,
        timestamp: asset.archived_at ?? asset.created_at,
        href: `/long-term-assets/${asset.id}`,
        meta: price,
      });
    }

    if (asset.status === "cancelled") {
      events.push({
        id: `asset-cancelled-${asset.id}`,
        entity_type: "asset",
        entity_id: asset.id,
        event_type: "asset_cancelled",
        description: `Asset cancelled: ${asset.name}`,
        timestamp: asset.archived_at ?? asset.created_at,
        href: `/long-term-assets/${asset.id}`,
        meta: price,
      });
    }
  }

  // --- Tuition payments ---
  for (const payment of paymentsResult.data ?? []) {
    if (payment.status === "cancelled") {
      events.push({
        id: `tuition-cancelled-${payment.id}`,
        entity_type: "tuition",
        entity_id: payment.id,
        event_type: "payment_cancelled",
        description: "Tuition payment cancelled",
        timestamp: payment.created_at,
        href: `/tuition`,
      });
    } else {
      events.push({
        id: `tuition-recorded-${payment.id}`,
        entity_type: "tuition",
        entity_id: payment.id,
        event_type: "payment_recorded",
        description: "Tuition payment recorded",
        timestamp: payment.created_at ?? payment.payment_date,
        href: `/tuition`,
      });
    }
  }

  // Sort all events by timestamp descending, take top 200
  events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return events.slice(0, 200);
}
