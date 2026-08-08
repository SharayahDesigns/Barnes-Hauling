import Link from "next/link";

import { formatCents } from "@/config/public-content";
import { createPageMetadata } from "@/lib/page-metadata";
import { BOOKING_STATUSES } from "@/lib/admin/booking-status";
import { humanizeStatus } from "@/lib/admin/dumpster-status";
import {
  assignBookingDumpster,
  deleteBooking,
  deleteQuote,
  refundBookingPayment,
  updateBookingStatus,
  updateQuoteStatus,
} from "@/lib/admin/leads";
import { QUOTE_STATUSES } from "@/lib/admin/quote-status";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../admin.module.scss";
import { AutoSubmitSelect, PendingSubmitButton } from "./auto-submit-select";
import { AddBookingForm } from "./add-booking-form";
import { BookingCalendar } from "./booking-calendar";
import { denverDayKey, type CalendarBooking } from "./calendar-utils";
import { PlacementMapsLink } from "./placement-maps-link";
import { PlacementSnapshotMap } from "./placement-snapshot-map";

export const metadata = createPageMetadata(
  "Leads & bookings",
  "Barnes leads and bookings.",
  "/admin/leads",
  { noIndex: true },
);

type LeadsPageSearchParams = {
  error?: string;
  notice?: string;
};

type Customer = { first_name: string; last_name: string; email: string | null; phone: string | null } | null;

type QuoteRow = {
  id: string;
  quote_number: number;
  status: string;
  created_at: string;
  request_details: {
    size_key?: string;
    rental_days?: number;
    needed_date?: string;
    service_area_check?: string;
  } | null;
  customers: Customer;
  service_items: { name: string } | null;
};

type PriceSnapshot = {
  total_cents: number | null;
  range_min_cents: number | null;
  range_max_cents: number | null;
  snapshot_type: string;
  revision_number: number;
  finalized_at: string | null;
};

type BookingRow = {
  id: string;
  booking_number: number;
  status: string;
  service_item_id: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  created_at: string;
  customers: Customer;
  service_items:
    | {
        dumpster_size_id: string | null;
        dumpster_sizes: { name: string } | null;
      }
    | null;
  customer_addresses:
    | {
        latitude: number | null;
        longitude: number | null;
      }
    | null;
  booking_price_snapshots: PriceSnapshot[] | null;
  payments: PaymentRow[] | null;
  dumpster_assignments:
    | Array<{
        id: string;
        status: string;
        dumpsters: { id: string; asset_number: string } | null;
      }>
    | null;
};

type PaymentRow = {
  status: string;
  amount_cents: number;
  card_on_file: boolean;
  succeeded_at: string | null;
  metadata: Record<string, unknown> | null;
};

type DumpsterOption = {
  id: string;
  asset_number: string;
  status: string;
  dumpster_size_id: string;
  dumpster_sizes: { name: string } | null;
};

type ActiveAssignment = {
  id: string;
  booking_id: string;
  dumpster_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function customerName(customer: Customer): string {
  if (!customer) return "—";
  return `${customer.first_name} ${customer.last_name}`.trim() || "—";
}

function assignedDumpsterLabel(booking: BookingRow): string | null {
  const activeAssignment = booking.dumpster_assignments?.find(
    (assignment) => assignment.status === "reserved" || assignment.status === "assigned",
  );
  return activeAssignment?.dumpsters?.asset_number ?? null;
}

function activeDumpsterId(booking: BookingRow): string | null {
  const activeAssignment = booking.dumpster_assignments?.find(
    (assignment) => assignment.status === "reserved" || assignment.status === "assigned",
  );
  return activeAssignment?.dumpsters?.id ?? null;
}

/**
 * MM/DD/YYYY. Reformats the ISO date parts directly rather than going through
 * a Date object, which would shift a timestamp near midnight into the previous
 * or next day depending on the viewer's timezone. Accepts a full timestamp or a
 * bare YYYY-MM-DD.
 */
function dateOnly(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function priceLabel(snapshots: PriceSnapshot[] | null): string {
  if (!snapshots || snapshots.length === 0) return "—";
  const latest = [...snapshots].sort(
    (a, b) => b.revision_number - a.revision_number,
  )[0];
  if (latest.snapshot_type === "quote_required") return "By quote";
  if (latest.total_cents != null) return formatCents(latest.total_cents);
  if (latest.range_min_cents != null && latest.range_max_cents != null) {
    return `${formatCents(latest.range_min_cents)}–${formatCents(latest.range_max_cents)}`;
  }
  return "—";
}

// Settled payments show exact cents; formatCents rounds to whole dollars.
const EXACT_USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function latestPayment(payments: PaymentRow[] | null): PaymentRow | null {
  if (!payments || payments.length === 0) return null;
  // Prefer a settled payment over an abandoned checkout attempt.
  return (
    payments.find((payment) => payment.status === "succeeded") ?? payments[0]
  );
}

function paidLabel(payment: PaymentRow | null): string {
  if (!payment) return "—";
  if (payment.status !== "succeeded") return payment.status.replace(/_/g, " ");
  return EXACT_USD.format(payment.amount_cents / 100);
}

function refundableCents(payment: PaymentRow | null): number {
  if (!payment || payment.status !== "succeeded") return 0;
  const refunded =
    typeof payment.metadata?.refunded_amount_cents === "number"
      ? payment.metadata.refunded_amount_cents
      : 0;
  return Math.max(0, payment.amount_cents - refunded);
}

function refundStateLabel(payment: PaymentRow | null): string | null {
  if (!payment) return null;
  if (payment.status === "refunded") return "Refunded";
  if (payment.status === "partially_refunded") {
    const refunded =
      typeof payment.metadata?.refunded_amount_cents === "number"
        ? payment.metadata.refunded_amount_cents
        : 0;
    return `${EXACT_USD.format(refunded / 100)} refunded`;
  }
  // Requested but the charge.refunded webhook has not landed yet.
  const requested = payment.metadata?.refund_requested_cents;
  if (typeof requested === "number") {
    return `${EXACT_USD.format(requested / 100)} refund pending`;
  }
  return null;
}

function paymentMethodLabel(payment: PaymentRow | null): string {
  if (!payment) return "—";
  const brand = payment.metadata?.card_brand;
  const last4 = payment.metadata?.card_last4;
  if (typeof brand === "string" && typeof last4 === "string") {
    return `${brand.charAt(0).toUpperCase()}${brand.slice(1)} ····${last4}`;
  }
  return payment.card_on_file ? "Card on file" : "—";
}

/**
 * Why this booking cannot be deleted, or null when it can be.
 *
 * Mirrors the guards enforced by deleteBooking on the server. Checking payments
 * here too means a paid booking shows a lock with the reason, instead of a
 * trash button that fails after a round trip.
 */
function deleteBlockReason(booking: BookingRow): string | null {
  if (booking.status !== "draft" && booking.status !== "cancelled") {
    return `Only draft or cancelled bookings can be deleted. Set this booking's status to Cancelled first.`;
  }

  const payment = latestPayment(booking.payments);
  if (payment) {
    return `This booking has a payment record (${paidLabel(payment)}), and payment history is never deletable — it is needed for tax reporting and dispute defense. Refunding it does not remove the record.`;
  }

  return null;
}

function supportsDumpsterAssignment(booking: BookingRow): boolean {
  return (
    booking.status !== "draft" &&
    booking.status !== "cancelled" &&
    !!booking.scheduled_start_at &&
    !!booking.scheduled_end_at &&
    !!booking.service_items?.dumpster_size_id
  );
}

function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && endA > startB;
}

function availableDumpstersForBooking(
  booking: BookingRow,
  dumpsters: DumpsterOption[],
  assignments: ActiveAssignment[],
): DumpsterOption[] {
  const requiredSizeId = booking.service_items?.dumpster_size_id;
  if (
    !requiredSizeId ||
    !booking.scheduled_start_at ||
    !booking.scheduled_end_at
  ) {
    return [];
  }
  const bookingStart = booking.scheduled_start_at;
  const bookingEnd = booking.scheduled_end_at;

  return dumpsters.filter((dumpster) => {
    if (dumpster.dumpster_size_id !== requiredSizeId) return false;

    const conflicts = assignments.filter(
      (assignment) =>
        assignment.dumpster_id === dumpster.id &&
        assignment.booking_id !== booking.id &&
        rangesOverlap(
          assignment.starts_at,
          assignment.ends_at,
          bookingStart,
          bookingEnd,
        ),
    );

    return conflicts.length === 0;
  });
}

export default async function LeadsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<LeadsPageSearchParams> }>) {
  const supabase = createAdminClient();
  const params = (await searchParams) ?? {};

  const [quotesResult, bookingsResult, dumpstersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, created_at, request_details, customers(first_name, last_name, email, phone), service_items(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("bookings")
      .select(
        "id, booking_number, status, service_item_id, scheduled_start_at, scheduled_end_at, created_at, customers(first_name, last_name, email, phone), customer_addresses!bookings_service_address_id_fkey(latitude, longitude), service_items(dumpster_size_id, dumpster_sizes(name)), booking_price_snapshots(total_cents, range_min_cents, range_max_cents, snapshot_type, revision_number, finalized_at), payments(status, amount_cents, card_on_file, succeeded_at, metadata), dumpster_assignments(id, status, dumpsters(id, asset_number))",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("dumpsters")
      .select("id, asset_number, status, dumpster_size_id, dumpster_sizes(name)")
      .in("status", ["available", "reserved"])
      .order("asset_number"),
    supabase
      .from("dumpster_assignments")
      .select("id, booking_id, dumpster_id, status, starts_at, ends_at")
      .in("status", ["reserved", "assigned"]),
  ]);

  if (quotesResult.error) {
    console.error("admin/leads: quotes query failed", quotesResult.error);
  }
  if (bookingsResult.error) {
    console.error("admin/leads: bookings query failed", bookingsResult.error);
  }
  if (dumpstersResult.error) {
    console.error("admin/leads: dumpsters query failed", dumpstersResult.error);
  }
  if (assignmentsResult.error) {
    console.error("admin/leads: assignments query failed", assignmentsResult.error);
  }

  const quotes = (quotesResult.data as QuoteRow[] | null) ?? [];
  const bookings = (bookingsResult.data as BookingRow[] | null) ?? [];
  const dumpsters =
    (dumpstersResult.data as DumpsterOption[] | null) ?? [];
  const activeAssignments =
    (assignmentsResult.data as ActiveAssignment[] | null) ?? [];

  const itemsResult = await supabase
    .from("service_items")
    .select("id, name")
    .in("code", [
      "dumpster_15_residential",
      "dumpster_15_heavy_materials",
      "dumpster_22_residential",
    ])
    .order("name");
  const items =
    (itemsResult.data as Array<{ id: string; name: string }> | null) ?? [];

  const calendarBookings: CalendarBooking[] = bookings
    .filter((booking) => booking.scheduled_start_at && booking.scheduled_end_at)
    .map((booking) => ({
      id: booking.id,
      bookingNumber: booking.booking_number,
      status: booking.status,
      start: booking.scheduled_start_at as string,
      end: booking.scheduled_end_at as string,
      customer: customerName(booking.customers),
      dumpster: assignedDumpsterLabel(booking),
    }));
  // Open on the current week, not on whichever booking happens to sort first —
  // a booking scheduled months out would otherwise land staff in that week.
  const todayKey = denverDayKey(new Date());

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Leads &amp; bookings</h1>
        <p className={styles.pageSub}>
          Quote requests from the booking flow, and bookings with payment status.
        </p>
      </div>

      {params.error ? (
        <p className={styles.error} role="alert">
          {params.error}
        </p>
      ) : null}
      {params.notice ? (
        <p className={styles.notice} role="status">
          {params.notice}
        </p>
      ) : null}

      <AddBookingForm
        items={items}
        dumpsters={dumpsters.map((dumpster) => ({
          id: dumpster.id,
          asset_number: dumpster.asset_number,
          dumpster_size_name: dumpster.dumpster_sizes?.name ?? null,
        }))}
      />

      <section className={styles.card}>
        <div className={styles.calendarHeader}>
          <div>
            <h2 className={styles.cardTitle}>Booking calendar</h2>
            <p className={styles.calendarSub}>
              Visual timeline of scheduled dumpster bookings by status.
            </p>
          </div>
        </div>
        {calendarBookings.length === 0 ? (
          <p className={styles.empty}>
            No scheduled bookings to place on the calendar yet.
          </p>
        ) : (
          <BookingCalendar
            bookings={calendarBookings}
            initialFocus={todayKey}
            today={todayKey}
          />
        )}
      </section>

      <h2 className={styles.cardTitle}>Bookings</h2>
      <div className={styles.tableWrap} style={{ marginBottom: "var(--space-6)" }}>
        {bookings.length === 0 ? (
          <p className={styles.empty}>No bookings yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Dumpster</th>
                <th>Placement</th>
                <th>Price</th>
                <th>Payment</th>
                <th>Refund</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                (() => {
                  const currentDumpster = assignedDumpsterLabel(booking);
                  const payment = latestPayment(booking.payments);
                  const options = availableDumpstersForBooking(
                    booking,
                    dumpsters,
                    activeAssignments,
                  );
                  return (
                    <tr key={booking.id}>
                      <td data-label="Booking #">
                        <span className={styles.tableCellStack}>
                          <Link
                            href={`/admin/leads/${booking.id}`}
                            className={styles.tableLink}
                          >
                            {booking.booking_number}
                          </Link>
                          <span className={styles.cellMeta}>
                            {dateOnly(booking.created_at)}
                          </span>
                        </span>
                      </td>
                      <td data-label="Customer">
                        <Link
                          href={`/admin/leads/${booking.id}`}
                          className={styles.tableLinkStrong}
                        >
                          {customerName(booking.customers)}
                        </Link>
                      </td>
                      <td data-label="Delivery">
                        {booking.scheduled_start_at ? (
                          <span className={styles.tableCellStack}>
                            <Link
                              href={`/admin/leads/${booking.id}`}
                              className={styles.tableLink}
                            >
                              {dateOnly(booking.scheduled_start_at)}
                            </Link>
                            {booking.scheduled_end_at ? (
                              <span className={styles.cellMeta}>
                                to {dateOnly(booking.scheduled_end_at)}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Status">
                        <form
                          action={updateBookingStatus}
                          className={styles.inlineForm}
                        >
                          <input type="hidden" name="id" value={booking.id} />
                          <AutoSubmitSelect
                            name="status"
                            defaultValue={booking.status}
                            className={styles.inlineSelect}
                            ariaLabel={`Status for booking ${booking.booking_number}`}
                          >
                            {BOOKING_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {humanizeStatus(status)}
                              </option>
                            ))}
                          </AutoSubmitSelect>
                        </form>
                      </td>
                      <td data-label="Dumpster">
                        {supportsDumpsterAssignment(booking) ? (
                          <form
                            action={assignBookingDumpster}
                            className={styles.inlineForm}
                          >
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <AutoSubmitSelect
                              name="dumpsterId"
                              defaultValue={activeDumpsterId(booking) ?? ""}
                              className={styles.inlineSelect}
                              ariaLabel={`Dumpster for booking ${booking.booking_number}`}
                            >
                              <option value="">Unassigned</option>
                              {options.map((dumpster) => (
                                <option key={dumpster.id} value={dumpster.id}>
                                  {dumpster.asset_number}
                                  {dumpster.dumpster_sizes?.name
                                    ? ` • ${dumpster.dumpster_sizes.name}`
                                    : ""}
                                  {dumpster.status !== "available"
                                    ? ` • ${humanizeStatus(dumpster.status)}`
                                    : ""}
                                </option>
                              ))}
                            </AutoSubmitSelect>
                          </form>
                        ) : currentDumpster ? (
                          currentDumpster
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Placement">
                        {booking.customer_addresses?.latitude != null &&
                        booking.customer_addresses?.longitude != null ? (
                          <PlacementMapsLink
                            latitude={booking.customer_addresses.latitude}
                            longitude={booking.customer_addresses.longitude}
                            bookingNumber={booking.booking_number}
                            className={styles.snapshotLink}
                          >
                            <PlacementSnapshotMap
                              latitude={booking.customer_addresses.latitude}
                              longitude={booking.customer_addresses.longitude}
                              label={`Placement snapshot for booking ${booking.booking_number}`}
                              compact
                            />
                          </PlacementMapsLink>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Price">{priceLabel(booking.booking_price_snapshots)}</td>
                      <td data-label="Payment">
                        {payment ? (
                          <span className={styles.tableCellStack}>
                            <span>{paidLabel(payment)}</span>
                            <span className={styles.cellMeta}>
                              {paymentMethodLabel(payment)}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Refund">
                        {(() => {
                          const state = refundStateLabel(payment);
                          if (state) return state;
                          const remaining = refundableCents(payment);
                          if (remaining <= 0) return "—";
                          return (
                            <details className={styles.refundDisclosure}>
                              <summary className={styles.refundSummary}>
                                Refund
                              </summary>
                              <form
                                action={refundBookingPayment}
                                className={styles.refundForm}
                              >
                                <input
                                  type="hidden"
                                  name="bookingId"
                                  value={booking.id}
                                />
                                <label
                                  className={styles.refundLabel}
                                  htmlFor={`refund-amount-${booking.id}`}
                                >
                                  Amount
                                </label>
                                <input
                                  id={`refund-amount-${booking.id}`}
                                  name="amount"
                                  className={styles.refundInput}
                                  defaultValue={(remaining / 100).toFixed(2)}
                                  inputMode="decimal"
                                  autoComplete="off"
                                />
                                <label
                                  className={styles.refundLabel}
                                  htmlFor={`refund-confirm-${booking.id}`}
                                >
                                  Re-type to confirm
                                </label>
                                <input
                                  id={`refund-confirm-${booking.id}`}
                                  name="confirmAmount"
                                  className={styles.refundInput}
                                  placeholder={(remaining / 100).toFixed(2)}
                                  inputMode="decimal"
                                  autoComplete="off"
                                />
                                <PendingSubmitButton
                                  className={styles.refundButton}
                                  pendingLabel="Sending…"
                                >
                                  Send refund
                                </PendingSubmitButton>
                              </form>
                            </details>
                          );
                        })()}
                      </td>
                      <td data-label="Delete">
                        {(() => {
                          const blocked = deleteBlockReason(booking);
                          if (!blocked) {
                            return (
                              <form action={deleteBooking}>
                                <input type="hidden" name="id" value={booking.id} />
                                <button
                                  type="submit"
                                  className={styles.iconDangerButton}
                                  aria-label={`Delete booking ${booking.booking_number}`}
                                  title={`Delete booking ${booking.booking_number}`}
                                >
                                  <TrashIcon />
                                </button>
                              </form>
                            );
                          }
                          return (
                            <details className={styles.lockDisclosure}>
                              <summary
                                className={styles.lockedIcon}
                                aria-label={`Why booking ${booking.booking_number} cannot be deleted`}
                                title="Why can't this be deleted?"
                              >
                                <LockIcon />
                              </summary>
                              <p className={styles.lockReason}>{blocked}</p>
                            </details>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })()
              ))}
            </tbody>
          </table>
        )}
      </div>
      <h2 className={styles.cardTitle}>Quote requests</h2>
      <div className={styles.tableWrap}>
        {quotes.length === 0 ? (
          <p className={styles.empty}>No quote requests yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Received</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Size</th>
                <th>Needed</th>
                <th>Area</th>
                <th>Status</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td data-label="Quote #">
                    <Link
                      href={`/admin/leads/quote/${quote.id}`}
                      className={styles.tableLink}
                    >
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td data-label="Received">{dateOnly(quote.created_at)}</td>
                  <td data-label="Customer">
                    <Link
                      href={`/admin/leads/quote/${quote.id}`}
                      className={styles.tableLinkStrong}
                    >
                      {customerName(quote.customers)}
                    </Link>
                  </td>
                  <td data-label="Contact" className={styles.cellWrap}>
                    {quote.customers?.email ?? "—"}
                    <br />
                    {quote.customers?.phone ?? ""}
                  </td>
                  <td data-label="Size" className={styles.cellWrap}>
                    {quote.service_items?.name ?? quote.request_details?.size_key ?? "—"}
                    {quote.request_details?.rental_days ? (
                      <>
                        <br />
                        {quote.request_details.rental_days} day
                        {quote.request_details.rental_days === 1 ? "" : "s"}
                      </>
                    ) : null}
                  </td>
                  <td data-label="Needed">
                    {quote.request_details?.needed_date
                      ? dateOnly(quote.request_details.needed_date)
                      : "—"}
                  </td>
                  <td data-label="Area">
                    <span className={styles.statusPill}>
                      {quote.request_details?.service_area_check ?? "—"}
                    </span>
                  </td>
                  <td data-label="Status">
                    <form action={updateQuoteStatus} className={styles.inlineForm}>
                      <input type="hidden" name="id" value={quote.id} />
                      <AutoSubmitSelect
                        name="status"
                        defaultValue={quote.status}
                        className={styles.inlineSelect}
                        ariaLabel={`Status for quote ${quote.quote_number}`}
                      >
                        {QUOTE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {humanizeStatus(status)}
                          </option>
                        ))}
                      </AutoSubmitSelect>
                    </form>
                  </td>
                  <td data-label="Delete">
                    <form action={deleteQuote}>
                      <input type="hidden" name="id" value={quote.id} />
                      <button
                        type="submit"
                        className={styles.iconDangerButton}
                        aria-label={`Delete quote ${quote.quote_number}`}
                        title={`Delete quote ${quote.quote_number}`}
                      >
                        <TrashIcon />
                      </button>
                    </form>
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
