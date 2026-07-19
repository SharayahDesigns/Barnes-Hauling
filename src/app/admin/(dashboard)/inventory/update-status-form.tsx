"use client";

import { useActionState } from "react";

import { DUMPSTER_STATUSES, humanizeStatus } from "@/lib/admin/dumpster-status";
import {
  updateDumpsterStatus,
  type InventoryFormState,
} from "@/lib/admin/inventory";

import styles from "../../admin.module.scss";

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
      <select
        name="status"
        defaultValue={status}
        className={styles.inlineSelect}
        aria-label={`Status for ${assetNumber}`}
      >
        {DUMPSTER_STATUSES.map((option) => (
          <option key={option} value={option}>
            {humanizeStatus(option)}
          </option>
        ))}
      </select>
      <button type="submit" className={styles.smallButton} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
