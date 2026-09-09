"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);
      setLoading(false);
    }

    loadUser();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (loading) {
    return null;
  }

  if (!email) {
    return (
      <div className="user-menu">
        <a href="/auth/login">Login</a>
        <a href="/auth/signup">
          Create Account
        </a>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <span>{email}</span>

      <a href="/auth/change-password">
        Change Password
      </a>

      <button
        type="button"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}