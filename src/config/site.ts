export type SiteNavigationItem = Readonly<{
  label: string;
  href: string;
}>;

export const siteRoutes = {
  home: "/",
  services: "/services",
  hauling: "/services/hauling-and-junk-removal",
  dumpsterRentals: "/services/dumpster-rentals",
  dumpsterSizes: "/services/dumpster-rentals/sizes",
  serviceArea: "/service-area",
  about: "/about",
  contact: "/contact",
  haulingQuote: "/quote/hauling",
  dumpsterBooking: "/book/dumpster",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const primaryNavigation = [
  { label: "Services", href: siteRoutes.services },
  { label: "Dumpster sizes", href: siteRoutes.dumpsterSizes },
  { label: "Service area", href: siteRoutes.serviceArea },
  { label: "About", href: siteRoutes.about },
] as const satisfies readonly SiteNavigationItem[];

export const footerNavigation = {
  services: [
    { label: "Hauling and junk removal", href: siteRoutes.hauling },
    { label: "Dumpster rentals", href: siteRoutes.dumpsterRentals },
    { label: "Dumpster size guide", href: siteRoutes.dumpsterSizes },
  ],
  company: [
    { label: "Service area", href: siteRoutes.serviceArea },
    { label: "About", href: siteRoutes.about },
    { label: "Contact", href: siteRoutes.contact },
  ],
  legal: [
    { label: "Privacy", href: siteRoutes.privacy },
    { label: "Terms", href: siteRoutes.terms },
  ],
} as const satisfies Readonly<
  Record<"services" | "company" | "legal", readonly SiteNavigationItem[]>
>;
