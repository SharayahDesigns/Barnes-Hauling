import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Only run session refresh on the admin area; the public site has no auth.
export const config = {
  matcher: ["/admin/:path*"],
};
