import Link from "next/link";

import { siteRoutes } from "@/config/site";
import { PREPAYMENT_AGREEMENT_TERMS } from "@/lib/booking/options";
import { startQuoteCheckout } from "@/lib/booking/pay-link";
import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../book/booking-flow.module.scss";

export const metadata = createPageMetadata(
  "Complete your booking",
  "Pay for your Barnes dumpster rental.",
  "/pay",
  { noIndex: true },
);

type PayPageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ error?: string }>;
};

const EXACT_USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

export default async function PayPage({
  params,
  searchParams,
}: Readonly<PayPageProps>) {
  const { bookingId } = await params;
  const { error } = await searchParams;
  const supabase = createAdminClient();

  const bookingResult = await supabase
    .from("bookings")
    .select(
      "id, booking_number, status, scheduled_start_at, scheduled_end_at, service_items(name), payments(status, amount_cents, metadata)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingResult.data as unknown as {
    id: string;
    booking_number: number;
    status: string;
    scheduled_start_at: string | null;
    scheduled_end_at: string | null;
    service_items: { name: string } | null;
    payments: Array<{
      status: string;
      amount_cents: number;
      metadata: Record<string, unknown> | null;
    }> | null;
  } | null;

  // Deliberately vague for an unknown id: this page is reachable by anyone with
  // the link, so it should not confirm whether a given booking exists.
  if (!booking) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <h1 className={styles.stepTitle}>Link not found</h1>
          <p className={styles.stepSummary}>
            This payment link is not valid. Please check the link in your email,
            or contact Barnes and we&apos;ll send a new one.
          </p>
          <Link className={styles.secondaryButton} href={siteRoutes.home}>
            Return home
          </Link>
        </div>
      </div>
    );
  }

  const settled = booking.payments?.find(
    (payment) => payment.status === "succeeded",
  );

  if (settled || booking.status !== "pending_payment") {
    return (
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <div className={styles.confirmation}>
            <span className={styles.confirmationBadge} aria-hidden="true">
              ✓
            </span>
            <h1 className={styles.stepTitle}>
              {settled ? "Already paid" : "Nothing to pay"}
            </h1>
            <p className={styles.confirmationNumber}>
              Booking #{booking.booking_number}
            </p>
            <p className={styles.stepSummary}>
              {settled
                ? "This booking is already paid. We'll be in touch with your delivery window."
                : "This booking is no longer awaiting payment. Contact Barnes if that seems wrong."}
            </p>
            <Link className={styles.secondaryButton} href={siteRoutes.home}>
              Return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const payment = booking.payments?.[0] ?? null;
  const rentalDays =
    typeof payment?.metadata?.rental_days === "number"
      ? payment.metadata.rental_days
      : null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <header className={styles.stepHeader}>
          <p className={styles.stepEyebrow}>Booking #{booking.booking_number}</p>
          <h1 className={styles.stepTitle}>Complete your booking</h1>
          <p className={styles.stepSummary}>
            Review the details you agreed with Barnes, then pay securely through
            Stripe. Your delivery date is held once payment is complete.
          </p>
        </header>

        {error ? (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        ) : null}

        <dl className={styles.summaryList}>
          <div className={styles.summaryRow}>
            <dt className={styles.summaryTerm}>Container</dt>
            <dd className={styles.summaryValue}>{booking.service_items?.name ?? "Dumpster rental"}</dd>
          </div>
          {rentalDays !== null ? (
            <div className={styles.summaryRow}>
              <dt className={styles.summaryTerm}>Rental</dt>
              <dd>
                {rentalDays} day{rentalDays === 1 ? "" : "s"}
              </dd>
            </div>
          ) : null}
          <div className={styles.summaryRow}>
            <dt className={styles.summaryTerm}>Delivery date</dt>
            <dd className={styles.summaryValue}>{formatDate(booking.scheduled_start_at)}</dd>
          </div>
          <div className={styles.summaryRow}>
            <dt className={styles.summaryTerm}>Total</dt>
            <dd>
              {payment ? EXACT_USD.format(payment.amount_cents / 100) : "—"}
            </dd>
          </div>
        </dl>

        <div className={styles.agreementCard}>
          <h2 className={styles.agreementTitle}>Load and weight terms</h2>
          <ul className={styles.agreementTerms}>
            {PREPAYMENT_AGREEMENT_TERMS.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>

          <form action={startQuoteCheckout}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <div className={styles.checkRow}>
              <input id="agreementAccepted" name="agreementAccepted" type="checkbox" />
              <label className={styles.checkLabel} htmlFor="agreementAccepted">
                <span className={styles.checkLabelTitle}>
                  I understand and accept these terms.
                </span>
                <span className={styles.checkLabelText}>
                  Taxes are calculated at checkout. A copy of your rental
                  agreement will be emailed to you after payment.
                </span>
              </label>
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton}>
                Continue to payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
