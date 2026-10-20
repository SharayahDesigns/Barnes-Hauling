import Link from "next/link";

import { marketingStyles as styles } from "@/components/marketing/marketing";
import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { dumpsterFees, formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Terms of Service",
  "The booking, payment, cancellation, and prohibited-material terms that apply to Barnes Hauling and Disposal hauling and dumpster rental services.",
  siteRoutes.terms,
);

const EFFECTIVE_DATE = "October 19, 2026";

const PROHIBITED_MATERIALS = [
  "Paint, solvents, fuels, and motor oil",
  "Pesticides and other chemicals",
  "Propane tanks, explosives, and ammunition",
  "Medical or infectious waste",
  "Asbestos and radioactive material",
  "Batteries and refrigerants",
  "Wet concrete and liquids",
];

export default function TermsPage() {
  const phone = businessConfig.contact.phone;
  const email = businessConfig.contact.email;

  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.prose}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Terms of Service</h1>
          <p>
            <em>Effective {EFFECTIVE_DATE}</em>
          </p>

          <p>
            These terms govern hauling and dumpster rental services booked
            through this website with Barnes Hauling and Disposal
            (&ldquo;Barnes,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). By
            submitting a booking, you agree to these terms.
          </p>

          <h2>Services</h2>
          <p>
            Barnes provides dumpster rentals and hauling/junk-removal
            services within our confirmed service area. Specific container
            sizes, included rental days, and included weight allowances are
            shown during booking and may vary by container.
          </p>

          <h2>Quotes, bookings &amp; scheduling</h2>
          <p>
            A quote or submitted booking request is not confirmed service
            until you receive booking confirmation. Delivery and pickup
            windows are scheduled based on availability. Same-day service may
            be available when a dumpster, driver, and delivery window are
            open, and any related charge is shown before you confirm.
          </p>

          <h2>Pricing &amp; payment</h2>
          <p>
            Pricing shown at checkout reflects the container, rental length,
            and material you select. Payment is processed through Stripe. We
            do not receive or store your full card number.
          </p>
          <p>
            A saved payment method may only be charged for additional amounts
            specifically authorized in your rental agreement &mdash; for
            example, weight above your included allowance, extra rental days,
            a failed delivery, a blocked pickup, prohibited materials, or
            documented damage. These charges are itemized and disclosed
            before they are applied. Heavy-material rentals are staff-approved
            only, and the included weight and overage rate for that material
            are confirmed before payment.
          </p>

          <div className={styles.feeGrid}>
            <article className={styles.feeCard}>
              <h3>Additional weight</h3>
              <p>
                {formatCents(dumpsterFees.additionalWeight.amountCents)} per
                ton above the included residential weight allowance.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Extra rental day</h3>
              <p>
                {formatCents(dumpsterFees.extraDay.amountCents)} per
                additional day beyond your rental term.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Excess mileage</h3>
              <p>
                {formatCents(dumpsterFees.excessMileage.amountCents)} per mile
                beyond the included delivery radius.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Late cancellation</h3>
              <p>
                {formatCents(dumpsterFees.lateCancellation.amountCents)} if
                canceled after the deadline shown during booking.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Failed delivery</h3>
              <p>
                {formatCents(dumpsterFees.failedDelivery.amountCents)} if the
                site is not ready or accessible at the scheduled delivery.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Blocked pickup</h3>
              <p>
                {formatCents(dumpsterFees.blockedPickup.amountCents)} if the
                container cannot be accessed at the scheduled pickup.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Specialty items</h3>
              <p>
                {dumpsterFees.specialtyItems.join(", ")} are each{" "}
                {formatCents(dumpsterFees.specialtyItemAmountCents)}.
              </p>
            </article>
          </div>
          <p>
            Other conditional charges &mdash; prohibited-material disposal,
            applicable taxes, relocation, or documented damage/cleaning
            &mdash; are disclosed when they apply.
          </p>

          <h2>Cancellations, rescheduling &amp; weather</h2>
          <p>
            Cancellations made by the deadline shown during booking may
            receive a refund under that policy. Cancellations made after that
            deadline, failed deliveries, and cancellations after dispatch may
            be subject to the fees above. Rescheduling is subject to
            availability and the same policy. Approved refunds are returned
            to the original payment method when possible.
          </p>
          <p>
            Unsafe weather may require us to postpone, relocate, or cancel a
            scheduled delivery or pickup. We will contact affected customers
            and offer the next available option.
          </p>

          <h2>Prohibited materials</h2>
          <p>
            Without our written approval, do not place the following in a
            dumpster:
          </p>
          <ul>
            {PROHIBITED_MATERIALS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Tires require special disposal and may be subject to a per-tire
            fee disclosed before it applies. Placing prohibited materials in
            a container may result in additional documented disposal charges.
          </p>

          <h2>Your responsibilities</h2>
          <ul>
            <li>
              Provide safe, legal access for delivery and pickup at the
              service address
            </li>
            <li>
              Obtain any permit required for a dumpster placed on a street or
              public right-of-way
            </li>
            <li>
              Load only the materials approved for your selected container,
              and keep material loaded at or below the container&rsquo;s rim
            </li>
            <li>
              Keep the delivery area clear and accessible through the
              scheduled rental period
            </li>
          </ul>

          <h2>Electronic agreement</h2>
          <p>
            When you check the agreement box during booking, that action is
            your electronic signature agreeing to the terms shown at that
            step. We record the version of those terms and the time you
            accepted them as part of your booking.
          </p>

          <h2>Communications</h2>
          <p>
            We send booking confirmations, receipts, and service updates by
            email. We do not currently send SMS or text messages.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the extent permitted by law, Barnes&rsquo;s total liability
            for any claim arising from our services is limited to the amount
            you paid for the booking giving rise to the claim. Barnes is not
            liable for indirect, incidental, or consequential damages,
            including damage caused by materials placed in a container in
            violation of these terms.
          </p>

          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws of the State of Utah,
            without regard to conflict-of-law principles.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms as our services change. The version
            shown and accepted at the time of your booking governs that
            booking.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions about these terms can be sent to{" "}
            {isConfirmedBusinessFact(email) ? (
              <a href={`mailto:${email.value}`}>{email.value}</a>
            ) : (
              "our contact email"
            )}
            {isConfirmedBusinessFact(phone) ? (
              <>
                {" "}
                or by phone at <a href={`tel:${phone.value}`}>{phone.value}</a>
              </>
            ) : null}
            .
          </p>

          <p>
            See also our{" "}
            <Link className={styles.textLink} href={siteRoutes.privacy}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
