"use client";

import { useActionState } from "react";

import {
  createAvailabilityRule,
  createBlackout,
  type SchedulingFormState,
} from "@/lib/admin/scheduling";
import { WEEKDAYS } from "@/lib/admin/scheduling-constants";

import styles from "../../admin.module.scss";

const INITIAL: SchedulingFormState = {};

function PlusIcon() {
  return (
    <svg
      className={styles.addDumpsterIcon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function AddBlackoutForm() {
  const [state, formAction, pending] = useActionState(createBlackout, INITIAL);

  return (
    <details className={styles.addDumpster}>
      <summary className={styles.addDumpsterButton}>
        <PlusIcon />
        Add a blackout
      </summary>
      <form action={formAction} className={styles.addDumpsterPanel}>
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className={styles.notice} role="status">
            {state.success}
          </p>
        )}
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="startDate">
              Start date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endDate">
              End date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reason">
              Internal reason
            </label>
            <input
              id="reason"
              name="reason"
              className={styles.input}
              placeholder="Holiday, disposal site closed, etc."
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="publicMessage">
              Public message (optional)
            </label>
            <input
              id="publicMessage"
              name="publicMessage"
              className={styles.input}
              placeholder="Shown to customers if set"
            />
          </div>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={pending}>
            {pending ? "Saving…" : "Add blackout"}
          </button>
        </div>
      </form>
    </details>
  );
}

export function AddAvailabilityForm() {
  const [state, formAction, pending] = useActionState(
    createAvailabilityRule,
    INITIAL,
  );

  return (
    <details className={styles.addDumpster}>
      <summary className={styles.addDumpsterButton}>
        <PlusIcon />
        Add availability rule
      </summary>
      <form action={formAction} className={styles.addDumpsterPanel}>
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className={styles.notice} role="status">
            {state.success}
          </p>
        )}
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="dayOfWeek">
              Day
            </label>
            <select
              id="dayOfWeek"
              name="dayOfWeek"
              className={styles.select}
              defaultValue="1"
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="capacity">
              Capacity (deliveries)
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              max={100}
              defaultValue={3}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="startTime">
              Start time
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              defaultValue="08:00"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endTime">
              End time
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              defaultValue="18:00"
              className={styles.input}
              required
            />
          </div>
        </div>
        <label
          className={styles.label}
          style={{ display: "flex", gap: "0.5rem", marginTop: "var(--space-3)" }}
        >
          <input type="checkbox" name="isActive" defaultChecked />
          Active
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={pending}>
            {pending ? "Saving…" : "Add rule"}
          </button>
        </div>
      </form>
    </details>
  );
}
