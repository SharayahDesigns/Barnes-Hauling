import Link from "next/link";

import {
  Callout,
  CtaBand,
  DumpsterCard,
  FaqList,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import {
  CalendarIcon,
  ClockIcon,
  HandshakeIcon,
  PineIcon,
  ShieldCheckIcon,
  TagIcon,
} from "@/components/marketing/icons";
import { businessConfig } from "@/config/business";
import {
  dumpsterRates,
  homepageFaqs,
  publicProcess,
} from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Hauling, junk removal, and dumpster rentals",
  "Choose a Barnes hauling or dumpster rental path and review confirmed container rates, included weight, rental terms, and restrictions.",
  siteRoutes.home,
);

export default function Home() {
  return (
    <>
      <PageHero
        showBrandLogo
        eyebrow="Hauling & disposal, without the guesswork"
        eyebrowIcon={<PineIcon />}
        title={
          <>
            The heavy work.{" "}
            <span className={styles.titleAccent}>Clearly planned.</span>
          </>
        }
        summary="Reliable hauling and dumpster rentals for projects of any size. On time, upfront pricing, and zero surprises."
        slideInImage={{ src: "/images/dump.webp", width: 1316, height: 545 }}
        primaryAction={{ label: "Book a Dumpster", href: siteRoutes.book }}
        primaryIcon={<CalendarIcon />}
        secondaryAction={{ label: "Get a Quote", href: siteRoutes.quote }}
        secondaryIcon={<TagIcon />}
        highlights={[
          {
            icon: <ShieldCheckIcon />,
            title: "Upfront Pricing",
            text: "No hidden fees",
          },
          {
            icon: <ClockIcon />,
            title: "On-Time Service",
            text: "We show up ready",
          },
          {
            icon: <HandshakeIcon />,
            title: "Local & Trusted",
            text: "Serving our community",
          },
        ]}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Two ways to clear the project"
            title="Pick the service that matches how you want to work."
            text="Hauling estimates account for the project itself. Dumpster rentals start with a defined container, material type, rental period, and included weight."
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

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Confirmed dumpster information"
            title="Start with the material. Then choose the container."
            text="These rates and terms come from the supplied Barnes rate sheet. Service area, delivery, availability, taxes, and unlisted conditional charges still require confirmation."
          />
          <div className={styles.priceGrid}>
            {dumpsterRates.map((rate) => (
              <DumpsterCard key={rate.key} rate={rate} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="How the process works"
            title="The right details come before the commitment."
            text="The public site helps you understand the path now. Record creation, scheduling, agreements, and payment remain intentionally inactive."
          />
          <div className={styles.processGrid}>
            {publicProcess.map((item) => (
              <article className={styles.processCard} key={item.step}>
                <span>{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.splitGrid}>
            <SectionIntro
              eyebrow="Service-area confirmation"
              title="Location comes before a quote or delivery promise."
              text="Barnes has not yet approved a public list of cities, ZIP codes, delivery zones, or travel charges. The site will not guess."
            />
            <Callout>
              <h3>Coverage details are being verified.</h3>
              <p>
                Review what is still pending and what the future address check
                will confirm before quote or booking processing opens.
              </p>
              <Link className={styles.textLink} href={siteRoutes.serviceAreas}>
                Check service-area status <span aria-hidden="true">→</span>
              </Link>
            </Callout>
          </div>
        </div>
      </section>

      <section className={styles.surfaceSection}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Trust through clarity"
            title="Only verified information makes it onto the page."
          />
          <div className={styles.trustGrid}>
            <article className={styles.trustCard}>
              <span aria-hidden="true">1</span>
              <h3>Confirmed rates are labeled</h3>
              <p>
                The 15-yard prices come from the supplied rate sheet. The
                unknown 22-yard rate is never represented as zero.
              </p>
            </article>
            <article className={styles.trustCard}>
              <span aria-hidden="true">2</span>
              <h3>Restrictions stay visible</h3>
              <p>
                Residential waste and heavy materials use different rental
                options, and hazardous materials are prohibited.
              </p>
            </article>
            <article className={styles.trustCard}>
              <span aria-hidden="true">3</span>
              <h3>Unknowns stay honest</h3>
              <p>
                Service areas, availability, taxes, and missing fees remain
                pending instead of becoming marketing claims.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Common questions"
            title="Know the important rental details before the next step."
          />
          <FaqList faqs={homepageFaqs.slice(0, 4)} />
          <Link className={styles.textLink} href={siteRoutes.faq}>
            Read all frequently asked questions <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <CtaBand
        title="Have a project in mind? Start with the right path."
        text="Review what the upcoming quote and booking experiences will ask for, without submitting data or creating a reservation yet."
      />
    </>
  );
}
