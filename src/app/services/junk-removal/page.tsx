import {
  CtaBand,
  PageHero,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Junk removal and hauling",
  "Plan a Barnes hauling estimate for item pickup, cleanouts, and projects where labor, access, volume, and materials affect pricing.",
  siteRoutes.junkRemoval,
);

export default function JunkRemovalPage() {
  return (
    <>
      <PageHero
        eyebrow="Hauling & junk removal"
        title="When you want the loading handled."
        summary="Hauling is the better path for item pickup, cleanouts, and projects where labor, volume, weight, access, and material details need review before a price is confirmed."
        primaryAction={{ label: "Explore the quote process", href: siteRoutes.quote }}
        secondaryAction={{ label: "See all services", href: siteRoutes.services }}
      />
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>A project-based estimate, not a made-up flat rate.</h2>
              <p>
                Hauling prices can depend on item count, truck volume, labor,
                weight, stairs, access difficulty, distance, disposal fees, and
                specialty handling. Those inputs must be reviewed before a
                customer sees a final price.
              </p>
              <h3>Useful details for the future request</h3>
              <ul>
                <li>What needs to be removed and the approximate volume</li>
                <li>Where the material is located and how it can be accessed</li>
                <li>Heavy, mixed, or specialty materials</li>
                <li>Photos that help Barnes understand the project</li>
                <li>The service address and preferred timing</li>
              </ul>
            </div>
            <div className={styles.detailGrid}>
              <article className={styles.detailCard}>
                <h3>Best for reviewed estimates</h3>
                <p>
                  Cleanouts, mixed loads, uncertain volume, difficult access,
                  and projects that may need onsite confirmation.
                </p>
              </article>
              <article className={styles.detailCard}>
                <h3>No instant price yet</h3>
                <p>
                  Barnes has not confirmed public hauling prices or minimum
                  charges. This page will not invent them.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
      <CtaBand
        title="Prepare the project details now."
        text="The quote route explains the upcoming request flow but does not submit information or create a lead yet."
        secondary={{ label: "Compare dumpster rentals", href: siteRoutes.dumpsterRental }}
      />
    </>
  );
}
