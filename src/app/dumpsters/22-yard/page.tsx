import {
  Callout,
  CtaBand,
  DumpsterCard,
  PageHero,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { dumpsterFees, dumpsterRates, formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

const twentyTwoYardRate = dumpsterRates[2];

export const metadata = createPageMetadata(
  "22-yard dumpster",
  "Review the Barnes 22-yard residential-waste dumpster dimensions, included rental period and tonnage, restrictions, and quote-required pricing.",
  siteRoutes.dumpster22,
);

export default function TwentyTwoYardPage() {
  return (
    <>
      <PageHero
        eyebrow="22-yard dumpster"
        title="More volume. Current rate requires contact."
        summary="The 22-yard container is listed at 7 feet wide by 14 feet long with 6-foot walls. It is for residential waste only, and its base rate is not represented as zero."
        primaryAction={{ label: "Review the booking process", href: siteRoutes.book }}
        secondaryAction={{ label: "Compare all dumpsters", href: siteRoutes.dumpsterRental }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <DumpsterCard rate={twentyTwoYardRate} />
            <div className={styles.prose}>
              <h2>Confirmed terms, with one important unknown.</h2>
              <p>
                The rental period is five days and includes up to three tons of
                disposal. Additional weight is
                {" "}{formatCents(dumpsterFees.additionalWeight.amountCents)} per
                ton after three tons.
              </p>
              <p>
                The current base price has not been confirmed. It must remain
                <strong> “Contact for current rate”</strong> until Barnes approves
                a real amount and effective date.
              </p>
              <Callout>
                <h3>Residential waste only</h3>
                <p>
                  Do not load dirt, sod, concrete, gravel, or hazardous
                  materials in the 22-yard container.
                </p>
              </Callout>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Need a confirmed 22-yard rate?"
        text="Use the verified email on the contact page to ask about the current rate. The booking entry page explains the future confirmation process without creating a reservation."
        primary={{ label: "See booking status", href: siteRoutes.book }}
        secondary={{ label: "Review 15-yard pricing", href: siteRoutes.dumpster15 }}
      />
    </>
  );
}
