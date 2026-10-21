"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createServiceItem,
  type ServiceItemFormState,
} from "@/lib/admin/service-items";

import styles from "../../admin.module.scss";
import { AddButton, InventoryModal } from "./inventory-modal";
import { MaterialsInput } from "./materials-input";
import { PhotoPicker, type PhotoChoice } from "./photo-picker";
import { RentalDurationsInput } from "./rental-durations-input";

const INITIAL: ServiceItemFormState = {};

/**
 * Adds a bookable option (price tier) for one size, e.g. "15-Yard Dumpster —
 * Roofing". It shares the size's dumpsters; it doesn't add capacity.
 */
export function AddListingForm({
  sizeId,
  sizeName,
  photoChoices,
}: Readonly<{ sizeId: string; sizeName: string; photoChoices: readonly PhotoChoice[] }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const prefix = `add-option-${sizeId}`;
  const [state, formAction, pending] = useActionState(
    async (previous: ServiceItemFormState, formData: FormData) => {
      const result = await createServiceItem(previous, formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    INITIAL,
  );

  return (
    <>
      <AddButton
        label="Add option"
        onClick={() => setOpen(true)}
        expanded={open}
        controls={`${prefix}-modal`}
      />
      {open ? (
        <InventoryModal
          id={`${prefix}-modal`}
          title={`New ${sizeName} option`}
          subtitle="A new choice customers can book, with its own price and material rules. It uses the same dumpsters as this size's other options."
          formId={`${prefix}-form`}
          submitLabel="Add option"
          pending={pending}
          onClose={() => setOpen(false)}
        >
          <form id={`${prefix}-form`} action={formAction} className={styles.editBody}>
            {state.error ? (
              <p className={styles.error} role="alert">
                {state.error}
              </p>
            ) : null}
            <input type="hidden" name="dumpsterSizeId" value={sizeId} />
            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`${prefix}-name`}>
                  Option name (customers see this)
                </label>
                <input
                  id={`${prefix}-name`}
                  name="name"
                  className={styles.input}
                  placeholder={`e.g. ${sizeName} — Roofing Debris`}
                  required
                  minLength={3}
                  maxLength={120}
                  autoFocus
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`${prefix}-description`}>
                  Short description
                </label>
                <input
                  id={`${prefix}-description`}
                  name="description"
                  className={styles.input}
                  maxLength={300}
                  placeholder="e.g. Shingles and roofing materials only."
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${prefix}-price`}>
                  Price ($)
                </label>
                <input
                  id={`${prefix}-price`}
                  name="priceDollars"
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                  placeholder="Blank = customer requests a quote"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${prefix}-weight`}>
                  Max weight (tons)
                </label>
                <input
                  id={`${prefix}-weight`}
                  name="maxWeightTons"
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                />
              </div>
              <PhotoPicker
                idPrefix={prefix}
                sizeName={sizeName}
                choices={photoChoices}
                defaultValue={null}
              />
            </div>
            <div className={styles.materialsRow}>
              <MaterialsInput inputId={`${prefix}-materials`} label="Materials allowed" />
              <MaterialsInput
                inputId={`${prefix}-materials-not`}
                inputName="materialsNotAllowed"
                label="Materials not allowed"
              />
            </div>
            <RentalDurationsInput legend="Rental length options (days)" />
          </form>
        </InventoryModal>
      ) : null}
    </>
  );
}
