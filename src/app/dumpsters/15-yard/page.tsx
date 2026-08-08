import {
  Callout,
  CtaBand,
  DumpsterCard,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import {
  dumpsterFees,
  dumpsterRates,
  formatCents,
} from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

const fifteenYardRates = dumpsterRates.filter((rate) => rate.size === "15-yard");

export const metadata = createPageMetadata(
  "15-yard dumpster",
  "Review Barnes 15-yard residential-waste and heavy-material dumpster rates, dimensions, included tonnage, and loading restrictions.",
  siteRoutes.dumpster15,
);

export default function FifteenYardPage() {
  return (
    <>
      <PageHero
        eyebrow="15-yard dumpster"
        title="One size. Two loads that cannot mix."
        summary="The 15-yard container is listed at 7 feet wide by 14 feet long with 4-foot walls. Choose either residential waste or a dedicated heavy-material load."
        primaryAction={{ label: "Plan a dumpster rental", href: siteRoutes.book }}
        secondaryAction={{ label: "Compare all dumpsters", href: siteRoutes.dumpsterRental }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Choose by material"
            title="Residential waste and heavy material have separate rates."
          />
          <div className={styles.detailGrid}>
            {fifteenYardRates.map((rate) => (
              <DumpsterCard key={rate.key} rate={rate} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>What the confirmed rate includes</h2>
              <ul>
                <li>Residential waste: {formatCents(25000)} for 48 hours or {formatCents(27500)} for 5 days</li>
                <li>Residential waste includes 2 tons of disposal</li>
                <li>
                  Additional weight at {formatCents(dumpsterFees.additionalWeight.amountCents)}
                  {" "}per ton after the included residential 2 tons
                </li>
              </ul>
              <h3>Specialty items</h3>
              <p>
                Mattresses, box springs, and refrigerators are listed at
                {" "}{formatCents(dumpsterFees.specialtyItemAmountCents)} each.
              </p>
              <p>
                Heavy-material rentals start at {formatCents(39500)} for 5 days,
                but they require staff approval because the included weight and
                overage rate depend on the approved material.
              </p>
            </div>
            <Callout>
              <h3>Keep material types separate.</h3>
              <p>
                Heavy-material rentals allow one clean material type only. Dirt,
                concrete, gravel, rock, or sod cannot be mixed with household
                trash or unapproved debris.
              </p>
            </Callout>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to plan the placement and load?"
        text="The booking entry page explains what will be needed, but it does not reserve a container or create a booking yet."
        secondary={{ label: "Check service-area status", href: siteRoutes.serviceAreas }}
      />
    </>
  );
}
