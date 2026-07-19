import Link from "next/link";

import { siteRoutes } from "@/config/site";
import { formatCents } from "@/config/public-content";
import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../booking-flow.module.scss";

export const metadata = createPageMetadata(
  "Booking received",
  "Your Barnes dumpster rental request has been received.",
  `${siteRoutes.book}/confirmed`,
  { noIndex: true },
);

type PaymentRecord = {
  status: string;
  amount_cents: number;
  bookings: { booking_number: number } | null;
};

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
      .select("status, amount_cents, bookings(booking_number)")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    payment = (data as PaymentRecord | null) ?? null;
  }

  const bookingNumber = payment?.bookings?.booking_number ?? null;
  const settled = payment?.status === "succeeded";

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.confirmation}>
          <span className={styles.confirmationBadge} aria-hidden="true">
            ✓
          </span>
          <h1 className={styles.stepTitle}>
            {settled ? "Payment received" : "Booking received"}
          </h1>
          {bookingNumber !== null && (
            <p className={styles.confirmationNumber}>Booking #{bookingNumber}</p>
          )}
          <p className={styles.stepSummary}>
            {settled
              ? "Thanks — your payment went through. Our team will review the details, confirm your delivery date, and finalize your total."
              : "Thanks — we've received your request. Once your payment settles, we'll review the details and confirm your delivery date."}
          </p>
          {payment && (
            <p className={styles.helpText}>
              Base rental paid: {formatCents(payment.amount_cents)}. Taxes and any
              delivery charge are confirmed before your booking is finalized. A
              copy of your rental agreement will be emailed to you.
            </p>
          )}
          <p className={styles.helpText}>
            This is a test-mode booking; your booking is confirmed only after
            Barnes review. Questions? Call or text 385-246-4219.
          </p>
          <Link className={styles.secondaryButton} href={siteRoutes.home}>
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
