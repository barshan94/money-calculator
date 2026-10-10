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

function getBadgeColor(event_type: AuditEvent["event_type"]): string {
  switch (event_type) {
    case "posted":
    case "loan_created":
    case "loan_settled":
    case "asset_purchased":
    case "payment_recorded":
      return "badge-green";
    case "reversed":
    case "voided":
    case "loan_cancelled":
    case "asset_cancelled":
    case "payment_cancelled":
      return "badge-red";
    case "opening_balance":
    case "asset_sold":
      return "badge-amber";
    default:
      return "badge-neutral";
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-BD", {
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
    kindParam && KINDS.some((k) => k.value === kindParam)
      ? (kindParam as Kind)
      : "all";

  const events =
    activeKind === "all"
      ? allEvents
      : allEvents.filter((e) => e.entity_type === activeKind);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p className="muted" style={{ margin: "0 0 6px", fontSize: 14 }}>
          Activity
        </p>

        <h1 style={{ marginBottom: 6 }}>Audit Log</h1>

        <p className="muted" style={{ margin: 0 }}>
          A record of important actions across your financial data
        </p>
      </div>

      {/* Kind filter tabs */}
      <div className="kind-tabs" role="tablist" aria-label="Filter by type">
        {KINDS.map((k) => (
          <Link
            key={k.value}
            href={k.value === "all" ? "/audit" : `/audit?kind=${k.value}`}
            role="tab"
            aria-selected={activeKind === k.value}
            className={
              activeKind === k.value ? "kind-tab kind-tab-active" : "kind-tab"
            }
          >
            {k.label}
          </Link>
        ))}
      </div>

      {/* Count */}
      <p
        className="muted"
        style={{ margin: "0 0 16px", fontSize: 13 }}
      >
        {events.length === 0
          ? "No events"
          : `${events.length} event${events.length === 1 ? "" : "s"}`}
      </p>

      {/* Event list */}
      {events.length === 0 ? (
        <div
          style={{
            padding: "32px 24px",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          No audit events found.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              className="card audit-row"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={`badge ${getBadgeColor(event.event_type)}`}>
                  {EVENT_TYPE_LABELS[event.event_type]}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {event.description}
                  </p>

                  {event.meta && (
                    <p
                      className="muted"
                      style={{ margin: "2px 0 0", fontSize: 13 }}
                    >
                      {event.meta}
                    </p>
                  )}
                </div>

                <p
                  className="muted"
                  style={{
                    margin: 0,
                    fontSize: 12,
                    flexShrink: 0,
                    textAlign: "right",
                  }}
                >
                  {formatTimestamp(event.timestamp)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .kind-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .kind-tab {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          color: var(--muted);
          background: transparent;
          transition: background 0.1s, color 0.1s;
        }

        .kind-tab:hover {
          color: var(--foreground);
        }

        .kind-tab-active {
          background: var(--foreground);
          color: var(--background);
          border-color: var(--foreground);
        }

        .audit-row {
          display: block;
          padding: 14px 16px;
        }

        .audit-row:hover {
          opacity: 0.85;
        }

        .badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .badge-green {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-red {
          background: #fee2e2;
          color: #dc2626;
        }

        .badge-amber {
          background: #fef3c7;
          color: #b45309;
        }

        .badge-neutral {
          background: #f1f5f9;
          color: var(--muted);
        }

        @media (max-width: 760px) {
          .kind-tabs {
            gap: 4px;
          }

          .kind-tab {
            padding: 5px 10px;
            font-size: 12px;
          }
        }

        @media (max-width: 600px) {
          .audit-row {
            padding: 12px;
          }

          .audit-row > div {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .audit-row .badge {
            align-self: flex-start;
          }

          .audit-row > div > div:last-child {
            width: 100%;
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .audit-row {
            padding: 10px 8px;
          }

          .kind-tab {
            padding: 4px 8px;
            font-size: 11px;
          }

          .badge {
            padding: 2px 6px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
