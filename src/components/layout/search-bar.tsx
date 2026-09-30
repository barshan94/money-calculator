"use client";

import { useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // When navigating away from /search, clear the input
  const isSearchPage = pathname === "/search";
  const currentQuery = isSearchPage ? (searchParams.get("q") ?? "") : "";

  // Keyboard shortcut: / or Ctrl+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement).isContentEditable;

      if (isEditable) return;

      if (
        e.key === "/" ||
        (e.key === "k" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <>
      <style>{`
        .mc-topbar-search {
          flex: 1;
          max-width: 400px;
        }

        .mc-topbar-search-form {
          display: flex;
          align-items: center;
          position: relative;
        }

        .mc-topbar-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          font-size: 15px;
          pointer-events: none;
          line-height: 1;
        }

        .mc-topbar-search-input {
          width: 100%;
          height: 36px;
          padding: 0 70px 0 34px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background);
          color: var(--foreground);
          font: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, background 0.15s;
        }

        .mc-topbar-search-input::placeholder {
          color: var(--muted-light);
        }

        .mc-topbar-search-input:focus {
          border-color: var(--primary);
          background: var(--card);
        }

        .mc-topbar-search-hint {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 3px;
          pointer-events: none;
        }

        .mc-topbar-search-kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 18px;
          padding: 0 5px;
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--background);
          color: var(--muted);
          font-size: 10px;
          font-family: inherit;
          line-height: 1;
        }

        .mc-topbar-search-input:focus ~ .mc-topbar-search-hint {
          display: none;
        }

        @media (max-width: 768px) {
          .mc-topbar-search {
            max-width: 180px;
          }

          .mc-topbar-search-hint {
            display: none;
          }

          .mc-topbar-search-input {
            padding-right: 10px;
          }
        }

        @media (max-width: 500px) {
          .mc-topbar-search {
            max-width: 120px;
          }
        }
      `}</style>

      <div className="mc-topbar-search">
        <form
          className="mc-topbar-search-form"
          onSubmit={handleSubmit}
          role="search"
          aria-label="Global search"
        >
          <span className="mc-topbar-search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            ref={inputRef}
            type="search"
            className="mc-topbar-search-input"
            placeholder="Search…"
            defaultValue={currentQuery}
            autoComplete="off"
            aria-label="Search transactions, loans, accounts, students"
          />

          <span className="mc-topbar-search-hint" aria-hidden="true">
            <kbd className="mc-topbar-search-kbd">/</kbd>
          </span>
        </form>
      </div>
    </>
  );
}
