import Link from "next/link";

import { createPageMetadata } from "@/lib/page-metadata";
import { createClient } from "@/lib/supabase/server";

import styles from "../admin.module.scss";
import { PasswordUpdateForm } from "../shared/password-update-form";

export const metadata = createPageMetadata(
  "Set staff password",
  "Set or reset a Barnes Hauling and Disposal staff password.",
  "/admin/reset-password",
  { noIndex: true },
);

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const heading =
    params.mode === "invite" ? "Create your password" : "Reset your password";
  const description =
    params.mode === "invite"
      ? "Finish your staff invite by choosing a password."
      : "Choose a new password for your staff account.";

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>{heading}</h1>
        <p className={styles.loginSub}>{description}</p>
        {user ? (
          <PasswordUpdateForm submitLabel="Save password" />
        ) : (
          <>
            <p className={styles.error} role="alert">
              This reset link is missing, expired, or already used.
            </p>
            <p className={styles.supportText}>
              <Link href="/admin/forgot-password" className={styles.textLink}>
                Request a new reset link
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
