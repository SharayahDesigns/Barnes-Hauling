import "server-only";

import type { Metadata } from "next";

import { businessConfig } from "@/config/business";

const defaultSocialImage = "/images/OG-barnesImage.jpg";

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
      images: [defaultSocialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${businessConfig.identity.name.value}`,
      description,
      images: [defaultSocialImage],
    },
    robots: options?.noIndex ? { index: false, follow: true } : undefined,
  };
}
