"use client";

import { useActionState } from "react";

import { addCoverage, type CoverageFormState } from "@/lib/admin/service-area";

import styles from "../../admin.module.scss";

const INITIAL: CoverageFormState = {};

export function AddCoverageForm() {
  const [state, formAction, pending] = useActionState(addCoverage, INITIAL);

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Add service coverage</h2>
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
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="areaName">
            Area name
          </label>
          <input
            id="areaName"
            name="areaName"
            className={styles.input}
            placeholder="e.g. Herriman"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="zips">
            ZIP codes
          </label>
          <input
            id="zips"
            name="zips"
            className={styles.input}
            placeholder="84096, 84065, 84009"
            required
          />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.primaryButton} disabled={pending}>
          {pending ? "Saving…" : "Add coverage"}
        </button>
      </div>
    </form>
  );
}
