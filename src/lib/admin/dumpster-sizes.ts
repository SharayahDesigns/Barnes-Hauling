"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export type DumpsterSizeFormState = { error?: string; success?: string };

function positiveNumber(label: string, required: boolean) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) {
        if (required) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Enter the ${label}.` });
          return z.NEVER;
        }
        return undefined;
      }
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Enter a valid ${label}.` });
        return z.NEVER;
      }
      return amount;
    });
}

const createSizeSchema = z.object({
  capacityYards: positiveNumber("capacity in cubic yards", true),
  widthFeet: positiveNumber("width", false),
  lengthFeet: positiveNumber("length", false),
  wallHeightFeet: positiveNumber("wall height", false),
});

/**
 * Adds a new physical dumpster size (e.g. 30-yard). A size on its own is not
 * bookable: customers can book it once it has at least one container and one
 * active listing.
 */
export async function createDumpsterSize(
  _previous: DumpsterSizeFormState,
  formData: FormData,
): Promise<DumpsterSizeFormState> {
  await requireStaff();

  const parsed = createSizeSchema.safeParse({
    capacityYards: formData.get("capacityYards") ?? undefined,
    widthFeet: formData.get("widthFeet") ?? undefined,
    lengthFeet: formData.get("lengthFeet") ?? undefined,
    wallHeightFeet: formData.get("wallHeightFeet") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const yards = parsed.data.capacityYards as number;
  const yardsLabel = String(yards);
  const code = `${yardsLabel.replace(/[^0-9]+/g, "_")}_yard`;
  const name = `${yardsLabel}-Yard Dumpster`;

  const supabase = createAdminClient();
  const { error } = await supabase.from("dumpster_sizes").insert({
    code,
    name,
    capacity_cubic_yards: yards,
    width_feet: parsed.data.widthFeet ?? null,
    length_feet: parsed.data.lengthFeet ?? null,
    wall_height_feet: parsed.data.wallHeightFeet ?? null,
    status: "active",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `A ${name} size already exists.` };
    }
    return { error: "Could not add the size. Please retry." };
  }

  revalidatePath("/admin/inventory");
  return {
    success: `${name} added. Next, add its dumpsters and at least one option.`,
  };
}
