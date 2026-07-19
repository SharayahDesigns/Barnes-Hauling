"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function parseZips(raw: string): string[] {
  const found = raw
    .split(/[^0-9]+/)
    .map((part) => part.trim())
    .filter((part) => /^\d{5}$/.test(part));
  return Array.from(new Set(found));
}

const coverageSchema = z.object({
  areaName: z.string().trim().min(2, "Enter an area name.").max(120),
  zips: z.string().trim().min(5, "Enter at least one 5-digit ZIP code."),
});

export type CoverageFormState = { error?: string; success?: string };

/**
 * Staff-friendly one-step coverage entry: given an area name and a list of ZIPs,
 * finds-or-creates the service area and a default active zone, then adds the
 * ZIPs. This is what makes the customer booking flow's ZIP gate return
 * "validated" instead of "pending".
 */
export async function addCoverage(
  _previous: CoverageFormState,
  formData: FormData,
): Promise<CoverageFormState> {
  await requireStaff();

  const parsed = coverageSchema.safeParse({
    areaName: formData.get("areaName"),
    zips: formData.get("zips"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const zips = parseZips(parsed.data.zips);
  if (zips.length === 0) {
    return { error: "No valid 5-digit ZIP codes found." };
  }

  const areaCode = slugify(parsed.data.areaName);
  if (!areaCode) {
    return { error: "Enter an area name with letters or numbers." };
  }

  const supabase = createAdminClient();

  // Find or create the active service area.
  let areaId: string | undefined = (
    await supabase
      .from("service_areas")
      .select("id")
      .eq("code", areaCode)
      .maybeSingle()
  ).data?.id;
  if (!areaId) {
    const inserted = await supabase
      .from("service_areas")
      .insert({ code: areaCode, name: parsed.data.areaName, status: "active" })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) {
      return { error: "Could not create the service area." };
    }
    areaId = inserted.data.id as string;
  }

  // Find or create a default active zone under the area.
  let zoneId: string | undefined = (
    await supabase
      .from("service_zones")
      .select("id")
      .eq("service_area_id", areaId)
      .eq("code", "main")
      .maybeSingle()
  ).data?.id;
  if (!zoneId) {
    const inserted = await supabase
      .from("service_zones")
      .insert({
        service_area_id: areaId,
        code: "main",
        name: `${parsed.data.areaName} area`,
        status: "active",
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) {
      return { error: "Could not create the service zone." };
    }
    zoneId = inserted.data.id as string;
  }

  let added = 0;
  let skipped = 0;
  for (const postalCode of zips) {
    const { error } = await supabase
      .from("service_zone_postal_codes")
      .insert({ service_zone_id: zoneId, country_code: "US", postal_code: postalCode });
    if (error) {
      // 23505 = ZIP already covered (globally unique). Skip it.
      if (error.code === "23505") skipped++;
      else return { error: "Could not add one or more ZIP codes." };
    } else {
      added++;
    }
  }

  revalidatePath("/admin/service-area");
  const parts = [`Added ${added} ZIP${added === 1 ? "" : "s"} to ${parsed.data.areaName}.`];
  if (skipped > 0) parts.push(`Skipped ${skipped} already-covered ZIP${skipped === 1 ? "" : "s"}.`);
  return { success: parts.join(" ") };
}

export async function setAreaStatus(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "inactive"].includes(status)) return;
  const supabase = createAdminClient();
  await supabase.from("service_areas").update({ status }).eq("id", id);
  revalidatePath("/admin/service-area");
}

export async function setZoneStatus(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "inactive"].includes(status)) return;
  const supabase = createAdminClient();
  await supabase.from("service_zones").update({ status }).eq("id", id);
  revalidatePath("/admin/service-area");
}

export async function removePostalCode(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createAdminClient();
  await supabase.from("service_zone_postal_codes").delete().eq("id", id);
  revalidatePath("/admin/service-area");
}
