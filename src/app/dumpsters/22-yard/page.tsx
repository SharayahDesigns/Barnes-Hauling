import { DumpsterSizePage } from "@/components/marketing/dumpster-size-page";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

// Prices come from the live catalog; refresh at most once a minute.
export const revalidate = 60;

export const metadata = createPageMetadata(
  "22-yard dumpster",
  "Barnes 22-yard dumpster rental options: current prices, rental lengths, included weight, and what can go in each.",
  siteRoutes.dumpster22,
);

export default function TwentyTwoYardPage() {
  return <DumpsterSizePage slug="22-yard" />;
}
