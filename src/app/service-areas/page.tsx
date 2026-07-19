import Link from "next/link";

import {
  Callout,
  CtaBand,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Service areas",
  "Review the current Barnes service-area verification status and what location details will be checked before quoting or booking.",
  siteRoutes.serviceAreas,
);

export default function ServiceAreasPage() {
  return (
    <>
      <PageHero
        eyebrow="Service areas"
        title="Coverage is confirmed by address, not assumption."
        summary="Barnes has not yet approved a public city, ZIP-code, or delivery-zone list. No location is represented as served until the operating area and related charges are confirmed."
        primaryAction={{ label: "Explore services", href: siteRoutes.services }}
        secondaryAction={{ label: "Contact status", href: siteRoutes.contact }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <SectionIntro
              eyebrow="Current status"
              title="Service-area configuration is still pending."
              text="The database intentionally contains no active service areas. Booking processing will stay inactive until Barnes confirms coverage and delivery-zone rules."
            />
            <Callout>
              <h3>No city list is published yet.</h3>
              <p>
                This prevents thin location pages, false coverage claims, and
                pricing that ignores travel or delivery zones.
              </p>
            </Callout>
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Future address check"
            title="What will be confirmed before the next step."
          />
          <div className={styles.trustGrid}>
            <article className={styles.trustCard}>
              <span aria-hidden="true">1</span>
              <h3>Coverage</h3>
              <p>The exact service address must fall within an approved area or zone.</p>
            </article>
            <article className={styles.trustCard}>
              <span aria-hidden="true">2</span>
              <h3>Service fit</h3>
              <p>Hauling and dumpster availability may differ by location and project.</p>
            </article>
            <article className={styles.trustCard}>
              <span aria-hidden="true">3</span>
              <h3>Location charges</h3>
              <p>Any confirmed delivery or travel-zone adjustment must appear before commitment.</p>
            </article>
          </div>
          <p className={styles.notice}>
            <strong>Have a project planned?</strong>{" "}
            <Link href={siteRoutes.book}>Review the booking process</Link>
            {" "}and the location details it will request.
          </p>
        </div>
      </section>

      <CtaBand
        title="Start with the service, then confirm the address."
        text="Explore both public service paths while Barnes finalizes the coverage information needed for production booking."
      />
    </>
  );
}
