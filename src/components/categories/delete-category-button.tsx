"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
  onDeleted: () => void;
};

export function DeleteCategoryButton({
  categoryId,
  onDeleted,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
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

    setLoading(false);
    onDeleted();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        backgroundColor: "var(--danger)",
      }}
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}