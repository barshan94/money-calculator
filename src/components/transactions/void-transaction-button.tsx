"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  transactionId: string;
};

export function VoidTransactionButton({
  transactionId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleVoid() {
    const confirmed = window.confirm(
      "Cancel this transaction? Its financial effect will be reversed.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "void_transaction",
      {
        p_transaction_id: transactionId,
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Transaction cancelled successfully.",
    );

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleVoid}
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
        {loading
          ? "Cancelling..."
          : "Cancel Transaction"}
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