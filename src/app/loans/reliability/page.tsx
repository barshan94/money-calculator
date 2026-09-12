import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LoanReliability = {
  person_name: string;
  total_loans: number;
  on_time_loans: number;
  late_loans: number;
  average_days_late: number | null;
  reliability_score: number | null;
  reliability_rating: string | null;
};

function reliabilityBadgeClass(
  rating: string | null,
) {
  if (
    rating === "Excellent" ||
    rating === "Reliable"
  ) {
    return "badge-success";
  }

  if (rating === "Sometimes late") {
    return "badge-warning";
  }

  if (rating === null) {
    return "";
  }

  return "badge-danger";
}

export default async function LoanReliabilityPage() {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_loan_reliability",
  );

  const reliability: LoanReliability[] =
    error
      ? []
      : ((data as LoanReliability[]) ?? []);

  const scoredPeople = reliability.filter(
    (item) =>
      item.reliability_score !== null,
  );

  const averageScore =
    scoredPeople.length === 0
      ? null
      : Math.round(
          scoredPeople.reduce(
            (sum, item) =>
              sum +
              Number(
                item.reliability_score,
              ),
            0,
          ) / scoredPeople.length,
        );

  return (
    <main>
      <div className="reliability-header">
        <div>
          <Link
            href="/loans"
            className="back-link"
          >
            ← Loans
          </Link>

          <p className="reliability-eyebrow">
            Repayment analysis
          </p>

          <h1>Loan Reliability</h1>

          <p className="reliability-subtitle">
            Reliability based on repayment timing
            against saved due dates.
          </p>
        </div>
      </div>

      <section className="reliability-summary">
        <div>
          <span>People tracked</span>
          <strong>
            {reliability.length}
          </strong>
        </div>

        <div>
          <span>Scored</span>
          <strong>
            {scoredPeople.length}
          </strong>
        </div>

        <div>
          <span>Average score</span>
          <strong>
            {averageScore === null
              ? "—"
              : `${averageScore}/100`}
          </strong>
        </div>
      </section>

      <section className="reliability-section">
        {reliability.length === 0 ? (
          <div className="reliability-empty">
            No loan reliability data available yet.
          </div>
        ) : (
          <div className="loan-table-wrapper">
            <table className="loan-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Person</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Total Loans</th>
                  <th>On Time</th>
                  <th>Late</th>
                  <th>Avg. Days Late</th>
                </tr>
              </thead>

              <tbody>
                {reliability.map(
                  (item, index) => (
                    <tr
                      key={item.person_name}
                    >
                      <td>
                        <strong>
                          #{index + 1}
                        </strong>
                      </td>

                      <td>
                        <span className="loan-table-person">
                          {item.person_name}
                        </span>
                      </td>

                      <td>
                        {item.reliability_score ===
                        null
                          ? "—"
                          : `${item.reliability_score}/100`}
                      </td>

                      <td>
                        <span
                          className={reliabilityBadgeClass(
                            item.reliability_rating,
                          )}
                        >
                          {item.reliability_rating ??
                            "Pending"}
                        </span>
                      </td>

                      <td>
                        {item.total_loans}
                      </td>

                      <td>
                        {item.on_time_loans}
                      </td>

                      <td>
                        {item.late_loans}
                      </td>

                      <td>
                        {item.average_days_late ===
                        null
                          ? "—"
                          : `${item.average_days_late} days`}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`
        .reliability-header {
          margin-bottom: 28px;
        }

        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .reliability-eyebrow {
          margin: 0 0 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--muted);
        }

        .reliability-header h1 {
          margin: 0;
        }

        .reliability-subtitle {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .reliability-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }

        .reliability-summary > div {
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--card);
        }

        .reliability-summary span {
          display: block;
          margin-bottom: 7px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
        }

        .reliability-summary strong {
          font-size: 24px;
        }

        .reliability-section {
          margin-top: 0;
        }

        .reliability-empty {
          padding: 28px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          text-align: center;
          color: var(--muted);
        }

        .loan-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .loan-table {
          width: 100%;
          min-width: 900px;
          table-layout: fixed;
          border-collapse: collapse;
        }

        .loan-table th,
        .loan-table td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
          text-align: left;
          font-size: 11px;
          white-space: nowrap;
        }

        .loan-table th {
          background: var(--muted-background);
          color: var(--muted);
          font-weight: 700;
        }

        .loan-table th:nth-child(1),
        .loan-table td:nth-child(1) {
          width: 8%;
        }

        .loan-table th:nth-child(2),
        .loan-table td:nth-child(2) {
          width: 22%;
        }

        .loan-table th:nth-child(3),
        .loan-table td:nth-child(3) {
          width: 11%;
        }

        .loan-table th:nth-child(4),
        .loan-table td:nth-child(4) {
          width: 16%;
        }

        .loan-table th:nth-child(5),
        .loan-table td:nth-child(5) {
          width: 12%;
        }

        .loan-table th:nth-child(6),
        .loan-table td:nth-child(6) {
          width: 10%;
        }

        .loan-table th:nth-child(7),
        .loan-table td:nth-child(7) {
          width: 8%;
        }

        .loan-table th:nth-child(8),
        .loan-table td:nth-child(8) {
          width: 13%;
        }

        .loan-table tr:last-child td {
          border-bottom: 0;
        }

        .loan-table-person {
          color: var(--foreground);
          font-weight: 700;
        }

        .loan-table td strong {
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .reliability-summary {
            grid-template-columns: 1fr;
          }

          .loan-table {
            min-width: 900px;
            table-layout: fixed;
          }
        }
      `}</style>
    </main>
  );
}