import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe signature verification needs the raw body and Node APIs.
export const runtime = "nodejs";
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
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
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
    .select("id, booking_id, status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (!payment.data) return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // Pull the saved payment method for later documented overage charges.
  let paymentMethodId: string | null = null;
  if (paymentIntentId) {
    try {
      const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      paymentMethodId =
        typeof intent.payment_method === "string"
          ? intent.payment_method
          : (intent.payment_method?.id ?? null);
    } catch {
      // Non-fatal: the payment still succeeded even if PM retrieval fails.
    }
  }

  const paid = session.payment_status === "paid";

  await supabase
    .from("payments")
    .update({
      status: paid ? "succeeded" : "processing",
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_method_id: paymentMethodId,
      card_on_file: Boolean(paymentMethodId),
      overage_authorized: Boolean(paymentMethodId),
      succeeded_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", payment.data.id);

  if (paid) {
    // Advance to pending_review — NOT confirmed. The production gate forbids
    // confirmed bookings until pricing is published and legally reviewed.
    await supabase
      .from("bookings")
      .update({ status: "pending_review" })
      .eq("id", payment.data.booking_id)
      .eq("status", "pending_payment");
  }
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
