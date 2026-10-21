import type { UnavailableReason } from "./types";

/** Adds whole days to a YYYY-MM-DD date. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Pickup day for a rental. Matches denverDayEndWithRentalDays: a 5-day rental
 * delivered on the 21st is picked up on the 26th.
 */
export function rentalPickupDate(start: string, rentalDays: number): string {
  return addDaysIso(start, rentalDays);
}

/**
 * Whether a rental can start on `start`. The delivery day itself must be open
 * (no blackout, closed day, full slots, or booked size), and the dumpster
 * must stay free for every day through pickup: a "booked" day anywhere in the
 * window means no dumpster of that size is free for the whole rental.
 * Blackouts and closed days in the middle of a rental don't matter; the
 * dumpster is just sitting at the customer's.
 */
export function rentalWindowConflict(
  unavailable: readonly UnavailableReason[],
  start: string,
  rentalDays: number,
): UnavailableReason | null {
  const byDate = new Map(unavailable.map((entry) => [entry.date, entry]));
  const own = byDate.get(start);
  if (own) return own;
  const pickup = rentalPickupDate(start, Math.max(1, rentalDays));
  for (let day = addDaysIso(start, 1); day <= pickup; day = addDaysIso(day, 1)) {
    if (byDate.get(day)?.kind === "booked") {
      return {
        date: start,
        kind: "booked",
        message: `A ${rentalDays}-day rental starting this day runs into another booking. Choose a different start date or a shorter rental.`,
      };
    }
  }
  return null;
}
