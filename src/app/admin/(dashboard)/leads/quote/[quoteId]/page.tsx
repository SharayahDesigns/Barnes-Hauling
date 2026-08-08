import Link from "next/link";
import { notFound } from "next/navigation";

import { humanizeStatus } from "@/lib/admin/dumpster-status";
import { approveQuoteAndSendPaymentLink } from "@/lib/admin/quotes";
import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../../../admin.module.scss";
import { PlacementSnapshotMap } from "../../placement-snapshot-map";

export const metadata = createPageMetadata(
  "Quote request",
  "Barnes quote request detail.",
  "/admin/leads",
  { noIndex: true },
);

type QuotePageProps = {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

/** Everything the booking flow writes into quotes.request_details. */
type RequestDetails = {
  flow?: string;
  size_key?: string;
  service_item_code?: string;
  rental_days?: number;
  needed_date?: string;
  placement_notes?: string | null;
  customer_note?: string | null;
  custom_rental_quote?: boolean;
  placement?: { latitude?: number | null; longitude?: number | null } | null;
  service_area_check?: string;
  delivery_pricing?: {
    status?: string;
    distance_miles?: number | null;
    included_miles?: number | null;
    max_miles?: number | null;
    surcharge_cents?: number | null;
  } | null;
  prepayment_agreement?: { accepted?: boolean; version?: string } | null;
  notifications?: { email?: boolean; sms?: boolean } | null;
};

type QuoteDetailRow = {
  id: string;
  quote_number: number;
  status: string;
  created_at: string;
  submitted_at: string | null;
  service_item_id: string | null;
  request_details: RequestDetails | null;
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
    region: string;
    postal_code: string;
    latitude: number | null;
    longitude: number | null;
    delivery_distance_miles: number | null;
    delivery_surcharge_cents: number | null;
  } | null;
  service_items: { name: string } | null;
  files:
    | Array<{
        id: string;
        original_filename: string;
        created_at: string;
        category: string;
      }>
    | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function addressLabel(address: QuoteDetailRow["customer_addresses"]): string {
  if (!address) return "—";
  return [
    address.address_line_1,
    address.address_line_2,
    `${address.city}, ${address.region} ${address.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function customerName(customer: QuoteDetailRow["customers"]): string {
  if (!customer) return "—";
  return `${customer.first_name} ${customer.last_name}`.trim() || "—";
}

/** Digits only — tel: links choke on formatting characters. */
function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:${digits.length === 10 ? `+1${digits}` : `+${digits}`}`;
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: Readonly<QuotePageProps>) {
  const { quoteId } = await params;
  const { error: pageError, notice } = await searchParams;
  const supabase = createAdminClient();

  const [quoteResult, serviceItemsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id, quote_number, status, created_at, submitted_at, service_item_id, request_details, customers(first_name, last_name, email, phone), customer_addresses!quotes_service_address_id_fkey(address_line_1, address_line_2, city, region, postal_code, latitude, longitude, delivery_distance_miles, delivery_surcharge_cents), service_items(name), files(id, original_filename, created_at, category)",
      )
      .eq("id", quoteId)
      .single(),
    supabase
      .from("service_items")
      .select("id, name")
      .eq("item_kind", "rental_package")
      .eq("status", "active")
      .order("name"),
  ]);

  const quote = quoteResult.data as unknown as QuoteDetailRow | null;
  const serviceItems =
    (serviceItemsResult.data as Array<{ id: string; name: string }> | null) ?? [];

  if (quoteResult.error || !quote) {
    notFound();
  }

  const details = quote.request_details ?? {};
  const address = quote.customer_addresses;
  const email = quote.customers?.email ?? null;
  const phone = quote.customers?.phone ?? null;

  // The placement pin is stored on the request, but older records only carry it
  // on the address row.
  const latitude = details.placement?.latitude ?? address?.latitude ?? null;
  const longitude = details.placement?.longitude ?? address?.longitude ?? null;

  const notes =
    details.placement_notes?.trim() || details.customer_note?.trim() || null;

  const subject = `Barnes Hauling — quote request #${quote.quote_number}`;
  const body = `Hi ${quote.customers?.first_name ?? "there"},\n\nThanks for your dumpster quote request (#${quote.quote_number}).\n\n`;

  return (
    <>
      <div className={styles.pageHeader}>
        <Link href="/admin/leads" className={styles.backLink}>
          Back to leads &amp; bookings
        </Link>
        <h1 className={styles.pageTitle}>Quote request #{quote.quote_number}</h1>
        <p className={styles.pageSub}>
          Everything this customer selected, and how to reach them.
        </p>
      </div>

      {pageError ? (
        <p className={styles.error} role="alert">
          {pageError}
        </p>
      ) : null}
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      {quote.status === "approved" ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Approved</h2>
          <p className={styles.detailText}>
            This quote has been approved and converted into a booking. Find it in
            the bookings table to check payment status or resend the link.
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Approve and send payment link</h2>
          <p className={styles.detailText}>
            Confirm what you agreed on the phone. This creates a booking awaiting
            payment and emails the customer a link to pay. The delivery date is
            only held once they pay.
          </p>
          <form action={approveQuoteAndSendPaymentLink} className={styles.formGrid}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="serviceItemId">
                Container package
              </label>
              <select
                id="serviceItemId"
                name="serviceItemId"
                className={styles.select}
                defaultValue={quote.service_item_id ?? ""}
                required
              >
                <option value="" disabled>
                  Choose a package
                </option>
                {serviceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="amount">
                Agreed price ($)
              </label>
              <input
                id="amount"
                name="amount"
                className={styles.input}
                inputMode="decimal"
                placeholder="350.00"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="neededDate">
                Delivery date
              </label>
              <input
                id="neededDate"
                name="neededDate"
                type="date"
                className={styles.input}
                defaultValue={details.needed_date ?? ""}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rentalDays">
                Rental days
              </label>
              <input
                id="rentalDays"
                name="rentalDays"
                type="number"
                min="1"
                step="1"
                className={styles.input}
                defaultValue={details.rental_days ?? ""}
                required
              />
            </div>
            <div className={styles.fieldFull}>
              <button type="submit" className={styles.primaryButton}>
                Approve and email payment link
              </button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Contact customer</h2>
        <p className={styles.detailText}>
          {customerName(quote.customers)}
          {details.custom_rental_quote
            ? " asked for a custom rental quote."
            : " submitted a dumpster request."}
        </p>
        <div className={styles.contactActions}>
          {email ? (
            <a
              className={styles.contactButton}
              href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
            >
              Email {email}
            </a>
          ) : (
            <span className={styles.contactUnavailable}>No email on file</span>
          )}
          {phone ? (
            <a
              className={styles.contactButtonSecondary}
              href={telHref(phone)}
            >
              Call {phone}
            </a>
          ) : (
            <span className={styles.contactUnavailable}>No phone on file</span>
          )}
        </div>
      </section>

      <div className={styles.detailGrid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>What they selected</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Status</dt>
              <dd>
                <span className={styles.statusPill}>
                  {humanizeStatus(quote.status)}
                </span>
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Request type</dt>
              <dd>
                {details.custom_rental_quote
                  ? "Custom rental quote"
                  : "Standard dumpster request"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Container</dt>
              <dd>
                {quote.service_items?.name ?? details.size_key ?? "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Rental duration</dt>
              <dd>
                {typeof details.rental_days === "number"
                  ? `${details.rental_days} day${details.rental_days === 1 ? "" : "s"}`
                  : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Requested date</dt>
              <dd>{formatDate(details.needed_date ?? null)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Received</dt>
              <dd>{formatDateTime(quote.submitted_at ?? quote.created_at)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Customer</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Name</dt>
              <dd>{customerName(quote.customers)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Email</dt>
              <dd>{email ?? "—"}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Phone</dt>
              <dd>{phone ?? "—"}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Address</dt>
              <dd>{addressLabel(address)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Service area</dt>
              <dd>
                {details.service_area_check === "validated"
                  ? "Confirmed"
                  : "Needs review"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Distance from yard</dt>
              <dd>
                {address?.delivery_distance_miles != null
                  ? `${address.delivery_distance_miles.toFixed(1)} miles`
                  : details.delivery_pricing?.distance_miles != null
                    ? `${details.delivery_pricing.distance_miles.toFixed(1)} miles`
                    : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Delivery surcharge</dt>
              <dd>
                {address?.delivery_surcharge_cents != null
                  ? formatMoney(address.delivery_surcharge_cents)
                  : details.delivery_pricing?.surcharge_cents != null
                    ? formatMoney(details.delivery_pricing.surcharge_cents)
                    : "—"}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Contact consent</dt>
              <dd>
                {[
                  details.notifications?.email ? "Email" : null,
                  details.notifications?.sms ? "SMS" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "None given"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Placement snapshot</h2>
        {latitude != null && longitude != null ? (
          <figure className={styles.photoCard}>
            <PlacementSnapshotMap
              latitude={latitude}
              longitude={longitude}
              label="Satellite snapshot of the customer-selected dumpster placement pin."
            />
            <figcaption className={styles.photoMeta}>
              <strong>Customer-selected drop location</strong>
              <span>
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            </figcaption>
          </figure>
        ) : (
          <p className={styles.empty}>
            No placement pin was saved for this request, so a satellite snapshot
            is unavailable.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Notes from the customer</h2>
        <p className={styles.detailText}>
          {notes ?? "No notes provided."}
        </p>
      </section>

      {quote.files && quote.files.length > 0 ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Uploaded photos</h2>
          <ul className={styles.detailList}>
            {quote.files.map((file) => (
              <li key={file.id} className={styles.detailRow}>
                <dt>{file.category.replace(/_/g, " ")}</dt>
                <dd>
                  {file.original_filename} · {formatDate(file.created_at)}
                </dd>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
