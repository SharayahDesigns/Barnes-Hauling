import "server-only";

import type { Metadata } from "next";

import { businessConfig } from "@/config/business";

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  options?: Readonly<{ noIndex?: boolean }>,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${businessConfig.identity.name.value}`,
      description,
      url: path,
    },
    robots: options?.noIndex ? { index: false, follow: true } : undefined,
  };
}
