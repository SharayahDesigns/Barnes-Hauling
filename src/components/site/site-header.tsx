"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { primaryNavigation, siteRoutes } from "@/config/site";

import { Brand } from "./brand";
import styles from "./site-shell.module.scss";

const phone = businessConfig.contact.phone;
const callHref = isConfirmedBusinessFact(phone) ? `tel:${phone.value}` : null;

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    firstLinkRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          <Link href="/#dumpster-info">Services</Link>
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          {callHref ? (
            <a className={styles.quoteAction} href={callHref}>
              Call to Book
            </a>
          ) : null}
          <Link className={styles.bookAction} href={siteRoutes.book}>
            Book a Dumpster
          </Link>
        </div>

        <button
          ref={toggleRef}
          className={styles.menuToggle}
          type="button"
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <nav
        id={menuId}
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        hidden={!isOpen}
      >
        <div className={styles.mobileNavInner}>
          <Link ref={firstLinkRef} href="/#dumpster-info" onClick={closeMenu}>
            Services
          </Link>
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
          <div className={styles.mobileActions}>
            {callHref ? (
              <a href={callHref} onClick={closeMenu}>
                Call to Book
              </a>
            ) : null}
            <Link href={siteRoutes.book} onClick={closeMenu}>
              Book a Dumpster
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
