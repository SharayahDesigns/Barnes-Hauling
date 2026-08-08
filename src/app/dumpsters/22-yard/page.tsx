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
  "Review the Barnes 22-yard residential-waste dumpster dimensions, included rental period and tonnage, restrictions, and approved pricing.",
  siteRoutes.dumpster22,
);

export default function TwentyTwoYardPage() {
  return (
    <>
      <PageHero
        eyebrow="22-yard dumpster"
        title="More volume. Approved 5-day pricing."
        summary="The 22-yard container is listed at 7 feet wide by 14 feet long with 6-foot walls. It is for residential waste only and uses the approved July 23, 2026 five-day rate."
        primaryAction={{ label: "Review the booking process", href: siteRoutes.book }}
        secondaryAction={{ label: "Compare all dumpsters", href: siteRoutes.dumpsterRental }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <DumpsterCard rate={twentyTwoYardRate} />
            <div className={styles.prose}>
              <h2>Confirmed terms.</h2>
              <p>
                The rental period is five days and includes 3 tons of disposal.
                Additional weight is {formatCents(dumpsterFees.additionalWeight.amountCents)}
                {" "}per ton after the included 3 tons.
              </p>
              <p>
                The approved residential base price is {formatCents(32500)} for
                the full 5-day rental period, before any excess-mile delivery
                charge, specialty items, taxes, or documented conditional fees.
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
        title="Need the larger residential container?"
        text="Use the booking flow to confirm delivery distance and review the approved 22-yard rental total before payment."
        primary={{ label: "See booking options", href: siteRoutes.book }}
        secondary={{ label: "Review 15-yard pricing", href: siteRoutes.dumpster15 }}
      />
    </>
  );
}
