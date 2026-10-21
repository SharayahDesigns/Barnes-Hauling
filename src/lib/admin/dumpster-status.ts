// Dumpster lifecycle statuses (mirrors the public.dumpster_status enum).
export const DUMPSTER_STATUSES = [
  "available",
  "reserved",
  "scheduled_for_delivery",
  "in_transit",
  "at_customer",
  "pickup_requested",
  "scheduled_for_pickup",
  "in_transit_to_disposal_site",
  "at_disposal_site",
  "returning",
  "inspection_required",
  "maintenance",
  "unavailable",
  "retired",
] as const;

export type DumpsterStatus = (typeof DUMPSTER_STATUSES)[number];

/**
 * Statuses staff can set by hand. "reserved" is excluded: whether a container
 * is reserved comes from its booking assignments (see isAssignmentActive), so
 * a hand-set value would only drift out of date.
 */
export const MANUAL_DUMPSTER_STATUSES = DUMPSTER_STATUSES.filter(
  (status) => status !== "reserved",
);

/** Assignment statuses that hold a container for a booking. */
export const HOLDING_ASSIGNMENT_STATUSES = ["reserved", "assigned"] as const;

/**
 * An assignment holds its container only while it is reserved/assigned and
 * its rental window has not ended yet. Ended windows no longer block anything,
 * even if nobody marked the assignment released.
 */
export function isAssignmentActive(
  assignment: { status: string; ends_at: string },
  now: Date = new Date(),
): boolean {
  return (
    (HOLDING_ASSIGNMENT_STATUSES as readonly string[]).includes(assignment.status) &&
    new Date(assignment.ends_at).getTime() > now.getTime()
  );
}

export function humanizeStatus(status: string): string {
  return status.replace(/_/g, " ");
}
