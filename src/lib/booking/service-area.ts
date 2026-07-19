import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Service-area validation for a US ZIP code.
 *
 * A ZIP only counts as "validated" when it maps to a seeded postal code inside
 * an active service zone and active service area. No production service-area
 * ZIPs are confirmed yet, so this currently returns "unconfirmed" for every
 * ZIP. We never fabricate coverage: an unconfirmed address is stored as
 * `pending` and a staff member (or seeded ZIP data) confirms it later.
 */
export type ServiceAreaResult =
  | { status: "validated"; serviceAreaId: string; serviceZoneId: string }
  | { status: "unconfirmed" };

export async function checkServiceArea(
  postalCode: string,
): Promise<ServiceAreaResult> {
  const supabase = createAdminClient();

  const { data: matches, error } = await supabase
    .from("service_zone_postal_codes")
    .select("service_zone_id")
    .eq("country_code", "US")
    .eq("postal_code", postalCode)
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
  };
}
