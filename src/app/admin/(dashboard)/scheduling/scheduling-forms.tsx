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

export function AddBlackoutForm() {
  const [state, formAction, pending] = useActionState(createBlackout, INITIAL);

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Add a blackout</h2>
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
  );
}

export function AddAvailabilityForm() {
  const [state, formAction, pending] = useActionState(
    createAvailabilityRule,
    INITIAL,
  );

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Add availability rule</h2>
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
  );
}
