"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  categoryId: string;
  initialName: string;
  initialType: "income" | "expense";
  onChanged: () => void | Promise<void>;
};

export function EditCategoryButton({
  categoryId,
  initialName,
  onChanged,
  initialType,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function openModal() {
    if (saving) return;

    setName(initialName);
    setType(initialType);
    setError("");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setError("");
    // Restore focus to the trigger button
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        closeModal();
        return;
      }

      // Focus trap: cycle Tab/Shift+Tab within the dialog
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        const elements = Array.from(focusable);
        if (elements.length === 0) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving]);

  async function handleSave() {
    if (saving) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Category name cannot exceed 100 characters.");
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
    await onChanged();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        disabled={saving}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: "var(--primary)" }}
      >
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-category-title-${categoryId}`}
          >
            <h2
              id={`edit-category-title-${categoryId}`}
              className="text-lg font-semibold text-[var(--foreground)]"
            >
              Edit Category
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor={`edit-category-name-${categoryId}`}
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Category name
                </label>

                <input
                  id={`edit-category-name-${categoryId}`}
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  disabled={saving}
                  autoFocus
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-category-type-${categoryId}`}
                  className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
                >
                  Type
                </label>

                <select
                  id={`edit-category-type-${categoryId}`}
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as "income" | "expense",
                    )
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-[var(--danger)]"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
