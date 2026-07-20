import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  calculateDeliveryPricing,
  DUMPSTER_YARD_POINT,
  haversineMiles,
  MAX_DELIVERY_RADIUS_MILES,
} from "./delivery-zone";

/**
 * Service-area validation for a dumpster delivery address.
 *
 * Preferred path: use geocoded destination coordinates and compute distance
 * from the configured dumpster-yard point, including the extended-distance
 * surcharge beyond 20 miles.
 *
 * Fallback path: if coordinates are unavailable, use the legacy ZIP coverage
 * table so staff can still mark known areas as covered manually.
 */
export type ServiceAreaResult =
  | {
      status: "validated" | "extended";
      serviceAreaId: string | null;
      serviceZoneId: string | null;
      distanceMiles: number;
      includedMiles: number;
      maxMiles: number;
      extraMiles: number;
      surchargeCents: number;
    }
  | {
      status: "out_of_range";
      serviceAreaId: null;
      serviceZoneId: null;
      distanceMiles: number;
      includedMiles: number;
      maxMiles: number;
      extraMiles: number;
      surchargeCents: number;
    }
  | { status: "unconfirmed" };

export async function checkServiceArea(
  input: {
    postalCode: string;
    latitude?: number | null;
    longitude?: number | null;
  },
): Promise<ServiceAreaResult> {
  if (
    input.latitude != null &&
    Number.isFinite(input.latitude) &&
    input.longitude != null &&
    Number.isFinite(input.longitude)
  ) {
    const distanceMiles = haversineMiles(DUMPSTER_YARD_POINT, {
      lat: input.latitude,
      lng: input.longitude,
    });
    const pricing = calculateDeliveryPricing(distanceMiles);

    if (pricing.distanceMiles > MAX_DELIVERY_RADIUS_MILES) {
      return {
        status: "out_of_range",
        serviceAreaId: null,
        serviceZoneId: null,
        ...pricing,
      };
    }

    return {
      status: pricing.surchargeCents > 0 ? "extended" : "validated",
      serviceAreaId: null,
      serviceZoneId: null,
      ...pricing,
    };
  }

  const supabase = createAdminClient();

  const { data: matches, error } = await supabase
    .from("service_zone_postal_codes")
    .select("service_zone_id")
    .eq("country_code", "US")
    .eq("postal_code", input.postalCode)
    .limit(1);

  if (error) {
    throw new Error(`Service-area lookup failed: ${error.message}`);
  }

  const zoneId = matches?.[0]?.service_zone_id;
  if (!zoneId) {
    return { status: "unconfirmed" };
  }

  const { data: zone, error: zoneError } = await supabase
    .from("service_zones")
    .select("id, service_area_id, status, service_areas(status)")
    .eq("id", zoneId)
    .eq("status", "active")
    .maybeSingle();

  if (zoneError) {
    throw new Error(`Service-zone lookup failed: ${zoneError.message}`);
  }

  const areaStatus = (zone?.service_areas as { status?: string } | null)?.status;
  if (!zone || areaStatus !== "active") {
    return { status: "unconfirmed" };
  }

  return {
    status: "validated",
    serviceAreaId: zone.service_area_id,
    serviceZoneId: zone.id,
    ...calculateDeliveryPricing(0),
  };
}
