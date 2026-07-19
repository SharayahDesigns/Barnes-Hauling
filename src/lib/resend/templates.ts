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
  neededDate: string;
  address: string;
  serviceAreaConfirmed: boolean;
}): { html: string; text: string } {
  const rows = [
    { label: "Reference", value: `#${input.quoteNumber}` },
    { label: "Container", value: input.sizeLabel },
    { label: "Requested date", value: input.neededDate },
    { label: "Address", value: input.address },
  ];

  const nextStep = input.serviceAreaConfirmed
    ? "Barnes will confirm your delivery date and finalize pricing."
    : "Barnes will first confirm that your address is in the service area, then confirm your delivery date and pricing.";

  return {
    html: shell({
      preheader: `Barnes request #${input.quoteNumber} received`,
      heading: "Your request was received",
      intro: `Thanks, ${input.firstName}. We saved your dumpster request.`,
      body: `${detailsTable(rows)}<div style="height:20px"></div>${paragraph(
        nextStep,
      )}${paragraph(
        "Online payment and the emailed rental agreement are still being finalized. No card was charged from this request.",
      )}`,
    }),
    text: [
      "Your Barnes dumpster request was received.",
      "",
      `Reference: #${input.quoteNumber}`,
      `Container: ${input.sizeLabel}`,
      `Requested date: ${input.neededDate}`,
      `Address: ${input.address}`,
      "",
      nextStep,
      "Online payment and the emailed rental agreement are still being finalized. No card was charged from this request.",
    ].join("\n"),
  };
}

export function renderBookingInternalAlertEmail(input: {
  quoteNumber: number;
  customerName: string;
  email: string;
  phone: string;
  sizeLabel: string;
  neededDate: string;
  address: string;
  placementNotes?: string;
  serviceAreaConfirmed: boolean;
}): { html: string; text: string } {
  const rows = [
    { label: "Reference", value: `#${input.quoteNumber}` },
    { label: "Customer", value: input.customerName },
    { label: "Email", value: input.email },
    { label: "Phone", value: input.phone },
    { label: "Container", value: input.sizeLabel },
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
      intro: "A new dumpster request was saved from the website booking flow.",
      body: [
        detailsTable(rows),
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
      `Requested date: ${input.neededDate}`,
      `Address: ${input.address}`,
      `Service area: ${input.serviceAreaConfirmed ? "Confirmed by ZIP rules" : "Needs review"}`,
      input.placementNotes ? `Placement notes: ${input.placementNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
