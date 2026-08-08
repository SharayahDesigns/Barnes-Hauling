import { z } from "zod";

export type SizeKey = string;

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
  sizeKey: z
    .string()
    .trim()
    .min(1, "Choose a container."),
  rentalDays: z.coerce
    .number()
    .int("Choose a rental duration.")
    .positive("Choose a rental duration."),

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

export const customQuoteRequestSchema = z.object({
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
  sizeKey: z.string().trim().min(1, "Choose a container."),
  rentalDays: z.coerce
    .number()
    .int("Enter the number of days you need.")
    .positive("Enter the number of days you need."),
  neededDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a delivery date."),
  firstName: z.string().trim().min(1, "First name is required.").max(120),
  lastName: z.string().trim().min(1, "Last name is required.").max(120),
  email: z.string().trim().max(254).email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid phone number.")
    .max(30),
  customerNote: optionalText(1000),
  placementLatitude: z.number().min(-90).max(90).optional(),
  placementLongitude: z.number().min(-180).max(180).optional(),
  turnstileToken: z.string().optional(),
});

export type CustomQuoteRequestInput = z.infer<typeof customQuoteRequestSchema>;

/**
 * Digits-only phone for storage/notification destinations. Presentation
 * formatting stays in the UI layer.
 */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}
