import "server-only";

import Stripe from "stripe";

/**
 * Lazily constructs the server-side Stripe client. Kept lazy so a missing key
 * surfaces a clear error at call time (test-mode setup) instead of crashing the
 * module at import. The secret key is server-only and must never be exposed to
 * the browser.
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isStripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ?? false;
}
