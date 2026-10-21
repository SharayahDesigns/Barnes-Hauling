"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateServiceItemPricing,
  type ServiceItemFormState,
} from "@/lib/admin/service-items";

import styles from "../../admin.module.scss";
import { MaterialsInput } from "./materials-input";
import { PhotoPicker, type PhotoChoice } from "./photo-picker";
import { RentalDurationsInput } from "./rental-durations-input";

const INITIAL: ServiceItemFormState = {};

type ServiceItemPricing = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  photoDumpsterId: string | null;
  rentalPriceCents: number | null;
  maxWeightTons: number | null;
  materialsAllowed: string[];
  materialsNotAllowed: string[];
  rentalDurationDays: number[];
};

export function ServiceItemPricingForm({
  serviceItem,
  sizeName,
  photoChoices,
}: Readonly<{
  serviceItem: ServiceItemPricing;
  sizeName: string;
  photoChoices: readonly PhotoChoice[];
}>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateServiceItemPricing,
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
        aria-label={`Edit option ${serviceItem.name}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`edit-listing-modal-${serviceItem.id}`}
      >
        Edit
      </button>

      {open ? (
        <div
          className={styles.editModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-listing-title-${serviceItem.id}`}
          id={`edit-listing-modal-${serviceItem.id}`}
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
                  id={`edit-listing-title-${serviceItem.id}`}
                  className={styles.editModalTitle}
                >
                  Edit {serviceItem.name}
                </h2>
                <p className={styles.editModalSub}>
                  What customers see and pay when they book this option.
                  Applies to every dumpster of this size.
                </p>
              </div>
              <button
                type="button"
                className={styles.editModalClose}
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label={`Close edit modal for ${serviceItem.name}`}
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
              id={`edit-listing-form-${serviceItem.id}`}
              action={formAction}
              className={styles.editBody}
            >
              <input type="hidden" name="id" value={serviceItem.id} />
              <input type="hidden" name="code" value={serviceItem.code} />
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
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor={`name-${serviceItem.id}`}>
                    Option name (customers see this)
                  </label>
                  <input
                    id={`name-${serviceItem.id}`}
                    name="name"
                    className={styles.input}
                    defaultValue={serviceItem.name}
                    required
                    minLength={3}
                    maxLength={120}
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label
                    className={styles.label}
                    htmlFor={`description-${serviceItem.id}`}
                  >
                    Short description
                  </label>
                  <input
                    id={`description-${serviceItem.id}`}
                    name="description"
                    className={styles.input}
                    maxLength={300}
                    defaultValue={serviceItem.description ?? ""}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`price-${serviceItem.id}`}>
                    Price ($)
                  </label>
                  <input
                    id={`price-${serviceItem.id}`}
                    name="priceDollars"
                    type="number"
                    min="0"
                    step="0.01"
                    className={styles.input}
                    defaultValue={
                      serviceItem.rentalPriceCents != null
                        ? (serviceItem.rentalPriceCents / 100).toFixed(2)
                        : ""
                    }
                    placeholder="Leave blank to require a staff quote"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`weight-${serviceItem.id}`}>
                    Max weight (tons)
                  </label>
                  <input
                    id={`weight-${serviceItem.id}`}
                    name="maxWeightTons"
                    type="number"
                    min="0"
                    step="0.01"
                    className={styles.input}
                    defaultValue={serviceItem.maxWeightTons ?? ""}
                  />
                </div>
                <PhotoPicker
                  idPrefix={`edit-${serviceItem.id}`}
                  sizeName={sizeName}
                  choices={photoChoices}
                  defaultValue={serviceItem.photoDumpsterId}
                />
              </div>
              <div className={styles.materialsRow}>
                <MaterialsInput
                  inputId={`materials-${serviceItem.id}`}
                  label="Materials allowed"
                  defaultMaterials={serviceItem.materialsAllowed}
                />
                <MaterialsInput
                  inputId={`materials-not-${serviceItem.id}`}
                  inputName="materialsNotAllowed"
                  label="Materials not allowed"
                  defaultMaterials={serviceItem.materialsNotAllowed}
                />
              </div>
              <RentalDurationsInput
                key={`${serviceItem.id}:${serviceItem.rentalDurationDays.join(",")}`}
                legend="Rental duration options"
                defaultValues={serviceItem.rentalDurationDays}
              />
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
                  form={`edit-listing-form-${serviceItem.id}`}
                  className={styles.editSaveButton}
                  disabled={pending}
                >
                  {pending ? "Saving…" : "Save option"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
