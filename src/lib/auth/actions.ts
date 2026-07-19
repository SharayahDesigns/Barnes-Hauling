"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SignInState = { error?: string };

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

export async function signOutStaff() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
