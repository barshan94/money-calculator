import Link from "next/link";
import { globalSearch, SearchResultKind } from "@/lib/finance/search";

type SearchParams = {
  q?: string;
  kind?: string;
};

const KIND_LABELS: Record<SearchResultKind, string> = {
  transaction: "Transactions",
  loan: "Loans",
  account: "Accounts",
  student: "Students",
};

const KIND_ICONS: Record<SearchResultKind, string> = {
  transaction: "↔",
  loan: "↗",
  account: "◫",
  student: "🎓",
};

const ALL_KINDS: SearchResultKind[] = [
  "account",
  "transaction",
  "loan",
  "student",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q = "", kind = "all" } = await searchParams;

  const query = q.trim();

  const { results, counts } = query
    ? await globalSearch(query)
    : {
        results: [],
        counts: {
          transaction: 0,
          loan: 0,
          account: 0,
          student: 0,
        },
      };

  const totalCount = results.length;

  const filteredResults =
    kind === "all"
      ? results
      : results.filter((r) => r.kind === kind);

  return (
    <>
      <style>{`
        /* =====================================================
           SEARCH PAGE
        ===================================================== */

        .mc-search-header {
          margin-bottom: 28px;
        }

        .mc-search-form {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-top: 20px;
        }

        .mc-search-input-wrap {
          flex: 1;
          position: relative;
          max-width: 560px;
        }

        .mc-search-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          font-size: 16px;
          pointer-events: none;
        }

        .mc-search-input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 40px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          color: var(--foreground);
          font: inherit;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }

        .mc-search-input:focus {
          border-color: var(--primary);
        }

        .mc-search-submit {
          height: 44px;
          padding: 0 20px;
          border: 0;
          border-radius: 10px;
          background: var(--primary);
          color: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .mc-search-submit:hover {
          background: var(--primary-hover);
        }

        /* ── kind tabs ─────────────────────────────────── */

        .mc-search-tabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .mc-search-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--muted);
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.12s;
        }

        .mc-search-tab:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .mc-search-tab[aria-current="true"] {
          border-color: var(--primary);
          background: var(--primary);
          color: #fff;
        }

        .mc-search-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 18px;
          padding: 0 5px;
          border-radius: 10px;
          background: rgb(255 255 255 / 25%);
          font-size: 11px;
          font-weight: 700;
        }

        .mc-search-tab:not([aria-current="true"]) .mc-search-tab-count {
          background: var(--border);
          color: var(--muted);
        }

        /* ── result list ───────────────────────────────── */

        .mc-search-results {
          display: grid;
          gap: 8px;
        }

        .mc-search-result {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--card);
          text-decoration: none;
          color: var(--foreground);
          transition: border-color 0.12s, box-shadow 0.12s;
        }

        .mc-search-result:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .mc-search-result-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: var(--primary-soft);
          font-size: 16px;
          flex-shrink: 0;
        }

        .mc-search-result-body {
          flex: 1;
          min-width: 0;
        }

        .mc-search-result-title {
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mc-search-result-subtitle {
          font-size: 13px;
          color: var(--muted);
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mc-search-result-meta {
          font-size: 11px;
          color: var(--muted);
          background: var(--border-light);
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
          flex-shrink: 0;
          text-transform: capitalize;
        }

        .mc-search-empty {
          padding: 40px 0;
          text-align: center;
          color: var(--muted);
        }

        .mc-search-empty-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        .mc-search-empty h2 {
          margin: 0 0 8px;
          font-size: 18px;
          color: var(--foreground);
        }

        .mc-search-empty p {
          margin: 0;
          font-size: 14px;
        }

        @media (max-width: 600px) {
          .mc-search-form {
            flex-direction: column;
            align-items: stretch;
          }

          .mc-search-input-wrap {
            max-width: 100%;
          }
        }
      `}</style>

      <div>
        {/* Header */}
        <div className="mc-search-header">
          <p
            className="muted"
            style={{ margin: "0 0 6px", fontSize: 14 }}
          >
            Search across your financial data
          </p>

          <h1 style={{ marginBottom: 0 }}>
            {query ? `Results for "${query}"` : "Search"}
          </h1>

          {/* Search form */}
          <form method="GET" action="/search" className="mc-search-form">
            <div className="mc-search-input-wrap">
              <span className="mc-search-icon" aria-hidden="true">
                ⌕
              </span>

              <input
                type="search"
                name="q"
                className="mc-search-input"
                defaultValue={query}
                placeholder="Search transactions, loans, accounts, students…"
                autoFocus={!query}
                autoComplete="off"
                aria-label="Search query"
              />
            </div>

            <button type="submit" className="mc-search-submit">
              Search
            </button>
          </form>
        </div>

        {query && (
          <>
            {/* Kind tabs */}
            <div className="mc-search-tabs" role="tablist" aria-label="Filter by type">
              <Link
                href={`/search?q=${encodeURIComponent(query)}&kind=all`}
                className="mc-search-tab"
                aria-current={kind === "all" ? "true" : undefined}
              >
                All

                <span className="mc-search-tab-count">
                  {totalCount}
                </span>
              </Link>

              {ALL_KINDS.map((k) => (
                counts[k] > 0 && (
                  <Link
                    key={k}
                    href={`/search?q=${encodeURIComponent(query)}&kind=${k}`}
                    className="mc-search-tab"
                    aria-current={kind === k ? "true" : undefined}
                  >
                    <span aria-hidden="true">{KIND_ICONS[k]}</span>

                    {KIND_LABELS[k]}

                    <span className="mc-search-tab-count">
                      {counts[k]}
                    </span>
                  </Link>
                )
              ))}
            </div>

            {/* Results */}
            {filteredResults.length === 0 ? (
              <div className="mc-search-empty" role="status">
                <div className="mc-search-empty-icon" aria-hidden="true">
                  ⌕
                </div>

                <h2>No results found</h2>

                <p>
                  {kind !== "all"
                    ? `No ${KIND_LABELS[kind as SearchResultKind]?.toLowerCase()} match "${query}".`
                    : `Nothing matches "${query}". Try a different search term.`}
                </p>
              </div>
            ) : (
              <div
                className="mc-search-results"
                role="list"
                aria-label={`${filteredResults.length} search result${filteredResults.length === 1 ? "" : "s"}`}
              >
                {filteredResults.map((result) => (
                  <Link
                    key={`${result.kind}-${result.id}`}
                    href={result.href}
                    className="mc-search-result"
                    role="listitem"
                  >
                    <div
                      className="mc-search-result-icon"
                      aria-hidden="true"
                    >
                      {KIND_ICONS[result.kind]}
                    </div>

                    <div className="mc-search-result-body">
                      <div className="mc-search-result-title">
                        {result.title}
                      </div>

                      <div className="mc-search-result-subtitle">
                        {result.subtitle}
                      </div>
                    </div>

                    <div className="mc-search-result-meta">
                      {result.meta}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {!query && (
          <div className="mc-search-empty">
            <div className="mc-search-empty-icon" aria-hidden="true">
              ⌕
            </div>

            <h2>What are you looking for?</h2>

            <p>
              Search transactions by description, loans by person name,
              accounts by name, or students by name.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
