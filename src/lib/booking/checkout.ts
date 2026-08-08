"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe, isStripeTestMode } from "@/lib/stripe/client";

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
import { bookingDraftSchema } from "./schema";
import type { CheckoutResult } from "./types";

/**
 * Creates a pending-payment booking and a hosted Stripe Checkout Session for a
 * fixed-price dumpster rental. Verified webhooks remain authoritative for the
 * payment outcome and are the only path that advances the booking.
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

  const siteUrl = getSiteUrl();
  const stripe = getStripe();
  const supabase = createAdminClient();

  let serviceId: string;
  let serviceItemId: string;
  let serviceAreaConfirmed: boolean;
  try {
    serviceId = await resolveDumpsterServiceId(supabase);
    serviceItemId = await resolveServiceItemId(supabase, input.sizeKey);
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
  let deliverySurchargeCents = 0;
  try {
    const created = await createCustomerAndAddress(supabase, input);
    customerId = created.customerId;
    serviceAddressId = created.serviceAddressId;
    serviceAreaConfirmed =
      created.serviceArea.status === "validated" ||
      created.serviceArea.status === "extended";
    deliverySurchargeCents =
      "surchargeCents" in created.serviceArea
        ? (created.serviceArea.surchargeCents ?? 0)
        : 0;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save your request.",
    };
  }

  const amountCents = rate.price.amountCents + deliverySurchargeCents;

  let checkoutUrl: string | null = null;
  let bookingId: string | null = null;
  const bookingInsert = await supabase
    .from("bookings")
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      service_item_id: serviceItemId,
      service_address_id: serviceAddressId,
      status: "pending_payment",
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
    console.error("Booking row insert failed", bookingInsert.error);
    return { ok: false, error: "Could not start your booking. Please retry." };
  }
  bookingId = bookingInsert.data.id as string;
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

  const paymentInsert = await supabase
    .from("payments")
    .insert({
      booking_id: bookingId,
      customer_id: customerId,
      amount_cents: amountCents,
      currency_code: "USD",
      status: "requires_payment",
      overage_authorized: true,
      is_test_mode: isStripeTestMode(),
      metadata: {
        booking_number: bookingNumber,
        size_key: input.sizeKey,
        rental_days: input.rentalDays,
        needed_date: input.neededDate,
        delivery_surcharge_cents: deliverySurchargeCents,
      },
    })
    .select("id")
    .single();

  if (paymentInsert.error || !paymentInsert.data) {
    // Surface the Postgres error server-side; the customer message stays
    // generic. Supabase errors carry no secrets or payment data.
    console.error("Payment row insert failed", paymentInsert.error);
    await supabase.from("bookings").delete().eq("id", bookingId);
    return { ok: false, error: "Could not initialize payment tracking. Please retry." };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: new URL(
        `/book/confirmed?session_id={CHECKOUT_SESSION_ID}`,
        siteUrl,
      ).toString(),
      cancel_url: new URL("/book?checkout=canceled", siteUrl).toString(),
      billing_address_collection: "required",
      customer_creation: "always",
      customer_email: input.email,
      automatic_tax: { enabled: true },
      invoice_creation: { enabled: false },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: `${rate.size} dumpster rental`,
              description: `${input.rentalDays}-day rental for ${rate.use.toLowerCase()}. Booking #${bookingNumber}.`,
            },
            unit_amount: rate.price.amountCents,
          },
        },
        ...(deliverySurchargeCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Extended delivery charge",
                    description:
                      "Distance-based delivery surcharge beyond the included service area.",
                  },
                  unit_amount: deliverySurchargeCents,
                },
              },
            ]
          : []),
      ],
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          bookingId,
          bookingNumber: String(bookingNumber),
          customerId,
        },
      },
      metadata: {
        bookingId,
        bookingNumber: String(bookingNumber),
        customerId,
        serviceItemId,
        serviceAreaConfirmed: String(serviceAreaConfirmed),
      },
      custom_text: {
        submit: {
          message:
            "By paying, you authorize Barnes Hauling and Disposal to save this payment method for later documented overage charges described in your accepted rental terms.",
        },
      },
    });

    checkoutUrl = session.url;

    await supabase
      .from("payments")
      .update({
        stripe_checkout_session_id: session.id,
        metadata: {
          booking_number: bookingNumber,
          size_key: input.sizeKey,
          rental_days: input.rentalDays,
          needed_date: input.neededDate,
          delivery_surcharge_cents: deliverySurchargeCents,
          stripe_customer_id:
            typeof session.customer === "string" ? session.customer : null,
        },
      })
      .eq("id", paymentInsert.data.id as string);
  } catch (error) {
    // Surface the real Stripe error server-side; the customer-facing message
    // stays generic. Stripe API errors carry no secrets or payment data.
    console.error("Stripe checkout session creation failed", error);
    await supabase
      .from("payments")
      .update({ status: "canceled" })
      .eq("id", paymentInsert.data.id as string);
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    return { ok: false, error: "Could not create a Stripe checkout session. Please retry." };
  }

  await recordTransactionalConsents(supabase, customerId, input);
  if (!checkoutUrl) {
    return { ok: false, error: "Could not start Stripe checkout. Please retry." };
  }

  return { ok: true, checkoutUrl };
}
