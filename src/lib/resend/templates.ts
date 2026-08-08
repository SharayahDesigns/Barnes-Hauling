import { businessConfig } from "@/config/business";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;color:#191b18;font:16px/1.6 Arial,Helvetica,sans-serif;">${escapeHtml(text)}</p>`;
}

function detailsTable(
  rows: ReadonlyArray<Readonly<{ label: string; value: string }>>,
): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #c9cdc5;border-radius:12px;overflow:hidden;background:#ffffff;">
      <tbody>
        ${rows
          .map(
            ({ label, value }) => `
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #ecede9;color:#62675f;font:12px/1.4 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(label)}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #ecede9;color:#191b18;font:15px/1.5 Arial,Helvetica,sans-serif;">${escapeHtml(value)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function shell({
  preheader,
  heading,
  intro,
  body,
}: Readonly<{
  preheader: string;
  heading: string;
  intro: string;
  body: string;
}>): string {
  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;padding:0;background:#f7f7f4;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f7f4;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #c9cdc5;border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 28px 20px;background:#0b0c0a;color:#ffffff;">
                    <p style="margin:0 0 12px;color:#7e9552;font:700 12px/1.2 Arial,Helvetica,sans-serif;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(
                      businessConfig.identity.name.value,
                    )}</p>
                    <h1 style="margin:0;color:#ffffff;font:800 32px/1.05 Arial Narrow,Arial,sans-serif;">${escapeHtml(heading)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    ${paragraph(intro)}
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function renderContactNotificationEmail(input: {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
}): { html: string; text: string } {
  const rows = [
    { label: "Name", value: input.name },
    { label: "Email", value: input.email },
    { label: "Phone", value: input.phone || "Not provided" },
    { label: "Service", value: input.service || "Not specified" },
  ];

  return {
    html: shell({
      preheader: `New website message from ${input.name}`,
      heading: "New website contact message",
      intro: "A visitor submitted the Barnes contact form.",
      body: `${detailsTable(rows)}<div style="height:20px"></div>${paragraph(
        input.message,
      )}`,
    }),
    text: [
      "New website contact message",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone || "Not provided"}`,
      `Service: ${input.service || "Not specified"}`,
      "",
      input.message,
    ].join("\n"),
  };
}

export function renderContactAutoReplyEmail(input: {
  name: string;
  service?: string;
}): { html: string; text: string } {
  const serviceLine = input.service
    ? `We noted your question about ${input.service}.`
    : "We received your message.";

  return {
    html: shell({
      preheader: "Barnes received your message",
      heading: "We received your message",
      intro: `Thanks, ${input.name}. ${serviceLine}`,
      body: [
        paragraph(
          "A Barnes team member will review your message and follow up as soon as possible.",
        ),
        paragraph(
          "If your project is urgent, call or text 385-246-4219 so the team can respond faster.",
        ),
      ].join(""),
    }),
    text: [
      `Thanks, ${input.name}.`,
      serviceLine,
      "",
      "A Barnes team member will review your message and follow up as soon as possible.",
      "If your project is urgent, call or text 385-246-4219 so the team can respond faster.",
    ].join("\n"),
  };
}

export function renderBookingConfirmationEmail(input: {
  quoteNumber: number;
  firstName: string;
  sizeLabel: string;
  requestedRentalDays?: number;
  neededDate: string;
  address: string;
  serviceAreaConfirmed: boolean;
  customerNote?: string;
  requestKind?: "standard" | "custom_quote";
}): { html: string; text: string } {
  const rows = [
    { label: "Reference", value: `#${input.quoteNumber}` },
    { label: "Container", value: input.sizeLabel },
    ...(input.requestedRentalDays
      ? [{ label: "Requested rental", value: `${input.requestedRentalDays} days` }]
      : []),
    { label: "Requested date", value: input.neededDate },
    { label: "Address", value: input.address },
  ];

  const nextStep = input.serviceAreaConfirmed
    ? "Barnes will confirm your delivery date and finalize pricing."
    : "Barnes will first confirm that your address is in the service area, then confirm your delivery date and pricing.";
  const intro =
    input.requestKind === "custom_quote"
      ? `Thanks, ${input.firstName}. We saved your custom dumpster quote request.`
      : `Thanks, ${input.firstName}. We saved your dumpster request.`;

  return {
    html: shell({
      preheader: `Barnes request #${input.quoteNumber} received`,
      heading: "Your request was received",
      intro,
      body: [
        detailsTable(rows),
        input.customerNote
          ? `<div style="height:20px"></div>${paragraph(
              `Your note: ${input.customerNote}`,
            )}`
          : "",
        `<div style="height:20px"></div>`,
        paragraph(nextStep),
        paragraph(
          "Online payment and the emailed rental agreement are still being finalized. No card was charged from this request.",
        ),
      ].join(""),
    }),
    text: [
      "Your Barnes dumpster request was received.",
      "",
      `Reference: #${input.quoteNumber}`,
      `Container: ${input.sizeLabel}`,
      ...(input.requestedRentalDays
        ? [`Requested rental: ${input.requestedRentalDays} days`]
        : []),
      `Requested date: ${input.neededDate}`,
      `Address: ${input.address}`,
      input.customerNote ? `Your note: ${input.customerNote}` : "",
      "",
      nextStep,
      "Online payment and the emailed rental agreement are still being finalized. No card was charged from this request.",
    ].join("\n"),
  };
}

/**
 * Sent when staff approves a quote over the phone and needs the customer to
 * pay. The link points at our own pay page rather than a Stripe URL, because a
 * Checkout Session expires within 24 hours and this email may sit unread for
 * days — the pay page mints a fresh session whenever it is opened.
 */
export function renderPaymentLinkEmail(input: {
  bookingNumber: number;
  firstName: string;
  sizeLabel: string;
  deliveryDate: string;
  rentalDays: number;
  address: string;
  total: string;
  payUrl: string;
}): { html: string; text: string } {
  const rows = [
    { label: "Booking", value: `#${input.bookingNumber}` },
    { label: "Container", value: input.sizeLabel },
    { label: "Rental", value: `${input.rentalDays} day${input.rentalDays === 1 ? "" : "s"}` },
    { label: "Delivery date", value: input.deliveryDate },
    { label: "Address", value: input.address },
    { label: "Total due", value: input.total },
  ];

  const button = `
    <div style="height:24px"></div>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#4e6a2a;">
      <a href="${escapeHtml(input.payUrl)}" style="display:inline-block;padding:14px 26px;color:#ffffff;font:700 16px/1 Arial,Helvetica,sans-serif;text-decoration:none;">Pay and confirm booking</a>
    </td></tr></table>
  `;

  return {
    html: shell({
      preheader: `Your Barnes quote #${input.bookingNumber} is ready to book`,
      heading: "Your quote is ready",
      intro: `Thanks, ${input.firstName}. Here are the details we discussed. Your delivery date is held once payment is complete.`,
      body: [
        detailsTable(rows),
        button,
        `<div style="height:8px"></div>`,
        paragraph(
          "Taxes are calculated at checkout. Your rental terms are shown before you pay.",
        ),
      ].join(""),
    }),
    text: [
      "Your Barnes quote is ready to book.",
      "",
      `Booking: #${input.bookingNumber}`,
      `Container: ${input.sizeLabel}`,
      `Rental: ${input.rentalDays} day${input.rentalDays === 1 ? "" : "s"}`,
      `Delivery date: ${input.deliveryDate}`,
      `Address: ${input.address}`,
      `Total due: ${input.total}`,
      "",
      `Pay and confirm: ${input.payUrl}`,
      "",
      "Taxes are calculated at checkout. Your rental terms are shown before you pay.",
    ].join("\n"),
  };
}

// Deliberately factual: amounts, dates, and what happens next. The overage
// authorization and cancellation wording the customer accepted at checkout is
// NOT restated here — that language needs legal review before it goes out.
export function renderPaymentReceiptEmail(input: {
  bookingNumber: number;
  firstName: string;
  sizeLabel: string;
  deliveryDate: string;
  address: string;
  subtotal: string;
  tax: string;
  total: string;
  isTestMode: boolean;
  confirmed: boolean;
}): { html: string; text: string } {
  const rows = [
    { label: "Booking", value: `#${input.bookingNumber}` },
    { label: "Status", value: input.confirmed ? "Confirmed" : "Pending review" },
    { label: "Container", value: input.sizeLabel },
    { label: "Delivery date", value: input.deliveryDate },
    { label: "Address", value: input.address },
    { label: "Subtotal", value: input.subtotal },
    { label: "Tax", value: input.tax },
    { label: "Total paid", value: input.total },
  ];

  const nextStep = input.confirmed
    ? "Your booking is confirmed. We'll be in touch with the delivery window before your date."
    : "Barnes will review the details and confirm your delivery date. Your date is not locked in until we send that confirmation.";
  const testNotice =
    "This was a Stripe sandbox payment for testing. No real card was charged.";

  return {
    html: shell({
      preheader: `Payment received for Barnes booking #${input.bookingNumber}`,
      heading: input.confirmed ? "Booking confirmed" : "Payment received",
      intro: `Thanks, ${input.firstName}. We received your payment for booking #${input.bookingNumber}.`,
      body: [
        detailsTable(rows),
        `<div style="height:20px"></div>`,
        paragraph(nextStep),
        input.isTestMode ? paragraph(testNotice) : "",
      ].join(""),
    }),
    text: [
      `Payment received for Barnes booking #${input.bookingNumber}.`,
      "",
      `Booking: #${input.bookingNumber}`,
      `Status: ${input.confirmed ? "Confirmed" : "Pending review"}`,
      `Container: ${input.sizeLabel}`,
      `Delivery date: ${input.deliveryDate}`,
      `Address: ${input.address}`,
      `Subtotal: ${input.subtotal}`,
      `Tax: ${input.tax}`,
      `Total paid: ${input.total}`,
      "",
      nextStep,
      input.isTestMode ? testNotice : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export function renderPaymentInternalAlertEmail(input: {
  bookingNumber: number;
  customerName: string;
  email: string;
  phone: string;
  sizeLabel: string;
  deliveryDate: string;
  address: string;
  total: string;
  isTestMode: boolean;
  confirmed: boolean;
}): { html: string; text: string } {
  const rows = [
    { label: "Booking", value: `#${input.bookingNumber}` },
    { label: "Status", value: input.confirmed ? "Confirmed" : "Pending review" },
    { label: "Customer", value: input.customerName },
    { label: "Email", value: input.email },
    { label: "Phone", value: input.phone },
    { label: "Container", value: input.sizeLabel },
    { label: "Delivery date", value: input.deliveryDate },
    { label: "Address", value: input.address },
    { label: "Total paid", value: input.total },
    { label: "Mode", value: input.isTestMode ? "Stripe sandbox (test)" : "Live" },
  ];

  const heading = input.confirmed
    ? "Paid booking confirmed"
    : "Paid booking needs review";

  return {
    html: shell({
      preheader: `${heading} — #${input.bookingNumber}`,
      heading,
      intro: input.confirmed
        ? "A customer completed checkout and the booking is confirmed. Assign a container for the delivery date."
        : "A customer completed checkout. The booking is pending review until staff confirms the delivery date and assigns a container.",
      body: detailsTable(rows),
    }),
    text: [
      heading,
      "",
      `Booking: #${input.bookingNumber}`,
      `Status: ${input.confirmed ? "Confirmed" : "Pending review"}`,
      `Customer: ${input.customerName}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
      `Container: ${input.sizeLabel}`,
      `Delivery date: ${input.deliveryDate}`,
      `Address: ${input.address}`,
      `Total paid: ${input.total}`,
      `Mode: ${input.isTestMode ? "Stripe sandbox (test)" : "Live"}`,
    ].join("\n"),
  };
}

export function renderBookingInternalAlertEmail(input: {
  quoteNumber: number;
  customerName: string;
  email: string;
  phone: string;
  sizeLabel: string;
  requestedRentalDays?: number;
  neededDate: string;
  address: string;
  placementNotes?: string;
  customerNote?: string;
  serviceAreaConfirmed: boolean;
  requestKind?: "standard" | "custom_quote";
}): { html: string; text: string } {
  const rows = [
    { label: "Reference", value: `#${input.quoteNumber}` },
    { label: "Customer", value: input.customerName },
    { label: "Email", value: input.email },
    { label: "Phone", value: input.phone },
    { label: "Container", value: input.sizeLabel },
    ...(input.requestedRentalDays
      ? [{ label: "Requested rental", value: `${input.requestedRentalDays} days` }]
      : []),
    { label: "Requested date", value: input.neededDate },
    { label: "Address", value: input.address },
    {
      label: "Service area",
      value: input.serviceAreaConfirmed ? "Confirmed by ZIP rules" : "Needs review",
    },
  ];

  return {
    html: shell({
      preheader: `New dumpster request #${input.quoteNumber}`,
      heading: "New dumpster request",
      intro:
        input.requestKind === "custom_quote"
          ? "A new custom-rental dumpster quote request was saved from the website."
          : "A new dumpster request was saved from the website booking flow.",
      body: [
        detailsTable(rows),
        input.customerNote
          ? `<div style="height:20px"></div>${paragraph(
              `Customer note: ${input.customerNote}`,
            )}`
          : "",
        input.placementNotes
          ? `<div style="height:20px"></div>${paragraph(
              `Placement notes: ${input.placementNotes}`,
            )}`
          : "",
      ].join(""),
    }),
    text: [
      "New dumpster request",
      "",
      `Reference: #${input.quoteNumber}`,
      `Customer: ${input.customerName}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
      `Container: ${input.sizeLabel}`,
      ...(input.requestedRentalDays
        ? [`Requested rental: ${input.requestedRentalDays} days`]
        : []),
      `Requested date: ${input.neededDate}`,
      `Address: ${input.address}`,
      `Service area: ${input.serviceAreaConfirmed ? "Confirmed by ZIP rules" : "Needs review"}`,
      input.customerNote ? `Customer note: ${input.customerNote}` : "",
      input.placementNotes ? `Placement notes: ${input.placementNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
