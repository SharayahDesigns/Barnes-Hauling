"use client";

import { useActionState } from "react";

import { DUMPSTER_STATUSES, humanizeStatus } from "@/lib/admin/dumpster-status";
import {
  updateDumpsterStatus,
  type InventoryFormState,
} from "@/lib/admin/inventory";

import styles from "../../admin.module.scss";
import { AutoSubmitSelect } from "../leads/auto-submit-select";

const INITIAL: InventoryFormState = {};

export function UpdateStatusForm({
  id,
  assetNumber,
  status,
}: Readonly<{ id: string; assetNumber: string; status: string }>) {
  const [state, formAction, pending] = useActionState(
    updateDumpsterStatus,
    INITIAL,
  );

  return (
    <form action={formAction} className={styles.inlineForm}>
      <input type="hidden" name="id" value={id} />
      <AutoSubmitSelect
        name="status"
        defaultValue={status}
        className={styles.inlineSelect}
        ariaLabel={`Status for ${assetNumber}`}
        saveLabel="Save status"
      >
        {DUMPSTER_STATUSES.map((option) => (
          <option key={option} value={option}>
            {humanizeStatus(option)}
          </option>
        ))}
      </AutoSubmitSelect>
      {pending ? (
        <span className={styles.inlineStatusNote} role="status" aria-live="polite">
          Saving...
        </span>
      ) : null}
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
