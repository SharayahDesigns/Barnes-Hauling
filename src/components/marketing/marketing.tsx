import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { businessConfig } from "@/config/business";
import type { DumpsterRate, PublicAction } from "@/config/public-content";
import { formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";

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
}: Readonly<{
  eyebrow: string;
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
                src="/images/whiteDeer-Logo.webp"
                alt=""
                width={800}
                height={497}
                priority
              />
              <span className={styles.heroBrandText}>
                <strong>{businessConfig.identity.shortName.value}</strong>
                <small>Hauling &amp; Disposal</small>
              </span>
            </div>
          ) : null}
          <p className={styles.eyebrow}>
            {eyebrowIcon ? (
              <span className={styles.eyebrowIcon} aria-hidden="true">
                {eyebrowIcon}
              </span>
            ) : null}
            {eyebrow}
          </p>
          <h1 id="page-title">{title}</h1>
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
  return (
    <article className={styles.priceCard}>
      <div className={styles.priceCardTop}>
        <p>{rate.use}</p>
        <span>{rate.size}</span>
      </div>
      <h3>
        {rate.price.type === "fixed"
          ? formatCents(rate.price.amountCents)
          : rate.price.label}
      </h3>
      <p className={styles.dimensions}>{rate.dimensions}</p>
      <dl className={styles.rateFacts}>
        <div>
          <dt>Rental</dt>
          <dd>{rate.rentalDays} days</dd>
        </div>
        <div>
          <dt>Included</dt>
          <dd>{rate.includedTons} tons</dd>
        </div>
      </dl>
      <ul className={styles.checkList}>
        {rate.materialRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <Link className={styles.cardLink} href={rate.href}>
        Review this option <span aria-hidden="true">→</span>
      </Link>
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
  primary = { label: "Get a Quote", href: siteRoutes.quote },
  secondary = { label: "Book a Dumpster", href: siteRoutes.book },
}: Readonly<{
  eyebrow?: string;
  title: string;
  text?: string;
  primary?: PublicAction;
  secondary?: PublicAction;
}>) {
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
        <Link className={styles.inverseButton} href={secondary.href}>
          {secondary.label}
        </Link>
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

export { styles as marketingStyles };
