"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
};

export function DeleteCategoryButton({
  categoryId,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (loading) return;

    const confirmed = window.confirm(
      "Delete this category permanently? This is only allowed if the category has never been used in a transaction.",
    );

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase.rpc("delete_category", {
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
      onClick={handleDelete}
      disabled={loading}
      aria-busy={loading}
      className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ backgroundColor: "var(--danger)" }}
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}