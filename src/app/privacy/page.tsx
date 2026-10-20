import Link from "next/link";

import { marketingStyles as styles } from "@/components/marketing/marketing";
import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Privacy Policy",
  "How Barnes Hauling and Disposal collects, uses, and protects information submitted through quotes, bookings, and payments.",
  siteRoutes.privacy,
);

const EFFECTIVE_DATE = "October 19, 2026";

export default function PrivacyPage() {
  const phone = businessConfig.contact.phone;
  const email = businessConfig.contact.email;

  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.prose}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Privacy Policy</h1>
          <p>
            <em>Effective {EFFECTIVE_DATE}</em>
          </p>

          <p>
            This policy explains what information Barnes Hauling and Disposal
            (&ldquo;Barnes,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
            collects when you request a quote, book a dumpster rental, or
            otherwise contact us through this website, and how that
            information is used, shared, and protected.
          </p>

          <h2>Information we collect</h2>

          <h3>Information you provide</h3>
          <ul>
            <li>
              Contact details such as your name, phone number, and email
              address
            </li>
            <li>
              Service details such as your project address, container size,
              delivery and pickup dates, and material type
            </li>
            <li>
              Messages you send us through the contact form, booking flow, or
              by phone or email
            </li>
          </ul>

          <h3>Payment information</h3>
          <p>
            Payments are processed directly by Stripe. We never receive or
            store your full card number, expiration date, or security code.
            We retain only the payment status and the limited reference
            information Stripe provides to confirm, track, and, when
            authorized, apply additional documented charges to a booking.
          </p>

          <h3>Location information</h3>
          <p>
            The booking form uses Google Maps to help you enter and confirm a
            delivery address. Address text you enter during that step is sent
            to Google to return matching addresses.
          </p>

          <h3>Information collected automatically</h3>
          <p>
            Our hosting and security providers automatically log standard
            technical information when you visit this site, such as IP
            address, browser type, and pages requested. This information is
            used to operate, secure, and troubleshoot the site, not to build
            an advertising profile.
          </p>

          <h2>How we use information</h2>
          <ul>
            <li>Prepare quotes and respond to inquiries</li>
            <li>Create, confirm, and schedule bookings</li>
            <li>Process payments and any additional charges you authorize</li>
            <li>
              Send booking confirmations, receipts, and service-related
              updates
            </li>
            <li>Maintain records required for accounting and disputes</li>
            <li>Detect, prevent, and respond to fraud, abuse, or security issues</li>
          </ul>

          <h2>How we share information</h2>
          <p>
            We do not sell your information. We share it only with the
            service providers that help us run this business, and only to
            the extent each needs it to do its job:
          </p>
          <ul>
            <li>
              <strong>Stripe</strong> &mdash; payment processing
            </li>
            <li>
              <strong>Resend</strong> &mdash; delivery of booking, quote, and
              receipt emails
            </li>
            <li>
              <strong>Supabase</strong> &mdash; secure storage of booking and
              account records
            </li>
            <li>
              <strong>Google Maps</strong> &mdash; address lookup during
              booking
            </li>
            <li>
              <strong>Cloudflare</strong> &mdash; website hosting and security
            </li>
          </ul>
          <p>
            We may also disclose information when required by law or to
            protect the rights, property, or safety of Barnes, our customers,
            or others.
          </p>

          <h2>Cookies</h2>
          <p>
            This site uses only the cookies necessary for the site to
            function, such as session cookies that support staff sign-in and
            basic security protections. We do not currently use third-party
            advertising or analytics cookies.
          </p>

          <h2>Text messages</h2>
          <p>
            We do not currently send SMS or text messages. If that changes,
            this policy and the booking flow will be updated to describe how
            text consent is collected and how to opt out.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep booking, payment, and signed-agreement records for as
            long as needed to provide the service, meet accounting and tax
            obligations, and resolve any disputes.
          </p>

          <h2>Your choices</h2>
          <p>
            You can ask us to access, correct, or delete the personal
            information we hold about you by contacting us using the details
            below. We will honor requests except where we are required to
            keep information for legal, accounting, or dispute-resolution
            reasons.
          </p>

          <h2>Children&rsquo;s privacy</h2>
          <p>
            Our services are intended for adults arranging hauling or
            dumpster rental services. We do not knowingly collect information
            from children.
          </p>

          <h2>Data security</h2>
          <p>
            We use reasonable administrative and technical safeguards to
            protect the information you share with us. No method of
            transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as our services or practices change.
            The effective date above reflects the most recent revision.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions about this policy or your information can be sent to{" "}
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
            <Link className={styles.textLink} href={siteRoutes.terms}>
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
