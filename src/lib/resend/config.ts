import "server-only";

export type ResendConfig = Readonly<{
  apiKey: string;
  fromEmail: string;
  replyToEmail?: string;
  contactToEmail?: string;
  bookingToEmail?: string;
  webhookSecret?: string;
}>;

export function getResendConfig(): ResendConfig {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  return {
    apiKey,
    fromEmail,
    replyToEmail: process.env.RESEND_REPLY_TO_EMAIL || undefined,
    contactToEmail: process.env.RESEND_CONTACT_TO_EMAIL || undefined,
    bookingToEmail: process.env.RESEND_BOOKING_TO_EMAIL || undefined,
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET || undefined,
  };
}

export function hasResendConfig(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
