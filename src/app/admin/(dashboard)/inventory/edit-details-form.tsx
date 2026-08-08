"use client";

import { useActionState, useEffect, useState } from "react";
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
  serviceItemId: string | null;
  assetNumber: string;
  imagePublicUrl: string | null;
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
  serviceItems,
  supportsServiceItemAssignments,
}: Readonly<{
  dumpster: DumpsterDetails;
  serviceItems: ReadonlyArray<{ id: string; name: string }>;
  supportsServiceItemAssignments: boolean;
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    <>
      <button
        type="button"
        className={styles.editSummary}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`edit-dumpster-modal-${dumpster.id}`}
      >
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
      </button>

      {open ? (
        <div
          className={styles.editModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-dumpster-title-${dumpster.id}`}
          id={`edit-dumpster-modal-${dumpster.id}`}
          onClick={() => {
            if (!pending) setOpen(false);
          }}
        >
          <div
            className={styles.editModalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.editModalHeader}>
              <div>
                <h2
                  id={`edit-dumpster-title-${dumpster.id}`}
                  className={styles.editModalTitle}
                >
                  Edit {dumpster.assetNumber}
                </h2>
                <p className={styles.editModalSub}>
                  Update booking package, pricing, image, rental options, and material limits.
                </p>
              </div>
              <button
                type="button"
                className={styles.editModalClose}
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label={`Close edit modal for ${dumpster.assetNumber}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form
              id={`edit-dumpster-form-${dumpster.id}`}
              action={formAction}
              className={styles.editBody}
            >
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
              {!supportsServiceItemAssignments ? (
                <p className={styles.notice} role="status">
                  Booking package changes will not persist until the
                  `dumpsters.service_item_id` database migration is applied.
                </p>
              ) : null}
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`service-item-${dumpster.id}`}>
                    Booking package
                  </label>
                  <select
                    id={`service-item-${dumpster.id}`}
                    name="serviceItemId"
                    className={styles.select}
                    defaultValue={dumpster.serviceItemId ?? ""}
                    required
                  >
                    <option value="" disabled>
                      Choose a package
                    </option>
                    {serviceItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                {/* Capacity and dimensions read as one set of numbers, so they
                    sit on a single row on desktop instead of wrapping through
                    the two-column grid. */}
                <div className={styles.measureRow}>
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
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor={`image-${dumpster.id}`}>
                    Replace image
                  </label>
                  {dumpster.imagePublicUrl ? (
                    <div className={styles.editImagePreview}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dumpster.imagePublicUrl}
                        alt={`${dumpster.assetNumber} current thumbnail`}
                        className={styles.editImageThumb}
                      />
                      <div className={styles.editImageMeta}>
                        <span className={styles.editImageLabel}>Current image</span>
                        <span className={styles.editImageHint}>
                          Upload a new file only if you want to replace this thumbnail.
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <input
                    id={`image-${dumpster.id}`}
                    name="imageFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.fileInput}
                  />
                </div>
              </div>
              {/* Allowed and not-allowed are read against each other, so they
                  sit side by side on desktop rather than stacked. */}
              <div className={styles.materialsRow}>
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
              </div>
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
            </form>
            <div className={styles.editModalFooter}>
              <div className={styles.editModalActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form={`edit-dumpster-form-${dumpster.id}`}
                  className={styles.editSaveButton}
                  disabled={pending}
                >
                  {pending ? "Saving…" : `Save ${dumpster.assetNumber}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
