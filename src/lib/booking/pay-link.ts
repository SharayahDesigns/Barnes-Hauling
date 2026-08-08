"use server";

import { redirect } from "next/navigation";

import { getSiteUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

import { loadBookingSizeOptionByKey } from "./catalog";

/**
 * Starts Stripe Checkout for a booking that is awaiting payment, from the
 * emailed pay link.
 *
 * The session is created on demand rather than when the quote was approved,
 * because a Checkout Session expires within 24 hours while the email may sit
 * unread for days. Each visit mints a fresh, valid session.
 *
 * Acceptance of the rental terms is stamped here — this is the point the
 * customer actually sees and agrees to them, so the booking records the exact
 * version they saw.
 */
export async function startQuoteCheckout(formData: FormData): Promise<void> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const accepted = String(formData.get("agreementAccepted") ?? "") === "on";

  if (!bookingId) redirect("/");
  if (!accepted) {
    redirect(`/pay/${bookingId}?error=${encodeURIComponent("Please accept the rental terms to continue.")}`);
  }

  const supabase = createAdminClient();

  const bookingResult = await supabase
    .from("bookings")
    .select("id, booking_number, status, customers(email)")
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingResult.data as unknown as {
    id: string;
    booking_number: number;
    status: string;
    customers: { email: string | null } | null;
  } | null;

  if (!booking || booking.status !== "pending_payment") {
    redirect(`/pay/${bookingId}`);
  }

  const paymentResult = await supabase
    .from("payments")
    .select("id, amount_cents, status, metadata")
    .eq("booking_id", bookingId)
    .neq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payment = paymentResult.data as {
    id: string;
    amount_cents: number;
    status: string;
    metadata: Record<string, unknown> | null;
  } | null;

  if (!payment) redirect(`/pay/${bookingId}`);

  const sizeKey =
    typeof payment.metadata?.size_key === "string"
      ? payment.metadata.size_key
      : null;
  let productName = `Dumpster rental — booking #${booking.booking_number}`;
  if (sizeKey) {
    try {
      const option = await loadBookingSizeOptionByKey(sizeKey);
      productName = `${option.size} dumpster rental`;
    } catch {
      // Keep the generic name.
    }
  }

  const siteUrl = getSiteUrl();
  let checkoutUrl: string | null = null;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      success_url: new URL(
        "/book/confirmed?session_id={CHECKOUT_SESSION_ID}",
        siteUrl,
      ).toString(),
      cancel_url: new URL(`/pay/${bookingId}`, siteUrl).toString(),
      billing_address_collection: "required",
      customer_creation: "always",
      customer_email: booking.customers?.email ?? undefined,
      automatic_tax: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: `Agreed rental price for booking #${booking.booking_number}.`,
            },
            unit_amount: payment.amount_cents,
          },
        },
      ],
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: {
          bookingId,
          bookingNumber: String(booking.booking_number),
        },
      },
      metadata: {
        bookingId,
        bookingNumber: String(booking.booking_number),
        source: "quote_approval",
      },
      custom_text: {
        submit: {
          message:
            "By paying, you authorize Barnes Hauling and Disposal to save this payment method for later documented overage charges described in your accepted rental terms.",
        },
      },
    });

    checkoutUrl = session.url;

    // The webhook finds this payment by session id, so it must be stored before
    // the customer can complete checkout.
    await supabase
      .from("payments")
      .update({
        stripe_checkout_session_id: session.id,
        metadata: { ...(payment.metadata ?? {}), terms_accepted_at: new Date().toISOString() },
      })
      .eq("id", payment.id);

    await supabase
      .from("bookings")
      .update({ agreement_accepted_at: new Date().toISOString() })
      .eq("id", bookingId)
      .is("agreement_accepted_at", null);
  } catch (error) {
    console.error("Quote checkout session creation failed", error);
    redirect(
      `/pay/${bookingId}?error=${encodeURIComponent("Could not start checkout. Please try again.")}`,
    );
  }

  if (!checkoutUrl) {
    redirect(
      `/pay/${bookingId}?error=${encodeURIComponent("Could not start checkout. Please try again.")}`,
    );
  }

  redirect(checkoutUrl);
}
