"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export type SignInState = { error?: string };
export type PasswordResetRequestState = { error?: string; success?: string };
export type PasswordUpdateState = { error?: string };

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function signInStaff(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Invalid email or password." };
  }

  // Only active staff may enter the admin area. Otherwise, drop the session.
  const { data: role } = await supabase.rpc("current_staff_role");
  if (!role) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized for staff access." };
  }

  redirect("/admin");
}

export async function requestStaffPasswordReset(
  _previous: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter your email address." };
  }

  const supabase = await createClient();
  const redirectTo = new URL(
    "/auth/callback?next=/admin/reset-password",
    getSiteUrl(),
  ).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    if (error.message.includes("after 2 seconds")) {
      return { error: "Wait a few seconds, then request another reset link." };
    }

    return { error: "Could not send a reset link. Try again shortly." };
  }

  return {
    success:
      "If that address is allowed to sign in, we sent a password reset link.",
  };
}

export async function updateStaffPassword(
  _previous: PasswordUpdateState,
  formData: FormData,
): Promise<PasswordUpdateState> {
  const result = passwordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Enter a valid password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    return { error: error.message || "Could not update the password." };
  }

  const { data: role } = await supabase.rpc("current_staff_role");
  if (!role) {
    await supabase.auth.signOut();
    redirect("/admin/login?notice=Password%20updated.%20Sign%20in%20again.");
  }

  redirect("/admin/account/password?notice=Password%20updated.");
}

export async function signOutStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
