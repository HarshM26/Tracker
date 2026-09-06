"use client";

/**
 * Visual theme ported from index.html's "Auth screen" section.
 * Only login is exposed here — DEPLOY.md's design is a closed team of
 * three pre-seeded accounts (`npm run seed`), so there's no public
 * signup endpoint on the backend. If you do want self-serve signup,
 * say the word and I'll add a matching /api/signup route plus the
 * mode toggle back into this page.
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";

const LOCK_SVG = (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    if (!password) {
      setError("Enter a password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn\u2019t reach the server \u2014 try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.appIcon}>{LOCK_SVG}</div>
        <h1 className={styles.authTitle}>Welcome Back</h1>
        <p className={styles.authSubtitle}>Sign in to continue.</p>

        {error && <p className={styles.authError}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <div className={styles.formRow}>
              <label htmlFor="authName">Name</label>
              <input
                id="authName"
                type="text"
                placeholder="e.g. Harsh"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label htmlFor="authPassword">Password</label>
              <div className={styles.fieldRow}>
                <input
                  id="authPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.pwdToggle}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className={styles.authBtn} disabled={submitting}>
            {submitting ? "Please wait\u2026" : "Log In"}
          </button>
        </form>

        <p className={styles.authHint}>Activity Tracker \u2014 ask whoever set this up if you need an account.</p>
      </div>
    </div>
  );
}
