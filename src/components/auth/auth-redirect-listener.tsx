"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

export function AuthRedirectListener() {
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const hash = window.location.hash;
    if (!hash.startsWith("#")) return;

    const params = new URLSearchParams(hash.slice(1));
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken || (type !== "invite" && type !== "recovery")) {
      return;
    }

    handledRef.current = true;

    const supabase = createClient();

    void (async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        window.location.replace(
          "/admin/login?error=That%20link%20is%20invalid%20or%20expired.",
        );
        return;
      }

      window.location.replace(`/admin/reset-password?mode=${type}`);
    })();
  }, []);

  return null;
}
