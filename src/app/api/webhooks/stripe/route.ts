import Stripe from "stripe";

import { autoAssignDumpster } from "@/lib/booking/auto-assign";
import { denverDate } from "@/lib/booking/records";
import { sendPaymentReceiptEmails } from "@/lib/resend/send";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response("Webhook not configured.", { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency: skip events we've already fully processed; process new or
  // previously-failed (unprocessed) events.
  const existing = await supabase
    .from("stripe_webhook_events")
    .select("processed_at")
    .eq("id", event.id)
    .maybeSingle();

  if (existing.data?.processed_at) {
    return new Response("Already processed.", { status: 200 });
  }
  if (!existing.data) {
    await supabase.from("stripe_webhook_events").insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.expired":
        await markPaymentStatus(
          supabase,
          (event.data.object as Stripe.Checkout.Session).id,
          "canceled",
        );
        break;
      case "checkout.session.async_payment_failed":
        await markPaymentStatus(
          supabase,
          (event.data.object as Stripe.Checkout.Session).id,
          "failed",
        );
        break;
      // Fires for refunds issued from the admin AND straight from the Stripe
      // dashboard, so both land in the same state.
      case "charge.refunded":
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
        break;
      case "charge.dispute.created":
        await handleDisputeOpened(supabase, event.data.object as Stripe.Dispute);
        break;
      default:
        // Unhandled event types are acknowledged without action.
        break;
    }

    await supabase
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);
  } catch {
    // Leave processed_at null so Stripe's retry re-runs the handler.
    return new Response("Handler error.", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session,
) {
  const payment = await supabase
    .from("payments")
    .select("id, booking_id, status, amount_cents, is_test_mode, metadata")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (!payment.data) return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // Pull the saved payment method for later documented overage charges, plus
  // the brand/last4 staff need to recognize it. Brand and last4 are safe to
  // store; the PAN, expiry, and CVC are never persisted.
  let paymentMethodId: string | null = null;
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  if (paymentIntentId) {
    try {
      const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
      const method = intent.payment_method;
      if (typeof method === "string") {
        paymentMethodId = method;
      } else if (method) {
        paymentMethodId = method.id;
        cardBrand = method.card?.brand ?? null;
        cardLast4 = method.card?.last4 ?? null;
      }
    } catch {
      // Non-fatal: the payment still succeeded even if PM retrieval fails.
    }
  }

  const paid = session.payment_status === "paid";
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;
  const totalTaxCents = session.total_details?.amount_tax ?? 0;
  const amountTotalCents = session.amount_total ?? payment.data.amount_cents;

  await supabase
    .from("payments")
    .update({
      amount_cents: amountTotalCents,
      status: paid ? "succeeded" : "processing",
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_method_id: paymentMethodId,
      card_on_file: Boolean(paymentMethodId),
      overage_authorized: Boolean(paymentMethodId),
      succeeded_at: paid ? new Date().toISOString() : null,
      // Merge, don't replace: the checkout action wrote size_key, rental_days,
      // needed_date and the delivery surcharge here, and that is the audit
      // record of what the customer actually bought.
      metadata: {
        ...((payment.data.metadata as Record<string, unknown> | null) ?? {}),
        stripe_customer_id: stripeCustomerId,
        checkout_subtotal_cents: session.amount_subtotal ?? null,
        checkout_total_tax_cents: totalTaxCents,
        checkout_total_cents: session.amount_total ?? null,
        card_brand: cardBrand,
        card_last4: cardLast4,
      },
    })
    .eq("id", payment.data.id);

  if (!paid) return;

  // The database production gate requires a finalized snapshot from currently
  // published pricing before a booking may be confirmed. Write it from the
  // settled session so the immutable record matches what Stripe actually
  // charged, including tax.
  const snapshot = await recordPriceSnapshot(supabase, payment.data.booking_id, {
    subtotalCents: session.amount_subtotal ?? payment.data.amount_cents,
    taxCents: totalTaxCents,
    totalCents: amountTotalCents,
    sessionId: session.id,
    paymentIntentId,
  });

  // Without a snapshot the gate would reject 'confirmed'. Hold at pending_review
  // rather than losing the payment outcome, and make the reason visible.
  const nextStatus = snapshot.ok ? "confirmed" : "pending_review";
  if (!snapshot.ok) {
    console.error("Booking held at pending_review:", snapshot.reason);
  }

  // The status filter makes this transition happen exactly once. Stripe retries
  // failed deliveries and can redeliver events, so the receipt below is gated on
  // rows actually changing here rather than on the event saying "paid" —
  // otherwise a retry emails the customer a second receipt.
  const transition = await supabase
    .from("bookings")
    .update({ status: nextStatus })
    .eq("id", payment.data.booking_id)
    .eq("status", "pending_payment")
    .select(
      "booking_number, scheduled_start_at, scheduled_end_at, customer_id, service_address_id, service_item_id",
    );

  const booking = transition.data?.[0];
  if (!booking) return;

  // Hold a physical container for the dates the customer paid for. Failure is
  // logged, not thrown: the payment stands, and staff can assign manually.
  const assignment = await autoAssignDumpster(supabase, {
    bookingId: payment.data.booking_id,
    serviceItemId: booking.service_item_id,
    startsAt: booking.scheduled_start_at,
    endsAt: booking.scheduled_end_at,
  });
  if (!assignment.ok) {
    console.error(
      `Booking #${booking.booking_number} not auto-assigned: ${assignment.reason}`,
    );
  }

  try {
    await sendPaidBookingEmails(supabase, booking, {
      subtotalCents: session.amount_subtotal ?? payment.data.amount_cents,
      taxCents: totalTaxCents,
      totalCents: amountTotalCents,
      sizeKey:
        ((payment.data.metadata as Record<string, unknown> | null)
          ?.size_key as string | undefined) ?? null,
      isTestMode: Boolean(payment.data.is_test_mode),
      confirmed: nextStatus === "confirmed",
    });
  } catch (error) {
    // The payment and status change are already durable. A failed email must
    // not trigger a Stripe retry, which would re-run this handler.
    console.error("Payment receipt email failed", error);
  }
}

/**
 * Records a refund against the payment. Stripe's amount_refunded is cumulative,
 * so it is authoritative for partial-then-full sequences rather than summing
 * events here. A full refund cancels the booking and frees the container; a
 * partial refund leaves the booking active, since money kept usually means work
 * still owed or a cancellation fee retained.
 */
async function handleChargeRefunded(
  supabase: ReturnType<typeof createAdminClient>,
  charge: Stripe.Charge,
) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!paymentIntentId) return;

  const payment = await supabase
    .from("payments")
    .select("id, booking_id, amount_cents, metadata")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!payment.data) return;

  const refundedCents = charge.amount_refunded ?? 0;
  const fullyRefunded = refundedCents >= payment.data.amount_cents;

  await supabase
    .from("payments")
    .update({
      status: fullyRefunded ? "refunded" : "partially_refunded",
      metadata: {
        ...((payment.data.metadata as Record<string, unknown> | null) ?? {}),
        refunded_amount_cents: refundedCents,
        refunded_at: new Date().toISOString(),
      },
    })
    .eq("id", payment.data.id);

  if (!fullyRefunded) return;

  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", payment.data.booking_id)
    .not("status", "in", "(cancelled,completed)");

  await releaseContainer(supabase, payment.data.booking_id);
}

/**
 * A dispute means the customer is contesting the charge. Flag the payment and
 * stop holding the container, but leave the money state to the dispute's own
 * resolution rather than guessing an outcome.
 */
async function handleDisputeOpened(
  supabase: ReturnType<typeof createAdminClient>,
  dispute: Stripe.Dispute,
) {
  const paymentIntentId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;
  if (!paymentIntentId) return;

  const payment = await supabase
    .from("payments")
    .select("id, booking_id, metadata")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!payment.data) return;

  await supabase
    .from("payments")
    .update({
      metadata: {
        ...((payment.data.metadata as Record<string, unknown> | null) ?? {}),
        dispute_id: dispute.id,
        dispute_status: dispute.status,
        dispute_opened_at: new Date().toISOString(),
      },
    })
    .eq("id", payment.data.id);
}

/**
 * Frees a reserved container so the dates return to availability. The
 * assignment row is cancelled rather than deleted, keeping the history of what
 * was held and when.
 */
async function releaseContainer(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
) {
  const assignments = await supabase
    .from("dumpster_assignments")
    .select("id, dumpster_id")
    .eq("booking_id", bookingId)
    .in("status", ["reserved", "assigned"]);

  const rows =
    (assignments.data as Array<{ id: string; dumpster_id: string }> | null) ?? [];
  if (rows.length === 0) return;

  await supabase
    .from("dumpster_assignments")
    .update({ status: "cancelled" })
    .in(
      "id",
      rows.map((row) => row.id),
    );

  // Only return containers that were merely held. Anything further along its
  // lifecycle (in transit, at a customer) keeps its operational status.
  await supabase
    .from("dumpsters")
    .update({ status: "available" })
    .in(
      "id",
      rows.map((row) => row.dumpster_id),
    )
    .eq("status", "reserved");
}

/**
 * Writes the immutable price record for a settled booking, sourced from the
 * Stripe session rather than the catalog, so it reflects the amount actually
 * charged. Snapshots are insert-only; a redelivered event collides with the
 * (booking_id, revision_number) unique constraint, which is treated as success.
 */
async function recordPriceSnapshot(
  supabase: ReturnType<typeof createAdminClient>,
  bookingId: string,
  amounts: {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    sessionId: string;
    paymentIntentId: string | null;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const existing = await supabase
    .from("booking_price_snapshots")
    .select("id")
    .eq("booking_id", bookingId)
    .limit(1);
  if (existing.data?.length) return { ok: true };

  if (amounts.totalCents <= 0) {
    return { ok: false, reason: "settled total was not greater than zero" };
  }

  const nowIso = new Date().toISOString();
  const versions = await supabase
    .from("pricing_versions")
    .select("id, effective_from, effective_to, version_number")
    .eq("status", "published")
    .order("version_number", { ascending: false });

  const active = (
    (versions.data ?? []) as Array<{
      id: string;
      effective_from: string | null;
      effective_to: string | null;
    }>
  ).find(
    (version) =>
      version.effective_from !== null &&
      version.effective_from <= nowIso &&
      (version.effective_to === null || version.effective_to > nowIso),
  );

  if (!active) {
    return { ok: false, reason: "no currently published pricing version exists" };
  }

  const insert = await supabase.from("booking_price_snapshots").insert({
    booking_id: bookingId,
    revision_number: 1,
    pricing_version_id: active.id,
    snapshot_type: "fixed_amount",
    currency_code: "USD",
    subtotal_cents: amounts.subtotalCents,
    tax_cents: amounts.taxCents,
    total_cents: amounts.totalCents,
    snapshot_payload: {
      source: "stripe_checkout_session",
      stripe_checkout_session_id: amounts.sessionId,
      stripe_payment_intent_id: amounts.paymentIntentId,
      subtotal_cents: amounts.subtotalCents,
      tax_cents: amounts.taxCents,
      total_cents: amounts.totalCents,
      captured_at: nowIso,
    },
    finalized_at: nowIso,
  });

  if (insert.error) {
    return { ok: false, reason: `snapshot insert failed: ${insert.error.message}` };
  }
  return { ok: true };
}

type PaidBooking = {
  booking_number: number;
  scheduled_start_at: string | null;
  customer_id: string;
  service_address_id: string;
};

async function sendPaidBookingEmails(
  supabase: ReturnType<typeof createAdminClient>,
  booking: PaidBooking,
  amounts: {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    sizeKey: string | null;
    isTestMode: boolean;
    confirmed: boolean;
  },
) {
  const [customer, address] = await Promise.all([
    supabase
      .from("customers")
      .select("first_name, last_name, email, phone")
      .eq("id", booking.customer_id)
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("address_line_1, address_line_2, city, region, postal_code")
      .eq("id", booking.service_address_id)
      .maybeSingle(),
  ]);

  if (!customer.data || !address.data) {
    console.error("Receipt skipped: missing customer or address record");
    return;
  }

  await sendPaymentReceiptEmails({
    bookingNumber: booking.booking_number,
    firstName: customer.data.first_name,
    lastName: customer.data.last_name,
    email: customer.data.email,
    phone: customer.data.phone,
    sizeKey: amounts.sizeKey,
    deliveryDate: booking.scheduled_start_at
      ? denverDate(booking.scheduled_start_at)
      : "To be confirmed",
    addressLine1: address.data.address_line_1,
    addressLine2: address.data.address_line_2,
    city: address.data.city,
    region: address.data.region,
    postalCode: address.data.postal_code,
    subtotalCents: amounts.subtotalCents,
    taxCents: amounts.taxCents,
    totalCents: amounts.totalCents,
    isTestMode: amounts.isTestMode,
    confirmed: amounts.confirmed,
  });
}

async function markPaymentStatus(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string,
  status: "canceled" | "failed",
) {
  await supabase
    .from("payments")
    .update({ status })
    .eq("stripe_checkout_session_id", sessionId)
    .neq("status", "succeeded");
}
