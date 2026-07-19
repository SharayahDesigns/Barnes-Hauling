"use server";

import { sendBookingDraftEmails } from "@/lib/resend/send";
import { createAdminClient } from "@/lib/supabase/admin";

import { checkDeliveryDate } from "./availability";
import { PREPAYMENT_AGREEMENT_VERSION } from "./options";
import {
  createCustomerAndAddress,
  recordTransactionalConsents,
  resolveDumpsterServiceId,
  resolveServiceItemId,
  verifyTurnstile,
} from "./records";
import { bookingDraftSchema, SIZE_KEY_TO_ITEM_CODE } from "./schema";
import { checkServiceArea } from "./service-area";
import type { PostalCodeCheck, SubmitBookingResult } from "./types";

export async function checkPostalCodeAction(
  postalCode: string,
): Promise<PostalCodeCheck> {
  if (!/^\d{5}$/.test(postalCode.trim())) {
    return { status: "invalid" };
  }
  const result = await checkServiceArea(postalCode.trim());
  return { status: result.status };
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
  const parsed = bookingDraftSchema.safeParse(raw);
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
  try {
    const created = await createCustomerAndAddress(supabase, input);
    customerId = created.customerId;
    serviceAddressId = created.serviceAddressId;
    serviceAreaConfirmed = created.serviceArea.status === "validated";
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
        needed_date: input.neededDate,
        placement_notes: input.placementNotes ?? null,
        placement: {
          latitude: input.placementLatitude ?? null,
          longitude: input.placementLongitude ?? null,
        },
        service_area_check: serviceAreaConfirmed ? "validated" : "unconfirmed",
        prepayment_agreement: {
          accepted: input.agreementAccepted,
          version: PREPAYMENT_AGREEMENT_VERSION,
        },
        notifications: { email: input.emailUpdates, sms: input.smsUpdates },
      },
    })
    .select("quote_number")
    .single();
  if (quoteInsert.error || !quoteInsert.data) {
    return { ok: false, error: "Could not save your request. Please retry." };
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
