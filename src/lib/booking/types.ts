/**
 * Shared result types for the booking server actions. Kept out of
 * `actions.ts` because a `"use server"` module may only export async functions.
 */

export type PostalCodeCheck = {
  status: "validated" | "unconfirmed" | "invalid";
};

export type SubmitBookingResult =
  | {
      ok: true;
      quoteNumber: number;
      serviceAreaConfirmed: boolean;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

export type UnavailableReason = {
  /** YYYY-MM-DD (Denver local). */
  date: string;
  kind: "blackout" | "reserved" | "closed";
  /** Customer-facing explanation shown when the date is clicked. */
  message: string;
};

export type DeliveryAvailability = {
  /** Earliest selectable date (YYYY-MM-DD, Denver local). */
  minDate: string;
  /** Latest selectable date (YYYY-MM-DD, Denver local). */
  maxDate: string;
  /**
   * Unavailable dates per bookable size key. Blackouts and delivery-slot limits
   * apply to every size; dumpster-inventory fullness is size-specific.
   */
  bySizeKey: Record<string, UnavailableReason[]>;
  /** Whether any active availability rules exist (if not, slot capacity is unconstrained). */
  hasRules: boolean;
};

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      error: string;
      quoteRequired?: boolean;
      fieldErrors?: Record<string, string>;
    };
