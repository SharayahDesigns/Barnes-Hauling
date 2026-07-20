import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  getBookingSizeOption,
  STATIC_BOOKING_SIZE_OPTIONS,
  type BookingSizeOption,
} from "./options";
import type { SizeKey } from "./schema";

type PricingRow = {
  service_items: Array<{ code: string | null }> | null;
  pricing_rule_versions:
    | Array<{
        value_type: string;
        amount_cents: number | null;
        pricing_versions: Array<{
          version_number: number;
          status: string;
          published_at: string | null;
          created_at: string;
        }> | null;
      }>
    | null;
};

type ImageRow = {
  code: string;
  image_path: string | null;
};

type DumpsterImageRow = {
  dumpster_size_id: string | null;
  image_path: string | null;
};

type DumpsterDurationRow = {
  dumpster_size_id: string | null;
  rental_duration_days: number[] | null;
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

function pricingVersionRank(status: string): number {
  if (status === "published") return 3;
  if (status === "draft") return 2;
  if (status === "retired") return 1;
  return 0;
}

function resolvePriceForRows(rows: PricingRow[]): Partial<Record<SizeKey, BookingSizeOption["price"]>> {
  const result: Partial<Record<SizeKey, BookingSizeOption["price"]>> = {};

  for (const row of rows) {
    const code = row.service_items?.[0]?.code;
    if (!code) continue;

    const key =
      code === "dumpster_15_residential"
        ? "15-residential"
        : code === "dumpster_15_heavy_materials"
          ? "15-heavy"
          : code === "dumpster_22_residential"
            ? "22-residential"
            : null;
    if (!key) continue;

    const candidates = (row.pricing_rule_versions ?? [])
      .map((version) => {
        const pricingVersion = version.pricing_versions?.[0] ?? null;
        if (!pricingVersion) return null;

        const price =
          version.value_type === "fixed_amount" && version.amount_cents != null
            ? { type: "fixed" as const, amountCents: version.amount_cents }
            : version.value_type === "quote_required"
              ? { type: "quote_required" as const, label: "Contact for current rate" as const }
              : null;

        if (!price) return null;

        return {
          price,
          rank: pricingVersionRank(pricingVersion.status),
          versionNumber: pricingVersion.version_number,
          publishedAt: pricingVersion.published_at ?? "",
          createdAt: pricingVersion.created_at,
        };
      })
      .filter((candidate) => candidate !== null)
      .sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        if (b.versionNumber !== a.versionNumber) return b.versionNumber - a.versionNumber;
        if (b.publishedAt !== a.publishedAt) return b.publishedAt.localeCompare(a.publishedAt);
        return b.createdAt.localeCompare(a.createdAt);
      });

    if (candidates[0]) {
      result[key] = candidates[0].price;
    }
  }

  return result;
}

export async function loadBookingSizeOptions(): Promise<readonly BookingSizeOption[]> {
  const supabase = createAdminClient();
  const [pricingResult, sizeResult, imageResult, dumpsterImageResult, durationResult] = await Promise.all([
    supabase
      .from("pricing_rules")
      .select(
        "service_items(code), pricing_rule_versions(value_type, amount_cents, pricing_versions(version_number, status, published_at, created_at))",
      )
      .eq("rule_kind", "base_price")
      .eq("is_active", true),
    supabase.from("service_items").select("code, dumpster_size_id"),
    supabase
      .from("service_items")
      .select("code, image_path")
      .not("image_path", "is", null)
      .order("sort_order"),
    supabase
      .from("dumpsters")
      .select("dumpster_size_id, image_path")
      .not("image_path", "is", null)
      .neq("status", "retired"),
    supabase
      .from("dumpsters")
      .select("dumpster_size_id, rental_duration_days")
      .neq("status", "retired"),
  ]);

  if (
    pricingResult.error ||
    sizeResult.error ||
    imageResult.error ||
    dumpsterImageResult.error ||
    durationResult.error
  ) {
    return STATIC_BOOKING_SIZE_OPTIONS;
  }

  const pricingByKey = resolvePriceForRows(
    ((pricingResult.data as unknown) as PricingRow[] | null) ?? [],
  );
  const sizeIdByCode = new Map(
    ((sizeResult.data as Array<{ code: string; dumpster_size_id: string | null }> | null) ?? [])
      .filter((item) => item.dumpster_size_id)
      .map((item) => [item.code, item.dumpster_size_id as string]),
  );

  const imageRows = (((imageResult.data as unknown) as ImageRow[] | null) ?? []);
  const imageByCode = new Map<string, string>();
  const imageBySizeId = new Map<string, string>();

  for (const row of imageRows) {
    if (!row.image_path) continue;
    imageByCode.set(row.code, resolvePublicImageUrl(supabase, row.image_path));
  }

  for (const row of ((dumpsterImageResult.data as DumpsterImageRow[] | null) ?? [])) {
    if (!row.dumpster_size_id || !row.image_path || imageBySizeId.has(row.dumpster_size_id)) {
      continue;
    }
    imageBySizeId.set(
      row.dumpster_size_id,
      resolvePublicImageUrl(supabase, row.image_path),
    );
  }

  const durationOptionsBySizeId = new Map<string, number[]>();
  for (const row of ((durationResult.data as DumpsterDurationRow[] | null) ?? [])) {
    if (!row.dumpster_size_id) continue;
    const current = durationOptionsBySizeId.get(row.dumpster_size_id) ?? [];
    const next = new Set(current);
    for (const value of row.rental_duration_days ?? []) {
      if (Number.isInteger(value) && value > 0) {
        next.add(value);
      }
    }
    durationOptionsBySizeId.set(
      row.dumpster_size_id,
      [...next].sort((a, b) => a - b),
    );
  }

  return STATIC_BOOKING_SIZE_OPTIONS.map((option) => {
    const serviceItemCode =
      option.key === "15-residential"
        ? "dumpster_15_residential"
        : option.key === "15-heavy"
          ? "dumpster_15_heavy_materials"
          : "dumpster_22_residential";
    const sizeId = sizeIdByCode.get(serviceItemCode) ?? "";
    const livePrice = pricingByKey[option.key] ?? option.price;
    const rentalDayOptions =
      durationOptionsBySizeId.get(sizeId)?.filter(
        (value) => Number.isInteger(value) && value > 0,
      ) ?? option.rentalDayOptions;

    return {
      ...option,
      rentalDays: rentalDayOptions[0] ?? option.rentalDays,
      rentalDayOptions:
        rentalDayOptions.length > 0 ? rentalDayOptions : option.rentalDayOptions,
      price: livePrice,
      image: imageByCode.get(serviceItemCode) ?? imageBySizeId.get(sizeId) ?? option.image,
    };
  });
}

export async function loadBookingSizeOptionByKey(
  key: SizeKey,
): Promise<BookingSizeOption> {
  const options = await loadBookingSizeOptions();
  return getBookingSizeOption(options, key);
}
