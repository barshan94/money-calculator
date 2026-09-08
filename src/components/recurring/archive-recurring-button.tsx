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
    <div>
      <button
        type="button"
        onClick={handleArchive}
        disabled={loading}
        style={{
          padding: "10px 14px",
          border: "1px solid #fecaca",
          borderRadius: 8,
          background: "#fff",
          color: "var(--danger)",
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Pausing..." : "Pause"}
      </button>

      {message && (
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--danger)",
            fontSize: 13,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}