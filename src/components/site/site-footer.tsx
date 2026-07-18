import Link from "next/link";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { footerNavigation, siteRoutes } from "@/config/site";

import { Brand } from "./brand";
import styles from "./site-shell.module.scss";

export function SiteFooter() {
  const phone = businessConfig.contact.phone;
  const email = businessConfig.contact.email;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerLead}>
          <Brand />
          <p>
            Clear paths for hauling estimates and dumpster rental planning,
            with confirmed terms shown before the next step.
          </p>
          <Link className={styles.footerServiceArea} href={siteRoutes.serviceAreas}>
            Check the service-area status <span aria-hidden="true">→</span>
          </Link>
        </div>

        <FooterGroup title="Services" links={footerNavigation.services} />
        <FooterGroup title="Company" links={footerNavigation.company} />

        <div className={styles.footerGroup}>
          <h2>Contact</h2>
          {isConfirmedBusinessFact(phone) ? (
            <a href={`tel:${phone.value}`}>{phone.value}</a>
          ) : null}
          {isConfirmedBusinessFact(email) ? (
            <a href={`mailto:${email.value}`}>{email.value}</a>
          ) : null}
          {!isConfirmedBusinessFact(phone) && !isConfirmedBusinessFact(email) ? (
            <p className={styles.pendingContact}>
              Public phone and email are awaiting business verification.
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} {businessConfig.identity.name.value}</p>
        <nav aria-label="Legal links">
          {footerNavigation.legal.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
}: Readonly<{
  title: string;
  links: readonly { label: string; href: string }[];
}>) {
  return (
    <div className={styles.footerGroup}>
      <h2>{title}</h2>
      {links.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
