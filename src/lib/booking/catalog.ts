import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  getBookingSizeOption,
  type BookingSizeOption,
} from "./options";
import type { SizeKey } from "./schema";

type ServiceItemRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  image_path: string | null;
  default_rental_days: number | null;
  dumpster_size_id: string | null;
  sort_order: number;
  dumpster_sizes: {
    name: string;
    capacity_cubic_yards: number | null;
    length_feet: number | null;
    width_feet: number | null;
    wall_height_feet: number | null;
  } | null;
};

type DumpsterRow = {
  asset_number: string;
  dumpster_size_id: string | null;
  service_item_id: string | null;
  image_path: string | null;
  rental_price_cents: number | null;
  max_weight_tons: number | null;
  rental_duration_days: number[] | null;
  materials_allowed: string[] | null;
  materials_not_allowed: string[] | null;
};

function resolvePublicImageUrl(
  supabase: ReturnType<typeof createAdminClient>,
  imagePath: string,
): string {
  const trimmed = imagePath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return supabase.storage.from("dumpster-images").getPublicUrl(trimmed).data
    .publicUrl;
}

function formatDimensions(
  size:
    | {
        length_feet: number | null;
        width_feet: number | null;
        wall_height_feet: number | null;
        capacity_cubic_yards: number | null;
      }
    | null
    | undefined,
): string {
  if (!size) return "";

  if (size.length_feet && size.width_feet) {
    const walls = size.wall_height_feet ? ` × ${size.wall_height_feet} ft walls` : "";
    return `${size.width_feet} ft × ${size.length_feet} ft${walls}`;
  }

  if (size.capacity_cubic_yards) {
    return `${size.capacity_cubic_yards} cu yd`;
  }

  return "";
}

function formatIncludedWeightLabel(maxWeightTons: number | null): string {
  if (maxWeightTons == null) return "Weight limit set by staff review";
  return `${maxWeightTons} ton${maxWeightTons === 1 ? "" : "s"} included`;
}

function formatMaterialRules(
  allowed: string[] | null,
  notAllowed: string[] | null,
): string[] {
  const rules: string[] = [];

  for (const item of allowed ?? []) {
    const trimmed = item.trim();
    if (trimmed) rules.push(trimmed);
  }

  for (const item of notAllowed ?? []) {
    const trimmed = item.trim();
    if (trimmed) rules.push(`No ${trimmed}`);
  }

  return rules;
}

function chooseRepresentativeDumpster(
  dumpsters: DumpsterRow[],
): DumpsterRow | undefined {
  return [...dumpsters].sort((a, b) => {
    const priceA = a.rental_price_cents ?? Number.MAX_SAFE_INTEGER;
    const priceB = b.rental_price_cents ?? Number.MAX_SAFE_INTEGER;
    if (priceA !== priceB) return priceA - priceB;

    const weightA = a.max_weight_tons ?? Number.MAX_SAFE_INTEGER;
    const weightB = b.max_weight_tons ?? Number.MAX_SAFE_INTEGER;
    if (weightA !== weightB) return weightA - weightB;

    return a.asset_number.localeCompare(b.asset_number);
  })[0];
}

export async function loadBookingSizeOptions(): Promise<readonly BookingSizeOption[]> {
  const supabase = createAdminClient();
  const [serviceItemsResult, enhancedDumpstersResult] = await Promise.all([
    supabase
      .from("service_items")
      .select(
        "id, code, name, description, image_path, default_rental_days, sort_order, dumpster_size_id, dumpster_sizes(name, capacity_cubic_yards, length_feet, width_feet, wall_height_feet)",
      )
      .eq("item_kind", "rental_package")
      .eq("status", "active")
      .order("sort_order"),
    supabase
      .from("dumpsters")
      .select(
        "asset_number, dumpster_size_id, service_item_id, image_path, rental_price_cents, max_weight_tons, rental_duration_days, materials_allowed, materials_not_allowed",
      )
      .neq("status", "retired"),
  ]);

  if (serviceItemsResult.error) {
    return [];
  }

  const supportsServiceItemAssignments = !enhancedDumpstersResult.error;
  const dumpstersResult = supportsServiceItemAssignments
    ? enhancedDumpstersResult
    : await supabase
        .from("dumpsters")
        .select(
          "asset_number, dumpster_size_id, image_path, rental_price_cents, max_weight_tons, rental_duration_days, materials_allowed, materials_not_allowed",
        )
        .neq("status", "retired");

  const serviceItems =
    ((serviceItemsResult.data as unknown) as ServiceItemRow[] | null) ?? [];
  const dumpsters = (
    (((dumpstersResult.data as unknown) as DumpsterRow[] | null) ?? []).map((row) => ({
      ...row,
      service_item_id: row.service_item_id ?? null,
      asset_number: row.asset_number.trim().toUpperCase(),
    }))
  );

  const serviceItemCountBySizeId = new Map<string, number>();
  for (const item of serviceItems) {
    if (!item.dumpster_size_id) continue;
    serviceItemCountBySizeId.set(
      item.dumpster_size_id,
      (serviceItemCountBySizeId.get(item.dumpster_size_id) ?? 0) + 1,
    );
  }
  const dumpstersByServiceItemId = new Map<string, DumpsterRow[]>();
  const dumpstersBySizeId = new Map<string, DumpsterRow[]>();
  const unassignedDumpstersBySizeId = new Map<string, DumpsterRow[]>();
  for (const dumpster of dumpsters) {
    if (dumpster.service_item_id) {
      const serviceItemList =
        dumpstersByServiceItemId.get(dumpster.service_item_id) ?? [];
      serviceItemList.push(dumpster);
      dumpstersByServiceItemId.set(dumpster.service_item_id, serviceItemList);
    }
    if (!dumpster.dumpster_size_id) continue;
    const list = dumpstersBySizeId.get(dumpster.dumpster_size_id) ?? [];
    list.push(dumpster);
    dumpstersBySizeId.set(dumpster.dumpster_size_id, list);
    if (!dumpster.service_item_id) {
      const unassignedList =
        unassignedDumpstersBySizeId.get(dumpster.dumpster_size_id) ?? [];
      unassignedList.push(dumpster);
      unassignedDumpstersBySizeId.set(dumpster.dumpster_size_id, unassignedList);
    }
  }

  const serviceItemsBySizeId = new Map<string, ServiceItemRow[]>();
  for (const serviceItem of serviceItems) {
    if (!serviceItem.dumpster_size_id) continue;
    const list = serviceItemsBySizeId.get(serviceItem.dumpster_size_id) ?? [];
    list.push(serviceItem);
    serviceItemsBySizeId.set(serviceItem.dumpster_size_id, list);
  }

  return serviceItems.flatMap((serviceItem) => {
    if (!serviceItem.dumpster_size_id) return [];
    const packageCountForSize =
      serviceItemCountBySizeId.get(serviceItem.dumpster_size_id) ?? 0;
    const dumpstersForServiceItem = serviceItem?.id
      ? (dumpstersByServiceItemId.get(serviceItem.id) ?? [])
      : [];
    const dumpstersForSize = serviceItem?.dumpster_size_id
      ? (dumpstersBySizeId.get(serviceItem.dumpster_size_id) ?? [])
      : [];
    const sortedUnassignedDumpsters = [
      ...(unassignedDumpstersBySizeId.get(serviceItem.dumpster_size_id) ?? []),
    ].sort((a, b) => {
      const priceA = a.rental_price_cents ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.rental_price_cents ?? Number.MAX_SAFE_INTEGER;
      if (priceA !== priceB) return priceA - priceB;

      const weightA = a.max_weight_tons ?? Number.MAX_SAFE_INTEGER;
      const weightB = b.max_weight_tons ?? Number.MAX_SAFE_INTEGER;
      if (weightA !== weightB) return weightA - weightB;

      return a.asset_number.localeCompare(b.asset_number);
    });
    const sortedServiceItemsForSize = [
      ...(serviceItemsBySizeId.get(serviceItem.dumpster_size_id) ?? []),
    ].sort((a, b) => a.sort_order - b.sort_order);
    const unassignedServiceItemsForSize = sortedServiceItemsForSize.filter(
      (item) => (dumpstersByServiceItemId.get(item.id)?.length ?? 0) === 0,
    );
    const fallbackDumpster =
      supportsServiceItemAssignments && packageCountForSize > 1
        ? sortedUnassignedDumpsters[
            unassignedServiceItemsForSize.findIndex((item) => item.id === serviceItem.id)
          ]
        : chooseRepresentativeDumpster(dumpstersForSize);
    const dumpster = chooseRepresentativeDumpster(
      dumpstersForServiceItem.length > 0 ? dumpstersForServiceItem : fallbackDumpster ? [fallbackDumpster] : [],
    );
    if (!dumpster && dumpstersForSize.length === 0) {
      return [];
    }
    const rentalDayOptions =
      dumpster?.rental_duration_days?.filter(
        (value) => Number.isInteger(value) && value > 0,
      ) ??
      (serviceItem.default_rental_days && serviceItem.default_rental_days > 0
        ? [serviceItem.default_rental_days]
        : []);
    if (rentalDayOptions.length === 0) return [];
    const livePrice =
      dumpster?.rental_price_cents != null
        ? { type: "fixed" as const, amountCents: dumpster.rental_price_cents }
        : {
            type: "quote_required" as const,
            label: serviceItem?.description?.trim() || "Contact for current rate",
          };
    const dimensions = formatDimensions(serviceItem?.dumpster_sizes);
    const imagePath =
      dumpster?.image_path?.trim() || serviceItem.image_path?.trim()
        ? (dumpster?.image_path?.trim() || serviceItem.image_path?.trim() || null)
        : null;
    const image = imagePath ? resolvePublicImageUrl(supabase, imagePath) : "";
    const includedTons = dumpster?.max_weight_tons ?? null;
    const materialRules = formatMaterialRules(
      dumpster?.materials_allowed ?? null,
      dumpster?.materials_not_allowed ?? null,
    );
    const use = serviceItem.description?.trim() ?? "";
    const rentalDays = rentalDayOptions[0] ?? null;
    if (!rentalDays) return [];

    return [{
      key: serviceItem.code,
      size: serviceItem.name,
      use,
      dimensions,
      rentalDays,
      rentalDayOptions,
      includedTons,
      includedWeightLabel: formatIncludedWeightLabel(dumpster?.max_weight_tons ?? null),
      materialRules,
      price: livePrice,
      image,
    }];
  });
}

export async function loadBookingSizeOptionByKey(
  key: SizeKey,
): Promise<BookingSizeOption> {
  const options = await loadBookingSizeOptions();
  return getBookingSizeOption(options, key);
}
