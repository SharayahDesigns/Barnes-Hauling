"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createDumpster, type InventoryFormState } from "@/lib/admin/inventory";
import { DUMPSTER_STATUSES, humanizeStatus } from "@/lib/admin/dumpster-status";

import styles from "../../admin.module.scss";
import { MaterialsInput } from "./materials-input";
import { RentalDurationsInput } from "./rental-durations-input";

const INITIAL: InventoryFormState = {};

export function AddDumpsterForm({
  sizes,
}: Readonly<{ sizes: ReadonlyArray<{ id: string; name: string }> }>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createDumpster, INITIAL);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <details className={styles.addDumpster}>
      <summary className={styles.addDumpsterButton}>
        <svg
          className={styles.addDumpsterIcon}
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Add a dumpster
      </summary>
      <form action={formAction} className={styles.addDumpsterPanel}>
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
        <div className={styles.field}>
          <label className={styles.label} htmlFor="priceDollars">
            Price ($)
          </label>
          <input
            id="priceDollars"
            name="priceDollars"
            type="number"
            min="0"
            step="0.01"
            className={styles.input}
            placeholder="275.00"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="maxWeightTons">
            Max weight (tons)
          </label>
          <input
            id="maxWeightTons"
            name="maxWeightTons"
            type="number"
            min="0"
            step="0.01"
            className={styles.input}
            placeholder="3"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="imageFile">
            Dumpster image
          </label>
          <input
            id="imageFile"
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="conditionNotes">
            Condition notes
          </label>
          <input
            id="conditionNotes"
            name="conditionNotes"
            className={styles.input}
            placeholder="Wear, dents, paint, etc."
          />
        </div>
      </div>
      <div style={{ marginTop: "var(--space-4)" }}>
        <MaterialsInput inputId="materialsAllowed" label="Materials allowed" />
      </div>
      <div style={{ marginTop: "var(--space-4)" }}>
        <MaterialsInput
          inputId="materialsNotAllowed"
          inputName="materialsNotAllowed"
          label="Materials not allowed"
        />
      </div>
      <div style={{ marginTop: "var(--space-4)" }}>
        <RentalDurationsInput legend="Rental duration options" />
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.primaryButton} disabled={pending}>
          {pending ? "Adding…" : "Add dumpster"}
        </button>
      </div>
      </form>
    </details>
  );
}
