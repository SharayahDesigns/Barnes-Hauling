// Booking lifecycle statuses (mirrors the public.booking_status enum).
export const BOOKING_STATUSES = [
  "draft",
  "pending_review",
  "pending_payment",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
