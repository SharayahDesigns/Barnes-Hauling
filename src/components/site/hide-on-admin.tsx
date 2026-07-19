"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides marketing chrome (site header/footer) on the /admin operations area,
 * which renders its own shell. Keeps the public and staff surfaces visually
 * separate without moving the marketing routes.
 */
export function HideOnAdmin({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
