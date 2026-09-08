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

  return (
    <div>
      <button
        type="button"
        onClick={handleProcess}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "#fff",
          color: "var(--foreground)",
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Processing..." : "Process Due"}
      </button>

      {message && (
        <p
          style={{
            margin: "8px 0 0",
            color: message.includes("successfully")
              ? "var(--success)"
              : "var(--muted)",
            fontSize: 13,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}