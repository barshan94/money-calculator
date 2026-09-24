"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function ProcessDueButton() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleProcess() {
    const confirmed = window.confirm(
      "Process all recurring transactions that are currently due?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "process_due_recurring_transactions",
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      data === 0
        ? "No recurring transactions are due."
        : `${data} recurring transaction(s) processed successfully.`,
    );

    setLoading(false);
    router.refresh();
  }

  const success =
    message.includes("successfully") ||
    message === "No recurring transactions are due.";

  return (
    <div className="process-due-wrapper">
      <style>{`
        .process-due-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .process-due-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #fff;
          color: var(--foreground);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            opacity 0.15s ease;
        }

        .process-due-button:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .process-due-button:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .process-due-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .process-due-message {
          max-width: 260px;
          margin: 7px 0 0;
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .process-due-success {
          color: var(--success);
        }

        .process-due-error {
          color: var(--danger);
        }

        @media (max-width: 500px) {
          .process-due-wrapper {
            width: 100%;
          }

          .process-due-button {
            width: 100%;
          }

          .process-due-message {
            max-width: none;
          }
        }
      `}</style>

      <button
        type="button"
        className="process-due-button"
        onClick={handleProcess}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Processing..." : "Process Due"}
      </button>

      {message && (
        <p
          className={`process-due-message ${
            success
              ? "process-due-success"
              : "process-due-error"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}

