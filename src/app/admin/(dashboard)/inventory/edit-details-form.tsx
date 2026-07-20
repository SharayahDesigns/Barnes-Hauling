"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  updateDumpsterDetails,
  type InventoryFormState,
} from "@/lib/admin/inventory";

import styles from "../../admin.module.scss";
import { MaterialsInput } from "./materials-input";
import { RentalDurationsInput } from "./rental-durations-input";

const INITIAL: InventoryFormState = {};

type DumpsterDetails = {
  id: string;
  dumpsterSizeId: string;
  assetNumber: string;
  currentLocation: string | null;
  conditionNotes: string | null;
  imagePath: string | null;
  rentalPriceCents: number | null;
  maxWeightTons: number | null;
  materialsAllowed: string[];
  materialsNotAllowed: string[];
  rentalDurationDays: number[];
  lengthFeet: number | null;
  widthFeet: number | null;
  wallHeightFeet: number | null;
};

export function EditDetailsForm({
  dumpster,
}: Readonly<{ dumpster: DumpsterDetails }>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateDumpsterDetails,
    INITIAL,
  );

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <details className={styles.editDetails}>
      <summary className={styles.editSummary}>
        <span className={styles.editSummaryLabel}>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          Edit details
        </span>
        <svg
          className={styles.editChevron}
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <form action={formAction} className={styles.editBody}>
        <input type="hidden" name="id" value={dumpster.id} />
        <input type="hidden" name="dumpsterSizeId" value={dumpster.dumpsterSizeId} />
        {state.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className={styles.notice} role="status">
            {state.success}
          </p>
        ) : null}
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`price-${dumpster.id}`}>
              Price ($)
            </label>
            <input
              id={`price-${dumpster.id}`}
              name="priceDollars"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={
                dumpster.rentalPriceCents != null
                  ? (dumpster.rentalPriceCents / 100).toFixed(2)
                  : ""
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`weight-${dumpster.id}`}>
              Max weight (tons)
            </label>
            <input
              id={`weight-${dumpster.id}`}
              name="maxWeightTons"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={dumpster.maxWeightTons ?? ""}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`length-${dumpster.id}`}>
              Length (ft)
            </label>
            <input
              id={`length-${dumpster.id}`}
              name="lengthFeet"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={dumpster.lengthFeet ?? ""}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`width-${dumpster.id}`}>
              Width (ft)
            </label>
            <input
              id={`width-${dumpster.id}`}
              name="widthFeet"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={dumpster.widthFeet ?? ""}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`walls-${dumpster.id}`}>
              Wall height (ft)
            </label>
            <input
              id={`walls-${dumpster.id}`}
              name="wallHeightFeet"
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              defaultValue={dumpster.wallHeightFeet ?? ""}
            />
          </div>
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label} htmlFor={`image-${dumpster.id}`}>
              Replace image
            </label>
            <input
              id={`image-${dumpster.id}`}
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={styles.fileInput}
            />
          </div>
        </div>
        <MaterialsInput
          inputId={`materials-${dumpster.id}`}
          label="Materials allowed"
          defaultMaterials={dumpster.materialsAllowed}
        />
        <MaterialsInput
          inputId={`materials-not-${dumpster.id}`}
          inputName="materialsNotAllowed"
          label="Materials not allowed"
          defaultMaterials={dumpster.materialsNotAllowed}
        />
        <RentalDurationsInput
          key={`${dumpster.id}:${dumpster.rentalDurationDays.join(",")}`}
          legend="Rental duration options"
          defaultValues={dumpster.rentalDurationDays}
        />
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`condition-${dumpster.id}`}>
            Condition notes
          </label>
          <textarea
            id={`condition-${dumpster.id}`}
            name="conditionNotes"
            className={styles.input}
            rows={3}
            defaultValue={dumpster.conditionNotes ?? ""}
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.smallButton} disabled={pending}>
            {pending ? "Saving…" : `Save ${dumpster.assetNumber}`}
          </button>
        </div>
      </form>
    </details>
  );
}
