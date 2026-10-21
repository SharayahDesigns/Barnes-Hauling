"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { createDumpster, type InventoryFormState } from "@/lib/admin/inventory";
import { MANUAL_DUMPSTER_STATUSES, humanizeStatus } from "@/lib/admin/dumpster-status";

import styles from "../../admin.module.scss";
import { AddButton, InventoryModal } from "./inventory-modal";

const INITIAL: InventoryFormState = {};

/** Adds a physical dumpster to one size; the size is fixed by the section. */
export function AddDumpsterForm({
  sizeId,
  sizeName,
}: Readonly<{ sizeId: string; sizeName: string }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const prefix = `add-dumpster-${sizeId}`;
  const [state, formAction, pending] = useActionState(
    async (previous: InventoryFormState, formData: FormData) => {
      const result = await createDumpster(previous, formData);
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
        label="Add dumpster"
        onClick={() => setOpen(true)}
        expanded={open}
        controls={`${prefix}-modal`}
      />
      {open ? (
        <InventoryModal
          id={`${prefix}-modal`}
          title={`Add a ${sizeName}`}
          subtitle="A physical dumpster you own. Price, weight, and materials come from this size's options, not from the dumpster."
          formId={`${prefix}-form`}
          submitLabel="Add dumpster"
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
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${prefix}-asset`}>
                  Dumpster number
                </label>
                <input
                  id={`${prefix}-asset`}
                  name="assetNumber"
                  className={styles.input}
                  placeholder="The tag painted on it"
                  required
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${prefix}-status`}>
                  Status
                </label>
                <select
                  id={`${prefix}-status`}
                  name="status"
                  className={styles.select}
                  defaultValue="available"
                >
                  {MANUAL_DUMPSTER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanizeStatus(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${prefix}-location`}>
                  Current location
                </label>
                <input
                  id={`${prefix}-location`}
                  name="currentLocation"
                  className={styles.input}
                  placeholder="Yard, jobsite, etc."
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${prefix}-image`}>
                  Photo
                </label>
                <input
                  id={`${prefix}-image`}
                  name="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={styles.fileInput}
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`${prefix}-notes`}>
                  Condition notes
                </label>
                <input
                  id={`${prefix}-notes`}
                  name="conditionNotes"
                  className={styles.input}
                  placeholder="Wear, dents, paint, etc."
                />
              </div>
            </div>
          </form>
        </InventoryModal>
      ) : null}
    </>
  );
}
