import { formatCents } from "@/config/public-content";
import { createPageMetadata } from "@/lib/page-metadata";
import { denverDate, todayInDenver } from "@/lib/booking/records";
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

// A dropoff is on the schedule only once it's paid for: the booking is
// confirmed or scheduled (not yet delivered) AND has a successful payment.
// Pending-payment checkouts, unpaid requests, and refunds never show.
const UPCOMING_DROPOFF_STATUSES = ["confirmed", "scheduled"] as const;
const PAID_PAYMENT_STATUSES = ["succeeded", "partially_refunded"] as const;

type UpcomingDropoffRow = {
  id: string;
  booking_number: number;
  status: string;
  scheduled_start_at: string;
  scheduled_end_at: string | null;
  customers: { first_name: string; last_name: string; phone: string | null } | null;
  customer_addresses: { address_line_1: string; city: string } | null;
  service_items: { name: string } | null;
  dumpster_assignments: Array<{
    status: string;
    dumpsters: { asset_number: string } | null;
  }> | null;
  payments: Array<{
    status: string;
    amount_cents: number;
    is_test_mode: boolean;
  }>;
};

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

function assignedDumpsterLabel(
  booking: Pick<DashboardBookingRow, "dumpster_assignments">,
): string {
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

  // Look back a day, then keep anything delivering today (Denver) or later, so
  // a 9am dropoff stays on today's list after 9am.
  const today = todayInDenver();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [leads, bookings, dumpstersTotal, dumpstersAvailable, bookingsDetail, upcomingResult] = await Promise.all([
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
    supabase
      .from("bookings")
      .select(
        "id, booking_number, status, scheduled_start_at, scheduled_end_at, customers(first_name, last_name, phone), customer_addresses!bookings_service_address_id_fkey(address_line_1, city), service_items(name), dumpster_assignments(status, dumpsters(asset_number)), payments!inner(status, amount_cents, is_test_mode)",
      )
      .in("status", [...UPCOMING_DROPOFF_STATUSES])
      .in("payments.status", [...PAID_PAYMENT_STATUSES])
      .gte("scheduled_start_at", since)
      .order("scheduled_start_at", { ascending: true })
      .limit(25),
  ]);

  if (upcomingResult.error) {
    console.error("admin/dashboard: upcoming dropoffs query failed", upcomingResult.error);
  }

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

  const upcomingDropoffs = (
    (upcomingResult.data as unknown as UpcomingDropoffRow[] | null) ?? []
  )
    .filter((booking) => denverDate(booking.scheduled_start_at) >= today)
    .slice(0, 10);

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
          Paid bookings only: confirmed or scheduled, with a successful payment.
          Unpaid checkouts and requests stay in Leads &amp; bookings.
        </p>
        <div className={styles.tableWrap}>
          {upcomingResult.error ? (
            <p className={styles.error} role="alert">
              Upcoming dropoffs couldn&apos;t load. Refresh to try again.
            </p>
          ) : upcomingDropoffs.length === 0 ? (
            <p className={styles.empty}>No paid dropoffs coming up.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dropoff</th>
                  <th>Pickup</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Dumpster</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDropoffs.map((booking) => {
                  const paidCents = booking.payments
                    .filter((payment) =>
                      (PAID_PAYMENT_STATUSES as readonly string[]).includes(payment.status),
                    )
                    .reduce((sum, payment) => sum + payment.amount_cents, 0);
                  const testMode = booking.payments.some((payment) => payment.is_test_mode);
                  const isToday = denverDate(booking.scheduled_start_at) === today;
                  return (
                    <tr key={booking.id}>
                      <td data-label="Booking">#{booking.booking_number}</td>
                      <td data-label="Dropoff">
                        {isToday ? <strong>Today · </strong> : null}
                        {formatDropoffDate(booking.scheduled_start_at)}
                      </td>
                      <td data-label="Pickup">
                        {booking.scheduled_end_at ? formatDropoffDate(booking.scheduled_end_at) : "—"}
                      </td>
                      <td data-label="Customer">
                        {customerName(booking.customers)}
                        {booking.customers?.phone ? (
                          <div className={styles.cellMeta}>
                            <a href={`tel:${booking.customers.phone}`}>{booking.customers.phone}</a>
                          </div>
                        ) : null}
                      </td>
                      <td data-label="Address">
                        {booking.customer_addresses
                          ? `${booking.customer_addresses.address_line_1}, ${booking.customer_addresses.city}`
                          : "—"}
                      </td>
                      <td data-label="Dumpster">
                        {booking.service_items?.name ?? "—"}
                        <div className={styles.cellMeta}>{assignedDumpsterLabel(booking)}</div>
                      </td>
                      <td data-label="Paid">
                        <span className={`${styles.statusPill} ${styles.statusPillAvailable}`}>
                          Paid {formatCents(paidCents)}
                        </span>
                        {testMode ? <div className={styles.cellMeta}>Stripe test mode</div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
