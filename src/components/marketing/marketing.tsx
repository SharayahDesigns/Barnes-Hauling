import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import type { DumpsterRate, PublicAction } from "@/config/public-content";
import { formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";

import {
  CalendarIcon,
  CheckCircleIcon,
  HouseIcon,
  MoundIcon,
  WeightIcon,
} from "./icons";
import styles from "./marketing.module.scss";

export type HeroHighlight = Readonly<{
  icon: ReactNode;
  title: string;
  text: string;
}>;

export function PageHero({
  eyebrow,
  eyebrowIcon,
  title,
  summary,
  primaryAction,
  primaryIcon,
  secondaryAction,
  secondaryIcon,
  aside,
  highlights,
  slideInImage,
  showBrandLogo = false,
  titleBars = false,
}: Readonly<{
  eyebrow?: string;
  eyebrowIcon?: ReactNode;
  title: ReactNode;
  summary: string;
  primaryAction?: PublicAction;
  primaryIcon?: ReactNode;
  secondaryAction?: PublicAction;
  secondaryIcon?: ReactNode;
  aside?: ReactNode;
  highlights?: readonly HeroHighlight[];
  slideInImage?: Readonly<{
    src: string;
    width: number;
    height: number;
  }>;
  showBrandLogo?: boolean;
  titleBars?: boolean;
}>) {
  return (
    <section className={styles.pageHero} aria-labelledby="page-title">
      {slideInImage ? (
        <div className={styles.heroSlideImage} aria-hidden="true">
          <Image
            src={slideInImage.src}
            alt=""
            width={slideInImage.width}
            height={slideInImage.height}
            priority
          />
        </div>
      ) : null}
      <div className={`${styles.heroGrid} ${aside ? "" : styles.heroGridSingle}`}>
        <div className={styles.heroContent}>
          {showBrandLogo ? (
            <div className={styles.heroBrand}>
              <Image
                className={styles.heroBrandDeer}
                src="/images/greenDeer.webp"
                alt={`${businessConfig.identity.name.value} logo`}
                width={1227}
                height={838}
                priority
              />
            </div>
          ) : null}
          {eyebrow ? (
            <p className={styles.eyebrow}>
              {eyebrowIcon ? (
                <span className={styles.eyebrowIcon} aria-hidden="true">
                  {eyebrowIcon}
                </span>
              ) : null}
              {eyebrow}
            </p>
          ) : null}
          <h1
            id="page-title"
            className={titleBars ? styles.heroTitleBars : undefined}
          >
            {titleBars ? (
              <span className={styles.heroTitleBarsText}>{title}</span>
            ) : (
              title
            )}
          </h1>
          <p className={styles.heroSummary}>{summary}</p>
          {primaryAction || secondaryAction ? (
            <div className={styles.actions}>
              {primaryAction ? (
                <Link className={styles.primaryButton} href={primaryAction.href}>
                  {primaryIcon ? (
                    <span className={styles.buttonIcon} aria-hidden="true">
                      {primaryIcon}
                    </span>
                  ) : null}
                  {primaryAction.label}
                </Link>
              ) : null}
              {secondaryAction ? (
                <Link className={styles.secondaryButton} href={secondaryAction.href}>
                  {secondaryIcon ? (
                    <span className={styles.buttonIcon} aria-hidden="true">
                      {secondaryIcon}
                    </span>
                  ) : null}
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          ) : null}
          {highlights && highlights.length > 0 ? (
            <ul className={styles.heroHighlights}>
              {highlights.map((item) => (
                <li className={styles.heroHighlight} key={item.title}>
                  <span className={styles.heroHighlightIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className={styles.heroHighlightText}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {aside ? <div className={styles.heroAside}>{aside}</div> : null}
      </div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  text,
}: Readonly<{ eyebrow: string; title: string; text?: string }>) {
  return (
    <div className={styles.sectionIntro}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

export function DumpsterCard({ rate }: Readonly<{ rate: DumpsterRate }>) {
  const isHeavy = rate.use.toLowerCase().includes("heavy");
  const phone = businessConfig.contact.phone;

  return (
    <article className={styles.priceCard}>
      <div className={styles.priceCardTop}>
        <span className={styles.priceCardIcon} aria-hidden="true">
          {isHeavy ? <MoundIcon /> : <HouseIcon />}
        </span>
        <span className={styles.priceCardSize}>{rate.size}</span>
      </div>
      <p className={styles.priceCardUse}>{rate.use}</p>
      <div className={styles.priceCardHead}>
        <h3>
          {rate.price.type === "fixed"
            ? formatCents(rate.price.amountCents)
            : rate.price.label}
        </h3>
        <div className={styles.priceCardThumb}>
          <Image
            src={rate.image}
            alt=""
            fill
            sizes="140px"
            className={styles.priceCardThumbImg}
          />
        </div>
      </div>
      <p className={styles.dimensions}>{rate.dimensions}</p>
      <dl className={styles.rateFacts}>
        <div>
          <span className={styles.rateFactIcon} aria-hidden="true">
            <CalendarIcon />
          </span>
          <dt>Rental</dt>
          <dd>{rate.rentalDays} days</dd>
        </div>
        <div>
          <span className={styles.rateFactIcon} aria-hidden="true">
            <WeightIcon />
          </span>
          <dt>Included</dt>
          <dd>{rate.includedWeightLabel}</dd>
        </div>
      </dl>
      <ul className={`${styles.checkList} ${styles.priceChecks}`}>
        {rate.materialRules.map((rule) => (
          <li key={rule}>
            <span className={styles.checkIcon} aria-hidden="true">
              <CheckCircleIcon />
            </span>
            {rule}
          </li>
        ))}
      </ul>
      <div className={styles.priceCardActions}>
        <Link className={styles.priceCardButton} href={siteRoutes.book}>
          Book Online
        </Link>
        {isConfirmedBusinessFact(phone) ? (
          <a
            className={`${styles.priceCardButton} ${styles.priceCardButtonDark}`}
            href={`tel:${phone.value}`}
          >
            Call To Book
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function Callout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={styles.callout}>{children}</div>;
}

export function CtaBand({
  eyebrow = "Plan the next step",
  title,
  text,
  primary = { label: "Book a Dumpster", href: siteRoutes.book },
  secondary,
}: Readonly<{
  eyebrow?: string;
  title: string;
  text?: string;
  primary?: PublicAction;
  secondary?: PublicAction;
}>) {
  const phone = businessConfig.contact.phone;
  const callHref = isConfirmedBusinessFact(phone) ? `tel:${phone.value}` : null;

  return (
    <section className={styles.ctaBand}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      <div className={styles.actions}>
        <Link className={styles.accentButton} href={primary.href}>
          {primary.label}
        </Link>
        {secondary ? (
          <Link className={styles.inverseButton} href={secondary.href}>
            {secondary.label}
          </Link>
        ) : callHref ? (
          <a className={styles.inverseButton} href={callHref}>
            Call to Book
          </a>
        ) : null}
      </div>
    </section>
  );
}

export type ValueItem = Readonly<{
  icon: ReactNode;
  title: string;
  text: string;
}>;

export function ValueBand({
  eyebrow,
  items,
}: Readonly<{ eyebrow: string; items: readonly ValueItem[] }>) {
  return (
    <section className={styles.valueBand}>
      <div className={styles.sectionInner}>
        <p className={`${styles.eyebrow} ${styles.valueBandEyebrow}`}>{eyebrow}</p>
        <ul className={styles.valueGrid}>
          {items.map((item) => (
            <li className={styles.valueItem} key={item.title}>
              <span className={styles.valueIcon} aria-hidden="true">
                {item.icon}
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function FaqList({
  faqs,
}: Readonly<{ faqs: readonly { question: string; answer: string }[] }>) {
  return (
    <div className={styles.faqList}>
      {faqs.map((faq) => (
        <details key={faq.question}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

type InventoryDumpster = {
  id: string;
  code?: string;
  sizeSlug?: string | null;
  sizeName: string;
  packageLabel?: string | null;
  description?: string | null;
  dimensions: string;
  priceCents: number | null;
  maxWeightTons: number | null;
  rentalDays: readonly number[];
  materialsAllowed: readonly string[];
  materialsNotAllowed: readonly string[];
  imageUrl: string | null;
};

function NoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8l8 8" />
    </svg>
  );
}

export function InventoryDumpsterCard({
  dumpster,
}: Readonly<{ dumpster: InventoryDumpster }>) {
  const phone = businessConfig.contact.phone;

  return (
    <article className={styles.priceCard}>
      <div className={styles.priceCardTop}>
        <span className={styles.priceCardIdentity}>
          <span className={styles.priceCardIcon} aria-hidden="true">
            <HouseIcon />
          </span>
          {dumpster.packageLabel ? (
            <span className={styles.priceCardPackage}>
              {dumpster.packageLabel}
            </span>
          ) : null}
        </span>
        <span className={styles.priceCardSize}>{dumpster.sizeName}</span>
      </div>
      {dumpster.description ? (
        <p className={styles.priceCardUse}>{dumpster.description}</p>
      ) : null}
      <div className={styles.priceCardHead}>
        <h3>
          {dumpster.priceCents != null
            ? formatCents(dumpster.priceCents)
            : "Contact for rate"}
        </h3>
        {dumpster.imageUrl ? (
          <div className={styles.priceCardThumb}>
            {/* Supabase Storage public URL — plain img avoids remote-loader config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dumpster.imageUrl}
              alt=""
              className={styles.priceCardThumbImg}
            />
          </div>
        ) : null}
      </div>
      {dumpster.dimensions ? (
        <p className={styles.dimensions}>{dumpster.dimensions}</p>
      ) : null}
      {dumpster.rentalDays.length > 0 || dumpster.maxWeightTons != null ? (
        <dl className={styles.rateFacts}>
          {dumpster.rentalDays.length > 0 ? (
            <div>
              <span className={styles.rateFactIcon} aria-hidden="true">
                <CalendarIcon />
              </span>
              <dt>Rental</dt>
              <dd>{dumpster.rentalDays.join(" or ")} days</dd>
            </div>
          ) : null}
          {dumpster.maxWeightTons != null ? (
            <div>
              <span className={styles.rateFactIcon} aria-hidden="true">
                <WeightIcon />
              </span>
              <dt>Included</dt>
              <dd>{dumpster.maxWeightTons} tons</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {dumpster.materialsAllowed.length > 0 ||
      dumpster.materialsNotAllowed.length > 0 ? (
        <div className={styles.materialsRow}>
          {dumpster.materialsAllowed.length > 0 ? (
            <ul className={`${styles.checkList} ${styles.priceChecks}`}>
              {dumpster.materialsAllowed.map((item) => (
                <li key={item}>
                  <span className={styles.checkIcon} aria-hidden="true">
                    <CheckCircleIcon />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {dumpster.materialsNotAllowed.length > 0 ? (
            <ul className={`${styles.checkList} ${styles.priceChecks} ${styles.priceChecksNo}`}>
              {dumpster.materialsNotAllowed.map((item) => (
                <li key={item}>
                  <span className={styles.checkIconNo} aria-hidden="true">
                    <NoIcon />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className={styles.priceCardActions}>
        <Link
          className={styles.priceCardButton}
          href={
            dumpster.code
              ? `${siteRoutes.book}?${new URLSearchParams({
                  ...(dumpster.sizeSlug ? { size: dumpster.sizeSlug } : {}),
                  load: dumpster.code,
                }).toString()}`
              : siteRoutes.book
          }
        >
          Book Online
        </Link>
        {isConfirmedBusinessFact(phone) ? (
          <a
            className={`${styles.priceCardButton} ${styles.priceCardButtonDark}`}
            href={`tel:${phone.value}`}
          >
            Call To Book
          </a>
        ) : null}
      </div>
    </article>
  );
}

type SizeGroupCardData = {
  sizeName: string;
  sizeSlug: string | null;
  dimensions: string;
  imageUrl: string | null;
  fromPriceCents: number | null;
  rentalDays: readonly number[];
  options: ReadonlyArray<{
    id: string;
    packageLabel?: string | null;
    priceCents: number | null;
    maxWeightTons: number | null;
  }>;
};

/**
 * One card per dumpster size, priced "from" its cheapest option, with each
 * option's price listed so the starting price is never mistaken for the
 * price of every load. Customers pick the option ("what's going in it?")
 * during booking.
 */
export function SizeGroupCard({ group }: Readonly<{ group: SizeGroupCardData }>) {
  const phone = businessConfig.contact.phone;
  const multiple = group.options.length > 1;

  return (
    <article className={styles.priceCard}>
      <div className={styles.priceCardTop}>
        <span className={styles.priceCardIdentity}>
          <span className={styles.priceCardIcon} aria-hidden="true">
            <HouseIcon />
          </span>
          <span className={styles.priceCardPackage}>{group.sizeName}</span>
        </span>
      </div>
      <div className={styles.priceCardHead}>
        <h3>
          {group.fromPriceCents != null ? (
            <>
              {multiple ? <span className={styles.priceFrom}>From </span> : null}
              {formatCents(group.fromPriceCents)}
            </>
          ) : (
            "Contact for rate"
          )}
        </h3>
        {group.imageUrl ? (
          <div className={styles.priceCardThumb}>
            {/* Supabase Storage public URL — plain img avoids remote-loader config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={group.imageUrl} alt="" className={styles.priceCardThumbImg} />
          </div>
        ) : null}
      </div>
      {group.dimensions ? <p className={styles.dimensions}>{group.dimensions}</p> : null}
      {group.rentalDays.length > 0 ? (
        <dl className={styles.rateFacts}>
          <div>
            <span className={styles.rateFactIcon} aria-hidden="true">
              <CalendarIcon />
            </span>
            <dt>Rental</dt>
            <dd>{group.rentalDays.join(" or ")} days</dd>
          </div>
        </dl>
      ) : null}
      <div className={styles.sizeOptionList}>
        <p className={styles.sizeOptionListTitle}>
          {multiple ? "Price depends on what's going in it" : "What's included"}
        </p>
        <ul>
          {group.options.map((option) => (
            <li key={option.id}>
              <span className={styles.sizeOptionName}>
                {option.packageLabel ?? group.sizeName}
                {option.maxWeightTons != null ? (
                  <span className={styles.sizeOptionMeta}>
                    {" "}
                    · {option.maxWeightTons} tons included
                  </span>
                ) : null}
              </span>
              <span className={styles.sizeOptionPrice}>
                {option.priceCents != null ? formatCents(option.priceCents) : "Quote"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.priceCardActions}>
        <Link
          className={styles.priceCardButton}
          href={
            group.sizeSlug
              ? `${siteRoutes.book}?size=${encodeURIComponent(group.sizeSlug)}`
              : siteRoutes.book
          }
          aria-label={`Book a ${group.sizeName} online`}
        >
          Book Online
        </Link>
        {group.sizeSlug ? (
          <Link
            className={`${styles.priceCardButton} ${styles.priceCardButtonDark}`}
            href={`/dumpsters/${group.sizeSlug}`}
            aria-label={`${group.sizeName} details and what can go in it`}
          >
            Details &amp; materials
          </Link>
        ) : isConfirmedBusinessFact(phone) ? (
          <a
            className={`${styles.priceCardButton} ${styles.priceCardButtonDark}`}
            href={`tel:${phone.value}`}
          >
            Call To Book
          </a>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Shown wherever live prices would appear but none could be loaded (database
 * unreachable, or nothing bookable yet). Never falls back to typed-in prices,
 * which can drift from what the owner set in the admin.
 */
export function PricingUnavailable({
  title = "Call for current pricing",
  text = "Our live rates aren't loading right now. Call and we'll quote your rental, or check back in a few minutes.",
}: Readonly<{ title?: string; text?: string }>) {
  const phone = businessConfig.contact.phone;
  return (
    <div className={styles.callout} role="status">
      <h3>{title}</h3>
      <p>{text}</p>
      <div className={styles.priceCardActions}>
        {isConfirmedBusinessFact(phone) ? (
          <a
            className={`${styles.priceCardButton} ${styles.priceCardButtonDark}`}
            href={`tel:${phone.value}`}
          >
            Call {phone.value}
          </a>
        ) : null}
        <Link className={styles.priceCardButton} href={siteRoutes.book}>
          Book Online
        </Link>
      </div>
    </div>
  );
}

export { styles as marketingStyles };
