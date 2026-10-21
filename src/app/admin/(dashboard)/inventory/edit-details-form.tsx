"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateDumpsterDetails,
  type InventoryFormState,
} from "@/lib/admin/inventory";

import styles from "../../admin.module.scss";

const INITIAL: InventoryFormState = {};

type DumpsterDetails = {
  id: string;
  dumpsterSizeId: string;
  assetNumber: string;
  imagePublicUrl: string | null;
  currentLocation: string | null;
  conditionNotes: string | null;
  imagePath: string | null;
  lengthFeet: number | null;
  widthFeet: number | null;
  wallHeightFeet: number | null;
};

export function EditDetailsForm({
  dumpster,
}: Readonly<{
  dumpster: DumpsterDetails;
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
        className={styles.tableAction}
        aria-label={`Edit dumpster ${dumpster.assetNumber}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`edit-dumpster-modal-${dumpster.id}`}
      >
        Edit
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
                  Location, condition, and photo for this dumpster.
                  Dimensions apply to every dumpster of this size.
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
              <div className={styles.formGrid}>
                {/* Capacity and dimensions read as one set of numbers, so they
                    sit on a single row on desktop instead of wrapping through
                    the two-column grid. */}
                <div className={styles.measureRow}>
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
