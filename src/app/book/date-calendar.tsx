"use client";

import { useMemo, useState } from "react";

import { addDaysIso, rentalPickupDate, rentalWindowConflict } from "@/lib/booking/rental-window";
import type { UnavailableReason } from "@/lib/booking/types";

import styles from "./booking-flow.module.scss";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`;
}

export function DateCalendar({
  minDate,
  maxDate,
  unavailable,
  rentalDays,
  value,
  onChange,
}: Readonly<{
  minDate: string;
  maxDate: string;
  unavailable: readonly UnavailableReason[];
  /** Length of the rental; the calendar shows delivery through pickup. */
  rentalDays: number;
  value: string;
  onChange: (date: string) => void;
}>) {
  // A day can be a start date only if the whole rental fits from it.
  const reasonByDate = useMemo(() => {
    const reasons = new Map<string, UnavailableReason>();
    for (let date = minDate; date <= maxDate; date = addDaysIso(date, 1)) {
      const reason = rentalWindowConflict(unavailable, date, rentalDays);
      if (reason) reasons.set(date, reason);
    }
    return reasons;
  }, [unavailable, rentalDays, minDate, maxDate]);
  const pickupDate = value ? rentalPickupDate(value, rentalDays) : null;
  const [notice, setNotice] = useState<string | null>(null);

  const [minY, minM] = minDate.split("-").map(Number);
  const [maxY, maxM] = maxDate.split("-").map(Number);

  // Start on the selected date's month, else the first bookable month.
  const initial = value || minDate;
  const [iy, im] = initial.split("-").map(Number);
  const [view, setView] = useState({ year: iy, month: im - 1 });

  const firstOfMonth = new Date(Date.UTC(view.year, view.month, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(view.year, view.month + 1, 0),
  ).getUTCDate();

  const cells: Array<string | null> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${view.year}-${pad(view.month + 1)}-${pad(day)}`);
  }

  const currentKey = monthKey(view.year, view.month);
  const canPrev = currentKey > monthKey(minY, minM - 1);
  const canNext = currentKey < monthKey(maxY, maxM - 1);

  function shift(delta: number) {
    setView((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.calNav}
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className={styles.calTitle} aria-live="polite">
          {MONTH_LABELS[view.month]} {view.year}
        </span>
        <button
          type="button"
          className={styles.calNav}
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className={styles.calGrid} role="grid">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.calWeekday} aria-hidden="true">
            {label}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} />;
          const day = Number(date.slice(-2));
          const outOfRange = date < minDate || date > maxDate;
          const selected = date === value;
          const inRental = Boolean(pickupDate && date > value && date < pickupDate);
          const isPickup = date === pickupDate;
          const partOfRental = selected || inRental || isPickup;
          const reason = reasonByDate.get(date) ?? null;
          const isUnavailable = Boolean(reason) && !partOfRental;
          const available = !outOfRange && !isUnavailable;
          return (
            <button
              key={date}
              type="button"
              className={[
                styles.calDay,
                outOfRange ? styles.calDayMuted : "",
                isUnavailable && !outOfRange ? styles.calDayUnavailable : "",
                available && !partOfRental ? styles.calDayAvailable : "",
                inRental ? styles.calDayInRental : "",
                isPickup ? styles.calDayPickup : "",
                selected ? styles.calDaySelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              // Out-of-range days are inert; unavailable days stay clickable so
              // we can explain why they can't be booked.
              disabled={outOfRange}
              aria-pressed={selected}
              aria-label={
                selected
                  ? `${date}, delivery day`
                  : isPickup
                    ? `${date}, pickup day`
                    : inRental
                      ? `${date}, rental day`
                      : reason
                        ? `${date} — ${reason.message}`
                        : date
              }
              onClick={() => {
                if (reason) {
                  setNotice(reason.message);
                  return;
                }
                setNotice(null);
                onChange(date);
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className={styles.calLegend}>
        <span>
          <span className={`${styles.calSwatch} ${styles.calSwatchOpen}`} /> Available
        </span>
        <span>
          <span className={`${styles.calSwatch} ${styles.calSwatchOff}`} /> Unavailable
        </span>
        {value ? (
          <>
            <span>
              <span className={`${styles.calSwatch} ${styles.calSwatchStart}`} /> Delivery
            </span>
            <span>
              <span className={`${styles.calSwatch} ${styles.calSwatchRental}`} /> Rental
            </span>
            <span>
              <span className={`${styles.calSwatch} ${styles.calSwatchPickup}`} /> Pickup
            </span>
          </>
        ) : null}
      </div>

      <p className={styles.calNotice} role="status" aria-live="polite">
        {notice ?? ""}
      </p>
    </div>
  );
}
