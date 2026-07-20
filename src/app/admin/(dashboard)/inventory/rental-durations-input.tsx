"use client";

import { useState } from "react";

import styles from "../../admin.module.scss";

type RentalDurationsInputProps = {
  defaultValues?: number[];
  name?: string;
  legend: string;
};

export function RentalDurationsInput({
  defaultValues = [5],
  name = "rentalDurationDays",
  legend,
}: Readonly<RentalDurationsInputProps>) {
  const normalizedDefaults = [...new Set(
    defaultValues.filter((value) => Number.isInteger(value) && value > 0),
  )].sort((a, b) => a - b);
  const [durations, setDurations] = useState(normalizedDefaults);
  const [draft, setDraft] = useState("");

  function addDuration(raw: string) {
    const value = Number(raw.trim());
    if (!Number.isInteger(value) || value <= 0) {
      setDraft("");
      return;
    }
    if (durations.includes(value)) {
      setDraft("");
      return;
    }
    setDurations((current) => [...current, value].sort((a, b) => a - b));
    setDraft("");
  }

  function removeDuration(value: number) {
    setDurations((current) => current.filter((duration) => duration !== value));
  }

  return (
    <fieldset className={styles.choiceGroup}>
      <legend className={styles.label}>{legend}</legend>
      <input type="hidden" name={name} value="" />
      <div className={styles.inlineForm}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addDuration(draft);
            }
          }}
          className={styles.input}
          inputMode="numeric"
          placeholder="Add days"
        />
        <button
          type="button"
          className={styles.smallButton}
          onClick={() => addDuration(draft)}
        >
          Add
        </button>
      </div>
      {durations.length > 0 ? (
        <div className={styles.chips}>
          {durations.map((duration) => (
            <span key={duration} className={styles.chip}>
              <input type="hidden" name={name} value={String(duration)} />
              {duration}-day
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${duration}-day option`}
                onClick={() => removeDuration(duration)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
