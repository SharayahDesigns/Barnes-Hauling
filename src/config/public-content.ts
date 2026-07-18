import { siteRoutes } from "./site";

export type PublicAction = Readonly<{
  label: string;
  href: string;
}>;

export type DumpsterRate = Readonly<{
  key: "15-residential" | "15-heavy" | "22-residential";
  size: "15-yard" | "22-yard";
  use: string;
  dimensions: string;
  price: Readonly<
    | { type: "fixed"; amountCents: number }
    | { type: "quote_required"; label: "Contact for current rate" }
  >;
  rentalDays: 5;
  includedTons: 3;
  materialRules: readonly string[];
  href: string;
}>;

export const dumpsterRates = [
  {
    key: "15-residential",
    size: "15-yard",
    use: "Residential waste",
    dimensions: "7 ft × 14 ft × 4 ft walls",
    price: { type: "fixed", amountCents: 27500 },
    rentalDays: 5,
    includedTons: 3,
    materialRules: [
      "Residential waste only",
      "No dirt, soil, gravel, or concrete",
      "No hazardous materials",
    ],
    href: siteRoutes.dumpster15,
  },
  {
    key: "15-heavy",
    size: "15-yard",
    use: "Heavy materials",
    dimensions: "7 ft × 14 ft × 4 ft walls",
    price: { type: "fixed", amountCents: 35000 },
    rentalDays: 5,
    includedTons: 3,
    materialRules: [
      "Dirt, sod, concrete, and gravel only",
      "No residential household trash",
      "Swap-out service is priced as another rental",
    ],
    href: siteRoutes.dumpster15,
  },
  {
    key: "22-residential",
    size: "22-yard",
    use: "Residential waste",
    dimensions: "7 ft × 14 ft × 6 ft walls",
    price: { type: "quote_required", label: "Contact for current rate" },
    rentalDays: 5,
    includedTons: 3,
    materialRules: [
      "Residential waste only",
      "No dirt, sod, concrete, or gravel",
      "No hazardous materials",
    ],
    href: siteRoutes.dumpster22,
  },
] as const satisfies readonly DumpsterRate[];

export const dumpsterFees = {
  additionalWeight: { amountCents: 5000, unit: "ton" },
  specialtyItems: ["Mattresses", "Box springs", "Refrigerators"],
  specialtyItemAmountCents: 3000,
  unknownConditionalFees: [
    "Delivery-zone charges",
    "Additional rental days",
    "Prohibited-material charges",
    "Overloaded-container charges",
    "Applicable taxes",
  ],
} as const;

export const publicFaqs = [
  {
    question: "How long is a dumpster rental?",
    answer:
      "The supplied rate sheet lists a five-day rental period unless otherwise agreed. Additional-day pricing has not been confirmed and must be reviewed before booking.",
  },
  {
    question: "How much weight is included?",
    answer:
      "The listed 15-yard and 22-yard options include up to three tons of disposal. Additional weight is $50 per ton after the included three tons.",
  },
  {
    question: "Can heavy material go in any dumpster?",
    answer:
      "No. Dirt, sod, concrete, and gravel belong only in the 15-yard heavy-material rental. Residential-waste containers must not be loaded with those materials.",
  },
  {
    question: "What items have a specialty fee?",
    answer:
      "Mattresses, box springs, and refrigerators are listed at $30 each. Handling requirements still need confirmation for the final order.",
  },
  {
    question: "Is the 22-yard dumpster free?",
    answer:
      "No. Its current base rate is not confirmed. The correct price is “Contact for current rate,” never zero dollars.",
  },
  {
    question: "Can I book online now?",
    answer:
      "Not yet. Online quote and booking processing will open only after service areas, availability, taxes, conditional fees, and required policies are confirmed.",
  },
] as const;

export const publicProcess = [
  {
    step: "01",
    title: "Choose the right path",
    text: "Use hauling when Barnes loads the material, or compare dumpsters when you want a container on site.",
  },
  {
    step: "02",
    title: "Share the project details",
    text: "A future quote will collect location, material, access, photos, timing, and contact details so the request can be reviewed accurately.",
  },
  {
    step: "03",
    title: "Confirm before work begins",
    text: "Service area, availability, pricing assumptions, restrictions, and required terms must be confirmed before a job becomes booked.",
  },
] as const;

export function formatCents(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}
