"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
};

export function ArchiveCategoryButton({
  categoryId,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    if (loading) return;

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

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={loading}
      aria-busy={loading}
      className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ backgroundColor: "#d97706" }}
    >
      {loading ? "Archiving..." : "Archive"}
    </button>
  );
}