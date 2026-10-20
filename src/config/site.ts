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
  about: "/about",
  faq: "/faq",
  contact: "/contact",
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
  { label: "About", href: siteRoutes.about },
  { label: "FAQ", href: siteRoutes.faq },
  { label: "Contact", href: siteRoutes.contact },
] as const satisfies readonly SiteNavigationItem[];

export const footerNavigation = {
  services: [
    { label: "Services overview", href: "/#dumpster-info" },
  ],
  company: [
    { label: "About", href: siteRoutes.about },
    { label: "FAQ", href: siteRoutes.faq },
    { label: "Contact", href: siteRoutes.contact },
  ],
  legal: [
    { label: "Privacy Policy", href: siteRoutes.privacy },
    { label: "Terms of Service", href: siteRoutes.terms },
  ],
} as const satisfies Readonly<
  Record<"services" | "company" | "legal", readonly SiteNavigationItem[]>
>;

export const indexableRoutes = Object.values(siteRoutes).filter(
  (route) => route !== siteRoutes.book,
);
