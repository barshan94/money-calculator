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
    <div>
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "#fff",
          color: "var(--primary)",
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Running..." : "Run Now"}
      </button>

      {message && (
        <p
          style={{
            margin: "8px 0 0",
            color: message.includes("successfully")
              ? "var(--success)"
              : "var(--danger)",
            fontSize: 13,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}