"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "../admin.module.scss";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads & bookings" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/scheduling", label: "Scheduling" },
  { href: "/admin/service-area", label: "Service area" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
