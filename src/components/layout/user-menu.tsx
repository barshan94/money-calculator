"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();

  const menuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef =
    useRef<HTMLButtonElement>(null);

  const menuId = useId();

  const [email, setEmail] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      setEmail(user?.email ?? null);
      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);

        window.requestAnimationFrame(() => {
          profileButtonRef.current?.focus();
        });
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);

    await supabase.auth.signOut();

    router.push("/auth/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div
        className="user-menu"
        aria-label="Loading user account"
      >
        <span
          className="user-avatar"
          aria-hidden="true"
        >
          …
        </span>
      </div>
    );
  }

  if (!email) {
    return (
      <div
        className="user-menu"
        aria-label="Authentication"
      >
        <Link href="/auth/login">
          Login
        </Link>

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
        ref={profileButtonRef}
        type="button"
        className="user-profile-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Account menu for ${email}`}
      >
        <span
          className="user-avatar"
          aria-hidden="true"
        >
          {initial}
        </span>

        <span className="user-email">
          {email}
        </span>

        <span
          className="user-chevron"
          aria-hidden="true"
        >
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          className="user-dropdown"
          role="menu"
          aria-label="Account menu"
        >
          <div className="user-dropdown-header">
            <span
              className="user-avatar large"
              aria-hidden="true"
            >
              {initial}
            </span>

            <div className="user-dropdown-email">
              {email}
            </div>
          </div>

          <div
            className="user-dropdown-divider"
            role="separator"
          />

          <Link
            href="/auth/change-password"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Change Password
          </Link>

          <button
            type="button"
            className="logout-button"
            role="menuitem"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

