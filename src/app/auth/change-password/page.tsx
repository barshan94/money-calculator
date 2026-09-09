"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Password changed successfully.",
    );

    setPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main>
      <h1>Change Password</h1>

      <form onSubmit={handleChangePassword}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          minLength={6}
          required
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value,
            )
          }
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Changing..."
            : "Change Password"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}