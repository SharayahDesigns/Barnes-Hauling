import "server-only";

import { resolveOptionPhotoPath, type PhotoDumpster } from "@/lib/catalog/option-photo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public homepage view of the dumpster inventory. Renders one card per active
 * rental-package listing (not per physical container, since one container
 * can back multiple listings of the same size), so when the owner adds a
 * listing in the admin catalog it shows on the homepage automatically.
 * Listings without a price show "Contact for rate".
 */
export type HomeDumpster = {
  id: string;
  /** Option code; /book?load=<code> arrives with this option selected. */
  code: string;
  sizeName: string;
  /** URL slug of the size page, e.g. "15-yard" for /dumpsters/15-yard. */
  sizeSlug: string | null;
  /** Short customer-facing description entered on the option. */
  description: string | null;
  /** Rental package this listing is offered as, e.g. "Residential Waste". */
  packageLabel: string | null;
  capacity: number;
  dimensions: string;
  priceCents: number | null;
  maxWeightTons: number | null;
  rentalDays: number[];
  materialsAllowed: string[];
  materialsNotAllowed: string[];
  imageUrl: string | null;
};

type ServiceItemRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  photo_dumpster_id: string | null;
  dumpster_size_id: string | null;
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

/**
 * Reduces a package name to the part that distinguishes it from other packages
 * of the same size: "15-Yard Dumpster — Residential Waste" becomes
 * "Residential Waste". Reading the suffix rather than mapping known codes means
 * a package the owner adds later labels itself correctly.
 */
function packageLabelFrom(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.split(/\s[—–-]\s/);
  const label = (parts.length > 1 ? parts[parts.length - 1] : name).trim();
  return label.length > 0 ? label : null;
}

function fmtFeet(value: number | null | undefined): string {
  return value == null ? "" : Number(value).toString();
}

function formatDimensions(size: ServiceItemRow["dumpster_sizes"]): string {
  if (!size) return "";
  if (size.length_feet && size.width_feet) {
    const walls = size.wall_height_feet
      ? ` × ${fmtFeet(size.wall_height_feet)} ft walls`
      : "";
    return `${fmtFeet(size.width_feet)} ft × ${fmtFeet(size.length_feet)} ft${walls}`;
  }
  if (size.capacity_cubic_yards) {
    return `${fmtFeet(size.capacity_cubic_yards)} cu yd`;
  }
  return "";
}

/** "15_yard" (database code) <-> "15-yard" (URL slug). */
export function sizeSlugFromCode(code: string): string {
  return code.replace(/_/g, "-");
}

function sizeCodeFromSlug(slug: string): string | null {
  return /^[a-z0-9-]{1,40}$/.test(slug) ? slug.replace(/-/g, "_") : null;
}

export async function loadHomepageDumpsters(): Promise<HomeDumpster[]> {
  const supabase = createAdminClient();
  const [serviceItemsResult, dumpstersResult] = await Promise.all([
    supabase
      .from("service_items")
      .select(
        "id, code, name, description, photo_dumpster_id, dumpster_size_id, rental_price_cents, max_weight_tons, rental_duration_days, materials_allowed, materials_not_allowed, dumpster_sizes(code, name, capacity_cubic_yards, length_feet, width_feet, wall_height_feet)",
      )
      .eq("item_kind", "rental_package")
      .eq("status", "active"),
    supabase
      .from("dumpsters")
      .select("id, asset_number, dumpster_size_id, image_path, status")
      .neq("status", "retired"),
  ]);

  if (serviceItemsResult.error || !serviceItemsResult.data) return [];

  const rows = serviceItemsResult.data as unknown as ServiceItemRow[];
  const dumpsters =
    (dumpstersResult.data as unknown as DumpsterRow[] | null) ?? [];
  const hasPhysicalInventoryBySizeId = new Set(
    dumpsters
      .filter((dumpster) => dumpster.dumpster_size_id)
      .map((dumpster) => dumpster.dumpster_size_id as string),
  );

  const cards = rows
    .filter(
      (row) =>
        row.dumpster_size_id && hasPhysicalInventoryBySizeId.has(row.dumpster_size_id),
    )
    .map((row): HomeDumpster => ({
      id: row.id,
      code: row.code,
      sizeName: row.dumpster_sizes?.name ?? "Dumpster",
      sizeSlug: row.dumpster_sizes?.code ? sizeSlugFromCode(row.dumpster_sizes.code) : null,
      description: row.description?.trim() || null,
      packageLabel: packageLabelFrom(row.name),
      capacity: row.dumpster_sizes?.capacity_cubic_yards ?? 0,
      dimensions: formatDimensions(row.dumpster_sizes),
      priceCents: row.rental_price_cents,
      maxWeightTons: row.max_weight_tons,
      rentalDays: [...(row.rental_duration_days ?? [])].sort((a, b) => a - b),
      materialsAllowed: row.materials_allowed ?? [],
      materialsNotAllowed: row.materials_not_allowed ?? [],
      // Photo comes from one of this size's dumpsters, not a separate upload.
      imageUrl: (() => {
        const path = resolveOptionPhotoPath(row, dumpsters);
        return path
          ? supabase.storage.from("dumpster-images").getPublicUrl(path).data.publicUrl
          : null;
      })(),
    }));

  cards.sort(
    (a, b) => a.capacity - b.capacity || (a.priceCents ?? 0) - (b.priceCents ?? 0),
  );
  return cards;
}

export type DumpsterSizeSummary = {
  slug: string;
  name: string;
  capacity: number;
  dimensions: string;
};

export type DumpsterSizePageData =
  | { status: "ok"; size: DumpsterSizeSummary; options: HomeDumpster[] }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Everything a public size page (/dumpsters/15-yard, /dumpsters/30-yard, ...)
 * shows, read live from the catalog. "unavailable" means the database could
 * not be reached; pages then ask customers to call rather than show stale
 * typed-in prices.
 */
export async function loadDumpsterSizePage(slug: string): Promise<DumpsterSizePageData> {
  const code = sizeCodeFromSlug(slug);
  if (!code) return { status: "not_found" };

  const supabase = createAdminClient();
  const sizeResult = await supabase
    .from("dumpster_sizes")
    .select("code, name, status, capacity_cubic_yards, length_feet, width_feet, wall_height_feet")
    .eq("code", code)
    .maybeSingle();
  if (sizeResult.error) return { status: "unavailable" };
  const size = sizeResult.data as
    | (NonNullable<ServiceItemRow["dumpster_sizes"]> & { status: string })
    | null;
  if (!size || size.status !== "active") return { status: "not_found" };

  const cards = await loadHomepageDumpsters();
  return {
    status: "ok",
    size: {
      slug: sizeSlugFromCode(size.code),
      name: size.name,
      capacity: size.capacity_cubic_yards ?? 0,
      dimensions: formatDimensions(size),
    },
    options: cards.filter((card) => card.sizeSlug === sizeSlugFromCode(size.code)),
  };
}

/** Slugs of active sizes that customers can currently book (for the sitemap). */
export async function loadBookableSizeSlugs(): Promise<string[]> {
  const cards = await loadHomepageDumpsters();
  return [...new Set(cards.map((card) => card.sizeSlug).filter((slug): slug is string => !!slug))];
}

export type HomeSizeGroup = {
  /** Stable key: the size slug, or the size name when no slug exists. */
  key: string;
  sizeName: string;
  sizeSlug: string | null;
  capacity: number;
  dimensions: string;
  imageUrl: string | null;
  /** Lowest fixed price across this size's options; null if all are quoted. */
  fromPriceCents: number | null;
  /** Every rental length any option of this size offers. */
  rentalDays: number[];
  options: HomeDumpster[];
};

/**
 * One public card per dumpster size, priced "from" its cheapest option. The
 * individual options (what's going in it) are listed on the card and chosen
 * in the booking flow, so the number of cards grows with sizes, not with
 * sizes × options.
 */
export function groupDumpstersBySize(cards: readonly HomeDumpster[]): HomeSizeGroup[] {
  const groups = new Map<string, HomeSizeGroup>();
  for (const card of cards) {
    const key = card.sizeSlug ?? card.sizeName;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        sizeName: card.sizeName,
        sizeSlug: card.sizeSlug,
        capacity: card.capacity,
        dimensions: card.dimensions,
        imageUrl: null,
        fromPriceCents: null,
        rentalDays: [],
        options: [],
      };
      groups.set(key, group);
    }
    group.options.push(card);
  }

  for (const group of groups.values()) {
    group.options.sort(
      (a, b) =>
        (a.priceCents ?? Number.MAX_SAFE_INTEGER) - (b.priceCents ?? Number.MAX_SAFE_INTEGER),
    );
    const prices = group.options
      .map((option) => option.priceCents)
      .filter((price): price is number => price != null);
    group.fromPriceCents = prices.length > 0 ? Math.min(...prices) : null;
    group.imageUrl = group.options.find((option) => option.imageUrl)?.imageUrl ?? null;
    group.rentalDays = [...new Set(group.options.flatMap((option) => option.rentalDays))].sort(
      (a, b) => a - b,
    );
  }

  return [...groups.values()].sort((a, b) => a.capacity - b.capacity);
}
