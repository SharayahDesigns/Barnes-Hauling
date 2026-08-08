export const DUMPSTER_YARD_ADDRESS =
  "5973 W 12900 S, Herriman, UT 84096";

/**
 * Authoritative delivery-yard point for distance pricing.
 *
 * Prefer env overrides so production can pin the exact coordinate without a
 * deploy. Fallback matches the existing Herriman map center already used in the
 * booking UI, which is close enough to keep distance pricing functional during
 * setup.
 */
export const DUMPSTER_YARD_POINT = {
  lat: Number(process.env.DUMPSTER_YARD_LAT ?? "40.5069"),
  lng: Number(process.env.DUMPSTER_YARD_LNG ?? "-111.9391"),
} as const;

export const INCLUDED_DELIVERY_RADIUS_MILES = 20;
export const MAX_DELIVERY_RADIUS_MILES = 60;
export const EXTRA_DELIVERY_RATE_CENTS_PER_MILE = 200;

export type DeliveryPricing = {
  distanceMiles: number;
  includedMiles: number;
  maxMiles: number;
  extraMiles: number;
  surchargeCents: number;
};

export function roundMiles(value: number): number {
  return Math.round(value * 10) / 10;
}

export function haversineMiles(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): number {
  const earthRadiusMiles = 3958.7613;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(end.lat - start.lat);
  const dLng = toRadians(end.lng - start.lng);
  const lat1 = toRadians(start.lat);
  const lat2 = toRadians(end.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

export function calculateDeliveryPricing(distanceMiles: number): DeliveryPricing {
  const roundedDistance = roundMiles(distanceMiles);
  const extraMiles = Math.max(
    0,
    Math.ceil(roundedDistance - INCLUDED_DELIVERY_RADIUS_MILES),
  );

  return {
    distanceMiles: roundedDistance,
    includedMiles: INCLUDED_DELIVERY_RADIUS_MILES,
    maxMiles: MAX_DELIVERY_RADIUS_MILES,
    extraMiles,
    surchargeCents: Math.round(extraMiles * EXTRA_DELIVERY_RATE_CENTS_PER_MILE),
  };
}
