"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));
}

function listingName() {
  return z
    .string()
    .trim()
    .min(3, "Enter an option name customers will see.")
    .max(120, "Keep the option name under 120 characters.");
}

function optionalPriceDollars() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid non-negative price.",
        });
        return z.NEVER;
      }
      return Math.round(amount * 100);
    });
}

function optionalWeightTons() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid weight in tons.",
        });
        return z.NEVER;
      }
      return amount;
    });
}

function optionalMaterialsList() {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return [];
      return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    });
}

function rentalDurationDaysField() {
  return z
    .union([z.string(), z.array(z.string())])
    .transform((value, ctx) => {
      const rawValues = Array.isArray(value) ? value : [value];
      const parsed = [
        ...new Set(
          rawValues
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item > 0),
        ),
      ].sort((a, b) => a - b);
      if (parsed.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose at least one rental duration option.",
        });
        return z.NEVER;
      }
      return parsed;
    });
}

/** "" (automatic) or the id of one of this size's dumpsters. */
function photoDumpsterField() {
  return z
    .union([z.literal(""), z.string().uuid("Choose a valid dumpster photo.")])
    .optional()
    .transform((value) => value || null);
}

const listingRulesShape = {
  priceDollars: optionalPriceDollars(),
  maxWeightTons: optionalWeightTons(),
  materialsAllowed: optionalMaterialsList(),
  materialsNotAllowed: optionalMaterialsList(),
  rentalDurationDays: rentalDurationDaysField(),
  photoDumpsterId: photoDumpsterField(),
};

const createListingSchema = z.object({
  dumpsterSizeId: z.string().uuid("Choose a dumpster size."),
  name: listingName(),
  description: optionalText(300),
  ...listingRulesShape,
});

const listingStatusSchema = z.object({
  id: z.string().uuid("Missing listing id."),
  status: z.enum(["active", "inactive"]),
});

const updatePricingSchema = z.object({
  id: z.string().uuid("Missing listing id."),
  code: z.string().min(1),
  name: listingName(),
  description: optionalText(300),
  priceDollars: optionalPriceDollars(),
  maxWeightTons: optionalWeightTons(),
  materialsAllowed: optionalMaterialsList(),
  materialsNotAllowed: optionalMaterialsList(),
  rentalDurationDays: rentalDurationDaysField(),
  photoDumpsterId: photoDumpsterField(),
});

export type ServiceItemFormState = { error?: string; success?: string };

type AdminDb = ReturnType<typeof createAdminClient>;

function readListingRules(formData: FormData) {
  return {
    priceDollars: formData.get("priceDollars") ?? undefined,
    maxWeightTons: formData.get("maxWeightTons") ?? undefined,
    materialsAllowed: formData.get("materialsAllowed") ?? undefined,
    materialsNotAllowed: formData.get("materialsNotAllowed") ?? undefined,
    rentalDurationDays: formData.getAll("rentalDurationDays"),
    photoDumpsterId: formData.get("photoDumpsterId") ?? undefined,
  };
}

/**
 * An option may only show a photo from a dumpster of its own size that
 * actually has one. Returns an error message, or null when the choice is ok.
 */
async function checkPhotoDumpster(
  supabase: AdminDb,
  dumpsterId: string | null,
  sizeId: string,
): Promise<string | null> {
  if (!dumpsterId) return null;
  const { data } = await supabase
    .from("dumpsters")
    .select("dumpster_size_id, image_path, status")
    .eq("id", dumpsterId)
    .maybeSingle();
  if (!data || data.dumpster_size_id !== sizeId || data.status === "retired") {
    return "Choose a photo from a dumpster of this size.";
  }
  if (!data.image_path) {
    return "That dumpster has no photo yet. Add one with Edit on its row.";
  }
  return null;
}

/** Customer-facing pages that read listings; refresh them after a change. */
function revalidateListingPages() {
  revalidatePath("/admin/inventory");
  revalidatePath("/book");
  revalidatePath("/");
}

/**
 * Builds a unique, constraint-safe code (^[a-z0-9_]+$) from the listing name,
 * e.g. "15-Yard Dumpster — Roofing" -> "dumpster_15_yard_dumpster_roofing".
 */
async function uniqueListingCode(supabase: AdminDb, name: string): Promise<string> {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "listing";
  const base = slug.startsWith("dumpster") ? slug : `dumpster_${slug}`;

  const existing = await supabase
    .from("service_items")
    .select("code")
    .like("code", `${base}%`);
  const taken = new Set(
    ((existing.data as Array<{ code: string }> | null) ?? []).map((row) => row.code),
  );
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}_${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}_${crypto.randomUUID().slice(0, 8).replace(/-/g, "")}`;
}

/**
 * Creates a new bookable listing (price tier) for an existing dumpster size,
 * e.g. a second 15-yard option for roofing debris. The listing shares that
 * size's physical containers, so it adds no extra capacity by itself.
 */
export async function createServiceItem(
  _previous: ServiceItemFormState,
  formData: FormData,
): Promise<ServiceItemFormState> {
  await requireStaff();

  const parsed = createListingSchema.safeParse({
    dumpsterSizeId: formData.get("dumpsterSizeId"),
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    ...readListingRules(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();

  const [sizeResult, serviceResult, sortResult] = await Promise.all([
    supabase
      .from("dumpster_sizes")
      .select("id, status")
      .eq("id", parsed.data.dumpsterSizeId)
      .maybeSingle(),
    supabase.from("services").select("id").eq("code", "dumpster_rental").maybeSingle(),
    supabase
      .from("service_items")
      .select("sort_order")
      .eq("item_kind", "rental_package")
      .order("sort_order", { ascending: false })
      .limit(1),
  ]);
  if (!sizeResult.data || sizeResult.data.status !== "active") {
    return { error: "That dumpster size is not available. Choose another size." };
  }
  if (!serviceResult.data) {
    return { error: "The dumpster rental service is not set up yet." };
  }

  const code = await uniqueListingCode(supabase, parsed.data.name);
  const lastSort =
    ((sortResult.data as Array<{ sort_order: number }> | null) ?? [])[0]?.sort_order ?? 0;

  const photoError = await checkPhotoDumpster(
    supabase,
    parsed.data.photoDumpsterId,
    parsed.data.dumpsterSizeId,
  );
  if (photoError) return { error: photoError };

  const { error } = await supabase.from("service_items").insert({
    service_id: serviceResult.data.id,
    dumpster_size_id: parsed.data.dumpsterSizeId,
    code,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    item_kind: "rental_package",
    status: "active",
    sort_order: lastSort + 10,
    default_rental_days: parsed.data.rentalDurationDays[0],
    rental_price_cents: parsed.data.priceDollars ?? null,
    max_weight_tons: parsed.data.maxWeightTons ?? null,
    materials_allowed: parsed.data.materialsAllowed,
    materials_not_allowed: parsed.data.materialsNotAllowed,
    rental_duration_days: parsed.data.rentalDurationDays,
    photo_dumpster_id: parsed.data.photoDumpsterId,
  });

  if (error) {
    return { error: "Could not add the option. Please retry." };
  }

  revalidateListingPages();
  return { success: `${parsed.data.name} added. Customers can book it now.` };
}

/**
 * Archives (hides from the booking page) or restores a listing. Listings are
 * never deleted, because past bookings and quotes point at them.
 */
export async function setServiceItemStatus(formData: FormData): Promise<void> {
  await requireStaff();

  const parsed = listingStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = createAdminClient();
  await supabase
    .from("service_items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("item_kind", "rental_package");

  revalidateListingPages();
}

/**
 * Updates price, weight limit, material rules, duration options, and which
 * dumpster's photo customers see for a catalog entry (e.g. "15-Yard — Heavy
 * Materials"). These describe what is being rented, not a specific physical
 * container, so one container can back multiple listings of the same size.
 */
export async function updateServiceItemPricing(
  _previous: ServiceItemFormState,
  formData: FormData,
): Promise<ServiceItemFormState> {
  await requireStaff();

  const parsed = updatePricingSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    ...readListingRules(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();

  const existing = await supabase
    .from("service_items")
    .select("dumpster_size_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!existing.data?.dumpster_size_id) {
    return { error: "Could not find that option." };
  }
  const photoError = await checkPhotoDumpster(
    supabase,
    parsed.data.photoDumpsterId,
    existing.data.dumpster_size_id as string,
  );
  if (photoError) return { error: photoError };

  const updatePayload: Record<string, unknown> = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    default_rental_days: parsed.data.rentalDurationDays[0],
    rental_price_cents: parsed.data.priceDollars ?? null,
    max_weight_tons: parsed.data.maxWeightTons ?? null,
    materials_allowed: parsed.data.materialsAllowed,
    materials_not_allowed: parsed.data.materialsNotAllowed,
    rental_duration_days: parsed.data.rentalDurationDays,
    photo_dumpster_id: parsed.data.photoDumpsterId,
  };

  const { error } = await supabase
    .from("service_items")
    .update(updatePayload)
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not save the option. Please retry." };
  }

  revalidateListingPages();
  return { success: "Option saved." };
}
