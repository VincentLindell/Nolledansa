import type { Metadata } from "next";
import SectionChantsClient from "@/components/SectionChantsClient";
import { SectionChant } from "@/lib/types";
import { getApprovedSectionChants } from "@/lib/store";

export const metadata: Metadata = {
  title: "Sektionsramsor - NolleDansa",
};
export const dynamic = "force-dynamic";

async function getSectionChants(): Promise<SectionChant[]> {
  return getApprovedSectionChants();
}

export default async function SectionChantsPage() {
  const chants = await getSectionChants();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SectionChantsClient initialChants={chants} />
    </div>
  );
}
