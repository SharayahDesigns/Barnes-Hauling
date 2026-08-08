import Image from "next/image";
import Link from "next/link";

import {
  CtaBand,
  DumpsterCard,
  FaqList,
  InventoryDumpsterCard,
  PageHero,
  SectionIntro,
  marketingStyles as styles,
} from "@/components/marketing/marketing";
import { ImageStrip } from "@/components/marketing/image-strip";
import { loadHomepageDumpsters } from "@/lib/home/dumpster-inventory";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  HandshakeIcon,
  LeafIcon,
  MapMarkerIcon,
  MapPinIcon,
  MountainIcon,
  RepeatIcon,
  ShieldCheckIcon,
  StarIcon,
  TagIcon,
  ThumbsUpIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
} from "@/components/marketing/icons";
import { dumpsterRates, homepageFaqs } from "@/config/public-content";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Hauling, junk removal, and dumpster rentals",
  "Choose a Barnes hauling or dumpster rental path and review confirmed container rates, included weight, rental terms, and restrictions.",
  siteRoutes.home,
);

// Re-render periodically so newly added/priced dumpsters appear automatically.
export const revalidate = 60;

export default async function Home() {
  const inventoryDumpsters = await loadHomepageDumpsters();

  return (
    <>
      <PageHero
        showBrandLogo
        titleBars
        title="Dumpster Rentals"
        summary="Compare sizes, review confirmed pricing, and choose the container that fits your cleanup, remodel, or jobsite."
        slideInImage={{
          src: "/images/greenDeerDump.webp",
          width: 785,
          height: 539,
        }}
        primaryAction={{
          label: "Compare Dumpster Sizes",
          href: "/#dumpster-info",
        }}
        primaryIcon={<TagIcon />}
        secondaryAction={{ label: "Book a Dumpster", href: siteRoutes.book }}
        secondaryIcon={<CalendarIcon />}
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

      <section className={styles.surfaceSection} id="dumpster-info">
        <div className={styles.sectionInner}>
          <div className={styles.dumpsterIntro}>
            <SectionIntro
              eyebrow="Dumpster rentals made simple"
              title="Pick your size. We deliver. You fill it. We haul it away."
              text="Approved residential pricing starts at 48-hour and 5-day options for the 15-yard container, plus a 5-day 22-yard option. Included weight, allowed materials, and any excess-mile delivery charge are spelled out before you book."
            />
            <div className={styles.dumpsterIntroMedia}>
              <Image
                src="/images/truckanddump.webp"
                alt="Barnes truck delivering a roll-off dumpster"
                fill
                sizes="(max-width: 60rem) 100vw, 32rem"
                className={styles.dumpsterIntroImage}
              />
            </div>
          </div>
          <div className={styles.priceGrid}>
            {inventoryDumpsters.length > 0
              ? inventoryDumpsters.map((dumpster) => (
                  <InventoryDumpsterCard key={dumpster.id} dumpster={dumpster} />
                ))
              : dumpsterRates.map((rate) => (
                  <DumpsterCard key={rate.key} rate={rate} />
                ))}
          </div>
        </div>
      </section>

      <section className={styles.howSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>Simple process</p>
            <h2>How it works</h2>
            <p>
              Renting a dumpster shouldn&apos;t be complicated. We make it easy
              from start to finish.
            </p>
          </div>
          <ol className={styles.howGrid}>
            {[
              {
                icon: <TagIcon />,
                title: "Choose Your Dumpster",
                text: "Compare sizes and pricing to find the right fit for your cleanup or project.",
              },
              {
                icon: <CalendarIcon />,
                title: "Schedule Delivery",
                text: "Pick a convenient date and tell us where you need it placed.",
              },
              {
                icon: <TruckIcon />,
                title: "Fill It Up",
                text: "Load debris at your pace while keeping your job site clean and organized.",
              },
              {
                icon: <RepeatIcon />,
                title: "We Haul It Away",
                text: "When you're ready, we pick it up and dispose of everything responsibly.",
              },
            ].map((step, index) => (
              <li className={styles.howStep} key={step.title}>
                <span className={styles.howStepNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.howStepIcon} aria-hidden="true">
                  {step.icon}
                </span>
                <h3>{step.title}</h3>
                <span className={styles.howStepRule} aria-hidden="true" />
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <p className={styles.howTrust}>
            <span className={styles.howTrustIcon} aria-hidden="true">
              <ShieldCheckIcon />
            </span>
            <span>
              <strong>
                Upfront pricing. On-time service. Local team you can count on.
              </strong>{" "}
              That&apos;s the{" "}
              <strong className={styles.howTrustBrand}>Barnes</strong> difference.
            </span>
          </p>
        </div>
      </section>

      <ImageStrip
        images={[
          { src: "/images/truckLoad.webp", alt: "Barnes crew loading a hauling truck" },
          { src: "/images/truckunload.webp", alt: "Barnes crew unloading a truck at the job site" },
          { src: "/images/truckanddump.webp", alt: "Barnes truck delivering a roll-off dumpster" },
          { src: "/images/greyDumpFullpic.webp", alt: "A Barnes roll-off dumpster on site" },
          { src: "/images/dumptrees.webp", alt: "Roll-off dumpster on a tree-lined property" },
          { src: "/images/dumphousemodel.webp", alt: "Roll-off dumpster placed at a home" },
        ]}
      />

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.haulHeader}>
            <div className={styles.haulIntro}>
              <p className={styles.eyebrow}>What we haul</p>
              <h2>
                Built for the mess{" "}
                <span className={styles.haulAccent}>
                  your project leaves behind.
                </span>
              </h2>
              <span className={styles.haulRule} aria-hidden="true" />
              <p className={styles.haulLede}>
                From weekend cleanouts to major renovation debris, we provide the
                right container and straightforward disposal rules for the job.
              </p>
            </div>
            <ul className={styles.haulPoints}>
              <li className={styles.haulPoint}>
                <span className={styles.haulPointIcon} aria-hidden="true">
                  <ShieldCheckIcon />
                </span>
                <div>
                  <strong>Straightforward rules.</strong>
                  <span>Know what&apos;s allowed before you load.</span>
                </div>
              </li>
              <li className={styles.haulPoint}>
                <span className={styles.haulPointIcon} aria-hidden="true">
                  <ClockIcon />
                </span>
                <div>
                  <strong>On your schedule.</strong>
                  <span>Flexible delivery and pickup.</span>
                </div>
              </li>
              <li className={styles.haulPoint}>
                <span className={styles.haulPointIcon} aria-hidden="true">
                  <LeafIcon />
                </span>
                <div>
                  <strong>Responsible disposal.</strong>
                  <span>We follow local guidelines and do it the right way.</span>
                </div>
              </li>
            </ul>
          </div>

          <div className={styles.haulGrid}>
            <article
              className={`${styles.haulCard} ${styles.haulFeatureCard}`}
              style={{ backgroundImage: "url(/images/Home-cleanout.webp)" }}
            >
              <span className={styles.haulNumber}>01</span>
              <div className={styles.haulCardBody}>
                <h3>Home Cleanouts</h3>
                <p>
                  Garages, basements, attics, storage rooms, and whole-home
                  cleanups.
                </p>
                <Link className={styles.haulLink} href={siteRoutes.faq}>
                  View accepted materials <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
            <div className={styles.haulRight}>
              {[
                {
                  number: "02",
                  title: "Renovation Debris",
                  text: "Drywall, cabinets, flooring, fixtures, tile, lumber, and renovation waste.",
                  image: "/images/reno-debris.webp",
                },
                {
                  number: "03",
                  title: "Construction Waste",
                  text: "Jobsite debris, framing scraps, roofing materials, packaging, and general construction waste.",
                  image: "/images/construction-waste.webp",
                },
                {
                  number: "04",
                  title: "Yard Cleanup",
                  text: "Branches, brush, leaves, fencing, outdoor clutter, and landscaping debris.",
                  image: "/images/yard-cleanup.webp",
                },
                {
                  number: "05",
                  title: "Moving & Downsizing",
                  text: "Old furniture, mattresses, boxes, appliances, and unwanted household items.",
                  image: "/images/moving-downsize.webp",
                },
                {
                  number: "06",
                  title: "Heavy Materials",
                  text: "Concrete, dirt, sod, gravel, brick, and asphalt—using the approved heavy-material container.",
                  image: "/images/heavy-material.webp",
                },
              ].map((category) => (
                <article
                  className={styles.haulCard}
                  key={category.number}
                  style={{ backgroundImage: `url(${category.image})` }}
                >
                  <span className={styles.haulNumber}>{category.number}</span>
                  <div className={styles.haulCardBody}>
                    <h3>{category.title}</h3>
                    <p>{category.text}</p>
                    <Link className={styles.haulLink} href={siteRoutes.faq}>
                      View accepted materials <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.haulNotice}>
            <span className={styles.haulNoticeIcon} aria-hidden="true">
              <AlertTriangleIcon />
            </span>
            <p className={styles.haulNoticeText}>
              <strong>Not sure whether an item is accepted?</strong> Review our
              loading rules or contact us before placing it in the dumpster.
            </p>
            <Link className={styles.haulNoticeLink} href={siteRoutes.faq}>
              Review loading rules <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.svcSection} id="service-area">
        <div className={styles.svcInner}>
          <div className={styles.svcContent}>
            <div className={styles.svcEyebrow}>
              <span className={styles.eyebrow}>Our service area</span>
              <span className={styles.svcEyebrowLine} aria-hidden="true" />
              <span className={styles.svcEyebrowIcon} aria-hidden="true">
                <MountainIcon />
              </span>
            </div>
            <h2 className={styles.svcHeading}>
              <span>Serving</span>
              <span className={styles.svcHeadingAccent}>Salt Lake County</span>
            </h2>
            <span className={styles.svcRule} aria-hidden="true" />
            <p className={styles.svcLede}>
              We deliver dumpsters within a 20-mile radius of Herriman, Utah —
              covering most of Salt Lake County. Need a delivery beyond 20 miles?
              No problem. We go up to 60 miles for an additional $2.00/mile.
            </p>
            <ul className={styles.svcCities}>
              {[
                "Salt Lake City",
                "Holladay",
                "South Jordan",
                "Sandy",
                "West Jordan",
                "Murray",
                "Midvale",
                "Cottonwood Heights",
                "Draper",
                "Riverton",
                "Herriman",
                "Taylorsville",
                "West Valley City",
                "Millcreek",
                "Magna",
                "Kearns",
                "Bountiful",
                "Centerville",
              ].map((city) => (
                <li className={styles.svcCity} key={city}>
                  <MapPinIcon aria-hidden="true" />
                  {city}
                </li>
              ))}
            </ul>
            <div className={styles.svcActions}>
              <Link
                className={styles.svcPrimaryBtn}
                href={siteRoutes.serviceAreas}
              >
                View full service area <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.svcSecondaryBtn} href={siteRoutes.book}>
                Check availability <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className={styles.svcMapCard}>
            <div className={styles.svcMap}>
              <iframe
                className={styles.svcMapFrame}
                src="https://maps.google.com/maps?q=40.5141,-112.0330(Herriman)&ll=40.5141,-112.0330&z=10&output=embed"
                title="Map of the Barnes Hauling and Disposal delivery area around Herriman, Utah"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <span className={styles.svcMapCircle} aria-hidden="true" />
              <span className={styles.svcMapPin} aria-hidden="true">
                <MapMarkerIcon />
              </span>
            </div>
            <div className={styles.svcMapLegend}>
              <span className={styles.svcLegendDot} aria-hidden="true" />
              20-Mile Service Radius
            </div>
          </div>
        </div>
      </section>

      <section className={styles.reviews}>
        <div className={styles.sectionInner}>
          <div className={`${styles.sectionIntro} ${styles.sectionIntroCenter}`}>
            <p className={styles.eyebrow}>Customer reviews</p>
            <h2>See What Our Customers Say</h2>
            <div className={styles.reviewHeadingStars} aria-hidden="true">
              <span className={styles.reviewStarLine} />
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon key={index} />
              ))}
              <span className={styles.reviewStarLine} />
            </div>
            <p>
              We take pride in making the cleanup process easy from start to
              finish. Here&apos;s what customers in Utah have to say about their
              experience.
            </p>
          </div>

          <ul className={styles.reviewGrid}>
            {[
              {
                title: "Fast delivery and great communication.",
                text: "Barnes delivered exactly when they said they would and placed the dumpster perfectly. Pickup was just as easy. Highly recommend!",
                name: "Jason H.",
                location: "Herriman, UT",
              },
              {
                title: "Perfect for our home remodel.",
                text: "We used Barnes for our kitchen remodel and it made cleanup so much easier. Fair pricing and no hidden fees. Will use them again for sure.",
                name: "Michelle T.",
                location: "Riverton, UT",
              },
              {
                title: "Professional and dependable.",
                text: "From the quote to the final pickup, everything was smooth. They're professional, friendly, and clearly take pride in their work.",
                name: "Brandon K.",
                location: "South Jordan, UT",
              },
              {
                title: "Great experience all around!",
                text: "The pricing was upfront, the dumpster was clean, and the service was excellent. It's refreshing to work with a company that does what they say.",
                name: "Stephanie L.",
                location: "Bluffdale, UT",
              },
            ].map((review) => (
              <li className={styles.reviewCard} key={review.name}>
                <span className={styles.reviewQuote} aria-hidden="true">
                  &ldquo;
                </span>
                <div
                  className={styles.reviewStars}
                  role="img"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StarIcon key={index} />
                  ))}
                </div>
                <h3>{review.title}</h3>
                <p>{review.text}</p>
                <div className={styles.reviewFooter}>
                  <div>
                    <p className={styles.reviewName}>{review.name}</p>
                    <p className={styles.reviewLocation}>{review.location}</p>
                  </div>
                  <span className={styles.reviewAvatar} aria-hidden="true">
                    <UserIcon />
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.reviewTrust}>
            {[
              {
                icon: <ShieldCheckIcon />,
                title: "Locally Owned & Operated",
                text: "Proudly serving Utah communities with reliable, honest service.",
              },
              {
                icon: <HandshakeIcon />,
                title: "5-Star Service",
                text: "Trusted by homeowners and contractors across the valley.",
              },
              {
                icon: <CalendarIcon />,
                title: "On Time, Every Time",
                text: "We value your time and stick to our schedule.",
              },
            ].map((item) => (
              <div className={styles.reviewTrustItem} key={item.title}>
                <span className={styles.reviewTrustIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.whyMain}>
          <div className={styles.whyIntro}>
            <div className={styles.whyIntroInner}>
              <div className={styles.whyEyebrow}>
                <span className={styles.eyebrow}>Why Barnes</span>
                <span className={styles.whyEyebrowLine} aria-hidden="true" />
              </div>
              <h2 className={styles.whyHeading}>
                The dependable choice for{" "}
                <span className={styles.whyHeadingAccent}>the dirty work.</span>
              </h2>
              <p className={styles.whyLede}>
                We make dumpster rentals and hauling simple with straightforward
                pricing, reliable service, and clear communication from start to
                finish.
              </p>
              <ul className={styles.whyChecks}>
                {[
                  "Local Utah company you can count on",
                  "On-time delivery and pickup",
                  "Residential, commercial, and construction projects",
                ].map((item) => (
                  <li className={styles.whyCheck} key={item}>
                    <CheckCircleIcon aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link className={styles.svcPrimaryBtn} href={siteRoutes.book}>
                Book a Dumpster <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <ul className={styles.whyFeatures}>
            {[
              {
                icon: <TagIcon />,
                title: "Upfront Pricing",
                text: "Know the rental period, included weight, and important fees before you book.",
              },
              {
                icon: <TruckIcon />,
                title: "Reliable Delivery",
                text: "We arrive when scheduled and place your dumpster carefully where you need it.",
              },
              {
                icon: <MapPinIcon />,
                title: "Locally Owned",
                text: "You work with a local Utah company that understands the area and values its reputation.",
              },
              {
                icon: <RepeatIcon />,
                title: "Flexible Options",
                text: "Choose dumpster rental or full-service hauling based on how much help your project requires.",
              },
              {
                icon: <ClipboardIcon />,
                title: "Straightforward Rules",
                text: "Accepted materials, weight limits, rental terms, and restrictions are clearly explained.",
              },
              {
                icon: <LeafIcon />,
                title: "Responsible Disposal",
                text: "Waste is taken to approved landfills and transfer stations and handled according to local requirements.",
              },
            ].map((feature, index) => (
              <li className={styles.whyFeature} key={feature.title}>
                <span className={styles.whyFeatureIcon} aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>
                  {index + 1}. {feature.title}
                </h3>
                <p>{feature.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.whyStatsWrap}>
          <div className={styles.whyStats}>
            <div className={styles.whyStatsBrand}>
              <span className={styles.whyStatsIcon} aria-hidden="true">
                <ShieldCheckIcon />
              </span>
              <p className={styles.whyStatsTitle}>
                Heavy work.{" "}
                <span className={styles.whyStatsAccent}>Clearly planned.</span>
              </p>
            </div>
            <p className={styles.whyStatsTagline}>
              Clear pricing, dependable scheduling, and local service from
              booking to pickup.
            </p>
            <ul className={styles.whyStatList}>
              {[
                {
                  icon: <UsersIcon />,
                  value: "1,000+",
                  label: "Local Projects Completed",
                },
                {
                  icon: <CalendarIcon />,
                  value: "98%",
                  label: "On-Time Delivery Rate",
                },
                {
                  icon: <ThumbsUpIcon />,
                  value: "5 Star",
                  label: "Customer Rating",
                },
              ].map((stat) => (
                <li className={styles.whyStat} key={stat.label}>
                  <span className={styles.whyStatIcon} aria-hidden="true">
                    {stat.icon}
                  </span>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={`${styles.sectionIntro} ${styles.sectionIntroCenter}`}>
            <p className={styles.eyebrow}>Responsible disposal</p>
            <h2>Landfills &amp; Transfer Stations We Use</h2>
            <p>
              We partner with licensed facilities across Utah to ensure your
              waste is disposed of responsibly and in compliance with local
              regulations.
            </p>
          </div>
          <ul className={styles.facilityGrid}>
            {[
              {
                name: "North Pointe Solid Waste Special Service District",
                address: "2000 W 200 S, Lindon, UT 84042",
              },
              {
                name: "Salt Lake Valley Solid Waste Landfill",
                address: "6030 California Ave, Salt Lake City, UT 84104",
              },
              {
                name: "Construction Waste Management Landfill",
                address: "7213 W California Ave, Salt Lake City, UT 84104",
              },
              {
                name: "Trans-Jordan Landfill",
                address: "10473 S Bacchus Hwy, South Jordan, UT 84009",
              },
              {
                name: "Peck Rock Products & Landfill",
                address: "W Clay Pit Road, Saratoga Springs, UT 84045",
              },
              {
                name: "Intermountain Regional Landfill",
                address: "800 S Allen Ranch Rd, Fairfield, UT 84013",
              },
              {
                name: "South Utah Valley Solid Waste District / Dry Creek Transfer Station",
                address: "518 W 3450 N, Spanish Fork, UT 84660",
                highlight: true,
              },
              {
                name: "Sandy/Midvale Transfer Station",
                address: "8813 S 700 W, Sandy, UT 84070",
              },
            ].map((facility) => (
              <li
                className={`${styles.facilityCard} ${
                  facility.highlight ? styles.facilityCardHighlight : ""
                }`}
                key={facility.name}
              >
                <span className={styles.facilityIcon} aria-hidden="true">
                  <MapPinIcon />
                </span>
                <div>
                  <p className={styles.facilityName}>{facility.name}</p>
                  <p className={styles.facilityAddress}>{facility.address}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.surfaceSection}>
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
        title="Have a project in mind? Reserve your dumpster."
        text="Book online in a few minutes, or call and we'll set it up for you."
      />
    </>
  );
}
