"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { SearchResponse } from "@/app/api/search/route";

type SearchResultItem = SearchResponse["results"][number];

const TYPE_ICON: Record<SearchResultItem["type"], string> = {
  transaction: "💸",
  loan: "🤝",
  account: "🏦",
  student: "🎓",
  deposit: "🏧",
  investment: "📈",
  asset: "🏠",
};

const TYPE_LABEL: Record<SearchResultItem["type"], string> = {
  transaction: "Transaction",
  loan: "Loan",
  account: "Account",
  student: "Student",
  deposit: "Deposit",
  investment: "Investment",
  asset: "Asset",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export function GlobalSearch() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const inputId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 220);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setFetchError(null);
    setPartial(false);
    setActiveIndex(-1);
    setLoading(false);
    abortControllerRef.current?.abort();
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K to open
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "k"
      ) {
        event.preventDefault();

        if (open) {
          close();
        } else {
          setQuery("");
          setResults([]);
          setFetchError(null);
          setPartial(false);
          setActiveIndex(-1);
          setOpen(true);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () =>
      document.removeEventListener("keydown", handleKeyDown);
  }, [close, open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      window.requestAnimationFrame(() =>
        inputRef.current?.focus(),
      );
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setFetchError(null);
      setPartial(false);
      setLoading(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setFetchError(null);
    setPartial(false);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (controller.signal.aborted) return;
        const data: SearchResponse = await res.json();
        if (controller.signal.aborted) return;

        setResults(data.results ?? []);
        setPartial(data.partial ?? false);
        if (res.status === 502) {
          setFetchError(
            "Some search categories failed to load. Results may be incomplete.",
          );
        } else if (!res.ok) {
          setFetchError("Search request failed. Please try again.");
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setResults([]);
        setFetchError("Search request failed. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  function navigate(url: string) {
    close();
    router.push(url);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) =>
        Math.min(i + 1, results.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        navigate(results[activeIndex].url);
      }
    } else if (event.key === "Escape") {
      close();
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;

    const item = listRef.current.children[
      activeIndex
    ] as HTMLElement | undefined;

    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const showResultsList = query.length >= 2;

  return (
    <>
      {/* Trigger button — rendered in topbar by parent */}
      <button
        type="button"
        className="search-trigger"
        onClick={() => {
          setQuery("");
          setResults([]);
          setFetchError(null);
          setPartial(false);
          setActiveIndex(-1);
          setOpen(true);
        }}
        aria-label="Search (Ctrl+K)"
        title="Search (Ctrl+K)"
      >
        <span className="search-trigger-icon" aria-hidden="true">
          🔍
        </span>
        <span className="search-trigger-text">Search…</span>
        <kbd className="search-trigger-kbd">Ctrl K</kbd>
      </button>

      {/* Modal dialog */}
      <dialog
        ref={dialogRef}
        className="search-dialog"
        aria-label="Global search"
        onClose={close}
        onClick={(e) => {
          // Click backdrop to close
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="search-box">
          {/* Input row */}
          <div className="search-input-row">
            <span
              className="search-input-icon"
              aria-hidden="true"
            >
              🔍
            </span>

            <input
              ref={inputRef}
              id={inputId}
              type="search"
              className="search-input"
              placeholder="Search transactions, loans, accounts…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLoading(e.target.value.trim().length >= 2);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search query"
              aria-autocomplete="list"
              aria-controls="search-results-list"
              aria-activedescendant={
                activeIndex >= 0
                  ? `search-result-${activeIndex}`
                  : undefined
              }
            />

            {loading && (
              <span
                className="search-spinner"
                aria-label="Searching"
              />
            )}

            <button
              type="button"
              className="search-close-btn"
              onClick={close}
              aria-label="Close search"
            >
              <kbd>Esc</kbd>
            </button>
          </div>

          {/* Error/partial banner */}
          {(fetchError || partial) && (
            <div
              className="search-status-banner"
              role="status"
              aria-live="polite"
            >
              {fetchError ?? "Some results may be incomplete."}
            </div>
          )}

          {/* Results */}
          {showResultsList && (
            <ul
              id="search-results-list"
              ref={listRef}
              className="search-results"
              role="listbox"
              aria-label="Search results"
            >
              {results.length === 0 && !loading && (
                <li className="search-empty" role="option" aria-selected="false">
                  No results for &ldquo;{query}&rdquo;
                </li>
              )}

              {results.map((item, index) => (
                <li
                  key={`${item.type}-${item.id}`}
                  id={`search-result-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search-result-item${index === activeIndex ? " active" : ""}`}
                  onClick={() => navigate(item.url)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span
                    className="search-result-icon"
                    aria-hidden="true"
                  >
                    {TYPE_ICON[item.type]}
                  </span>

                  <span className="search-result-body">
                    <span className="search-result-label">
                      {item.label}
                    </span>

                    {item.sublabel && (
                      <span className="search-result-sublabel">
                        {item.sublabel}
                      </span>
                    )}
                  </span>

                  <span className="search-result-type">
                    {TYPE_LABEL[item.type]}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Footer hint */}
          <div className="search-footer" aria-hidden="true">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>Esc close</span>
          </div>
        </div>
      </dialog>
    </>
  );
}