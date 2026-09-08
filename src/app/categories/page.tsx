"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  category_type: "income" | "expense";
  is_archived: boolean;
};

export default function CategoriesPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] =
    useState<"income" | "expense">("expense");
  const [message, setMessage] = useState("");

 
  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
        return;
      }

      setCategories(data ?? []);
    }

    void fetchCategories();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleCreateCategory(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const { error } = await supabase.rpc(
      "create_category",
      {
        p_name: name,
        p_category_type: categoryType,
      },
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setName("");
    setMessage("Category created.");

    const { data, error: loadError } = await supabase
      .from("categories")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: true });

    if (loadError) {
      setMessage(loadError.message);
      return;
    }

    setCategories(data ?? []);
  }

  return (
    <main>
      <h1>Categories</h1>

      <form onSubmit={handleCreateCategory}>
        <input
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
        />

        <select
          value={categoryType}
          onChange={(event) =>
            setCategoryType(
              event.target.value as "income" | "expense",
            )
          }
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <button type="submit">
          Create Category
        </button>
      </form>

      {message && <p>{message}</p>}

      <h2>Your Categories</h2>

      {categories.length === 0 ? (
        <p>No categories yet.</p>
      ) : (
        <ul>
          {categories.map((category) => (
            <li key={category.id}>
              {category.name} — {category.category_type}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}