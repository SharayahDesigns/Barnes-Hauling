import { signOutStaff } from "@/lib/auth/actions";
import { requireStaff } from "@/lib/auth/staff";

import styles from "../admin.module.scss";
import { AdminNav } from "./admin-nav";

export const runtime = "edge";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          Barnes <span className={styles.brandTag}>Operations</span>
        </span>
        <div className={styles.topbarRight}>
          <span className={styles.roleBadge}>{staff.role.replace(/_/g, " ")}</span>
          {staff.email && <span>{staff.email}</span>}
          <form action={signOutStaff}>
            <button type="submit" className={styles.ghostButton}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className={styles.body}>
        <AdminNav />
        <div className={styles.main}>{children}</div>
      </div>
    </div>
  );
}
