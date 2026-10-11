import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuditLog, type AuditEvent } from "@/lib/finance/get-audit-log";

type Props = {
  searchParams: Promise<{ kind?: string }>;
};

type Kind = "all" | "transaction" | "loan" | "asset" | "tuition";

const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "transaction", label: "Transactions" },
  { value: "loan", label: "Loans" },
  { value: "asset", label: "Assets" },
  { value: "tuition", label: "Tuition" },
];

const EVENT_TYPE_LABELS: Record<AuditEvent["event_type"], string> = {
  posted: "Posted",
  voided: "Voided",
  reversed: "Reversed",
  opening_balance: "Opening Balance",
  loan_created: "Loan Created",
  loan_settled: "Loan Settled",
  loan_cancelled: "Loan Cancelled",
  asset_purchased: "Asset Purchased",
  asset_sold: "Asset Sold",
  asset_cancelled: "Asset Cancelled",
  payment_recorded: "Payment Recorded",
  payment_cancelled: "Payment Cancelled",
};

function getBadgeColor(eventType: AuditEvent["event_type"]): string {
  switch (eventType) {
    case "posted":
    case "loan_created":
    case "loan_settled":
    case "asset_purchased":
    case "payment_recorded":
      return "audit-badge-green";

    case "reversed":
    case "voided":
    case "loan_cancelled":
    case "asset_cancelled":
    case "payment_cancelled":
      return "audit-badge-red";

    case "opening_balance":
    case "asset_sold":
      return "audit-badge-amber";

    default:
      return "audit-badge-neutral";
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function AuditLogPage({ searchParams }: Props) {
  const { kind: kindParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const allEvents = await getAuditLog(supabase, user.id);

  const activeKind: Kind =
    kindParam && KINDS.some((kind) => kind.value === kindParam)
      ? (kindParam as Kind)
      : "all";

  const events =
    activeKind === "all"
      ? allEvents
      : allEvents.filter((event) => event.entity_type === activeKind);

  return (
    <main className="audit-page">
      <header className="audit-header">
        <p className="audit-eyebrow">Activity</p>
        <h1>Audit Log</h1>
        <p className="audit-subtitle">
          A record of important actions across your financial data.
        </p>
      </header>

      <nav className="audit-filters" aria-label="Filter audit events">
        {KINDS.map((kind) => {
          const selected = activeKind === kind.value;
          const href =
            kind.value === "all" ? "/audit" : `/audit?kind=${kind.value}`;

          return (
            <Link
              key={kind.value}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`audit-filter${selected ? " audit-filter-active" : ""}`}
            >
              {kind.label}
            </Link>
          );
        })}
      </nav>

      <section className="audit-events" aria-label="Audit events">
        <div className="audit-list-header">
          <h2>Recent activity</h2>
          <span className="audit-count">
            {events.length} {events.length === 1 ? "event" : "events"}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="audit-empty">
            <span className="audit-empty-icon" aria-hidden="true">
              ✓
            </span>
            <h3>No audit events found</h3>
            <p>Important financial actions will appear here when recorded.</p>
          </div>
        ) : (
          <div className="audit-list">
            {events.map((event) => (
              <Link
                key={event.id}
                href={event.href}
                className="card audit-event"
              >
                <div className="audit-event-top">
                  <span
                    className={`audit-badge ${getBadgeColor(event.event_type)}`}
                  >
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </span>

                  <time className="audit-timestamp" dateTime={event.timestamp}>
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>

                <div className="audit-event-content">
                  <p className="audit-description">{event.description}</p>

                  {event.meta && (
                    <p className="audit-meta">{event.meta}</p>
                  )}
                </div>

                <span className="audit-event-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .audit-page {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          color: var(--foreground);
        }

        .audit-page *,
        .audit-page *::before,
        .audit-page *::after {
          box-sizing: border-box;
        }

        .audit-header {
          width: 100%;
          min-width: 0;
          margin: 0 0 24px;
        }

        .audit-eyebrow {
          margin: 0 0 6px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .audit-header h1 {
          margin: 0;
          font-size: clamp(24px, 4vw, 32px);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .audit-subtitle {
          margin: 8px 0 0;
          max-width: 620px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .audit-filters {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
          margin: 0 0 24px;
          padding: 0 0 16px;
          border-bottom: 1px solid var(--border);
        }

        .audit-filter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          padding: 7px 14px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: transparent;
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.2;
          text-decoration: none;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease;
        }

        .audit-filter:hover {
          color: var(--foreground);
          border-color: var(--muted);
        }

        .audit-filter-active {
          background: var(--foreground);
          color: var(--background);
          border-color: var(--foreground);
        }

        .audit-filter-active:hover {
          color: var(--background);
        }

        .audit-events {
          width: 100%;
          min-width: 0;
        }

        .audit-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 12px;
        }

        .audit-list-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.4;
        }

        .audit-count {
          color: var(--muted);
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }

        .audit-list {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          width: 100%;
          min-width: 0;
        }

        .audit-event {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          grid-template-areas:
            "top top"
            "content arrow";
          align-items: start;
          gap: 12px 16px;
          width: 100%;
          min-width: 0;
          margin: 0;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          color: inherit;
          text-decoration: none;
          overflow-wrap: anywhere;
          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            transform 0.15s ease;
        }

        .audit-event:hover {
          border-color: var(--muted);
          transform: translateY(-1px);
        }

        .audit-event:focus-visible,
        .audit-filter:focus-visible {
          outline: 2px solid var(--foreground);
          outline-offset: 3px;
        }

        .audit-event-top {
          grid-area: top;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px 12px;
          width: 100%;
          min-width: 0;
        }

        .audit-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          max-width: 100%;
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.3;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .audit-badge-green {
          background: #dcfce7;
          color: #166534;
        }

        .audit-badge-red {
          background: #fee2e2;
          color: #b91c1c;
        }

        .audit-badge-amber {
          background: #fef3c7;
          color: #92400e;
        }

        .audit-badge-neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .audit-timestamp {
          display: block;
          max-width: 100%;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .audit-event-content {
          grid-area: content;
          min-width: 0;
          width: 100%;
        }

        .audit-description {
          margin: 0;
          color: var(--foreground);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .audit-meta {
          margin: 5px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .audit-event-arrow {
          grid-area: arrow;
          align-self: center;
          color: var(--muted);
          font-size: 18px;
          line-height: 1;
          transition: transform 0.15s ease;
        }

        .audit-event:hover .audit-event-arrow {
          transform: translateX(2px);
        }

        .audit-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-width: 0;
          min-height: 190px;
          padding: 28px 20px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
        }

        .audit-empty-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          margin-bottom: 12px;
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--muted);
          font-size: 18px;
        }

        .audit-empty h3 {
          margin: 0;
          font-size: 15px;
        }

        .audit-empty p {
          max-width: 360px;
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
        }

        @media (max-width: 600px) {
          .audit-header {
            margin-bottom: 20px;
          }

          .audit-filters {
            gap: 6px;
            margin-bottom: 20px;
            padding-bottom: 14px;
          }

          .audit-filter {
            min-height: 34px;
            padding: 7px 10px;
            font-size: 12px;
          }

          .audit-list {
            gap: 8px;
          }

          .audit-event {
            gap: 10px;
            padding: 13px;
            border-radius: 10px;
          }

          .audit-event-top {
            align-items: flex-start;
          }

          .audit-timestamp {
            text-align: left;
          }

          .audit-description {
            font-size: 13px;
          }

          .audit-meta {
            font-size: 12px;
          }
        }

        @media (max-width: 380px) {
          .audit-filter {
            min-height: 32px;
            padding: 6px 9px;
            font-size: 11px;
          }

          .audit-event {
            grid-template-columns: minmax(0, 1fr) 14px;
            gap: 9px;
            padding: 11px;
          }

          .audit-event-top {
            flex-direction: column;
            gap: 6px;
          }

          .audit-timestamp {
            font-size: 11px;
          }

          .audit-empty {
            padding: 24px 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .audit-event,
          .audit-filter,
          .audit-event-arrow {
            transition: none;
          }

          .audit-event:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}

