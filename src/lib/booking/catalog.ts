import "server-only";

import { resolveOptionPhotoPath, type PhotoDumpster } from "@/lib/catalog/option-photo";
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
  photo_dumpster_id: string | null;
  default_rental_days: number | null;
  dumpster_size_id: string | null;
  sort_order: number;
  rental_price_cents: number | null;
  max_weight_tons: number | null;
  rental_duration_days: number[] | null;
  materials_allowed: string[] | null;
  materials_not_allowed: string[] | null;
  dumpster_sizes: {
    code: string;
    name: string;
    capacity_cubic_yards: number | null;
    length_feet: number | null;
    width_feet: number | null;
    wall_height_feet: number | null;
  } | null;
};

type DumpsterRow = PhotoDumpster;

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

/** "15-Yard Dumpster — Heavy Materials" -> "Heavy Materials". */
function optionLabelFrom(name: string, sizeName: string | undefined): string {
  if (sizeName && name.startsWith(sizeName)) {
    const rest = name.slice(sizeName.length).replace(/^[\s—–:-]+/, "").trim();
    if (rest) return rest;
  }
  const parts = name.split(/\s[—–-]\s/);
  return (parts.length > 1 ? parts[parts.length - 1] : name).trim() || name;
}

export async function loadBookingSizeOptions(): Promise<readonly BookingSizeOption[]> {
  const supabase = createAdminClient();
  const [serviceItemsResult, dumpstersResult] = await Promise.all([
    supabase
      .from("service_items")
      .select(
        "id, code, name, description, photo_dumpster_id, default_rental_days, sort_order, dumpster_size_id, rental_price_cents, max_weight_tons, rental_duration_days, materials_allowed, materials_not_allowed, dumpster_sizes(code, name, capacity_cubic_yards, length_feet, width_feet, wall_height_feet)",
      )
      .eq("item_kind", "rental_package")
      .eq("status", "active")
      .order("sort_order"),
    supabase
      .from("dumpsters")
      .select("id, asset_number, dumpster_size_id, image_path, status")
      .neq("status", "retired"),
  ]);

  if (serviceItemsResult.error) {
    return [];
  }

  const serviceItems =
    ((serviceItemsResult.data as unknown) as ServiceItemRow[] | null) ?? [];
  const dumpsters =
    ((dumpstersResult.data as unknown) as DumpsterRow[] | null) ?? [];

  // Physical availability is purely size-based: a listing is bookable as long
  // as at least one non-retired container of its dumpster_size_id exists, no
  // matter how many catalog listings (price tiers) share that same size.
  const hasPhysicalInventoryBySizeId = new Set(
    dumpsters
      .filter((dumpster) => dumpster.dumpster_size_id)
      .map((dumpster) => dumpster.dumpster_size_id as string),
  );

  return serviceItems.flatMap((serviceItem) => {
    if (!serviceItem.dumpster_size_id) return [];
    if (!hasPhysicalInventoryBySizeId.has(serviceItem.dumpster_size_id)) return [];

    const rentalDayOptions =
      serviceItem.rental_duration_days?.filter(
        (value) => Number.isInteger(value) && value > 0,
      ) ??
      (serviceItem.default_rental_days && serviceItem.default_rental_days > 0
        ? [serviceItem.default_rental_days]
        : []);
    const rentalDays = rentalDayOptions[0] ?? null;
    if (!rentalDays) return [];

    const livePrice =
      serviceItem.rental_price_cents != null
        ? { type: "fixed" as const, amountCents: serviceItem.rental_price_cents }
        : {
            type: "quote_required" as const,
            label: serviceItem.description?.trim() || "Contact for current rate",
          };
    const dimensions = formatDimensions(serviceItem.dumpster_sizes);
    // Photo comes from one of this size's dumpsters, not a separate upload.
    const imagePath = resolveOptionPhotoPath(serviceItem, dumpsters)?.trim() || null;
    const image = imagePath ? resolvePublicImageUrl(supabase, imagePath) : "";
    const materialRules = formatMaterialRules(
      serviceItem.materials_allowed,
      serviceItem.materials_not_allowed,
    );
    const use = serviceItem.description?.trim() ?? "";

    return [{
      key: serviceItem.code,
      sizeGroupKey: serviceItem.dumpster_size_id,
      sizeName: serviceItem.dumpster_sizes?.name ?? serviceItem.name,
      sizeSlug: (serviceItem.dumpster_sizes?.code ?? serviceItem.code).replace(/_/g, "-"),
      optionLabel: optionLabelFrom(serviceItem.name, serviceItem.dumpster_sizes?.name),
      size: serviceItem.name,
      use,
      dimensions,
      rentalDays,
      rentalDayOptions,
      includedTons: serviceItem.max_weight_tons,
      includedWeightLabel: formatIncludedWeightLabel(serviceItem.max_weight_tons),
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
