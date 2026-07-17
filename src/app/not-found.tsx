import Link from "next/link";

import { marketingStyles as styles } from "@/components/marketing/marketing";
import { siteRoutes } from "@/config/site";

export default function NotFound() {
  return (
    <section className={styles.notFound}>
      <span>404</span>
      <h1>This route came up empty.</h1>
      <p>
        The page may have moved. Head home or compare the current Barnes
        service paths.
      </p>
      <Link className={styles.primaryButton} href={siteRoutes.home}>
        Return home
      </Link>
    </section>
  );
}
