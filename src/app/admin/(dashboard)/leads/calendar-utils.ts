// Pure, timezone-aware helpers for the admin booking calendar. Kept framework-
// agnostic (no "use client"/"server-only") so both the server page (initial
// focus) and the client calendar component can share them.

const CALENDAR_TIME_ZONE = "America/Denver";

export type CalendarBooking = {
  id: string;
  bookingNumber: number;
  status: string;
  start: string; // scheduled_start_at (ISO)
  end: string; // scheduled_end_at (ISO)
  customer: string;
  dumpster: string | null;
};

export type BookingBar = {
  booking: CalendarBooking;
  startColumn: number;
  endColumn: number;
  row: number;
};

export function denverParts(value: string | Date): {
  year: number;
  month: number;
  day: number;
} {
  const dateValue = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? "0"),
    month: Number(parts.find((p) => p.type === "month")?.value ?? "0"),
    day: Number(parts.find((p) => p.type === "day")?.value ?? "0"),
  };
}

/** Converts an instant to its calendar day in Denver (YYYY-MM-DD). */
export function denverDayKey(value: string | Date): string {
  const { year, month, day } = denverParts(value);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function utcDateFromDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function dayKeyFromParts(
  year: number,
  monthIndex: number,
  day: number,
): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Parse a day key as a plain calendar date (no timezone conversion).
function parseKeyRaw(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

export function focusMonthIndex(focusKey: string): number {
  return parseKeyRaw(focusKey).month - 1;
}

/** 42 day keys (6 weeks, Sunday-first) covering the focus month. */
export function buildMonthDays(focusKey: string): string[] {
  const { year, month } = parseKeyRaw(focusKey);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(firstOfMonth);
  start.setUTCDate(start.getUTCDate() - firstOfMonth.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + index);
    return dayKeyFromParts(
      next.getUTCFullYear(),
      next.getUTCMonth(),
      next.getUTCDate(),
    );
  });
}

/** 7 day keys (Sunday-first) for the week containing the focus day. */
export function buildWeekDays(focusKey: string): string[] {
  const { year, month, day } = parseKeyRaw(focusKey);
  const base = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() - base.getUTCDay());
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + index);
    return dayKeyFromParts(
      next.getUTCFullYear(),
      next.getUTCMonth(),
      next.getUTCDate(),
    );
  });
}

/** Shifts the focus day key by whole months or weeks. */
export function shiftFocus(
  focusKey: string,
  view: "month" | "week",
  delta: number,
): string {
  const { year, month, day } = parseKeyRaw(focusKey);
  const shifted =
    view === "month"
      ? new Date(Date.UTC(year, month - 1 + delta, 1))
      : new Date(Date.UTC(year, month - 1, day + delta * 7));
  return dayKeyFromParts(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
}

export function monthLabel(focusKey: string): string {
  const { year, month } = parseKeyRaw(focusKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function weekLabel(days: string[]): string {
  const fmt = (dayKey: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(
      utcDateFromDayKey(dayKey),
    );
  return `${fmt(days[0], { month: "short", day: "numeric" })} – ${fmt(days[6], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function bookingDayPlacement(
  booking: CalendarBooking,
  dayKey: string,
): "single" | "start" | "middle" | "end" | null {
  const startKey = denverDayKey(booking.start);
  const endKey = booking.end ? denverDayKey(booking.end) : startKey;

  if (booking.status === "cancelled") {
    return dayKey === startKey ? "single" : null;
  }
  if (dayKey < startKey || dayKey > endKey) return null;
  if (startKey === endKey) return "single";
  if (dayKey === startKey) return "start";
  if (dayKey === endKey) return "end";
  return "middle";
}

function activeScheduled(bookings: CalendarBooking[]): CalendarBooking[] {
  return bookings
    .filter((b) => b.status !== "cancelled" && b.start && b.end)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Packs overlapping bookings into stable lanes/rows. */
export function assignStableRows(
  bookings: CalendarBooking[],
): Map<string, number> {
  const laneEndByRow = new Map<number, string>();
  const rowsByBookingId = new Map<string, number>();

  for (const booking of activeScheduled(bookings)) {
    const startKey = denverDayKey(booking.start);
    const endKey = denverDayKey(booking.end);
    let row = 1;
    while ((laneEndByRow.get(row) ?? "") >= startKey) row += 1;
    laneEndByRow.set(row, endKey);
    rowsByBookingId.set(booking.id, row);
  }
  return rowsByBookingId;
}

export function buildWeekBars(
  weekDays: string[],
  bookings: CalendarBooking[],
  rowsByBookingId: Map<string, number>,
): BookingBar[] {
  return activeScheduled(bookings).reduce<BookingBar[]>((bars, booking) => {
    const startKey = denverDayKey(booking.start);
    const endKey = denverDayKey(booking.end);
    const startColumn = weekDays.findIndex((day) => day >= startKey);
    const endColumn = weekDays.findLastIndex((day) => day <= endKey);
    if (startColumn === -1 || endColumn === -1 || startColumn > endColumn) {
      return bars;
    }
    bars.push({
      booking,
      startColumn: startColumn + 1,
      endColumn: endColumn + 2,
      row: rowsByBookingId.get(booking.id) ?? 1,
    });
    return bars;
  }, []);
}
