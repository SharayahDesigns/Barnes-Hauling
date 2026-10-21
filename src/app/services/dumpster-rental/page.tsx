import {
  Callout,
  CtaBand,
  PageHero,
  PricingUnavailable,
  SectionIntro,
  SizeGroupCard,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { dumpsterFees, formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { groupDumpstersBySize, loadHomepageDumpsters } from "@/lib/home/dumpster-inventory";
import { createPageMetadata } from "@/lib/page-metadata";

// Prices come from the live catalog; refresh at most once a minute.
export const revalidate = 60;

export const metadata = createPageMetadata(
  "Dumpster rentals",
  "Compare Barnes dumpster rental options: current prices, sizes, rental lengths, included weight, and what can go in each.",
  siteRoutes.dumpsterRental,
);

export default async function DumpsterRentalPage() {
  const sizeGroups = groupDumpstersBySize(await loadHomepageDumpsters());

  return (
    <>
      <PageHero
        eyebrow="Dumpster rentals"
        title="The container starts with what goes inside."
        summary="Compare every size and option, then match the dumpster to what you're throwing away. Loading rules are part of choosing correctly."
        primaryAction={{ label: "Plan a dumpster rental", href: siteRoutes.book }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Current options"
            title="Pick the size and the load."
            text="Each size shows its starting price and the price for each kind of load. Open a size for the full list of what can and can't go in it."
          />
          {sizeGroups.length > 0 ? (
            <div className={styles.priceGrid}>
              {sizeGroups.map((group) => (
                <SizeGroupCard key={group.key} group={group} />
              ))}
            </div>
          ) : (
            <PricingUnavailable />
          )}
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Extra charges"
            title="Possible extra charges."
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
              <h3>Delivery distance</h3>
              <p>
                Delivery includes the first 20 driving miles, then adds
                {" "}{formatCents(dumpsterFees.excessMileage.amountCents)} per
                excess mile. Rental lengths and prices are shown on each option
                above.
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
                Each option lists what can and can&apos;t go in it. Load only
                what your option allows, and don&apos;t mix heavy materials like
                dirt or concrete with household trash.
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
        primary={{ label: "Book a Dumpster", href: siteRoutes.book }}
      />
    </>
  );
}
