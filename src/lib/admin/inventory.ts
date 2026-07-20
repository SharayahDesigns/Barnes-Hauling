"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

import { DUMPSTER_STATUSES } from "./dumpster-status";

const DUMPSTER_IMAGE_BUCKET = "dumpster-images";

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));
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

function optionalDimensionFeet(label: string) {
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
          message: `Enter a valid ${label}.`,
        });
        return z.NEVER;
      }
      return amount;
    });
}

function optionalMaterialsAllowed() {
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
      ]
        .sort((a, b) => a - b);
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

function uploadedImageFile() {
  return z
    .unknown()
    .optional()
    .transform((value, ctx) => {
      if (!(value instanceof File) || value.size === 0) return undefined;
      const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowed.has(value.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Upload a JPG, PNG, or WebP image.",
        });
        return z.NEVER;
      }
      if (value.size > 5 * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image must be 5 MB or smaller.",
        });
        return z.NEVER;
      }
      return value;
    });
}

const createSchema = z.object({
  assetNumber: z.string().trim().min(1, "Asset number is required.").max(50),
  dumpsterSizeId: z.string().uuid("Choose a dumpster size."),
  status: z.enum(DUMPSTER_STATUSES),
  currentLocation: optionalText(200),
  conditionNotes: optionalText(500),
  priceDollars: optionalPriceDollars(),
  maxWeightTons: optionalWeightTons(),
  materialsAllowed: optionalMaterialsAllowed(),
  materialsNotAllowed: optionalMaterialsAllowed(),
  rentalDurationDays: rentalDurationDaysField(),
  imageFile: uploadedImageFile(),
});

const updateDetailsSchema = z.object({
  id: z.string().uuid("Missing dumpster id."),
  dumpsterSizeId: z.string().uuid("Missing dumpster size."),
  conditionNotes: optionalText(500),
  priceDollars: optionalPriceDollars(),
  maxWeightTons: optionalWeightTons(),
  lengthFeet: optionalDimensionFeet("length"),
  widthFeet: optionalDimensionFeet("width"),
  wallHeightFeet: optionalDimensionFeet("wall height"),
  materialsAllowed: optionalMaterialsAllowed(),
  materialsNotAllowed: optionalMaterialsAllowed(),
  rentalDurationDays: rentalDurationDaysField(),
  imageFile: uploadedImageFile(),
});

export type InventoryFormState = { error?: string; success?: string };

const SERVICE_ITEM_CODE_BY_ASSET_NUMBER: Record<string, string> = {
  "BHD1-7-14-4": "dumpster_15_residential",
  "BHD2-7-14-4": "dumpster_15_heavy_materials",
  "BHD1-7-14-6": "dumpster_22_residential",
};

async function syncServiceItemImagePath(
  supabase: ReturnType<typeof createAdminClient>,
  assetNumber: string,
  imagePath: string | null,
): Promise<void> {
  const serviceItemCode = SERVICE_ITEM_CODE_BY_ASSET_NUMBER[assetNumber.trim().toUpperCase()];
  if (!serviceItemCode) return;

  await supabase
    .from("service_items")
    .update({ image_path: imagePath })
    .eq("code", serviceItemCode);
}

function sanitizeAssetNumber(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

async function uploadDumpsterImage(
  supabase: ReturnType<typeof createAdminClient>,
  assetNumber: string,
  file: File,
): Promise<{ path?: string; error?: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `dumpsters/${sanitizeAssetNumber(assetNumber)}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await supabase.storage.from(DUMPSTER_IMAGE_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (upload.error) {
    return { error: "Could not upload the dumpster image. Please retry." };
  }

  return { path };
}

export async function createDumpster(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  await requireStaff();

  const parsed = createSchema.safeParse({
    assetNumber: formData.get("assetNumber"),
    dumpsterSizeId: formData.get("dumpsterSizeId"),
    status: formData.get("status"),
    currentLocation: formData.get("currentLocation") ?? undefined,
    conditionNotes: formData.get("conditionNotes") ?? undefined,
    priceDollars: formData.get("priceDollars") ?? undefined,
    maxWeightTons: formData.get("maxWeightTons") ?? undefined,
    materialsAllowed: formData.get("materialsAllowed") ?? undefined,
    materialsNotAllowed: formData.get("materialsNotAllowed") ?? undefined,
    rentalDurationDays: formData.getAll("rentalDurationDays"),
    imageFile: formData.get("imageFile") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();
  let imagePath: string | null = null;
  if (parsed.data.imageFile) {
    const upload = await uploadDumpsterImage(
      supabase,
      parsed.data.assetNumber,
      parsed.data.imageFile,
    );
    if (upload.error) {
      return { error: upload.error };
    }
    imagePath = upload.path ?? null;
  }

  const { error } = await supabase.from("dumpsters").insert({
    asset_number: parsed.data.assetNumber,
    dumpster_size_id: parsed.data.dumpsterSizeId,
    status: parsed.data.status,
    current_location: parsed.data.currentLocation ?? null,
    condition_notes: parsed.data.conditionNotes ?? null,
    image_path: imagePath,
    rental_price_cents: parsed.data.priceDollars ?? null,
    max_weight_tons: parsed.data.maxWeightTons ?? null,
    materials_allowed: parsed.data.materialsAllowed,
    materials_not_allowed: parsed.data.materialsNotAllowed,
    rental_duration_days: parsed.data.rentalDurationDays,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That asset number already exists." };
    }
    return { error: "Could not add the dumpster. Please retry." };
  }

  if (imagePath) {
    await syncServiceItemImagePath(
      supabase,
      parsed.data.assetNumber,
      imagePath,
    );
  }

  revalidatePath("/admin/inventory");
  return { success: `Dumpster ${parsed.data.assetNumber} added.` };
}

export async function updateDumpsterDetails(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  await requireStaff();

  const parsed = updateDetailsSchema.safeParse({
    id: formData.get("id"),
    dumpsterSizeId: formData.get("dumpsterSizeId"),
    conditionNotes: formData.get("conditionNotes") ?? undefined,
    priceDollars: formData.get("priceDollars") ?? undefined,
    maxWeightTons: formData.get("maxWeightTons") ?? undefined,
    lengthFeet: formData.get("lengthFeet") ?? undefined,
    widthFeet: formData.get("widthFeet") ?? undefined,
    wallHeightFeet: formData.get("wallHeightFeet") ?? undefined,
    materialsAllowed: formData.get("materialsAllowed") ?? undefined,
    materialsNotAllowed: formData.get("materialsNotAllowed") ?? undefined,
    rentalDurationDays: formData.getAll("rentalDurationDays"),
    imageFile: formData.get("imageFile") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();
  const existingResult = await supabase
    .from("dumpsters")
    .select("asset_number, image_path")
    .eq("id", parsed.data.id)
    .single();
  if (existingResult.error || !existingResult.data) {
    return { error: "Could not find that dumpster." };
  }

  let imagePath = String(existingResult.data.image_path ?? "") || null;
  if (parsed.data.imageFile) {
    const upload = await uploadDumpsterImage(
      supabase,
      String(existingResult.data.asset_number),
      parsed.data.imageFile,
    );
    if (upload.error) {
      return { error: upload.error };
    }
    imagePath = upload.path ?? imagePath;
  }

  const { error } = await supabase
    .from("dumpsters")
    .update({
      condition_notes: parsed.data.conditionNotes ?? null,
      image_path: imagePath,
      rental_price_cents: parsed.data.priceDollars ?? null,
      max_weight_tons: parsed.data.maxWeightTons ?? null,
      materials_allowed: parsed.data.materialsAllowed,
      materials_not_allowed: parsed.data.materialsNotAllowed,
      rental_duration_days: parsed.data.rentalDurationDays,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { error: "Could not update dumpster details. Please retry." };
  }

  const sizeUpdate = await supabase
    .from("dumpster_sizes")
    .update({
      length_feet: parsed.data.lengthFeet ?? null,
      width_feet: parsed.data.widthFeet ?? null,
      wall_height_feet: parsed.data.wallHeightFeet ?? null,
    })
    .eq("id", parsed.data.dumpsterSizeId);
  if (sizeUpdate.error) {
    return { error: "Dumpster details saved, but the size dimensions could not be updated." };
  }

  if (parsed.data.imageFile) {
    await syncServiceItemImagePath(
      supabase,
      String(existingResult.data.asset_number),
      imagePath,
    );
  }

  if (parsed.data.imageFile && existingResult.data.image_path) {
    await supabase.storage
      .from(DUMPSTER_IMAGE_BUCKET)
      .remove([String(existingResult.data.image_path)]);
  }

  revalidatePath("/admin/inventory");
  return { success: "Dumpster details updated." };
}

export async function updateDumpsterStatus(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(DUMPSTER_STATUSES as readonly string[]).includes(status)) {
    return { error: "Invalid status." };
  }

  const supabase = createAdminClient();

  // Active assignments are the source of truth for availability: a container
  // that is still reserved or assigned cannot be marked available. This mirrors
  // the database trigger (guard_dumpster_availability) for a friendly message.
  if (status === "available") {
    const { data: active, error: checkError } = await supabase
      .from("dumpster_assignments")
      .select("id")
      .eq("dumpster_id", id)
      .in("status", ["reserved", "assigned"])
      .limit(1);
    if (checkError) {
      return { error: "Could not verify assignments. Please retry." };
    }
    if (active && active.length > 0) {
      return {
        error:
          "This dumpster has an active assignment and can't be marked available. Release the assignment first.",
      };
    }
  }

  const { error } = await supabase
    .from("dumpsters")
    .update({ status })
    .eq("id", id);

  if (error) {
    if (error.message?.toLowerCase().includes("active assignment")) {
      return {
        error:
          "This dumpster has an active assignment and can't be marked available.",
      };
    }
    return { error: "Could not update the status. Please retry." };
  }

  revalidatePath("/admin/inventory");
  return { success: "Status updated." };
}

export async function deleteDumpster(formData: FormData): Promise<void> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();
  const dumpsterResult = await supabase
    .from("dumpsters")
    .select("status")
    .eq("id", id)
    .single();
  if (dumpsterResult.error || !dumpsterResult.data) {
    return;
  }

  const [assignmentsResult, historyResult] = await Promise.all([
    supabase
      .from("dumpster_assignments")
      .select("id, status")
      .eq("dumpster_id", id),
    supabase
      .from("dumpster_status_history")
      .select("id")
      .eq("dumpster_id", id),
  ]);

  if (assignmentsResult.error || historyResult.error) {
    return;
  }

  const assignments =
    (assignmentsResult.data as Array<{ id: string; status: string }> | null) ?? [];
  const activeAssignmentCount = assignments.filter(
    (assignment) => assignment.status === "reserved" || assignment.status === "assigned",
  ).length;
  const historyIds =
    ((historyResult.data as Array<{ id: string }> | null) ?? []).map((row) => row.id) ?? [];

  const canDeleteClean =
    assignments.length === 0 && historyIds.length === 0;
  const canDeleteRetired =
    dumpsterResult.data.status === "retired" && activeAssignmentCount === 0;

  if (!canDeleteClean && !canDeleteRetired) {
    return;
  }

  if (canDeleteRetired) {
    if (assignments.length > 0) {
      await supabase
        .from("dumpster_assignments")
        .delete()
        .in(
          "id",
          assignments.map((assignment) => assignment.id),
        );
    }
    if (historyIds.length > 0) {
      await supabase.from("dumpster_status_history").delete().in("id", historyIds);
    }
  }

  await supabase.from("dumpsters").delete().eq("id", id);
  revalidatePath("/admin/inventory");
}
