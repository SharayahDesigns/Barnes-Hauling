import Link from "next/link";

import {
  CtaBand,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { businessConfig } from "@/config/business";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Services",
  "Compare Barnes hauling and junk removal with dumpster rental service paths before booking your container.",
  siteRoutes.services,
);

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="One cleanup. Two ways to get it moving."
        summary="Choose full-service hauling when the project needs labor and an estimate, or a dumpster rental when you want a container on site and time to load."
        primaryAction={{ label: "Book a Dumpster", href: siteRoutes.book }}
        secondaryAction={{ label: "Compare Dumpsters", href: siteRoutes.dumpsterRental }}
      />
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Choose your path"
            title="Start with who will load the material."
            text="The choice determines which details matter most and whether the next step is a reviewed estimate or a container rental."
          />
          <div className={styles.serviceGrid}>
            {businessConfig.services.map((service) => (
              <article className={styles.serviceCard} key={service.href}>
                <p className={styles.eyebrow}>{service.eyebrow}</p>
                <h3>{service.name}</h3>
                <p>{service.summary}</p>
                <Link href={service.href}>
                  {service.marketingAction} <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CtaBand
        title="Not sure which path fits?"
        text="Book a dumpster online, or call and we'll help you pick the right container for the job."
      />
    </>
  );
}
