"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveDumpsterServiceId } from "@/lib/booking/records";
import { requireStaff } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchedulingFormState = { error?: string; success?: string };

// Store a calendar date as an instant that always lands on that date in
// America/Denver (date-granularity is all the booking flow compares). A fixed
// -07:00 offset keeps the calendar date correct across DST.
function denverDayStart(date: string): string {
  return `${date}T09:00:00-07:00`;
}
function denverDayEnd(date: string): string {
  return `${date}T18:00:00-07:00`;
}

const blackoutSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date."),
    reason: z.string().trim().min(1, "Add an internal reason.").max(200),
    publicMessage: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export async function createBlackout(
  _previous: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  await requireStaff();

  const parsed = blackoutSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
    publicMessage: formData.get("publicMessage") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();
  let serviceId: string;
  try {
    serviceId = await resolveDumpsterServiceId(supabase);
  } catch {
    return { error: "Dumpster service is unavailable right now." };
  }

  const { error } = await supabase.from("blackout_dates").insert({
    service_id: serviceId,
    starts_at: denverDayStart(parsed.data.startDate),
    ends_at: denverDayEnd(parsed.data.endDate),
    internal_reason: parsed.data.reason,
    public_message: parsed.data.publicMessage ?? null,
    is_active: true,
  });
  if (error) {
    return { error: "Could not save the blackout. Please retry." };
  }

  revalidatePath("/admin/scheduling");
  return { success: "Blackout added." };
}

export async function deleteBlackout(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createAdminClient();
  await supabase.from("blackout_dates").delete().eq("id", id);
  revalidatePath("/admin/scheduling");
}

const availabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter a start time."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter an end time."),
    capacity: z.coerce
      .number()
      .int()
      .min(1, "Capacity must be at least 1.")
      .max(100),
    isActive: z.boolean(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

export async function createAvailabilityRule(
  _previous: SchedulingFormState,
  formData: FormData,
): Promise<SchedulingFormState> {
  await requireStaff();

  const parsed = availabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    capacity: formData.get("capacity"),
    isActive: formData.get("isActive") != null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const supabase = createAdminClient();
  let serviceId: string;
  try {
    serviceId = await resolveDumpsterServiceId(supabase);
  } catch {
    return { error: "Dumpster service is unavailable right now." };
  }

  const { error } = await supabase.from("availability_rules").insert({
    service_id: serviceId,
    day_of_week: parsed.data.dayOfWeek,
    local_start_time: parsed.data.startTime,
    local_end_time: parsed.data.endTime,
    capacity: parsed.data.capacity,
    is_active: parsed.data.isActive,
  });
  if (error) {
    return { error: "Could not save the availability rule. Please retry." };
  }

  revalidatePath("/admin/scheduling");
  return { success: "Availability rule added." };
}

export async function setAvailabilityRuleActive(
  formData: FormData,
): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!id) return;
  const supabase = createAdminClient();
  await supabase
    .from("availability_rules")
    .update({ is_active: isActive })
    .eq("id", id);
  revalidatePath("/admin/scheduling");
}

export async function deleteAvailabilityRule(formData: FormData): Promise<void> {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createAdminClient();
  await supabase.from("availability_rules").delete().eq("id", id);
  revalidatePath("/admin/scheduling");
}
