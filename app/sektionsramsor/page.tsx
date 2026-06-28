import type { Metadata } from "next";
import SectionChantsClient from "@/components/SectionChantsClient";
import { createClient } from "@/lib/supabase/server";
import { SectionChant } from "@/lib/types";

export const metadata: Metadata = {
  title: "Sektionsramsor - NolleDansa",
};

async function getSectionChants(): Promise<SectionChant[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("section_chants")
    .select("*")
    .eq("status", "approved")
    .order("section", { ascending: true })
    .order("name", { ascending: true });

  return (data ?? []) as SectionChant[];
}

export default async function SectionChantsPage() {
  const chants = await getSectionChants();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SectionChantsClient initialChants={chants} />
    </div>
  );
}
