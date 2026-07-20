import Link from "next/link";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { footerNavigation, siteRoutes } from "@/config/site";

import { Brand } from "./brand";
import styles from "./site-shell.module.scss";

export function SiteFooter() {
  const phone = businessConfig.contact.phone;
  const email = businessConfig.contact.email;
  const facebook = businessConfig.contact.facebookUrl;

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
          {isConfirmedBusinessFact(facebook) ? (
            <a
              className={styles.footerSocial}
              href={facebook.value}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Barnes Hauling and Disposal on Facebook"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
              </svg>
            </a>
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
