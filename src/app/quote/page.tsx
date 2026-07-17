import Link from "next/link";

import {
  Callout,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Quote process preview",
  "Preview the information a future Barnes hauling or junk-removal quote request will collect. Quote submissions are not active yet.",
  siteRoutes.quote,
  { noIndex: true },
);

export default function QuotePage() {
  return (
    <>
      <PageHero
        eyebrow="Quote process preview"
        title="A better estimate starts with a complete picture."
        summary="This entry page explains the upcoming hauling quote process. It does not submit information, create a customer record, or promise an estimate yet."
        primaryAction={{ label: "Explore junk removal", href: siteRoutes.junkRemoval }}
        secondaryAction={{ label: "Compare dumpsters instead", href: siteRoutes.dumpsterRental }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="What the future request will cover"
            title="Project, access, location, and contact details."
            text="The finished flow will show progress, validate inputs on the server, and make it clear when Barnes review is required."
          />
          <div className={styles.processGrid}>
            <article className={styles.processCard}>
              <span>01</span>
              <div>
                <h3>Project scope</h3>
                <p>Service type, items or volume, material details, and useful project photos.</p>
              </div>
            </article>
            <article className={styles.processCard}>
              <span>02</span>
              <div>
                <h3>Access and address</h3>
                <p>Location, stairs or access difficulty, placement details, and service-area validation.</p>
              </div>
            </article>
            <article className={styles.processCard}>
              <span>03</span>
              <div>
                <h3>Review and confirmation</h3>
                <p>Contact information, consent, estimate status, and clear next steps after Barnes review.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>Nothing is submitted from this page.</h2>
              <p>
                Quote processing, customer records, photo uploads, scheduling,
                authentication, agreements, payments, and notifications belong
                to later approved milestones.
              </p>
              <Link className={styles.textLink} href={siteRoutes.services}>
                Return to services <span aria-hidden="true">→</span>
              </Link>
            </div>
            <Callout>
              <h3>Quote availability is pending.</h3>
              <p>
                Service areas, validation, customer consent language, and the
                operational review workflow must be completed before this page
                can accept a request.
              </p>
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
