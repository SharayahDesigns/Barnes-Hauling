"use client";

import { useActionState } from "react";

import { MANUAL_DUMPSTER_STATUSES, humanizeStatus } from "@/lib/admin/dumpster-status";
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
        {/* A legacy hand-set "reserved" still displays so the select isn't blank. */}
        {(MANUAL_DUMPSTER_STATUSES as readonly string[]).includes(status) ? null : (
          <option value={status} disabled>
            {humanizeStatus(status)}
          </option>
        )}
        {MANUAL_DUMPSTER_STATUSES.map((option) => (
          <option key={option} value={option}>
            {/* "Available" here means physically ready; whether it's booked
                comes from its bookings and shows in the status badge. */}
            {option === "available" ? "ready to rent" : humanizeStatus(option)}
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
