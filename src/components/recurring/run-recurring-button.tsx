"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  recurringId: string;
};

export function RunRecurringButton({
  recurringId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRun() {
    const confirmed = window.confirm(
      "Run this recurring transaction now?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "run_recurring_transaction",
      {
        p_recurring_id: recurringId,
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Recurring transaction processed successfully.",
    );

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="run-recurring-wrapper">
      <style>{`
        .run-recurring-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .run-recurring-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: #fff;
          color: var(--primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            opacity 0.15s ease;
        }

        .run-recurring-button:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .run-recurring-button:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        .run-recurring-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .run-recurring-message {
          max-width: 260px;
          margin: 7px 0 0;
          color: var(--success);
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .run-recurring-error {
          color: var(--danger);
        }

        @media (max-width: 500px) {
          .run-recurring-wrapper {
            width: 100%;
          }

          .run-recurring-button {
            width: 100%;
          }

          .run-recurring-message {
            max-width: none;
          }
        }
      `}</style>

      <button
        type="button"
        className="run-recurring-button"
        onClick={handleRun}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Running..." : "Run Now"}
      </button>

      {message && (
        <p
          className={`run-recurring-message ${
            message.includes("successfully")
              ? ""
              : "run-recurring-error"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}

