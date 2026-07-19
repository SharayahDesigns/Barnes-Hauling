import { redirect } from "next/navigation";

import { createPageMetadata } from "@/lib/page-metadata";
import { getStaff } from "@/lib/auth/staff";

import styles from "../admin.module.scss";
import { LoginForm } from "./login-form";

export const metadata = createPageMetadata(
  "Staff sign in",
  "Barnes Hauling and Disposal staff sign in.",
  "/admin/login",
  { noIndex: true },
);

export default async function AdminLoginPage() {
  // Already signed in as staff? Skip the form.
  const staff = await getStaff();
  if (staff) redirect("/admin");

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Barnes staff</h1>
        <p className={styles.loginSub}>Sign in to the operations dashboard.</p>
        <LoginForm />
      </div>
    </div>
  );
}
