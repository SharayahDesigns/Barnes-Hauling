import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { denverDate, todayInDenver } from "./records";
import { rentalWindowConflict } from "./rental-window";
import type { DeliveryAvailability, UnavailableReason } from "./types";

type AdminDb = SupabaseClient;

// How far ahead customers may book.
const WINDOW_DAYS = 120;

// Booking statuses that actually hold a delivery slot / dumpster. Cancelled and
// draft bookings must NOT block dates for other customers.
const ACTIVE_BOOKING_STATUSES = [
  "pending_review",
  "pending_payment",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
];
const ACTIVE_BOOKING_SET = new Set(ACTIVE_BOOKING_STATUSES);

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Computes selectable delivery dates per bookable size over the booking window.
 * A date is unavailable when:
 *  - it falls inside an active blackout (all sizes), or
 *  - availability rules exist and the weekday has no delivery-slot capacity or
 *    is already full (all sizes), or
 *  - any dumpster of that size is reserved/assigned for the date, per
 *    dumpster_assignments (size-specific "reserved").
 *
 * Reads blackout_dates, availability_rules, bookings, and dumpster_assignments
 * via the service-role client, so callers must be server-side.
 */
export async function getDeliveryAvailability(
  supabase: AdminDb,
  serviceId: string,
): Promise<DeliveryAvailability> {
  const minDate = todayInDenver();
  const maxDate = addDaysIso(minDate, WINDOW_DAYS);
  const minInstant = `${minDate}T00:00:00Z`;

  const [blackoutResult, rulesResult, bookingsResult, assignmentsResult, serviceItemsResult] =
    await Promise.all([
      supabase
        .from("blackout_dates")
        .select("starts_at, ends_at, service_id, public_message")
        .eq("is_active", true),
      supabase
        .from("availability_rules")
        .select("day_of_week, capacity")
        .eq("service_id", serviceId)
        .eq("is_active", true),
      supabase
        .from("bookings")
        .select("scheduled_start_at")
        .eq("service_id", serviceId)
        .in("status", ACTIVE_BOOKING_STATUSES)
        .not("scheduled_start_at", "is", null)
        .gte("scheduled_start_at", minInstant),
      supabase
        .from("dumpster_assignments")
        .select(
          "starts_at, ends_at, status, bookings(status), dumpsters(dumpster_sizes(code))",
        )
        .in("status", ["reserved", "assigned"])
        .gte("ends_at", minInstant),
      supabase
        .from("service_items")
        .select("code, dumpster_sizes(code)")
        .eq("item_kind", "rental_package")
        .eq("status", "active"),
    ]);
  // Dumpsters that can go out, per size: the same rule auto-assign uses.
  const fleetResult = await supabase
    .from("dumpsters")
    .select("dumpster_sizes(code)")
    .not("status", "in", "(retired,maintenance,unavailable,inspection_required)");
  const fleetBySize = new Map<string, number>();
  for (const row of ((fleetResult.data ?? []) as unknown as Array<{
    dumpster_sizes: { code: string } | null;
  }>)) {
    const code = row.dumpster_sizes?.code;
    if (code) fleetBySize.set(code, (fleetBySize.get(code) ?? 0) + 1);
  }

  const blackouts = (blackoutResult.data ?? []) as Array<{
    starts_at: string;
    ends_at: string;
    service_id: string | null;
    public_message: string | null;
  }>;
  const rules = (rulesResult.data ?? []) as Array<{
    day_of_week: number;
    capacity: number;
  }>;
  const bookings = (bookingsResult.data ?? []) as Array<{
    scheduled_start_at: string;
  }>;
  const assignments = (assignmentsResult.data ?? []) as unknown as Array<{
    starts_at: string;
    ends_at: string;
    bookings: { status: string } | null;
    dumpsters: { dumpster_sizes: { code: string } | null } | null;
  }>;
  // PostgREST returns this to-one embed as an object, not a single-element
  // array, but the generated types describe it as an array. Cast through
  // unknown (as the assignments embed above does) to the verified shape.
  const serviceItems = (serviceItemsResult.data ?? []) as unknown as Array<{
    code: string;
    dumpster_sizes: { code: string } | null;
  }>;

  const hasRules = rules.length > 0;

  const capacityByWeekday = new Map<number, number>();
  for (const rule of rules) {
    capacityByWeekday.set(
      rule.day_of_week,
      (capacityByWeekday.get(rule.day_of_week) ?? 0) + rule.capacity,
    );
  }

  const slotReservedByDate = new Map<string, number>();
  for (const booking of bookings) {
    const day = denverDate(booking.scheduled_start_at);
    slotReservedByDate.set(day, (slotReservedByDate.get(day) ?? 0) + 1);
  }

  // Per-size occupancy per date, from overlapping active assignments.
  const occupancyBySize = new Map<string, Map<string, number>>();
  for (const assignment of assignments) {
    const code = assignment.dumpsters?.dumpster_sizes?.code;
    if (!code) continue;
    // Ignore assignments whose booking was cancelled (or is still a draft) —
    // those must not hold dates for other customers.
    if (!ACTIVE_BOOKING_SET.has(assignment.bookings?.status ?? "")) continue;
    const perDate =
      occupancyBySize.get(code) ?? new Map<string, number>();
    occupancyBySize.set(code, perDate);

    let day = denverDate(assignment.starts_at);
    if (day < minDate) day = minDate;
    const end = denverDate(assignment.ends_at);
    const stop = end > maxDate ? maxDate : end;
    for (; day <= stop; day = addDaysIso(day, 1)) {
      perDate.set(day, (perDate.get(day) ?? 0) + 1);
    }
  }

  const findBlackout = (date: string) =>
    blackouts.find(
      (entry) =>
        (entry.service_id === null || entry.service_id === serviceId) &&
        denverDate(entry.starts_at) <= date &&
        date <= denverDate(entry.ends_at),
    );

  // Reasons that apply regardless of size.
  const sharedReason = (date: string): UnavailableReason | null => {
    const blackout = findBlackout(date);
    if (blackout) {
      return {
        date,
        kind: "blackout",
        message: blackout.public_message?.trim() || "This date is unavailable.",
      };
    }
    if (hasRules) {
      const capacity = capacityByWeekday.get(weekdayOf(date)) ?? 0;
      if (capacity <= 0) {
        return { date, kind: "closed", message: "We don't deliver on this day." };
      }
      if ((slotReservedByDate.get(date) ?? 0) >= capacity) {
        return { date, kind: "reserved", message: "This date is fully reserved." };
      }
    }
    return null;
  };

  const bySizeKey: Record<string, UnavailableReason[]> = {};
  for (const serviceItem of serviceItems) {
    const sizeKey = serviceItem.code;
    const code = serviceItem.dumpster_sizes?.code;
    // A missing size link only disables the size-specific occupancy check.
    // Blackouts and closed weekdays still apply: failing open here would offer
    // customers dates the business has closed.
    const occupancy = code ? occupancyBySize.get(code) : undefined;
    // A date is booked out only when every dumpster of the size is in use,
    // so a second 15-yard adds real capacity.
    const fleet = Math.max(1, code ? (fleetBySize.get(code) ?? 0) : 1);
    const list: UnavailableReason[] = [];

    for (let date = minDate; date <= maxDate; date = addDaysIso(date, 1)) {
      const shared = sharedReason(date);
      if (shared) {
        list.push(shared);
        continue;
      }
      // Size-specific: blocked once every dumpster of this size is out.
      if ((occupancy?.get(date) ?? 0) >= fleet) {
        list.push({
          date,
          kind: "booked",
          message: "This dumpster size is already booked for this date.",
        });
      }
    }

    bySizeKey[sizeKey] = list;
  }

  return { minDate, maxDate, bySizeKey, hasRules };
}

export type DeliveryDateCheck =
  | { available: true }
  | { available: false; message: string };

/**
 * Server-side guard used at submit time so a posted date must satisfy the same
 * rules the calendar enforces for the chosen size.
 */
export async function checkDeliveryDate(
  supabase: AdminDb,
  serviceId: string,
  sizeKey: string,
  date: string,
  rentalDays: number,
): Promise<DeliveryDateCheck> {
  const availability = await getDeliveryAvailability(supabase, serviceId);
  if (date < availability.minDate) {
    return { available: false, message: "This date has already passed." };
  }
  if (date > availability.maxDate) {
    return { available: false, message: "Please choose a delivery date sooner." };
  }
  // The whole rental, delivery through pickup, must fit, not just day one.
  const reason = rentalWindowConflict(
    availability.bySizeKey[sizeKey] ?? [],
    date,
    rentalDays,
  );
  if (reason) {
    return { available: false, message: reason.message };
  }
  return { available: true };
}
