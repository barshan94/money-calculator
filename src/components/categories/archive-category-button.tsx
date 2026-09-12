"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
  onArchived: () => void;
};

export function ArchiveCategoryButton({
  categoryId,
  onArchived,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(
      "Archive this category? It will be preserved for existing transactions.",
    );

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase.rpc("archive_category", {
      p_category_id: categoryId,
    });

    if (error) {
      window.alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onArchived();
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={loading}
      className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        backgroundColor: "#d97706",
      }}
    >
      {loading ? "Archiving..." : "Archive"}
    </button>
  );
}