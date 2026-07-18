import Image from "next/image";
import Link from "next/link";

import { businessConfig } from "@/config/business";
import { siteRoutes } from "@/config/site";

import styles from "./site-shell.module.scss";

export function Brand() {
  return (
    <Link className={styles.brand} href={siteRoutes.home} aria-label="Barnes Hauling and Disposal home">
      <Image
        className={styles.brandMark}
        src="/images/barnes-brand-mark.png"
        alt=""
        width={800}
        height={497}
        priority
      />
      <span className={styles.brandText}>
        <strong>{businessConfig.identity.shortName.value}</strong>
        <small>Hauling &amp; Disposal</small>
      </span>
    </Link>
  );
}
