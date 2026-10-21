/**
 * The in-progress booking is kept in this browser tab's sessionStorage so an
 * accidental refresh (or backing out of Stripe) doesn't lose it. It lives
 * only in this tab and is cleared once payment succeeds.
 */
export const BOOKING_DRAFT_KEY = "barnes-booking-draft-v2";
/** Drafts saved before steps were remembered (form fields only). */
export const LEGACY_BOOKING_DRAFT_KEY = "barnes-booking-draft-v1";

export function clearBookingDraft(): void {
  try {
    window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
    window.sessionStorage.removeItem(LEGACY_BOOKING_DRAFT_KEY);
  } catch {
    // Storage unavailable (private mode): nothing to clear.
  }
}
