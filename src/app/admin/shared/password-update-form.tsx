"use client";

import { useActionState } from "react";

import { updateStaffPassword, type PasswordUpdateState } from "@/lib/auth/actions";

import styles from "../admin.module.scss";

const INITIAL: PasswordUpdateState = {};

type PasswordUpdateFormProps = {
  submitLabel: string;
};

export function PasswordUpdateForm({ submitLabel }: PasswordUpdateFormProps) {
  const [state, formAction, pending] = useActionState(
    updateStaffPassword,
    INITIAL,
  );

  return (
    <form action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={styles.field} style={{ marginBottom: "var(--space-4)" }}>
        <label className={styles.label} htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className={styles.field} style={{ marginBottom: "var(--space-5)" }}>
        <label className={styles.label} htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className={styles.input}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button
        type="submit"
        className={styles.primaryButton}
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
