"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  accountId: string;
};

export function UnarchiveAccountButton({
  accountId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUnarchive() {
    const confirmed = window.confirm(
      "Restore this account?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "unarchive_account",
      {
        p_account_id: accountId,
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/accounts");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleUnarchive}
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
        {loading
          ? "Restoring..."
          : "Unarchive"}
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