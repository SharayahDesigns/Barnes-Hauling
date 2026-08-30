"use client";

import { useActionState } from "react";

import {
  requestStaffPasswordReset,
  type PasswordResetRequestState,
} from "@/lib/auth/actions";

import styles from "../admin.module.scss";

const INITIAL: PasswordResetRequestState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestStaffPasswordReset,
    INITIAL,
  );

  return (
    <form action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className={styles.notice} role="status">
          {state.success}
        </p>
      )}
      <div className={styles.field} style={{ marginBottom: "var(--space-5)" }}>
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
      <button
        type="submit"
        className={styles.primaryButton}
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
