import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AdminDb = SupabaseClient;

export type AutoAssignResult =
  | { ok: true; assetNumber: string }
  | { ok: false; reason: string };

/**
 * Reserves a physical container for a booking the customer has paid for.
 *
 * The customer chooses a size/package at checkout, not a specific asset, so
 * until this runs the booking has no container held for it. Size matching uses
 * dumpster_size_id, the same rule staff assignment enforces, so automatic and
 * manual assignment cannot disagree.
 *
 * Status is 'reserved' rather than 'assigned': the container is held for the
 * dates, but no one has physically staged it yet.
 *
 * Overlaps are prevented by a GIST exclusion constraint on
 * (dumpster_id, assignment_window) rather than by the pre-check below, so two
 * simultaneous payments cannot both take the last container. The pre-check only
 * avoids wasted insert attempts; a constraint violation falls through to the
 * next candidate.
 */
export async function autoAssignDumpster(
  supabase: AdminDb,
  params: {
    bookingId: string;
    serviceItemId: string | null;
    startsAt: string | null;
    endsAt: string | null;
  },
): Promise<AutoAssignResult> {
  const { bookingId, serviceItemId, startsAt, endsAt } = params;

  if (!serviceItemId || !startsAt || !endsAt) {
    return { ok: false, reason: "booking has no service item or schedule" };
  }

  const existing = await supabase
    .from("dumpster_assignments")
    .select("id")
    .eq("booking_id", bookingId)
    .in("status", ["reserved", "assigned"])
    .limit(1);
  if (existing.data?.length) {
    return { ok: false, reason: "booking already holds a container" };
  }

  const serviceItem = await supabase
    .from("service_items")
    .select("dumpster_size_id")
    .eq("id", serviceItemId)
    .maybeSingle();

  const sizeId = (serviceItem.data as { dumpster_size_id: string | null } | null)
    ?.dumpster_size_id;
  if (!sizeId) {
    return { ok: false, reason: "service item has no dumpster size" };
  }

  // Exclude only containers unfit to send out. Operational states like
  // at_customer or in_transit stay eligible — a container out today can still
  // be free for a future window, and the date conflict check below decides.
  const candidatesResult = await supabase
    .from("dumpsters")
    .select("id, asset_number")
    .eq("dumpster_size_id", sizeId)
    .not(
      "status",
      "in",
      "(retired,maintenance,unavailable,inspection_required)",
    )
    .order("asset_number");

  if (candidatesResult.error) {
    return {
      ok: false,
      reason: `container lookup failed: ${candidatesResult.error.message}`,
    };
  }

  const candidates =
    (candidatesResult.data as Array<{ id: string; asset_number: string }> | null) ??
    [];
  if (candidates.length === 0) {
    return { ok: false, reason: "no containers exist for this size" };
  }

  // One query for every candidate's conflicts, rather than per-candidate.
  const conflictsResult = await supabase
    .from("dumpster_assignments")
    .select("dumpster_id")
    .in(
      "dumpster_id",
      candidates.map((candidate) => candidate.id),
    )
    .in("status", ["reserved", "assigned"])
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt);

  const taken = new Set(
    ((conflictsResult.data as Array<{ dumpster_id: string }> | null) ?? []).map(
      (row) => row.dumpster_id,
    ),
  );

  const free = candidates.filter((candidate) => !taken.has(candidate.id));
  if (free.length === 0) {
    return { ok: false, reason: "every container of this size is already held" };
  }

  for (const candidate of free) {
    const insert = await supabase.from("dumpster_assignments").insert({
      booking_id: bookingId,
      dumpster_id: candidate.id,
      status: "reserved",
      starts_at: startsAt,
      ends_at: endsAt,
    });

    if (!insert.error) {
      // The assignment row is what holds the dates. The container's own status
      // is left alone: writing "reserved" onto it went stale as soon as the
      // rental ended, because nothing switched it back. Inventory derives
      // "Reserved" from active assignments instead.
      return { ok: true, assetNumber: candidate.asset_number };
    }

    // Lost a race for this container — try the next one.
    const message = insert.error.message?.toLowerCase() ?? "";
    if (!message.includes("overlap") && !message.includes("exclusion")) {
      return { ok: false, reason: `assignment failed: ${insert.error.message}` };
    }
  }

  return { ok: false, reason: "every container of this size was taken" };
}
