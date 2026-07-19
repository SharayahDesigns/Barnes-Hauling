"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

import { DUMPSTER_STATUSES } from "./dumpster-status";

const createSchema = z.object({
  assetNumber: z.string().trim().min(1, "Asset number is required.").max(50),
  dumpsterSizeId: z.string().uuid("Choose a dumpster size."),
  status: z.enum(DUMPSTER_STATUSES),
  currentLocation: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
  conditionNotes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type InventoryFormState = { error?: string; success?: string };

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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("dumpsters").insert({
    asset_number: parsed.data.assetNumber,
    dumpster_size_id: parsed.data.dumpsterSizeId,
    status: parsed.data.status,
    current_location: parsed.data.currentLocation ?? null,
    condition_notes: parsed.data.conditionNotes ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That asset number already exists." };
    }
    return { error: "Could not add the dumpster. Please retry." };
  }

  revalidatePath("/admin/inventory");
  return { success: `Dumpster ${parsed.data.assetNumber} added.` };
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
