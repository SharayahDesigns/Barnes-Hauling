"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/staff";
import { loadBookingSizeOptionByKey } from "@/lib/booking/catalog";
import { PREPAYMENT_AGREEMENT_VERSION } from "@/lib/booking/options";
import {
  denverDayEndWithRentalDays,
  denverDayStart,
  resolveDumpsterServiceId,
} from "@/lib/booking/records";
import { sendPaymentLinkEmail } from "@/lib/resend/send";
import { getSiteUrl } from "@/lib/site-url";
import { isStripeTestMode } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

function quotePathWithMessage(
  quoteId: string,
  kind: "notice" | "error",
  message: string,
): string {
  return `/admin/leads/quote/${quoteId}?${kind}=${encodeURIComponent(message)}`;
}

function parseDollarsToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  // Round after scaling: 3.5 * 100 is 350.00000000000006 in binary floating point.
  return Math.round(Number(cleaned) * 100);
}

/**
 * Turns a phone-agreed quote into a bookable order awaiting payment.
 *
 * Deliberately does NOT create a Stripe Checkout Session here. Sessions expire
 * within 24 hours and this email may sit unread for days, so the customer gets a
 * link to our own pay page, which mints a fresh session on each visit.
 *
 * The booking lands in pending_payment — the same state the online flow uses —
 * so the existing verified webhook confirms it, writes the price snapshot,
 * reserves a container, and sends the receipt with no extra code.
 */
export async function approveQuoteAndSendPaymentLink(
  formData: FormData,
): Promise<void> {
  await requireStaff();

  const quoteId = String(formData.get("quoteId") ?? "");
  if (!quoteId) {
    redirect("/admin/leads?error=Could%20not%20approve%20that%20quote.");
  }

  const serviceItemId = String(formData.get("serviceItemId") ?? "");
  const neededDate = String(formData.get("neededDate") ?? "").trim();
  const rentalDays = Number(String(formData.get("rentalDays") ?? ""));
  const amountCents = parseDollarsToCents(String(formData.get("amount") ?? ""));

  // Annotated on the variable, not just the arrow: TypeScript only narrows past
  // a never-returning call when the callee is a const with an explicit type.
  const fail: (message: string) => never = (message) =>
    redirect(quotePathWithMessage(quoteId, "error", message));

  if (!serviceItemId) fail("Choose the container package for this booking.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(neededDate)) fail("Choose a delivery date.");
  if (!Number.isInteger(rentalDays) || rentalDays <= 0) {
    fail("Enter the number of rental days.");
  }
  if (amountCents === null || amountCents <= 0) {
    fail("Enter the agreed price, for example 350.00.");
  }

  const supabase = createAdminClient();

  const quoteResult = await supabase
    .from("quotes")
    .select(
      "id, quote_number, status, customer_id, service_address_id, request_details",
    )
    .eq("id", quoteId)
    .single();

  const quote = quoteResult.data as {
    id: string;
    quote_number: number;
    status: string;
    customer_id: string;
    service_address_id: string;
    request_details: Record<string, unknown> | null;
  } | null;

  if (quoteResult.error || !quote) fail("Could not find that quote.");
  if (quote.status === "approved") {
    fail(
      `Quote #${quote.quote_number} was already approved. Open the booking to resend its payment link.`,
    );
  }

  const [customerResult, addressResult, serviceItemResult] = await Promise.all([
    supabase
      .from("customers")
      .select("first_name, email")
      .eq("id", quote.customer_id)
      .maybeSingle(),
    supabase
      .from("customer_addresses")
      .select("address_line_1, address_line_2, city, region, postal_code")
      .eq("id", quote.service_address_id)
      .maybeSingle(),
    supabase
      .from("service_items")
      .select("code, name")
      .eq("id", serviceItemId)
      .maybeSingle(),
  ]);

  const customer = customerResult.data as {
    first_name: string;
    email: string | null;
  } | null;
  const address = addressResult.data as {
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    region: string;
    postal_code: string;
  } | null;
  const serviceItem = serviceItemResult.data as {
    code: string;
    name: string;
  } | null;

  if (!customer?.email) {
    fail("This customer has no email address, so a payment link cannot be sent.");
  }
  if (!address) fail("This quote has no delivery address.");
  if (!serviceItem) fail("Could not find that container package.");

  let serviceId: string;
  try {
    serviceId = await resolveDumpsterServiceId(supabase);
  } catch {
    return fail("Dumpster service is unavailable right now.");
  }

  const bookingInsert = await supabase
    .from("bookings")
    .insert({
      customer_id: quote.customer_id,
      service_id: serviceId,
      service_item_id: serviceItemId,
      service_address_id: quote.service_address_id,
      status: "pending_payment",
      scheduled_start_at: denverDayStart(neededDate),
      scheduled_end_at: denverDayEndWithRentalDays(neededDate, rentalDays),
      customer_instructions:
        (quote.request_details?.placement_notes as string | null) ?? null,
      // Which terms apply. Acceptance is stamped on the pay page, where the
      // customer actually sees and agrees to them.
      agreement_version: PREPAYMENT_AGREEMENT_VERSION,
    })
    .select("id, booking_number")
    .single();

  if (bookingInsert.error || !bookingInsert.data) {
    console.error("Quote approval booking insert failed", bookingInsert.error);
    return fail("Could not create the booking. Please retry.");
  }

  const bookingId = bookingInsert.data.id as string;
  const bookingNumber = bookingInsert.data.booking_number as number;

  const paymentInsert = await supabase.from("payments").insert({
    booking_id: bookingId,
    customer_id: quote.customer_id,
    amount_cents: amountCents,
    currency_code: "USD",
    status: "requires_payment",
    overage_authorized: true,
    is_test_mode: isStripeTestMode(),
    metadata: {
      booking_number: bookingNumber,
      size_key: serviceItem.code,
      rental_days: rentalDays,
      needed_date: neededDate,
      delivery_surcharge_cents: 0,
      source: "quote_approval",
      quote_number: quote.quote_number,
    },
  });

  if (paymentInsert.error) {
    console.error("Quote approval payment insert failed", paymentInsert.error);
    await supabase.from("bookings").delete().eq("id", bookingId);
    return fail("Could not set up payment tracking. Please retry.");
  }

  let sizeLabel = serviceItem.name;
  try {
    const option = await loadBookingSizeOptionByKey(serviceItem.code);
    sizeLabel = `${option.size} · ${option.use}`;
  } catch {
    // Keep the service item name.
  }

  const payUrl = new URL(`/pay/${bookingId}`, getSiteUrl()).toString();

  try {
    await sendPaymentLinkEmail({
      bookingNumber,
      firstName: customer.first_name,
      email: customer.email,
      sizeLabel,
      deliveryDate: neededDate,
      rentalDays,
      addressLine1: address.address_line_1,
      addressLine2: address.address_line_2,
      city: address.city,
      region: address.region,
      postalCode: address.postal_code,
      totalCents: amountCents,
      payUrl,
    });
  } catch (error) {
    // The booking exists and is payable; only the email failed. Say so plainly
    // rather than rolling back work staff just did on the phone.
    console.error("Payment link email failed", error);
    revalidatePath("/admin/leads");
    redirect(
      quotePathWithMessage(
        quoteId,
        "error",
        `Booking #${bookingNumber} was created, but the email failed to send. Share this link with the customer: ${payUrl}`,
      ),
    );
  }

  await supabase.from("quotes").update({ status: "approved" }).eq("id", quoteId);

  revalidatePath("/admin/leads");
  redirect(
    `/admin/leads/${bookingId}?notice=${encodeURIComponent(
      `Quote #${quote.quote_number} approved. Booking #${bookingNumber} created and the payment link was emailed.`,
    )}`,
  );
}
