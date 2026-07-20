"use server";

import { sendBookingDraftEmails } from "@/lib/resend/send";
import { createAdminClient } from "@/lib/supabase/admin";

import { checkDeliveryDate } from "./availability";
import { PREPAYMENT_AGREEMENT_VERSION } from "./options";
import {
  createCustomerAndAddress,
  extractBookingSubmission,
  recordTransactionalConsents,
  resolveDumpsterServiceId,
  resolveServiceItemId,
  savePlacementPhoto,
  verifyTurnstile,
} from "./records";
import { bookingDraftSchema, SIZE_KEY_TO_ITEM_CODE } from "./schema";
import { checkServiceArea } from "./service-area";
import type { PostalCodeCheck, SubmitBookingResult } from "./types";

export async function checkPostalCodeAction(
  input: {
    postalCode: string;
    latitude?: number | null;
    longitude?: number | null;
  },
): Promise<PostalCodeCheck> {
  if (!/^\d{5}$/.test(input.postalCode.trim())) {
    return { status: "invalid" };
  }
  const result = await checkServiceArea({
    postalCode: input.postalCode.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
  });

  if (result.status === "unconfirmed") {
    return { status: "unconfirmed" };
  }

  return {
    status: result.status,
    distanceMiles: result.distanceMiles,
    includedMiles: result.includedMiles,
    maxMiles: result.maxMiles,
    extraMiles: result.extraMiles,
    surchargeCents: result.surchargeCents,
  };
}

/**
 * Persists a not-yet-paid dumpster request as a draft quote (a lead). Used for
 * the 22-yard "quote required" path and any size we cannot price online yet.
 * Paid sizes go through `createBookingCheckout` instead.
 *
 * Runs through the service-role admin client because there is no customer auth
 * yet; every value is validated server-side first.
 *
 * NOTE: inserts are sequential, not atomic. Before production this should move
 * into a single Postgres function so a mid-way failure cannot orphan records.
 */
export async function submitBookingDraft(
  raw: unknown,
): Promise<SubmitBookingResult> {
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

  if (!(await verifyTurnstile(input.turnstileToken))) {
    return { ok: false, error: "Spam check failed. Please try again." };
  }

  const supabase = createAdminClient();

  let serviceId: string;
  let serviceItemId: string;
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
  let serviceAreaConfirmed: boolean;
  let serviceArea:
    | Awaited<ReturnType<typeof createCustomerAndAddress>>["serviceArea"]
    | null = null;
  try {
    const created = await createCustomerAndAddress(supabase, input);
    customerId = created.customerId;
    serviceAddressId = created.serviceAddressId;
    serviceArea = created.serviceArea;
    serviceAreaConfirmed =
      created.serviceArea.status === "validated" ||
      created.serviceArea.status === "extended";
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save your request.",
    };
  }

  const quoteInsert = await supabase
    .from("quotes")
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      service_item_id: serviceItemId,
      service_address_id: serviceAddressId,
      status: "draft",
      request_details: {
        flow: "dumpster_booking",
        version: "booking_flow_v1_test_mode",
        size_key: input.sizeKey,
        service_item_code: SIZE_KEY_TO_ITEM_CODE[input.sizeKey],
        rental_days: input.rentalDays,
        needed_date: input.neededDate,
        placement_notes: input.placementNotes ?? null,
        placement: {
          latitude: input.placementLatitude ?? null,
          longitude: input.placementLongitude ?? null,
        },
        service_area_check: serviceAreaConfirmed ? "validated" : "unconfirmed",
        delivery_pricing:
          !serviceArea || serviceArea.status === "unconfirmed"
            ? null
            : {
                status: serviceArea.status,
                distance_miles: serviceArea.distanceMiles,
                included_miles: serviceArea.includedMiles,
                max_miles: serviceArea.maxMiles,
                surcharge_cents: serviceArea.surchargeCents,
              },
        prepayment_agreement: {
          accepted: input.agreementAccepted,
          version: PREPAYMENT_AGREEMENT_VERSION,
        },
        notifications: { email: input.emailUpdates, sms: input.smsUpdates },
      },
    })
    .select("id, quote_number")
    .single();
  if (quoteInsert.error || !quoteInsert.data) {
    return { ok: false, error: "Could not save your request. Please retry." };
  }

  if (placementPhoto) {
    const photo = await savePlacementPhoto(supabase, {
      customerId,
      quoteId: quoteInsert.data.id as string,
      file: placementPhoto,
    });
    if (photo.error) {
      return { ok: false, error: photo.error };
    }
  }

  await recordTransactionalConsents(supabase, customerId, input);

  try {
    await sendBookingDraftEmails({
      quoteNumber: quoteInsert.data.quote_number as number,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      sizeKey: input.sizeKey,
      neededDate: input.neededDate,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2 ?? null,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      placementNotes: input.placementNotes ?? null,
      serviceAreaConfirmed,
    });
  } catch (error) {
    console.error("Booking draft email send failed", error);
  }

  return {
    ok: true,
    quoteNumber: quoteInsert.data.quote_number as number,
    serviceAreaConfirmed,
  };
}
