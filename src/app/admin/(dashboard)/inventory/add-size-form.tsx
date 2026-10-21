"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createDumpsterSize,
  type DumpsterSizeFormState,
} from "@/lib/admin/dumpster-sizes";

import styles from "../../admin.module.scss";
import { AddButton, InventoryModal } from "./inventory-modal";

const INITIAL: DumpsterSizeFormState = {};

export function AddSizeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: DumpsterSizeFormState, formData: FormData) => {
      const result = await createDumpsterSize(previous, formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    INITIAL,
  );

  const field = (id: string, name: string, label: string, required = false) => (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        min={required ? "1" : "0"}
        step={required ? "1" : "0.5"}
        className={styles.input}
        required={required}
        autoFocus={required}
      />
    </div>
  );

  return (
    <>
      <AddButton
        label="Add a new size"
        onClick={() => setOpen(true)}
        expanded={open}
        controls="add-size-modal"
      />
      {open ? (
        <InventoryModal
          id="add-size-modal"
          title="Add a new dumpster size"
          subtitle="Only for a size you don't carry yet, like a 30-yard. Customers can book it once it has at least one dumpster and one option."
          formId="add-size-form"
          submitLabel="Add size"
          pending={pending}
          onClose={() => setOpen(false)}
        >
          <form id="add-size-form" action={formAction} className={styles.editBody}>
            {state.error ? (
              <p className={styles.error} role="alert">
                {state.error}
              </p>
            ) : null}
            <div className={styles.formGrid}>
              {field("add-size-yards", "capacityYards", "Capacity (cubic yards)", true)}
              {field("add-size-width", "widthFeet", "Width (ft)")}
              {field("add-size-length", "lengthFeet", "Length (ft)")}
              {field("add-size-walls", "wallHeightFeet", "Wall height (ft)")}
            </div>
          </form>
        </InventoryModal>
      ) : null}
    </>
  );
}
