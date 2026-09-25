"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
  onChanged: () => void | Promise<void>;
};

export function ArchiveCategoryButton({
  categoryId,
  onChanged,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleArchive() {
    if (loading) return;

    const confirmed = window.confirm(
      "Archive this category? It will be preserved for existing transactions but will no longer be available for new transactions.",
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    const { error } = await supabase.rpc("archive_category", {
      p_category_id: categoryId,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await onChanged();
    setLoading(false);
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={handleArchive}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[var(--danger)] px-3 py-2 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Archiving..." : "Archive"}
      </button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="text-xs leading-5 text-[var(--danger)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
