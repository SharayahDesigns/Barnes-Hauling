import { formatCents } from "@/config/public-content";
import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../admin.module.scss";

export const metadata = createPageMetadata(
  "Operations dashboard",
  "Barnes Hauling and Disposal operations dashboard.",
  "/admin",
  { noIndex: true },
);

type PriceSnapshot = {
  total_cents: number | null;
  revision_number: number;
  finalized_at: string | null;
};

type DashboardBookingRow = {
  booking_number: number;
  status: string;
  scheduled_start_at: string | null;
  customers: {
    first_name: string;
    last_name: string;
  } | null;
  booking_price_snapshots: PriceSnapshot[] | null;
  dumpster_assignments:
    | Array<{
        status: string;
        dumpsters: { asset_number: string } | null;
      }>
    | null;
};

const BOOKED_REVENUE_STATUSES = new Set([
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
]);

const UPCOMING_DROPOFF_STATUSES = new Set([
  "pending_review",
  "pending_payment",
  "confirmed",
  "scheduled",
  "in_progress",
]);

function customerName(
  customer: DashboardBookingRow["customers"],
): string {
  if (!customer) return "—";
  return `${customer.first_name} ${customer.last_name}`.trim() || "—";
}

function latestFinalizedTotalCents(
  snapshots: DashboardBookingRow["booking_price_snapshots"],
): number {
  if (!snapshots || snapshots.length === 0) return 0;

  const latest = [...snapshots]
    .filter((snapshot) => snapshot.finalized_at && snapshot.total_cents != null)
    .sort((a, b) => b.revision_number - a.revision_number)[0];

  return latest?.total_cents ?? 0;
}

function assignedDumpsterLabel(booking: DashboardBookingRow): string {
  const activeAssignment = booking.dumpster_assignments?.find(
    (assignment) => assignment.status === "reserved" || assignment.status === "assigned",
  );
  return activeAssignment?.dumpsters?.asset_number ?? "Unassigned";
}

function formatDropoffDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function monthBounds(now: Date): { start: Date; end: Date } {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

function yearBounds(now: Date): { start: Date; end: Date } {
  const year = now.getUTCFullYear();
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function isWithinRange(value: string | null, start: Date, end: Date): boolean {
  if (!value) return false;
  const instant = new Date(value);
  return instant >= start && instant < end;
}

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();
  const countHead = { count: "exact" as const, head: true };
  const now = new Date();
  const month = monthBounds(now);
  const year = yearBounds(now);

  const [leads, bookings, dumpstersTotal, dumpstersAvailable, bookingsDetail] = await Promise.all([
    supabase.from("quotes").select("*", countHead),
    supabase.from("bookings").select("*", countHead),
    supabase.from("dumpsters").select("*", countHead),
    supabase.from("dumpsters").select("*", countHead).eq("status", "available"),
    supabase
      .from("bookings")
      .select(
        "booking_number, status, scheduled_start_at, customers(first_name, last_name), booking_price_snapshots(total_cents, revision_number, finalized_at), dumpster_assignments(status, dumpsters(asset_number))",
      )
      .not("scheduled_start_at", "is", null)
      .order("scheduled_start_at", { ascending: true })
      .limit(200),
  ]);

  if (bookingsDetail.error) {
    console.error("admin/dashboard: bookings detail query failed", bookingsDetail.error);
  }

  const detailedBookings =
    (bookingsDetail.data as DashboardBookingRow[] | null) ?? [];

  const monthlyRevenue = detailedBookings
    .filter(
      (booking) =>
        BOOKED_REVENUE_STATUSES.has(booking.status) &&
        isWithinRange(booking.scheduled_start_at, month.start, month.end),
    )
    .reduce((sum, booking) => sum + latestFinalizedTotalCents(booking.booking_price_snapshots), 0);

  const annualRevenue = detailedBookings
    .filter(
      (booking) =>
        BOOKED_REVENUE_STATUSES.has(booking.status) &&
        isWithinRange(booking.scheduled_start_at, year.start, year.end),
    )
    .reduce((sum, booking) => sum + latestFinalizedTotalCents(booking.booking_price_snapshots), 0);

  const upcomingDropoffs = detailedBookings
    .filter(
      (booking) =>
        UPCOMING_DROPOFF_STATUSES.has(booking.status) &&
        booking.scheduled_start_at &&
        new Date(booking.scheduled_start_at) >= now,
    )
    .slice(0, 8);

  const stats = [
    { label: "Quote requests / leads", value: leads.count ?? 0 },
    { label: "Bookings", value: bookings.count ?? 0 },
    { label: "Dumpsters (total)", value: dumpstersTotal.count ?? 0 },
    { label: "Dumpsters available", value: dumpstersAvailable.count ?? 0 },
    { label: "Booked revenue this month", value: formatCents(monthlyRevenue) },
    { label: "Booked revenue this year", value: formatCents(annualRevenue) },
  ];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Operations dashboard</h1>
        <p className={styles.pageSub}>
          A quick view of leads, bookings, inventory, and upcoming deliveries.
        </p>
      </div>

      <div className={styles.statGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>{stat.label}</p>
            <p className={styles.statValue}>{stat.value}</p>
          </div>
        ))}
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Upcoming dropoffs</h2>
        <p className={styles.cardSub}>
          Booked revenue uses finalized booking snapshots on active scheduled jobs until
          Stripe payment records are live in Supabase.
        </p>
        <div className={styles.tableWrap}>
          {upcomingDropoffs.length === 0 ? (
            <p className={styles.empty}>No upcoming dropoffs on the schedule.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dropoff</th>
                  <th>Customer</th>
                  <th>Dumpster</th>
                  <th>Status</th>
                  <th>Booked total</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDropoffs.map((booking) => (
                  <tr key={booking.booking_number}>
                    <td data-label="Booking">#{booking.booking_number}</td>
                    <td data-label="Dropoff">{formatDropoffDate(booking.scheduled_start_at as string)}</td>
                    <td data-label="Customer">{customerName(booking.customers)}</td>
                    <td data-label="Dumpster">{assignedDumpsterLabel(booking)}</td>
                    <td data-label="Status">
                      <span className={styles.statusPill}>
                        {booking.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td data-label="Booked total">
                      {formatCents(latestFinalizedTotalCents(booking.booking_price_snapshots))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
