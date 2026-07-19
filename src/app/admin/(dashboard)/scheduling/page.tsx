import { createPageMetadata } from "@/lib/page-metadata";
import { denverDate } from "@/lib/booking/records";
import {
  deleteAvailabilityRule,
  deleteBlackout,
  setAvailabilityRuleActive,
} from "@/lib/admin/scheduling";
import { weekdayLabel } from "@/lib/admin/scheduling-constants";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../admin.module.scss";
import { AddAvailabilityForm, AddBlackoutForm } from "./scheduling-forms";

export const metadata = createPageMetadata(
  "Scheduling",
  "Manage Barnes availability and blackout dates.",
  "/admin/scheduling",
  { noIndex: true },
);

type Blackout = {
  id: string;
  starts_at: string;
  ends_at: string;
  internal_reason: string;
  public_message: string | null;
  is_active: boolean;
};

type AvailabilityRule = {
  id: string;
  day_of_week: number;
  local_start_time: string;
  local_end_time: string;
  capacity: number;
  is_active: boolean;
};

export default async function SchedulingPage() {
  const supabase = createAdminClient();

  const [blackoutResult, rulesResult] = await Promise.all([
    supabase
      .from("blackout_dates")
      .select("id, starts_at, ends_at, internal_reason, public_message, is_active")
      .order("starts_at", { ascending: false }),
    supabase
      .from("availability_rules")
      .select("id, day_of_week, local_start_time, local_end_time, capacity, is_active")
      .order("day_of_week"),
  ]);

  const blackouts = (blackoutResult.data as Blackout[] | null) ?? [];
  const rules = (rulesResult.data as AvailabilityRule[] | null) ?? [];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Scheduling</h1>
        <p className={styles.pageSub}>
          Blackout dates block booking dates immediately. Availability rules set
          daily delivery capacity for upcoming dispatch.
        </p>
      </div>

      <AddBlackoutForm />

      <div className={styles.tableWrap} style={{ marginBottom: "var(--space-6)" }}>
        {blackouts.length === 0 ? (
          <p className={styles.empty}>No blackout dates.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dates</th>
                <th>Reason</th>
                <th>Public message</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {blackouts.map((blackout) => (
                <tr key={blackout.id}>
                  <td>
                    {denverDate(blackout.starts_at)} → {denverDate(blackout.ends_at)}
                  </td>
                  <td>{blackout.internal_reason}</td>
                  <td>{blackout.public_message ?? "—"}</td>
                  <td>
                    <span className={styles.statusPill}>
                      {blackout.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>
                    <form action={deleteBlackout}>
                      <input type="hidden" name="id" value={blackout.id} />
                      <button type="submit" className={styles.smallButton}>
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddAvailabilityForm />

      <div className={styles.tableWrap}>
        {rules.length === 0 ? (
          <p className={styles.empty}>No availability rules yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Day</th>
                <th>Window</th>
                <th>Capacity</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{weekdayLabel(rule.day_of_week)}</td>
                  <td>
                    {rule.local_start_time.slice(0, 5)}–
                    {rule.local_end_time.slice(0, 5)}
                  </td>
                  <td>{rule.capacity}</td>
                  <td>
                    <span className={styles.statusPill}>
                      {rule.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.inlineForm}>
                      <form action={setAvailabilityRuleActive}>
                        <input type="hidden" name="id" value={rule.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={(!rule.is_active).toString()}
                        />
                        <button type="submit" className={styles.smallButton}>
                          {rule.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <form action={deleteAvailabilityRule}>
                        <input type="hidden" name="id" value={rule.id} />
                        <button type="submit" className={styles.smallButton}>
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
