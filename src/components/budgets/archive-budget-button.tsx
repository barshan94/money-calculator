"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  budgetId: string;
};

export function ArchiveBudgetButton({
  budgetId,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleArchive() {
    const confirmed = window.confirm(
      "Archive this budget? Its existing spending history will be preserved, but the budget will no longer be active.",
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "archive_budget",
      {
        p_budget_id: budgetId,
      },
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/budgets");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleArchive}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--danger)] px-3.5 py-2 text-sm font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Archiving..." : "Archive Budget"}
      </button>

      {message && (
        <p
          role="alert"
          aria-live="polite"
          className="max-w-xs text-xs leading-5 text-[var(--danger)]"
        >
          {message}
        </p>
      )}
    </div>
  );
}

