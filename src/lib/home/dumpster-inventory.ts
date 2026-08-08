import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public homepage view of the dumpster inventory. Renders one card per
 * non-retired dumpster, so when the owner adds a dumpster in the admin
 * inventory it shows on the homepage automatically. Dumpsters without a price
 * show "Contact for rate".
 */
export type HomeDumpster = {
  id: string;
  sizeName: string;
  /** Rental package this container is offered as, e.g. "Residential Waste". */
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

type DumpsterRow = {
  id: string;
  image_path: string | null;
  rental_price_cents: number | null;
  max_weight_tons: number | null;
  rental_duration_days: number[] | null;
  materials_allowed: string[] | null;
  materials_not_allowed: string[] | null;
  dumpster_sizes: {
    name: string;
    capacity_cubic_yards: number | null;
    length_feet: number | null;
    width_feet: number | null;
    wall_height_feet: number | null;
  } | null;
  // To-one embed: PostgREST returns an object, not a single-element array.
  service_items: { name: string } | null;
};

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

function formatDimensions(size: DumpsterRow["dumpster_sizes"]): string {
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

export async function loadHomepageDumpsters(): Promise<HomeDumpster[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dumpsters")
    .select(
      "id, status, image_path, rental_price_cents, max_weight_tons, rental_duration_days, materials_allowed, materials_not_allowed, dumpster_sizes(name, capacity_cubic_yards, length_feet, width_feet, wall_height_feet), service_items(name)",
    )
    .neq("status", "retired");

  if (error || !data) return [];

  const rows = data as unknown as DumpsterRow[];

  const cards = rows.map((row): HomeDumpster => ({
    id: row.id,
    sizeName: row.dumpster_sizes?.name ?? "Dumpster",
    packageLabel: packageLabelFrom(row.service_items?.name),
    capacity: row.dumpster_sizes?.capacity_cubic_yards ?? 0,
    dimensions: formatDimensions(row.dumpster_sizes),
    priceCents: row.rental_price_cents,
    maxWeightTons: row.max_weight_tons,
    rentalDays: [...(row.rental_duration_days ?? [])].sort((a, b) => a - b),
    materialsAllowed: row.materials_allowed ?? [],
    materialsNotAllowed: row.materials_not_allowed ?? [],
    imageUrl: row.image_path
      ? supabase.storage.from("dumpster-images").getPublicUrl(row.image_path).data
          .publicUrl
      : null,
  }));

  cards.sort(
    (a, b) => a.capacity - b.capacity || (a.priceCents ?? 0) - (b.priceCents ?? 0),
  );
  return cards;
}
