"use client";

import { useMemo, useState } from "react";

import { humanizeStatus } from "@/lib/admin/dumpster-status";

import styles from "../../admin.module.scss";
import {
  assignStableRows,
  bookingDayPlacement,
  buildMonthDays,
  buildWeekBars,
  buildWeekDays,
  denverDayKey,
  focusMonthIndex,
  monthLabel,
  shiftFocus,
  utcDateFromDayKey,
  weekLabel,
  type CalendarBooking,
} from "./calendar-utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type View = "month" | "week";

function bookingStatusClass(status: string): string {
  const key = status.replace(
    /(^|_)([a-z])/g,
    (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
  );
  return styles[`calendarStatus${key}`] ?? styles.calendarStatusDefault;
}

function bookingLabel(booking: CalendarBooking): string {
  return booking.dumpster
    ? `${booking.customer} • ${booking.dumpster}`
    : booking.customer;
}

export function BookingCalendar({
  bookings,
  initialFocus,
  today,
}: Readonly<{
  bookings: CalendarBooking[];
  initialFocus: string;
  today: string;
}>) {
  const [view, setView] = useState<View>("week");
  const [focus, setFocus] = useState(initialFocus);

  const days = useMemo(
    () => (view === "month" ? buildMonthDays(focus) : buildWeekDays(focus)),
    [view, focus],
  );
  const weeks = useMemo(
    () =>
      Array.from({ length: days.length / 7 }, (_, i) =>
        days.slice(i * 7, i * 7 + 7),
      ),
    [days],
  );
  const rowsById = useMemo(() => assignStableRows(bookings), [bookings]);
  const monthIndex = focusMonthIndex(focus);
  const statusLegend = [...new Set(bookings.map((b) => b.status))];
  const label = view === "month" ? monthLabel(focus) : weekLabel(days);

  return (
    <>
      <div className={styles.calendarToolbar}>
        <div
          className={styles.calendarViewToggle}
          role="group"
          aria-label="Calendar view"
        >
          <button
            type="button"
            className={`${styles.calendarToggleButton} ${view === "month" ? styles.calendarToggleActive : ""}`}
            onClick={() => setView("month")}
            aria-pressed={view === "month"}
          >
            Month
          </button>
          <button
            type="button"
            className={`${styles.calendarToggleButton} ${view === "week" ? styles.calendarToggleActive : ""}`}
            onClick={() => setView("week")}
            aria-pressed={view === "week"}
          >
            Week
          </button>
        </div>
        <div className={styles.calendarNav}>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setFocus((f) => shiftFocus(f, view, -1))}
            aria-label={view === "month" ? "Previous month" : "Previous week"}
          >
            ‹
          </button>
          <span className={styles.calendarMonth}>{label}</span>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setFocus((f) => shiftFocus(f, view, 1))}
            aria-label={view === "month" ? "Next month" : "Next week"}
          >
            ›
          </button>
          <button
            type="button"
            className={styles.calendarNavButton}
            onClick={() => setFocus(denverDayKey(new Date()))}
          >
            Today
          </button>
        </div>
      </div>

      {statusLegend.length > 0 && (
        <div className={styles.calendarLegend}>
          {statusLegend.map((status) => (
            <span
              key={status}
              className={`${styles.calendarLegendItem} ${bookingStatusClass(status)}`}
            >
              {humanizeStatus(status)}
            </span>
          ))}
        </div>
      )}

      <div className={styles.calendarGrid}>
        {WEEKDAY_LABELS.map((weekdayLabel) => (
          <div key={weekdayLabel} className={styles.calendarWeekday}>
            {weekdayLabel}
          </div>
        ))}
        {weeks.map((weekDays) => {
          const weekBars = buildWeekBars(weekDays, bookings, rowsById);
          const weekRows = Math.max(1, ...weekBars.map((bar) => bar.row));

          return (
            <div key={weekDays[0]} className={styles.calendarWeekRow}>
              <div className={styles.calendarWeekDays}>
                {weekDays.map((dayKey) => {
                  const dayDate = utcDateFromDayKey(dayKey);
                  const isOutsideMonth =
                    view === "month" && dayDate.getUTCMonth() !== monthIndex;
                  const cancelled = bookings.filter(
                    (b) =>
                      b.status === "cancelled" &&
                      bookingDayPlacement(b, dayKey) === "single",
                  );

                  return (
                    <div
                      key={dayKey}
                      className={`${styles.calendarDay} ${isOutsideMonth ? styles.calendarDayMuted : ""} ${dayKey === today ? styles.calendarDayToday : ""}`}
                      aria-current={dayKey === today ? "date" : undefined}
                    >
                      <div className={styles.calendarDayNumber}>
                        {dayDate.getUTCDate()}
                      </div>
                      <div className={styles.calendarDayBookings}>
                        {cancelled.length === 0 ? (
                          <span className={styles.calendarEmpty}>No bookings</span>
                        ) : (
                          cancelled.map((booking) => (
                            <div
                              key={`${dayKey}-${booking.id}`}
                              className={`${styles.calendarBookingSingle} ${styles.calendarCancelledChip} ${bookingStatusClass(booking.status)}`}
                            >
                              <strong>#{booking.bookingNumber}</strong>{" "}
                              {bookingLabel(booking)}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                className={styles.calendarWeekBars}
                style={{ gridTemplateRows: `repeat(${weekRows}, 2rem)` }}
              >
                {weekBars.map((bar) => (
                  <div
                    key={`${weekDays[0]}-${bar.booking.id}`}
                    className={`${styles.calendarBookingBar} ${bookingStatusClass(bar.booking.status)}`}
                    style={{
                      gridColumn: `${bar.startColumn} / ${bar.endColumn}`,
                      gridRow: String(bar.row),
                    }}
                  >
                    <strong>#{bar.booking.bookingNumber}</strong>{" "}
                    {bookingLabel(bar.booking)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
