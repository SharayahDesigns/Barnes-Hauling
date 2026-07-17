import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a privileged client for narrowly scoped guest and administrative
 * server operations. Authenticated customer work should use server.ts so the
 * customer's session and RLS remain in force.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
