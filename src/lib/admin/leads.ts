"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/staff";
import { resolveDumpsterServiceId } from "@/lib/booking/records";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

import { BOOKING_STATUSES } from "./booking-status";
import { QUOTE_STATUSES } from "./quote-status";

const PRODUCTION_BOOKING_STATUSES = new Set([
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
] as const);

function needsPublishedPricingStatus(
  status: (typeof BOOKING_STATUSES)[number],
): status is "confirmed" | "scheduled" | "in_progress" | "completed" {
  return PRODUCTION_BOOKING_STATUSES.has(
    status as "confirmed" | "scheduled" | "in_progress" | "completed",
  );
}

const manualBookingSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(80),
    lastName: z.string().trim().min(1, "Last name is required.").max(80),
    email: z.string().trim().email("Enter a valid email."),
    phone: z.string().trim().min(7, "Phone is required.").max(30),
    addressLine1: z.string().trim().min(1, "Address is required.").max(120),
    city: z.string().trim().min(1, "City is required.").max(80),
    region: z.string().trim().min(2, "State is required.").max(40),
    postalCode: z.string().trim().min(5, "ZIP code is required.").max(10),
    serviceItemId: z.string().uuid("Choose a dumpster size."),
    dumpsterId: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined))
      .refine((value) => value === undefined || z.string().uuid().safeParse(value).success, {
        message: "Choose a valid dumpster.",
      }),
    status: z.enum(BOOKING_STATUSES),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date."),
    customerInstructions: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => (value ? value : undefined)),
    priceCents: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number(value) : undefined)),
    latitude: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number(value) : undefined)),
    longitude: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number(value) : undefined)),
    placeId: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export type ManualBookingFormState = { error?: string; success?: string };

function denverDayStart(date: string): string {
  return `${date}T09:00:00-07:00`;
}

function denverDayEnd(date: string): string {
  return `${date}T18:00:00-07:00`;
}

function leadsPathWithMessage(
  kind: "notice" | "error",
  message: string,
): string {
  return `/admin/leads?${kind}=${encodeURIComponent(message)}`;
}

type AssignableBooking = {
  id: string;
  booking_number: number;
  status: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  service_items: { dumpster_size_id: string | null } | null;
};

async function assignDumpsterToBookingInternal(params: {
  supabase: ReturnType<typeof createAdminClient>;
  staffUserId: string;
  booking: AssignableBooking;
  dumpsterId: string;
}): Promise<{ ok: true; dumpsterAssetNumber: string } | { ok: false; error: string }> {
  const { supabase, staffUserId, booking, dumpsterId } = params;

  if (
    booking.status === "draft" ||
    booking.status === "cancelled" ||
    !booking.scheduled_start_at ||
    !booking.scheduled_end_at
  ) {
    return {
      ok: false,
      error: "Only active scheduled bookings can hold a dumpster assignment.",
    };
  }

  const requiredSizeId = booking.service_items?.dumpster_size_id;
  if (!requiredSizeId) {
    return {
      ok: false,
      error: "This booking does not have a dumpster size attached to it.",
    };
  }

  const dumpsterResult = await supabase
    .from("dumpsters")
    .select("id, asset_number, dumpster_size_id")
    .eq("id", dumpsterId)
    .single();
  const dumpster = dumpsterResult.data as
    | { id: string; asset_number: string; dumpster_size_id: string }
    | null;

  if (dumpsterResult.error || !dumpster) {
    return { ok: false, error: "Could not find that dumpster." };
  }
  if (dumpster.dumpster_size_id !== requiredSizeId) {
    return {
      ok: false,
      error: "That dumpster does not match the size required for this booking.",
    };
  }

  const conflictResult = await supabase
    .from("dumpster_assignments")
    .select("id")
    .eq("dumpster_id", dumpster.id)
    .in("status", ["reserved", "assigned"])
    .neq("booking_id", booking.id)
    .lt("starts_at", booking.scheduled_end_at)
    .gt("ends_at", booking.scheduled_start_at)
    .limit(1);
  if (conflictResult.error) {
    return { ok: false, error: "Could not verify dumpster availability." };
  }
  if ((conflictResult.data ?? []).length > 0) {
    return {
      ok: false,
      error: `${dumpster.asset_number} is already assigned during that booking window.`,
    };
  }

  const insertResult = await supabase.from("dumpster_assignments").insert({
    booking_id: booking.id,
    dumpster_id: dumpster.id,
    status: "assigned",
    starts_at: booking.scheduled_start_at,
    ends_at: booking.scheduled_end_at,
    assigned_by: staffUserId,
  });
  if (insertResult.error) {
    const message = insertResult.error.message?.toLowerCase().includes("overlap")
      ? `${dumpster.asset_number} is already booked for those dates.`
      : "Could not assign that dumpster.";
    return { ok: false, error: message };
  }

  // The assignment row holds the dates; the container's own status is not set
  // to "reserved" (it went stale after the rental ended). Inventory derives
  // "Reserved" from active assignments instead.
  return { ok: true, dumpsterAssetNumber: dumpster.asset_number };
}

export async function updateQuoteStatus(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(QUOTE_STATUSES as readonly string[]).includes(status)) {
    redirect(leadsPathWithMessage("error", "Could not update that quote status."));
  }
  const supabase = createAdminClient();
  const result = await supabase.from("quotes").update({ status }).eq("id", id);
  if (result.error) {
    redirect(leadsPathWithMessage("error", "Could not update that quote status."));
  }
  revalidatePath("/admin/leads");
  redirect(leadsPathWithMessage("notice", "Quote status updated."));
}

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(BOOKING_STATUSES as readonly string[]).includes(status)) {
    redirect(leadsPathWithMessage("error", "Could not update that booking status."));
  }
  const supabase = createAdminClient();

  const bookingUpdate = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("id")
    .single();
  if (bookingUpdate.error || !bookingUpdate.data) {
    const message =
      bookingUpdate.error?.message ===
      "production booking status requires a finalized non-zero snapshot from currently published pricing"
        ? "This booking cannot move to a confirmed status yet. Its saved price snapshot is not tied to a currently published pricing version."
        : bookingUpdate.error?.message ??
          "Could not update that booking status.";
    redirect(leadsPathWithMessage("error", message));
  }

  if (status === "cancelled") {
    const assignmentsResult = await supabase
      .from("dumpster_assignments")
      .select("id, dumpster_id, status")
      .eq("booking_id", id)
      .in("status", ["reserved", "assigned"]);

    const assignments =
      (assignmentsResult.data as
        | Array<{ id: string; dumpster_id: string; status: string }>
        | null) ?? [];

    if (assignments.length > 0) {
      await supabase
        .from("dumpster_assignments")
        .update({ status: "cancelled" })
        .in(
          "id",
          assignments.map((assignment) => assignment.id),
        );

      const dumpsterIds = [...new Set(assignments.map((assignment) => assignment.dumpster_id))];
      if (dumpsterIds.length > 0) {
        const activeAssignmentsResult = await supabase
          .from("dumpster_assignments")
          .select("dumpster_id, status")
          .in("dumpster_id", dumpsterIds)
          .in("status", ["reserved", "assigned"]);

        const activeDumpsterIds = new Set(
          ((activeAssignmentsResult.data as Array<{ dumpster_id: string }> | null) ?? []).map(
            (assignment) => assignment.dumpster_id,
          ),
        );
        const releasableDumpsterIds = dumpsterIds.filter(
          (dumpsterId) => !activeDumpsterIds.has(dumpsterId),
        );

        if (releasableDumpsterIds.length > 0) {
          await supabase
            .from("dumpsters")
            .update({ status: "available" })
            .in("id", releasableDumpsterIds)
            .eq("status", "reserved");
        }
      }
    }
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/inventory");
  redirect(leadsPathWithMessage("notice", "Booking status updated."));
}

export async function assignBookingDumpster(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const bookingId = String(formData.get("bookingId") ?? "");
  const dumpsterId = String(formData.get("dumpsterId") ?? "");

  if (!bookingId) {
    redirect(leadsPathWithMessage("error", "Could not find that booking."));
  }

  const supabase = createAdminClient();
  const bookingResult = await supabase
    .from("bookings")
    .select(
      "id, booking_number, status, scheduled_start_at, scheduled_end_at, service_item_id, service_items(dumpster_size_id)",
    )
    .eq("id", bookingId)
    .single();

  const booking = bookingResult.data as
    | {
        id: string;
        booking_number: number;
        status: string;
        scheduled_start_at: string | null;
        scheduled_end_at: string | null;
        service_item_id: string | null;
        service_items: { dumpster_size_id: string | null } | null;
      }
    | null;

  if (bookingResult.error || !booking) {
    redirect(leadsPathWithMessage("error", "Could not find that booking."));
  }

  if (
    booking.status === "draft" ||
    booking.status === "cancelled" ||
    !booking.scheduled_start_at ||
    !booking.scheduled_end_at
  ) {
    redirect(
      leadsPathWithMessage(
        "error",
        "Only active scheduled bookings can hold a dumpster assignment.",
      ),
    );
  }

  const requiredSizeId = booking.service_items?.dumpster_size_id;
  if (!requiredSizeId) {
    redirect(
      leadsPathWithMessage(
        "error",
        "This booking does not have a dumpster size attached to it.",
      ),
    );
  }

  const activeAssignmentsResult = await supabase
    .from("dumpster_assignments")
    .select("id, dumpster_id, status")
    .eq("booking_id", bookingId)
    .in("status", ["reserved", "assigned"]);
  const activeAssignments =
    (activeAssignmentsResult.data as
      | Array<{ id: string; dumpster_id: string; status: string }>
      | null) ?? [];

  if (!dumpsterId) {
    if (activeAssignments.length > 0) {
      await supabase
        .from("dumpster_assignments")
        .update({ status: "released" })
        .in(
          "id",
          activeAssignments.map((assignment) => assignment.id),
        );

      const dumpsterIds = [...new Set(activeAssignments.map((assignment) => assignment.dumpster_id))];
      if (dumpsterIds.length > 0) {
        const stillActiveAssignmentsResult = await supabase
          .from("dumpster_assignments")
          .select("dumpster_id")
          .in("dumpster_id", dumpsterIds)
          .in("status", ["reserved", "assigned"]);

        const stillActiveDumpsterIds = new Set(
          ((stillActiveAssignmentsResult.data as Array<{ dumpster_id: string }> | null) ?? []).map(
            (assignment) => assignment.dumpster_id,
          ),
        );
        const releasableDumpsterIds = dumpsterIds.filter(
          (id) => !stillActiveDumpsterIds.has(id),
        );

        if (releasableDumpsterIds.length > 0) {
          await supabase
            .from("dumpsters")
            .update({ status: "available" })
            .in("id", releasableDumpsterIds)
            .eq("status", "reserved");
        }
      }
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    redirect(leadsPathWithMessage("notice", `Dumpster released from booking #${booking.booking_number}.`));
  }

  const dumpsterResult = await supabase
    .from("dumpsters")
    .select("id, asset_number, dumpster_size_id")
    .eq("id", dumpsterId)
    .single();
  const dumpster = dumpsterResult.data as
    | { id: string; asset_number: string; dumpster_size_id: string }
    | null;

  if (dumpsterResult.error || !dumpster) {
    redirect(leadsPathWithMessage("error", "Could not find that dumpster."));
  }
  if (dumpster.dumpster_size_id !== requiredSizeId) {
    redirect(
      leadsPathWithMessage(
        "error",
        "That dumpster does not match the size required for this booking.",
      ),
    );
  }

  const conflictResult = await supabase
    .from("dumpster_assignments")
    .select("id, booking_id")
    .eq("dumpster_id", dumpster.id)
    .in("status", ["reserved", "assigned"])
    .neq("booking_id", bookingId)
    .lt("starts_at", booking.scheduled_end_at)
    .gt("ends_at", booking.scheduled_start_at)
    .limit(1);
  if (conflictResult.error) {
    redirect(leadsPathWithMessage("error", "Could not verify dumpster availability."));
  }
  if ((conflictResult.data ?? []).length > 0) {
    redirect(
      leadsPathWithMessage(
        "error",
        `${dumpster.asset_number} is already assigned during that booking window.`,
      ),
    );
  }

  const currentAssignment = activeAssignments[0] ?? null;
  if (currentAssignment && currentAssignment.dumpster_id === dumpster.id) {
    const sameAssignmentUpdate = await supabase
      .from("dumpster_assignments")
      .update({ status: "assigned" })
      .eq("id", currentAssignment.id);
    if (sameAssignmentUpdate.error) {
      redirect(leadsPathWithMessage("error", "Could not update that dumpster assignment."));
    }

    revalidatePath("/admin/leads");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    redirect(leadsPathWithMessage("notice", `${dumpster.asset_number} is assigned to booking #${booking.booking_number}.`));
  }

  if (activeAssignments.length > 0) {
    await supabase
      .from("dumpster_assignments")
      .update({ status: "released" })
      .in(
        "id",
        activeAssignments.map((assignment) => assignment.id),
      );

    const previousDumpsterIds = [...new Set(activeAssignments.map((assignment) => assignment.dumpster_id))];
    if (previousDumpsterIds.length > 0) {
      const stillActiveAssignmentsResult = await supabase
        .from("dumpster_assignments")
        .select("dumpster_id")
        .in("dumpster_id", previousDumpsterIds)
        .in("status", ["reserved", "assigned"]);

      const stillActiveDumpsterIds = new Set(
        ((stillActiveAssignmentsResult.data as Array<{ dumpster_id: string }> | null) ?? []).map(
          (assignment) => assignment.dumpster_id,
        ),
      );
      const releasableDumpsterIds = previousDumpsterIds.filter(
        (id) => !stillActiveDumpsterIds.has(id),
      );

      if (releasableDumpsterIds.length > 0) {
        await supabase
          .from("dumpsters")
          .update({ status: "available" })
          .in("id", releasableDumpsterIds)
          .eq("status", "reserved");
      }
    }
  }

  const insertResult = await supabase.from("dumpster_assignments").insert({
    booking_id: bookingId,
    dumpster_id: dumpster.id,
    status: "assigned",
    starts_at: booking.scheduled_start_at,
    ends_at: booking.scheduled_end_at,
    assigned_by: staff.userId,
  });
  if (insertResult.error) {
    const message = insertResult.error.message?.toLowerCase().includes("overlap")
      ? `${dumpster.asset_number} is already booked for those dates.`
      : "Could not assign that dumpster.";
    redirect(leadsPathWithMessage("error", message));
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  redirect(leadsPathWithMessage("notice", `${dumpster.asset_number} assigned to booking #${booking.booking_number}.`));
}

export async function createManualBooking(
  _previous: ManualBookingFormState,
  formData: FormData,
): Promise<ManualBookingFormState> {
  const staff = await requireStaff();

  const parsed = manualBookingSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
    region: formData.get("region"),
    postalCode: formData.get("postalCode"),
    serviceItemId: formData.get("serviceItemId"),
    dumpsterId: formData.get("dumpsterId") ?? undefined,
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    customerInstructions: formData.get("customerInstructions") ?? undefined,
    priceCents: formData.get("priceCents") ?? undefined,
    latitude: formData.get("latitude") ?? undefined,
    longitude: formData.get("longitude") ?? undefined,
    placeId: formData.get("placeId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const input = parsed.data;
  const needsPublishedPricing = needsPublishedPricingStatus(input.status);
  if (needsPublishedPricing && (!input.priceCents || input.priceCents <= 0)) {
    return { error: "Confirmed or scheduled bookings need a non-zero price in cents." };
  }

  const supabase = createAdminClient();
  const [serviceIdResult, serviceAreaResult, pricingVersionResult] =
    await Promise.all([
      resolveDumpsterServiceId(supabase),
      supabase
        .from("service_areas")
        .select("id")
        .eq("status", "active")
        .order("created_at")
        .limit(1)
        .single(),
      needsPublishedPricing
        ? supabase
            .from("pricing_versions")
            .select("id")
            .eq("status", "published")
            .lte("effective_from", new Date().toISOString())
            .or("effective_to.is.null,effective_to.gt." + new Date().toISOString())
            .order("effective_from", { ascending: false })
            .limit(1)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (!serviceAreaResult.data || serviceAreaResult.error) {
    return { error: "No active service area is configured for manual bookings." };
  }
  if (needsPublishedPricing && (!pricingVersionResult.data || pricingVersionResult.error)) {
    return { error: "No published pricing version is available for that booking status." };
  }

  const customerResult = await supabase
    .from("customers")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
    })
    .select("id")
    .single();
  if (!customerResult.data || customerResult.error) {
    return { error: "Could not save the customer." };
  }

  const addressResult = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: customerResult.data.id,
      address_line_1: input.addressLine1,
      city: input.city,
      region: input.region,
      postal_code: input.postalCode,
      country_code: "US",
      latitude:
        input.latitude != null && Number.isFinite(input.latitude)
          ? input.latitude
          : null,
      longitude:
        input.longitude != null && Number.isFinite(input.longitude)
          ? input.longitude
          : null,
      validation_status: "validated",
      validation_provider: input.placeId ? "google_places" : null,
      validation_reference: input.placeId ?? null,
      service_area_id: serviceAreaResult.data.id,
      is_default: true,
    })
    .select("id")
    .single();
  if (!addressResult.data || addressResult.error) {
    return { error: "Could not save the address." };
  }

  const bookingInsert = await supabase
    .from("bookings")
    .insert({
      customer_id: customerResult.data.id,
      service_id: serviceIdResult,
      service_item_id: input.serviceItemId,
      service_address_id: addressResult.data.id,
      status: needsPublishedPricing ? "draft" : input.status,
      scheduled_start_at: denverDayStart(input.startDate),
      scheduled_end_at: denverDayEnd(input.endDate),
      timezone: "America/Denver",
      customer_instructions: input.customerInstructions ?? null,
    })
    .select("id, booking_number")
    .single();
  if (!bookingInsert.data || bookingInsert.error) {
    return { error: "Could not create the booking." };
  }

  const serviceItemResult = await supabase
    .from("service_items")
    .select("dumpster_size_id")
    .eq("id", input.serviceItemId)
    .single();
  if (serviceItemResult.error) {
    return { error: "Booking was created, but the dumpster size could not be loaded for assignment." };
  }

  const bookingForAssignment: AssignableBooking = {
    id: bookingInsert.data.id,
    booking_number: bookingInsert.data.booking_number,
    status: input.status,
    scheduled_start_at: denverDayStart(input.startDate),
    scheduled_end_at: denverDayEnd(input.endDate),
    service_items: {
      dumpster_size_id:
        (serviceItemResult.data as { dumpster_size_id: string | null } | null)
          ?.dumpster_size_id ?? null,
    },
  };

  if (needsPublishedPricing) {
    const snapshotInsert = await supabase.from("booking_price_snapshots").insert({
      booking_id: bookingInsert.data.id,
      revision_number: 1,
      pricing_version_id: pricingVersionResult.data?.id,
      snapshot_type: "fixed_amount",
      currency_code: "USD",
      subtotal_cents: input.priceCents,
      discount_cents: 0,
      tax_cents: 0,
      total_cents: input.priceCents,
      snapshot_payload: {
        currency: "USD",
        total_cents: input.priceCents,
        source: "admin_manual_booking",
      },
      finalized_at: new Date().toISOString(),
      created_by: staff.userId,
    });
    if (snapshotInsert.error) {
      await supabase.from("bookings").delete().eq("id", bookingInsert.data.id);
      return { error: "Could not create the booking price snapshot." };
    }

    const statusUpdate = await supabase
      .from("bookings")
      .update({ status: input.status })
      .eq("id", bookingInsert.data.id);
    if (statusUpdate.error) {
      return { error: "Booking was created, but the status could not be finalized." };
    }
  }

  if (input.dumpsterId) {
    const assignmentResult = await assignDumpsterToBookingInternal({
      supabase,
      staffUserId: staff.userId,
      booking: bookingForAssignment,
      dumpsterId: input.dumpsterId,
    });

    if (!assignmentResult.ok) {
      return {
        error: `Booking #${bookingInsert.data.booking_number} was created, but the dumpster was not assigned: ${assignmentResult.error}`,
      };
    }
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return {
    success: `Booking #${bookingInsert.data.booking_number} added${input.dumpsterId ? " and dumpster assigned." : "."}`,
  };
}

/**
 * Removes stored objects and their file rows for a booking or quote. Storage is
 * cleared first: an orphaned database row is recoverable, an orphaned private
 * object is not visible anywhere in the admin.
 */
async function deleteAttachedFiles(
  supabase: ReturnType<typeof createAdminClient>,
  column: "booking_id" | "quote_id",
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const filesResult = await supabase
    .from("files")
    .select("id, bucket_id, object_path, legal_hold")
    .eq(column, id);
  if (filesResult.error) {
    return { ok: false, error: "Could not read attached files." };
  }

  const files =
    (filesResult.data as Array<{
      id: string;
      bucket_id: string;
      object_path: string;
      legal_hold: boolean;
    }> | null) ?? [];
  if (files.length === 0) return { ok: true };

  if (files.some((file) => file.legal_hold)) {
    return { ok: false, error: "A file on this record is under legal hold." };
  }

  const byBucket = new Map<string, string[]>();
  for (const file of files) {
    byBucket.set(file.bucket_id, [
      ...(byBucket.get(file.bucket_id) ?? []),
      file.object_path,
    ]);
  }
  for (const [bucket, paths] of byBucket) {
    await supabase.storage.from(bucket).remove(paths);
  }

  const removed = await supabase
    .from("files")
    .delete()
    .in(
      "id",
      files.map((file) => file.id),
    );
  if (removed.error) {
    return { ok: false, error: "Could not remove attached files." };
  }
  return { ok: true };
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(leadsPathWithMessage("error", "Could not delete that booking."));
  }

  const supabase = createAdminClient();
  const bookingResult = await supabase
    .from("bookings")
    .select("status, booking_number")
    .eq("id", id)
    .single();
  if (bookingResult.error || !bookingResult.data) {
    redirect(leadsPathWithMessage("error", "Could not find that booking."));
  }
  const bookingNumber = bookingResult.data.booking_number as number;
  if (!["draft", "cancelled"].includes(bookingResult.data.status as string)) {
    redirect(
      leadsPathWithMessage(
        "error",
        "Only draft or cancelled bookings can be deleted. Cancel it first.",
      ),
    );
  }

  // Payments are never deletable, and bookings are referenced with ON DELETE
  // RESTRICT, so a paid booking cannot be removed. Say so instead of failing
  // silently.
  const payments = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", id);
  if (payments.error && payments.error.code !== "42P01") {
    redirect(leadsPathWithMessage("error", "Could not check payment records."));
  }
  if ((payments.count ?? 0) > 0) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Booking #${bookingNumber} has a payment record and cannot be deleted. Cancel it instead.`,
      ),
    );
  }

  const files = await deleteAttachedFiles(supabase, "booking_id", id);
  if (!files.ok) {
    redirect(leadsPathWithMessage("error", files.error));
  }

  const snapshots = await supabase
    .from("booking_price_snapshots")
    .select("id")
    .eq("booking_id", id);
  if (snapshots.error) {
    redirect(leadsPathWithMessage("error", "Could not read price snapshots."));
  }
  const snapshotIds = (snapshots.data ?? []).map((row) => row.id as string);
  if (snapshotIds.length > 0) {
    await supabase.from("booking_items").delete().in("booking_price_snapshot_id", snapshotIds);
  }

  await supabase.from("dumpster_assignments").delete().eq("booking_id", id);
  await supabase.from("booking_events").delete().eq("booking_id", id);
  if (snapshotIds.length > 0) {
    await supabase.from("booking_price_snapshots").delete().in("id", snapshotIds);
  }

  const removed = await supabase.from("bookings").delete().eq("id", id);
  if (removed.error) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Could not delete booking #${bookingNumber}: ${removed.error.message}`,
      ),
    );
  }

  revalidatePath("/admin/leads");
  redirect(leadsPathWithMessage("notice", `Booking #${bookingNumber} deleted.`));
}

function parseDollarsToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  // Round after scaling: 3.5 * 100 is 350.00000000000006 in binary floating point.
  return Math.round(Number(cleaned) * 100);
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Requests a refund from Stripe. Deliberately does NOT write the refunded state
 * itself — the verified charge.refunded webhook does, the same way payment
 * state is only ever written by a verified webhook. That also means a refund
 * issued straight from the Stripe dashboard lands in the same place.
 */
export async function refundBookingPayment(formData: FormData): Promise<void> {
  await requireStaff();
  const bookingId = String(formData.get("bookingId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const confirmRaw = String(formData.get("confirmAmount") ?? "");

  if (!bookingId) {
    redirect(leadsPathWithMessage("error", "Could not process that refund."));
  }

  const supabase = createAdminClient();
  const bookingResult = await supabase
    .from("bookings")
    .select("booking_number")
    .eq("id", bookingId)
    .single();
  if (bookingResult.error || !bookingResult.data) {
    redirect(leadsPathWithMessage("error", "Could not find that booking."));
  }
  const bookingNumber = bookingResult.data.booking_number as number;

  const paymentResult = await supabase
    .from("payments")
    .select("id, status, amount_cents, stripe_payment_intent_id, metadata")
    .eq("booking_id", bookingId)
    .eq("status", "succeeded")
    .maybeSingle();

  const payment = paymentResult.data as {
    id: string;
    status: string;
    amount_cents: number;
    stripe_payment_intent_id: string | null;
    metadata: Record<string, unknown> | null;
  } | null;

  if (!payment) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Booking #${bookingNumber} has no settled payment to refund.`,
      ),
    );
  }
  if (!payment.stripe_payment_intent_id) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Booking #${bookingNumber} has no Stripe payment reference.`,
      ),
    );
  }

  const alreadyRefunded =
    typeof payment.metadata?.refunded_amount_cents === "number"
      ? payment.metadata.refunded_amount_cents
      : 0;
  const refundable = payment.amount_cents - alreadyRefunded;
  if (refundable <= 0) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Booking #${bookingNumber} is already fully refunded.`,
      ),
    );
  }

  const amountCents = parseDollarsToCents(amountRaw);
  const confirmCents = parseDollarsToCents(confirmRaw);
  if (amountCents === null) {
    redirect(
      leadsPathWithMessage("error", "Enter a refund amount like 350.00."),
    );
  }
  if (confirmCents === null || confirmCents !== amountCents) {
    redirect(
      leadsPathWithMessage(
        "error",
        "Refund not sent: the confirmation amount did not match.",
      ),
    );
  }
  if (amountCents <= 0) {
    redirect(leadsPathWithMessage("error", "Refund amount must be more than $0."));
  }
  if (amountCents > refundable) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Refund exceeds the ${centsToInput(refundable)} still refundable on booking #${bookingNumber}.`,
      ),
    );
  }

  try {
    await getStripe().refunds.create(
      {
        payment_intent: payment.stripe_payment_intent_id,
        amount: amountCents,
        metadata: {
          bookingId,
          bookingNumber: String(bookingNumber),
        },
      },
      {
        // A double-submit for the same booking and amount reuses the original
        // refund rather than issuing a second one.
        idempotencyKey: `refund_${payment.id}_${alreadyRefunded}_${amountCents}`,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe rejected the refund.";
    console.error("Stripe refund failed", error);
    redirect(leadsPathWithMessage("error", `Refund failed: ${message}`));
  }

  // Mark the request so the row reads "pending" instead of looking unchanged
  // while the charge.refunded webhook is still in flight. The webhook overwrites
  // this with the settled amount, and the marker survives a page refresh.
  await supabase
    .from("payments")
    .update({
      metadata: {
        ...(payment.metadata ?? {}),
        refund_requested_cents: amountCents,
        refund_requested_at: new Date().toISOString(),
      },
    })
    .eq("id", payment.id);

  revalidatePath("/admin/leads");
  redirect(
    leadsPathWithMessage(
      "notice",
      `Refund of $${centsToInput(amountCents)} sent to Stripe for booking #${bookingNumber}. It will appear here once Stripe confirms it.`,
    ),
  );
}

export async function deleteQuote(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    redirect(leadsPathWithMessage("error", "Could not delete that quote."));
  }

  const supabase = createAdminClient();
  const quoteResult = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("id", id)
    .single();
  if (quoteResult.error || !quoteResult.data) {
    redirect(leadsPathWithMessage("error", "Could not find that quote."));
  }
  const quoteNumber = quoteResult.data.quote_number as number;

  const revisionsResult = await supabase
    .from("quote_revisions")
    .select("id")
    .eq("quote_id", id);
  if (revisionsResult.error) {
    redirect(leadsPathWithMessage("error", "Could not read quote revisions."));
  }
  const revisionIds = (revisionsResult.data ?? []).map((row) => row.id as string);

  // A revision that became a booking is that booking's pricing provenance.
  // Removing it would leave the booking unable to explain its own price.
  if (revisionIds.length > 0) {
    const [linkedBookings, linkedSnapshots] = await Promise.all([
      supabase
        .from("bookings")
        .select("booking_number")
        .in("source_quote_revision_id", revisionIds)
        .limit(1),
      supabase
        .from("booking_price_snapshots")
        .select("id", { count: "exact", head: true })
        .in("source_quote_revision_id", revisionIds),
    ]);

    const blockingBooking = (
      linkedBookings.data as Array<{ booking_number: number }> | null
    )?.[0];
    if (blockingBooking || (linkedSnapshots.count ?? 0) > 0) {
      redirect(
        leadsPathWithMessage(
          "error",
          blockingBooking
            ? `Quote #${quoteNumber} became booking #${blockingBooking.booking_number} and cannot be deleted.`
            : `Quote #${quoteNumber} is referenced by a booking price record and cannot be deleted.`,
        ),
      );
    }
  }

  const files = await deleteAttachedFiles(supabase, "quote_id", id);
  if (!files.ok) {
    redirect(leadsPathWithMessage("error", files.error));
  }

  if (revisionIds.length > 0) {
    await supabase.from("quote_items").delete().in("quote_revision_id", revisionIds);
    const removedRevisions = await supabase
      .from("quote_revisions")
      .delete()
      .in("id", revisionIds);
    if (removedRevisions.error) {
      redirect(
        leadsPathWithMessage(
          "error",
          `Could not delete quote #${quoteNumber}: ${removedRevisions.error.message}`,
        ),
      );
    }
  }

  await supabase.from("quote_status_history").delete().eq("quote_id", id);

  const removed = await supabase.from("quotes").delete().eq("id", id);
  if (removed.error) {
    redirect(
      leadsPathWithMessage(
        "error",
        `Could not delete quote #${quoteNumber}: ${removed.error.message}`,
      ),
    );
  }

  revalidatePath("/admin/leads");
  redirect(leadsPathWithMessage("notice", `Quote #${quoteNumber} deleted.`));
}
