"use server";

import { createAdminClient } from "@/lib/supabase/admin";

import { checkDeliveryDate } from "./availability";
import { loadBookingSizeOptionByKey } from "./catalog";
import { PREPAYMENT_AGREEMENT_VERSION } from "./options";
import {
  createCustomerAndAddress,
  denverDayEndWithRentalDays,
  denverDayStart,
  extractBookingSubmission,
  recordTransactionalConsents,
  resolveDumpsterServiceId,
  resolveServiceItemId,
  savePlacementPhoto,
  verifyTurnstile,
} from "./records";
import { bookingDraftSchema, SIZE_KEY_TO_ITEM_CODE } from "./schema";
import type { CheckoutResult } from "./types";

/**
 * Creates a real booking immediately for a priced dumpster rental.
 *
 * This is a temporary test mode path that bypasses Stripe so the team can
 * exercise the full booking and admin workflow end to end before payment is
 * turned back on. The booking lands in `pending_review`, which behaves like a
 * submitted paid reservation without marking it operationally confirmed.
 */
export async function createBookingCheckout(
  raw: unknown,
): Promise<CheckoutResult> {
  const { input: candidate, placementPhoto } = extractBookingSubmission(raw);
  const parsed = bookingDraftSchema.safeParse(candidate);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;

  const rate = await loadBookingSizeOptionByKey(input.sizeKey);
  if (!rate || rate.price.type !== "fixed") {
    return {
      ok: false,
      quoteRequired: true,
      error: "This container needs a custom quote. Submit a quote request instead.",
    };
  }

  if (!(await verifyTurnstile(input.turnstileToken))) {
    return { ok: false, error: "Spam check failed. Please try again." };
  }

  const supabase = createAdminClient();

  let serviceId: string;
  let serviceItemId: string;
  let serviceAreaConfirmed: boolean;
  try {
    serviceId = await resolveDumpsterServiceId(supabase);
    serviceItemId = await resolveServiceItemId(
      supabase,
      SIZE_KEY_TO_ITEM_CODE[input.sizeKey],
    );
  } catch {
    return { ok: false, error: "Dumpster service is unavailable right now." };
  }

  const availability = await checkDeliveryDate(
    supabase,
    serviceId,
    input.sizeKey,
    input.neededDate,
  );
  if (!availability.available) {
    return {
      ok: false,
      error: availability.message,
      fieldErrors: { neededDate: availability.message },
    };
  }

  let customerId: string;
  let serviceAddressId: string;
  try {
    const created = await createCustomerAndAddress(supabase, input);
    customerId = created.customerId;
    serviceAddressId = created.serviceAddressId;
    serviceAreaConfirmed =
      created.serviceArea.status === "validated" ||
      created.serviceArea.status === "extended";
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save your request.",
    };
  }

  const bookingInsert = await supabase
    .from("bookings")
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      service_item_id: serviceItemId,
      service_address_id: serviceAddressId,
      status: "pending_review",
      scheduled_start_at: denverDayStart(input.neededDate),
      scheduled_end_at: denverDayEndWithRentalDays(
        input.neededDate,
        input.rentalDays,
      ),
      customer_instructions: input.placementNotes ?? null,
      agreement_version: PREPAYMENT_AGREEMENT_VERSION,
      agreement_accepted_at: new Date().toISOString(),
    })
    .select("id, booking_number")
    .single();
  if (bookingInsert.error || !bookingInsert.data) {
    return { ok: false, error: "Could not start your booking. Please retry." };
  }
  const bookingId = bookingInsert.data.id as string;
  const bookingNumber = bookingInsert.data.booking_number as number;

  if (placementPhoto) {
    const photo = await savePlacementPhoto(supabase, {
      customerId,
      bookingId,
      file: placementPhoto,
    });
    if (photo.error) {
      await supabase.from("bookings").delete().eq("id", bookingId);
      return { ok: false, error: photo.error };
    }
  }

  await recordTransactionalConsents(supabase, customerId, input);
  return { ok: true, bookingNumber, serviceAreaConfirmed };
}
