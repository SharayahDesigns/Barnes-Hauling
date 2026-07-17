import Image from "next/image";

import styles from "./page.module.scss";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <section className={styles.panel} aria-labelledby="page-title">
        <div className={styles.brand}>
          <Image
            className={styles.brandMark}
            src="/images/barnes-brand-mark.png"
            alt=""
            width={800}
            height={497}
            priority
          />
          <div className={styles.brandName}>
            <span>Barnes</span>
            <small>Hauling &amp; Disposal</small>
          </div>
        </div>

        <div className={styles.content}>
          <p className={styles.eyebrow}>New website in development</p>
          <h1 id="page-title">A cleaner way to schedule the heavy work.</h1>
          <p className={styles.summary}>
            Online quotes, service scheduling, dumpster rentals, and customer
            tools are being built here.
          </p>
        </div>

        <div className={styles.status} role="status">
          <span aria-hidden="true" />
          Project foundation is ready
        </div>
      </section>
    </main>
  );
}
