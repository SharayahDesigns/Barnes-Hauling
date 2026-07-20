import Link from "next/link";
import { notFound } from "next/navigation";

import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../../admin.module.scss";
import { PlacementSnapshotMap } from "../placement-snapshot-map";

export const metadata = createPageMetadata(
  "Booking details",
  "Barnes booking details.",
  "/admin/leads",
  { noIndex: true },
);

type BookingDetailPageProps = {
  params: Promise<{ bookingId: string }>;
};

type BookingDetailRow = {
  id: string;
  booking_number: number;
  status: string;
  created_at: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  customer_instructions: string | null;
  agreement_version: string | null;
  agreement_accepted_at: string | null;
  customers: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  customer_addresses: {
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    delivery_distance_miles: number | null;
    delivery_surcharge_cents: number | null;
    region: string;
    postal_code: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  service_items: {
    name: string;
  } | null;
  booking_price_snapshots:
    | Array<{
        total_cents: number | null;
        range_min_cents: number | null;
        range_max_cents: number | null;
        snapshot_type: string;
        revision_number: number;
      }>
    | null;
  dumpster_assignments:
    | Array<{
        status: string;
        starts_at: string;
        ends_at: string;
        dumpsters: {
          asset_number: string;
          dumpster_sizes: { name: string } | null;
        } | null;
      }>
    | null;
  files:
    | Array<{
        id: string;
        bucket_id: string;
        object_path: string;
        original_filename: string;
        created_at: string;
        category: string;
        description: string | null;
      }>
    | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMoney(totalCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(totalCents / 100);
}

function latestPriceLabel(
  snapshots: BookingDetailRow["booking_price_snapshots"],
): string {
  if (!snapshots || snapshots.length === 0) return "—";
  const latest = [...snapshots].sort(
    (a, b) => b.revision_number - a.revision_number,
  )[0];
  if (latest.snapshot_type === "quote_required") return "By quote";
  if (latest.total_cents != null) return formatMoney(latest.total_cents);
  if (latest.range_min_cents != null && latest.range_max_cents != null) {
    return `${formatMoney(latest.range_min_cents)}–${formatMoney(latest.range_max_cents)}`;
  }
  return "—";
}

function addressLabel(address: BookingDetailRow["customer_addresses"]): string {
  if (!address) return "—";
  return [
    address.address_line_1,
    address.address_line_2,
    `${address.city}, ${address.region} ${address.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function BookingDetailPage({
  params,
}: Readonly<BookingDetailPageProps>) {
  const { bookingId } = await params;
  const supabase = createAdminClient();
  const bookingSelect =
    "id, booking_number, status, created_at, scheduled_start_at, scheduled_end_at, customer_instructions, agreement_version, agreement_accepted_at, customers(first_name, last_name, email, phone), customer_addresses!bookings_service_address_id_fkey(address_line_1, address_line_2, city, region, postal_code, latitude, longitude, delivery_distance_miles, delivery_surcharge_cents), service_items(name), booking_price_snapshots(total_cents, range_min_cents, range_max_cents, snapshot_type, revision_number), dumpster_assignments(status, starts_at, ends_at, dumpsters(asset_number, dumpster_sizes(name))), files(id, bucket_id, object_path, original_filename, created_at, category, description)";

  const bookingResult = await supabase
    .from("bookings")
    .select(bookingSelect)
    .eq("id", bookingId)
    .single();

  const booking = bookingResult.data as BookingDetailRow | null;

  if (bookingResult.error || !booking) {
    notFound();
  }

  const currentAssignment =
    booking.dumpster_assignments?.find(
      (assignment) =>
        assignment.status === "reserved" || assignment.status === "assigned",
    ) ?? null;

  return (
    <>
      <div className={styles.pageHeader}>
        <Link href="/admin/leads" className={styles.backLink}>
          Back to leads &amp; bookings
        </Link>
        <h1 className={styles.pageTitle}>Booking #{booking.booking_number}</h1>
        <p className={styles.pageSub}>
          Staff view of the customer record, placement details, and agreement
          acceptance.
        </p>
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Booking summary</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Status</dt>
              <dd>
                <span className={styles.statusPill}>{booking.status}</span>
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Created</dt>
              <dd>{formatDateTime(booking.created_at)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Delivery window</dt>
              <dd>
                {formatDate(booking.scheduled_start_at)} to{" "}
                {formatDate(booking.scheduled_end_at)}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Dumpster requested</dt>
              <dd>{booking.service_items?.name ?? "—"}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Assigned dumpster</dt>
              <dd>
                {currentAssignment?.dumpsters
                  ? `${currentAssignment.dumpsters.asset_number}${
                      currentAssignment.dumpsters.dumpster_sizes?.name
                        ? ` • ${currentAssignment.dumpsters.dumpster_sizes.name}`
                        : ""
                    }`
                  : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Saved price</dt>
              <dd>{latestPriceLabel(booking.booking_price_snapshots)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Customer</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Name</dt>
              <dd>
                {booking.customers
                  ? `${booking.customers.first_name} ${booking.customers.last_name}`.trim()
                  : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Email</dt>
              <dd>{booking.customers?.email ?? "—"}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Phone</dt>
              <dd>{booking.customers?.phone ?? "—"}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Address</dt>
              <dd>{addressLabel(booking.customer_addresses)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Placement pin</dt>
              <dd>
                {booking.customer_addresses?.latitude != null &&
                booking.customer_addresses?.longitude != null
                  ? `${booking.customer_addresses.latitude.toFixed(5)}, ${booking.customer_addresses.longitude.toFixed(5)}`
                  : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Distance from yard</dt>
              <dd>
                {booking.customer_addresses?.delivery_distance_miles != null
                  ? `${booking.customer_addresses.delivery_distance_miles.toFixed(1)} miles`
                  : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Delivery surcharge</dt>
              <dd>
                {booking.customer_addresses?.delivery_surcharge_cents != null
                  ? formatMoney(booking.customer_addresses.delivery_surcharge_cents)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Placement notes</h2>
          <p className={styles.detailText}>
            {booking.customer_instructions?.trim() || "No placement notes provided."}
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Agreement acceptance</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Accepted</dt>
              <dd>{booking.agreement_accepted_at ? "Yes" : "No"}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Accepted at</dt>
              <dd>{formatDateTime(booking.agreement_accepted_at)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Version</dt>
              <dd>{booking.agreement_version ?? "—"}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Placement snapshot</h2>
        {booking.customer_addresses?.latitude != null &&
        booking.customer_addresses?.longitude != null ? (
          <figure className={styles.photoCard}>
            <PlacementSnapshotMap
              latitude={booking.customer_addresses.latitude}
              longitude={booking.customer_addresses.longitude}
              label="Satellite snapshot of the customer-selected dumpster placement pin."
            />
            <figcaption className={styles.photoMeta}>
              <strong>Customer-selected drop location</strong>
              <span>
                {booking.customer_addresses?.latitude?.toFixed(5)},{" "}
                {booking.customer_addresses?.longitude?.toFixed(5)}
              </span>
            </figcaption>
          </figure>
        ) : (
          <p className={styles.empty}>
            No placement pin was saved for this booking, so a satellite snapshot
            is unavailable.
          </p>
        )}
      </section>
    </>
  );
}
