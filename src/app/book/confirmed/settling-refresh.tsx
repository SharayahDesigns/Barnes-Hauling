"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Stripe redirects the customer back the instant payment succeeds, which
 * regularly beats the checkout.session.completed webhook that actually records
 * the booking as paid. Without this the customer sees an unsettled page and has
 * to refresh to learn their booking confirmed.
 *
 * Re-fetches on a short interval for a bounded window, then stops. If the
 * webhook is genuinely delayed, the page keeps its honest unsettled wording
 * rather than polling forever.
 */
export function SettlingRefresh({
  attempts = 5,
  intervalMs = 2000,
}: Readonly<{ attempts?: number; intervalMs?: number }>) {
  const router = useRouter();

  useEffect(() => {
    let remaining = attempts;
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [attempts, intervalMs, router]);

  return null;
}
