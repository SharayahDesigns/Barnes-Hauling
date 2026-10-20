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

export const metadata = createPageMetadata(
  "Dumpster rentals",
  "Compare confirmed Barnes 15-yard and 22-yard dumpster rental information, material restrictions, included weight, and conditional-fee notices.",
  siteRoutes.dumpsterRental,
);

export default function DumpsterRentalPage() {
  return (
    <>
      <PageHero
        eyebrow="Dumpster rentals"
        title="The container starts with what goes inside."
        summary="Compare confirmed 15-yard and 22-yard options, then match the container to residential waste or heavy material. Loading rules are part of choosing correctly."
        primaryAction={{ label: "Plan a dumpster rental", href: siteRoutes.book }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Rate-sheet options"
            title="Three material-and-size combinations."
            text="Residential rates now reflect the approved July 23, 2026 pricing model. Heavy-material rentals remain staff-approved because included weight and final pricing depend on the approved material."
          />
          <div className={styles.priceGrid}>
            {dumpsterRates.map((rate) => (
              <DumpsterCard key={rate.key} rate={rate} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Known additions"
            title="Weight and specialty-item rates are confirmed."
          />
          <div className={styles.feeGrid}>
            <article className={styles.feeCard}>
              <h3>Additional weight</h3>
              <p>
                {formatCents(dumpsterFees.additionalWeight.amountCents)} per ton
                above the included residential weight allowance.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Specialty items</h3>
              <p>
                Mattresses, box springs, and refrigerators are each
                {" "}{formatCents(dumpsterFees.specialtyItemAmountCents)}.
              </p>
            </article>
            <article className={styles.feeCard}>
              <h3>Duration and mileage</h3>
              <p>
                15-yard residential rentals are {formatCents(25000)} for 48 hours
                or {formatCents(27500)} for 5 days. Delivery includes the first
                20 driving miles, then adds {formatCents(dumpsterFees.excessMileage.amountCents)}
                {" "}per excess mile.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>Important restrictions</h2>
              <p>
                Residential-waste containers must not be loaded with the heavy
                materials named on the rate sheet. The 15-yard heavy-material
                option is limited to dirt, sod, concrete, and gravel and must
                not contain residential household trash.
              </p>
              <p>
                <strong>Hazardous materials are prohibited in all dumpsters.</strong>
                {" "}Customers must load safely and stay within weight limits.
              </p>
            </div>
            <Callout>
              <h3>Some charges still require staff review.</h3>
              <p>
                Prohibited-material charges, relocation pricing, damage or
                cleaning charges, and applicable taxes still depend on the
                documented circumstances of the job.
              </p>
            </Callout>
          </div>
        </div>
      </section>

      <CtaBand
        title="Know the load before choosing the size."
        text="Review the upcoming booking process and the information needed to confirm service area, placement, material type, and final pricing."
        primary={{ label: "Review 15-yard options", href: siteRoutes.dumpster15 }}
        secondary={{ label: "Review 22-yard option", href: siteRoutes.dumpster22 }}
      />
    </>
  );
}
