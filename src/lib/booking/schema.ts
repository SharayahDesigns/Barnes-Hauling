import { z } from "zod";

/**
 * Shared contract for the dumpster booking flow.
 *
 * The size keys mirror the confirmed catalog in `src/config/public-content.ts`
 * and map to the seeded `service_items.code` values. Do not invent new sizes or
 * prices here; add them to the catalog and pricing migrations first.
 */

export const SIZE_KEYS = [
  "15-residential",
  "15-heavy",
  "22-residential",
] as const;

export type SizeKey = (typeof SIZE_KEYS)[number];

export const SIZE_KEY_TO_ITEM_CODE: Record<SizeKey, string> = {
  "15-residential": "dumpster_15_residential",
  "15-heavy": "dumpster_15_heavy_materials",
  "22-residential": "dumpster_22_residential",
};

// Maps a bookable size key to the physical dumpster size code (public.dumpster_sizes.code).
export const SIZE_KEY_TO_DUMPSTER_SIZE: Record<SizeKey, string> = {
  "15-residential": "15_yard",
  "15-heavy": "15_yard",
  "22-residential": "22_yard",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const bookingDraftSchema = z.object({
  // Step 1 — delivery address / service area
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Enter a valid 5-digit ZIP code."),
  addressLine1: z.string().trim().min(1, "Street address is required.").max(200),
  addressLine2: optionalText(200),
  city: z.string().trim().min(1, "City is required.").max(120),
  region: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use the 2-letter state code (for example, UT)."),

  // Step 2 — container
  sizeKey: z.enum(SIZE_KEYS),

  // Step 3 — date needed (local calendar date, validated server-side)
  neededDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a delivery date."),

  // Step 4 — contact + notification preferences
  firstName: z.string().trim().min(1, "First name is required.").max(120),
  lastName: z.string().trim().min(1, "Last name is required.").max(120),
  email: z.string().trim().max(254).email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid phone number.")
    .max(30),
  emailUpdates: z.boolean(),
  smsUpdates: z.boolean(),

  // Step 5 — placement
  placementNotes: optionalText(1000),
  placementLatitude: z.number().min(-90).max(90).optional(),
  placementLongitude: z.number().min(-180).max(180).optional(),

  // Step 6 — pre-payment agreement acknowledgement
  agreementAccepted: z.literal(true, {
    message: "You must accept the load and weight terms to continue.",
  }),

  // Spam protection (verified server-side when Turnstile is configured)
  turnstileToken: z.string().optional(),
});

export type BookingDraftInput = z.infer<typeof bookingDraftSchema>;

/**
 * Digits-only phone for storage/notification destinations. Presentation
 * formatting stays in the UI layer.
 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}
