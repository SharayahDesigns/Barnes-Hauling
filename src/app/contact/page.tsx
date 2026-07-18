import Link from "next/link";

import {
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Contact",
  "Review Barnes contact availability and choose the appropriate public service, quote, or dumpster planning path.",
  siteRoutes.contact,
);

export default function ContactPage() {
  const phone = businessConfig.contact.phone;
  const email = businessConfig.contact.email;

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Start with the reason you are reaching out."
        summary="Barnes has a verified customer email. A public phone number, address, and business hours will appear here only after Barnes confirms them."
        primaryAction={{ label: "Review quote process", href: siteRoutes.quote }}
        secondaryAction={{ label: "Review booking process", href: siteRoutes.book }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Contact paths"
            title="Use the route that matches the project."
          />
          <div className={styles.contactGrid}>
            <article className={styles.contactCard}>
              <p className={styles.eyebrow}>Project estimate</p>
              <h2>Hauling or junk removal</h2>
              <p>See the details that will support a reviewed project estimate.</p>
              <Link href={siteRoutes.quote}>Explore the quote entry page →</Link>
            </article>
            <article className={styles.contactCard}>
              <p className={styles.eyebrow}>Container rental</p>
              <h2>Dumpster planning</h2>
              <p>Compare containers and review the future delivery-planning process.</p>
              <Link href={siteRoutes.book}>Explore the booking entry page →</Link>
            </article>
          </div>

          {isConfirmedBusinessFact(phone) || isConfirmedBusinessFact(email) ? (
            <div className={styles.contactGrid}>
              {isConfirmedBusinessFact(phone) ? (
                <article className={styles.contactCard}>
                  <h2>Phone</h2>
                  <a href={`tel:${phone.value}`}>{phone.value}</a>
                </article>
              ) : null}
              {isConfirmedBusinessFact(email) ? (
                <article className={styles.contactCard}>
                  <h2>Email</h2>
                  <a href={`mailto:${email.value}`}>{email.value}</a>
                </article>
              ) : null}
            </div>
          ) : (
            <p className={styles.notice}>
              <strong>Contact details pending:</strong> no phone number, email,
              public address, or hours will be displayed until verified by Barnes.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
