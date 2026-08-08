import "server-only";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { loadBookingSizeOptionByKey } from "@/lib/booking/catalog";

import { getResendClient } from "./client";
import { getResendConfig, hasResendConfig } from "./config";
import {
  renderBookingConfirmationEmail,
  renderBookingInternalAlertEmail,
  renderContactAutoReplyEmail,
  renderContactNotificationEmail,
  renderPaymentInternalAlertEmail,
  renderPaymentLinkEmail,
  renderPaymentReceiptEmail,
} from "./templates";

function fallbackBusinessEmail(): string | undefined {
  return isConfirmedBusinessFact(businessConfig.contact.email)
    ? businessConfig.contact.email.value
    : undefined;
}

function joinAddress(parts: ReadonlyArray<string | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

// Receipts show exact cents. The shared formatCents helper rounds to whole
// dollars for marketing copy, which would misstate a settled total.
const EXACT_USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatExactCents(amountCents: number): string {
  return EXACT_USD.format(amountCents / 100);
}

export async function sendContactEmails(input: {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
}): Promise<void> {
  const config = getResendConfig();
  const resend = getResendClient();
  const internalTo = config.contactToEmail || fallbackBusinessEmail();

  if (!internalTo) {
    throw new Error("Missing contact notification recipient email");
  }

  const internal = renderContactNotificationEmail(input);
  const internalResponse = await resend.emails.send({
    from: config.fromEmail,
    to: internalTo,
    replyTo: input.email,
    subject: `Website message from ${input.name}`,
    html: internal.html,
    text: internal.text,
    tags: [
      { name: "workflow", value: "contact_form" },
      { name: "audience", value: "internal" },
    ],
  });

  if (internalResponse.error) {
    throw new Error(internalResponse.error.message);
  }

  const reply = renderContactAutoReplyEmail(input);
  const autoReply = await resend.emails.send({
    from: config.fromEmail,
    to: input.email,
    replyTo: config.replyToEmail || internalTo,
    subject: "We received your message",
    html: reply.html,
    text: reply.text,
    tags: [
      { name: "workflow", value: "contact_form" },
      { name: "audience", value: "customer" },
    ],
  });

  if (autoReply.error) {
    throw new Error(autoReply.error.message);
  }
}

/**
 * Sends the paid-checkout receipt to the customer and a review alert to staff.
 * Called only from the verified Stripe webhook, and only on the real
 * pending_payment -> pending_review transition, so a redelivered event does not
 * email the customer twice.
 */
export async function sendPaymentReceiptEmails(input: {
  bookingNumber: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  sizeKey: string | null;
  deliveryDate: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  isTestMode: boolean;
  confirmed: boolean;
}): Promise<void> {
  if (!hasResendConfig()) {
    return;
  }

  const config = getResendConfig();
  const resend = getResendClient();
  const internalTo =
    config.bookingToEmail || config.contactToEmail || fallbackBusinessEmail();

  if (!internalTo) {
    throw new Error("Missing booking notification recipient email");
  }

  // A booking can predate its catalog entry being renamed or retired; fall back
  // rather than dropping the receipt over a display label.
  let sizeLabel = "Dumpster rental";
  if (input.sizeKey) {
    try {
      const selectedSize = await loadBookingSizeOptionByKey(input.sizeKey);
      sizeLabel = `${selectedSize.size} · ${selectedSize.use}`;
    } catch {
      // Keep the generic label.
    }
  }

  const address = joinAddress([
    input.addressLine1,
    input.addressLine2 ?? undefined,
    `${input.city}, ${input.region} ${input.postalCode}`,
  ]);
  const total = formatExactCents(input.totalCents);

  const internal = renderPaymentInternalAlertEmail({
    bookingNumber: input.bookingNumber,
    customerName: `${input.firstName} ${input.lastName}`,
    email: input.email ?? "—",
    phone: input.phone ?? "—",
    sizeLabel,
    deliveryDate: input.deliveryDate,
    address,
    total,
    isTestMode: input.isTestMode,
    confirmed: input.confirmed,
  });

  const internalResponse = await resend.emails.send({
    from: config.fromEmail,
    to: internalTo,
    replyTo: input.email ?? undefined,
    subject: input.confirmed
      ? `Paid booking #${input.bookingNumber} confirmed`
      : `Paid booking #${input.bookingNumber} needs review`,
    html: internal.html,
    text: internal.text,
    tags: [
      { name: "workflow", value: "payment_receipt" },
      { name: "audience", value: "internal" },
    ],
  });

  if (internalResponse.error) {
    throw new Error(internalResponse.error.message);
  }

  // Checkout collects an email, but the customer record may not have one.
  if (!input.email) {
    return;
  }

  const receipt = renderPaymentReceiptEmail({
    bookingNumber: input.bookingNumber,
    firstName: input.firstName,
    sizeLabel,
    deliveryDate: input.deliveryDate,
    address,
    subtotal: formatExactCents(input.subtotalCents),
    tax: formatExactCents(input.taxCents),
    total,
    isTestMode: input.isTestMode,
    confirmed: input.confirmed,
  });

  const customerResponse = await resend.emails.send({
    from: config.fromEmail,
    to: input.email,
    replyTo: config.replyToEmail || internalTo,
    subject: input.confirmed
      ? `Booking #${input.bookingNumber} confirmed`
      : `Payment received — Barnes booking #${input.bookingNumber}`,
    html: receipt.html,
    text: receipt.text,
    tags: [
      { name: "workflow", value: "payment_receipt" },
      { name: "audience", value: "customer" },
    ],
  });

  if (customerResponse.error) {
    throw new Error(customerResponse.error.message);
  }
}

/**
 * Sends the approved-quote payment link. Throws on failure so the caller can
 * tell staff the customer was not emailed — unlike the receipt, this message is
 * the only way the customer can pay.
 */
export async function sendPaymentLinkEmail(input: {
  bookingNumber: number;
  firstName: string;
  email: string;
  sizeLabel: string;
  deliveryDate: string;
  rentalDays: number;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  totalCents: number;
  payUrl: string;
}): Promise<void> {
  if (!hasResendConfig()) {
    throw new Error(
      "Email is not configured (RESEND_FROM_EMAIL), so the payment link could not be sent.",
    );
  }

  const config = getResendConfig();
  const resend = getResendClient();
  const internalTo =
    config.bookingToEmail || config.contactToEmail || fallbackBusinessEmail();

  const message = renderPaymentLinkEmail({
    bookingNumber: input.bookingNumber,
    firstName: input.firstName,
    sizeLabel: input.sizeLabel,
    deliveryDate: input.deliveryDate,
    rentalDays: input.rentalDays,
    address: joinAddress([
      input.addressLine1,
      input.addressLine2 ?? undefined,
      `${input.city}, ${input.region} ${input.postalCode}`,
    ]),
    total: formatExactCents(input.totalCents),
    payUrl: input.payUrl,
  });

  const response = await resend.emails.send({
    from: config.fromEmail,
    to: input.email,
    replyTo: config.replyToEmail || internalTo,
    subject: `Your Barnes quote #${input.bookingNumber} — ready to book`,
    html: message.html,
    text: message.text,
    tags: [
      { name: "workflow", value: "quote_payment_link" },
      { name: "audience", value: "customer" },
    ],
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function sendBookingDraftEmails(input: {
  quoteNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sizeKey: string;
  requestedRentalDays?: number;
  neededDate: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  placementNotes?: string | null;
  customerNote?: string | null;
  serviceAreaConfirmed: boolean;
  requestKind?: "standard" | "custom_quote";
}): Promise<void> {
  if (!hasResendConfig()) {
    return;
  }

  const config = getResendConfig();
  const resend = getResendClient();
  const internalTo =
    config.bookingToEmail || config.contactToEmail || fallbackBusinessEmail();

  if (!internalTo) {
    throw new Error("Missing booking notification recipient email");
  }

  const selectedSize = await loadBookingSizeOptionByKey(input.sizeKey);
  const sizeLabel = `${selectedSize.size} · ${selectedSize.use}`;
  const address = joinAddress([
    input.addressLine1,
    input.addressLine2 ?? undefined,
    `${input.city}, ${input.region} ${input.postalCode}`,
  ]);

  const confirmation = renderBookingConfirmationEmail({
    quoteNumber: input.quoteNumber,
    firstName: input.firstName,
    sizeLabel,
    requestedRentalDays: input.requestedRentalDays,
    neededDate: input.neededDate,
    address,
    serviceAreaConfirmed: input.serviceAreaConfirmed,
    customerNote: input.customerNote ?? undefined,
    requestKind: input.requestKind,
  });
  const internal = renderBookingInternalAlertEmail({
    quoteNumber: input.quoteNumber,
    customerName: `${input.firstName} ${input.lastName}`,
    email: input.email,
    phone: input.phone,
    sizeLabel,
    requestedRentalDays: input.requestedRentalDays,
    neededDate: input.neededDate,
    address,
    placementNotes: input.placementNotes ?? undefined,
    customerNote: input.customerNote ?? undefined,
    serviceAreaConfirmed: input.serviceAreaConfirmed,
    requestKind: input.requestKind,
  });

  const internalResponse = await resend.emails.send({
    from: config.fromEmail,
    to: internalTo,
    replyTo: input.email,
    subject: `New dumpster request #${input.quoteNumber}`,
    html: internal.html,
    text: internal.text,
    tags: [
      { name: "workflow", value: "booking_draft" },
      { name: "audience", value: "internal" },
    ],
  });

  if (internalResponse.error) {
    throw new Error(internalResponse.error.message);
  }

  const customerResponse = await resend.emails.send({
    from: config.fromEmail,
    to: input.email,
    replyTo: config.replyToEmail || internalTo,
    subject: `Barnes request #${input.quoteNumber} received`,
    html: confirmation.html,
    text: confirmation.text,
    tags: [
      { name: "workflow", value: "booking_draft" },
      { name: "audience", value: "customer" },
    ],
  });

  if (customerResponse.error) {
    throw new Error(customerResponse.error.message);
  }
}
