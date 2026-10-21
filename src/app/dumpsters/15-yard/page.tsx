import { DumpsterSizePage } from "@/components/marketing/dumpster-size-page";
import { siteRoutes } from "@/config/site";
import { createPageMetadata } from "@/lib/page-metadata";

// Prices come from the live catalog; refresh at most once a minute.
export const revalidate = 60;

export const metadata = createPageMetadata(
  "15-yard dumpster",
  "Barnes 15-yard dumpster rental options: current prices, rental lengths, included weight, and what can go in each.",
  siteRoutes.dumpster15,
);

export default function FifteenYardPage() {
  return <DumpsterSizePage slug="15-yard" />;
}
