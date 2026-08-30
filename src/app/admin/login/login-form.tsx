"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signInStaff, type SignInState } from "@/lib/auth/actions";

import styles from "../admin.module.scss";

const INITIAL: SignInState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInStaff, INITIAL);

  return (
    <form action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={styles.field} style={{ marginBottom: "var(--space-4)" }}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={styles.input}
          autoComplete="email"
          required
        />
      </div>
      <div className={styles.field} style={{ marginBottom: "var(--space-5)" }}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="current-password"
          required
        />
      </div>
      <p className={styles.supportText}>
        <Link href="/admin/forgot-password" className={styles.textLink}>
          Forgot your password?
        </Link>
      </p>
      <button
        type="submit"
        className={styles.primaryButton}
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
