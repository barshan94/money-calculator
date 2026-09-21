"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword() {
    setMessage("");

    if (!email.trim()) {
      setMessage(
        "Enter your email address first.",
      );
      return;
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        },
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Password reset email sent. Check your inbox.",
    );
  }

  return (
    <main>
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <label htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          required
        />

        <label htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          required
        />

        <button type="submit">
          Login
        </button>
      </form>

      <p>
        <button
          type="button"
          onClick={handleForgotPassword}
          style={{
            padding: 0,
            border: "none",
            background: "none",
            color: "var(--primary)",
            cursor: "pointer",
            boxShadow: "none",
          }}
        >
          Forgot password?
        </button>
      </p>

      {message && <p role="alert">{message}</p>}

      <p>
        Don't have an account?{" "}
        <a href="/auth/signup">
          Create Account
        </a>
      </p>
    </main>
  );
}


