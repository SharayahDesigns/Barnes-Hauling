"use client";

import { useActionState } from "react";

import { createDumpster, type InventoryFormState } from "@/lib/admin/inventory";
import { DUMPSTER_STATUSES, humanizeStatus } from "@/lib/admin/dumpster-status";

import styles from "../../admin.module.scss";

const INITIAL: InventoryFormState = {};

export function AddDumpsterForm({
  sizes,
}: Readonly<{ sizes: ReadonlyArray<{ id: string; name: string }> }>) {
  const [state, formAction, pending] = useActionState(createDumpster, INITIAL);

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Add a dumpster</h2>
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
          <label className={styles.label} htmlFor="assetNumber">
            Asset number
          </label>
          <input
            id="assetNumber"
            name="assetNumber"
            className={styles.input}
            placeholder="e.g. BH-15-001"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="dumpsterSizeId">
            Size
          </label>
          <select
            id="dumpsterSizeId"
            name="dumpsterSizeId"
            className={styles.select}
            defaultValue=""
            required
          >
            <option value="" disabled>
              Choose a size
            </option>
            {sizes.map((size) => (
              <option key={size.id} value={size.id}>
                {size.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className={styles.select}
            defaultValue="available"
          >
            {DUMPSTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanizeStatus(status)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="currentLocation">
            Current location
          </label>
          <input
            id="currentLocation"
            name="currentLocation"
            className={styles.input}
            placeholder="Yard, jobsite, etc."
          />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.primaryButton} disabled={pending}>
          {pending ? "Adding…" : "Add dumpster"}
        </button>
      </div>
    </form>
  );
}
