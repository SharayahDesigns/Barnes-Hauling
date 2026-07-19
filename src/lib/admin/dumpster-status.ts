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

export function humanizeStatus(status: string): string {
  return status.replace(/_/g, " ");
}
