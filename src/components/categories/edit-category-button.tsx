"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
  initialName: string;
  initialType: "income" | "expense";
  onUpdated: () => void;
};

export function EditCategoryButton({
  categoryId,
  initialName,
  initialType,
  onUpdated,
}: Props) {
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setName(initialName);
    setType(initialType);
    setError("");
    setOpen(true);
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase.rpc("update_category", {
      p_category_id: categoryId,
      p_name: trimmedName,
      p_category_type: type,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setOpen(false);
    setSaving(false);
    onUpdated();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
        style={{
          backgroundColor: "var(--primary)",
        }}
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Edit Category
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Category name
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as "income" | "expense",
                    )
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {error && (
                <p className="text-sm text-[var(--danger)]">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--primary)",
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}