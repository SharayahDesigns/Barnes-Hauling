import { siteRoutes } from "./site";

export type BusinessFactSource =
  | "project-requirements"
  | "business-owner"
  | "legal-review";

export type ConfirmedBusinessFact<T> = Readonly<{
  status: "confirmed";
  value: T;
  source: BusinessFactSource;
}>;

export type PendingBusinessFact = Readonly<{
  status: "pending";
  value: null;
  placeholder: string;
  requiredFor: readonly string[];
}>;

export type BusinessFact<T> = ConfirmedBusinessFact<T> | PendingBusinessFact;

export type ServiceKey = "hauling" | "dumpster-rental";

export type ServiceDefinition = Readonly<{
  key: ServiceKey;
  eyebrow: string;
  name: string;
  shortName: string;
  href: string;
  summary: string;
  marketingAction: string;
  primaryAction: Readonly<{
    label: string;
    href: string;
  }>;
}>;

type BusinessConfig = Readonly<{
  identity: Readonly<{
    name: ConfirmedBusinessFact<string>;
    shortName: ConfirmedBusinessFact<string>;
  }>;
  contact: Readonly<{
    phone: BusinessFact<string>;
    email: BusinessFact<string>;
    publicAddress: BusinessFact<string>;
  }>;
  operations: Readonly<{
    serviceAreas: BusinessFact<readonly string[]>;
    businessHours: BusinessFact<readonly string[]>;
    sameDayAvailability: BusinessFact<boolean>;
  }>;
  trust: Readonly<{
    insuranceStatement: BusinessFact<string>;
    licenseStatement: BusinessFact<string>;
    yearsInBusiness: BusinessFact<number>;
  }>;
  services: readonly ServiceDefinition[];
}>;

const pendingFact = (
  placeholder: string,
  requiredFor: readonly string[],
): PendingBusinessFact => ({
  status: "pending",
  value: null,
  placeholder,
  requiredFor,
});

export const businessConfig: BusinessConfig = {
  identity: {
    name: {
      status: "confirmed",
      value: "Barnes Hauling and Disposal",
      source: "project-requirements",
    },
    shortName: {
      status: "confirmed",
      value: "Barnes",
      source: "project-requirements",
    },
  },
  contact: {
    phone: {
      status: "confirmed",
      value: "385-246-4219",
      source: "business-owner",
    },
    email: {
      status: "confirmed",
      value: "barneshaulingdisposal@gmail.com",
      source: "business-owner",
    },
    publicAddress: pendingFact(
      "Public business address pending business confirmation",
      ["contact page", "local business metadata"],
    ),
  },
  operations: {
    serviceAreas: {
      status: "confirmed",
      value: [
        "Herriman",
        "Southwest Salt Lake County",
        "Northern Utah County",
      ],
      source: "business-owner",
    },
    businessHours: pendingFact(
      "Business hours pending business confirmation",
      ["site footer", "contact expectations", "scheduling"],
    ),
    sameDayAvailability: pendingFact(
      "Same-day policy pending business confirmation",
      ["marketing content", "scheduling"],
    ),
  },
  trust: {
    insuranceStatement: pendingFact(
      "Insurance statement pending verification",
      ["trust content"],
    ),
    licenseStatement: pendingFact(
      "License statement pending verification",
      ["trust content"],
    ),
    yearsInBusiness: pendingFact(
      "Company history pending verification",
      ["about page", "trust content"],
    ),
  },
  services: [
    {
      key: "hauling",
      eyebrow: "We load it",
      name: "Hauling and junk removal",
      shortName: "Hauling",
      href: siteRoutes.junkRemoval,
      summary:
        "Request an estimate for item pickup, cleanouts, and other hauling projects.",
      marketingAction: "Explore junk removal",
      primaryAction: {
        label: "Explore junk removal",
        href: siteRoutes.junkRemoval,
      },
    },
    {
      key: "dumpster-rental",
      eyebrow: "You load it",
      name: "Dumpster rentals",
      shortName: "Dumpster rentals",
      href: siteRoutes.dumpsterRental,
      summary:
        "Plan a container rental by project type, debris, placement, and schedule.",
      marketingAction: "Compare dumpsters",
      primaryAction: {
        label: "Plan a dumpster rental",
        href: siteRoutes.book,
      },
    },
  ],
};

export function isConfirmedBusinessFact<T>(
  fact: BusinessFact<T>,
): fact is ConfirmedBusinessFact<T> {
  return fact.status === "confirmed";
}

export function getService(serviceKey: ServiceKey): ServiceDefinition {
  const service = businessConfig.services.find(({ key }) => key === serviceKey);

  if (!service) {
    throw new Error(`Unknown service configuration: ${serviceKey}`);
  }

  return service;
}
