import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Dance, TrendingDance } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import TrendingSection from "@/components/TrendingSection";
import DanceCard from "@/components/DanceCard";
import { Music2 } from "lucide-react";

interface HomeProps {
  searchParams: Promise<{ q?: string }>;
}

async function getTrendingDances(): Promise<TrendingDance[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get click counts per dance for the last 7 days
  const { data: clicks } = await supabase
    .from("dance_clicks")
    .select("dance_id")
    .gte("created_at", since);

  if (!clicks || clicks.length === 0) return [];

  // Count per dance
  const counts: Record<string, number> = {};
  for (const c of clicks) {
    counts[c.dance_id] = (counts[c.dance_id] ?? 0) + 1;
  }

  // Get top 5 dance IDs
  const topIds = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  const { data: dances } = await supabase
    .from("dances")
    .select("*")
    .eq("status", "approved")
    .in("id", topIds);

  if (!dances) return [];

  const sorted = [...dances]
    .map((d) => ({ ...d, view_count: counts[d.id] ?? 0 }))
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));

  return sorted as TrendingDance[];
}

async function searchDances(query: string): Promise<Dance[]> {
  const supabase = await createClient();
  const q = `%${query}%`;

  const { data } = await supabase
    .from("dances")
    .select("*")
    .eq("status", "approved")
    .or(
      `title.ilike.${q},section.ilike.${q},year.ilike.${q},song_title.ilike.${q},dancer_names.ilike.${q},artist.ilike.${q}`
    )
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []) as Dance[];
}

async function getRecentDances(): Promise<Dance[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dances")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);
  return (data ?? []) as Dance[];
}

async function getCurrentYearDances(): Promise<Dance[]> {
  const supabase = await createClient();
  const now = new Date();
  const fullYear = String(now.getFullYear());
  const shortYear = fullYear.slice(-2);

  const { data } = await supabase
    .from("dances")
    .select("*")
    .eq("status", "approved")
    .in("year", [shortYear, fullYear])
    .order("created_at", { ascending: false })
    .limit(12);

  return (data ?? []) as Dance[];
}

export default async function HomePage({ searchParams }: HomeProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [trending, yearlyDances, dances] = await Promise.all([
    getTrendingDances(),
    query ? Promise.resolve([] as Dance[]) : getCurrentYearDances(),
    query ? searchDances(query) : getRecentDances(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-3">
          <Music2 className="w-10 h-10 text-purple-600" />
          <h1 className="text-4xl font-bold text-gray-900">NolleDansa</h1>
        </div>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Träna nolledanser från LTH:s sektioner. Välj delar och loopa dem tills du kan dem.
        </p>
        <div className="flex justify-center">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>
      </section>

      {!query ? (
        <>
          <TrendingSection dances={trending} />

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Årets danser</h2>
            {yearlyDances.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
                <Music2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Inga godkända danser för innevarande år ännu.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {yearlyDances.map((dance) => (
                  <DanceCard key={`year-${dance.id}`} dance={dance} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Alla danser</h2>
            {dances.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Inga danser uppladdade ännu.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {dances.map((dance) => (
                    <DanceCard key={dance.id} dance={dance} />
                  ))}
                </div>
                <div className="flex justify-center">
                  <Link
                    href="/danser"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                  >
                    Visa alla danser
                  </Link>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">{`Resultat för "${query}"`}</h2>
          {dances.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Music2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Inga danser matchade sökningen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {dances.map((dance) => (
                <DanceCard key={dance.id} dance={dance} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
