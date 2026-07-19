import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type StaffRole =
  | "owner"
  | "administrator"
  | "dispatcher"
  | "estimator"
  | "crew_lead"
  | "crew_member"
  | "accounting"
  | "customer_support"
  | "read_only_analyst";

export type StaffSession = {
  userId: string;
  email: string | null;
  role: StaffRole;
};

/**
 * Resolves the current staff session, or null if the visitor is not signed in
 * as an active staff member. Reads the role via the SECURITY DEFINER RPC so the
 * private staff registry is never exposed to the client.
 */
export async function getStaff(): Promise<StaffSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: role, error } = await supabase.rpc("current_staff_role");
  if (error || !role) return null;

  return { userId: user.id, email: user.email ?? null, role: role as StaffRole };
}

/**
 * Gate for every admin page and action. Redirects non-staff to the login page.
 * Call this first in admin server components and before any admin mutation.
 */
export async function requireStaff(): Promise<StaffSession> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}
