import { dumpsterRates } from "@/config/public-content";

import type { SizeKey } from "./schema";

/**
 * Selectable container options for the booking flow, derived from the confirmed
 * catalog in `public-content.ts` so prices/specs have one source of truth.
 */
export type BookingSizeOption = Readonly<{
  key: SizeKey;
  size: string;
  use: string;
  dimensions: string;
  rentalDays: number;
  includedTons: number;
  materialRules: readonly string[];
  price:
    | { type: "fixed"; amountCents: number }
    | { type: "quote_required"; label: string };
}>;

export const bookingSizeOptions: readonly BookingSizeOption[] = dumpsterRates.map(
  (rate) => ({
    key: rate.key,
    size: rate.size,
    use: rate.use,
    dimensions: rate.dimensions,
    rentalDays: rate.rentalDays,
    includedTons: rate.includedTons,
    materialRules: rate.materialRules,
    price: rate.price,
  }),
);

export function getBookingSizeOption(key: SizeKey): BookingSizeOption {
  const option = bookingSizeOptions.find((item) => item.key === key);
  if (!option) {
    throw new Error(`Unknown dumpster size option: ${key}`);
  }
  return option;
}

/**
 * The pre-payment agreement a customer must accept before a rental can be
 * charged. This is the consent that authorizes documented overage billing, so
 * it is captured before payment (not emailed afterward). Requires legal review
 * before production use.
 */
export const PREPAYMENT_AGREEMENT_VERSION = "load-and-weight-terms-2026-07-draft";

export const PREPAYMENT_AGREEMENT_TERMS = [
  "I will only load materials allowed for the container I selected, and no hazardous or prohibited materials.",
  "Each rental includes up to 3 tons of disposal. Weight above the included limit is billed at $50 per ton, based on the disposal facility's weight ticket.",
  "Additional documented charges (prohibited materials, overloaded or blocked containers, extra days, or damage) may apply and will be itemized before they are charged.",
] as const;

export const TRANSACTIONAL_CONSENT_VERSION = "transactional-2026-07-v1";

export const TRANSACTIONAL_CONSENT_LANGUAGE =
  "I agree to receive transactional messages about my Barnes Hauling and Disposal booking (confirmations, scheduling, delivery, pickup, and receipts) at the contact details I provided.";
