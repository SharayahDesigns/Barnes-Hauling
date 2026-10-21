import { siteRoutes } from "@/config/site";
import { getDeliveryAvailability } from "@/lib/booking/availability";
import { loadBookingSizeOptions } from "@/lib/booking/catalog";
import { resolveBookingPreselection } from "@/lib/booking/options";
import { resolveDumpsterServiceId, todayInDenver } from "@/lib/booking/records";
import type { DeliveryAvailability } from "@/lib/booking/types";
import { createPageMetadata } from "@/lib/page-metadata";
import { createAdminClient } from "@/lib/supabase/admin";

import { BookingFlow } from "./booking-flow";

export const metadata = createPageMetadata(
  "Book a dumpster",
  "Plan and request a Barnes dumpster rental: confirm your address, choose a container, pick a delivery date, and share placement details. Online payment is being finalized.",
  siteRoutes.book,
  { noIndex: true },
);

// Availability depends on live blackout/booking data, so render per-request.
export const dynamic = "force-dynamic";

async function loadAvailability(): Promise<DeliveryAvailability> {
  try {
    const supabase = createAdminClient();
    const serviceId = await resolveDumpsterServiceId(supabase);
    return await getDeliveryAvailability(supabase, serviceId);
  } catch {
    // Fall back to an open 120-day window if the service/data can't load.
    const min = todayInDenver();
    const [y, m, d] = min.split("-").map(Number);
    const max = new Date(Date.UTC(y, m - 1, d + 120)).toISOString().slice(0, 10);
    return { minDate: min, maxDate: max, bySizeKey: {}, hasRules: false };
  }
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string | string[]; load?: string | string[] }>;
}) {
  const { size, load } = await searchParams;
  const availability = await loadAvailability();
  const sizeOptions = await loadBookingSizeOptions();
  // /book?size=15-yard[&load=<option>] arrives with that dumpster selected.
  const preselection = resolveBookingPreselection(
    sizeOptions,
    typeof size === "string" ? size : undefined,
    typeof load === "string" ? load : undefined,
  );
  return (
    <BookingFlow
      availability={availability}
      sizeOptions={sizeOptions}
      preselection={preselection}
    />
  );
}
