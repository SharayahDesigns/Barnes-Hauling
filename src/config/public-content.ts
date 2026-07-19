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
  // General
  {
    question: "What services does Barnes Hauling and Disposal offer?",
    answer:
      "Barnes Hauling and Disposal provides dumpster rentals, junk removal, property cleanouts, construction debris removal, yard-waste hauling, appliance removal, furniture removal, and commercial disposal services.",
    category: "General",
  },
  {
    question: "What areas do you serve?",
    answer:
      "We serve Herriman and surrounding communities throughout southwest Salt Lake County and northern Utah County. Enter your ZIP code during booking to confirm availability and any location-based delivery charge.",
    category: "General",
  },
  {
    question: "Are you locally owned?",
    answer:
      "Yes. Barnes Hauling and Disposal is a locally operated hauling and disposal company serving Utah homes, contractors, property managers, and businesses.",
    category: "General",
  },
  {
    question: "How do I book a dumpster?",
    answer:
      "Book online by choosing your dumpster size, entering your service address, and selecting a delivery date. Prefer to talk it through? Call or text us at 385-246-4219 and we'll set it up for you.",
    category: "General",
  },
  {
    question: "Do you offer free estimates?",
    answer:
      "Estimates for hauling and cleanout services are free and no-obligation. Dumpster rental pricing is shown before checkout when the project details and delivery location allow us to calculate an accurate price.",
    category: "General",
  },
  {
    question: "Can I upload photos of my project?",
    answer:
      "Yes. Photos help us estimate the amount of material, recommend the correct dumpster size, and identify access or disposal concerns before arrival.",
    category: "General",
  },
  {
    question: "Do I need to be present?",
    answer:
      "You may not need to be present if we have clear access, placement instructions, signed authorization, and payment arrangements. Some hauling jobs require onsite approval before work begins.",
    category: "General",
  },
  {
    question: "Do you recycle or donate usable items?",
    answer:
      "When practical, we separate reusable, recyclable, and disposable materials. Donation and recycling depend on item condition, facility availability, and local acceptance rules.",
    category: "General",
  },
  // Dumpster Rentals
  {
    question: "What dumpster sizes do you offer?",
    answer:
      "Barnes offers two roll-off sizes: a 15-yard container (about 7 ft by 14 ft with 4-ft walls) and a 22-yard container (about 7 ft by 14 ft with 6-ft walls). Each size lists its estimated capacity and examples of what fits so you can compare before booking.",
    category: "Dumpster Rentals",
  },
  {
    question: "Which dumpster size should I choose?",
    answer:
      "The 15-yard container is usually right for moderate cleanouts, landscaping, roofing debris, and smaller remodels. The 22-yard is better for whole-home cleanouts, larger renovations, bulky furniture, and higher-volume projects. For heavy materials such as concrete, dirt, roofing shingles, brick, and tile, weight matters more than volume, so contact us before booking.",
    category: "Dumpster Rentals",
  },
  {
    question: "How much can I put in the dumpster?",
    answer:
      "Material must stay below the top edge of the dumpster and must not extend beyond the sides. Overfilled containers may be unsafe to transport and can result in a blocked-pickup or unloading fee.",
    category: "Dumpster Rentals",
  },
  {
    question: "How long is the rental period?",
    answer:
      "Each rental includes a standard rental period, with additional days available at a set daily rate subject to availability. Your included days and any additional-day rate are shown at checkout and in your rental agreement.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I extend my rental?",
    answer:
      "Yes. Request an extension before your scheduled pickup date. Extensions are subject to availability and the additional-day rate shown in your rental agreement.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I request an early pickup?",
    answer:
      "Yes. Request an early pickup through the customer portal, by phone, or by text. Early pickup does not normally reduce the original rental price unless stated otherwise.",
    category: "Dumpster Rentals",
  },
  {
    question: "Is delivery and pickup included?",
    answer:
      "Delivery and pickup within our standard service zone are included in the displayed rental price. Any location-based charges, special-access fees, or extended-distance fees are shown before payment.",
    category: "Dumpster Rentals",
  },
  {
    question: "Are prices different based on location?",
    answer:
      "Yes. Delivery pricing may depend on driving distance, travel time, fuel usage, disposal-site distance, and service-zone capacity. Enter your delivery address to receive location-specific pricing.",
    category: "Dumpster Rentals",
  },
  {
    question: "What is included in the base rental price?",
    answer:
      "The base price covers dumpster delivery, scheduled pickup, the included rental days, the included weight allowance, disposal fees up to the included limit, and standard service-zone travel. Taxes, extra rental days, excess weight, prohibited materials, failed delivery, blocked pickup, relocation, or damage may cost extra.",
    category: "Dumpster Rentals",
  },
  {
    question: "Is there a weight limit?",
    answer:
      "Yes. Each rental includes a set weight allowance, and additional weight is billed at a per-ton rate. Your included allowance and overage rate are shown at checkout and in your rental agreement.",
    category: "Dumpster Rentals",
  },
  {
    question: "How is excess weight calculated?",
    answer:
      "The disposal facility provides a weight ticket showing the loaded weight. We compare the documented net weight against your included allowance and bill any excess using the rate in your agreement.",
    category: "Dumpster Rentals",
  },
  {
    question: "Will I receive the weight ticket?",
    answer:
      "Yes. Customers charged for excess weight receive an itemized notice with supporting weight-ticket information.",
    category: "Dumpster Rentals",
  },
  {
    question: "Do you charge for extra days?",
    answer:
      "Yes. Rentals kept beyond the included period are charged a set additional-day rate unless an extension or long-term rate has been approved.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I rent a dumpster for one day?",
    answer:
      "Yes, depending on availability. A minimum rental price may still apply because delivery, pickup, labor, transportation, and disposal costs remain the same.",
    category: "Dumpster Rentals",
  },
  {
    question: "Do you offer same-day delivery?",
    answer:
      "Same-day delivery may be available when a dumpster, driver, and delivery window are open. A same-day service charge may apply and is shown before you confirm.",
    category: "Dumpster Rentals",
  },
  {
    question: "Do you deliver on weekends?",
    answer:
      "Weekend or after-hours delivery and pickup may be available and can include an additional charge. Contact us to confirm weekend availability for your dates.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I move the dumpster after delivery?",
    answer:
      "No. Please do not move or reposition the dumpster yourself. Contact Barnes if the container must be relocated; a relocation fee may apply.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can the dumpster be placed on the street?",
    answer:
      "Street placement may require permission or a permit from the city, homeowners association, or property owner. The customer is responsible for obtaining required approvals unless Barnes agrees otherwise in writing.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can the dumpster be placed in my driveway?",
    answer:
      "Yes, if the driveway is accessible and suitable for the truck and loaded container. Please disclose steep grades, weak surfaces, low-clearance areas, underground structures, or existing damage.",
    category: "Dumpster Rentals",
  },
  {
    question: "Will the dumpster damage my driveway?",
    answer:
      "We take reasonable precautions, but dumpsters and delivery trucks are heavy. Cracking, scratching, sinking, or surface damage can occur, especially on asphalt, decorative concrete, pavers, soft ground, or already damaged surfaces. Driveway-protection options and the property-damage waiver should be reviewed before delivery.",
    category: "Dumpster Rentals",
  },
  {
    question: "How much clearance is required?",
    answer:
      "The delivery area should have adequate vertical clearance and enough straight-line access for the delivery vehicle. Please remove cars, trailers, branches, gates, and other obstructions before arrival.",
    category: "Dumpster Rentals",
  },
  {
    question: "What happens if the driver cannot deliver the dumpster?",
    answer:
      "A failed-delivery or dry-run fee may apply if the driver cannot safely access the location because of blocked access, incorrect instructions, low clearance, unsafe conditions, missing permits, or customer unavailability.",
    category: "Dumpster Rentals",
  },
  {
    question: "What happens if the dumpster is blocked during pickup?",
    answer:
      "A blocked-pickup fee may apply if the driver cannot retrieve the dumpster because of parked vehicles, locked gates, excessive material, unsafe loading, frozen debris, or other obstructions.",
    category: "Dumpster Rentals",
  },
  {
    question: "What happens if the dumpster is overloaded?",
    answer:
      "An overloaded or unsafe dumpster may not be transported. You may need to remove material before pickup and may be charged for additional time, a return trip, excess weight, or unsafe loading.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can material stick out above the walls?",
    answer:
      "No. Material must stay at or below the top edge of the dumpster. Nothing may extend over the sides or create a transportation hazard.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I mix different types of debris?",
    answer:
      "General household and construction debris may be mixed when allowed. Concrete, dirt, brick, asphalt, roofing materials, appliances, tires, electronics, and hazardous materials may require separate handling or approval.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I rent a dumpster for roofing shingles?",
    answer:
      "Yes, with prior approval. Shingles are heavy, so fill limits may be lower than the container's physical capacity. Tell us the roof size and number of shingle layers before booking.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I put concrete or dirt in the dumpster?",
    answer:
      "Only with prior approval. Concrete, soil, brick, asphalt, rock, tile, and similar dense materials normally require a dedicated heavy-material load and a reduced fill level.",
    category: "Dumpster Rentals",
  },
  {
    question: "Can I use the dumpster for yard waste?",
    answer:
      "Yes, subject to local disposal rules. Branches, soil, sod, stumps, and mixed yard debris may have separate pricing or restrictions.",
    category: "Dumpster Rentals",
  },
  // Accepted & Prohibited Materials
  {
    question: "What items can I put in a dumpster?",
    answer:
      "Commonly accepted materials include household junk, furniture, wood, drywall, flooring, cabinets, nonhazardous construction debris, and yard debris, plus roofing materials and appliances with approval. Acceptance depends on the selected service and disposal-facility rules.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "What materials are prohibited?",
    answer:
      "Without written approval, do not place paint, solvents, fuels, motor oil, pesticides, chemicals, propane tanks, explosives, ammunition, medical waste, asbestos, radioactive material, batteries, refrigerants, wet concrete, liquids, or hazardous or infectious waste in a dumpster.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I throw away paint?",
    answer:
      "Wet paint is generally prohibited. Completely dried latex paint may be accepted in some cases. Contact Barnes before disposal.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I dispose of batteries?",
    answer:
      "Automotive, lithium, rechargeable, and large batteries require special handling and should not be placed in the dumpster without approval.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I dispose of tires?",
    answer:
      "Tires require special disposal and may be subject to a per-tire fee that is shown before it applies.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I dispose of mattresses?",
    answer:
      "Mattresses and box springs may be accepted for a per-item fee that depends on local disposal costs and is shown before it applies.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I dispose of refrigerators or air conditioners?",
    answer:
      "Refrigerators, freezers, air conditioners, and other refrigerant-containing appliances require special handling, and a per-appliance fee may apply.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I dispose of televisions or electronics?",
    answer:
      "Electronics may require special recycling or disposal. Contact Barnes before placing televisions, monitors, computers, or other electronics in a dumpster.",
    category: "Accepted & Prohibited Materials",
  },
  {
    question: "Can I put asbestos in the dumpster?",
    answer:
      "No. Suspected asbestos-containing materials require specialized testing, handling, transportation, and disposal.",
    category: "Accepted & Prohibited Materials",
  },
  // Junk Removal & Hauling
  {
    question: "How does junk removal pricing work?",
    answer:
      "Hauling prices may be based on the number and type of items, the space used in the truck or trailer, weight, labor, stairs, access conditions, travel distance, disposal fees, and any specialty handling. We explain the price before work begins.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Is the online price final?",
    answer:
      "Fixed-price services may be paid in full online. Larger or uncertain hauling projects may show an estimated range that is confirmed after the crew sees the material and access conditions.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Will the crew start work before I approve the price?",
    answer:
      "No. For jobs that require onsite pricing, you approve the final price before work begins.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Do you remove single items?",
    answer:
      "Yes. We can remove individual items such as couches, mattresses, appliances, exercise equipment, and other bulky items.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Do you provide full-property cleanouts?",
    answer:
      "Yes. We help with homes, garages, basements, storage units, rental properties, estates, offices, and construction sites.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Do you remove construction debris?",
    answer:
      "Yes. We remove many types of nonhazardous construction and remodeling debris. Heavy or hazardous materials require prior approval.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Do you remove yard debris?",
    answer:
      "Yes. We can remove branches, brush, leaves, fencing, landscaping debris, and other approved outdoor materials.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Do you remove hot tubs or sheds?",
    answer:
      "Large structures may require an onsite estimate, demolition planning, utility confirmation, and additional labor. Call us with photos and measurements so we can plan the job.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Do you remove items from inside the property?",
    answer:
      "Yes. Indoor removal is available when access is safe and authorization has been provided. Additional labor may apply for stairs, long carries, disassembly, or difficult access.",
    category: "Junk Removal & Hauling",
  },
  {
    question: "Can you remove items if I am not home?",
    answer:
      "Possibly. We need clear written instructions, safe access, signed authorization, and confirmed payment arrangements.",
    category: "Junk Removal & Hauling",
  },
  // Scheduling
  {
    question: "How far in advance should I schedule?",
    answer:
      "Booking several days ahead gives the best selection. Same-day or next-day service may be available depending on equipment, crew capacity, and location.",
    category: "Scheduling",
  },
  {
    question: "Do you provide exact arrival times?",
    answer:
      "Hauling appointments generally use arrival windows rather than exact times, because traffic, disposal facilities, and earlier jobs can affect the schedule.",
    category: "Scheduling",
  },
  {
    question: "Will you notify me before arrival?",
    answer:
      "Yes. Customers receive appointment reminders and an on-the-way notification when communication consent has been provided.",
    category: "Scheduling",
  },
  {
    question: "Can I reschedule?",
    answer:
      "Yes. Rescheduling is subject to availability and the policy shown during booking. Late changes may result in a rescheduling or cancellation fee.",
    category: "Scheduling",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "Cancellations made by the deadline shown during booking may receive a refund per that policy. Late cancellations, failed deliveries, or cancellations after dispatch may be subject to fees.",
    category: "Scheduling",
  },
  {
    question: "What happens during severe weather?",
    answer:
      "Unsafe weather may require postponement, relocation, or cancellation. Barnes will contact affected customers and provide the next available option.",
    category: "Scheduling",
  },
  // Payment
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept major credit and debit cards through Stripe. Additional methods such as ACH, commercial invoicing, or in-person payment may be available for approved customers.",
    category: "Payment",
  },
  {
    question: "When is payment due?",
    answer:
      "Dumpster rentals are generally paid when the booking is confirmed. Hauling jobs may require a deposit, fixed payment, or final payment after you approve the onsite price.",
    category: "Payment",
  },
  {
    question: "Do you require a deposit?",
    answer:
      "A deposit may be required for certain services, high-demand dates, large jobs, or commercial bookings. The deposit amount is shown before you confirm.",
    category: "Payment",
  },
  {
    question: "Why do you keep a card on file?",
    answer:
      "A saved payment method may be used only for charges specifically authorized in your rental agreement, such as excess weight, extra days, blocked pickup, prohibited materials, damage, or other documented adjustments.",
    category: "Payment",
  },
  {
    question: "Will you charge my card without notice?",
    answer:
      "Authorized additional charges are documented and itemized, and you receive notice describing the reason and calculation.",
    category: "Payment",
  },
  {
    question: "Do you charge credit-card processing fees?",
    answer:
      "Any applicable payment-processing fees are disclosed at checkout.",
    category: "Payment",
  },
  {
    question: "Do prices include taxes?",
    answer:
      "Applicable taxes and mandatory fees are shown during checkout or on the final invoice.",
    category: "Payment",
  },
  {
    question: "Do you provide receipts?",
    answer:
      "Yes. Customers receive electronic receipts for payments and can access available receipts through the customer portal.",
    category: "Payment",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Refund eligibility depends on service status, cancellation timing, completed work, disposal costs, and agreement terms. Approved refunds are returned to the original payment method when possible.",
    category: "Payment",
  },
  // Waivers & Agreements
  {
    question: "Why do I need to sign a waiver?",
    answer:
      "The waiver confirms service authorization, property access, placement instructions, accepted materials, payment terms, and responsibilities related to the service.",
    category: "Waivers & Agreements",
  },
  {
    question: "Can I sign the agreement online?",
    answer:
      "Yes. Barnes uses secure electronic agreements you can review and sign from a phone, tablet, or computer.",
    category: "Waivers & Agreements",
  },
  {
    question: "Will I receive a copy?",
    answer:
      "Yes. A copy of the completed agreement is emailed to you and stored in your customer portal.",
    category: "Waivers & Agreements",
  },
  {
    question: "What information is recorded with my signature?",
    answer:
      "To preserve the signature audit trail, the system may record your name, signature, date, timestamp, document version, IP address, device information, and related booking details.",
    category: "Waivers & Agreements",
  },
  {
    question: "Can I sign for someone else's property?",
    answer:
      "You must have authority from the property owner or responsible party before authorizing service or container placement.",
    category: "Waivers & Agreements",
  },
  // Customer Portal
  {
    question: "What can I do in the customer portal?",
    answer:
      "You can review bookings, sign agreements, upload photos, view receipts, request changes, extend a rental, request pickup, and review documented charges.",
    category: "Customer Portal",
  },
  {
    question: "Do I need to create a password?",
    answer:
      "The initial system may use a secure passwordless email link rather than a traditional password.",
    category: "Customer Portal",
  },
  {
    question: "Can I request pickup online?",
    answer:
      "Yes. Dumpster customers can request pickup through the portal. A pickup request is confirmed once Barnes assigns the pickup date.",
    category: "Customer Portal",
  },
  {
    question: "Can I extend my rental online?",
    answer:
      "Yes, subject to availability. The additional charge is displayed before the extension is confirmed.",
    category: "Customer Portal",
  },
  // Commercial
  {
    question: "Do you work with contractors and property managers?",
    answer:
      "Yes. Barnes serves contractors, property managers, real-estate professionals, businesses, apartment communities, and other commercial customers.",
    category: "Commercial",
  },
  {
    question: "Do you offer recurring service?",
    answer:
      "Recurring hauling, cleanout, delivery, or pickup schedules may be available for approved commercial accounts.",
    category: "Commercial",
  },
  {
    question: "Can commercial customers use purchase-order numbers?",
    answer:
      "Yes. Approved accounts may include purchase-order or work-order numbers with each booking.",
    category: "Commercial",
  },
  {
    question: "Do you offer invoice terms?",
    answer:
      "Net-15, Net-30, or other invoicing terms may be available after account and credit approval.",
    category: "Commercial",
  },
  {
    question: "Can one company manage multiple jobsites?",
    answer:
      "Yes. Commercial accounts can maintain multiple jobsite addresses, contacts, service histories, and authorized users.",
    category: "Commercial",
  },
  {
    question: "Do you provide consolidated invoices?",
    answer:
      "Approved commercial accounts may receive consolidated invoices or monthly statements.",
    category: "Commercial",
  },
  // Support
  {
    question: "How do I contact Barnes Hauling and Disposal?",
    answer:
      "Call or text 385-246-4219 or email barneshaulingdisposal@gmail.com.",
    category: "Support",
  },
  {
    question: "What information should I provide when requesting help?",
    answer:
      "Please provide your name, booking number, service address, phone number, and a short description of the issue.",
    category: "Support",
  },
  {
    question: "What happens if I have a problem with my service?",
    answer:
      "Contact Barnes as soon as possible. We review the booking, photos, documents, scheduling history, and payment records to determine the appropriate resolution.",
    category: "Support",
  },
  {
    question: "How do I leave a review?",
    answer:
      "After service is completed, you may receive a review link by email or text. You can also request the current review link directly from Barnes.",
    category: "Support",
  },
  {
    question: "How is my personal information protected?",
    answer:
      "Your information is used to provide services, process payments, communicate about bookings, maintain records, and meet legal obligations. Payment-card information is processed by Stripe and is not stored directly by Barnes.",
    category: "Support",
  },
] as const;

export const homepageFaqs = [
  {
    question: "What areas do you serve?",
    answer:
      "We serve Herriman and surrounding communities throughout southwest Salt Lake County and northern Utah County. Enter your ZIP code during booking to confirm availability.",
  },
  {
    question: "What dumpster sizes do you offer?",
    answer:
      "Two roll-off sizes: a 15-yard container (about 7 ft by 14 ft with 4-ft walls) and a 22-yard container (about 7 ft by 14 ft with 6-ft walls).",
  },
  {
    question: "How much does a dumpster rental cost?",
    answer:
      "Pricing depends on the container size, your delivery location, the included rental days, and the weight allowance. Enter your address during booking to see accurate pricing before checkout.",
  },
  {
    question: "How long can I keep the dumpster?",
    answer:
      "Each rental includes a standard rental period, with additional days available at a set daily rate. Your included days are shown at checkout and in your rental agreement.",
  },
  {
    question: "What materials are prohibited?",
    answer:
      "Without written approval, hazardous materials such as paint, fuels, chemicals, propane tanks, batteries, refrigerants, wet concrete, liquids, and asbestos are not allowed.",
  },
  {
    question: "Is delivery and pickup included?",
    answer:
      "Delivery and pickup within our standard service zone are included in the displayed rental price. Any location-based or special-access fees are shown before payment.",
  },
  {
    question: "Do you offer same-day service?",
    answer:
      "Same-day delivery may be available when a dumpster, driver, and delivery window are open. A same-day service charge may apply and is shown before you confirm.",
  },
  {
    question: "Can I schedule and pay online?",
    answer:
      "Yes — you can choose a size, pick a delivery date, and book your dumpster online, or call us to set it up. Prices and availability are shown before checkout.",
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
