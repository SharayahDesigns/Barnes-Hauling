import Link from "next/link";

import { createPageMetadata } from "@/lib/page-metadata";

import styles from "../admin.module.scss";
import { ForgotPasswordForm } from "./reset-request-form";

export const metadata = createPageMetadata(
  "Staff password reset",
  "Request a Barnes Hauling and Disposal staff password reset link.",
  "/admin/forgot-password",
  { noIndex: true },
);

export default function ForgotPasswordPage() {
  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Reset your password</h1>
        <p className={styles.loginSub}>
          Enter the staff email address and we&apos;ll send a reset link.
        </p>
        <ForgotPasswordForm />
        <p className={styles.supportText}>
          <Link href="/admin/login" className={styles.textLink}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
