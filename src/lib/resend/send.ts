import "server-only";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { getBookingSizeOption, STATIC_BOOKING_SIZE_OPTIONS } from "@/lib/booking/options";
import type { SizeKey } from "@/lib/booking/schema";

import { getResendClient } from "./client";
import { getResendConfig, hasResendConfig } from "./config";
import {
  renderBookingConfirmationEmail,
  renderBookingInternalAlertEmail,
  renderContactAutoReplyEmail,
  renderContactNotificationEmail,
} from "./templates";

function fallbackBusinessEmail(): string | undefined {
  return isConfirmedBusinessFact(businessConfig.contact.email)
    ? businessConfig.contact.email.value
    : undefined;
}

function joinAddress(parts: ReadonlyArray<string | undefined>): string {
  return parts.filter(Boolean).join(", ");
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

export async function sendBookingDraftEmails(input: {
  quoteNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sizeKey: SizeKey;
  neededDate: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  placementNotes?: string | null;
  serviceAreaConfirmed: boolean;
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

  const selectedSize = getBookingSizeOption(STATIC_BOOKING_SIZE_OPTIONS, input.sizeKey);
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
    neededDate: input.neededDate,
    address,
    serviceAreaConfirmed: input.serviceAreaConfirmed,
  });
  const internal = renderBookingInternalAlertEmail({
    quoteNumber: input.quoteNumber,
    customerName: `${input.firstName} ${input.lastName}`,
    email: input.email,
    phone: input.phone,
    sizeLabel,
    neededDate: input.neededDate,
    address,
    placementNotes: input.placementNotes ?? undefined,
    serviceAreaConfirmed: input.serviceAreaConfirmed,
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
