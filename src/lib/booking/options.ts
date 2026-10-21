import { dumpsterRates } from "@/config/public-content";

/**
 * Selectable container options for the booking flow, derived from the confirmed
 * catalog in `public-content.ts` so prices/specs have one source of truth.
 */
export type BookingSizeOption = Readonly<{
  key: string;
  /** Options sharing this key are the same physical size (one dumpster pool). */
  sizeGroupKey: string;
  /** Size name, e.g. "15-Yard Dumpster". */
  sizeName: string;
  /** URL slug of the size, e.g. "15-yard" (used by /book?size=15-yard). */
  sizeSlug: string;
  /** What distinguishes this option within its size, e.g. "Heavy Materials". */
  optionLabel: string;
  size: string;
  use: string;
  dimensions: string;
  image: string;
  rentalDays: number;
  rentalDayOptions: readonly number[];
  includedTons: number | null;
  includedWeightLabel: string;
  materialRules: readonly string[];
  price:
    | { type: "fixed"; amountCents: number }
    | { type: "quote_required"; label: string };
}>;

export const STATIC_BOOKING_SIZE_OPTIONS: readonly BookingSizeOption[] = dumpsterRates.map(
  (rate) => ({
    key: rate.key,
    sizeGroupKey: rate.size,
    sizeName: rate.size,
    sizeSlug: rate.size,
    optionLabel: rate.use,
    size: rate.size,
    use: rate.use,
    dimensions: rate.dimensions,
    image: rate.image,
    rentalDays: rate.rentalDays,
    rentalDayOptions: rate.rentalDayOptions,
    includedTons: rate.includedTons,
    includedWeightLabel: rate.includedWeightLabel,
    materialRules: rate.materialRules,
    price: rate.price,
  }),
);

export function getBookingSizeOption(
  options: readonly BookingSizeOption[],
  key: string,
): BookingSizeOption {
  const option = options.find((item) => item.key === key);
  if (!option) {
    throw new Error(`Unknown dumpster size option: ${key}`);
  }
  return option;
}

export type BookingPreselection = Readonly<{
  /** sizeGroupKey of the size to show as chosen. */
  groupKey: string;
  /** Option to select, when the link named one or the size has only one. */
  sizeKey: string | null;
}>;

/**
 * Turns /book?size=15-yard[&load=<option code>] into a starting selection,
 * so a dumpster chosen on the home page or a size page arrives selected.
 * Unknown or stale values are ignored.
 */
export function resolveBookingPreselection(
  options: readonly BookingSizeOption[],
  sizeSlug: string | undefined,
  loadKey: string | undefined,
): BookingPreselection | null {
  const byLoad = loadKey ? options.find((option) => option.key === loadKey) : undefined;
  if (byLoad) return { groupKey: byLoad.sizeGroupKey, sizeKey: byLoad.key };
  if (!sizeSlug) return null;
  const inSize = options.filter((option) => option.sizeSlug === sizeSlug);
  if (inSize.length === 0) return null;
  return {
    groupKey: inSize[0].sizeGroupKey,
    sizeKey: inSize.length === 1 ? inSize[0].key : null,
  };
}

export function resolveBookingPrice(
  option: BookingSizeOption,
  rentalDays: number,
): BookingSizeOption["price"] {
  void rentalDays;
  return option.price;
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
  "Residential 15-yard rentals include 2 tons, and residential 22-yard rentals include 3 tons. Weight above the included limit is billed at $50 per ton based on the disposal facility's weight ticket.",
  "Heavy-material rentals are staff-approved only. Included weight and any overage rate depend on the approved material before payment.",
  "Additional documented charges such as extra days, blocked pickup, failed delivery, prohibited materials, or damage may apply and will be itemized before they are charged.",
] as const;

/**
 * Whether the booking flow offers the SMS opt-in.
 *
 * Off until Twilio is wired up and A2P 10DLC registration clears, because
 * collecting consent to text while no texting exists asks customers to agree to
 * something that cannot happen. `smsUpdates` stays in the form state and schema
 * (always false), and recordTransactionalConsents only writes an SMS consent
 * row when it is true — so nothing records consent that was not given.
 *
 * Flip to true once SMS sending is live; the checkbox and its stored consent
 * wording are unchanged and ready.
 */
export const SMS_UPDATES_ENABLED = false;

export const TRANSACTIONAL_CONSENT_VERSION = "transactional-2026-07-v1";

export const TRANSACTIONAL_CONSENT_LANGUAGE =
  "I agree to receive transactional messages about my Barnes Hauling and Disposal booking (confirmations, scheduling, delivery, pickup, and receipts) at the contact details I provided.";
