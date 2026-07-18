export type SiteNavigationItem = Readonly<{
  label: string;
  href: string;
  description?: string;
}>;

export const siteRoutes = {
  home: "/",
  services: "/services",
  junkRemoval: "/services/junk-removal",
  dumpsterRental: "/services/dumpster-rental",
  dumpster15: "/dumpsters/15-yard",
  dumpster22: "/dumpsters/22-yard",
  serviceAreas: "/service-areas",
  about: "/about",
  faq: "/faq",
  contact: "/contact",
  quote: "/quote",
  book: "/book",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const serviceNavigation = [
  {
    label: "All services",
    href: siteRoutes.services,
    description: "Compare hauling and dumpster rental paths.",
  },
  {
    label: "Junk removal",
    href: siteRoutes.junkRemoval,
    description: "Start with a project-based hauling estimate.",
  },
  {
    label: "Dumpster rental",
    href: siteRoutes.dumpsterRental,
    description: "Review confirmed container sizes and terms.",
  },
] as const satisfies readonly SiteNavigationItem[];

export const primaryNavigation = [
  { label: "Dumpster Rentals", href: siteRoutes.dumpsterRental },
  { label: "Service Areas", href: "/#service-area" },
  { label: "About", href: siteRoutes.about },
  { label: "FAQ", href: siteRoutes.faq },
  { label: "Contact", href: siteRoutes.contact },
] as const satisfies readonly SiteNavigationItem[];

export const footerNavigation = {
  services: [
    { label: "Services overview", href: siteRoutes.services },
    { label: "Junk removal", href: siteRoutes.junkRemoval },
    { label: "Dumpster rentals", href: siteRoutes.dumpsterRental },
    { label: "15-yard dumpster", href: siteRoutes.dumpster15 },
    { label: "22-yard dumpster", href: siteRoutes.dumpster22 },
  ],
  company: [
    { label: "Service areas", href: siteRoutes.serviceAreas },
    { label: "About", href: siteRoutes.about },
    { label: "FAQ", href: siteRoutes.faq },
    { label: "Contact", href: siteRoutes.contact },
  ],
  legal: [
    { label: "Privacy — copy pending", href: siteRoutes.privacy },
    { label: "Terms — copy pending", href: siteRoutes.terms },
  ],
} as const satisfies Readonly<
  Record<"services" | "company" | "legal", readonly SiteNavigationItem[]>
>;

export const indexableRoutes = Object.values(siteRoutes).filter(
  (route) => route !== siteRoutes.quote && route !== siteRoutes.book,
);
