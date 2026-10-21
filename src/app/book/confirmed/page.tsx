import Link from "next/link";

import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../booking-flow.module.scss";
import { ClearBookingDraft } from "./clear-draft";
import { SettlingRefresh } from "./settling-refresh";

export const metadata = createPageMetadata(
  "Booking received",
  "Your Barnes dumpster rental request has been received.",
  `${siteRoutes.book}/confirmed`,
  { noIndex: true },
);

type PaymentRecord = {
  status: string;
  amount_cents: number;
  is_test_mode: boolean;
  metadata: Record<string, unknown> | null;
  bookings: { booking_number: number; status: string } | null;
};

// Receipts show exact cents; formatCents rounds to whole dollars for marketing
// copy, which would misstate a settled total.
const EXACT_USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatExactCents(amountCents: number): string {
  return EXACT_USD.format(amountCents / 100);
}

export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  let payment: PaymentRecord | null = null;
  if (sessionId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("payments")
      .select(
        "status, amount_cents, is_test_mode, metadata, bookings(booking_number, status)",
      )
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    payment = (data as unknown as PaymentRecord | null) ?? null;
  }

  const bookingNumber = payment?.bookings?.booking_number ?? null;
  const settled = payment?.status === "succeeded";
  const confirmed = payment?.bookings?.status === "confirmed";

  // Stripe's settled breakdown, captured by the webhook.
  const taxCents = Number(payment?.metadata?.checkout_total_tax_cents ?? 0);
  const subtotalCents = Number(
    payment?.metadata?.checkout_subtotal_cents ?? payment?.amount_cents ?? 0,
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.confirmation}>
          <span className={styles.confirmationBadge} aria-hidden="true">
            ✓
          </span>
          <h1 className={styles.stepTitle}>
            {confirmed
              ? "Booking confirmed"
              : settled
                ? "Payment received"
                : "Booking received"}
          </h1>
          {bookingNumber !== null && (
            <p className={styles.confirmationNumber}>Booking #{bookingNumber}</p>
          )}
          <p className={styles.stepSummary}>
            {confirmed
              ? "Thanks — your payment went through and your booking is confirmed. We'll be in touch with your delivery window before your date."
              : settled
                ? "Thanks — your payment went through. Our team will review the details, confirm your delivery date, and finalize your total."
                : "Thanks — we've received your request. We're finalizing your payment now; this page updates on its own."}
          </p>
          {/* Stripe only sends customers here after a successful payment. */}
          {sessionId ? <ClearBookingDraft /> : null}
          {/* Stripe's redirect often arrives before its webhook does. */}
          {sessionId && !settled ? <SettlingRefresh /> : null}
          {payment && (
            <p className={styles.helpText}>
              {taxCents > 0
                ? `Subtotal ${formatExactCents(subtotalCents)} + tax ${formatExactCents(taxCents)} = `
                : "Payment total: "}
              {formatExactCents(payment.amount_cents)}. A copy of your rental
              agreement will be emailed to you.
            </p>
          )}
          <p className={styles.helpText}>
            {payment?.is_test_mode
              ? "This Stripe sandbox payment is for testing only. Your booking is still subject to Barnes review before scheduling."
              : "Your booking is still subject to Barnes review before scheduling."}{" "}
            Questions? Call or text 385-246-4219.
          </p>
          <Link className={styles.secondaryButton} href={siteRoutes.home}>
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
