"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { primaryNavigation, serviceNavigation, siteRoutes } from "@/config/site";

import { Brand } from "./brand";
import styles from "./site-shell.module.scss";

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
          <details className={styles.servicesMenu}>
            <summary>Services</summary>
            <div className={styles.servicesPanel}>
              {serviceNavigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              ))}
            </div>
          </details>
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link className={styles.quoteAction} href={siteRoutes.quote}>
            Get a Quote
          </Link>
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
          <p>Services</p>
          {serviceNavigation.map((item, index) => (
            <Link
              ref={index === 0 ? firstLinkRef : undefined}
              key={item.href}
              href={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
          <div className={styles.mobileDivider} />
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
          <div className={styles.mobileActions}>
            <Link href={siteRoutes.quote} onClick={closeMenu}>
              Get a Quote
            </Link>
            <Link href={siteRoutes.book} onClick={closeMenu}>
              Book a Dumpster
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
