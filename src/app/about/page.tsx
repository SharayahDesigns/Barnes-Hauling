import {
  CtaBand,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "About",
  "Learn how Barnes separates hauling and dumpster rental paths and why the public site shows only verified business, pricing, and service information.",
  siteRoutes.about,
);

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Barnes"
        title="A clearer front door for the heavy work."
        summary="Barnes Hauling and Disposal is building a public service experience around two distinct needs: full-service hauling and on-site dumpster rentals."
        primaryAction={{ label: "Explore services", href: siteRoutes.services }}
        secondaryAction={{ label: "Read the FAQ", href: siteRoutes.faq }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>Useful information first. Operational promises second.</h2>
              <p>
                This marketing foundation is designed to help customers choose
                the right service and understand confirmed dumpster terms. It
                does not publish unverified coverage, availability, business
                history, credentials, reviews, or guarantees.
              </p>
              <p>
                As Barnes confirms those facts, typed business configuration
                can make them available consistently across the site without
                duplicating or drifting content.
              </p>
            </div>
            <div className={styles.detailGrid}>
              <article className={styles.detailCard}>
                <h3>Hauling</h3>
                <p>
                  A reviewed estimate path for projects shaped by labor,
                  volume, weight, access, disposal, and handling details.
                </p>
              </article>
              <article className={styles.detailCard}>
                <h3>Dumpster rentals</h3>
                <p>
                  A container path shaped by size, material, location,
                  duration, included weight, restrictions, and availability.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="What is verified today"
            title="A deliberately short list of public facts."
          />
          <div className={styles.trustGrid}>
            <article className={styles.trustCard}>
              <span aria-hidden="true">B</span>
              <h3>Business identity</h3>
              <p>Barnes Hauling and Disposal is the confirmed business name.</p>
            </article>
            <article className={styles.trustCard}>
              <span aria-hidden="true">2</span>
              <h3>Two service models</h3>
              <p>The platform supports hauling and junk removal plus dumpster rentals.</p>
            </article>
            <article className={styles.trustCard}>
              <span aria-hidden="true">15</span>
              <h3>Supplied rental facts</h3>
              <p>15-yard and 22-yard dimensions, rates, terms, and restrictions come from the provided sheet.</p>
            </article>
          </div>
        </div>
      </section>

      <CtaBand
        title="Choose the path that fits the project."
        text="Compare the service models or review the information needed for a future quote request."
      />
    </>
  );
}
