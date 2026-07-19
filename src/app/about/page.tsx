import Image from "next/image";
import Link from "next/link";

import {
  CtaBand,
  ValueBand,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import {
  ClockIcon,
  LeafIcon,
  ShieldCheckIcon,
  TagIcon,
} from "@/components/marketing/icons";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "About",
  "Barnes Hauling and Disposal keeps hauling and dumpster rentals simple with upfront pricing, dependable service, and responsible disposal.",
  siteRoutes.about,
);

export default function AboutPage() {
  return (
    <>
      <section className={styles.aboutHero}>
        <div className={styles.aboutHeroInner}>
          <div className={styles.aboutHeroContent}>
            <h1>
              About{" "}
              <span className={styles.aboutHeroAccent}>
                Barnes Hauling &amp; Disposal
              </span>
            </h1>
            <span className={styles.aboutHeroRule} aria-hidden="true" />
            <p className={styles.aboutHeroTagline}>
              Local. Reliable. Straightforward.
            </p>
            <p className={styles.aboutHeroText}>
              Barnes Hauling and Disposal was built on the belief that renting a
              dumpster should be simple. We focus on upfront pricing, dependable
              scheduling, and the kind of service we&apos;d expect for our own
              projects.
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

      <ValueBand
        eyebrow="What we stand for"
        items={[
          {
            icon: <ShieldCheckIcon />,
            title: "Reliable Service",
            text: "We show up when we say we will and work to get the job done right.",
          },
          {
            icon: <TagIcon />,
            title: "Upfront Pricing",
            text: "Clear rates with no hidden fees or surprise charges.",
          },
          {
            icon: <ClockIcon />,
            title: "On-Time Delivery",
            text: "Your time matters. We plan deliveries around your schedule.",
          },
          {
            icon: <LeafIcon />,
            title: "Responsible Disposal",
            text: "We follow local guidelines and dispose of waste the right way.",
          },
        ]}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.aboutSplit}>
            <div className={styles.aboutSplitImage}>
              <iframe
                className={styles.aboutMap}
                src="https://www.google.com/maps?q=Herriman,+Utah&output=embed"
                title="Map of Herriman, Utah — part of the Barnes Hauling and Disposal service area"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className={styles.aboutSplitContent}>
              <p className={styles.eyebrow}>Who we are</p>
              <h2>A local company you can count on</h2>
              <p>
                We&apos;re a local hauling and disposal company serving
                homeowners, contractors, and businesses across the communities
                we cover. Whether you&apos;re cleaning out a garage, remodeling
                your home, or managing a job site, we help you get the right
                dumpster and the right team.
              </p>
              <Link className={styles.outlineButton} href={siteRoutes.services}>
                Get to Know Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Ready to get started?"
        title="Book your dumpster today."
      />
    </>
  );
}
