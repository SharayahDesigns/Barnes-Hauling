import Link from "next/link";

import { marketingStyles as styles } from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Terms copy pending approval",
  "Placeholder route for future approved Barnes service terms. No legal terms are published yet.",
  siteRoutes.terms,
  { noIndex: true },
);

export default function TermsPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.legalPlaceholder}>
          <p className={styles.eyebrow}>Legal copy placeholder</p>
          <h1>Service terms require approved legal copy.</h1>
          <p>
            No rental agreement, waiver, cancellation policy, payment
            authorization, or binding service terms are published on this route.
          </p>
          <Link className={styles.textLink} href={siteRoutes.home}>
            Return home <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
