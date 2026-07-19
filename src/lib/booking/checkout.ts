"use server";

import { headers } from "next/headers";

import { dumpsterRates } from "@/config/public-content";
import { getStripe } from "@/lib/stripe/client";
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
import type { CheckoutResult } from "./types";

async function getOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Creates a Stripe Checkout Session for a priced dumpster rental and the
 * backing booking + payment records.
 *
 * The booking is created in `pending_payment`; it only advances (to
 * `pending_review`) from the verified webhook — never from the browser redirect.
 * It intentionally never reaches `confirmed`: the DB production gate forbids that
 * until pricing is published and legally reviewed. The charged amount is the
 * confirmed base rate only (taxes/delivery are still unconfirmed), so this is a
 * test-mode flow until pricing is finalized.
 *
 * The card is saved (`setup_future_usage: off_session`) to authorize documented
 * overage charges later, paired with the load-and-weight agreement captured in
 * the flow. Overage charges still require staff review before they are taken.
 */
export async function createBookingCheckout(
  raw: unknown,
): Promise<CheckoutResult> {
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

  const rate = dumpsterRates.find((option) => option.key === input.sizeKey);
  if (!rate || rate.price.type !== "fixed") {
    return {
      ok: false,
      quoteRequired: true,
      error: "This container needs a custom quote. Submit a quote request instead.",
    };
  }
  const amountCents = rate.price.amountCents;

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      error: "Online payment isn't configured yet. Please call to reserve.",
    };
  }

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
  try {
    const created = await createCustomerAndAddress(supabase, input);
    customerId = created.customerId;
    serviceAddressId = created.serviceAddressId;
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
      status: "pending_payment",
      customer_instructions: input.placementNotes ?? null,
    })
    .select("id, booking_number")
    .single();
  if (bookingInsert.error || !bookingInsert.data) {
    return { ok: false, error: "Could not start your booking. Please retry." };
  }
  const bookingId = bookingInsert.data.id as string;
  const bookingNumber = bookingInsert.data.booking_number as number;

  const isLiveMode = process.env.STRIPE_SECRET_KEY.startsWith("sk_live_");
  const origin = await getOrigin();

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `${rate.size} dumpster — ${rate.use}`,
              description:
                "5-day rental, up to 3 tons included. Taxes and any delivery charge are confirmed by Barnes.",
            },
          },
        },
      ],
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          booking_id: bookingId,
          booking_number: String(bookingNumber),
          size_key: input.sizeKey,
        },
      },
      metadata: {
        booking_id: bookingId,
        booking_number: String(bookingNumber),
        size_key: input.sizeKey,
        agreement_version: PREPAYMENT_AGREEMENT_VERSION,
      },
      customer_email: input.email,
      success_url: `${origin}/book/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book?canceled=1`,
    });
  } catch {
    return {
      ok: false,
      error: "We couldn't start secure checkout. Please try again.",
    };
  }

  const paymentInsert = await supabase.from("payments").insert({
    booking_id: bookingId,
    customer_id: customerId,
    amount_cents: amountCents,
    currency_code: "USD",
    status: "requires_payment",
    stripe_checkout_session_id: session.id,
    is_test_mode: !isLiveMode,
    metadata: {
      size_key: input.sizeKey,
      agreement_version: PREPAYMENT_AGREEMENT_VERSION,
      base_rate_only: true,
    },
  });
  if (paymentInsert.error) {
    return { ok: false, error: "Could not record your payment. Please retry." };
  }

  await recordTransactionalConsents(supabase, customerId, input);

  if (!session.url) {
    return { ok: false, error: "Checkout session did not return a URL." };
  }
  return { ok: true, url: session.url };
}
