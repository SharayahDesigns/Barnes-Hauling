import Link from "next/link";

import { marketingStyles as styles } from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Privacy copy pending approval",
  "Placeholder route for future approved Barnes privacy information. No privacy policy is published yet.",
  siteRoutes.privacy,
  { noIndex: true },
);

export default function PrivacyPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.legalPlaceholder}>
          <p className={styles.eyebrow}>Legal copy placeholder</p>
          <h1>Privacy information requires approved copy.</h1>
          <p>
            No privacy policy is published on this route. Barnes must approve
            accurate data practices and obtain appropriate legal review before
            production use.
          </p>
          <Link className={styles.textLink} href={siteRoutes.home}>
            Return home <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
