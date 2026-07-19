import Image from "next/image";
import Link from "next/link";

import { FaqExplorer } from "@/components/marketing/faq-explorer";
import { DumpsterIcon } from "@/components/marketing/icons";
import { marketingStyles as styles } from "@/components/marketing/marketing";
import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { publicFaqs } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Frequently asked questions",
  "Find quick answers about Barnes dumpster rentals, pricing, accepted items, and policies. Confirmed details only — unverified items stay clearly pending.",
  siteRoutes.faq,
);

export default function FaqPage() {
  const phone = businessConfig.contact.phone;

  return (
    <>
      <section className={styles.aboutHero}>
        <div className={styles.aboutHeroInner}>
          <div className={styles.aboutHeroContent}>
            <h1>FAQ</h1>
            <span className={styles.aboutHeroRule} aria-hidden="true" />
            <p className={styles.faqHeroSubhead}>Answers to common questions.</p>
            <p className={styles.aboutHeroText}>
              Find quick answers about our dumpster rentals, services, and
              policies.
            </p>
          </div>
        </div>
        <div className={styles.aboutHeroImage}>
          <Image
            src="/images/mountainanddump.webp"
            alt="A Barnes dump truck on a mountain road"
            width={1854}
            height={848}
            priority
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <FaqExplorer faqs={publicFaqs} />
        </div>
      </section>

      <section className={styles.faqCta}>
        <div className={styles.faqCtaInner}>
          <span className={styles.faqCtaIcon} aria-hidden="true">
            <DumpsterIcon />
          </span>
          <div className={styles.faqCtaText}>
            <h2>Still have questions?</h2>
            <p>We&apos;re here to help. Book online or give us a call today.</p>
          </div>
          <div className={styles.faqCtaActions}>
            <Link className={styles.inverseButton} href={siteRoutes.book}>
              Book a Dumpster
            </Link>
            {isConfirmedBusinessFact(phone) ? (
              <a className={styles.accentButton} href={`tel:${phone.value}`}>
                Call to Book
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
