import type { MetadataRoute } from "next";

import { businessConfig } from "@/config/business";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: businessConfig.identity.name.value,
    short_name: businessConfig.identity.shortName.value,
    description:
      "Hauling, junk removal, and dumpster rentals from Barnes Hauling and Disposal.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f4",
    theme_color: "#0b0c0a",
    icons: [
      {
        src: "/images/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
