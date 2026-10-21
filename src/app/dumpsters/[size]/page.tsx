import type { Metadata } from "next";

import { DumpsterSizePage } from "@/components/marketing/dumpster-size-page";
import { createPageMetadata } from "@/lib/page-metadata";

// Any size added in the admin (e.g. /dumpsters/30-yard) gets a page here.
// 15-yard and 22-yard keep their own route files, which take precedence.
export const revalidate = 60;

type Params = Promise<{ size: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { size } = await params;
  const label = size.replace(/-/g, " ");
  return createPageMetadata(
    `${label} dumpster`,
    `Barnes ${label} dumpster rental options: current prices, rental lengths, included weight, and what can go in each.`,
    `/dumpsters/${size}`,
  );
}

export default async function DumpsterSizeRoute({ params }: { params: Params }) {
  const { size } = await params;
  return <DumpsterSizePage slug={size} />;
}
