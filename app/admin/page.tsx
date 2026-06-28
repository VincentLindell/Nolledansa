import { isAdmin } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { Dance, DanceEditRequest, SectionChant } from "@/lib/types";
import { sectionLabel } from "@/lib/utils";
import Link from "next/link";
import AdminLoginForm from "@/components/AdminLoginForm";
import { approveSectionChant, rejectSectionChant } from "./actions";
import { ShieldCheck, Clock, Music, PencilLine, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin – NolleDansa",
};

// Tvinga dynamic rendering (ingen caching)
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!admin) {
    return <AdminLoginForm />;
  }

  const supabase = createAdminClient();

  const [{ data: pending }, { data: pendingEditRequests }, { data: pendingSectionChants }] = await Promise.all([
    supabase
      .from("dances")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("dance_edit_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("section_chants")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const dances = (pending ?? []) as Dance[];
  const editRequests = (pendingEditRequests ?? []) as DanceEditRequest[];
  const sectionChants = (pendingSectionChants ?? []) as SectionChant[];

  const danceIdsForRequests = [...new Set(editRequests.map((r) => r.dance_id))];
  const { data: requestDances } = danceIdsForRequests.length
    ? await supabase
        .from("dances")
        .select("id, title, section, year")
        .in("id", danceIdsForRequests)
    : { data: [] };

  const requestDanceMap = new Map((requestDances ?? []).map((dance) => [dance.id, dance]));
  const hasPendingItems = dances.length > 0 || editRequests.length > 0 || sectionChants.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin-panel</h1>
      </div>

      {hasPendingItems ? (
        <div className="space-y-8">
          {dances.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                {dances.length} ny{dances.length !== 1 ? "a" : ""} dans{dances.length !== 1 ? "er" : ""} väntar på granskning.
              </p>
              <div className="space-y-2">
                {dances.map((dance) => (
                  <Link
                    key={dance.id}
                    href={`/admin/${dance.id}`}
                    className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-purple-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Music className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{dance.title}</p>
                        <p className="text-xs text-gray-500">
                          {sectionLabel(dance.section, dance.year)} · {dance.song_title}
                          {dance.artist ? ` · ${dance.artist}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        Ny dans
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(dance.created_at).toLocaleDateString("sv-SE")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {editRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                {editRequests.length} ändringsförslag väntar på granskning.
              </p>
              <div className="space-y-2">
                {editRequests.map((request) => {
                  const targetDance = requestDanceMap.get(request.dance_id);
                  return (
                    <Link
                      key={request.id}
                      href={`/admin/edits/${request.id}`}
                      className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-purple-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PencilLine className="w-5 h-5 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {targetDance?.title ?? request.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(targetDance
                              ? sectionLabel(targetDance.section, targetDance.year)
                              : sectionLabel(request.section, request.year)) + " · Ändringsförslag"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-full">
                          Ändring
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(request.created_at).toLocaleDateString("sv-SE")}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {sectionChants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                {sectionChants.length} sektionsrams{sectionChants.length !== 1 ? "or" : "a"} väntar på granskning.
              </p>
              <div className="space-y-3">
                {sectionChants.map((chant) => (
                  <div
                    key={chant.id}
                    className="bg-white border border-gray-200 rounded-xl px-5 py-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <MessageSquareText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-gray-900 truncate">{chant.name}</p>
                          <p className="text-xs text-gray-500">
                            {chant.section} - Sektionen · Melodi: {chant.melody}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full shrink-0">
                        Ny ramsa
                      </span>
                    </div>

                    <p className="whitespace-pre-line text-sm leading-6 text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      {chant.lyrics}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <form action={approveSectionChant.bind(null, chant.id)} className="flex-1">
                        <button
                          type="submit"
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                        >
                          Godkänn ramsa
                        </button>
                      </form>
                      <form action={rejectSectionChant.bind(null, chant.id)} className="flex-1">
                        <button
                          type="submit"
                          className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2.5 rounded-lg text-sm transition-colors"
                        >
                          Neka ramsa
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
          <Clock className="mx-auto w-10 h-10 mb-3 opacity-50" />
          <p>Inga ärenden väntar på granskning.</p>
        </div>
      )}
    </div>
  );
}
