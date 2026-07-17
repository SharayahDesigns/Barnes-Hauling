import Link from "next/link";
import type { ReactNode } from "react";

import type { DumpsterRate, PublicAction } from "@/config/public-content";
import { formatCents } from "@/config/public-content";
import { siteRoutes } from "@/config/site";

import styles from "./marketing.module.scss";

export function PageHero({
  eyebrow,
  title,
  summary,
  primaryAction,
  secondaryAction,
  aside,
}: Readonly<{
  eyebrow: string;
  title: string;
  summary: string;
  primaryAction?: PublicAction;
  secondaryAction?: PublicAction;
  aside?: ReactNode;
}>) {
  return (
    <section className={styles.pageHero} aria-labelledby="page-title">
      <div className={styles.heroGrid}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="page-title">{title}</h1>
          <p className={styles.heroSummary}>{summary}</p>
          {primaryAction || secondaryAction ? (
            <div className={styles.actions}>
              {primaryAction ? (
                <Link className={styles.primaryButton} href={primaryAction.href}>
                  {primaryAction.label}
                </Link>
              ) : null}
              {secondaryAction ? (
                <Link className={styles.secondaryButton} href={secondaryAction.href}>
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
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
  text: string;
  primary?: PublicAction;
  secondary?: PublicAction;
}>) {
  return (
    <section className={styles.ctaBand}>
      <div>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{text}</p>
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
