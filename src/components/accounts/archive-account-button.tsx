"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  accountId: string;
};

export function ArchiveAccountButton({
  accountId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();


  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleArchive() {
    const confirmed = window.confirm(
      "Archive this account? Existing transactions will be preserved, but the account will no longer be available for new transactions.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "archive_account",
      {
        p_account_id: accountId,
      },
    );

    if (error) {
      setMessage(
        `Archive failed: ${error.message}`,
      );
      setLoading(false);
      return;
    }

    router.push("/accounts");
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleArchive}
        disabled={loading}
        style={{
          padding: "8px 11px",
          border: "1px solid var(--border)",
          borderRadius: 7,
          background: "var(--card)",
          color: "var(--foreground)",
          fontWeight: 600,
          fontSize: 13,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Archiving..." : "Archive"}
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
