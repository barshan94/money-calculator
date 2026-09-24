"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  recurringId: string;
};

export function ArchiveRecurringButton({
  recurringId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleArchive() {
    const confirmed = window.confirm(
      "Pause this recurring transaction? Existing transaction history will be preserved.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "archive_recurring_transaction",
      {
        p_recurring_id: recurringId,
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/recurring");
    router.refresh();
  }

  return (
    <div className="archive-recurring-wrapper">
      <style>{`
        .archive-recurring-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .archive-recurring-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid #fecaca;
          border-radius: 7px;
          background: #fff;
          color: var(--danger);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            opacity 0.15s ease;
        }

        .archive-recurring-button:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .archive-recurring-button:focus-visible {
          outline: 2px solid var(--danger);
          outline-offset: 2px;
        }

        .archive-recurring-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .archive-recurring-message {
          max-width: 260px;
          margin: 7px 0 0;
          color: var(--danger);
          font-size: 12px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        @media (max-width: 500px) {
          .archive-recurring-wrapper {
            width: 100%;
          }

          .archive-recurring-button {
            width: 100%;
          }

          .archive-recurring-message {
            max-width: none;
          }
        }
      `}</style>

      <button
        type="button"
        className="archive-recurring-button"
        onClick={handleArchive}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Pausing..." : "Pause"}
      </button>

      {message && (
        <p
          className="archive-recurring-message"
          role="alert"
        >
          {message}
        </p>
      )}
    </div>
  );
}

