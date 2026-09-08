"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Props = {
  goalId: string;
};

export default function CancelGoalButton({
  goalId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCancel() {
    const confirmed = window.confirm(
      "Cancel this goal? Its progress will be preserved, but the goal will no longer be active.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "cancel_goal",
      {
        p_goal_id: goalId,
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/goals");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
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
        {loading ? "Cancelling..." : "Cancel Goal"}
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