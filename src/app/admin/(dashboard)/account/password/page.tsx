import { requireStaff } from "@/lib/auth/staff";
import { createPageMetadata } from "@/lib/page-metadata";

import styles from "../../../admin.module.scss";
import { PasswordUpdateForm } from "@/app/admin/shared/password-update-form";

export const metadata = createPageMetadata(
  "Password settings",
  "Manage the Barnes Hauling and Disposal staff password.",
  "/admin/account/password",
  { noIndex: true },
);

type AccountPasswordPageProps = {
  searchParams?: Promise<{
    notice?: string;
  }>;
};

export default async function AccountPasswordPage({
  searchParams,
}: AccountPasswordPageProps) {
  const staff = await requireStaff();
  const params = (await searchParams) ?? {};

  return (
    <>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Password settings</h1>
        <p className={styles.pageSub}>
          Update the password for {staff.email ?? "this staff account"}.
        </p>
      </header>
      <section className={styles.sectionCard}>
        {params.notice && (
          <p className={styles.notice} role="status">
            {params.notice}
          </p>
        )}
        <div className={styles.stack}>
          <p className={styles.supportText}>
            Use at least 8 characters. After saving, your current session stays active.
          </p>
          <PasswordUpdateForm submitLabel="Update password" />
        </div>
      </section>
    </>
  );
}
