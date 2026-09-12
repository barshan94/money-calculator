"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const supabase = createClient();

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  async function handleLogout() {
    setOpen(false);

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
        <Link href="/auth/login">Login</Link>
        <Link href="/auth/signup">
          Create Account
        </Link>
      </div>
    );
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <div
      ref={menuRef}
      className="user-menu"
    >
      <button
        type="button"
        className="user-profile-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="user-avatar">
          {initial}
        </span>

        <span className="user-email">
          {email}
        </span>

        <span className="user-chevron">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <span className="user-avatar large">
              {initial}
            </span>

            <div className="user-dropdown-email">
              {email}
            </div>
          </div>

          <div className="user-dropdown-divider" />

          <Link
            href="/auth/change-password"
            onClick={() => setOpen(false)}
          >
            Change Password
          </Link>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}