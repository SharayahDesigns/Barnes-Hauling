// Lead pipeline statuses (mirrors the public.quote_status enum / doc 10 stages).
export const QUOTE_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "sent",
  "awaiting_customer_approval",
  "approved",
  "declined",
  "expired",
  "cancelled",
  "lost",
  "spam",
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
