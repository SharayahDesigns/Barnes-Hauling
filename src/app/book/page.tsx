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
  "Dumpster booking preview",
  "Preview the future Barnes dumpster rental booking process. Reservations, scheduling, agreements, and payments are not active yet.",
  siteRoutes.book,
  { noIndex: true },
);

export default function BookPage() {
  return (
    <>
      <PageHero
        eyebrow="Dumpster booking preview"
        title="Plan the load now. Reserve only when the details are ready."
        summary="This entry page explains the upcoming dumpster booking process. It does not reserve inventory, create a booking, select availability, or collect payment."
        primaryAction={{ label: "Compare dumpsters", href: siteRoutes.dumpsterRental }}
        secondaryAction={{ label: "Check service-area status", href: siteRoutes.serviceAreas }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Upcoming booking path"
            title="Every decision needed before a container is scheduled."
          />
          <div className={styles.entryGrid}>
            <article className={styles.entryCard}>
              <p className={styles.eyebrow}>Step 1</p>
              <h2>Address and service area</h2>
              <p>Validate the delivery address and any confirmed location-based charge.</p>
            </article>
            <article className={styles.entryCard}>
              <p className={styles.eyebrow}>Step 2</p>
              <h2>Material and container</h2>
              <p>Keep residential waste separate from heavy materials and choose the appropriate size.</p>
            </article>
            <article className={styles.entryCard}>
              <p className={styles.eyebrow}>Step 3</p>
              <h2>Placement and timing</h2>
              <p>Confirm safe placement, access, delivery and pickup timing, capacity, and blackout dates.</p>
            </article>
            <article className={styles.entryCard}>
              <p className={styles.eyebrow}>Step 4</p>
              <h2>Price, terms, and payment</h2>
              <p>Review the complete price snapshot and approved agreement before any payment or booking confirmation.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>Booking is intentionally inactive.</h2>
              <p>
                No service areas, availability, blackout dates, or dumpster
                inventory are active. Taxes, delivery charges, extra-day rates,
                other conditional fees, and the pricing effective date also
                remain unconfirmed.
              </p>
              <Link className={styles.textLink} href={siteRoutes.dumpster15}>
                Review 15-yard pricing <span aria-hidden="true">→</span>
              </Link>
            </div>
            <Callout>
              <h3>No booking record is created.</h3>
              <p>
                Scheduling, customer accounts, agreements, payments, and
                production inventory controls are outside this milestone.
              </p>
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
