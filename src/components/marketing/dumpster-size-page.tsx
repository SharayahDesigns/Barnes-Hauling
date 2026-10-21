import { notFound } from "next/navigation";

import { dumpsterFees, formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { loadDumpsterSizePage } from "@/lib/home/dumpster-inventory";

import {
  Callout,
  CtaBand,
  InventoryDumpsterCard,
  PageHero,
  PricingUnavailable,
  SectionIntro,
  marketingStyles as styles,
} from "./marketing";

/**
 * Public page for one dumpster size, built entirely from the live catalog:
 * every active option of that size (price, rental lengths, included weight,
 * materials) is whatever the owner set on the admin Inventory page. Adding a
 * size and an option there gives it a page at /dumpsters/<size> automatically.
 */
export async function DumpsterSizePage({ slug }: Readonly<{ slug: string }>) {
  const data = await loadDumpsterSizePage(slug);
  if (data.status === "not_found") notFound();

  const sizeName = data.status === "ok" ? data.size.name : "Dumpster";
  const dimensions = data.status === "ok" ? data.size.dimensions : "";
  const options = data.status === "ok" ? data.options : [];

  return (
    <>
      <PageHero
        eyebrow={sizeName}
        title={`The ${sizeName.replace(/ Dumpster$/, "").toLowerCase()} dumpster`}
        summary={
          dimensions
            ? `Listed at ${dimensions}. Each option below shows its price, rental length, included weight, and what can go in it.`
            : "Each option below shows its price, rental length, included weight, and what can go in it."
        }
        primaryAction={{ label: "Book this dumpster", href: siteRoutes.book }}
        secondaryAction={{ label: "Compare all dumpsters", href: siteRoutes.dumpsterRental }}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Choose by material"
            title={
              options.length > 1
                ? `${options.length} ways to rent this size.`
                : "Rates for this size."
            }
          />
          {options.length > 0 ? (
            <div className={styles.priceGrid}>
              {options.map((option) => (
                <InventoryDumpsterCard key={option.id} dumpster={option} />
              ))}
            </div>
          ) : (
            <PricingUnavailable />
          )}
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <div className={styles.prose}>
              <h2>Possible extra charges</h2>
              <ul>
                <li>
                  Weight over the included amount:{" "}
                  {formatCents(dumpsterFees.additionalWeight.amountCents)} per ton
                </li>
                <li>
                  Mattresses, box springs, and refrigerators:{" "}
                  {formatCents(dumpsterFees.specialtyItemAmountCents)} each
                </li>
                <li>
                  Delivery past the included distance:{" "}
                  {formatCents(dumpsterFees.excessMileage.amountCents)} per mile
                </li>
              </ul>
            </div>
            <Callout>
              <h3>Load only what your option allows.</h3>
              <p>
                Each option lists what can and can&apos;t go in. Hazardous
                materials are not allowed in any dumpster. Not sure about an
                item? Call before you load it.
              </p>
            </Callout>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to plan the placement and load?"
        text="Pick a date, confirm your delivery address, and see your total before you pay."
      />
    </>
  );
}
