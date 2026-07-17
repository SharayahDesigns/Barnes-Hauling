import {
  CtaBand,
  FaqList,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { publicFaqs } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Frequently asked questions",
  "Get clear answers about Barnes dumpster rental periods, included weight, material restrictions, specialty fees, quote-required pricing, and booking status.",
  siteRoutes.faq,
);

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Frequently asked questions"
        title="The known details, without filling in the blanks."
        summary="Answers are limited to the project requirements and supplied dumpster rate sheet. Unconfirmed policies, coverage, availability, and charges stay clearly pending."
        primaryAction={{ label: "Compare dumpsters", href: siteRoutes.dumpsterRental }}
        secondaryAction={{ label: "Explore services", href: siteRoutes.services }}
      />
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <SectionIntro
            eyebrow="Rental and process answers"
            title="Start with the questions that affect the load and total."
          />
          <FaqList faqs={publicFaqs} />
        </div>
      </section>
      <CtaBand
        title="Still deciding between hauling and a dumpster?"
        text="Compare both service paths before reviewing the quote or booking entry page."
      />
    </>
  );
}
