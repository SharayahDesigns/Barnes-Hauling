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
  name: string;
  shortName: string;
  href: string;
  summary: string;
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

export const businessConfig = {
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
    phone: pendingFact("Phone number pending business confirmation", [
      "call actions",
      "customer support",
      "transactional messages",
    ]),
    email: pendingFact("Email address pending business confirmation", [
      "contact forms",
      "customer support",
      "transactional messages",
    ]),
    publicAddress: pendingFact(
      "Public business address pending business confirmation",
      ["contact page", "local business metadata"],
    ),
  },
  operations: {
    serviceAreas: pendingFact(
      "Service areas and validation rules pending business confirmation",
      ["service-area pages", "quote eligibility", "booking eligibility"],
    ),
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
      name: "Hauling and junk removal",
      shortName: "Hauling",
      href: "/services/hauling-and-junk-removal",
      summary:
        "Request an estimate for item pickup, cleanouts, and other hauling projects.",
      primaryAction: {
        label: "Request a hauling quote",
        href: "/quote/hauling",
      },
    },
    {
      key: "dumpster-rental",
      name: "Dumpster rentals",
      shortName: "Dumpster rentals",
      href: "/services/dumpster-rentals",
      summary:
        "Plan a container rental by project type, debris, placement, and schedule.",
      primaryAction: {
        label: "Plan a dumpster rental",
        href: "/book/dumpster",
      },
    },
  ],
} as const satisfies BusinessConfig;

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
